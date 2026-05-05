import { useLiveQuery } from 'dexie-react-hooks'
import { db, uuid } from '@/lib/db'
import { TODAY } from '@/lib/utils'
import { upsertToCloud, deleteFromCloud, markLocalWrite } from '@/lib/sync'
import { createCalendarEvent, isCalendarConnected } from '@/lib/googleCalendar'
import { useGamificationStore } from '@/store/gamificationStore'

export function useTasks(userId, filter = 'today') {
  const today = TODAY()
  return useLiveQuery(
    () => {
      if (!userId) return Promise.resolve([])
      return db.tasks.where('user_id').equals(userId).toArray().then(all => {
        if (filter === 'today')
          return all.filter(t => t.due_date === today || (!t.due_date && t.status === 'pending'))
        if (filter === 'upcoming')
          return all.filter(t => t.due_date > today && t.status === 'pending')
        return all
      })
    },
    [userId, filter, today]
  ) ?? []
}

export async function addTask({ title, priority, dueDate, notes, userId }) {
  const id  = uuid()
  const now = new Date().toISOString()
  const record = {
    id, user_id: userId, title,
    notes:      notes || '',
    priority:   priority || 'medium',
    status:     'pending',
    due_date:   dueDate || TODAY(),
    created_at: now,
    updated_at: now,
  }
  markLocalWrite(id)
  await db.tasks.put(record)
  if (!userId?.startsWith('demo')) upsertToCloud('tasks', record)
  // Auto-create Google Calendar event if connected
  if (isCalendarConnected()) {
    createCalendarEvent({ title, priority: record.priority, dueDate: record.due_date, notes: record.notes })
      .catch(err => console.warn('Google Calendar event creation failed:', err))
  }
}

export async function toggleTask(id) {
  const task = await db.tasks.get(id)
  if (!task) return
  const updated = {
    ...task,
    status:       task.status === 'done' ? 'pending' : 'done',
    completed_at: task.status === 'done' ? null : new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  }
  markLocalWrite(id)
  await db.tasks.put(updated)
  if (!task.user_id?.startsWith('demo')) upsertToCloud('tasks', updated)
  // Award XP when marking done
  if (updated.status === 'done') {
    useGamificationStore.getState().recordTaskComplete()
  }
}

export async function updateTask(id, fields) {
  const task = await db.tasks.get(id)
  if (!task) return
  const updated = { ...task, ...fields, updated_at: new Date().toISOString() }
  markLocalWrite(id)
  await db.tasks.put(updated)
  if (!task.user_id?.startsWith('demo')) upsertToCloud('tasks', updated)
}

export async function deleteTask(id) {
  const task = await db.tasks.get(id)
  if (!task) return
  markLocalWrite(id)
  if (!task.user_id?.startsWith('demo')) {
    await deleteFromCloud('tasks', id)
  } else {
    await db.tasks.delete(id)
  }
}