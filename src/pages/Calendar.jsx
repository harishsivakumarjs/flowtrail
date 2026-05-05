import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         getDay, isToday, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Plus,
         RefreshCw, Unlink, ExternalLink } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import {
  isCalendarConnected, connectGoogleCalendar, disconnectCalendar,
  fetchCalendarEvents, scheduleEventNotifications, createCalendarEvent
} from '@/lib/googleCalendar'
import { requestNotificationPermission } from '@/lib/notifications'
import Modal from '@/components/ui/Modal'
import { addTask } from '@/hooks/useTasks'
import { TODAY } from '@/lib/utils'

// ── Google Connect Banner ────────────────────────────────────
function GoogleCalendarBanner({ connected, onConnect, onDisconnect, loading }) {
  if (connected) return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
      style={{ background: 'color-mix(in srgb, var(--green) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--green) 20%, transparent)' }}>
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--green)' }}>
        <CalIcon size={15} />
        <span>Google Calendar connected</span>
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
        <CalIcon size={15} />
        <span>Connect Google Calendar to see your events</span>
      </div>
      <button onClick={onConnect} disabled={loading}
        className="btn btn-primary text-xs px-3 py-1.5 gap-1">
        {loading ? <RefreshCw size={12} className="animate-spin" /> : <ExternalLink size={12} />}
        {loading ? 'Connecting…' : 'Connect'}
      </button>
    </div>
  )
}

// ── Add Event/Task Modal ─────────────────────────────────────
function AddEventModal({ open, onClose, userId, defaultDate, connected, onRefresh }) {
  const [type, setType]         = useState('task')  // 'task' | 'event'
  const [title, setTitle]       = useState('')
  const [date, setDate]         = useState(defaultDate || TODAY())
  const [time, setTime]         = useState('09:00')
  const [priority, setPriority] = useState('medium')
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)

  useEffect(() => {
    if (open) {
      setDate(defaultDate || TODAY())
      setTitle(''); setNotes(''); setPriority('medium')
      setDone(false); setType('task')
    }
  }, [open, defaultDate])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)

    if (type === 'task') {
      // Add to FlowTrail tasks (auto-creates Google Calendar event if connected)
      await addTask({
        title:    title.trim(),
        priority,
        dueDate:  date,
        notes:    notes.trim(),
        userId,
      })
    } else {
      // Create directly in Google Calendar
      if (!connected) { alert('Connect Google Calendar first'); setSaving(false); return }
      const startDateTime = `${date}T${time}:00`
      await createCalendarEvent({
        title:    title.trim(),
        dueDate:  date,
        notes:    notes.trim(),
        priority: 'medium',
        startDateTime,
      })
      onRefresh?.()
    }

    setDone(true)
    setTimeout(() => { onClose(); setDone(false) }, 1200)
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add to calendar" size="sm">
      <div className="space-y-4">
        {/* Type toggle */}
        <div className="flex p-1 rounded-xl gap-1" style={{ background: 'var(--bg-overlay)' }}>
          <button
            onClick={() => setType('task')}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: type === 'task' ? 'var(--bg-raised)' : 'transparent',
              color: type === 'task' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}>
            📋 FlowTrail Task
          </button>
          <button
            onClick={() => setType('event')}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: type === 'event' ? 'var(--bg-raised)' : 'transparent',
              color: type === 'event' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}>
            📅 Google Event
          </button>
        </div>

        {type === 'task' && (
          <div className="text-xs px-3 py-2 rounded-lg"
            style={{ background: 'color-mix(in srgb, var(--brand) 8%, transparent)', color: 'var(--text-secondary)' }}>
            Creates a task in FlowTrail {connected ? '+ automatically adds to Google Calendar' : '(connect Google Calendar to also add there)'}
          </div>
        )}
        {type === 'event' && !connected && (
          <div className="text-xs px-3 py-2 rounded-lg"
            style={{ background: 'color-mix(in srgb, var(--red) 8%, transparent)', color: 'var(--red)' }}>
            Connect Google Calendar first to create events
          </div>
        )}

        <input className="input-base" placeholder="Title" value={title}
          onChange={e => setTitle(e.target.value)} autoFocus />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Date</label>
            <input type="date" className="input-base" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          {type === 'event' ? (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Time</label>
              <input type="time" className="input-base" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Priority</label>
              <select className="input-base" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
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
            {done ? '✓ Added!' : saving ? 'Saving…' : type === 'task' ? 'Add task' : 'Create event'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Event detail modal ───────────────────────────────────────
function EventModal({ event, open, onClose, userId }) {
  const [adding, setAdding] = useState(false)
  const [added,  setAdded]  = useState(false)

  const addAsTask = async () => {
    setAdding(true)
    await addTask({
      title:   event.title,
      priority:'medium',
      dueDate: event.start?.split('T')[0] || TODAY(),
      notes:   event.desc || '',
      userId,
    })
    setAdded(true)
    setTimeout(onClose, 1500)
    setAdding(false)
  }

  if (!event) return null
  const startStr = event.start
    ? format(new Date(event.start), event.allDay ? 'MMM d, yyyy' : 'MMM d, yyyy · h:mm a')
    : ''

  return (
    <Modal open={open} onClose={onClose} title="Event details" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: event.color || '#4285F4' }} />
          <div>
            <h3 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>{event.title}</h3>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{startStr}</p>
          </div>
        </div>
        {event.location && (
          <div className="text-sm px-3 py-2 rounded-lg"
            style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
            📍 {event.location}
          </div>
        )}
        {event.desc && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{event.desc}</p>
        )}
        {event.source === 'google' && (
          <button onClick={addAsTask} disabled={adding || added}
            className="btn btn-ghost w-full text-sm gap-2">
            <Plus size={14} />
            {added ? '✓ Added to tasks!' : adding ? 'Adding…' : 'Add as FlowTrail task'}
          </button>
        )}
      </div>
    </Modal>
  )
}

// ── Day cell ─────────────────────────────────────────────────
function DayCell({ day, month, tasks, habitCount, habitTotal, googleEvents, onEventClick, onDayClick }) {
  const isCurrentMonth = day.getMonth() === month.getMonth()
  const isTodayDay     = isToday(day)
  const dateStr        = format(day, 'yyyy-MM-dd')
  const dayTasks       = tasks.filter(t => t.due_date === dateStr)
  const dayGEvents     = googleEvents.filter(e => e.start?.startsWith(dateStr))

  return (
    <div
      onClick={() => onDayClick(dateStr)}
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
          {Array.from({ length: Math.min(habitTotal, 6) }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full"
              style={{ background: i < habitCount ? 'var(--green)' : 'var(--border-mid)' }} />
          ))}
        </div>
      )}

      {dayTasks.slice(0, 1).map(task => (
        <div key={task.id}
          onClick={e => e.stopPropagation()}
          className="text-xs px-1.5 py-0.5 rounded mb-0.5 truncate"
          style={{
            background: task.priority === 'high'
              ? 'color-mix(in srgb, var(--red) 15%, transparent)'
              : 'color-mix(in srgb, var(--amber) 15%, transparent)',
            color: task.priority === 'high' ? 'var(--red)' : 'var(--amber)',
            fontSize: '10px',
          }}>
          {task.title}
        </div>
      ))}

      {dayGEvents.slice(0, 2).map(event => (
        <div key={event.id}
          onClick={e => { e.stopPropagation(); onEventClick(event) }}
          className="text-xs px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-80 transition-opacity"
          style={{ background: event.color || '#4285F4', color: '#fff', fontSize: '10px' }}>
          📅 {event.title}
        </div>
      ))}

      {(dayTasks.length + dayGEvents.length) > 3 && (
        <div className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
          +{dayTasks.length + dayGEvents.length - 3} more
        </div>
      )}
    </div>
  )
}

// ── Main Calendar page ───────────────────────────────────────
export default function Calendar() {
  const { user }                          = useAppStore()
  const userId                            = user?.id
  const [currentMonth, setCurrentMonth]   = useState(new Date())
  const [googleEvents, setGoogleEvents]   = useState([])
  const [connected, setConnected]         = useState(false)
  const [loading, setLoading]             = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showAdd, setShowAdd]             = useState(false)
  const [addDate, setAddDate]             = useState(TODAY())
  const [syncing, setSyncing]             = useState(false)

  useEffect(() => { setConnected(isCalendarConnected()) }, [])

  const fetchEvents = useCallback(async () => {
    if (!isCalendarConnected()) return
    setSyncing(true)
    try {
      const start  = startOfMonth(currentMonth)
      const end    = endOfMonth(currentMonth)
      const events = await fetchCalendarEvents(start, end)
      setGoogleEvents(events)
      const todayEvents = events.filter(e => e.start?.startsWith(format(new Date(), 'yyyy-MM-dd')))
      scheduleEventNotifications(todayEvents)
    } catch (err) {
      console.error('Google Calendar fetch error:', err)
    }
    setSyncing(false)
  }, [currentMonth, connected])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const handleConnect = async () => {
    setLoading(true)
    try {
      await requestNotificationPermission()
      await connectGoogleCalendar()
      setConnected(true)
      await fetchEvents()
    } catch (err) {
      console.error('Connect error:', err)
      alert('Could not connect Google Calendar. Make sure pop-ups are allowed.')
    }
    setLoading(false)
  }

  const handleDisconnect = () => {
    disconnectCalendar()
    setConnected(false)
    setGoogleEvents([])
  }

  const handleDayClick = (dateStr) => {
    setAddDate(dateStr)
    setShowAdd(true)
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad   = getDay(monthStart)

  const tasks = useLiveQuery(
    () => userId ? db.tasks.where('user_id').equals(userId).toArray() : Promise.resolve([]),
    [userId]
  ) ?? []

  const habitLogs = useLiveQuery(
    () => userId ? db.habit_logs.where('user_id').equals(userId).filter(l => l.completed).toArray() : Promise.resolve([]),
    [userId]
  ) ?? []

  const habitCount = useLiveQuery(
    () => userId ? db.habits.where('user_id').equals(userId).filter(h => !h.archived).count() : Promise.resolve(0),
    [userId]
  ) ?? 0

  const logsByDate = {}
  habitLogs.forEach(l => { logsByDate[l.log_date] = (logsByDate[l.log_date] || 0) + 1 })

  const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

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
            <button onClick={fetchEvents} disabled={syncing}
              className="btn btn-ghost p-2" title="Sync Google Calendar">
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            </button>
          )}
          <button className="btn btn-primary gap-1.5" onClick={() => { setAddDate(TODAY()); setShowAdd(true) }}>
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

      {/* Google Calendar banner */}
      <div className="mb-4">
        <GoogleCalendarBanner connected={connected} onConnect={handleConnect}
          onDisconnect={handleDisconnect} loading={loading} />
      </div>

      {/* Hint */}
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Click any day to add a task or event on that date
      </p>

      {/* Calendar grid */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
          {DAY_LABELS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium"
              style={{ color: 'var(--text-muted)' }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[80px] md:min-h-[100px] border-b border-r"
              style={{ borderColor: 'var(--border)', opacity: 0.3 }} />
          ))}
          {days.map(day => (
            <DayCell
              key={format(day, 'yyyy-MM-dd')}
              day={day}
              month={currentMonth}
              tasks={tasks}
              habitCount={logsByDate[format(day, 'yyyy-MM-dd')] || 0}
              habitTotal={habitCount}
              googleEvents={googleEvents}
              onEventClick={setSelectedEvent}
              onDayClick={handleDayClick}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 px-1">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="flex gap-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--border-mid)' }} />
          </div>
          Habits done/remaining
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="w-3 h-3 rounded" style={{ background: 'color-mix(in srgb, var(--amber) 25%, transparent)' }} />
          FlowTrail task
        </div>
        {connected && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className="w-3 h-3 rounded" style={{ background: '#4285F4' }} />
            Google Calendar event
          </div>
        )}
      </div>

      {/* Modals */}
      <AddEventModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        userId={userId}
        defaultDate={addDate}
        connected={connected}
        onRefresh={fetchEvents}
      />
      <EventModal
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        userId={userId}
      />
    </div>
  )
}