import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { TODAY, fmt } from '@/lib/utils'
import { format, subDays } from 'date-fns'

export function useHabits(userId) {
  const habits = useLiveQuery(
    () => userId
      ? db.habits.where('user_id').equals(userId).filter(h => !h.archived).sortBy('sort_order')
      : Promise.resolve([]),
    [userId]
  )
  return habits ?? []
}

export function useTodayLogs(userId) {
  const today = TODAY()
  const logs = useLiveQuery(
    () => userId
      ? db.habit_logs.where('user_id').equals(userId).filter(l => l.log_date === today).toArray()
      : Promise.resolve([]),
    [userId, today]
  )
  return logs ?? []
}

export function useHabitLogs(userId, month, year) {
  const start = `${year}-${String(month).padStart(2,'0')}-01`
  const end   = `${year}-${String(month).padStart(2,'0')}-31`
  const logs = useLiveQuery(
    () => userId
      ? db.habit_logs
          .where('user_id').equals(userId)
          .filter(l => l.log_date >= start && l.log_date <= end)
          .toArray()
      : Promise.resolve([]),
    [userId, month, year]
  )
  return logs ?? []
}

/** Toggle a habit log for today — fixed: uses simple filter, not compound index */
export async function toggleHabitLog(habitId, userId) {
  const today = TODAY()

  const existing = await db.habit_logs
    .where('habit_id').equals(habitId)
    .filter(l => l.log_date === today)
    .first()

  if (existing) {
    await db.habit_logs.update(existing.id, {
      completed:  !existing.completed,
      updated_at: new Date().toISOString(),
    })
  } else {
    await db.habit_logs.add({
      habit_id:   habitId,
      user_id:    userId,
      log_date:   today,
      completed:  true,
      updated_at: new Date().toISOString(),
    })
  }
}

/** Compute current streak for a habit */
export async function computeStreak(habitId) {
  const logs = await db.habit_logs
    .where('habit_id').equals(habitId)
    .filter(l => l.completed)
    .toArray()

  const doneDates = new Set(logs.map(l => l.log_date))
  let streak = 0
  let cursor = new Date()

  while (true) {
    const dateStr = fmt(cursor)
    if (doneDates.has(dateStr)) {
      streak++
      cursor = subDays(cursor, 1)
    } else break
  }

  return streak
}

/** Add a new habit */
export async function addHabit({ name, icon, color, userId }) {
  const count = await db.habits.where('user_id').equals(userId).count()
  return db.habits.add({
    user_id:     userId,
    name,
    icon:        icon || '●',
    color:       color || '#5254e7',
    frequency:   'daily',
    target_days: [1,2,3,4,5,6,7],
    goal_type:   'streak',
    goal_value:  30,
    sort_order:  count,
    archived:    false,
    created_at:  new Date().toISOString(),
    updated_at:  new Date().toISOString(),
  })
}

/** Update a habit */
export async function updateHabit(id, fields) {
  return db.habits.update(id, { ...fields, updated_at: new Date().toISOString() })
}

/** Archive (soft delete) a habit */
export async function archiveHabit(id) {
  return db.habits.update(id, { archived: true, updated_at: new Date().toISOString() })
}
