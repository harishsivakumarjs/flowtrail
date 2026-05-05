import Dexie from 'dexie'

export const db = new Dexie('FlowTrailDB')

// Version 1 — old schema with auto-increment integers (broken)
db.version(1).stores({
  habits:          '++id, user_id, archived, updated_at',
  habit_logs:      '++id, habit_id, user_id, log_date, updated_at',
  sleep_logs:      '++id, user_id, log_date, updated_at',
  tasks:           '++id, user_id, status, due_date, priority, updated_at',
  journal_entries: '++id, user_id, entry_date, updated_at',
})

// Version 2 — UUID string primary keys (fixed)
db.version(2).stores({
  habits:          'id, user_id, archived, updated_at',
  habit_logs:      'id, habit_id, user_id, log_date, updated_at',
  sleep_logs:      'id, user_id, log_date, updated_at',
  tasks:           'id, user_id, status, due_date, priority, updated_at',
  journal_entries: 'id, user_id, entry_date, updated_at',
}).upgrade(tx => {
  // Clear all old integer-keyed records on upgrade
  return Promise.all([
    tx.table('habits').clear(),
    tx.table('habit_logs').clear(),
    tx.table('sleep_logs').clear(),
    tx.table('tasks').clear(),
    tx.table('journal_entries').clear(),
  ])
})

/** Generate a UUID v4 */
export function uuid() {
  return crypto.randomUUID()
}

export default db