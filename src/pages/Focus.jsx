import { useState, useEffect, useRef } from 'react'
import {
  Shield, ShieldOff, Plus, Trash2, Play, Square,
  AlertCircle, Clock, Copy, CheckCircle, Smartphone,
  Monitor, ExternalLink, Info
} from 'lucide-react'
import { useFocusStore, isMobile } from '@/store/focusStore'

// ─────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────
function usePlatform() {
  const [mobile] = useState(() => isMobile())
  return mobile
}

// ─────────────────────────────────────────────────────────────
// Pomodoro Timer — shared, but start activates mobile blocker
// ─────────────────────────────────────────────────────────────
function FocusTimer({ onSessionStart, onSessionEnd }) {
  const {
    sessionActive, sessionMinutes, sessionStart, sessionLabel,
    startSession, endSession, mobileBlockerActive,
  } = useFocusStore()

  const mobile       = usePlatform()
  const [elapsed, setElapsed] = useState(0)
  const [minutes, setMinutes] = useState(25)
  const [label, setLabel]     = useState('')
  const intervalRef           = useRef(null)

  useEffect(() => {
    if (!sessionActive) { setElapsed(0); return }
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStart) / 1000))
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [sessionActive, sessionStart])

  const totalSecs  = sessionMinutes * 60
  const remaining  = Math.max(0, totalSecs - elapsed)
  const pct        = Math.min(100, (elapsed / totalSecs) * 100)
  const mins       = String(Math.floor(remaining / 60)).padStart(2, '0')
  const secs       = String(remaining % 60).padStart(2, '0')
  const circ       = 2 * Math.PI * 54

  // Auto-complete
  useEffect(() => {
    if (sessionActive && remaining === 0) {
      endSession(true)
      onSessionEnd?.()
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('FlowTrail ✓', {
          body: `Session complete! "${sessionLabel}" done. Great work.`,
        })
      }
    }
  }, [remaining, sessionActive])

  const PRESETS = [15, 25, 45, 60]

  const handleStart = () => {
    if (Notification.permission === 'default') Notification.requestPermission()
    startSession(minutes, label)
    onSessionStart?.()
  }

  const handleEnd = () => {
    endSession(false)
    onSessionEnd?.()
  }

  return (
    <div className="card p-5 flex flex-col items-center gap-5">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        {sessionActive
          ? <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full"
              style={{ background: 'color-mix(in srgb, var(--green) 15%, transparent)', color: 'var(--green)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse-soft" />
              Session active {mobile && mobileBlockerActive ? '· Blocker ON' : ''}
            </span>
          : <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Focus session
            </span>
        }
      </div>

      {/* Ring timer */}
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="7" />
          <circle cx="60" cy="60" r="54" fill="none"
            stroke={remaining === 0 ? 'var(--green)' : 'var(--brand)'}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-3xl font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
            {mins}:{secs}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {sessionActive ? sessionLabel : 'ready'}
          </span>
        </div>
      </div>

      {!sessionActive ? (
        <div className="w-full space-y-3">
          <input
            className="input-base text-sm"
            placeholder="What are you working on? (optional)"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
          <div className="flex gap-2">
            {PRESETS.map(m => (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                className="flex-1 py-2 rounded-xl text-xs font-medium transition-all border"
                style={{
                  background: 'transparent',
                  borderColor: minutes === m ? 'var(--brand)' : 'var(--border)',
                  color: minutes === m ? 'var(--brand)' : 'var(--text-muted)',
                }}
              >
                {m}m
              </button>
            ))}
          </div>

          {/* Mobile blocker notice */}
          {mobile && (
            <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 text-xs"
              style={{ background: 'color-mix(in srgb, var(--brand) 8%, transparent)', color: 'var(--text-secondary)' }}>
              <Smartphone size={13} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 1 }} />
              Starting a session will automatically activate the soft web blocker on this device.
            </div>
          )}

          <button className="btn btn-primary w-full" onClick={handleStart}>
            <Play size={15} /> Start session
          </button>
        </div>
      ) : (
        <div className="w-full">
          <button className="btn btn-ghost w-full" onClick={handleEnd}>
            <Square size={14} /> End session early
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Mobile Soft Blocker — shown only on mobile
// ─────────────────────────────────────────────────────────────
function MobileSoftBlocker() {
  const {
    blockedSites, addSite, removeSite,
    mobileBlockerActive, setMobileBlocker,
    sessionActive,
  } = useFocusStore()

  const [newSite, setNewSite]       = useState('')
  const [testSite, setTestSite]     = useState('')
  const [blockedAttempt, setBlockedAttempt] = useState(null)

  // Simulate soft block: check if a site the user types is on the list
  const checkSite = () => {
    if (!testSite.trim()) return
    const clean = testSite.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
    const hit   = blockedSites.find(s => clean.includes(s) || s.includes(clean))
    if (hit) {
      setBlockedAttempt(hit)
      setTimeout(() => setBlockedAttempt(null), 4000)
    } else {
      setBlockedAttempt(false)
      setTimeout(() => setBlockedAttempt(null), 2000)
    }
    setTestSite('')
  }

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div
        className="card p-4 flex items-center justify-between gap-3"
        style={{
          borderColor: mobileBlockerActive ? 'color-mix(in srgb, var(--green) 40%, transparent)' : 'var(--border)',
          background: mobileBlockerActive ? 'color-mix(in srgb, var(--green) 6%, transparent)' : undefined,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: mobileBlockerActive
                ? 'color-mix(in srgb, var(--green) 15%, transparent)'
                : 'var(--bg-overlay)',
            }}>
            {mobileBlockerActive
              ? <Shield size={18} style={{ color: 'var(--green)' }} />
              : <ShieldOff size={18} style={{ color: 'var(--text-muted)' }} />
            }
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {mobileBlockerActive ? 'Soft blocker active' : 'Soft blocker off'}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {mobileBlockerActive
                ? `Blocking ${blockedSites.length} sites in this app`
                : 'Activates automatically when session starts'}
            </div>
          </div>
        </div>
        <button
          className={`btn text-sm ${mobileBlockerActive ? 'btn-ghost' : 'btn-primary'}`}
          onClick={() => setMobileBlocker(!mobileBlockerActive)}
          disabled={sessionActive}
        >
          {mobileBlockerActive ? 'Turn off' : 'Turn on'}
        </button>
      </div>

      {/* Block intercept preview */}
      {blockedAttempt === null ? null : blockedAttempt ? (
        <div className="rounded-xl p-4 text-center"
          style={{ background: 'color-mix(in srgb, var(--red) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--red) 20%, transparent)' }}>
          <Shield size={28} style={{ color: 'var(--red)', margin: '0 auto 8px' }} />
          <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            {blockedAttempt} is blocked
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            This is what users see when they try to visit a blocked site during a session. The site is not opened.
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-3 text-center text-xs"
          style={{ background: 'color-mix(in srgb, var(--green) 10%, transparent)', color: 'var(--green)' }}>
          ✓ That site is not blocked
        </div>
      )}

      {/* Test the blocker */}
      <div className="card p-4 space-y-2">
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Test the blocker
        </div>
        <div className="flex gap-2">
          <input
            className="input-base text-sm flex-1"
            placeholder="Type a site to check (e.g. reddit.com)"
            value={testSite}
            onChange={e => setTestSite(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkSite()}
          />
          <button className="btn btn-ghost px-3" onClick={checkSite}>
            <Shield size={15} />
          </button>
        </div>
      </div>

      {/* Blocked sites list */}
      <div className="card p-4 space-y-3">
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Blocked sites ({blockedSites.length})
        </div>
        <div className="space-y-1.5">
          {blockedSites.map(site => (
            <div key={site}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--bg-overlay)' }}>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{site}</span>
              <button
                onClick={() => removeSite(site)}
                className="p-1 rounded-lg hover:bg-[var(--bg-muted)]"
                style={{ color: 'var(--text-muted)' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input-base text-sm flex-1"
            placeholder="Add site (e.g. twitch.tv)"
            value={newSite}
            onChange={e => setNewSite(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newSite.trim()) { addSite(newSite); setNewSite('') }
            }}
          />
          <button
            className="btn btn-ghost px-3"
            onClick={() => { if (newSite.trim()) { addSite(newSite); setNewSite('') } }}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* Hard block guide */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone size={15} style={{ color: 'var(--brand)' }} />
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Hard block via Digital Wellbeing
          </div>
        </div>
        <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The soft blocker works inside this app. For a hard block that stops Chrome itself, set up Android's built-in Digital Wellbeing:
        </div>
        <div className="space-y-2">
          {[
            'Open Settings → Digital Wellbeing & Parental Controls',
            'Tap "Dashboard" → find Chrome → tap the hourglass icon',
            'Set a daily time limit (e.g. 15 min) for focused periods',
            'Enable "Bedtime mode" or "Focus mode" for scheduled blocks',
            'For app-specific blocks: tap Focus mode → add Chrome, Instagram, etc.',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold mt-0.5"
                style={{ background: 'color-mix(in srgb, var(--brand) 15%, transparent)', color: 'var(--brand)' }}>
                {i + 1}
              </div>
              <p className="text-xs flex-1" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl px-3 py-2.5 text-xs"
          style={{ background: 'color-mix(in srgb, var(--amber) 10%, transparent)', color: 'var(--text-secondary)' }}>
          💡 Tip: Enable a PIN in Digital Wellbeing so you can't easily override it during a session.
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Laptop panel — no web blocker, just distraction tools note
// ─────────────────────────────────────────────────────────────
function LaptopBlockerNote() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Monitor size={16} style={{ color: 'var(--text-muted)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Web blocker — laptop
        </span>
      </div>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        The web blocker is disabled on laptop by design — you have full control of your browser there.
        Use the <strong>Intent gate</strong> and <strong>Friction ladder</strong> tabs as your laptop distraction tools instead.
      </div>
      <div className="rounded-xl p-4 text-xs leading-relaxed"
        style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
        If you change your mind and want system-level blocking on Ubuntu, the <code style={{ fontFamily: 'monospace', fontSize: '11px' }}>scripts/blocker.sh</code> file is still in the project — just run:<br />
        <code style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-primary)' }}>
          sudo ~/flowtrail/scripts/blocker.sh block "instagram.com youtube.com"
        </code>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Intent Gate
// ─────────────────────────────────────────────────────────────
function IntentGate() {
  const { addIntent, intentLog, clearIntentLog } = useFocusStore()
  const [site, setSite]     = useState('')
  const [reason, setReason] = useState('')
  const [done, setDone]     = useState(false)

  const submit = () => {
    if (!site.trim() || !reason.trim()) return
    addIntent(site.trim(), reason.trim())
    setSite(''); setReason('')
    setDone(true)
    setTimeout(() => setDone(false), 2500)
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div>
          <div className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
            Intent gate
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Before visiting a distracting site, write why you need it. Most impulses don't survive the question.
          </div>
        </div>

        {done ? (
          <div className="flex items-center gap-2 py-3 text-sm justify-center"
            style={{ color: 'var(--green)' }}>
            <CheckCircle size={16} />
            Logged — do you still need to go there?
          </div>
        ) : (
          <div className="space-y-2">
            <input className="input-base text-sm" placeholder="Which site? (e.g. youtube.com)"
              value={site} onChange={e => setSite(e.target.value)} />
            <input className="input-base text-sm" placeholder="Why do you need this right now?"
              value={reason} onChange={e => setReason(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()} />
            <button className="btn btn-ghost w-full text-sm" onClick={submit}>
              Log visit intent
            </button>
          </div>
        )}
      </div>

      {intentLog.length > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Intent log ({intentLog.length})
            </span>
            <button className="text-xs" style={{ color: 'var(--text-muted)' }} onClick={clearIntentLog}>
              Clear
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {intentLog.map((entry, i) => (
              <div key={i} className="rounded-xl px-3 py-2.5"
                style={{ background: 'var(--bg-overlay)' }}>
                <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--brand)' }}>
                  {entry.site}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {entry.reason}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Friction Ladder
// ─────────────────────────────────────────────────────────────
function FrictionLadder() {
  const [attempts, setAttempts] = useState({})
  const [waiting, setWaiting]   = useState(null)
  const [site, setSite]         = useState('')
  const DELAYS = [5, 15, 30, 60]

  const attempt = (s) => {
    const key   = s.toLowerCase().replace(/^www\./, '').trim()
    const count = attempts[key] || 0
    const delay = DELAYS[Math.min(count, DELAYS.length - 1)]
    setAttempts(p => ({ ...p, [key]: count + 1 }))
    setWaiting({ site: key, secondsLeft: delay, total: delay })
    const timer = setInterval(() => {
      setWaiting(p => {
        if (!p || p.secondsLeft <= 1) { clearInterval(timer); return null }
        return { ...p, secondsLeft: p.secondsLeft - 1 }
      })
    }, 1000)
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div>
          <div className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
            Friction ladder
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Each attempt adds a longer forced wait: 5s → 15s → 30s → 60s. Most impulses die in the delay.
          </div>
        </div>

        {waiting ? (
          <div className="rounded-xl p-5 text-center"
            style={{ background: 'color-mix(in srgb, var(--amber) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--amber) 25%, transparent)' }}>
            <div className="text-4xl font-bold font-mono mb-2"
              style={{ color: 'var(--amber)' }}>
              {waiting.secondsLeft}s
            </div>
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Cooling down before visiting <strong>{waiting.site}</strong>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Ask yourself — is this worth your focus session?
            </div>
            <div className="h-1.5 rounded-full mt-3" style={{ background: 'var(--border)' }}>
              <div className="h-1.5 rounded-full transition-all"
                style={{
                  background: 'var(--amber)',
                  width: `${(waiting.secondsLeft / waiting.total) * 100}%`,
                  transition: 'width 1s linear',
                }} />
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="input-base text-sm flex-1"
              placeholder="Site you want to visit..."
              value={site}
              onChange={e => setSite(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && site.trim() && attempt(site)}
            />
            <button className="btn btn-ghost px-3"
              onClick={() => site.trim() && attempt(site)}>
              <Clock size={15} />
            </button>
          </div>
        )}
      </div>

      {Object.keys(attempts).length > 0 && (
        <div className="card p-4 space-y-2">
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Attempt history
          </div>
          {Object.entries(attempts).map(([s, count]) => (
            <div key={s} className="flex items-center justify-between text-xs px-3 py-2 rounded-xl"
              style={{ background: 'var(--bg-overlay)' }}>
              <span style={{ color: 'var(--text-primary)' }}>{s}</span>
              <span style={{ color: count >= 3 ? 'var(--red)' : 'var(--amber)', fontWeight: 500 }}>
                {count}× · next: {DELAYS[Math.min(count, DELAYS.length - 1)]}s wait
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Session History
// ─────────────────────────────────────────────────────────────
function SessionHistory() {
  const { sessionHistory } = useFocusStore()

  if (!sessionHistory.length) return (
    <div className="card p-8 text-center">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No sessions yet — start your first one</p>
    </div>
  )

  const totalMins  = sessionHistory.reduce((s, h) => s + h.minutes, 0)
  const completed  = sessionHistory.filter(h => h.completedFully).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{totalMins}m</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>total focused</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{completed}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>fully completed</div>
        </div>
      </div>
      <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
        {sessionHistory.slice(0, 15).map((s, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{s.label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {new Date(s.date).toLocaleDateString()} · {s.minutes}min
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg font-medium"
              style={{
                background: s.completedFully
                  ? 'color-mix(in srgb, var(--green) 12%, transparent)'
                  : 'color-mix(in srgb, var(--amber) 12%, transparent)',
                color: s.completedFully ? 'var(--green)' : 'var(--amber)',
              }}>
              {s.completedFully ? 'Complete' : 'Partial'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Focus Page
// ─────────────────────────────────────────────────────────────
export default function Focus() {
  const mobile                    = usePlatform()
  const { sessionActive }         = useFocusStore()
  const [tab, setTab]             = useState('session')

  const TABS = [
    { key: 'session',  label: 'Timer' },
    { key: 'blocker',  label: mobile ? 'Web blocker' : 'Blocker' },
    { key: 'intent',   label: 'Intent gate' },
    { key: 'friction', label: 'Friction' },
    { key: 'history',  label: 'History' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2.5"
            style={{ color: 'var(--text-primary)' }}>
            {sessionActive
              ? <><Shield size={20} style={{ color: 'var(--green)' }} /> Focus mode active</>
              : <><ShieldOff size={20} style={{ color: 'var(--text-muted)' }} /> Focus mode</>
            }
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {mobile
              ? 'Timer · soft web blocker · intent gate · friction ladder'
              : 'Timer · intent gate · friction ladder (web blocker on mobile only)'
            }
          </p>
        </div>
        {/* Platform indicator */}
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full"
          style={{ background: 'var(--bg-overlay)', color: 'var(--text-muted)' }}>
          {mobile ? <Smartphone size={12} /> : <Monitor size={12} />}
          {mobile ? 'Mobile' : 'Laptop'}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto"
        style={{ background: 'var(--bg-overlay)' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 min-w-fit text-xs py-2 px-2 rounded-xl font-medium transition-all whitespace-nowrap"
            style={{
              background: tab === t.key ? 'var(--bg-raised)' : 'transparent',
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {tab === 'session'  && <FocusTimer />}
        {tab === 'blocker'  && (mobile ? <MobileSoftBlocker /> : <LaptopBlockerNote />)}
        {tab === 'intent'   && <IntentGate />}
        {tab === 'friction' && <FrictionLadder />}
        {tab === 'history'  && <SessionHistory />}
      </div>
    </div>
  )
}
