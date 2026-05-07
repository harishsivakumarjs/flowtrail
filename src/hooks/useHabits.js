import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { uuid } from '@/lib/db'
import { TODAY, fmt } from '@/lib/utils'
import { subDays, format } from 'date-fns'
import { useGamificationStore } from '@/store/gamificationStore'
import { pushGamification } from '@/lib/gamificationSync'

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
    if (!supabase || !userId) return
    const sub = supabase.channel(`habits_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [userId, fetch])
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
    if (!supabase || !userId) return
    const sub = supabase.channel(`habit_logs_today_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs', filter: `user_id=eq.${userId}` }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [userId, fetch])
  return logs
}

export function useHabitLogs(userId, month, year) {
  const [logs, setLogs] = useState([])
  const start = `${year}-${String(month).padStart(2,'0')}-01`
  const end   = `${year}-${String(month).padStart(2,'0')}-31`
  const fetch = useCallback(async () => {
    if (!userId || !supabase) return
    const { data } = await supabase.from('habit_logs').select('*')
      .eq('user_id', userId).gte('log_date', start).lte('log_date', end)
    if (data) setLogs(data)
  }, [userId, month, year])

  useEffect(() => {
    fetch()
    if (!supabase || !userId) return
    const sub = supabase.channel(`habit_logs_month_${userId}_${month}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs', filter: `user_id=eq.${userId}` }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [userId, month, year, fetch])
  return logs
}

export async function toggleHabitLog(habitId, userId) {
  if (!supabase) return
  const today = TODAY()
  const { data: existing } = await supabase.from('habit_logs').select('*')
    .eq('habit_id', habitId).eq('user_id', userId).eq('log_date', today).single()

  if (existing) {
    await supabase.from('habit_logs').update({
      completed: !existing.completed,
      updated_at: new Date().toISOString()
    }).eq('id', existing.id)
    if (!existing.completed) {
      useGamificationStore.getState().recordHabitDone()
      pushGamification(userId)
    }
  } else {
    await supabase.from('habit_logs').insert({
      id: uuid(), habit_id: habitId, user_id: userId,
      log_date: today, completed: true,
      updated_at: new Date().toISOString(),
    })
    useGamificationStore.getState().recordHabitDone()
    pushGamification(userId)
  }
}

export async function computeStreak(habitId) {
  if (!supabase) return 0
  const { data } = await supabase.from('habit_logs').select('log_date')
    .eq('habit_id', habitId).eq('completed', true)
  const doneDates = new Set((data || []).map(l => l.log_date))
  let streak = 0, cursor = new Date()
  while (true) {
    const ds = fmt(cursor)
    if (doneDates.has(ds)) { streak++; cursor = subDays(cursor, 1) }
    else break
  }
  return streak
}

export async function addHabit({ name, icon, color, userId, goalDays }) {
  if (!supabase) return
  const { count } = await supabase.from('habits').select('*', { count: 'exact', head: true }).eq('user_id', userId)
  await supabase.from('habits').insert({
    id: uuid(), user_id: userId, name,
    icon: icon || '●', color: color || '#5254e7',
    frequency: 'daily', target_days: [1,2,3,4,5,6,7],
    goal_type: 'streak', goal_value: goalDays || 30,
    sort_order: count || 0, archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
}

export async function updateHabit(id, fields) {
  if (!supabase) return
  await supabase.from('habits').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function archiveHabit(id) {
  if (!supabase) return
  await supabase.from('habits').delete().eq('id', id)
}