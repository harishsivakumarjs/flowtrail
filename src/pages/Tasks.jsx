import { useState } from 'react'
import { Plus, Trash2, Calendar, Clock, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useTasks, addTask, toggleTask, deleteTask } from '@/hooks/useTasks'
import Modal from '@/components/ui/Modal'
import TimeInput from '@/components/ui/TimeInput'
import { TODAY } from '@/lib/utils'
import { format, isAfter, parseISO, addDays } from 'date-fns'

const PRIORITIES = ['high', 'medium', 'low']
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

// ── Add Task Modal ────────────────────────────────────────────
function AddTaskModal({ open, onClose, userId }) {
  const [title, setTitle]       = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate]   = useState(TODAY())
  const [dueTime, setDueTime]   = useState('')
  const [endTime, setEndTime]   = useState('')
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    await addTask({ title: title.trim(), priority, dueDate, dueTime: dueTime || null, endTime: endTime || null, notes, userId })
    setTitle(''); setNotes(''); setPriority('medium')
    setDueDate(TODAY()); setDueTime(''); setEndTime('')
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <div className="space-y-4">
        <input className="input-base" placeholder="What needs to be done?"
          value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSave()} autoFocus />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Priority</label>
            <select className="input-base" value={priority} onChange={e => setPriority(e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Due date</label>
            <input type="date" className="input-base" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        {/* Time field */}
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Time <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — notified 30 min before)</span>
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Start</div>
              <TimeInput value={dueTime} onChange={setDueTime} />
            </div>
            <div className="text-sm font-medium mt-4" style={{ color: 'var(--text-muted)' }}>→</div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>End</div>
              <TimeInput value={endTime} onChange={setEndTime} />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Notes (optional)</label>
          <textarea className="input-base resize-none" rows={2} placeholder="Add details…"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Adding…' : 'Add task'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Future task warning modal ─────────────────────────────────
function FutureTaskModal({ open, onClose, task, onConfirmComplete, onConfirmDelete }) {
  if (!task) return null
  const dateStr = task.due_date
    ? format(new Date(task.due_date + 'T00:00'), 'EEEE, MMM d')
    : ''

  return (
    <Modal open={open} onClose={onClose} title="Future task" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl"
          style={{ background: 'color-mix(in srgb, var(--amber) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--amber) 25%, transparent)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            "<strong>{task.title}</strong>" is scheduled for <strong>{dateStr}</strong>. What would you like to do?
          </p>
        </div>

        <div className="space-y-2">
          <button className="btn btn-primary w-full" onClick={onConfirmComplete}>
            ✓ Mark as complete anyway
          </button>
          <button className="btn btn-danger w-full" onClick={onConfirmDelete}>
            <Trash2 size={14} /> Delete this task
          </button>
          <button className="btn btn-ghost w-full" onClick={onClose}>
            Keep it — I'll do it later
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Task item ─────────────────────────────────────────────────
function TaskItem({ task, onFutureClick }) {
  const done    = task.status === 'done'
  const today   = TODAY()
  const isFuture = task.due_date && task.due_date > today

  const handleCheck = () => {
    if (!done && isFuture) {
      onFutureClick(task)
    } else {
      toggleTask(task.id)
    }
  }

  // Relative day label
  const dayLabel = () => {
    if (!task.due_date) return null
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    if (task.due_date === today)    return { label: 'Today',    color: 'var(--brand)' }
    if (task.due_date === tomorrow) return { label: 'Tomorrow', color: 'var(--amber)' }
    return { label: format(new Date(task.due_date + 'T00:00'), 'MMM d'), color: 'var(--text-muted)' }
  }

  const day = dayLabel()

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl transition-all group card-hover card mb-2 ${done ? 'opacity-50' : ''}`}>
      <button onClick={handleCheck}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
          ${done ? 'border-[var(--green)] bg-[var(--green)]' : 'border-[var(--border-mid)] hover:border-[var(--brand)]'}`}>
        {done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? 'line-through' : ''}`} style={{ color: 'var(--text-primary)' }}>
          {task.title}
        </p>
        {task.notes && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{task.notes}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {day && (
            <div className="flex items-center gap-1 text-xs" style={{ color: day.color }}>
              <Calendar size={11} />
              <span>{day.label}</span>
            </div>
          )}
          {task.due_time && (
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Clock size={11} />
              <span>{format(new Date(`${task.due_date || today}T${task.due_time}`), 'h:mm a')}{task.end_time ? ' → ' + format(new Date(`${task.due_date || today}T${task.end_time}`), 'h:mm a') : ''}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium badge-${task.priority}`}>
          {task.priority}
        </span>
        <button onClick={() => deleteTask(task.id)}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-overlay)] transition-all"
          style={{ color: 'var(--text-muted)' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Group upcoming tasks by date ──────────────────────────────
function groupByDate(tasks) {
  const groups = {}
  const today    = TODAY()
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  // Sort by date then priority
  const sorted = [...tasks].sort((a, b) => {
    if (a.due_date !== b.due_date) return (a.due_date || '').localeCompare(b.due_date || '')
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  })

  sorted.forEach(task => {
    const d = task.due_date || 'No date'
    let label = d
    if (d === today)    label = 'Today'
    else if (d === tomorrow) label = 'Tomorrow'
    else if (d !== 'No date') label = format(new Date(d + 'T00:00'), 'EEEE, MMM d')
    if (!groups[label]) groups[label] = []
    groups[label].push(task)
  })
  return groups
}

// ── Main Tasks page ───────────────────────────────────────────
export default function Tasks() {
  const { user } = useAppStore()
  const userId   = user?.id
  const [showAdd, setShowAdd]         = useState(false)
  const [filter, setFilter]           = useState('today')
  const [futureTask, setFutureTask]   = useState(null)

  const tasks   = useTasks(userId, filter)
  const pending = tasks.filter(t => t.status === 'pending')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  const done    = tasks.filter(t => t.status === 'done')

  const FILTERS = [
    { key: 'today',    label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'all',      label: 'All pending' },
  ]

  const handleFutureConfirmComplete = async () => {
    await toggleTask(futureTask.id)
    setFutureTask(null)
  }

  const handleFutureConfirmDelete = async () => {
    await deleteTask(futureTask.id)
    setFutureTask(null)
  }

  const grouped = filter === 'upcoming' ? groupByDate(pending) : null

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Tasks</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{pending.length} remaining</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add task
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg-overlay)' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all
              ${filter === f.key ? 'bg-[var(--bg-raised)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {pending.length === 0 && done.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>No tasks here</p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add your first task
          </button>
        </div>
      )}

      {/* Grouped upcoming view */}
      {grouped ? (
        Object.entries(grouped).map(([dateLabel, dateTasks]) => (
          <div key={dateLabel} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: dateLabel === 'Tomorrow' ? 'var(--amber)' : 'var(--text-muted)' }}>
                {dateLabel}
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{dateTasks.length} task{dateTasks.length !== 1 ? 's' : ''}</span>
            </div>
            {dateTasks.map(task => (
              <TaskItem key={task.id} task={task} onFutureClick={setFutureTask} />
            ))}
          </div>
        ))
      ) : (
        pending.map(task => <TaskItem key={task.id} task={task} onFutureClick={setFutureTask} />)
      )}

      {/* Done section */}
      {done.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Completed ({done.length})
          </p>
          {done.map(task => <TaskItem key={task.id} task={task} onFutureClick={setFutureTask} />)}
        </div>
      )}

      <AddTaskModal open={showAdd} onClose={() => setShowAdd(false)} userId={userId} />

      <FutureTaskModal
        open={!!futureTask}
        onClose={() => setFutureTask(null)}
        task={futureTask}
        onConfirmComplete={handleFutureConfirmComplete}
        onConfirmDelete={handleFutureConfirmDelete}
      />
    </div>
  )
}