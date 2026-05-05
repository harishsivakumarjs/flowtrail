import { useState } from 'react'
import { Plus, Flame, Trash2, Edit2 } from 'lucide-react'
import { format, getDaysInMonth, startOfMonth, getDay } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { useHabits, useHabitLogs, toggleHabitLog, addHabit, updateHabit, archiveHabit } from '@/hooks/useHabits'
import Modal from '@/components/ui/Modal'
import { TODAY } from '@/lib/utils'

const COLORS = ['#5254e7','#22c55e','#f59e0b','#ef4444','#ec4899','#14b8a6','#8b5cf6','#f97316']
const ICONS  = ['●','★','♥','◆','▲','⚡','🏃','📚','💧','🧘','🎯','💪','🌙','✍️','🥗']

function AddHabitModal({ open, onClose, userId, editing = null }) {
  const [name, setName]   = useState(editing?.name || '')
  const [icon, setIcon]   = useState(editing?.icon || '●')
  const [color, setColor] = useState(editing?.color || '#5254e7')
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
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Name
          </label>
          <input
            className="input-base"
            placeholder="e.g. Morning exercise"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Icon
          </label>
          <div className="flex flex-wrap gap-2">
            {ICONS.map(i => (
              <button
                key={i}
                onClick={() => setIcon(i)}
                className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all
                  ${icon === i ? 'ring-2 ring-[var(--brand)] scale-110' : 'hover:scale-110'}`}
                style={{ background: 'var(--bg-overlay)' }}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 scale-110 ring-[var(--text-muted)]' : 'hover:scale-110'}`}
                style={{ background: c }}
              />
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

function HabitRow({ habit, userId, logs, daysInMonth, startDay, today }) {
  const [showEdit, setShowEdit] = useState(false)

  const logMap = {}
  logs.forEach(l => {
    if (l.habit_id === habit.id) logMap[l.log_date] = l.completed
  })

  const yearStr  = format(today, 'yyyy')
  const monthStr = format(today, 'MM')

  // Compute streak
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
        {/* Habit info */}
        <div className="w-32 md:w-44 flex items-center gap-2 flex-shrink-0">
          <span className="text-base">{habit.icon}</span>
          <div className="min-w-0">
            <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {habit.name}
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--amber)' }}>
                <Flame size={10} />
                <span>{streak}d</span>
              </div>
            )}
          </div>
        </div>

        {/* Day cells */}
        <div className="flex gap-0.5 flex-1 overflow-x-auto">
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const ds = `${yearStr}-${monthStr}-${String(day).padStart(2,'0')}`
            const done = logMap[ds] === true
            const isToday = ds === format(today, 'yyyy-MM-dd')
            return (
              <div
                key={day}
                title={ds}
                onClick={() => toggleHabitLog(habit.id, userId)}
                className={`habit-cell ${done ? 'done' : ''} ${isToday ? 'today' : ''}`}
                style={done ? { background: habit.color || 'var(--green)' } : {}}
              />
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowEdit(true)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => archiveHabit(habit.id)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <AddHabitModal open={showEdit} onClose={() => setShowEdit(false)} userId={userId} editing={habit} />
    </>
  )
}

export default function Habits() {
  const { user } = useAppStore()
  const userId = user?.id
  const [showAdd, setShowAdd] = useState(false)
  const today = new Date()
  const month = today.getMonth() + 1
  const year  = today.getFullYear()

  const habits = useHabits(userId)
  const logs   = useHabitLogs(userId, month, year)

  const daysInMonth = getDaysInMonth(today)
  const dayLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1)

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

      <div className="card overflow-auto">
        {habits.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              No habits yet — start tracking your first one
            </p>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={15} /> Add your first habit
            </button>
          </div>
        ) : (
          <div className="p-4">
            {/* Day number header */}
            <div className="flex items-center gap-3 mb-2 pb-2 border-b"
              style={{ borderColor: 'var(--border)' }}>
              <div className="w-32 md:w-44 flex-shrink-0 text-xs"
                style={{ color: 'var(--text-muted)' }}>
                Habit
              </div>
              <div className="flex gap-0.5 flex-1 overflow-x-auto">
                {dayLabels.map(d => {
                  const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                  const isToday = ds === format(today, 'yyyy-MM-dd')
                  return (
                    <div key={d}
                      className={`w-[22px] text-center text-xs flex-shrink-0 font-mono ${isToday ? 'font-bold' : ''}`}
                      style={{ color: isToday ? 'var(--brand)' : 'var(--text-muted)', fontSize: '10px' }}>
                      {d}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {habits.map(habit => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  userId={userId}
                  logs={logs}
                  daysInMonth={daysInMonth}
                  today={today}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <AddHabitModal open={showAdd} onClose={() => setShowAdd(false)} userId={userId} />
    </div>
  )
}
