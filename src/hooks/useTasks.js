import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { uuid } from '@/lib/db'
import { TODAY } from '@/lib/utils'
import { useGamificationStore } from '@/store/gamificationStore'
import { pushGamification } from '@/lib/gamificationSync'
import { createCalendarEvent, isCalendarConnected } from '@/lib/googleCalendar'

// ── Realtime hook ─────────────────────────────────────────────
export function useTasks(userId, filter = 'today') {
  const [tasks, setTasks] = useState([])
  const today = TODAY()

  const fetchTasks = useCallback(async () => {
    if (!userId || !supabase) return
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })
    if (data) {
      let filtered = data
      if (filter === 'today')
        filtered = data.filter(t => (t.due_date === today || !t.due_date) && t.status === 'pending')
      else if (filter === 'upcoming')
        filtered = data.filter(t => t.due_date > today && t.status === 'pending')
      setTasks(filtered)
    }
  }, [userId, filter, today])

  useEffect(() => {
    fetchTasks()
    if (!supabase || !userId) return
    const sub = supabase
      .channel(`tasks_${userId}_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, () => fetchTasks())
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [userId, filter, fetchTasks])

  return tasks
}

export async function addTask({ title, priority, dueDate, dueTime, endTime, notes, userId }) {
  if (!supabase) return
  const record = {
    id: uuid(), user_id: userId, title,
    notes: notes || '', priority: priority || 'medium',
    status: 'pending',
    due_date: dueDate || TODAY(),
    due_time: dueTime || null,
    end_time: endTime || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  await supabase.from('tasks').insert(record)
  if (isCalendarConnected()) {
    const startDateTime = dueTime ? `${record.due_date}T${dueTime}:00` : null
    createCalendarEvent({ title, priority: record.priority, dueDate: record.due_date, notes: record.notes, startDateTime })
      .catch(() => {})
  }
}

export async function toggleTask(id) {
  if (!supabase) return
  const { data } = await supabase.from('tasks').select('*').eq('id', id).single()
  if (!data) return
  const isDone = data.status === 'done'
  await supabase.from('tasks').update({
    status: isDone ? 'pending' : 'done',
    completed_at: isDone ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (!isDone) {
    useGamificationStore.getState().recordTaskDone()
    pushGamification(data.user_id)
  }
}

export async function updateTask(id, fields) {
  if (!supabase) return
  await supabase.from('tasks').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteTask(id) {
  if (!supabase) return
  await supabase.from('tasks').delete().eq('id', id)
}

export function scheduleTaskNotification(task) {
  if (Notification.permission !== 'granted') return
  if (!task.due_date || !task.due_time) return
  const dueDateTime = new Date(`${task.due_date}T${task.due_time}:00`)
  const notifyAt = dueDateTime.getTime() - Date.now() - 30 * 60 * 1000
  if (notifyAt > 0 && notifyAt < 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      new Notification(`⏰ Task due in 30 min: ${task.title}`, {
        body: `Priority: ${task.priority}`, icon: '/favicon.svg', tag: `task-${task.id}`,
      })
    }, notifyAt)
  }
}