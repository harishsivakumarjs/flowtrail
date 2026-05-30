import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { uuid } from '@/lib/db'
import { TODAY } from '@/lib/utils'

// Global state so all components share the same data
let habitsListeners = []
let habitLogsListeners = []

function notifyHabits() { habitsListeners.forEach(fn => fn()) }
function notifyHabitLogs() { habitLogsListeners.forEach(fn => fn()) }

export function useHabits(userId) {
  const [habits, setHabits] = useState([])

  const fetch = useCallback(async () => {
    if (!userId || !supabase) return
    const { data } = await supabase.from('habits').select('*')
      .eq('user_id', userId).eq('archived', false).order('sort_order')
    if (data) setHabits(data)
  }, [userId])

  useEffect(() => {
    fetch()
    habitsListeners.push(fetch)
    return () => { habitsListeners = habitsListeners.filter(f => f !== fetch) }
  }, [fetch])

  return habits
}

export function useTodayLogs(userId) {
  const [logs, setLogs] = useState([])
  const today = TODAY()

  const fetch = useCallback(async () => {
    if (!userId || !supabase) return
    const { data } = await supabase.from('habit_logs').select('*')
      .eq('user_id', userId).eq('log_date', today)
    if (data) setLogs(data)
  }, [userId, today])

  useEffect(() => {
    fetch()
    habitLogsListeners.push(fetch)
    return () => { habitLogsListeners = habitLogsListeners.filter(f => f !== fetch) }
  }, [fetch])

  return logs
}

export function useHabitLogs(userId, month, year) {
  const [logs, setLogs] = useState([])

  const fetch = useCallback(async () => {
    if (!userId || !supabase) return
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end   = `${year}-${String(month).padStart(2,'0')}-31`
    const { data } = await supabase.from('habit_logs').select('*')
      .eq('user_id', userId).gte('log_date', start).lte('log_date', end)
    if (data) setLogs(data)
  }, [userId, month, year])

  useEffect(() => {
    fetch()
    habitLogsListeners.push(fetch)
    return () => { habitLogsListeners = habitLogsListeners.filter(f => f !== fetch) }
  }, [fetch])

  return logs
}

export async function toggleHabitLog(habitId, userId) {
  if (!supabase) return
  const today = TODAY()
  const { data: existing } = await supabase.from('habit_logs').select('*')
    .eq('habit_id', habitId).eq('user_id', userId).eq('log_date', today).single()
  if (existing) {
    await supabase.from('habit_logs').update({
      completed: !existing.completed, updated_at: new Date().toISOString()
    }).eq('id', existing.id)
  } else {
    await supabase.from('habit_logs').insert({
      id: uuid(), habit_id: habitId, user_id: userId,
      log_date: today, completed: true,
      updated_at: new Date().toISOString(),
    })
  }
  notifyHabitLogs()
}

export async function addHabit({ name, icon, color, userId, goalDays }) {
  if (!supabase) return
  const { count } = await supabase.from('habits').select('*', { count: 'exact', head: true }).eq('user_id', userId)
  const { error } = await supabase.from('habits').insert({
    id: uuid(), user_id: userId, name,
    icon: icon || '●', color: color || '#5254e7',
    frequency: 'daily', target_days: [1,2,3,4,5,6,7],
    goal_type: 'streak', goal_value: goalDays || 30,
    sort_order: count || 0, archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (error) console.error('addHabit:', error)
  else notifyHabits()
}

export async function updateHabit(id, fields) {
  if (!supabase) return
  const { error } = await supabase.from('habits')
    .update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) console.error('updateHabit:', error)
  else notifyHabits()
}

export async function archiveHabit(id) {
  if (!supabase) return
  if (!window.confirm('Delete this habit?')) return
  const { error } = await supabase.from('habits').delete().eq('id', id)
  if (error) console.error('archiveHabit:', error)
  else notifyHabits()
}