import { useLiveQuery } from 'dexie-react-hooks'
import { db, uuid } from '@/lib/db'
import { TODAY, fmt } from '@/lib/utils'
import { syncToCloud, deleteFromCloud, markLocalWrite } from '@/lib/sync'
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
    markLocalWrite(existing.id)
    await db.habit_logs.update(existing.id, {
      completed:  !existing.completed,
      updated_at: new Date().toISOString(),
    })
    if (!userId?.startsWith('demo')) syncToCloud(userId)
  } else {
    const id = uuid()
    markLocalWrite(id)
    await db.habit_logs.put({
      id,
      habit_id:   habitId,
      user_id:    userId,
      log_date:   today,
      completed:  true,
      updated_at: new Date().toISOString(),
    })
    if (!userId?.startsWith('demo')) syncToCloud(userId)
  }
}

export async function computeStreak(habitId) {
  const logs = await db.habit_logs
    .where('habit_id').equals(habitId)
    .filter(l => l.completed).toArray()
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
  const id = uuid()
  markLocalWrite(id)
  await db.habits.put({
    id,
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
  if (!userId?.startsWith('demo')) syncToCloud(userId)
}

export async function updateHabit(id, fields) {
  const habit = await db.habits.get(id)
  markLocalWrite(id)
  await db.habits.update(id, { ...fields, updated_at: new Date().toISOString() })
  if (habit && !habit.user_id?.startsWith('demo')) syncToCloud(habit.user_id)
}

export async function archiveHabit(id) {
  const habit = await db.habits.get(id)
  markLocalWrite(id)
  if (!habit) return
  if (!habit.user_id?.startsWith('demo')) {
    await deleteFromCloud('habits', id)
  } else {
    await db.habits.delete(id)
  }
}