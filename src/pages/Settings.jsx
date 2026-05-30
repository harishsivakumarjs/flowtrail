import { useState, useEffect, useRef } from 'react'
import { Sun, Moon, Download, Trash2, AlertTriangle, Github, X, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'

// ── 4-box PIN input (used in Settings modals only) ───────────────────────────
function FourDigitInput({ value, onChange, autoFocus = false }) {
  const refs = useRef([null, null, null, null])

  const handleChange = (i, e) => {
    const d = e.target.value.replace(/\D/g, '').slice(-1)
    if (!d) return
    const arr = Array.from({ length: 4 }, (_, k) => value[k] || '')
    arr[i] = d
    onChange(arr.join(''))
    if (i < 3) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key !== 'Backspace') return
    e.preventDefault()
    const arr = Array.from({ length: 4 }, (_, k) => value[k] || '')
    if (arr[i]) {
      arr[i] = ''
      onChange(arr.join('').replace(/\s/g, ''))
    } else if (i > 0) {
      arr[i - 1] = ''
      onChange(arr.join('').replace(/\s/g, ''))
      refs.current[i - 1]?.focus()
    }
  }

  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3].map(i => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          autoFocus={autoFocus && i === 0}
          onClick={() => refs.current[i]?.select()}
          className="w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-colors"
          style={{
            background:   'var(--bg-overlay)',
            borderColor:  value[i] ? 'var(--brand)' : 'var(--border)',
            color:        'var(--text-primary)',
          }}
        />
      ))}
    </div>
  )
}

// ── PIN setup modal — set / change / disable ─────────────────────────────────
// mode: 'set' | 'change' | 'disable'
function PinSetupModal({ mode, onClose, onDone }) {
  // steps: 'current' → 'new' → 'confirm' (not all steps apply to all modes)
  const firstStep = mode === 'set' ? 'new' : 'current'
  const [step, setStep] = useState(firstStep)
  const [pins, setPins] = useState({ current: '', new: '', confirm: '' })
  const [error, setError] = useState('')

  const set = (key, val) => setPins(p => ({ ...p, [key]: val }))

  const proceed = () => {
    setError('')
    if (step === 'current') {
      if (pins.current.replace(/\s/g, '').length < 4) { setError('Enter your 4-digit PIN'); return }
      const stored = localStorage.getItem('ft-lock-pin')
      if (btoa(pins.current.replace(/\s/g, '')) !== stored) { setError('Incorrect PIN'); set('current', ''); return }
      if (mode === 'disable') {
        localStorage.removeItem('ft-lock-pin')
        localStorage.removeItem('ft-lock-last-active')
        window.dispatchEvent(new CustomEvent('applock:changed'))
        onDone(false)
        return
      }
      setStep('new')
    } else if (step === 'new') {
      if (pins.new.replace(/\s/g, '').length < 4) { setError('Enter a 4-digit PIN'); return }
      setStep('confirm')
    } else if (step === 'confirm') {
      if (pins.confirm !== pins.new) { setError('PINs do not match'); set('confirm', ''); return }
      localStorage.setItem('ft-lock-pin', btoa(pins.new))
      localStorage.setItem('ft-lock-last-active', String(Date.now()))
      window.dispatchEvent(new CustomEvent('applock:changed'))
      onDone(true)
    }
  }

  const titles = { set: 'Set app lock PIN', change: 'Change PIN', disable: 'Disable app lock' }

  const stepLabel = {
    current: 'Enter your current PIN',
    new:     mode === 'set' ? 'Choose a 4-digit PIN' : 'Enter your new PIN',
    confirm: 'Confirm your new PIN',
  }[step]

  const pinField = step   // 'current' | 'new' | 'confirm' — matches pins object key

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {titles[mode]}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div className="px-5 py-7 space-y-5">
          <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
            {stepLabel}
          </p>
          <FourDigitInput
            key={step}           /* re-mount → reset autoFocus on step change */
            value={pins[pinField]}
            onChange={val => set(pinField, val)}
            autoFocus
          />
          {error && (
            <p className="text-xs text-center font-medium" style={{ color: 'var(--red)' }}>
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="btn btn-ghost text-sm">Cancel</button>
          <button onClick={proceed} className="btn btn-primary text-sm">
            {step === 'current' && mode === 'disable' ? 'Disable lock' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}

const DATA_TABLES = [
  'notes', 'passwords', 'tasks',
  'habits', 'habit_logs', 'sleep_logs', 'journal_entries',
]

// ── GitHub-style confirmation modal ──────────────────────────────────────────

function ConfirmDangerModal({ variant, userEmail, value, onChange, onConfirm, onClose, working }) {
  const isClear   = variant === 'clear'
  const required  = isClear ? 'clear my data' : userEmail
  const ready     = value === required && required.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-raised)', border: '1px solid rgba(239,68,68,0.35)' }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.12)' }}>
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isClear ? 'Clear all data' : 'Delete account'}
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }} disabled={working}>
            <X size={16} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-4">
          {/* Warning box */}
          <div className="rounded-xl p-4 space-y-2"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
            <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>
              The following will be permanently deleted:
            </p>
            <ul className="text-xs space-y-1 pl-1" style={{ color: 'var(--text-secondary)' }}>
              <li>· All habits and habit logs</li>
              <li>· All tasks</li>
              <li>· All journal entries</li>
              <li>· All notes</li>
              <li>· All saved passwords</li>
              <li>· Sleep logs</li>
              {!isClear && <li>· Your account (you will be signed out immediately)</li>}
            </ul>
            <p className="text-xs font-bold pt-1" style={{ color: '#ef4444' }}>
              This action cannot be undone.
            </p>
          </div>

          {/* Confirmation input */}
          <div className="space-y-2">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isClear ? 'To confirm, type ' : 'To confirm, enter your email address '}
              <code
                className="px-1.5 py-0.5 rounded font-mono text-xs"
                style={{
                  background: 'var(--bg-overlay)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}>
                {required}
              </code>
              {' '}in the box below:
            </p>
            <input
              type={isClear ? 'text' : 'email'}
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={required}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && ready && !working && onConfirm()}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
              style={{
                background: 'var(--bg-overlay)',
                border: `1.5px solid ${
                  value.length > 0 && !ready
                    ? 'rgba(239,68,68,0.6)'
                    : ready
                    ? 'rgba(239,68,68,0.4)'
                    : 'var(--border)'
                }`,
                color: 'var(--text-primary)',
              }}
            />
            {value.length > 0 && !ready && (
              <p className="text-xs" style={{ color: '#ef4444' }}>
                Text does not match — check for typos
              </p>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-overlay)' }}>
          <button onClick={onClose} disabled={working}
            className="btn btn-ghost text-sm">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!ready || working}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: ready && !working ? '#ef4444' : 'var(--bg-raised)',
              color:      ready && !working ? '#fff'    : 'var(--text-muted)',
              border:     '1px solid rgba(239,68,68,0.3)',
              cursor:     ready && !working ? 'pointer' : 'not-allowed',
              opacity:    ready ? 1 : 0.55,
            }}>
            {working
              ? 'Working…'
              : isClear
              ? 'I understand, clear everything'
              : 'I understand, delete my account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Settings page ─────────────────────────────────────────────────────────────

export default function Settings() {
  const { theme, toggleTheme, user, setUser } = useAppStore()
  const [modal, setModal]           = useState(null) // null | 'clear' | 'delete'
  const [confirmText, setConfirmText] = useState('')
  const [working, setWorking]       = useState(false)

  // ── Security (app lock) state ────────────────────────────────
  const [lockEnabled, setLockEnabled] = useState(() => !!localStorage.getItem('ft-lock-pin'))
  const [pinModal, setPinModal]       = useState(null) // null | 'set' | 'change' | 'disable'

  // Stay in sync when PIN is cleared externally (e.g. "Forgot PIN" from overlay)
  useEffect(() => {
    const h = () => setLockEnabled(!!localStorage.getItem('ft-lock-pin'))
    window.addEventListener('applock:changed', h)
    return () => window.removeEventListener('applock:changed', h)
  }, [])

  const handleLockToggle = () => setPinModal(lockEnabled ? 'disable' : 'set')
  const handlePinDone    = (enabled) => { setLockEnabled(enabled); setPinModal(null) }

  const openModal = (type) => { setModal(type); setConfirmText('') }
  const closeModal = () => { setModal(null); setConfirmText('') }

  // ── Export all data ──────────────────────────────────────────
  const handleExport = async () => {
    const userId = user?.id
    if (!userId || !supabase) return
    const result = {}
    for (const table of DATA_TABLES) {
      const { data } = await supabase.from(table).select('*').eq('user_id', userId)
      result[table] = data || []
    }
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `flowtrail-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Delete all rows from every table ────────────────────────
  const purgeAllData = async (userId) => {
    for (const table of DATA_TABLES) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId)
      if (error) console.error(`purge ${table}:`, error)
    }
  }

  // ── Clear all data (keep account) ───────────────────────────
  const handleClearData = async () => {
    const userId = user?.id
    if (!userId || confirmText !== 'clear my data') return
    setWorking(true)
    await purgeAllData(userId)
    setWorking(false)
    closeModal()
    // Reload to reset all in-memory state
    window.location.reload()
  }

  // ── Delete account ───────────────────────────────────────────
  const handleDeleteAccount = async () => {
    const userId = user?.id
    if (!userId || confirmText !== user?.email) return
    setWorking(true)
    await purgeAllData(userId)
    // Attempt server-side deletion via RPC (needs a `delete_user` function in Supabase)
    try {
      const { error } = await supabase.rpc('delete_user')
      if (error) console.warn('delete_user RPC not available — signing out only:', error.message)
    } catch {
      console.warn('delete_user RPC unavailable — signing out only')
    }
    await supabase.auth.signOut()
    setUser(null)
    setWorking(false)
  }

  // ── Layout helpers ───────────────────────────────────────────
  const Section = ({ title, children, danger }) => (
    <div>
      <h2
        className="text-xs font-semibold uppercase tracking-wider mb-3 px-1"
        style={{ color: danger ? '#ef4444' : 'var(--text-muted)' }}>
        {title}
      </h2>
      <div
        className="card divide-y"
        style={{
          borderColor:   danger ? 'rgba(239,68,68,0.3)' : 'var(--border)',
          outlineOffset: '0px',
        }}>
        {children}
      </div>
    </div>
  )

  const Row = ({ label, sub, action }) => (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
      {action && <div className="flex-shrink-0 mt-0.5">{action}</div>}
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
      </div>

      {/* ── Account ──────────────────────────────────────────── */}
      <Section title="Account">
        <Row
          label="Email"
          sub={user?.email || 'Demo mode — no account'}
          action={null}
        />
      </Section>

      {/* ── Appearance ───────────────────────────────────────── */}
      <Section title="Appearance">
        <Row
          label="Theme"
          sub={theme === 'dark' ? 'Dark mode active' : 'Light mode active'}
          action={
            <button onClick={toggleTheme} className="btn btn-ghost flex items-center gap-2">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          }
        />
      </Section>

      {/* ── Security ─────────────────────────────────────────── */}
      <Section title="Security">
        <Row
          label="App Lock"
          sub="Require a PIN when returning to the app after 30 seconds away"
          action={
            <button
              onClick={handleLockToggle}
              className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200"
              style={{ background: lockEnabled ? 'var(--brand)' : 'var(--border)' }}>
              <div
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                style={{ left: lockEnabled ? '22px' : '2px' }} />
            </button>
          }
        />
        {lockEnabled && (
          <Row
            label="Change PIN"
            sub="Update your 4-digit app lock PIN"
            action={
              <button
                onClick={() => setPinModal('change')}
                className="btn btn-ghost text-sm flex items-center gap-2">
                <Lock size={14} /> Change
              </button>
            }
          />
        )}
      </Section>

      {/* ── Data ─────────────────────────────────────────────── */}
      <Section title="Data">
        <Row
          label="Export all data"
          sub="Download your habits, tasks, notes, journal entries, and passwords as a JSON file"
          action={
            <button className="btn btn-ghost flex items-center gap-2" onClick={handleExport}>
              <Download size={15} /> Export
            </button>
          }
        />
      </Section>

      {/* ── Danger zone ──────────────────────────────────────── */}
      <Section title="Danger zone" danger>
        <Row
          label="Clear all data"
          sub="Permanently delete all your notes, tasks, habits, journal entries, and passwords. Your account is kept and you stay signed in."
          action={
            <button
              onClick={() => openModal('clear')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: 'rgba(239,68,68,0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.25)',
              }}>
              <Trash2 size={14} /> Clear data
            </button>
          }
        />
        <Row
          label="Delete account"
          sub="Permanently delete your account and every piece of data associated with it. You will be signed out immediately. This cannot be undone."
          action={
            <button
              onClick={() => openModal('delete')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: '#ef4444', color: '#fff' }}>
              <AlertTriangle size={14} /> Delete account
            </button>
          }
        />
      </Section>

      {/* ── About ────────────────────────────────────────────── */}
      <Section title="About">
        <Row
          label="FlowTrail"
          sub="v2.0.0 · Personal productivity workspace"
          action={
            <a href="https://github.com/harishsivakumarjs/flowtrail"
              target="_blank" rel="noreferrer"
              className="btn btn-ghost flex items-center gap-2">
              <Github size={15} /> GitHub
            </a>
          }
        />
        <Row
          label="Developed by Harish Sivakumar"
          sub="Full-stack developer · Connect on LinkedIn"
          action={
            <a href="https://www.linkedin.com/in/harishsivakumarjs/"
              target="_blank" rel="noreferrer"
              className="btn btn-ghost flex items-center gap-2"
              style={{ color: '#0A66C2' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </a>
          }
        />
        <Row
          label="Tech stack"
          sub="React · Vite · Supabase · TailwindCSS · Recharts · Tiptap"
          action={null}
        />
      </Section>

      {/* ── Confirmation modal ────────────────────────────────── */}
      {modal && (
        <ConfirmDangerModal
          variant={modal}
          userEmail={user?.email || ''}
          value={confirmText}
          onChange={setConfirmText}
          onConfirm={modal === 'clear' ? handleClearData : handleDeleteAccount}
          onClose={closeModal}
          working={working}
        />
      )}

      {/* ── PIN setup modal ───────────────────────────────────── */}
      {pinModal && (
        <PinSetupModal
          mode={pinModal}
          onClose={() => setPinModal(null)}
          onDone={handlePinDone}
        />
      )}
    </div>
  )
}
