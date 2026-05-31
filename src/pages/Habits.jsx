import { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, Flame, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, getDaysInMonth } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { useHabits, useHabitLogs, toggleHabitLog, addHabit, updateHabit, archiveHabit } from '@/hooks/useHabits'
import Modal from '@/components/ui/Modal'
import MonthYearPicker from '@/components/ui/MonthYearPicker'
import ConfirmModal from '@/components/ui/ConfirmModal'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const COLORS = ['#5254e7','#22c55e','#f59e0b','#ef4444','#ec4899','#14b8a6','#8b5cf6','#f97316']
const ICONS  = ['●','★','♥','◆','▲','⚡','🏃','📚','💧','🧘','🎯','💪','🌙','✍️','🥗']
const CELL_W = 36   // px per day column
const ROW_H  = 48   // px per habit row
const HEAD_H = 30   // px for day-number header row

// ── Add/Edit Habit Modal ──────────────────────────────────────
function AddHabitModal({ open, onClose, userId, editing = null }) {
  const [name, setName]         = useState(editing?.name || '')
  const [icon, setIcon]         = useState(editing?.icon || '●')
  const [color, setColor]       = useState(editing?.color || '#5254e7')
  const [goalDays, setGoalDays] = useState(editing?.goal_value || 30)
  const [saving, setSaving]     = useState(false)

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
            <span className="ml-1 font-normal" style={{ color: 'var(--text-muted)' }}>— progress bar shows % of this goal</span>
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

// ── Habit name cell (fixed left column) ───────────────────────
function HabitNameCell({ habit, streak, userId }) {
  const [showEdit, setShowEdit] = useState(false)
  return (
    <>
      <div className="flex items-center gap-1.5 border-b group pr-1"
        style={{ height: ROW_H, borderColor: 'var(--border)' }}>
        <span className="text-sm flex-shrink-0">{habit.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{habit.name}</div>
          {streak > 0 && (
            <div className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--amber)' }}>
              <Flame size={9} /><span>{streak}d</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => setShowEdit(true)}
            className="p-1 rounded-lg hover:bg-[var(--bg-overlay)]"
            style={{ color: 'var(--text-muted)' }}><Edit2 size={11} /></button>
          <button onClick={() => archiveHabit(habit.id)}
            className="p-1 rounded-lg hover:bg-[var(--bg-overlay)]"
            style={{ color: 'var(--text-muted)' }}><Trash2 size={11} /></button>
        </div>
      </div>
      <AddHabitModal open={showEdit} onClose={() => setShowEdit(false)} userId={userId} editing={habit} />
    </>
  )
}

// ── Custom tooltip ────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>{p.name}: {p.value}{p.dataKey === 'pct' ? '%' : ''}</p>
      ))}
    </div>
  )
}

// ── Habit charts ──────────────────────────────────────────────
function HabitCharts({ habits, logs, daysInMonth, viewDate }) {
  const today = new Date()
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const viewMonthStart    = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const isCurrentMonth    = viewMonthStart.getTime() === currentMonthStart.getTime()
  const isPastMonth       = viewMonthStart < currentMonthStart
  const daysPassed = isCurrentMonth ? Math.min(today.getDate(), daysInMonth) : isPastMonth ? daysInMonth : 0

  const stats = useMemo(() => habits.map(h => {
    const done = logs.filter(l => l.habit_id === h.id && l.completed).length
    const goal = h.goal_value || 30
    const pct  = goal > 0 ? Math.min(100, Math.round(done / goal * 100)) : 0
    const shortName = h.name.length > 10 ? h.name.slice(0, 9) + '…' : h.name
    return { name: `${h.icon} ${shortName}`, fullName: `${h.icon} ${h.name}`, done, goal, pct, color: h.color || '#5254e7' }
  }), [habits, logs])

  const totalGoal  = habits.reduce((s, h) => s + (h.goal_value || 30), 0)
  const totalDone  = logs.filter(l => l.completed).length
  const overallPct = totalGoal > 0 ? Math.min(100, Math.round(totalDone / totalGoal * 100)) : 0
  const pieData = [
    { name: 'Completed', value: totalDone, color: '#22c55e' },
    { name: 'Remaining', value: Math.max(0, totalGoal - totalDone), color: 'var(--border-mid)' },
  ].filter(d => d.value > 0)

  if (habits.length === 0) return null

  const CustomBar = ({ x, y, width, height, fill }) => <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />

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
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card p-4 md:p-5">
        <h2 className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>Monthly overview</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{format(viewDate, 'MMMM yyyy')} · vs combined goals</p>
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={88}
                  dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
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

      <div className="card p-4 md:p-5">
        <h2 className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>Per-habit progress</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>% of each habit's personal goal this month</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              tickLine={false} axisLine={false} angle={-35} textAnchor="end" interval={0} />
            <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              tickLine={false} axisLine={false} />
            <Tooltip content={<GoalTooltip />} />
            <Bar dataKey="pct" radius={[4,4,0,0]} maxBarSize={40} shape={CustomBar}>
              {stats.map((s, i) => <Cell key={i} fill={s.pct >= 100 ? '#22c55e' : s.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
  )
}

// ── Main Habits page ──────────────────────────────────────────
export default function Habits() {
  const { user } = useAppStore()
  const userId   = user?.id
  const [showAdd,         setShowAdd]         = useState(false)
  const [pendingToggle,   setPendingToggle]   = useState(null) // { habitId, ds, label }
  const today    = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  // Month navigation
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const viewMonthStart    = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const isCurrentMonth    = viewMonthStart.getTime() === currentMonthStart.getTime()
  const isPastMonth       = viewMonthStart < currentMonthStart

  const month       = viewDate.getMonth() + 1
  const year        = viewDate.getFullYear()
  const daysInMonth = getDaysInMonth(viewDate)

  const habits = useHabits(userId)
  const logs   = useHabitLogs(userId, month, year)

  // Only show habits created on or before end of viewed month
  const viewMonthEnd  = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0)
  const visibleHabits = useMemo(
    () => habits.filter(h => !h.created_at || new Date(h.created_at) <= viewMonthEnd),
    [habits, viewMonthEnd.getTime()]
  )

  // Overflow days: show 7 days from next month when on current month
  const OVERFLOW_DAYS = isCurrentMonth ? 7 : 0
  const totalDays     = daysInMonth + OVERFLOW_DAYS

  // Build flat cells array once
  const cells = useMemo(() =>
    Array.from({ length: totalDays }, (_, i) => {
      const date = new Date(year, month - 1, i + 1)  // JS month is 0-indexed
      const ds   = format(date, 'yyyy-MM-dd')
      return {
        ds,
        dayNum:     date.getDate(),
        isOverflow: i >= daysInMonth,
        isToday:    ds === todayStr,
      }
    }),
    [totalDays, year, month, daysInMonth, todayStr]
  )

  // Build per-habit log maps and streaks (computed once per render)
  const { logMaps, streaks } = useMemo(() => {
    const lm = {}
    visibleHabits.forEach(h => { lm[h.id] = {} })
    logs.forEach(l => { if (lm[l.habit_id]) lm[l.habit_id][l.log_date] = l.completed })

    const sk = {}
    if (isCurrentMonth) {
      visibleHabits.forEach(h => {
        let streak = 0
        let d = new Date(today)
        while (true) {
          const ds = format(d, 'yyyy-MM-dd')
          if (lm[h.id]?.[ds]) { streak++; d = new Date(d.getTime() - 86400000) }
          else break
        }
        sk[h.id] = streak
      })
    }
    return { logMaps: lm, streaks: sk }
  }, [visibleHabits, logs, isCurrentMonth, todayStr])

  // Single scroll ref — auto-scroll to today on mount/month-change
  const scrollRef = useRef(null)
  useEffect(() => {
    if (!scrollRef.current) return
    const offset = isCurrentMonth ? Math.max(0, (today.getDate() - 4) * CELL_W) : 0
    scrollRef.current.scrollLeft = offset
  }, [isCurrentMonth, viewDate, visibleHabits.length])

  const goToPrevMonth = () => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  const goToNextMonth = () => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Habits</h1>
          <div className="flex items-center gap-1 mt-1">
            <button onClick={goToPrevMonth}
              className="p-1 rounded-lg hover:bg-[var(--bg-overlay)] transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              <ChevronLeft size={16} />
            </button>
            <MonthYearPicker value={viewDate} onChange={setViewDate} />
            <button onClick={goToNextMonth}
              className="p-1 rounded-lg hover:bg-[var(--bg-overlay)] transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              <ChevronRight size={16} />
            </button>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>· {visibleHabits.length} habits</span>
          </div>
        </div>
        {!isPastMonth && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add habit
          </button>
        )}
      </div>

      {/* Habit grid */}
      <div className="card">
        {visibleHabits.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>No habits yet</p>
            {!isPastMonth && (
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                <Plus size={15} /> Add your first habit
              </button>
            )}
          </div>
        ) : (
          <div className="p-3 md:p-4 flex gap-0">

            {/* ── Fixed left column: habit names ─────────────── */}
            <div className="flex-shrink-0 w-28 md:w-44 border-r" style={{ borderColor: 'var(--border)' }}>
              {/* Header */}
              <div className="flex items-center border-b px-1" style={{ height: HEAD_H, borderColor: 'var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Habit</span>
              </div>
              {/* Name rows */}
              {visibleHabits.map(habit => (
                <HabitNameCell key={habit.id} habit={habit} streak={streaks[habit.id] || 0} userId={userId} />
              ))}
            </div>

            {/* ── Single scrollable area: header + cell rows ── */}
            <div
              ref={scrollRef}
              className="flex-1 min-w-0 overflow-x-auto"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--border-mid) transparent',
                WebkitOverflowScrolling: 'touch',
              }}>

              {/* Day-number header */}
              <div className="flex border-b" style={{ height: HEAD_H, borderColor: 'var(--border)' }}>
                {cells.map(({ ds, dayNum, isOverflow, isToday }) => (
                  <div key={ds}
                    className="flex items-center justify-center flex-shrink-0"
                    style={{ width: CELL_W, height: HEAD_H }}>
                    <span style={{
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: isToday ? 'var(--brand)' : 'var(--text-muted)',
                      fontWeight: isToday ? 700 : 400,
                      opacity: isOverflow ? 0.4 : 1,
                    }}>
                      {dayNum}
                    </span>
                  </div>
                ))}
              </div>

              {/* One row per habit */}
              {visibleHabits.map(habit => {
                const logMap = logMaps[habit.id] || {}
                return (
                  <div key={habit.id} className="flex border-b" style={{ height: ROW_H, borderColor: 'var(--border)' }}>
                    {cells.map(({ ds, isOverflow, isToday }) => {
                      const done = logMap[ds] === true
                      return (
                        <div key={ds}
                          className="flex items-center justify-center flex-shrink-0 cursor-pointer"
                          style={{ width: CELL_W, height: ROW_H, touchAction: 'manipulation' }}
                          onClick={() => {
                            if (ds > todayStr) {
                              setPendingToggle({
                                habitId: habit.id,
                                ds,
                                label: format(new Date(ds + 'T00:00'), 'MMM d, yyyy'),
                              })
                            } else {
                              toggleHabitLog(habit.id, userId, ds)
                            }
                          }}>
                          <div style={{
                            width:        CELL_W - 8,
                            height:       CELL_W - 8,
                            borderRadius: 6,
                            background:   done ? (habit.color || 'var(--green)') : 'var(--bg-overlay)',
                            border:       isToday
                              ? '2px solid var(--brand)'
                              : done
                                ? '1.5px solid transparent'
                                : `1.5px ${isOverflow ? 'dashed' : 'solid'} var(--border-mid)`,
                            opacity:      isOverflow && !done ? 0.5 : 1,
                            transition:   'background 0.15s, border 0.15s',
                            userSelect:   'none',
                            WebkitUserSelect: 'none',
                          }} />
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

          </div>
        )}
      </div>

      {/* Charts */}
      <HabitCharts habits={visibleHabits} logs={logs} daysInMonth={daysInMonth} viewDate={viewDate} />

      <AddHabitModal open={showAdd} onClose={() => setShowAdd(false)} userId={userId} />

      <ConfirmModal
        open={!!pendingToggle}
        message={`You're marking ${pendingToggle?.label} before it arrives. Still mark it?`}
        onConfirm={() => {
          toggleHabitLog(pendingToggle.habitId, userId, pendingToggle.ds)
          setPendingToggle(null)
        }}
        onCancel={() => setPendingToggle(null)}
      />
    </div>
  )
}
