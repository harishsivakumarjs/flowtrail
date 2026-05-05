import { useLiveQuery } from 'dexie-react-hooks'
import { db, uuid } from '@/lib/db'
import { TODAY } from '@/lib/utils'
import { upsertToCloud, deleteFromCloud } from '@/lib/sync'

// ── Journal entries — multiple per day supported ─────────────

/** All entries for a specific date (multiple allowed) */
export function useJournalEntriesForDate(userId, date) {
  return useLiveQuery(
    () => userId
      ? db.journal_entries.where('user_id').equals(userId)
          .filter(e => e.entry_date === date)
          .toArray()
          .then(arr => arr.sort((a, b) => a.created_at?.localeCompare(b.created_at)))
      : Promise.resolve([]),
    [userId, date]
  ) ?? []
}

/** All entries across all dates for sidebar history */
export function useJournalEntries(userId) {
  return useLiveQuery(
    () => userId
      ? db.journal_entries.where('user_id').equals(userId).reverse().sortBy('updated_at')
      : Promise.resolve([]),
    [userId]
  ) ?? []
}

/** Create a brand new journal entry for a date */
export async function createJournalEntry({ userId, date, content, prompt, title }) {
  const wordCount = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length
  const record = {
    id:         uuid(),
    user_id:    userId,
    entry_date: date,
    title:      title || '',
    prompt,
    content,
    word_count: wordCount,
    mood:       null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  await db.journal_entries.put(record)
  if (!userId?.startsWith('demo')) upsertToCloud('journal_entries', record)
  return record.id
}

/** Update an existing entry by ID */
export async function updateJournalEntry(id, { content, title, userId }) {
  const wordCount = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length
  const entry = await db.journal_entries.get(id)
  if (!entry) return
  const updated = { ...entry, content, title: title || entry.title, word_count: wordCount, updated_at: new Date().toISOString() }
  await db.journal_entries.put(updated)
  if (!userId?.startsWith('demo')) upsertToCloud('journal_entries', updated)
}

/** Delete a journal entry */
export async function deleteJournalEntry(id, userId) {
  if (!userId?.startsWith('demo')) {
    await deleteFromCloud('journal_entries', id)
  } else {
    await db.journal_entries.delete(id)
  }
}

// ── Sleep logs ───────────────────────────────────────────────
export function useSleepLog(userId, date) {
  return useLiveQuery(
    () => userId
      ? db.sleep_logs.where('user_id').equals(userId).filter(s => s.log_date === date).first()
      : Promise.resolve(null),
    [userId, date]
  )
}

export function useSleepLogs(userId, days = 30) {
  return useLiveQuery(
    () => userId
      ? db.sleep_logs.where('user_id').equals(userId).reverse().limit(days).sortBy('log_date')
      : Promise.resolve([]),
    [userId]
  ) ?? []
}

export async function saveSleepLog({ userId, date, hours }) {
  const existing = await db.sleep_logs
    .where('user_id').equals(userId).filter(s => s.log_date === date).first()
  if (existing) {
    const updated = { ...existing, hours, updated_at: new Date().toISOString() }
    await db.sleep_logs.put(updated)
    if (!userId?.startsWith('demo')) upsertToCloud('sleep_logs', updated)
  } else {
    const record = { id: uuid(), user_id: userId, log_date: date, hours, updated_at: new Date().toISOString() }
    await db.sleep_logs.put(record)
    if (!userId?.startsWith('demo')) upsertToCloud('sleep_logs', record)
  }
}