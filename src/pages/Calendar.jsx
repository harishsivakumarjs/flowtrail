import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         getDay, isToday, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Plus,
         RefreshCw, Unlink, ExternalLink, Trash2, Edit2,
         Clock, Download, CheckCircle } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import {
  isCalendarConnected, connectGoogleCalendar, disconnectCalendar,
  fetchCalendarEvents, scheduleEventNotifications, createCalendarEvent,
  deleteCalendarEvent, updateCalendarEvent, getStoredToken
} from '@/lib/googleCalendar'
import { requestNotificationPermission } from '@/lib/notifications'
import Modal from '@/components/ui/Modal'
import { addTask, toggleTask, deleteTask, updateTask, scheduleTaskNotification } from '@/hooks/useTasks'
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

// ── Add / Edit Modal ──────────────────────────────────────────
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
      setTime(editingTask.due_time || '')
      setPriority(editingTask.priority || 'medium')
      setNotes(editingTask.notes || '')
    } else {
      setTitle(''); setDate(defaultDate || TODAY()); setTime('')
      setPriority('medium'); setNotes(''); setDone(false); setType('task')
    }
  }, [open, editingEvent, editingTask, defaultDate])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    if (isEditing) {
      if (editingTask) {
        await updateTask(editingTask.id, { title: title.trim(), priority, due_date: date, due_time: time || null, notes })
      } else if (editingEvent) {
        await updateCalendarEvent(editingEvent.id, { title: title.trim(), date, time, notes })
        onRefresh?.()
      }
    } else {
      if (type === 'task') {
        await addTask({ title: title.trim(), priority, dueDate: date, dueTime: time || null, notes, userId })
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
      title={isEditing ? `Edit ${editingEvent ? 'event' : 'task'}` : 'Add to calendar'} size="sm">
      <div className="space-y-4">
        {!isEditing && (
          <div className="flex p-1 rounded-xl gap-1" style={{ background: 'var(--bg-overlay)' }}>
            {['task','event'].map(t => (
              <button key={t} onClick={() => setType(t)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: type === t ? 'var(--bg-raised)' : 'transparent', color: type === t ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {t === 'task' ? '📋 FlowTrail Task' : '📅 Google Event'}
              </button>
            ))}
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
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Time <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input type="time" className="input-base" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>

        {(type === 'task' || editingTask) && (
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Priority</label>
            <select className="input-base" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
        )}

        <textarea className="input-base resize-none" rows={2}
          placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />

        {time && (type === 'task' || editingTask) && (
          <div className="text-xs px-3 py-2 rounded-lg"
            style={{ background: 'color-mix(in srgb, var(--brand) 8%, transparent)', color: 'var(--text-secondary)' }}>
            🔔 You'll get a notification 30 minutes before this task
          </div>
        )}

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

// ── Detail Modal ──────────────────────────────────────────────
function DetailModal({ item, open, onClose, userId, onEdit, onDelete, onComplete }) {
  if (!item) return null
  const isGoogle = item.source === 'google'
  const isTask   = item.source === 'task'

  const formatTime = (dateStr) => {
    if (!dateStr) return null
    if (dateStr.includes('T')) return format(new Date(dateStr), 'MMM d, yyyy · h:mm a')
    return format(new Date(dateStr + 'T00:00'), 'MMM d, yyyy') + ' · All day'
  }

  const timeStr = isGoogle
    ? formatTime(item.start)
    : item.due_date
      ? `${format(new Date(item.due_date + 'T00:00'), 'MMM d, yyyy')}${item.due_time ? ' · ' + format(new Date(`${item.due_date}T${item.due_time}`), 'h:mm a') : ''}`
      : null

  return (
    <Modal open={open} onClose={onClose} title={isGoogle ? 'Google event' : 'Task'} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: isGoogle ? (item.color || '#4285F4') : item.priority === 'high' ? 'var(--red)' : item.priority === 'medium' ? 'var(--amber)' : 'var(--green)' }} />
          <div className="flex-1">
            <h3 className="text-base font-medium" style={{ color: 'var(--text-primary)', textDecoration: item.status === 'done' ? 'line-through' : 'none' }}>
              {item.title}
            </h3>
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

        {item.location && (
          <div className="text-sm px-3 py-2 rounded-lg"
            style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
            📍 {item.location}
          </div>
        )}
        {(item.desc || item.notes) && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.desc || item.notes}</p>
        )}

        <div className="flex gap-2 flex-wrap">
          {isTask && item.status !== 'done' && (
            <button onClick={() => onComplete(item)}
              className="btn btn-primary flex-1 gap-1.5 text-sm">
              <CheckCircle size={14} /> Mark complete
            </button>
          )}
          {isGoogle && (
            <button onClick={() => { addTask({ title: item.title, priority: 'medium', dueDate: item.start?.split('T')[0] || TODAY(), notes: item.desc || '', userId }); onClose() }}
              className="btn btn-ghost flex-1 gap-1 text-sm">
              <Download size={14} /> Import as task
            </button>
          )}
        </div>
        <div className="flex gap-2">
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

// ── Import Modal ──────────────────────────────────────────────
function ImportModal({ open, onClose, events, userId }) {
  const [selected, setSelected] = useState([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (open) { setSelected(events.map(e => e.id)); setDone(false) }
  }, [open, events])

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const handleImport = async () => {
    setImporting(true)
    const toImport = events.filter(e => selected.includes(e.id))
    for (const event of toImport) {
      await addTask({
        title:    event.title,
        priority: 'medium',
        dueDate:  event.start?.split('T')[0] || TODAY(),
        dueTime:  event.start?.includes('T') ? event.start.split('T')[1]?.slice(0,5) : null,
        notes:    event.desc || '',
        userId,
      })
    }
    setDone(true)
    setTimeout(() => { onClose(); setDone(false) }, 1200)
    setImporting(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Import Google events as tasks" size="md">
      <div className="space-y-3">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Select events to import as FlowTrail tasks:
        </p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {events.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No events this month</p>
          )}
          {events.map(event => (
            <div key={event.id}
              onClick={() => toggle(event.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-[var(--bg-overlay)] transition-colors"
              style={{ border: `1px solid ${selected.includes(event.id) ? 'var(--brand)' : 'var(--border)'}` }}>
              <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor: selected.includes(event.id) ? 'var(--brand)' : 'var(--border)', background: selected.includes(event.id) ? 'var(--brand)' : 'transparent' }}>
                {selected.includes(event.id) && <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{event.title}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {event.start ? format(new Date(event.start.includes('T') ? event.start : event.start + 'T00:00'), 'MMM d, yyyy') : ''}
                  {event.start?.includes('T') ? ' · ' + format(new Date(event.start), 'h:mm a') : ' · All day'}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleImport}
            disabled={importing || done || selected.length === 0}>
            {done ? '✓ Imported!' : importing ? 'Importing…' : `Import ${selected.length} event${selected.length !== 1 ? 's' : ''}`}
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
  const dayTasks       = tasks.filter(t => t.due_date === dateStr)
  const dayGEvents     = googleEvents.filter(e => e.start?.startsWith(dateStr))

  return (
    <div
      onClick={() => onDayClick(dateStr)}
      onDoubleClick={(e) => { e.stopPropagation(); onDayClick(dateStr, true) }}
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

      {isCurrentMonth && habitTotal > 0 && (
        <div className="flex gap-0.5 mb-1 flex-wrap">
          {Array.from({ length: Math.min(habitTotal, 5) }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full"
              style={{ background: i < habitCount ? 'var(--green)' : 'var(--border-mid)' }} />
          ))}
        </div>
      )}

      {dayTasks.slice(0, 1).map(task => (
        <div key={task.id}
          onClick={e => { e.stopPropagation(); onItemClick({ ...task, source: 'task' }) }}
          className="text-xs px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-80"
          style={{
            background: task.status === 'done'
              ? 'color-mix(in srgb, var(--green) 15%, transparent)'
              : task.priority === 'high'
              ? 'color-mix(in srgb, var(--red) 15%, transparent)'
              : 'color-mix(in srgb, var(--amber) 15%, transparent)',
            color: task.status === 'done' ? 'var(--green)' : task.priority === 'high' ? 'var(--red)' : 'var(--amber)',
            fontSize: '10px',
            textDecoration: task.status === 'done' ? 'line-through' : 'none',
          }}>
          {task.status === 'done' ? '✓' : '●'} {task.due_time ? format(new Date(`${task.due_date}T${task.due_time}`), 'h:mma') + ' ' : ''}{task.title}
        </div>
      ))}

      {dayGEvents.slice(0, 2).map(event => {
        const t = event.start?.includes('T') ? format(new Date(event.start), 'h:mma') : null
        return (
          <div key={event.id}
            onClick={e => { e.stopPropagation(); onItemClick({ ...event, source: 'google' }) }}
            className="text-xs px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-80"
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
  const [selectedDay, setSelectedDay]     = useState(null)
  const [showAdd, setShowAdd]             = useState(false)
  const [showImport, setShowImport]       = useState(false)
  const [addDate, setAddDate]             = useState(TODAY())
  const [selectedItem, setSelectedItem]   = useState(null)
  const [editingItem, setEditingItem]     = useState(null)

  // Auto-reconnect on mount if token exists
  useEffect(() => {
    const hasToken = isCalendarConnected()
    setConnected(hasToken)
    if (hasToken) fetchEvents()
  }, [])

  const fetchEvents = useCallback(async () => {
    if (!isCalendarConnected()) return
    setSyncing(true)
    try {
      const start  = startOfMonth(currentMonth)
      const end    = endOfMonth(currentMonth)
      const events = await fetchCalendarEvents(start, end)
      // Filter out events created by FlowTrail (to avoid duplicates with task view)
      const filtered = events.filter(e => !e.desc?.includes('[FlowTrail'))
      setGoogleEvents(filtered)
      const todayStr  = format(new Date(), 'yyyy-MM-dd')
      const todayEvts = filtered.filter(e => e.start?.startsWith(todayStr))
      scheduleEventNotifications(todayEvts)
    } catch { /* silent */ }
    setSyncing(false)
  }, [currentMonth, connected])

  useEffect(() => { if (connected) fetchEvents() }, [fetchEvents])

  const handleConnect = async () => {
    setLoading(true)
    try {
      await requestNotificationPermission()
      await connectGoogleCalendar()
      setConnected(true)
    } catch { alert('Could not connect. Allow pop-ups and try again.') }
    setLoading(false)
  }


  const handleComplete = async (item) => {
    await toggleTask(item.id)
    setSelectedItem(null)
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
      setGoogleEvents(p => p.filter(e => e.id !== item.id))
    } else {
      await deleteTask(item.id)
    }
    setSelectedItem(null)
  }

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

  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad   = getDay(monthStart)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Calendar</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{format(currentMonth, 'MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {connected && (
            <>
              <button onClick={() => setShowImport(true)}
                className="btn btn-ghost text-sm gap-1.5">
                <Download size={14} /> Import events
              </button>
              <button onClick={fetchEvents} disabled={syncing} className="btn btn-ghost p-2">
                <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              </button>
            </>
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

      <div className="mb-3">
        <GoogleCalendarBanner connected={connected} onConnect={handleConnect}
          onDisconnect={() => { disconnectCalendar(); setConnected(false); setGoogleEvents([]) }}
          loading={loading} />
      </div>

      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Click any day to add · Click any event or task to view, edit, complete, or delete
      </p>

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
              onDayClick={(ds, openAdd) => { if (openAdd) { setEditingItem(null); setAddDate(ds); setShowAdd(true) } else { setSelectedDay(ds === selectedDay ? null : ds) } }}
            />
          ))}
        </div>
      </div>

      {/* Selected day detail — shows on mobile */}
      {selectedDay && (
        <div className="mt-3 card p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {format(new Date(selectedDay + 'T00:00'), 'EEEE, MMMM d')}
            </div>
            <button
              onClick={() => { setEditingItem(null); setAddDate(selectedDay); setShowAdd(true) }}
              className="btn btn-primary text-xs px-3 py-1.5 gap-1">
              <Plus size={12} /> Add
            </button>
          </div>

          {/* Tasks for this day */}
          {tasks.filter(t => t.due_date === selectedDay).length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tasks</div>
              <div className="space-y-1.5">
                {tasks.filter(t => t.due_date === selectedDay).map(task => (
                  <div key={task.id}
                    onClick={() => setSelectedItem({ ...task, source: 'task' })}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:bg-[var(--bg-overlay)]"
                    style={{ border: '1px solid var(--border)' }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: task.priority === 'high' ? 'var(--red)' : task.priority === 'medium' ? 'var(--amber)' : 'var(--green)' }} />
                    <span className="text-sm flex-1" style={{
                      color: 'var(--text-primary)',
                      textDecoration: task.status === 'done' ? 'line-through' : 'none',
                      opacity: task.status === 'done' ? 0.5 : 1
                    }}>{task.title}</span>
                    {task.due_time && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {format(new Date(`${task.due_date}T${task.due_time}`), 'h:mm a')}
                      </span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium badge-${task.priority}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Google events for this day */}
          {googleEvents.filter(e => e.start?.startsWith(selectedDay)).length > 0 && (
            <div>
              <div className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Google Calendar</div>
              <div className="space-y-1.5">
                {googleEvents.filter(e => e.start?.startsWith(selectedDay)).map(event => (
                  <div key={event.id}
                    onClick={() => setSelectedItem({ ...event, source: 'google' })}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:opacity-90"
                    style={{ background: event.color || '#4285F4' }}>
                    <span className="text-sm font-medium text-white flex-1">{event.title}</span>
                    {event.start?.includes('T') && (
                      <span className="text-xs text-white/70">
                        {format(new Date(event.start), 'h:mm a')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tasks.filter(t => t.due_date === selectedDay).length === 0 &&
           googleEvents.filter(e => e.start?.startsWith(selectedDay)).length === 0 && (
            <p className="text-sm text-center py-2" style={{ color: 'var(--text-muted)' }}>
              Nothing scheduled — tap Add to create something
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />Habits
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="w-3 h-2 rounded" style={{ background: 'color-mix(in srgb, var(--amber) 30%, transparent)' }} />Task
        </div>
        {connected && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className="w-3 h-2 rounded bg-[#4285F4]" />Google event
          </div>
        )}
      </div>

      <DetailModal item={selectedItem} open={!!selectedItem}
        onClose={() => setSelectedItem(null)} userId={userId}
        onEdit={handleEdit} onDelete={handleDelete} onComplete={handleComplete} />

      <AddEventModal open={showAdd}
        onClose={() => { setShowAdd(false); setEditingItem(null) }}
        userId={userId} defaultDate={addDate} connected={connected}
        onRefresh={fetchEvents}
        editingEvent={editingItem?.event || null}
        editingTask={editingItem?.task || null} />

      <ImportModal open={showImport} onClose={() => setShowImport(false)}
        events={googleEvents} userId={userId} />
    </div>
  )
}