import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, Flame, Moon, CheckSquare2, Zap, Sparkles, Shield, Trophy } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useHabits, useTodayLogs, toggleHabitLog } from '@/hooks/useHabits'
import { useTasks, addTask, toggleTask } from '@/hooks/useTasks'
import { useSleepLog, saveSleepLog } from '@/hooks/useJournal'
import { greetingByHour, displayDay, TODAY, last30Days, fmt } from '@/lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { useGamificationStore, getLevel } from '@/store/gamificationStore'
import { useDopamineStore } from '@/store/dopamineStore'
import XPBar from '@/components/ui/XPBar'
import { FocusScoreBadge } from '@/components/ui/FocusScore'
import PlanMyDay from '@/components/ui/PlanMyDay'

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: 'var(--bg-overlay)' }}>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} style={{ color: color || 'var(--brand)' }} />}
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div className="text-2xl font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

function SleepInput({ userId }) {
  const today   = TODAY()
  const sleepLog = useSleepLog(userId, today)
  const [val, setVal] = useState('')

  const save = async () => {
    const h = parseFloat(val)
    if (isNaN(h) || h < 0 || h > 24) return
    await saveSleepLog({ userId, date: today, hours: h })
    setVal('')
  }

  return (
    <div className="flex items-center gap-2">
      <Moon size={14} style={{ color: 'var(--brand-light)' }} />
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sleep last night</span>
      <div className="ml-auto flex items-center gap-2">
        {sleepLog ? (
          <span className="text-sm font-semibold" style={{ color: sleepLog.hours >= 7 ? 'var(--green)' : 'var(--amber)' }}>
            {sleepLog.hours}h
          </span>
        ) : (
          <>
            <input type="number" min="0" max="24" step="0.5" placeholder="0.0" value={val}
              onChange={e => setVal(e.target.value)} onBlur={save}
              onKeyDown={e => e.key === 'Enter' && save()}
              className="w-16 text-right text-sm px-2 py-1 rounded-lg border"
              style={{ background: 'var(--bg-overlay)', borderColor: 'var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>h</span>
          </>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAppStore()
  const userId   = user?.id
  const today    = TODAY()
  const navigate = useNavigate()
  const [showPlan, setShowPlan] = useState(false)

  const habits    = useHabits(userId)
  const todayLogs = useTodayLogs(userId)
  const tasks     = useTasks(userId, 'today')
  const sleepLog  = useSleepLog(userId, today)
  const { xp, totalHabitsDone, totalTasksDone } = useGamificationStore()
  const { focusScore } = useDopamineStore()
  const level = getLevel(xp)

  const logMap   = Object.fromEntries((todayLogs || []).map(l => [l.habit_id, l]))
  const doneCount = (todayLogs || []).filter(l => l.completed).length
  const pendingTasks = tasks.filter(t => t.status === 'pending')

  // 30-day heatmap
  const days = last30Days()
  const allLogs = useLiveQuery(
    () => userId ? db.habit_logs.where('user_id').equals(userId).filter(l => l.completed).toArray() : Promise.resolve([]),
    [userId]
  ) ?? []
  const logsByDate = {}
  allLogs.forEach(l => { logsByDate[l.log_date] = (logsByDate[l.log_date] || 0) + 1 })
  const maxPerDay = habits.length || 1

  const focusColor = focusScore >= 75 ? 'var(--green)' : focusScore >= 40 ? 'var(--amber)' : 'var(--red)'

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{greetingByHour()}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{displayDay(today)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FocusScoreBadge />
          <button onClick={() => setShowPlan(true)} className="btn btn-ghost text-sm gap-1.5">
            <Sparkles size={14} /> Plan my day
          </button>
          <Link to="/dashboard/focus" className="btn btn-primary text-sm gap-1.5">
            <Shield size={14} /> Start focus
          </Link>
        </div>
      </div>

      {/* XP bar */}
      <XPBar compact />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Habits today" value={`${doneCount}/${habits.length}`}
          sub={habits.length > 0 ? `${Math.round(doneCount/habits.length*100)}% done` : 'Add some habits'}
          icon={Zap} color="var(--brand)" />
        <StatCard label="Tasks left" value={pendingTasks.length}
          sub={pendingTasks.filter(t=>t.priority==='high').length > 0 ? `${pendingTasks.filter(t=>t.priority==='high').length} high priority` : 'All clear'}
          icon={CheckSquare2} color="var(--amber)" />
        <StatCard label="Sleep" value={sleepLog ? `${sleepLog.hours}h` : '—'}
          sub={sleepLog ? (sleepLog.hours >= 7 ? 'Above goal ✓' : 'Below 7h') : 'Not logged'}
          icon={Moon} color="var(--brand-light)" />
        <StatCard label={`Level ${level.level}`} value={`${xp}xp`}
          sub={level.label} icon={Trophy} color="var(--amber)" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Habits */}
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Today's habits</span>
            <Link to="/dashboard/habits" className="text-xs flex items-center gap-1" style={{ color: 'var(--brand)' }}>
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {habits.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>No habits yet</p>
                <Link to="/dashboard/habits" className="btn btn-primary text-sm inline-flex"><Plus size={14} /> Add first habit</Link>
              </div>
            )}
            {habits.slice(0, 7).map(habit => {
              const log  = logMap[habit.id]
              const done = log?.completed === true
              return (
                <div key={habit.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--bg-overlay)] transition-colors"
                  onClick={() => toggleHabitLog(habit.id, userId)}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${done ? 'border-[var(--green)] bg-[var(--green)]' : 'border-[var(--border-mid)]'}`}>
                    {done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className={`text-sm flex-1 ${done ? 'line-through opacity-50' : ''}`} style={{ color: 'var(--text-primary)' }}>
                    {habit.icon} {habit.name}
                  </span>
                  {done && <span className="text-xs" style={{ color: 'var(--green)' }}>+10xp</span>}
                </div>
              )
            })}
          </div>
          <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <SleepInput userId={userId} />
          </div>
        </div>

        <div className="space-y-4">
          {/* Tasks */}
          <div className="card">
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Today's tasks</span>
              <Link to="/dashboard/tasks" className="text-xs flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                View all <ChevronRight size={13} />
              </Link>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {pendingTasks.length === 0 && (
                <div className="px-4 py-5 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks today</p>
                </div>
              )}
              {pendingTasks.slice(0, 5).map(task => (
                <div key={task.id}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--bg-overlay)] transition-colors"
                  onClick={() => toggleTask(task.id)}>
                  <div className="w-4 h-4 rounded border-2 flex-shrink-0" style={{ borderColor: 'var(--border-mid)' }} />
                  <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{task.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium badge-${task.priority}`}>{task.priority}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap */}
          <div className="card px-4 py-3">
            <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>30-day habit heatmap</div>
            <div className="flex flex-wrap gap-1">
              {days.map(day => {
                const dateStr = fmt(day)
                const count   = logsByDate[dateStr] || 0
                const level   = Math.min(4, Math.ceil((count / maxPerDay) * 4))
                const isToday = dateStr === today
                return (
                  <div key={dateStr} title={`${format(day, 'MMM d')}: ${count} habits`}
                    className={`w-5 h-5 rounded-sm transition-colors ${isToday ? 'ring-2 ring-[var(--brand)]' : ''} heat-${level}`} />
                )
              })}
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{ background: 'var(--bg-overlay)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Shortcuts:</span>
            <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>N</kbd>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Plan day</span>
            <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>F</kbd>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Focus mode</span>
          </div>
        </div>
      </div>

      <PlanMyDay open={showPlan} onClose={() => setShowPlan(false)} />
    </div>
  )
}