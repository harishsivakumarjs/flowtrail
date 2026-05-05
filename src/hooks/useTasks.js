import { useLiveQuery } from 'dexie-react-hooks'
import { db, uuid } from '@/lib/db'
import { TODAY } from '@/lib/utils'
import { syncToCloud, deleteFromCloud, markLocalWrite } from '@/lib/sync'

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
  const id = uuid()
  markLocalWrite(id)
  await db.tasks.put({
    id,
    user_id:    userId,
    title,
    notes:      notes || '',
    priority:   priority || 'medium',
    status:     'pending',
    due_date:   dueDate || TODAY(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (!userId?.startsWith('demo')) syncToCloud(userId)
}

export async function toggleTask(id) {
  const task = await db.tasks.get(id)
  if (!task) return
  markLocalWrite(id)
  await db.tasks.update(id, {
    status:       task.status === 'done' ? 'pending' : 'done',
    completed_at: task.status === 'done' ? null : new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  })
  if (!task.user_id?.startsWith('demo')) syncToCloud(task.user_id)
}

export async function updateTask(id, fields) {
  const task = await db.tasks.get(id)
  markLocalWrite(id)
  await db.tasks.update(id, { ...fields, updated_at: new Date().toISOString() })
  if (task && !task.user_id?.startsWith('demo')) syncToCloud(task.user_id)
}

export async function deleteTask(id) {
  const task = await db.tasks.get(id)
  if (!task) return
  markLocalWrite(id)
  if (!task.user_id?.startsWith('demo')) {
    await deleteFromCloud('tasks', id, task.user_id)
  } else {
    await db.tasks.delete(id)
  }
}