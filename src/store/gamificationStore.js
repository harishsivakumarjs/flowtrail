import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const BADGES = [
  { id: 'first_habit',    label: 'First Step',      icon: '🌱', desc: 'Complete your first habit',        xp: 0   },
  { id: 'streak_3',       label: 'On a Roll',       icon: '🔥', desc: '3-day streak on any habit',        xp: 50  },
  { id: 'streak_7',       label: 'Week Warrior',    icon: '⚡', desc: '7-day streak on any habit',        xp: 100 },
  { id: 'streak_30',      label: 'Iron Will',       icon: '💎', desc: '30-day streak on any habit',       xp: 500 },
  { id: 'tasks_10',       label: 'Doer',            icon: '✅', desc: 'Complete 10 tasks',                xp: 50  },
  { id: 'tasks_50',       label: 'Achiever',        icon: '🏆', desc: 'Complete 50 tasks',                xp: 200 },
  { id: 'journal_7',      label: 'Story Teller',    icon: '📖', desc: 'Write journal 7 days in a row',    xp: 150 },
  { id: 'focus_5',        label: 'Deep Worker',     icon: '🎯', desc: 'Complete 5 focus sessions',        xp: 100 },
  { id: 'perfect_day',    label: 'Perfect Day',     icon: '⭐', desc: 'Complete all habits in one day',   xp: 200 },
  { id: 'early_bird',     label: 'Early Bird',      icon: '🌅', desc: 'Log habits before 8am',            xp: 75  },
]

const LEVELS = [
  { level: 1,  xp: 0,    label: 'Novice' },
  { level: 2,  xp: 100,  label: 'Apprentice' },
  { level: 3,  xp: 250,  label: 'Practitioner' },
  { level: 4,  xp: 500,  label: 'Disciplined' },
  { level: 5,  xp: 1000, label: 'Focused' },
  { level: 6,  xp: 2000, label: 'Consistent' },
  { level: 7,  xp: 3500, label: 'Elite' },
  { level: 8,  xp: 5000, label: 'Master' },
  { level: 9,  xp: 7500, label: 'Legend' },
  { level: 10, xp: 10000,label: 'FlowTrail Pro' },
]

export function getLevel(xp) {
  let current = LEVELS[0]
  for (const l of LEVELS) {
    if (xp >= l.xp) current = l
    else break
  }
  const next = LEVELS.find(l => l.xp > xp)
  return { ...current, next, progress: next ? Math.round((xp - current.xp) / (next.xp - current.xp) * 100) : 100 }
}

export { BADGES, LEVELS }

export const useGamificationStore = create(
  persist(
    (set, get) => ({
      xp:           0,
      earnedBadges: [],
      totalHabitsDone:  0,
      totalTasksDone:   0,
      totalSessions:    0,
      totalJournalDays: 0,
      lastXPGain: null,

      addXP: (amount, reason) => {
        set(s => ({
          xp: s.xp + amount,
          lastXPGain: { amount, reason, time: Date.now() }
        }))
      },

      recordHabitDone: () => {
        const s = get()
        const newTotal = s.totalHabitsDone + 1
        set({ totalHabitsDone: newTotal })
        get().addXP(10, 'Habit completed')
        if (newTotal === 1) get().earnBadge('first_habit')
      },

      recordTaskDone: () => {
        const s = get()
        const newTotal = s.totalTasksDone + 1
        set({ totalTasksDone: newTotal })
        get().addXP(15, 'Task completed')
        if (newTotal === 10) get().earnBadge('tasks_10')
        if (newTotal === 50) get().earnBadge('tasks_50')
      },

      recordJournalEntry: () => {
        get().addXP(20, 'Journal entry written')
      },

      recordSession: () => {
        const s = get()
        const newTotal = s.totalSessions + 1
        set({ totalSessions: newTotal })
        get().addXP(25, 'Focus session completed')
        if (newTotal === 5) get().earnBadge('focus_5')
      },

      recordStreak: (days) => {
        get().addXP(days * 5, `${days}-day streak`)
        if (days >= 3)  get().earnBadge('streak_3')
        if (days >= 7)  get().earnBadge('streak_7')
        if (days >= 30) get().earnBadge('streak_30')
      },

      recordPerfectDay: () => {
        get().addXP(50, 'Perfect day')
        get().earnBadge('perfect_day')
      },

      earnBadge: (id) => {
        const s = get()
        if (s.earnedBadges.includes(id)) return
        const badge = BADGES.find(b => b.id === id)
        if (!badge) return
        set(s2 => ({ earnedBadges: [...s2.earnedBadges, id] }))
        get().addXP(badge.xp, `Badge: ${badge.label}`)
      },
    }),
    {
      name: 'flowtrail-gamification',
      partialize: s => ({
        xp: s.xp, earnedBadges: s.earnedBadges,
        totalHabitsDone: s.totalHabitsDone,
        totalTasksDone:  s.totalTasksDone,
        totalSessions:   s.totalSessions,
      })
    }
  )
)