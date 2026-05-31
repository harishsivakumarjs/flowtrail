import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Calendar, Clock, Edit2, CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { addTask, toggleTask, deleteTask, updateTask } from '@/hooks/useTasks'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import TimeInput from '@/components/ui/TimeInput'
import TaskDetailModal from '@/components/ui/TaskDetailModal'
import MonthYearPicker from '@/components/ui/MonthYearPicker'
import { TODAY } from '@/lib/utils'
import { format, addDays } from 'date-fns'

const PRIORITIES = ['high', 'medium', 'low']
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

// ── Fetch tasks directly ──────────────────────────────────────
function useAllTasks(userId) {
  const [tasks, setTasks] = useState([])
  const fetch = useCallback(async () => {
    if (!userId || !supabase) return
    const { data } = await supabase.from('tasks').select('*').eq('user_id', userId).order('due_date')
    if (data) setTasks(data)
  }, [userId])
  useEffect(() => {
    fetch()
    const t = setInterval(fetch, 3000)
    return () => clearInterval(t)
  }, [fetch])
  return [tasks, fetch]
}

// ── Task Modal ────────────────────────────────────────────────
function TaskModal({ open, onClose, onSaved, userId, editing = null }) {
  const [title, setTitle]       = useState(editing?.title || '')
  const [priority, setPriority] = useState(editing?.priority || 'medium')
  const [dueDate, setDueDate]   = useState(editing?.due_date || TODAY())
  const [dueTime, setDueTime]   = useState(editing?.due_time || '')
  const [endTime, setEndTime]   = useState(editing?.end_time || '')
  const [notes, setNotes]       = useState(editing?.notes || '')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(editing?.title || '')
      setPriority(editing?.priority || 'medium')
      setDueDate(editing?.due_date || TODAY())
      setDueTime(editing?.due_time || '')
      setEndTime(editing?.end_time || '')
      setNotes(editing?.notes || '')
    }
  }, [open, editing])

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
    if (onSaved) onSaved()
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
            Time <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <div><div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Start</div><TimeInput value={dueTime} onChange={setDueTime} /></div>
            <div className="text-sm font-medium mt-4" style={{ color: 'var(--text-muted)' }}>→</div>
            <div><div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>End</div><TimeInput value={endTime} onChange={setEndTime} /></div>
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

// ── Reschedule Modal ──────────────────────────────────────────
function RescheduleModal({ open, onClose, task, onSaved }) {
  const [newDate, setNewDate] = useState(task?.due_date || TODAY())
  const [newTime, setNewTime] = useState(task?.due_time || '')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (open && task) { setNewDate(task.due_date || TODAY()); setNewTime(task.due_time || '') }
  }, [open, task])

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
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Tomorrow',  date: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
            { label: 'In 2 days', date: format(addDays(new Date(), 2), 'yyyy-MM-dd') },
            { label: 'Next week', date: format(addDays(new Date(), 7), 'yyyy-MM-dd') },
          ].map(opt => (
            <button key={opt.label} onClick={() => setNewDate(opt.date)}
              className="text-xs px-3 py-1.5 rounded-xl border transition-all"
              style={{
                borderColor: newDate === opt.date ? 'var(--brand)' : 'var(--border)',
                color: newDate === opt.date ? 'var(--brand)' : 'var(--text-muted)',
              }}>{opt.label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" disabled={saving} onClick={async () => {
            setSaving(true)
            await updateTask(task.id, { due_date: newDate, due_time: newTime || null })
            setSaving(false)
            if (onSaved) onSaved()
            onClose()
          }}>Move task</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Task row ──────────────────────────────────────────────────
function TaskRow({ task, onSelect, onEdit, onReschedule, onDelete }) {
  const today    = TODAY()
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const isDone   = task.status === 'done'

  const dayLabel = () => {
    if (!task.due_date) return null
    if (task.due_date === today)    return { label: 'Today',    color: 'var(--brand)' }
    if (task.due_date === tomorrow) return { label: 'Tomorrow', color: 'var(--amber)' }
    if (task.due_date < today)      return { label: format(new Date(task.due_date + 'T00:00'), 'MMM d'), color: 'var(--red)' }
    return { label: format(new Date(task.due_date + 'T00:00'), 'MMM d'), color: 'var(--text-muted)' }
  }
  const day = dayLabel()

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl transition-all group card mb-2 cursor-pointer
      ${isDone ? 'opacity-50' : ''}`}
      onClick={() => onSelect(task)}>
      <button onClick={e => { e.stopPropagation(); toggleTask(task.id) }}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
          ${isDone ? 'border-[var(--green)] bg-[var(--green)]' : 'border-[var(--border-mid)] hover:border-[var(--brand)]'}`}>
        {isDone && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isDone ? 'line-through' : ''}`} style={{ color: 'var(--text-primary)' }}>{task.title}</p>
        {task.notes && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{task.notes}</p>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {day && <div className="flex items-center gap-1 text-xs" style={{ color: day.color }}><Calendar size={11}/><span>{day.label}</span></div>}
          {task.due_time && (
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Clock size={11}/>
              <span>{format(new Date(`2000-01-01T${task.due_time}`), 'h:mm a')}{task.end_time ? ' → ' + format(new Date(`2000-01-01T${task.end_time}`), 'h:mm a') : ''}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium badge-${task.priority}`}>{task.priority}</span>
        <button onClick={e => { e.stopPropagation(); onEdit(task) }} className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]" style={{ color: 'var(--text-muted)' }}><Edit2 size={13}/></button>
        <button onClick={e => { e.stopPropagation(); onReschedule(task) }} className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]" style={{ color: 'var(--text-muted)' }}><CalendarClock size={13}/></button>
        <button onClick={e => { e.stopPropagation(); onDelete(task) }} className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]" style={{ color: 'var(--text-muted)' }}><Trash2 size={13}/></button>
      </div>
    </div>
  )
}

// ── Main Tasks page ───────────────────────────────────────────
export default function Tasks() {
  const { user } = useAppStore()
  const userId   = user?.id
  const [allTasks, refetch] = useAllTasks(userId)

  const [showAdd, setShowAdd]           = useState(false)
  const [editingTask, setEditingTask]   = useState(null)
  const [rescheduleTask, setReschedule] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [filter, setFilter]             = useState('today')

  const realToday = new Date()
  const today     = TODAY()

  // Month navigation
  const [viewDate, setViewDate] = useState(new Date(realToday.getFullYear(), realToday.getMonth(), 1))
  const currentMonthStart = new Date(realToday.getFullYear(), realToday.getMonth(), 1)
  const viewMonthStart    = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const isCurrentMonth    = viewMonthStart.getTime() === currentMonthStart.getTime()
  const viewYM = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`

  const goToPrevMonth = () => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
    setViewDate(next)
    const isCurrent = next.getFullYear() === realToday.getFullYear() && next.getMonth() === realToday.getMonth()
    const isPast    = next < currentMonthStart
    setFilter(isCurrent ? 'today' : isPast ? 'overdue' : 'upcoming')
  }

  const goToNextMonth = () => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
    setViewDate(next)
    const isCurrent = next.getFullYear() === realToday.getFullYear() && next.getMonth() === realToday.getMonth()
    setFilter(isCurrent ? 'today' : 'upcoming')
  }

  // Month-scoped pool: current month shows all tasks, other months filter by due_date prefix
  const monthPool = isCurrentMonth
    ? allTasks
    : allTasks.filter(t => t.due_date?.startsWith(viewYM))

  // Filter logic
  const todayTasks     = monthPool.filter(t => t.status === 'pending' && (t.due_date === today || !t.due_date))
  const upcomingTasks  = monthPool.filter(t => t.status === 'pending' && t.due_date && t.due_date > today)
  const overdueTasks   = monthPool.filter(t => t.status === 'pending' && t.due_date && t.due_date < today)
  const completedTasks = monthPool.filter(t => t.status === 'done')

  const sortByDateTime = arr => [...arr].sort((a, b) => {
    const da = a.due_date || '', db = b.due_date || ''
    if (da !== db) return da.localeCompare(db)
    const ta = a.due_time || '99:99', tb = b.due_time || '99:99'
    if (ta !== tb) return ta.localeCompare(tb)
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  })

  const todaySorted     = sortByDateTime(todayTasks)
  const upcomingSorted  = sortByDateTime(upcomingTasks)
  const overdueSorted   = sortByDateTime(overdueTasks).reverse()
  const completedSorted = [...completedTasks].sort((a,b) => (b.completed_at||'').localeCompare(a.completed_at||''))

  const FILTERS = [
    { key: 'today',     label: 'Today',       count: todayTasks.length },
    { key: 'upcoming',  label: 'Upcoming',    count: upcomingTasks.length },
    { key: 'overdue',   label: 'All pending', count: overdueTasks.length },
    { key: 'completed', label: 'Completed',   count: completedTasks.length },
  ]

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return
    await deleteTask(task.id)
    refetch()
  }

  const currentList = {
    today:     todaySorted,
    upcoming:  upcomingSorted,
    overdue:   overdueSorted,
    completed: completedSorted,
  }[filter] || []

  // Group upcoming by date
  const grouped = filter === 'upcoming'
    ? upcomingSorted.reduce((acc, t) => {
        const k = t.due_date
        if (!acc[k]) acc[k] = []
        acc[k].push(t)
        return acc
      }, {})
    : null

  const subtitle = isCurrentMonth
    ? `${todayTasks.length} today · ${overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'none overdue'}`
    : `${monthPool.length} task${monthPool.length !== 1 ? 's' : ''} in ${format(viewDate, 'MMMM yyyy')}`

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Tasks</h1>
          <div className="flex items-center gap-1 mt-1">
            <button onClick={goToPrevMonth}
              className="p-1 rounded-lg hover:bg-[var(--bg-overlay)] transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              <ChevronLeft size={16} />
            </button>
            <MonthYearPicker
              value={viewDate}
              onChange={(newDate) => {
                setViewDate(newDate)
                const isCurrent = newDate.getFullYear() === realToday.getFullYear() && newDate.getMonth() === realToday.getMonth()
                const isPast    = newDate < currentMonthStart
                setFilter(isCurrent ? 'today' : isPast ? 'overdue' : 'upcoming')
              }}
            />
            <button onClick={goToNextMonth}
              className="p-1 rounded-lg hover:bg-[var(--bg-overlay)] transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              <ChevronRight size={16} />
            </button>
            {!isCurrentMonth && (
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                · {monthPool.length} task{monthPool.length !== 1 ? 's' : ''}
              </span>
            )}
            {isCurrentMonth && (
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                · {todayTasks.length} today
              </span>
            )}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingTask(null); setShowAdd(true) }}>
          <Plus size={15}/> Add task
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--bg-overlay)' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex-1 min-w-fit text-xs py-2 px-2 rounded-lg font-medium transition-all whitespace-nowrap
              ${filter === f.key ? 'bg-[var(--bg-raised)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}>
            {f.label}
            {f.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                style={{ background: filter === f.key ? 'var(--brand)' : 'var(--border)', color: filter === f.key ? '#fff' : 'var(--text-muted)' }}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {currentList.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
            {filter === 'today' ? 'No tasks for today' :
             filter === 'upcoming' ? 'No upcoming tasks' :
             filter === 'overdue' ? "No overdue tasks — you're all caught up!" :
             'No completed tasks yet'}
          </p>
          {filter === 'today' && isCurrentMonth && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={15}/> Add your first task
            </button>
          )}
        </div>
      )}

      {/* Grouped upcoming */}
      {grouped ? (
        Object.entries(grouped).map(([date, tasks]) => (
          <div key={date} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: date === format(addDays(new Date(),1), 'yyyy-MM-dd') ? 'var(--amber)' : 'var(--text-muted)' }}>
                {format(new Date(date + 'T00:00'), 'EEEE, MMM d')}
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }}/>
            </div>
            {tasks.map(task => (
              <TaskRow key={task.id} task={task}
                onSelect={setSelectedTask}
                onEdit={t => { setEditingTask(t); setShowAdd(true) }}
                onReschedule={setReschedule}
                onDelete={handleDelete} />
            ))}
          </div>
        ))
      ) : (
        currentList.map(task => (
          <TaskRow key={task.id} task={task}
            onSelect={setSelectedTask}
            onEdit={t => { setEditingTask(t); setShowAdd(true) }}
            onReschedule={setReschedule}
            onDelete={handleDelete} />
        ))
      )}

      {/* Modals */}
      <TaskModal open={showAdd}
        onClose={() => { setShowAdd(false); setEditingTask(null) }}
        onSaved={() => refetch()}
        userId={userId}
        editing={editingTask} />
      <RescheduleModal open={!!rescheduleTask}
        onClose={() => setReschedule(null)}
        task={rescheduleTask}
        onSaved={() => refetch()} />
      <TaskDetailModal task={selectedTask} open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onEdit={t => { setSelectedTask(null); setEditingTask(t); setShowAdd(true) }}
        onDelete={t => { setSelectedTask(null); handleDelete(t) }} />
    </div>
  )
}
