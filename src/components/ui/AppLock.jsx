import { useState, useEffect, useRef } from 'react'
import { Delete, Zap } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

export const LOCK_KEY        = 'ft-lock-pin'
export const LAST_ACTIVE_KEY = 'ft-lock-last-active'
const GRACE_MS               = 30_000   // 30 seconds

const ts      = () => String(Date.now())
const elapsed = () => Date.now() - parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10)

// ─────────────────────────────────────────────────────────────────────────────
// Shared numpad PIN screen
// - If pinKey has no stored value → creation flow (enter + confirm)
// - If pinKey has a stored value  → entry/verify flow
// ─────────────────────────────────────────────────────────────────────────────
export function PinPad({
  pinKey      = LOCK_KEY,
  heading,                  // heading shown on the verify stage
  onUnlock,                 // called when PIN is correct or newly created
  onForgot,                 // optional "Forgot?" button callback
  forgotLabel = 'Forgot PIN?',
  zIndex      = 100,
}) {
  const hasPin = !!localStorage.getItem(pinKey)

  // stage: 'enter' | 'create1' | 'create2'
  const [stage, setStage]     = useState(hasPin ? 'enter' : 'create1')
  const [digits, setDigits]   = useState('')
  const [pending, setPending] = useState('')   // first PIN during create2
  const [shake, setShake]     = useState(false)
  const [createErr, setCreateErr] = useState('')
  const [attempts, setAttempts]   = useState(0)
  const [lockedOut, setLockedOut] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef    = useRef(null)
  const onUnlockRef = useRef(onUnlock)
  useEffect(() => { onUnlockRef.current = onUnlock }, [onUnlock])

  useEffect(() => () => clearInterval(timerRef.current), [])

  const triggerShake = (cb) => {
    setShake(true)
    setTimeout(() => { setShake(false); setDigits(''); cb?.() }, 600)
  }

  const startLockout = () => {
    setLockedOut(true)
    setCountdown(30)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setLockedOut(false)
          setAttempts(0)
          setDigits('')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Auto-verify / advance when 4 digits are entered
  useEffect(() => {
    if (digits.length !== 4) return
    const t = setTimeout(() => {
      if (stage === 'enter') {
        if (btoa(digits) === localStorage.getItem(pinKey)) {
          onUnlockRef.current?.()
        } else {
          const next = attempts + 1
          triggerShake()
          setAttempts(next)
          if (next >= 5) startLockout()
        }
        return
      }
      if (stage === 'create1') {
        setPending(digits)
        setDigits('')
        setCreateErr('')
        setStage('create2')
        return
      }
      if (stage === 'create2') {
        if (digits === pending) {
          localStorage.setItem(pinKey, btoa(digits))
          onUnlockRef.current?.()
        } else {
          triggerShake(() => {
            setCreateErr("PINs don't match — start again")
            setPending('')
            setStage('create1')
          })
        }
      }
    }, 80)
    return () => clearTimeout(t)
  }, [digits, stage, pinKey, pending, attempts]) // eslint-disable-line

  // Keyboard support
  useEffect(() => {
    const h = (e) => {
      if (lockedOut) return
      if (e.key >= '0' && e.key <= '9') setDigits(p => p.length < 4 ? p + e.key : p)
      if (e.key === 'Backspace') setDigits(p => p.slice(0, -1))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [lockedOut])

  const headingText = {
    enter:   heading || 'Enter PIN',
    create1: 'Create a PIN',
    create2: 'Confirm PIN',
  }[stage]

  const subText = {
    enter:   null,
    create1: 'Choose a 4-digit PIN',
    create2: 'Re-enter your new PIN',
  }[stage]

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center select-none"
      style={{ background: 'var(--bg-base)', zIndex }}>

      {/* Shake keyframe injected once */}
      <style>{`
        @keyframes pin-shake {
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-12px)}
          30%{transform:translateX(12px)}
          45%{transform:translateX(-8px)}
          60%{transform:translateX(8px)}
          75%{transform:translateX(-4px)}
          90%{transform:translateX(4px)}
        }
        .pin-shake{animation:pin-shake .55s ease-in-out}
      `}</style>

      {/* Logo */}
      <div className="flex flex-col items-center gap-1.5 mb-10">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--brand)' }}>
          <Zap size={22} color="white" fill="white" />
        </div>
        <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
          FlowTrail
        </span>
      </div>

      {/* Heading */}
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {headingText}
      </h2>
      {subText && (
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{subText}</p>
      )}
      {createErr && (
        <p className="text-xs mb-4 font-medium" style={{ color: 'var(--red)' }}>{createErr}</p>
      )}
      {!subText && !createErr && <div className="mb-4" />}

      {/* 4 dot indicators */}
      <div className={`flex gap-5 mb-5 ${shake ? 'pin-shake' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div key={i}
            className="w-4 h-4 rounded-full border-2 transition-all duration-100"
            style={{
              borderColor: 'var(--brand)',
              background:  i < digits.length ? 'var(--brand)' : 'transparent',
              transform:   i < digits.length ? 'scale(1.12)' : 'scale(1)',
            }} />
        ))}
      </div>

      {/* Status */}
      <div className="h-6 mb-3 flex items-center justify-center">
        {lockedOut && (
          <p className="text-sm font-medium" style={{ color: 'var(--red)' }}>
            Too many attempts — wait {countdown}s
          </p>
        )}
        {!lockedOut && attempts > 0 && stage === 'enter' && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Incorrect · {5 - attempts} attempt{5 - attempts !== 1 ? 's' : ''} left
          </p>
        )}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n}
            onClick={() => { if (!lockedOut) setDigits(p => p.length < 4 ? p + String(n) : p) }}
            disabled={lockedOut}
            className="w-[72px] h-[72px] rounded-2xl text-xl font-medium transition-all active:scale-90"
            style={{
              background: 'var(--bg-overlay)',
              color:      'var(--text-primary)',
              border:     '1px solid var(--border)',
              opacity:    lockedOut ? 0.4 : 1,
            }}>
            {n}
          </button>
        ))}
        <div />
        <button
          onClick={() => { if (!lockedOut) setDigits(p => p.length < 4 ? p + '0' : p) }}
          disabled={lockedOut}
          className="w-[72px] h-[72px] rounded-2xl text-xl font-medium transition-all active:scale-90"
          style={{
            background: 'var(--bg-overlay)',
            color:      'var(--text-primary)',
            border:     '1px solid var(--border)',
            opacity:    lockedOut ? 0.4 : 1,
          }}>
          0
        </button>
        <button
          onClick={() => { if (!lockedOut) setDigits(p => p.slice(0, -1)) }}
          disabled={lockedOut || digits.length === 0}
          className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center transition-all active:scale-90"
          style={{
            background: 'var(--bg-overlay)',
            border:     '1px solid var(--border)',
            opacity:    lockedOut || digits.length === 0 ? 0.35 : 1,
          }}>
          <Delete size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      {/* Forgot */}
      {onForgot && (
        <button onClick={onForgot}
          className="mt-9 text-sm"
          style={{ color: 'var(--text-muted)' }}>
          {forgotLabel}
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AppLock — wraps the entire app, shows PinPad on tab switch / resume
// ─────────────────────────────────────────────────────────────────────────────
export default function AppLock({ children }) {
  const { user } = useAppStore()
  const [pinEnabled, setPinEnabled] = useState(() => !!localStorage.getItem(LOCK_KEY))
  const [locked, setLocked]         = useState(() => {
    if (!localStorage.getItem(LOCK_KEY)) return false
    return elapsed() > GRACE_MS
  })

  // Refresh last-active timestamp every 30 s while the tab is in focus
  useEffect(() => {
    const tick = () => localStorage.setItem(LAST_ACTIVE_KEY, ts())
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  // Lock on tab-hide → tab-show / window-blur → window-focus
  useEffect(() => {
    const onVisibility = () => {
      if (!localStorage.getItem(LOCK_KEY)) return
      if (document.hidden) {
        localStorage.setItem(LAST_ACTIVE_KEY, ts())
      } else if (elapsed() > GRACE_MS) {
        setLocked(true)
      }
    }
    const onFocus = () => {
      if (localStorage.getItem(LOCK_KEY) && elapsed() > GRACE_MS) setLocked(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  // React to PIN being enabled / disabled from Settings
  useEffect(() => {
    const h = () => {
      const enabled = !!localStorage.getItem(LOCK_KEY)
      setPinEnabled(enabled)
      if (!enabled) {
        setLocked(false)
      } else {
        // PIN was just set — start fresh grace period, don't lock immediately
        localStorage.setItem(LAST_ACTIVE_KEY, ts())
      }
    }
    window.addEventListener('applock:changed', h)
    return () => window.removeEventListener('applock:changed', h)
  }, [])

  const handleUnlock = () => {
    localStorage.setItem(LAST_ACTIVE_KEY, ts())
    setLocked(false)
  }

  const handleForgot = () => {
    if (!window.confirm('This will disable app lock. Continue?')) return
    localStorage.removeItem(LOCK_KEY)
    localStorage.removeItem(LAST_ACTIVE_KEY)
    setPinEnabled(false)
    setLocked(false)
    window.dispatchEvent(new CustomEvent('applock:changed'))
  }

  return (
    <>
      {children}
      {/* Overlay rendered on top of everything — z-index 110 beats vault (100) */}
      {pinEnabled && locked && !!user && (
        <PinPad
          pinKey={LOCK_KEY}
          heading="Enter PIN"
          onUnlock={handleUnlock}
          onForgot={handleForgot}
          forgotLabel="Forgot PIN? Disable app lock"
          zIndex={110}
        />
      )}
    </>
  )
}
