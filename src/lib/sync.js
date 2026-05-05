import { db } from './db'
import { supabase } from './supabase'

const TABLES = ['habits', 'habit_logs', 'sleep_logs', 'tasks', 'journal_entries']

/** Push local records to Supabase */
export async function syncToCloud(userId) {
  if (!supabase || !navigator.onLine) return

  for (const table of TABLES) {
    try {
      const records = await db[table]
        .where('user_id').equals(userId)
        .toArray()
      if (!records.length) continue
      const { error } = await supabase
        .from(table)
        .upsert(records, { onConflict: 'id' })
      if (error) console.error(`syncToCloud [${table}]:`, error)
    } catch (err) {
      console.error(`syncToCloud failed [${table}]:`, err)
    }
  }
}

/** Delete a record from Supabase AND local */
export async function deleteFromCloud(table, id, userId) {
  // Delete locally first
  await db[table].delete(id)

  // Then delete from Supabase
  if (!supabase || !navigator.onLine) return
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
  if (error) console.error(`deleteFromCloud [${table}]:`, error)
}

/** Pull latest from Supabase into local IndexedDB */
export async function syncFromCloud(userId) {
  if (!supabase || !navigator.onLine) return

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
      if (error) { console.error(`syncFromCloud [${table}]:`, error); continue }
      if (!data?.length) continue
      await db[table].bulkPut(data)
    } catch (err) {
      console.error(`syncFromCloud failed [${table}]:`, err)
    }
  }
}

/** Full sync both ways */
export async function fullSync(userId) {
  await syncToCloud(userId)
  await syncFromCloud(userId)
}

// Track recent local writes to ignore own real-time echoes
const recentWrites = new Set()
export function markLocalWrite(id) {
  recentWrites.add(id)
  setTimeout(() => recentWrites.delete(id), 3000)
}

/** Real-time subscription */
export function subscribeRealtime(userId, onUpdate) {
  if (!supabase) return () => {}

  const channels = TABLES.map(table =>
    supabase
      .channel(`rt_${table}_${userId}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table,
        filter: `user_id=eq.${userId}`,
      }, async (payload) => {
        try {
          const id = payload.new?.id || payload.old?.id

          // Ignore echoes of our own writes
          if (id && recentWrites.has(id)) {
            console.log(`Realtime: ignoring own echo [${table}] ${id}`)
            return
          }

          if (payload.eventType === 'DELETE') {
            if (payload.old?.id) await db[table].delete(payload.old.id)
          } else if (payload.new) {
            await db[table].put(payload.new)
          }
          onUpdate?.(table, payload.eventType)
        } catch (err) {
          console.error(`realtime handler [${table}]:`, err)
        }
      })
      .subscribe((status) => {
        console.log(`Realtime [${table}]: ${status}`)
      })
  )

  return () => channels.forEach(ch => {
    try { supabase.removeChannel(ch) } catch {}
  })
}