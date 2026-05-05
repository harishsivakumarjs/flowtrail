import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         getDay, isToday, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Plus,
         RefreshCw, Unlink, ExternalLink, Trash2, Edit2, Clock } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import {
  isCalendarConnected, connectGoogleCalendar, disconnectCalendar,
  fetchCalendarEvents, scheduleEventNotifications, createCalendarEvent,
  deleteCalendarEvent, updateCalendarEvent
} from '@/lib/googleCalendar'
import { requestNotificationPermission } from '@/lib/notifications'
import Modal from '@/components/ui/Modal'
import { addTask, deleteTask, updateTask } from '@/hooks/useTasks'
import { TODAY } from '@/lib/utils'

// ── Google Connect Banner ─────────────────────────────────────
function GoogleCalendarBanner({ connected, onConnect, onDisconnect, loading }) {
  if (connected) return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
      style={{ background: 'color-mix(in srgb, var(--green) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--green) 20%, transparent)' }}>
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--green)' }}>
        <CalIcon size={15} /><span>Google Calendar connected</span>
      </div>
      <button onClick={onDisconnect}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:bg-[var(--bg-overlay)]"
        style={{ color: 'var(--text-muted)' }}>
        <Unlink size={12} /> Disconnect
      </button>
    </div>
  )
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
      style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <CalIcon size={15} /><span>Connect Google Calendar to see your events</span>
      </div>
      <button onClick={onConnect} disabled={loading}
        className="btn btn-primary text-xs px-3 py-1.5 gap-1">
        {loading ? <RefreshCw size={12} className="animate-spin" /> : <ExternalLink size={12} />}
        {loading ? 'Connecting…' : 'Connect'}
      </button>
    </div>
  )
}

// ── Add / Edit Event Modal ────────────────────────────────────
function AddEventModal({ open, onClose, userId, defaultDate, connected, onRefresh, editingEvent = null, editingTask = null }) {
  const isEditing = !!(editingEvent || editingTask)
  const [type, setType]         = useState('task')
  const [title, setTitle]       = useState('')
  const [date, setDate]         = useState(defaultDate || TODAY())
  const [time, setTime]         = useState('')
  const [priority, setPriority] = useState('medium')
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)

  // Populate fields when editing
  useEffect(() => {
    if (!open) return
    if (editingEvent) {
      setType('event')
      setTitle(editingEvent.title || '')
      setDate(editingEvent.start?.split('T')[0] || TODAY())
      setTime(editingEvent.start?.includes('T') ? editingEvent.start.split('T')[1]?.slice(0,5) : '')
      setNotes(editingEvent.desc || '')
    } else if (editingTask) {
      setType('task')
      setTitle(editingTask.title || '')
      setDate(editingTask.due_date || TODAY())
      setPriority(editingTask.priority || 'medium')
      setNotes(editingTask.notes || '')
    } else {
      setTitle(''); setDate(defaultDate || TODAY())
      setTime(''); setPriority('medium'); setNotes('')
      setDone(false); setType('task')
    }
  }, [open, editingEvent, editingTask, defaultDate])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)

    if (isEditing) {
      if (editingTask) {
        await updateTask(editingTask.id, { title: title.trim(), priority, due_date: date, notes })
      } else if (editingEvent) {
        await updateCalendarEvent(editingEvent.id, { title: title.trim(), date, time, notes })
        onRefresh?.()
      }
    } else {
      if (type === 'task') {
        await addTask({ title: title.trim(), priority, dueDate: date, notes, userId })
      } else {
        if (!connected) { alert('Connect Google Calendar first'); setSaving(false); return }
        const startDateTime = time ? `${date}T${time}:00` : null
        await createCalendarEvent({ title: title.trim(), dueDate: date, notes, priority: 'medium', startDateTime })
        onRefresh?.()
      }
    }

    setDone(true)
    setTimeout(() => { onClose(); setDone(false) }, 1000)
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose}
      title={isEditing ? `Edit ${editingEvent ? 'event' : 'task'}` : 'Add to calendar'}
      size="sm">
      <div className="space-y-4">
        {/* Type toggle — only for new items */}
        {!isEditing && (
          <div className="flex p-1 rounded-xl gap-1" style={{ background: 'var(--bg-overlay)' }}>
            <button onClick={() => setType('task')}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: type === 'task' ? 'var(--bg-raised)' : 'transparent', color: type === 'task' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              📋 FlowTrail Task
            </button>
            <button onClick={() => setType('event')}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: type === 'event' ? 'var(--bg-raised)' : 'transparent', color: type === 'event' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              📅 Google Event
            </button>
          </div>
        )}

        <input className="input-base" placeholder="Title" value={title}
          onChange={e => setTitle(e.target.value)} autoFocus
          onKeyDown={e => e.key === 'Enter' && handleSave()} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Date</label>
            <input type="date" className="input-base" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          {(type === 'event' || editingEvent) ? (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Time <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input type="time" className="input-base" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Priority</label>
              <select className="input-base" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          )}
        </div>

        <textarea className="input-base resize-none" rows={2}
          placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />

        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSave}
            disabled={saving || done || !title.trim()}>
            {done ? '✓ Saved!' : saving ? 'Saving…' : isEditing ? 'Save changes' : type === 'task' ? 'Add task' : 'Create event'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Event / Task Detail Modal ─────────────────────────────────
function DetailModal({ item, open, onClose, userId, onEdit, onDelete }) {
  if (!item) return null

  const isGoogle = item.source === 'google'
  const isTask   = item.source === 'task'

  // Format time display
  const formatTime = (dateStr) => {
    if (!dateStr) return null
    if (dateStr.includes('T')) {
      return format(new Date(dateStr), 'MMM d, yyyy · h:mm a')
    }
    return format(new Date(dateStr + 'T00:00'), 'MMM d, yyyy') + ' · All day'
  }

  const timeStr = isGoogle
    ? formatTime(item.start)
    : item.due_date
      ? format(new Date(item.due_date + 'T00:00'), 'MMM d, yyyy')
      : null

  return (
    <Modal open={open} onClose={onClose} title={isGoogle ? 'Google event' : 'Task'} size="sm">
      <div className="space-y-4">
        {/* Title & color dot */}
        <div className="flex items-start gap-3">
          <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: isGoogle ? (item.color || '#4285F4') : item.priority === 'high' ? 'var(--red)' : item.priority === 'medium' ? 'var(--amber)' : 'var(--green)' }} />
          <div className="flex-1">
            <h3 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
            {timeStr && (
              <div className="flex items-center gap-1 mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                <Clock size={13} />{timeStr}
              </div>
            )}
            {isTask && (
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium mt-1 inline-block badge-${item.priority}`}>
                {item.priority}
              </span>
            )}
          </div>
        </div>

        {/* Location */}
        {item.location && (
          <div className="text-sm px-3 py-2 rounded-lg"
            style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
            📍 {item.location}
          </div>
        )}

        {/* Notes / description */}
        {(item.desc || item.notes) && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {item.desc || item.notes}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button onClick={() => { onClose(); onEdit(item) }}
            className="btn btn-ghost flex-1 gap-1.5 text-sm">
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={() => onDelete(item)}
            className="btn btn-danger flex-1 gap-1.5 text-sm">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Day cell ──────────────────────────────────────────────────
function DayCell({ day, month, tasks, habitCount, habitTotal, googleEvents, onItemClick, onDayClick }) {
  const isCurrentMonth = day.getMonth() === month.getMonth()
  const isTodayDay     = isToday(day)
  const dateStr        = format(day, 'yyyy-MM-dd')
  const dayTasks       = tasks.filter(t => t.due_date === dateStr && t.status === 'pending')
  const dayGEvents     = googleEvents.filter(e => e.start?.startsWith(dateStr))

  // Format time for event chips
  const eventTime = (e) => e.start?.includes('T')
    ? format(new Date(e.start), 'h:mm a')
    : null

  return (
    <div onClick={() => onDayClick(dateStr)}
      className={`min-h-[80px] md:min-h-[100px] p-1.5 border-b border-r flex flex-col cursor-pointer
        hover:bg-[var(--bg-overlay)] transition-colors
        ${!isCurrentMonth ? 'opacity-30' : ''}
        ${isTodayDay ? 'bg-[color-mix(in_srgb,var(--brand)_5%,transparent)]' : ''}`}
      style={{ borderColor: 'var(--border)' }}>

      <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 flex-shrink-0
        ${isTodayDay ? 'bg-[var(--brand)] text-white' : ''}`}
        style={{ color: isTodayDay ? undefined : 'var(--text-secondary)' }}>
        {format(day, 'd')}
      </div>

      {/* Habit dots */}
      {isCurrentMonth && habitTotal > 0 && (
        <div className="flex gap-0.5 mb-1 flex-wrap">
          {Array.from({ length: Math.min(habitTotal, 5) }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full"
              style={{ background: i < habitCount ? 'var(--green)' : 'var(--border-mid)' }} />
          ))}
        </div>
      )}

      {/* FlowTrail tasks */}
      {dayTasks.slice(0, 1).map(task => (
        <div key={task.id}
          onClick={e => { e.stopPropagation(); onItemClick({ ...task, source: 'task' }) }}
          className="text-xs px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-80"
          style={{
            background: task.priority === 'high'
              ? 'color-mix(in srgb, var(--red) 18%, transparent)'
              : task.priority === 'medium'
              ? 'color-mix(in srgb, var(--amber) 18%, transparent)'
              : 'color-mix(in srgb, var(--green) 18%, transparent)',
            color: task.priority === 'high' ? 'var(--red)' : task.priority === 'medium' ? 'var(--amber)' : 'var(--green)',
            fontSize: '10px',
          }}>
          ✓ {task.title}
        </div>
      ))}

      {/* Google events */}
      {dayGEvents.slice(0, 2).map(event => {
        const t = eventTime(event)
        return (
          <div key={event.id}
            onClick={e => { e.stopPropagation(); onItemClick({ ...event, source: 'google' }) }}
            className="text-xs px-1.5 py-0.5 rounded mb-0.5 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: event.color || '#4285F4', color: '#fff', fontSize: '10px' }}>
            {t ? `${t} ` : '📅 '}{event.title}
          </div>
        )
      })}

      {(dayTasks.length + dayGEvents.length) > 3 && (
        <div className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
          +{dayTasks.length + dayGEvents.length - 3} more
        </div>
      )}
    </div>
  )
}

// ── Main Calendar ─────────────────────────────────────────────
export default function Calendar() {
  const { user }                          = useAppStore()
  const userId                            = user?.id
  const [currentMonth, setCurrentMonth]   = useState(new Date())
  const [googleEvents, setGoogleEvents]   = useState([])
  const [connected, setConnected]         = useState(false)
  const [loading, setLoading]             = useState(false)
  const [syncing, setSyncing]             = useState(false)
  const [showAdd, setShowAdd]             = useState(false)
  const [addDate, setAddDate]             = useState(TODAY())
  const [selectedItem, setSelectedItem]   = useState(null)
  const [editingItem, setEditingItem]     = useState(null)  // {event?, task?}

  useEffect(() => { setConnected(isCalendarConnected()) }, [])

  const fetchEvents = useCallback(async () => {
    if (!isCalendarConnected()) return
    setSyncing(true)
    try {
      const start  = startOfMonth(currentMonth)
      const end    = endOfMonth(currentMonth)
      const events = await fetchCalendarEvents(start, end)
      setGoogleEvents(events)
      const todayStr   = format(new Date(), 'yyyy-MM-dd')
      const todayEvts  = events.filter(e => e.start?.startsWith(todayStr))
      scheduleEventNotifications(todayEvts)
    } catch (err) { console.error('Fetch error:', err) }
    setSyncing(false)
  }, [currentMonth, connected])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const handleConnect = async () => {
    setLoading(true)
    try {
      await requestNotificationPermission()
      await connectGoogleCalendar()
      setConnected(true)
      fetchEvents()
    } catch (err) { alert('Could not connect. Allow pop-ups and try again.') }
    setLoading(false)
  }

  const handleEdit = (item) => {
    if (item.source === 'google') setEditingItem({ event: item })
    else setEditingItem({ task: item })
    setShowAdd(true)
  }

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.title}"?`)) return
    if (item.source === 'google') {
      await deleteCalendarEvent(item.id)
      setGoogleEvents(prev => prev.filter(e => e.id !== item.id))
    } else {
      await deleteTask(item.id)
    }
    setSelectedItem(null)
  }

  const handleDayClick = (dateStr) => {
    setEditingItem(null)
    setAddDate(dateStr)
    setShowAdd(true)
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad   = getDay(monthStart)

  const tasks = useLiveQuery(
    () => userId ? db.tasks.where('user_id').equals(userId).toArray() : Promise.resolve([]), [userId]
  ) ?? []

  const habitLogs = useLiveQuery(
    () => userId ? db.habit_logs.where('user_id').equals(userId).filter(l => l.completed).toArray() : Promise.resolve([]), [userId]
  ) ?? []

  const habitCount = useLiveQuery(
    () => userId ? db.habits.where('user_id').equals(userId).filter(h => !h.archived).count() : Promise.resolve(0), [userId]
  ) ?? 0

  const logsByDate = {}
  habitLogs.forEach(l => { logsByDate[l.log_date] = (logsByDate[l.log_date] || 0) + 1 })

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Calendar</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{format(currentMonth, 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <button onClick={fetchEvents} disabled={syncing} className="btn btn-ghost p-2">
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            </button>
          )}
          <button className="btn btn-primary gap-1.5"
            onClick={() => { setEditingItem(null); setAddDate(TODAY()); setShowAdd(true) }}>
            <Plus size={15} /> Add
          </button>
          <button className="btn btn-ghost p-2" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft size={17} />
          </button>
          <button className="btn btn-ghost text-sm px-3" onClick={() => setCurrentMonth(new Date())}>Today</button>
          <button className="btn btn-ghost p-2" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <GoogleCalendarBanner connected={connected} onConnect={handleConnect}
          onDisconnect={() => { disconnectCalendar(); setConnected(false); setGoogleEvents([]) }}
          loading={loading} />
      </div>

      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Click any day to add · Click any event to view, edit, or delete
      </p>

      {/* Grid */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[80px] md:min-h-[100px] border-b border-r"
              style={{ borderColor: 'var(--border)', opacity: 0.3 }} />
          ))}
          {days.map(day => (
            <DayCell key={format(day, 'yyyy-MM-dd')} day={day} month={currentMonth}
              tasks={tasks}
              habitCount={logsByDate[format(day, 'yyyy-MM-dd')] || 0}
              habitTotal={habitCount}
              googleEvents={googleEvents}
              onItemClick={setSelectedItem}
              onDayClick={handleDayClick}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />Habits
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="w-3 h-2 rounded" style={{ background: 'color-mix(in srgb, var(--amber) 30%, transparent)' }} />FlowTrail task
        </div>
        {connected && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className="w-3 h-2 rounded bg-[#4285F4]" />Google event
          </div>
        )}
      </div>

      {/* Detail modal */}
      <DetailModal
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        userId={userId}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Add / Edit modal */}
      <AddEventModal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditingItem(null) }}
        userId={userId}
        defaultDate={addDate}
        connected={connected}
        onRefresh={fetchEvents}
        editingEvent={editingItem?.event || null}
        editingTask={editingItem?.task || null}
      />
    </div>
  )
}