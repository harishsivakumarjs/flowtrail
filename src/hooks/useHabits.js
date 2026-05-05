import { useLiveQuery } from 'dexie-react-hooks'
import { db, uuid } from '@/lib/db'
import { TODAY, fmt } from '@/lib/utils'
import { upsertToCloud, deleteFromCloud, markLocalWrite } from '@/lib/sync'
import { subDays } from 'date-fns'

export function useHabits(userId) {
  return useLiveQuery(
    () => userId
      ? db.habits.where('user_id').equals(userId).filter(h => !h.archived).sortBy('sort_order')
      : Promise.resolve([]),
    [userId]
  ) ?? []
}

export function useTodayLogs(userId) {
  const today = TODAY()
  return useLiveQuery(
    () => userId
      ? db.habit_logs.where('user_id').equals(userId).filter(l => l.log_date === today).toArray()
      : Promise.resolve([]),
    [userId, today]
  ) ?? []
}

export function useHabitLogs(userId, month, year) {
  const start = `${year}-${String(month).padStart(2,'0')}-01`
  const end   = `${year}-${String(month).padStart(2,'0')}-31`
  return useLiveQuery(
    () => userId
      ? db.habit_logs.where('user_id').equals(userId)
          .filter(l => l.log_date >= start && l.log_date <= end).toArray()
      : Promise.resolve([]),
    [userId, month, year]
  ) ?? []
}

export async function toggleHabitLog(habitId, userId) {
  const today    = TODAY()
  const existing = await db.habit_logs
    .where('habit_id').equals(habitId)
    .filter(l => l.log_date === today)
    .first()

  if (existing) {
    const updated = { ...existing, completed: !existing.completed, updated_at: new Date().toISOString() }
    markLocalWrite(existing.id)
    await db.habit_logs.put(updated)
    if (!userId?.startsWith('demo')) upsertToCloud('habit_logs', updated)
  } else {
    const id  = uuid()
    const record = {
      id, habit_id: habitId, user_id: userId,
      log_date: today, completed: true,
      updated_at: new Date().toISOString(),
    }
    markLocalWrite(id)
    await db.habit_logs.put(record)
    if (!userId?.startsWith('demo')) upsertToCloud('habit_logs', record)
  }
}

export async function computeStreak(habitId) {
  const logs = await db.habit_logs
    .where('habit_id').equals(habitId).filter(l => l.completed).toArray()
  const doneDates = new Set(logs.map(l => l.log_date))
  let streak = 0, cursor = new Date()
  while (true) {
    const ds = fmt(cursor)
    if (doneDates.has(ds)) { streak++; cursor = subDays(cursor, 1) }
    else break
  }
  return streak
}

export async function addHabit({ name, icon, color, userId }) {
  const count = await db.habits.where('user_id').equals(userId).count()
  const id    = uuid()
  const now   = new Date().toISOString()
  const record = {
    id, user_id: userId, name,
    icon:        icon || '●',
    color:       color || '#5254e7',
    frequency:   'daily',
    target_days: [1,2,3,4,5,6,7],
    goal_type:   'streak',
    goal_value:  30,
    sort_order:  count,
    archived:    false,
    created_at:  now,
    updated_at:  now,
  }
  markLocalWrite(id)
  await db.habits.put(record)
  if (!userId?.startsWith('demo')) upsertToCloud('habits', record)
}

export async function updateHabit(id, fields) {
  const habit = await db.habits.get(id)
  if (!habit) return
  const updated = { ...habit, ...fields, updated_at: new Date().toISOString() }
  markLocalWrite(id)
  await db.habits.put(updated)
  if (!habit.user_id?.startsWith('demo')) upsertToCloud('habits', updated)
}

export async function archiveHabit(id) {
  const habit = await db.habits.get(id)
  if (!habit) return
  markLocalWrite(id)
  if (!habit.user_id?.startsWith('demo')) {
    await deleteFromCloud('habits', id)
  } else {
    await db.habits.delete(id)
  }
}