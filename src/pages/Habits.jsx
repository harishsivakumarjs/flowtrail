import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Plus, Flame, Trash2, Edit2 } from 'lucide-react'
import { format, getDaysInMonth } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { useHabits, useHabitLogs, toggleHabitLog, addHabit, updateHabit, archiveHabit } from '@/hooks/useHabits'
import Modal from '@/components/ui/Modal'
import { TODAY } from '@/lib/utils'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#5254e7','#22c55e','#f59e0b','#ef4444','#ec4899','#14b8a6','#8b5cf6','#f97316']
const ICONS  = ['●','★','♥','◆','▲','⚡','🏃','📚','💧','🧘','🎯','💪','🌙','✍️','🥗']

// ── Add/Edit Habit Modal ──────────────────────────────────────
function AddHabitModal({ open, onClose, userId, editing = null }) {
  const [name, setName]       = useState(editing?.name || '')
  const [icon, setIcon]       = useState(editing?.icon || '●')
  const [color, setColor]     = useState(editing?.color || '#5254e7')
  const [goalDays, setGoalDays] = useState(editing?.goal_value || 30)
  const [saving, setSaving]   = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    if (editing) {
      await updateHabit(editing.id, { name: name.trim(), icon, color, goal_value: Number(goalDays) })
    } else {
      await addHabit({ name: name.trim(), icon, color, userId, goalDays: Number(goalDays) })
    }
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit habit' : 'New habit'} size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Name</label>
          <input className="input-base" placeholder="e.g. Morning exercise"
            value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Icon</label>
          <div className="flex flex-wrap gap-2">
            {ICONS.map(i => (
              <button key={i} onClick={() => setIcon(i)}
                className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all
                  ${icon === i ? 'ring-2 ring-[var(--brand)] scale-110' : 'hover:scale-110'}`}
                style={{ background: 'var(--bg-overlay)' }}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 scale-110 ring-[var(--text-muted)]' : 'hover:scale-110'}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Monthly goal (days)
            <span className="ml-1 font-normal" style={{ color: 'var(--text-muted)' }}>
              — progress bar shows % of this goal
            </span>
          </label>
          <div className="flex items-center gap-3">
            <input type="range" min="1" max="31" value={goalDays}
              onChange={e => setGoalDays(e.target.value)}
              className="flex-1 accent-[var(--brand)]" />
            <span className="w-16 text-center text-sm font-semibold px-3 py-1.5 rounded-xl"
              style={{ background: 'var(--bg-overlay)', color: 'var(--brand)' }}>
              {goalDays}d
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            100% = completing this habit {goalDays} days this month
          </p>
        </div>
        <div className="flex gap-2 pt-2">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add habit'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Habit row with synced scroll ─────────────────────────────
function HabitRowScrolled({ habit, userId, logs, daysInMonth, today, cellW, onScroll, isFirst, scrollRef }) {
  const [showEdit, setShowEdit] = useState(false)
  const rowScrollRef = useRef(null)
  const yearStr  = format(today, 'yyyy')
  const monthStr = format(today, 'MM')

  const logMap = {}
  logs.forEach(l => { if (l.habit_id === habit.id) logMap[l.log_date] = l.completed })

  // Streak
  let streak = 0
  let d = new Date(today)
  while (true) {
    const ds = format(d, 'yyyy-MM-dd')
    if (logMap[ds]) { streak++; d = new Date(d.getTime() - 86400000) }
    else break
  }

  // Give first row's ref to parent for auto-scroll
  useEffect(() => {
    if (isFirst && rowScrollRef.current) {
      const todayDay = today.getDate()
      const offset = Math.max(0, (todayDay - 4) * cellW)
      rowScrollRef.current.scrollLeft = offset
    }
  }, [isFirst])

  return (
    <>
      <div className="flex items-center gap-3 py-2 group">
        <div className="w-28 md:w-44 flex items-center gap-2 flex-shrink-0">
          <span className="text-base">{habit.icon}</span>
          <div className="min-w-0">
            <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{habit.name}</div>
            {streak > 0 && (
              <div className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--amber)' }}>
                <Flame size={10} /><span>{streak}d</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable cells — all rows share same scroll position */}
        <div ref={rowScrollRef}
          className="habit-scroll flex gap-0.5 flex-1 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onScroll={onScroll}>
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const ds  = `${yearStr}-${monthStr}-${String(day).padStart(2,'0')}`
            const done    = logMap[ds] === true
            const isToday = ds === format(today, 'yyyy-MM-dd')
            return (
              <div key={day}
                title={format(new Date(ds + 'T00:00'), 'MMM d')}
                onClick={() => toggleHabitLog(habit.id, userId)}
                className="flex-shrink-0 cursor-pointer rounded-md transition-all"
                style={{
                  width:  cellW - 2,
                  height: cellW - 2,
                  margin: 1,
                  background: done
                    ? habit.color || 'var(--green)'
                    : 'var(--bg-overlay)',
                  border: isToday
                    ? '2px solid var(--brand)'
                    : '1.5px solid transparent',
                  opacity: ds > format(today, 'yyyy-MM-dd') ? 0.3 : 1,
                }} />
            )
          })}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => setShowEdit(true)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
            style={{ color: 'var(--text-muted)' }}><Edit2 size={13} /></button>
          <button onClick={() => archiveHabit(habit.id)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
            style={{ color: 'var(--text-muted)' }}><Trash2 size={13} /></button>
        </div>
      </div>
      <AddHabitModal open={showEdit} onClose={() => setShowEdit(false)} userId={userId} editing={habit} />
    </>
  )
}

// ── Custom tooltip for charts ─────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>{p.name}: {p.value}{p.name?.includes('%') || p.dataKey === 'pct' ? '%' : ''}</p>
      ))}
    </div>
  )
}

// ── Habit charts ──────────────────────────────────────────────
function HabitCharts({ habits, logs, daysInMonth }) {
  const today      = new Date()
  const daysPassed = Math.min(today.getDate(), daysInMonth)

  const stats = useMemo(() => {
    return habits.map(h => {
      const done  = logs.filter(l => l.habit_id === h.id && l.completed).length
      const goal  = h.goal_value || 30  // user-defined goal days
      const pct   = goal > 0 ? Math.min(100, Math.round(done / goal * 100)) : 0
      const shortName = h.name.length > 10 ? h.name.slice(0, 9) + '…' : h.name
      return {
        name:      `${h.icon} ${shortName}`,
        fullName:  `${h.icon} ${h.name}`,
        done,
        goal,
        pct,
        color:     h.color || '#5254e7',
      }
    })
  }, [habits, logs])

  // Pie: completed vs missed vs remaining (based on goals)
  const totalGoal   = habits.reduce((s, h) => s + (h.goal_value || 30), 0)
  const totalDone   = logs.filter(l => l.completed).length
  const totalMissed = Math.max(0, habits.length * daysPassed - totalDone)
  const overallPct  = totalGoal > 0 ? Math.min(100, Math.round(totalDone / totalGoal * 100)) : 0

  const pieData = [
    { name: 'Completed', value: totalDone,   color: '#22c55e' },
    { name: 'Remaining', value: Math.max(0, totalGoal - totalDone), color: 'var(--border-mid)' },
  ].filter(d => d.value > 0)

  if (habits.length === 0) return null

  const CustomBar = ({ x, y, width, height, fill }) => (
    <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />
  )

  const GoalTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const s = stats.find(st => st.name === label)
    return (
      <div className="card px-3 py-2 text-xs space-y-1" style={{ color: 'var(--text-primary)' }}>
        <p className="font-medium">{s?.fullName || label}</p>
        <p style={{ color: '#22c55e' }}>Done: {s?.done} days</p>
        <p style={{ color: 'var(--brand)' }}>Goal: {s?.goal} days</p>
        <p style={{ color: s?.pct >= 100 ? '#22c55e' : 'var(--amber)' }}>Progress: {s?.pct}%</p>
      </div>
    )
  }

  return (
    <div className="mt-4">
      {/* Side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* LEFT — Pie chart */}
        <div className="card p-4 md:p-5">
          <h2 className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
            Monthly overview
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            {format(today, 'MMMM yyyy')} · vs combined goals
          </p>
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={88}
                    dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{overallPct}%</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>of goal</span>
              </div>
            </div>
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} />
                <span style={{ color: 'var(--text-primary)' }}>Completed: <strong>{totalDone}</strong> days</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: 'var(--border-mid)' }} />
                <span style={{ color: 'var(--text-primary)' }}>Remaining: <strong>{Math.max(0, totalGoal - totalDone)}</strong> days</span>
              </div>
              <p className="text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
                {totalDone} of {totalGoal} combined goal days completed
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT — Vertical bar chart (goal-based) */}
        <div className="card p-4 md:p-5">
          <h2 className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
            Per-habit progress
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            % of each habit's personal goal this month
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false} axisLine={false} angle={-35} textAnchor="end" interval={0} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickLine={false} axisLine={false} />
              <Tooltip content={<GoalTooltip />} />
              <Bar dataKey="pct" radius={[4,4,0,0]} maxBarSize={40} shape={CustomBar}>
                {stats.map((s, i) => (
                  <Cell key={i} fill={s.pct >= 100 ? '#22c55e' : s.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Summary table */}
          <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{s.fullName}</span>
                <span className="text-xs font-medium font-mono flex-shrink-0"
                  style={{ color: s.pct >= 100 ? 'var(--green)' : s.pct >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                  {s.done}/{s.goal}d ({s.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Habits page ──────────────────────────────────────────
export default function Habits() {
  const { user } = useAppStore()
  const userId   = user?.id
  const [showAdd, setShowAdd] = useState(false)
  const today    = new Date()
  const month    = today.getMonth() + 1
  const year     = today.getFullYear()

  const habits       = useHabits(userId)
  const logs         = useHabitLogs(userId, month, year)
  const daysInMonth  = getDaysInMonth(today)
  const dayLabels    = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Shared scroll ref — header + all rows scroll together
  const scrollRef    = useRef(null)
  const headerRef    = useRef(null)
  const todayDay     = today.getDate()
  const CELL_W       = 26 // px per day cell

  // Sync horizontal scroll between header and rows
  const onScroll = useCallback((e) => {
    const left = e.target.scrollLeft
    if (headerRef.current) headerRef.current.scrollLeft = left
    document.querySelectorAll('.habit-scroll').forEach(el => {
      if (el !== e.target) el.scrollLeft = left
    })
  }, [])

  // Auto-scroll to today on mount
  useEffect(() => {
    if (!scrollRef.current) return
    const offset = Math.max(0, (todayDay - 4) * CELL_W)
    scrollRef.current.scrollLeft = offset
    document.querySelectorAll('.habit-scroll').forEach(el => { el.scrollLeft = offset })
  }, [habits.length, todayDay])

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Habits</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {format(today, 'MMMM yyyy')} · {habits.length} habits
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add habit
        </button>
      </div>

      {/* Habit grid */}
      <div className="card overflow-hidden">
        {habits.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>No habits yet</p>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={15} /> Add your first habit
            </button>
          </div>
        ) : (
          <div className="p-4">
            {/* Sticky header row with synced scroll */}
            <div className="flex items-center gap-3 mb-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="w-28 md:w-44 flex-shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>Habit</div>
              <div ref={headerRef}
                className="flex gap-0.5 flex-1 overflow-x-hidden"
                style={{ scrollbarWidth: 'none' }}>
                {dayLabels.map(d => {
                  const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                  const isToday = ds === format(today, 'yyyy-MM-dd')
                  return (
                    <div key={d}
                      className="flex-shrink-0 text-center font-mono"
                      style={{
                        width: CELL_W,
                        color: isToday ? 'var(--brand)' : 'var(--text-muted)',
                        fontSize: '10px',
                        fontWeight: isToday ? 700 : 400
                      }}>
                      {d}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Habit rows */}
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {habits.map((habit, idx) => (
                <HabitRowScrolled
                  key={habit.id}
                  habit={habit}
                  userId={userId}
                  logs={logs}
                  daysInMonth={daysInMonth}
                  today={today}
                  cellW={CELL_W}
                  onScroll={onScroll}
                  isFirst={idx === 0}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <HabitCharts habits={habits} logs={logs} daysInMonth={daysInMonth} />

      <AddHabitModal open={showAdd} onClose={() => setShowAdd(false)} userId={userId} />
    </div>
  )
}