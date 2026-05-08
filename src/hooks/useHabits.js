import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { uuid } from '@/lib/db'
import { TODAY } from '@/lib/utils'
import { useGamificationStore } from '@/store/gamificationStore'
import { pushGamification } from '@/lib/gamificationSync'

function useRealtimeTable(table, userId, buildQuery) {
  const [data, setData] = useState([])
  useEffect(() => {
    if (!userId || !supabase) return
    const fetch = async () => {
      const { data: rows } = await buildQuery(supabase.from(table).select('*').eq('user_id', userId))
      if (rows) setData(rows)
    }
    fetch()
    const ch = supabase.channel(`${table}_${userId}_${Math.random()}`)
    ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` }, () => fetch())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId])
  return data
}

export function useHabits(userId) {
  return useRealtimeTable('habits', userId, q => q.eq('archived', false).order('sort_order'))
}

export function useTodayLogs(userId) {
  const today = TODAY()
  return useRealtimeTable('habit_logs', userId, q => q.eq('log_date', today))
}

export function useHabitLogs(userId, month, year) {
  const [logs, setLogs] = useState([])
  useEffect(() => {
    if (!userId || !supabase) return
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end   = `${year}-${String(month).padStart(2,'0')}-31`
    const fetch = async () => {
      const { data } = await supabase.from('habit_logs').select('*')
        .eq('user_id', userId).gte('log_date', start).lte('log_date', end)
      if (data) setLogs(data)
    }
    fetch()
    const ch = supabase.channel(`habit_logs_month_${userId}_${month}_${year}_${Math.random()}`)
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs', filter: `user_id=eq.${userId}` }, () => fetch())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId, month, year])
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
  if (!window.confirm('Delete this habit?')) return
  await supabase.from('habits').delete().eq('id', id)
}