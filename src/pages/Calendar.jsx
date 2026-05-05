import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         getDay, isSameMonth, isToday, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { TODAY } from '@/lib/utils'

function DayCell({ day, month, tasks, habitCount, habitTotal }) {
  const isCurrentMonth = isSameMonth(day, month)
  const isTodayDay     = isToday(day)
  const dateStr        = format(day, 'yyyy-MM-dd')
  const dayTasks       = tasks.filter(t => t.due_date === dateStr)
  const completedTasks = dayTasks.filter(t => t.status === 'done').length
  const rate = habitTotal > 0 ? habitCount / habitTotal : 0

  return (
    <div className={`min-h-[80px] md:min-h-[100px] p-1.5 md:p-2 border-b border-r flex flex-col
      ${!isCurrentMonth ? 'opacity-30' : ''}
      ${isTodayDay ? 'bg-[color-mix(in_srgb,var(--brand)_5%,transparent)]' : ''}
      `}
      style={{ borderColor: 'var(--border)' }}>

      <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 flex-shrink-0
        ${isTodayDay ? 'bg-[var(--brand)] text-white' : ''}`}
        style={{ color: isTodayDay ? undefined : 'var(--text-secondary)' }}>
        {format(day, 'd')}
      </div>

      {/* Habit progress dot */}
      {isCurrentMonth && habitTotal > 0 && (
        <div className="flex gap-0.5 mb-1 flex-wrap">
          {Array.from({ length: Math.min(habitTotal, 6) }).map((_, i) => (
            <div key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: i < habitCount ? 'var(--green)' : 'var(--border-mid)' }}
            />
          ))}
        </div>
      )}

      {/* Task chips */}
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {dayTasks.slice(0, 2).map(task => (
          <div key={task.id}
            className={`text-xs px-1.5 py-0.5 rounded truncate ${task.status === 'done' ? 'opacity-50 line-through' : ''}`}
            style={{
              background: task.priority === 'high'
                ? 'color-mix(in srgb, var(--red) 15%, transparent)'
                : task.priority === 'medium'
                ? 'color-mix(in srgb, var(--amber) 15%, transparent)'
                : 'color-mix(in srgb, var(--green) 15%, transparent)',
              color: task.priority === 'high' ? 'var(--red)'
                : task.priority === 'medium' ? 'var(--amber)'
                : 'var(--green)',
              fontSize: '10px',
            }}>
            {task.title}
          </div>
        ))}
        {dayTasks.length > 2 && (
          <div className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            +{dayTasks.length - 2} more
          </div>
        )}
      </div>
    </div>
  )
}

export default function Calendar() {
  const { user } = useAppStore()
  const userId = user?.id
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad start
  const startPad = getDay(monthStart) // 0=Sun
  const paddedStart = Array.from({ length: startPad })

  const tasks = useLiveQuery(
    () => userId
      ? db.tasks.where('user_id').equals(userId).toArray()
      : Promise.resolve([]),
    [userId]
  ) ?? []

  const habitLogs = useLiveQuery(
    () => userId
      ? db.habit_logs.where('user_id').equals(userId).filter(l => l.completed).toArray()
      : Promise.resolve([]),
    [userId]
  ) ?? []

  const habitCount = useLiveQuery(
    () => userId
      ? db.habits.where('user_id').equals(userId).filter(h => !h.archived).count()
      : Promise.resolve(0),
    [userId]
  ) ?? 0

  const logsByDate = {}
  habitLogs.forEach(l => {
    logsByDate[l.log_date] = (logsByDate[l.log_date] || 0) + 1
  })

  const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Calendar</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost p-2" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft size={17} />
          </button>
          <button
            className="btn btn-ghost text-sm px-3"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </button>
          <button className="btn btn-ghost p-2" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {/* Day labels */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
          {DAY_LABELS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium"
              style={{ color: 'var(--text-muted)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {paddedStart.map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[80px] md:min-h-[100px] border-b border-r"
              style={{ borderColor: 'var(--border)', opacity: 0.3 }} />
          ))}
          {days.map(day => {
            const ds = format(day, 'yyyy-MM-dd')
            return (
              <DayCell
                key={ds}
                day={day}
                month={currentMonth}
                tasks={tasks}
                habitCount={logsByDate[ds] || 0}
                habitTotal={habitCount}
              />
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 px-1">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="flex gap-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--border-mid)' }} />
          </div>
          Habits done / remaining
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="w-3 h-3 rounded" style={{ background: 'color-mix(in srgb, var(--amber) 25%, transparent)' }} />
          Task due
        </div>
      </div>
    </div>
  )
}
