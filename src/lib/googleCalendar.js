/**
 * Google Calendar integration for FlowTrail
 * Uses Google Identity Services (GIS) for OAuth token
 */

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ')

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Store token in memory + localStorage
let accessToken = localStorage.getItem('gcal_token') || null
let tokenExpiry  = parseInt(localStorage.getItem('gcal_expiry') || '0')

export function isCalendarConnected() {
  return !!accessToken && Date.now() < tokenExpiry
}

export function getStoredToken() {
  accessToken = localStorage.getItem('gcal_token')
  tokenExpiry = parseInt(localStorage.getItem('gcal_expiry') || '0')
  return isCalendarConnected() ? accessToken : null
}

export function disconnectCalendar() {
  accessToken = null
  tokenExpiry = 0
  localStorage.removeItem('gcal_token')
  localStorage.removeItem('gcal_expiry')
}

/** Opens Google OAuth popup to get calendar access token */
export function connectGoogleCalendar() {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) {
      reject(new Error('VITE_GOOGLE_CLIENT_ID not set in .env'))
      return
    }

    // Load Google Identity Services script
    const existing = document.getElementById('gis-script')
    const init = () => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope:     SCOPES,
        callback:  (response) => {
          if (response.error) { reject(new Error(response.error)); return }
          accessToken = response.access_token
          tokenExpiry  = Date.now() + (response.expires_in * 1000)
          localStorage.setItem('gcal_token',  accessToken)
          localStorage.setItem('gcal_expiry', tokenExpiry.toString())
          resolve(accessToken)
        },
      })
      client.requestAccessToken()
    }

    if (existing || window.google?.accounts) {
      init()
    } else {
      const script = document.createElement('script')
      script.id  = 'gis-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload = init
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    }
  })
}

/** Fetch Google Calendar events for a date range */
export async function fetchCalendarEvents(startDate, endDate) {
  const token = getStoredToken()
  if (!token) return []

  const params = new URLSearchParams({
    timeMin:      new Date(startDate).toISOString(),
    timeMax:      new Date(endDate).toISOString(),
    singleEvents: 'true',
    orderBy:      'startTime',
    maxResults:   '50',
  })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (res.status === 401) { disconnectCalendar(); return [] }
  if (!res.ok) return []

  const data = await res.json()
  return (data.items || []).map(e => ({
    id:       e.id,
    title:    e.summary || '(No title)',
    start:    e.start?.dateTime || e.start?.date,
    end:      e.end?.dateTime   || e.end?.date,
    allDay:   !e.start?.dateTime,
    color:    e.colorId ? GOOGLE_COLORS[e.colorId] : '#4285F4',
    location: e.location || '',
    desc:     e.description || '',
    source:   'google',
  }))
}

/** Create a Google Calendar event from a FlowTrail task or directly */
export async function createCalendarEvent({ title, dueDate, notes, priority, startDateTime }) {
  const token = getStoredToken()
  if (!token) return null

  const date = dueDate || new Date().toISOString().split('T')[0]

  // If startDateTime provided, create timed event; otherwise all-day
  const start = startDateTime
    ? { dateTime: startDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
    : { date }
  const end = startDateTime
    ? { dateTime: new Date(new Date(startDateTime).getTime() + 3600000).toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
    : { date }

  const event = {
    summary:     title,
    description: notes ? `${notes}\n\n[FlowTrail ${priority || 'medium'} priority]` : `[FlowTrail ${priority || 'medium'} priority]`,
    start,
    end,
    colorId: priority === 'high' ? '11' : priority === 'medium' ? '5' : '2',
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(event),
    }
  )

  if (!res.ok) return null
  return res.json()
}

/** Delete a Google Calendar event */
export async function deleteCalendarEvent(eventId) {
  const token = getStoredToken()
  if (!token || !eventId) return false
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  )
  return res.ok || res.status === 204
}

/** Update a Google Calendar event */
export async function updateCalendarEvent(eventId, { title, date, time, notes }) {
  const token = getStoredToken()
  if (!token || !eventId) return null
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const startDateTime = time ? `${date}T${time}:00` : null
  const body = {
    summary:     title,
    description: notes || '',
    start: startDateTime ? { dateTime: startDateTime, timeZone: tz } : { date },
    end:   startDateTime
      ? { dateTime: new Date(new Date(startDateTime).getTime() + 3600000).toISOString(), timeZone: tz }
      : { date },
  }
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }
  )
  return res.ok ? res.json() : null
}

/** Schedule browser notifications for upcoming events */
export function scheduleEventNotifications(events) {
  if (Notification.permission !== 'granted') return
  events.forEach(event => {
    const start = new Date(event.start)
    const now   = new Date()
    const notifyAt = (start - now) - 30 * 60 * 1000
    if (notifyAt > 0 && notifyAt < 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        new Notification(`📅 Starting in 30 min: ${event.title}`, {
          body: event.location ? `📍 ${event.location}` : 'Tap to open FlowTrail',
          icon: '/favicon.svg',
          tag:  `gcal-${event.id}`,
        })
      }, notifyAt)
    }
  })
}

const GOOGLE_COLORS = {
  '1':'#7986CB','2':'#33B679','3':'#8E24AA','4':'#E67C73',
  '5':'#F6BF26','6':'#F4511E','7':'#039BE5','8':'#616161',
  '9':'#3F51B5','10':'#0B8043','11':'#D50000',
}