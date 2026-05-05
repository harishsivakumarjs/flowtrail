/** Request notification permission */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

/** Show a notification */
export function notify(title, body, options = {}) {
  if (Notification.permission !== 'granted') return
  const n = new Notification(title, {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    ...options,
  })
  setTimeout(() => n.close(), 6000)
  return n
}

/** Schedule habit reminders */
export function scheduleHabitReminder(habitName, hour = 20) {
  const now   = new Date()
  const target = new Date()
  target.setHours(hour, 0, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  const delay = target - now
  return setTimeout(() => {
    notify('🔥 Habit Reminder', `Don't forget: ${habitName}`, { tag: `habit-${habitName}` })
  }, delay)
}

/** Streak alert */
export function streakAlert(habitName, streak) {
  if (streak >= 7) {
    notify('🔥 Streak Alert!', `${habitName} — ${streak} day streak! Keep it up!`)
  }
}

/** Near goal alert */
export function nearGoalAlert(habitName, current, goal) {
  if (goal - current <= 3 && current < goal) {
    notify('⭐ Almost There!', `${habitName} — only ${goal - current} days left to hit your goal!`)
  }
}

/** Missed habit alert */
export function missedHabitAlert(habits) {
  if (!habits.length) return
  const names = habits.slice(0, 3).map(h => h.name).join(', ')
  notify('📋 Missed Habits', `You haven't logged: ${names}${habits.length > 3 ? ` +${habits.length - 3} more` : ''}`)
}