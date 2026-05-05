import { supabase } from './supabase'
import { useGamificationStore } from '@/store/gamificationStore'

/** Push local XP/badges to Supabase profiles */
export async function pushGamification(userId) {
  if (!supabase || !userId || userId === 'demo-user') return
  const { xp, earnedBadges, totalHabitsDone, totalTasksDone, totalSessions } = useGamificationStore.getState()
  await supabase.from('profiles').upsert({
    id: userId,
    xp,
    earned_badges:      earnedBadges,
    total_habits_done:  totalHabitsDone,
    total_tasks_done:   totalTasksDone,
    total_sessions:     totalSessions,
  }, { onConflict: 'id' })
}

/** Pull XP/badges from Supabase and merge (take the higher XP) */
export async function pullGamification(userId) {
  if (!supabase || !userId || userId === 'demo-user') return
  const { data, error } = await supabase
    .from('profiles').select('xp, earned_badges, total_habits_done, total_tasks_done, total_sessions')
    .eq('id', userId).single()
  if (error || !data) return

  const local = useGamificationStore.getState()
  // Take the higher value for each field (never go backwards)
  useGamificationStore.setState({
    xp:               Math.max(local.xp, data.xp || 0),
    earnedBadges:     [...new Set([...local.earnedBadges, ...(data.earned_badges || [])])],
    totalHabitsDone:  Math.max(local.totalHabitsDone, data.total_habits_done || 0),
    totalTasksDone:   Math.max(local.totalTasksDone,  data.total_tasks_done  || 0),
    totalSessions:    Math.max(local.totalSessions,   data.total_sessions    || 0),
  })
}