import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { TODAY } from '@/lib/utils'

export function useJournalEntry(userId, date) {
  const entry = useLiveQuery(
    () => userId
      ? db.journal_entries
          .where('user_id').equals(userId)
          .filter(e => e.entry_date === date)
          .first()
      : Promise.resolve(null),
    [userId, date]
  )
  return entry
}

export function useJournalEntries(userId) {
  const entries = useLiveQuery(
    () => userId
      ? db.journal_entries.where('user_id').equals(userId).reverse().sortBy('entry_date')
      : Promise.resolve([]),
    [userId]
  )
  return entries ?? []
}

export async function saveJournalEntry({ userId, date, content, prompt }) {
  const wordCount = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length
  const existing = await db.journal_entries
    .where('user_id').equals(userId)
    .filter(e => e.entry_date === date)
    .first()

  if (existing) {
    return db.journal_entries.update(existing.id, {
      content,
      word_count: wordCount,
      updated_at: new Date().toISOString(),
    })
  }
  return db.journal_entries.add({
    user_id:    userId,
    entry_date: date,
    prompt,
    content,
    word_count: wordCount,
    mood:       null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}

// ── Sleep logs ─────────────────────────────────────────────
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
    .where('user_id').equals(userId)
    .filter(s => s.log_date === date)
    .first()
  if (existing) {
    return db.sleep_logs.update(existing.id, { hours, updated_at: new Date().toISOString() })
  }
  return db.sleep_logs.add({
    user_id:    userId,
    log_date:   date,
    hours,
    updated_at: new Date().toISOString(),
  })
}
