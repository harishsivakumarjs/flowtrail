import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { uuid } from '@/lib/db'
import { TODAY } from '@/lib/utils'
import { useGamificationStore } from '@/store/gamificationStore'
import { pushGamification } from '@/lib/gamificationSync'
import { isCalendarConnected, createCalendarEvent } from '@/lib/googleCalendar'

// Global listeners for instant UI updates
let taskListeners = []
function notifyTasks() { taskListeners.forEach(fn => fn()) }

export function useTasks(userId, filter = 'today') {
  const [tasks, setTasks] = useState([])
  const today = TODAY()

  const fetch = useCallback(async () => {
    if (!userId || !supabase) return
    let q = supabase.from('tasks').select('*').eq('user_id', userId)
    if (filter === 'today')
      q = q.eq('due_date', today).eq('status', 'pending')
    else if (filter === 'upcoming')
      q = q.gt('due_date', today).eq('status', 'pending')
    const { data, error } = await q.order('due_date')
    if (error) { console.error('useTasks fetch:', error); return }
    if (data) setTasks(data)
  }, [userId, filter, today])

  useEffect(() => {
    fetch()
    taskListeners.push(fetch)
    return () => { taskListeners = taskListeners.filter(f => f !== fetch) }
  }, [fetch])

  return tasks
}

export async function addTask({ title, priority, dueDate, dueTime, endTime, notes, userId }) {
  if (!supabase) { console.error('addTask: supabase not initialized'); return }
  if (!userId)   { console.error('addTask: userId missing'); return }
  // Build record - only include columns that exist in Supabase schema
  const record = {
    id: uuid(),
    user_id: userId,
    title: title.trim(),
    notes: notes || '',
    priority: priority || 'medium',
    status: 'pending',
    due_date: dueDate || TODAY(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  // Add optional time fields only if they have values
  if (dueTime) record.due_time = dueTime
  if (endTime) record.end_time = endTime
  const { error } = await supabase.from('tasks').insert(record)
  if (error) { console.error('addTask insert error:', error); return }
  notifyTasks()
  if (isCalendarConnected() && dueTime) {
    createCalendarEvent({
      title: record.title, priority: record.priority,
      dueDate: record.due_date, notes: record.notes,
      startDateTime: `${record.due_date}T${dueTime}:00`,
      endDateTime: endTime ? `${record.due_date}T${endTime}:00` : null,
    }).catch(() => {})
  }
}

export async function toggleTask(id) {
  if (!supabase) return
  const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single()
  if (error || !data) { console.error('toggleTask fetch:', error); return }
  const isDone = data.status === 'done'
  const { error: updateError } = await supabase.from('tasks').update({
    status: isDone ? 'pending' : 'done',
    completed_at: isDone ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (updateError) { console.error('toggleTask update:', updateError); return }
  notifyTasks()
  if (!isDone) {
    useGamificationStore.getState().recordTaskDone()
    pushGamification(data.user_id)
  }
}

export async function updateTask(id, fields) {
  if (!supabase) return
  const { error } = await supabase.from('tasks')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) { console.error('updateTask:', error); return }
  notifyTasks()
}

export async function deleteTask(id) {
  if (!supabase) return
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) { console.error('deleteTask:', error); return }
  notifyTasks()
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