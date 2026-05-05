import { db } from './db'
import { supabase } from './supabase'

const TABLES = ['habits', 'habit_logs', 'sleep_logs', 'tasks', 'journal_entries']

/** Push all local records newer than last sync to Supabase */
export async function syncToCloud(userId) {
  if (!supabase || !navigator.onLine) return

  for (const table of TABLES) {
    try {
      const localRecords = await db[table]
        .where('user_id').equals(userId)
        .toArray()

      if (!localRecords.length) continue

      const { error } = await supabase
        .from(table)
        .upsert(localRecords, { onConflict: 'id' })

      if (error) console.error(`Sync error [${table}]:`, error)
    } catch (err) {
      console.error(`Sync failed [${table}]:`, err)
    }
  }
}

/** Pull latest data from Supabase into local IndexedDB */
export async function syncFromCloud(userId) {
  if (!supabase || !navigator.onLine) return

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)

      if (error) { console.error(`Pull error [${table}]:`, error); continue }
      if (!data?.length) continue

      await db[table].bulkPut(data)
    } catch (err) {
      console.error(`Pull failed [${table}]:`, err)
    }
  }
}

/** Full bidirectional sync */
export async function fullSync(userId) {
  await syncToCloud(userId)
  await syncFromCloud(userId)
}

/** Subscribe to real-time changes from other devices */
export function subscribeRealtime(userId, onUpdate) {
  if (!supabase) return () => {}

  const channels = TABLES.map(table =>
    supabase
      .channel(`${table}_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: `user_id=eq.${userId}`
      }, async (payload) => {
        const record = payload.new || payload.old
        if (!record) return

        if (payload.eventType === 'DELETE') {
          await db[table].delete(record.id)
        } else {
          await db[table].put(record)
        }
        onUpdate?.(table, payload.eventType)
      })
      .subscribe()
  )

  return () => channels.forEach(ch => supabase.removeChannel(ch))
}
