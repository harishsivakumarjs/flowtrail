import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { TODAY } from '@/lib/utils'

export function useTasks(userId, filter = 'today') {
  const today = TODAY()

  const tasks = useLiveQuery(
    () => {
      if (!userId) return Promise.resolve([])
      let query = db.tasks.where('user_id').equals(userId)
      return query.toArray().then(all => {
        if (filter === 'today')
          return all.filter(t => t.due_date === today || (!t.due_date && t.status === 'pending'))
        if (filter === 'upcoming')
          return all.filter(t => t.due_date > today && t.status === 'pending')
        return all.filter(t => t.status === 'pending')
      })
    },
    [userId, filter, today]
  )

  return tasks ?? []
}

export async function addTask({ title, priority, dueDate, notes, userId }) {
  return db.tasks.add({
    user_id:    userId,
    title,
    notes:      notes || '',
    priority:   priority || 'medium',
    status:     'pending',
    due_date:   dueDate || TODAY(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}

export async function toggleTask(id) {
  const task = await db.tasks.get(id)
  if (!task) return
  return db.tasks.update(id, {
    status:       task.status === 'done' ? 'pending' : 'done',
    completed_at: task.status === 'done' ? null : new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  })
}

export async function updateTask(id, fields) {
  return db.tasks.update(id, { ...fields, updated_at: new Date().toISOString() })
}

export async function deleteTask(id) {
  return db.tasks.delete(id)
}
