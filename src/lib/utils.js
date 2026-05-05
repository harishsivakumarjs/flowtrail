import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         isToday, isSameDay, subDays, addDays } from 'date-fns'

export const TODAY = () => format(new Date(), 'yyyy-MM-dd')

export const fmt = (date, pattern = 'yyyy-MM-dd') =>
  format(new Date(date), pattern)

export const displayDate = (date) =>
  format(new Date(date), 'MMMM d, yyyy')

export const displayDay = (date) =>
  format(new Date(date), 'EEEE, MMMM d')

export const monthDays = (year, month) => {
  const start = startOfMonth(new Date(year, month - 1))
  const end   = endOfMonth(new Date(year, month - 1))
  return eachDayOfInterval({ start, end })
}

export const last30Days = () => {
  const end   = new Date()
  const start = subDays(end, 29)
  return eachDayOfInterval({ start, end })
}

export const isDateToday = (dateStr) => isToday(new Date(dateStr))

export const isSameDayStr = (a, b) =>
  isSameDay(new Date(a), new Date(b))

export const weekdayShort = (date) =>
  format(new Date(date), 'EEE')

export const currentMonthYear = () =>
  format(new Date(), 'MMMM yyyy')

export const greetingByHour = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
