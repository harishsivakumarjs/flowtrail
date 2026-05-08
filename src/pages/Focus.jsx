import { useState, useEffect, useRef } from 'react'
import {
  Shield, ShieldOff, Plus, Trash2, Play, Square,
  AlertCircle, Clock, Copy, CheckCircle, Smartphone,
  Monitor, ExternalLink, Timer, Ban, Eye, History
} from 'lucide-react'
import { useFocusStore, isMobile } from '@/store/focusStore'

function usePlatform() {
  return useState(() => isMobile())[0]
}

// ── Pomodoro Timer ────────────────────────────────────────────
function FocusTimer() {
  const { sessionActive, sessionMinutes, sessionStart, sessionLabel, startSession, endSession } = useFocusStore()
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

  useEffect(() => {
    if (sessionActive && remaining === 0) {
      endSession(true)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('FlowTrail ✓', { body: `Session "${sessionLabel}" complete!` })
      }
    }
  }, [remaining, sessionActive])

  const PRESETS = [15, 25, 45, 60]

  return (
    <div className="card p-5 flex flex-col items-center gap-5">
      <div className="flex items-center gap-2">
        {sessionActive
          ? <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full"
              style={{ background: 'color-mix(in srgb, var(--green) 15%, transparent)', color: 'var(--green)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse-soft" />
              Session active
            </span>
          : <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Focus session</span>
        }
      </div>

      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="7" />
          <circle cx="60" cy="60" r="54" fill="none"
            stroke={remaining === 0 ? 'var(--green)' : 'var(--brand)'}
            strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
            style={{ transition: 'stroke-dashoffset 1s linear' }} />
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
          <input className="input-base text-sm"
            placeholder="What are you working on? (optional)"
            value={label} onChange={e => setLabel(e.target.value)} />
          <div className="flex gap-2">
            {PRESETS.map(m => (
              <button key={m} onClick={() => setMinutes(m)}
                className="flex-1 py-2 rounded-xl text-xs font-medium transition-all border"
                style={{
                  background: 'transparent',
                  borderColor: minutes === m ? 'var(--brand)' : 'var(--border)',
                  color: minutes === m ? 'var(--brand)' : 'var(--text-muted)',
                }}>
                {m}m
              </button>
            ))}
          </div>
          <button className="btn btn-primary w-full" onClick={() => {
            if (Notification.permission === 'default') Notification.requestPermission()
            startSession(minutes, label)
          }}>
            <Play size={15} /> Start session
          </button>
        </div>
      ) : (
        <button className="btn btn-ghost w-full" onClick={() => endSession(false)}>
          <Square size={14} /> End session early
        </button>
      )}
    </div>
  )
}

// ── Mobile Web Blocker ────────────────────────────────────────
function MobileWebBlocker() {
  const { blockedSites, addSite, removeSite, siteLimits, setSiteLimit, siteUsage, recordUsage } = useFocusStore()
  const [newSite, setNewSite]     = useState('')
  const [testUrl, setTestUrl]     = useState('')
  const [blocked, setBlocked]     = useState(null)
  const [cooldown, setCooldown]   = useState(null) // { site, seconds }
  const [showLimit, setShowLimit] = useState(null) // site being configured
  const [limitMins, setLimitMins] = useState(30)
  const [limitDelay, setLimitDelay] = useState(0) // minutes to wait before opening

  const checkAndOpen = () => {
    if (!testUrl.trim()) return
    const clean = testUrl.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
    const hit   = blockedSites.find(s => clean.includes(s) || s.includes(clean))

    if (!hit) {
      // Not blocked — open normally
      window.open(testUrl.startsWith('http') ? testUrl : `https://${testUrl}`, '_blank')
      setTestUrl('')
      return
    }

    // Check daily time limit
    const today    = new Date().toDateString()
    const usage    = siteUsage?.[hit]?.[today] || 0
    const limit    = siteLimits?.[hit]?.dailyMins
    const delay    = siteLimits?.[hit]?.delayMins || 0

    if (limit && usage >= limit) {
      setBlocked({ site: hit, reason: 'limit', usage, limit })
      return
    }

    if (delay > 0) {
      let secs = delay * 60
      setCooldown({ site: hit, seconds: secs, url: testUrl })
      const t = setInterval(() => {
        secs--
        setCooldown(p => p ? { ...p, seconds: secs } : null)
        if (secs <= 0) {
          clearInterval(t)
          setCooldown(null)
          recordUsage(hit)
          window.open(testUrl.startsWith('http') ? testUrl : `https://${testUrl}`, '_blank')
          setTestUrl('')
        }
      }, 1000)
      return
    }

    setBlocked({ site: hit, reason: 'blocked' })
  }

  const today = new Date().toDateString()

  return (
    <div className="space-y-4">
      {/* Cooldown screen */}
      {cooldown && (
        <div className="card p-6 text-center space-y-3"
          style={{ border: '2px solid color-mix(in srgb, var(--amber) 40%, transparent)' }}>
          <Ban size={32} style={{ color: 'var(--amber)', margin: '0 auto' }} />
          <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Opening {cooldown.site} in…
          </div>
          <div className="text-4xl font-mono font-bold" style={{ color: 'var(--amber)' }}>
            {Math.floor(cooldown.seconds / 60)}:{String(cooldown.seconds % 60).padStart(2,'0')}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Use this time to ask yourself — do you really need this?
          </p>
          <button onClick={() => setCooldown(null)} className="btn btn-ghost w-full">
            Cancel — I don't need it
          </button>
        </div>
      )}

      {/* Blocked screen */}
      {blocked && (
        <div className="card p-5 text-center space-y-3"
          style={{ border: '2px solid color-mix(in srgb, var(--red) 40%, transparent)' }}>
          <Ban size={28} style={{ color: 'var(--red)', margin: '0 auto' }} />
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {blocked.reason === 'limit'
              ? `Daily limit reached for ${blocked.site}`
              : `${blocked.site} is blocked`}
          </div>
          {blocked.reason === 'limit' && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              You've used {blocked.usage} of {blocked.limit} minutes today
            </p>
          )}
          <button onClick={() => setBlocked(null)} className="btn btn-ghost w-full">Dismiss</button>
        </div>
      )}

      {/* Link checker */}
      {!cooldown && !blocked && (
        <div className="card p-4 space-y-3">
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Open a link through FlowTrail
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Paste any URL — blocked sites get intercepted with your rules applied
          </p>
          <div className="flex gap-2">
            <input className="input-base text-sm flex-1"
              placeholder="instagram.com or paste full URL"
              value={testUrl} onChange={e => setTestUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkAndOpen()} />
            <button className="btn btn-primary px-4" onClick={checkAndOpen}>
              <ExternalLink size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Site limit config modal */}
      {showLimit && (
        <div className="card p-4 space-y-3"
          style={{ border: '1px solid var(--brand)' }}>
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Rules for {showLimit}
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              Daily time limit (minutes, 0 = no limit)
            </label>
            <input type="number" min="0" max="480" className="input-base"
              value={limitMins} onChange={e => setLimitMins(+e.target.value)} />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              Delay before opening (minutes, 0 = no delay)
            </label>
            <input type="number" min="0" max="60" className="input-base"
              value={limitDelay} onChange={e => setLimitDelay(+e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost flex-1" onClick={() => setShowLimit(null)}>Cancel</button>
            <button className="btn btn-primary flex-1" onClick={() => {
              setSiteLimit(showLimit, { dailyMins: limitMins || 0, delayMins: limitDelay || 0 })
              setShowLimit(null)
            }}>Save rules</button>
          </div>
        </div>
      )}

      {/* Blocked sites list */}
      <div className="card p-4 space-y-3">
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Blocked sites & rules ({blockedSites.length})
        </div>
        <div className="space-y-2">
          {blockedSites.map(site => {
            const limit = siteLimits?.[site]
            const usage = siteUsage?.[site]?.[today] || 0
            return (
              <div key={site} className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 px-3 py-2.5"
                  style={{ background: 'var(--bg-overlay)' }}>
                  <Ban size={13} style={{ color: 'var(--red)', flexShrink: 0 }} />
                  <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{site}</span>
                  <button onClick={() => {
                    setShowLimit(site)
                    setLimitMins(limit?.dailyMins || 30)
                    setLimitDelay(limit?.delayMins || 0)
                  }}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-muted)]"
                    style={{ color: 'var(--brand)' }} title="Set rules">
                    <Timer size={13} />
                  </button>
                  <button onClick={() => removeSite(site)}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-muted)]"
                    style={{ color: 'var(--text-muted)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                {(limit?.dailyMins > 0 || limit?.delayMins > 0) && (
                  <div className="px-3 py-1.5 flex items-center gap-3 text-xs"
                    style={{ background: 'color-mix(in srgb, var(--brand) 5%, transparent)', color: 'var(--text-muted)' }}>
                    {limit?.dailyMins > 0 && (
                      <span>⏱ {usage}/{limit.dailyMins} min today</span>
                    )}
                    {limit?.delayMins > 0 && (
                      <span>⏳ {limit.delayMins} min delay</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-2">
          <input className="input-base text-sm flex-1"
            placeholder="Add site (e.g. tiktok.com)"
            value={newSite} onChange={e => setNewSite(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newSite.trim()) { addSite(newSite); setNewSite('') } }} />
          <button className="btn btn-ghost px-3"
            onClick={() => { if (newSite.trim()) { addSite(newSite); setNewSite('') } }}>
            <Plus size={15} />
          </button>
        </div>

        {/* Digital Wellbeing guide */}
        <div className="rounded-xl p-3 text-xs space-y-1"
          style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)' }}>
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            For system-wide blocking on Android:
          </div>
          <div>Settings → Digital Wellbeing → Focus mode → add apps → set PIN to lock it</div>
        </div>
      </div>
    </div>
  )
}

// ── Intent Gate ───────────────────────────────────────────────
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
          <div className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>Intent gate</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Before visiting a distracting site, write why you need it — forces conscious choice.
          </div>
        </div>
        {done ? (
          <div className="flex items-center gap-2 py-3 text-sm justify-center" style={{ color: 'var(--green)' }}>
            <CheckCircle size={16} /> Logged — do you still need to go there?
          </div>
        ) : (
          <div className="space-y-2">
            <input className="input-base text-sm" placeholder="Which site? (e.g. youtube.com)"
              value={site} onChange={e => setSite(e.target.value)} />
            <input className="input-base text-sm" placeholder="Why do you need this right now?"
              value={reason} onChange={e => setReason(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()} />
            <button className="btn btn-ghost w-full text-sm" onClick={submit}>Log visit intent</button>
          </div>
        )}
      </div>

      {intentLog.length > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Intent log ({intentLog.length})
            </span>
            <button className="text-xs" style={{ color: 'var(--text-muted)' }} onClick={clearIntentLog}>Clear</button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {intentLog.map((entry, i) => (
              <div key={i} className="rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-overlay)' }}>
                <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--brand)' }}>{entry.site}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{entry.reason}</div>
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

// ── Friction Ladder ───────────────────────────────────────────
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
          <div className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>Friction ladder</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Each attempt adds a longer wait: 5s → 15s → 30s → 60s.
          </div>
        </div>
        {waiting ? (
          <div className="rounded-xl p-5 text-center"
            style={{ background: 'color-mix(in srgb, var(--amber) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--amber) 25%, transparent)' }}>
            <div className="text-4xl font-bold font-mono mb-2" style={{ color: 'var(--amber)' }}>
              {waiting.secondsLeft}s
            </div>
            <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
              Cooling down for <strong>{waiting.site}</strong>
            </div>
            <div className="h-1.5 rounded-full mt-3" style={{ background: 'var(--border)' }}>
              <div className="h-1.5 rounded-full transition-all"
                style={{ background: 'var(--amber)', width: `${(waiting.secondsLeft / waiting.total) * 100}%`, transition: 'width 1s linear' }} />
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <input className="input-base text-sm flex-1"
              placeholder="Site you want to visit..."
              value={site} onChange={e => setSite(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && site.trim() && attempt(site)} />
            <button className="btn btn-ghost px-3" onClick={() => site.trim() && attempt(site)}>
              <Clock size={15} />
            </button>
          </div>
        )}
      </div>

      {Object.keys(attempts).length > 0 && (
        <div className="card p-4 space-y-2">
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Attempt history</div>
          {Object.entries(attempts).map(([s, count]) => (
            <div key={s} className="flex items-center justify-between text-xs px-3 py-2 rounded-xl"
              style={{ background: 'var(--bg-overlay)' }}>
              <span style={{ color: 'var(--text-primary)' }}>{s}</span>
              <span style={{ color: count >= 3 ? 'var(--red)' : 'var(--amber)', fontWeight: 500 }}>
                {count}× · next: {DELAYS[Math.min(count, DELAYS.length - 1)]}s
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Session History ───────────────────────────────────────────
function SessionHistory() {
  const { sessionHistory } = useFocusStore()
  if (!sessionHistory.length) return (
    <div className="card p-8 text-center">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No sessions yet</p>
    </div>
  )
  const totalMins = sessionHistory.reduce((s, h) => s + h.minutes, 0)
  const completed = sessionHistory.filter(h => h.completedFully).length
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
                background: s.completedFully ? 'color-mix(in srgb, var(--green) 12%, transparent)' : 'color-mix(in srgb, var(--amber) 12%, transparent)',
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

// ── Main Focus Page ───────────────────────────────────────────
export default function Focus() {
  const mobile            = usePlatform()
  const { sessionActive } = useFocusStore()
  const [tab, setTab]     = useState('session')

  const TABS = [
    { key: 'session',  label: 'Timer' },
    { key: 'blocker',  label: 'Blocker' },
    { key: 'intent',   label: 'Intent' },
    { key: 'friction', label: 'Friction' },
    { key: 'history',  label: 'History' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
            {sessionActive
              ? <><Shield size={20} style={{ color: 'var(--green)' }} /> Focus active</>
              : <><ShieldOff size={20} style={{ color: 'var(--text-muted)' }} /> Focus mode</>
            }
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {mobile ? 'Blocker works for links opened inside this app' : 'Timer · intent gate · friction ladder'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full"
          style={{ background: 'var(--bg-overlay)', color: 'var(--text-muted)' }}>
          {mobile ? <Smartphone size={12} /> : <Monitor size={12} />}
          {mobile ? 'Mobile' : 'Laptop'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto" style={{ background: 'var(--bg-overlay)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 min-w-fit text-xs py-2 px-2 rounded-xl font-medium transition-all whitespace-nowrap"
            style={{
              background: tab === t.key ? 'var(--bg-raised)' : 'transparent',
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {tab === 'session'  && <FocusTimer />}
        {tab === 'blocker'  && <MobileWebBlocker />}
        {tab === 'intent'   && <IntentGate />}
        {tab === 'friction' && <FrictionLadder />}
        {tab === 'history'  && <SessionHistory />}
      </div>
    </div>
  )
}