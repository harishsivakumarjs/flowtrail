import { useState } from 'react'
import { Plus, Trash2, Calendar, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useTasks, addTask, toggleTask, deleteTask, updateTask } from '@/hooks/useTasks'
import Modal from '@/components/ui/Modal'
import { TODAY } from '@/lib/utils'
import { format } from 'date-fns'

const PRIORITIES = ['high', 'medium', 'low']

function AddTaskModal({ open, onClose, userId }) {
  const [title, setTitle]       = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate]   = useState(TODAY())
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    await addTask({ title: title.trim(), priority, dueDate, notes, userId })
    setTitle(''); setNotes(''); setPriority('medium'); setDueDate(TODAY())
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <div className="space-y-4">
        <input
          className="input-base"
          placeholder="What needs to be done?"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSave()}
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Priority
            </label>
            <select
              className="input-base"
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Due date
            </label>
            <input
              type="date"
              className="input-base"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Notes (optional)
          </label>
          <textarea
            className="input-base resize-none"
            rows={3}
            placeholder="Add details…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
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

function TaskItem({ task }) {
  const done = task.status === 'done'

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl transition-all group card-hover card mb-2
      ${done ? 'opacity-50' : ''}`}
    >
      <button
        onClick={() => toggleTask(task.id)}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
          ${done ? 'border-[var(--green)] bg-[var(--green)]' : 'border-[var(--border-mid)] hover:border-[var(--brand)]'}`}
      >
        {done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? 'line-through' : ''}`}
          style={{ color: 'var(--text-primary)' }}>
          {task.title}
        </p>
        {task.notes && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
            {task.notes}
          </p>
        )}
        {task.due_date && (
          <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Calendar size={11} />
            <span>{format(new Date(task.due_date + 'T00:00'), 'MMM d')}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium badge-${task.priority}`}>
          {task.priority}
        </span>
        <button
          onClick={() => deleteTask(task.id)}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-overlay)] transition-all"
          style={{ color: 'var(--text-muted)' }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

export default function Tasks() {
  const { user } = useAppStore()
  const userId = user?.id
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('today')

  const tasks = useTasks(userId, filter)
  const pending = tasks.filter(t => t.status === 'pending')
  const done    = tasks.filter(t => t.status === 'done')

  const FILTERS = [
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'all', label: 'All pending' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Tasks</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {pending.length} remaining
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add task
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 p-1 rounded-xl"
        style={{ background: 'var(--bg-overlay)' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all
              ${filter === f.key
                ? 'bg-[var(--bg-raised)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Pending tasks */}
      {pending.length === 0 && done.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>No tasks here</p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add your first task
          </button>
        </div>
      )}

      {pending.map(task => <TaskItem key={task.id} task={task} />)}

      {/* Done section */}
      {done.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium mb-2 uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}>
            Completed ({done.length})
          </p>
          {done.map(task => <TaskItem key={task.id} task={task} />)}
        </div>
      )}

      <AddTaskModal open={showAdd} onClose={() => setShowAdd(false)} userId={userId} />
    </div>
  )
}
