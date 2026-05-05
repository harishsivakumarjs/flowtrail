import { db } from './db'
import { supabase } from './supabase'

const TABLES = ['habits', 'habit_logs', 'sleep_logs', 'tasks', 'journal_entries']

// Keep track of deleted IDs so syncFromCloud never restores them
const deletedIds = new Set()

/** Push local records to Supabase */
export async function syncToCloud(userId) {
  if (!supabase || !navigator.onLine) return
  for (const table of TABLES) {
    try {
      const records = await db[table].where('user_id').equals(userId).toArray()
      if (!records.length) continue
      const { error } = await supabase
        .from(table).upsert(records, { onConflict: 'id' })
      if (error) console.error(`syncToCloud [${table}]:`, error)
    } catch (err) {
      console.error(`syncToCloud [${table}]:`, err)
    }
  }
}

/** Delete from BOTH Supabase and local — Supabase first */
export async function deleteFromCloud(table, id) {
  // Mark as deleted so syncFromCloud never restores it
  deletedIds.add(id)

  // Delete from Supabase first
  if (supabase && navigator.onLine) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) console.error(`deleteFromCloud [${table}]:`, error)
  }

  // Then delete locally
  await db[table].delete(id)
}

/** Pull from Supabase — skip any IDs we've deleted */
export async function syncFromCloud(userId) {
  if (!supabase || !navigator.onLine) return
  for (const table of TABLES) {
    try {
      const { data, error } = await supabase
        .from(table).select('*').eq('user_id', userId)
      if (error) { console.error(`syncFromCloud [${table}]:`, error); continue }
      if (!data?.length) continue
      // Filter out any records we've deleted locally
      const filtered = data.filter(r => !deletedIds.has(r.id))
      if (filtered.length) await db[table].bulkPut(filtered)
    } catch (err) {
      console.error(`syncFromCloud [${table}]:`, err)
    }
  }
}

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
        event: '*', schema: 'public', table,
        filter: `user_id=eq.${userId}`,
      }, async (payload) => {
        try {
          const id = payload.new?.id || payload.old?.id
          // Ignore our own writes
          if (id && recentWrites.has(id)) return
          // Ignore records we've deleted
          if (id && deletedIds.has(id)) return

          if (payload.eventType === 'DELETE') {
            if (payload.old?.id) {
              deletedIds.add(payload.old.id)
              await db[table].delete(payload.old.id)
            }
          } else if (payload.new) {
            await db[table].put(payload.new)
          }
          onUpdate?.(table, payload.eventType)
        } catch (err) {
          console.error(`realtime [${table}]:`, err)
        }
      })
      .subscribe()
  )

  return () => channels.forEach(ch => { try { supabase.removeChannel(ch) } catch {} })
}