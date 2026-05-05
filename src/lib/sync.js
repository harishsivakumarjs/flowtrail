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

/** Real-time subscription — instantly syncs changes from other devices */
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
        console.log(`Realtime [${table}]:`, status)
      })
  )

  return () => channels.forEach(ch => {
    try { supabase.removeChannel(ch) } catch {}
  })
}