import { db } from './db'
import { supabase } from './supabase'

const TABLES = ['habits', 'habit_logs', 'sleep_logs', 'tasks', 'journal_entries']
const deletedIds = new Set()
const recentWrites = new Set()

export function markLocalWrite(id) {
  recentWrites.add(id)
  setTimeout(() => recentWrites.delete(id), 5000)
}

/** Upsert a single record directly to Supabase */
export async function upsertToCloud(table, record) {
  if (!supabase || !navigator.onLine) return
  const { error } = await supabase.from(table).upsert(record, { onConflict: 'id' })
  if (error) console.error(`upsertToCloud [${table}]:`, error)
}

/** Delete from Supabase AND local */
export async function deleteFromCloud(table, id) {
  deletedIds.add(id)
  // Delete from Supabase first
  if (supabase && navigator.onLine) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) console.error(`deleteFromCloud [${table}]:`, error)
  }
  // Then local
  await db[table].delete(id)
}

/** Push all local records to Supabase (used on login) */
export async function syncToCloud(userId) {
  if (!supabase || !navigator.onLine) return
  for (const table of TABLES) {
    try {
      const records = await db[table].where('user_id').equals(userId).toArray()
      if (!records.length) continue
      const { error } = await supabase.from(table).upsert(records, { onConflict: 'id' })
      if (error) console.error(`syncToCloud [${table}]:`, error)
    } catch (err) {
      console.error(`syncToCloud [${table}]:`, err)
    }
  }
}

/** Pull from Supabase into local — Supabase is source of truth */
export async function syncFromCloud(userId) {
  if (!supabase || !navigator.onLine) return
  for (const table of TABLES) {
    try {
      const { data, error } = await supabase
        .from(table).select('*').eq('user_id', userId)
      if (error) { console.error(`syncFromCloud [${table}]:`, error); continue }

      // Get current local IDs
      const localIds = await db[table]
        .where('user_id').equals(userId)
        .primaryKeys()

      // Cloud IDs (excluding ones we've deleted locally)
      const cloudIds = new Set((data || []).map(r => r.id))

      // Delete local records that no longer exist in cloud
      const toDelete = localIds.filter(id => !cloudIds.has(id) && !deletedIds.has(id))
      if (toDelete.length) await db[table].bulkDelete(toDelete)

      // Upsert cloud records (skip ones we've deleted locally)
      const toUpsert = (data || []).filter(r => !deletedIds.has(r.id))
      if (toUpsert.length) await db[table].bulkPut(toUpsert)
    } catch (err) {
      console.error(`syncFromCloud [${table}]:`, err)
    }
  }
}

export async function fullSync(userId) {
  await syncToCloud(userId)
  await syncFromCloud(userId)
}

/** Real-time subscription */
export function subscribeRealtime(userId, onUpdate) {
  if (!supabase) return () => {}

  const channels = TABLES.map(table =>
    supabase
      .channel(`rt_${table}_${userId}_${Date.now()}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table,
        filter: `user_id=eq.${userId}`,
      }, async (payload) => {
        try {
          const id = payload.new?.id || payload.old?.id
          if (id && recentWrites.has(id)) return  // ignore own echo
          if (id && deletedIds.has(id)) return     // ignore deleted

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