import Dexie from 'dexie'

export const db = new Dexie('FlowTrailDB')

db.version(1).stores({
  habits:          'id, user_id, archived, updated_at',
  habit_logs:      'id, habit_id, user_id, log_date, updated_at',
  sleep_logs:      'id, user_id, log_date, updated_at',
  tasks:           'id, user_id, status, due_date, priority, updated_at',
  journal_entries: 'id, user_id, entry_date, updated_at',
})

/** Generate a UUID v4 */
export function uuid() {
  return crypto.randomUUID()
}

export default db