import { useState, useMemo } from 'react'
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
  const [name, setName]     = useState(editing?.name || '')
  const [icon, setIcon]     = useState(editing?.icon || '●')
  const [color, setColor]   = useState(editing?.color || '#5254e7')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    if (editing) {
      await updateHabit(editing.id, { name: name.trim(), icon, color })
    } else {
      await addHabit({ name: name.trim(), icon, color, userId })
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

// ── Habit row in grid ─────────────────────────────────────────
function HabitRow({ habit, userId, logs, daysInMonth, today }) {
  const [showEdit, setShowEdit] = useState(false)
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

  return (
    <>
      <div className="flex items-center gap-3 py-2 group">
        <div className="w-32 md:w-44 flex items-center gap-2 flex-shrink-0">
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

        <div className="flex gap-0.5 flex-1 overflow-x-auto">
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const ds  = `${yearStr}-${monthStr}-${String(day).padStart(2,'0')}`
            const done = logMap[ds] === true
            const isToday = ds === format(today, 'yyyy-MM-dd')
            return (
              <div key={day} title={ds}
                onClick={() => toggleHabitLog(habit.id, userId)}
                className={`habit-cell ${done ? 'done' : ''} ${isToday ? 'today' : ''}`}
                style={done ? { background: habit.color || 'var(--green)' } : {}} />
            )
          })}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
  const today = new Date()
  const daysPassed = Math.min(today.getDate(), daysInMonth)

  const stats = useMemo(() => {
    return habits.map(h => {
      const doneLogs = logs.filter(l => l.habit_id === h.id && l.completed)
      const done     = doneLogs.length
      const pct      = daysPassed > 0 ? Math.round(done / daysPassed * 100) : 0
      return { name: `${h.icon} ${h.name}`, done, total: daysPassed, pct, color: h.color || '#5254e7' }
    })
  }, [habits, logs, daysPassed])

  // Pie chart: completed vs missed across all habits
  const totalPossible = habits.length * daysPassed
  const totalDone     = logs.filter(l => l.completed).length
  const totalMissed   = Math.max(0, totalPossible - totalDone)
  const pieData = [
    { name: 'Completed', value: totalDone,   color: '#22c55e' },
    { name: 'Missed',    value: totalMissed, color: 'var(--border-mid)' },
  ].filter(d => d.value > 0)

  const overallPct = totalPossible > 0 ? Math.round(totalDone / totalPossible * 100) : 0

  if (habits.length === 0) return null

  return (
    <div className="space-y-4 mt-4">
      {/* Pie chart — monthly overview */}
      <div className="card p-4 md:p-5">
        <h2 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Monthly completion overview
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          {format(today, 'MMMM yyyy')} · {daysPassed} days tracked
        </p>

        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Pie */}
          <div className="relative">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{overallPct}%</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>done</span>
            </div>
          </div>

          {/* Legend + stats */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Completed: <strong>{totalDone}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: 'var(--border-mid)' }} />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Missed: <strong>{totalMissed}</strong>
              </span>
            </div>
            <div className="text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
              {totalDone} of {totalPossible} possible habit completions this month
            </div>
          </div>
        </div>
      </div>

      {/* Bar chart — per habit */}
      <div className="card p-4 md:p-5">
        <h2 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Per-habit completion rate
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Days completed out of {daysPassed} days this month
        </p>

        <ResponsiveContainer width="100%" height={Math.max(180, habits.length * 40)}>
          <BarChart data={stats} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={120}
              tick={{ fontSize: 11, fill: 'var(--text-primary)' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pct" name="Completion %" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {stats.map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Summary table */}
        <div className="mt-4 space-y-2">
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
              <span className="text-xs font-medium font-mono" style={{ color: s.pct >= 70 ? 'var(--green)' : s.pct >= 40 ? 'var(--amber)' : 'var(--red)' }}>
                {s.done}/{s.total} days ({s.pct}%)
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
  const [showAdd, setShowAdd] = useState(false)
  const today    = new Date()
  const month    = today.getMonth() + 1
  const year     = today.getFullYear()

  const habits       = useHabits(userId)
  const logs         = useHabitLogs(userId, month, year)
  const daysInMonth  = getDaysInMonth(today)
  const dayLabels    = Array.from({ length: daysInMonth }, (_, i) => i + 1)

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
      <div className="card overflow-auto">
        {habits.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>No habits yet</p>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={15} /> Add your first habit
            </button>
          </div>
        ) : (
          <div className="p-4">
            {/* Header row */}
            <div className="flex items-center gap-3 mb-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="w-32 md:w-44 flex-shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>Habit</div>
              <div className="flex gap-0.5 flex-1 overflow-x-auto">
                {dayLabels.map(d => {
                  const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                  const isToday = ds === format(today, 'yyyy-MM-dd')
                  return (
                    <div key={d} className="w-[22px] text-center flex-shrink-0 font-mono"
                      style={{ color: isToday ? 'var(--brand)' : 'var(--text-muted)', fontSize: '10px', fontWeight: isToday ? 700 : 400 }}>
                      {d}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {habits.map(habit => (
                <HabitRow key={habit.id} habit={habit} userId={userId}
                  logs={logs} daysInMonth={daysInMonth} today={today} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Charts — shown below the grid */}
      <HabitCharts habits={habits} logs={logs} daysInMonth={daysInMonth} />

      <AddHabitModal open={showAdd} onClose={() => setShowAdd(false)} userId={userId} />
    </div>
  )
}