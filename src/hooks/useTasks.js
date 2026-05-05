import Dexie from 'dexie'

export const db = new Dexie('FlowTrailDB')

db.version(1).stores({
  habits:          '++id, user_id, archived, updated_at',
  habit_logs:      '++id, habit_id, user_id, log_date, updated_at',
  sleep_logs:      '++id, user_id, log_date, updated_at',
  tasks:           '++id, user_id, status, due_date, priority, updated_at',
  journal_entries: '++id, user_id, entry_date, updated_at',
})

db.version(2).stores({
  habits:          'id, user_id, archived, updated_at',
  habit_logs:      'id, habit_id, user_id, log_date, updated_at',
  sleep_logs:      'id, user_id, log_date, updated_at',
  tasks:           'id, user_id, status, due_date, priority, updated_at',
  journal_entries: 'id, user_id, entry_date, updated_at',
}).upgrade(tx => Promise.all([
  tx.table('habits').clear(),
  tx.table('habit_logs').clear(),
  tx.table('sleep_logs').clear(),
  tx.table('tasks').clear(),
  tx.table('journal_entries').clear(),
]))

// Version 3 — add due_time field to tasks (no data migration needed, just schema)
db.version(3).stores({
  habits:          'id, user_id, archived, updated_at',
  habit_logs:      'id, habit_id, user_id, log_date, updated_at',
  sleep_logs:      'id, user_id, log_date, updated_at',
  tasks:           'id, user_id, status, due_date, due_time, priority, updated_at',
  journal_entries: 'id, user_id, entry_date, updated_at',
})

export function uuid() {
  return crypto.randomUUID()
}

export default db