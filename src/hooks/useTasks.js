import { useLiveQuery } from 'dexie-react-hooks'
import { db, uuid } from '@/lib/db'
import { TODAY } from '@/lib/utils'
import { upsertToCloud, deleteFromCloud, markLocalWrite } from '@/lib/sync'
import { createCalendarEvent, isCalendarConnected } from '@/lib/googleCalendar'
import { useGamificationStore } from '@/store/gamificationStore'
import { pushGamification } from '@/lib/gamificationSync'

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

export async function addTask({ title, priority, dueDate, dueTime, notes, userId }) {
  const id  = uuid()
  const now = new Date().toISOString()
  const record = {
    id, user_id: userId, title,
    notes:      notes || '',
    priority:   priority || 'medium',
    status:     'pending',
    due_date:   dueDate || TODAY(),
    due_time:   dueTime || null,
    created_at: now,
    updated_at: now,
  }
  markLocalWrite(id)
  await db.tasks.put(record)
  if (!userId?.startsWith('demo')) {
    upsertToCloud('tasks', record)
    // Auto-create Google Calendar event if connected
    if (isCalendarConnected()) {
      const startDateTime = dueTime ? `${record.due_date}T${dueTime}:00` : null
      createCalendarEvent({ title, priority: record.priority, dueDate: record.due_date, notes: record.notes, startDateTime })
        .catch(err => console.warn('GCal event creation failed:', err))
    }
  }
  // Schedule notification if has time
  if (dueTime) scheduleTaskNotification(record)
}

export async function toggleTask(id) {
  const task = await db.tasks.get(id)
  if (!task) return
  const isDone = task.status === 'done'
  const updated = {
    ...task,
    status:       isDone ? 'pending' : 'done',
    completed_at: isDone ? null : new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  }
  markLocalWrite(id)
  await db.tasks.put(updated)
  if (!task.user_id?.startsWith('demo')) upsertToCloud('tasks', updated)
  // Award XP when completing
  if (!isDone) {
    useGamificationStore.getState().recordTaskDone()
    pushGamification(task.user_id)
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

/** Schedule a browser notification 30 min before task due time */
export function scheduleTaskNotification(task) {
  if (Notification.permission !== 'granted') return
  if (!task.due_date || !task.due_time) return

  const dueDateTime = new Date(`${task.due_date}T${task.due_time}:00`)
  const notifyAt    = dueDateTime.getTime() - Date.now() - 30 * 60 * 1000

  if (notifyAt > 0 && notifyAt < 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      new Notification(`⏰ Task due in 30 min: ${task.title}`, {
        body: `Priority: ${task.priority}`,
        icon: '/favicon.svg',
        tag:  `task-${task.id}`,
      })
    }, notifyAt)
  }
}