import { useState } from 'react'
import { Plus, Trash2, Calendar, Clock, AlertTriangle, Edit2, CalendarClock } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useTasks, addTask, toggleTask, deleteTask, updateTask } from '@/hooks/useTasks'
import Modal from '@/components/ui/Modal'
import TimeInput from '@/components/ui/TimeInput'
import { TODAY } from '@/lib/utils'
import { format, addDays } from 'date-fns'

const PRIORITIES = ['high', 'medium', 'low']
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

// ── Add / Edit Task Modal ─────────────────────────────────────
function TaskModal({ open, onClose, userId, editing = null }) {
  const [title, setTitle]       = useState(editing?.title || '')
  const [priority, setPriority] = useState(editing?.priority || 'medium')
  const [dueDate, setDueDate]   = useState(editing?.due_date || TODAY())
  const [dueTime, setDueTime]   = useState(editing?.due_time || '')
  const [endTime, setEndTime]   = useState(editing?.end_time || '')
  const [notes, setNotes]       = useState(editing?.notes || '')
  const [saving, setSaving]     = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    if (editing) {
      await updateTask(editing.id, {
        title: title.trim(), priority,
        due_date: dueDate,
        due_time: dueTime || null,
        end_time: endTime || null,
        notes
      })
    } else {
      await addTask({ title: title.trim(), priority, dueDate, dueTime: dueTime || null, endTime: endTime || null, notes, userId })
    }
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit task' : 'New task'}>
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
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add task'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Reschedule Modal ─────────────────────────────────────────
function RescheduleModal({ open, onClose, task }) {
  const [newDate, setNewDate] = useState(task?.due_date || TODAY())
  const [newTime, setNewTime] = useState(task?.due_time || '')
  const [saving, setSaving]   = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await updateTask(task.id, { due_date: newDate, due_time: newTime || null })
    setSaving(false)
    onClose()
  }

  if (!task) return null
  return (
    <Modal open={open} onClose={onClose} title="Reschedule task" size="sm">
      <div className="space-y-4">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>New date</label>
          <input type="date" className="input-base" value={newDate} onChange={e => setNewDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>New time (optional)</label>
          <TimeInput value={newTime} onChange={setNewTime} />
        </div>

        {/* Quick options */}
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Tomorrow', date: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
            { label: 'In 2 days', date: format(addDays(new Date(), 2), 'yyyy-MM-dd') },
            { label: 'Next week', date: format(addDays(new Date(), 7), 'yyyy-MM-dd') },
          ].map(opt => (
            <button key={opt.label} onClick={() => setNewDate(opt.date)}
              className="text-xs px-3 py-1.5 rounded-xl border transition-all"
              style={{
                borderColor: newDate === opt.date ? 'var(--brand)' : 'var(--border)',
                color: newDate === opt.date ? 'var(--brand)' : 'var(--text-muted)',
                background: 'transparent'
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Moving…' : 'Move task'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Future task warning modal ─────────────────────────────────
function FutureTaskModal({ open, onClose, task, onConfirmComplete, onConfirmDelete }) {
  if (!task) return null
  const dateStr = task.due_date ? format(new Date(task.due_date + 'T00:00'), 'EEEE, MMM d') : ''
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
          <button className="btn btn-primary w-full" onClick={onConfirmComplete}>✓ Mark as complete anyway</button>
          <button className="btn btn-danger w-full" onClick={onConfirmDelete}><Trash2 size={14} /> Delete this task</button>
          <button className="btn btn-ghost w-full" onClick={onClose}>Keep it — I'll do it later</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Task item ─────────────────────────────────────────────────
function TaskItem({ task, onFutureClick, onEdit, onReschedule }) {
  const done     = task.status === 'done'
  const today    = TODAY()
  const isFuture = task.due_date && task.due_date > today

  const dayLabel = () => {
    if (!task.due_date) return null
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    if (task.due_date === today)    return { label: 'Today',    color: 'var(--brand)' }
    if (task.due_date === tomorrow) return { label: 'Tomorrow', color: 'var(--amber)' }
    return { label: format(new Date(task.due_date + 'T00:00'), 'MMM d'), color: 'var(--text-muted)' }
  }

  const day = dayLabel()

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl transition-all group card mb-2 ${done ? 'opacity-50' : ''}`}>
      {/* Checkbox — only action is complete */}
      <button
        onClick={() => {
          if (!done && isFuture) onFutureClick(task)
          else toggleTask(task.id)
        }}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
          ${done ? 'border-[var(--green)] bg-[var(--green)]' : 'border-[var(--border-mid)] hover:border-[var(--brand)]'}`}>
        {done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
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
              <Calendar size={11} /><span>{day.label}</span>
            </div>
          )}
          {task.due_time && (
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Clock size={11} />
              <span>
                {format(new Date(`${task.due_date || today}T${task.due_time}`), 'h:mm a')}
                {task.end_time ? ' → ' + format(new Date(`${task.due_date || today}T${task.end_time}`), 'h:mm a') : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium badge-${task.priority}`}>
          {task.priority}
        </span>
        <button onClick={() => onEdit(task)}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
          style={{ color: 'var(--text-muted)' }} title="Edit">
          <Edit2 size={13} />
        </button>
        <button onClick={() => onReschedule(task)}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
          style={{ color: 'var(--text-muted)' }} title="Reschedule">
          <CalendarClock size={13} />
        </button>
        <button onClick={() => deleteTask(task.id)}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
          style={{ color: 'var(--text-muted)' }} title="Delete">
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
  const sorted   = [...tasks].sort((a, b) => {
    if (a.due_date !== b.due_date) return (a.due_date || '').localeCompare(b.due_date || '')
    if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time)
    if (a.due_time) return -1
    if (b.due_time) return 1
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
  const [showAdd, setShowAdd]           = useState(false)
  const [editingTask, setEditingTask]   = useState(null)
  const [rescheduleTask, setReschedule] = useState(null)
  const [filter, setFilter]             = useState('today')
  const [futureTask, setFutureTask]     = useState(null)

  const tasks   = useTasks(userId, filter)
  const pending = tasks.filter(t => t.status === 'pending')
    .sort((a, b) => {
      if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time)
      if (a.due_time) return -1
      if (b.due_time) return 1
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    })
  const done = tasks.filter(t => t.status === 'done')

  const FILTERS = [
    { key: 'today',    label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'all',      label: 'All pending' },
  ]

  const grouped = filter === 'upcoming' ? groupByDate(pending) : null

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Tasks</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{pending.length} remaining</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingTask(null); setShowAdd(true) }}>
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

      {pending.length === 0 && done.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>No tasks here</p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add your first task
          </button>
        </div>
      )}

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
              <TaskItem key={task.id} task={task}
                onFutureClick={setFutureTask}
                onEdit={(t) => { setEditingTask(t); setShowAdd(true) }}
                onReschedule={setReschedule} />
            ))}
          </div>
        ))
      ) : (
        pending.map(task => (
          <TaskItem key={task.id} task={task}
            onFutureClick={setFutureTask}
            onEdit={(t) => { setEditingTask(t); setShowAdd(true) }}
            onReschedule={setReschedule} />
        ))
      )}

      {done.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Completed ({done.length})
          </p>
          {done.map(task => (
            <TaskItem key={task.id} task={task}
              onFutureClick={setFutureTask}
              onEdit={(t) => { setEditingTask(t); setShowAdd(true) }}
              onReschedule={setReschedule} />
          ))}
        </div>
      )}

      {/* Modals */}
      <TaskModal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditingTask(null) }}
        userId={userId}
        editing={editingTask}
      />
      <RescheduleModal
        open={!!rescheduleTask}
        onClose={() => setReschedule(null)}
        task={rescheduleTask}
      />
      <FutureTaskModal
        open={!!futureTask}
        onClose={() => setFutureTask(null)}
        task={futureTask}
        onConfirmComplete={async () => { await toggleTask(futureTask.id); setFutureTask(null) }}
        onConfirmDelete={async () => { await deleteTask(futureTask.id); setFutureTask(null) }}
      />
    </div>
  )
}