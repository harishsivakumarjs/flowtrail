import { useState, useEffect, useRef } from 'react'
import { Sun, Moon, Download, Trash2, AlertTriangle, Github, X, Lock, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What was your childhood nickname?",
  "What is the name of the street you grew up on?",
  "What was the make and model of your first car?",
  "What is your oldest sibling's middle name?",
]

// ── Vault helpers (must stay in sync with PasswordManager) ───────────────────

function validateVaultPassword(pw) {
  if (!pw || pw.length < 8) return 'At least 8 characters required'
  if (!/[a-z]/.test(pw))        return 'Add a lowercase letter (a-z)'
  if (!/[A-Z]/.test(pw))        return 'Add an uppercase letter (A-Z)'
  if (!/[0-9]/.test(pw))        return 'Add a number (0-9)'
  if (!/[^a-zA-Z0-9]/.test(pw)) return 'Add a special character (!@#$…)'
  return null
}

function getVaultHash() {
  // Check new key first, fall back to old PIN key
  return localStorage.getItem('ft-vault-pass') || localStorage.getItem('ft-vault-pin')
}

async function persistVaultToSupabase(passHash, securityEncoded) {
  if (!supabase) return
  const update = {}
  if (passHash !== undefined)        update.vault_pass     = passHash
  if (securityEncoded !== undefined) update.vault_security = securityEncoded
  if (Object.keys(update).length) await supabase.auth.updateUser({ data: update })
}

// ── Password input with show/hide ─────────────────────────────────────────────
function PwInput({ value, onChange, placeholder, autoFocus, onEnter }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        placeholder={placeholder}
        className="input-base w-full pr-10"
        autoFocus={autoFocus}
      />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-muted)' }}>
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

function StrengthBar({ password }) {
  if (!password) return null
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  const level = score <= 2 ? 1 : score <= 4 ? 2 : 3
  const color = level === 1 ? 'var(--red)' : level === 2 ? 'var(--amber)' : 'var(--green)'
  const label = level === 1 ? 'Weak' : level === 2 ? 'Medium' : 'Strong'
  return (
    <div className="space-y-1 mt-1">
      <div className="flex gap-1">{[1,2,3].map(i => (
        <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= level ? color : 'var(--border)' }} />
      ))}</div>
      <p className="text-xs" style={{ color }}>{label}</p>
    </div>
  )
}

// ── Vault password settings modal (set / change / disable) ────────────────────
// mode: 'set' | 'change' | 'disable'
function VaultPasswordModal({ mode, onClose, onDone }) {
  // Steps depending on mode:
  //   set:     password → confirm → questions
  //   change:  verify   → password → confirm → questions
  //   disable: verify
  const firstStep = (mode === 'set') ? 'password' : 'verify'
  const [step,   setStep]   = useState(firstStep)
  const [error,  setError]  = useState('')
  const [saving, setSaving] = useState(false)

  // Fields
  const [currentPw, setCurrentPw] = useState('')
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [q1, setQ1] = useState(SECURITY_QUESTIONS[0])
  const [q2, setQ2] = useState(SECURITY_QUESTIONS[2])
  const [a1, setA1] = useState('')
  const [a2, setA2] = useState('')

  const proceed = async () => {
    setError('')

    if (step === 'verify') {
      if (!currentPw) { setError('Enter your current vault password'); return }
      if (btoa(currentPw) !== getVaultHash()) { setError('Incorrect password'); setCurrentPw(''); return }
      if (mode === 'disable') {
        setSaving(true)
        localStorage.removeItem('ft-vault-pass')
        localStorage.removeItem('ft-vault-pin')
        localStorage.removeItem('ft-vault-security')
        await persistVaultToSupabase(null, null)
        setSaving(false)
        onDone(false)
        return
      }
      setStep('password')
      return
    }

    if (step === 'password') {
      const err = validateVaultPassword(newPw)
      if (err) { setError(err); return }
      setStep('confirm')
      return
    }

    if (step === 'confirm') {
      if (newPw !== confirmPw) { setError('Passwords do not match'); setConfirmPw(''); return }
      setStep('questions')
      return
    }

    if (step === 'questions') {
      if (!a1.trim()) { setError('Please answer question 1'); return }
      if (!a2.trim()) { setError('Please answer question 2'); return }
      if (q1 === q2)  { setError('Choose two different questions'); return }
      setSaving(true)
      const hash   = btoa(newPw)
      const secObj = { q1, a1: btoa(a1.toLowerCase().trim()), q2, a2: btoa(a2.toLowerCase().trim()) }
      const secEnc = btoa(JSON.stringify(secObj))
      localStorage.setItem('ft-vault-pass',     hash)
      localStorage.setItem('ft-vault-security', secEnc)
      localStorage.removeItem('ft-vault-pin') // clear old key
      await persistVaultToSupabase(hash, secEnc)
      setSaving(false)
      onDone(true)
    }
  }

  const titles = { set: 'Set vault password', change: 'Change vault password', disable: 'Disable vault password' }
  const stepNum = { verify: 1, password: mode === 'set' ? 1 : 2, confirm: mode === 'set' ? 2 : 3, questions: mode === 'set' ? 3 : 4 }
  const totalSteps = mode === 'disable' ? 1 : mode === 'set' ? 3 : 4

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{titles[mode]}</h2>
            {mode !== 'disable' && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Step {stepNum[step]} of {totalSteps}
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {step === 'verify' && (
            <>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {mode === 'disable' ? 'Enter your current vault password to disable protection.' : 'Verify your current vault password to continue.'}
              </p>
              <PwInput value={currentPw} onChange={v => { setCurrentPw(v); setError('') }}
                placeholder="Current vault password" autoFocus onEnter={proceed} />
            </>
          )}

          {step === 'password' && (
            <>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Must be 8+ characters with uppercase, number, and special character.
              </p>
              <PwInput value={newPw} onChange={v => { setNewPw(v); setError('') }}
                placeholder="New vault password" autoFocus onEnter={proceed} />
              <StrengthBar password={newPw} />
            </>
          )}

          {step === 'confirm' && (
            <>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Re-enter your new vault password to confirm.</p>
              <PwInput value={confirmPw} onChange={v => { setConfirmPw(v); setError('') }}
                placeholder="Confirm new password" autoFocus onEnter={proceed} />
            </>
          )}

          {step === 'questions' && (
            <>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Security questions are used to recover your vault if you forget the password.
              </p>
              {[
                { q: q1, setQ: setQ1, a: a1, setA: setA1, label: 'Question 1', exclude: q2 },
                { q: q2, setQ: setQ2, a: a2, setA: setA2, label: 'Question 2', exclude: q1 },
              ].map(({ q, setQ, a, setA, label, exclude }) => (
                <div key={label} className="space-y-1.5">
                  <label className="block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <div className="relative">
                    <select value={q} onChange={e => setQ(e.target.value)} className="input-base w-full appearance-none pr-8">
                      {SECURITY_QUESTIONS.filter(sq => sq !== exclude).map(sq => (
                        <option key={sq} value={sq}>{sq}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <input value={a} onChange={e => { setA(e.target.value); setError('') }}
                    placeholder="Your answer" className="input-base w-full" />
                </div>
              ))}
            </>
          )}

          {error && <p className="text-xs font-medium text-center" style={{ color: 'var(--red)' }}>{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {step !== firstStep && (
            <button onClick={() => { setError(''); setStep(step === 'questions' ? 'confirm' : step === 'confirm' ? 'password' : 'verify') }}
              className="btn btn-ghost text-sm mr-auto">← Back</button>
          )}
          <button onClick={onClose} disabled={saving} className="btn btn-ghost text-sm">Cancel</button>
          <button onClick={proceed} disabled={saving} className="btn btn-primary text-sm">
            {saving ? 'Saving…' : step === 'questions' ? 'Save' : step === 'verify' && mode === 'disable' ? 'Disable' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}

const DATA_TABLES = ['notes', 'passwords', 'tasks', 'habits', 'habit_logs', 'sleep_logs', 'journal_entries']

// ── GitHub-style danger confirmation modal ────────────────────────────────────
function ConfirmDangerModal({ variant, userEmail, value, onChange, onConfirm, onClose, working }) {
  const isClear  = variant === 'clear'
  const required = isClear ? 'clear my data' : userEmail
  const ready    = value === required && required.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-raised)', border: '1px solid rgba(239,68,68,0.35)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.12)' }}>
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isClear ? 'Clear all data' : 'Delete account'}
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }} disabled={working}><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl p-4 space-y-2"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
            <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>The following will be permanently deleted:</p>
            <ul className="text-xs space-y-1 pl-1" style={{ color: 'var(--text-secondary)' }}>
              <li>· All habits and habit logs</li><li>· All tasks</li>
              <li>· All journal entries</li><li>· All notes</li>
              <li>· All saved passwords</li><li>· Sleep logs</li>
              {!isClear && <li>· Your account (you will be signed out immediately)</li>}
            </ul>
            <p className="text-xs font-bold pt-1" style={{ color: '#ef4444' }}>This action cannot be undone.</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isClear ? 'To confirm, type ' : 'To confirm, enter your email address '}
              <code className="px-1.5 py-0.5 rounded font-mono text-xs"
                style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                {required}
              </code>{' '}below:
            </p>
            <input type={isClear ? 'text' : 'email'} value={value} onChange={e => onChange(e.target.value)}
              placeholder={required} autoFocus
              onKeyDown={e => e.key === 'Enter' && ready && !working && onConfirm()}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
              style={{
                background: 'var(--bg-overlay)',
                border: `1.5px solid ${value.length > 0 && !ready ? 'rgba(239,68,68,0.6)' : ready ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                color: 'var(--text-primary)',
              }} />
            {value.length > 0 && !ready && (
              <p className="text-xs" style={{ color: '#ef4444' }}>Text does not match — check for typos</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-overlay)' }}>
          <button onClick={onClose} disabled={working} className="btn btn-ghost text-sm">Cancel</button>
          <button onClick={onConfirm} disabled={!ready || working}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: ready && !working ? '#ef4444' : 'var(--bg-raised)',
              color:      ready && !working ? '#fff'    : 'var(--text-muted)',
              border: '1px solid rgba(239,68,68,0.3)',
              cursor: ready && !working ? 'pointer' : 'not-allowed',
              opacity: ready ? 1 : 0.55,
            }}>
            {working ? 'Working…' : isClear ? 'I understand, clear everything' : 'I understand, delete my account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Settings page ─────────────────────────────────────────────────────────────

export default function Settings() {
  const { theme, toggleTheme, user, setUser } = useAppStore()

  const [modal,       setModal]       = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [working,     setWorking]     = useState(false)

  // Vault password state — checks both new and legacy keys
  const [vaultEnabled,  setVaultEnabled]  = useState(() => !!localStorage.getItem('ft-vault-pass') || !!localStorage.getItem('ft-vault-pin'))
  const [vaultModal,    setVaultModal]    = useState(null) // 'set' | 'change' | 'disable' | null

  // Sync vault state from Supabase on mount (same logic as PasswordManager.initVaultData)
  useEffect(() => {
    if (!user?.id || !supabase) return
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      const meta = u?.user_metadata || {}
      if (meta.vault_pass) {
        localStorage.setItem('ft-vault-pass', meta.vault_pass)
        setVaultEnabled(true)
      }
      if (meta.vault_security) {
        localStorage.setItem('ft-vault-security', meta.vault_security)
      }
    })
  }, [user?.id])

  const handleVaultToggle = () => setVaultModal(vaultEnabled ? 'disable' : 'set')
  const handleVaultDone   = (enabled) => { setVaultEnabled(enabled); setVaultModal(null) }

  const openModal  = (type) => { setModal(type); setConfirmText('') }
  const closeModal = () => { setModal(null); setConfirmText('') }

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

  const purgeAllData = async (userId) => {
    for (const table of DATA_TABLES) {
      await supabase.from(table).delete().eq('user_id', userId)
    }
  }

  const handleClearData = async () => {
    const userId = user?.id
    if (!userId || confirmText !== 'clear my data') return
    setWorking(true)
    await purgeAllData(userId)
    setWorking(false)
    closeModal()
    window.location.reload()
  }

  const handleDeleteAccount = async () => {
    const userId = user?.id
    if (!userId || confirmText !== user?.email) return
    setWorking(true)
    await purgeAllData(userId)
    try { await supabase.rpc('delete_user') } catch { /* RPC may not exist */ }
    await supabase.auth.signOut()
    setUser(null)
    setWorking(false)
  }

  const Section = ({ title, children, danger }) => (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1"
        style={{ color: danger ? '#ef4444' : 'var(--text-muted)' }}>
        {title}
      </h2>
      <div className="card divide-y" style={{ borderColor: danger ? 'rgba(239,68,68,0.3)' : 'var(--border)' }}>
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
      <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h1>

      <Section title="Account">
        <Row label="Email" sub={user?.email || 'Demo mode — no account'} />
      </Section>

      <Section title="Appearance">
        <Row label="Theme"
          sub={theme === 'dark' ? 'Dark mode active' : 'Light mode active'}
          action={
            <button onClick={toggleTheme} className="btn btn-ghost flex items-center gap-2">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          }
        />
      </Section>

      <Section title="Passwords">
        <Row
          label="Vault password"
          sub="Require a password before accessing your saved passwords"
          action={
            <button onClick={handleVaultToggle}
              className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200"
              style={{ background: vaultEnabled ? 'var(--brand)' : 'var(--border)' }}>
              <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                style={{ left: vaultEnabled ? '22px' : '2px' }} />
            </button>
          }
        />
        {vaultEnabled && (
          <Row
            label="Change vault password"
            sub="Update your vault password and security questions"
            action={
              <button onClick={() => setVaultModal('change')} className="btn btn-ghost text-sm flex items-center gap-2">
                <Lock size={14} /> Change
              </button>
            }
          />
        )}
      </Section>

      <Section title="Data">
        <Row label="Export all data"
          sub="Download your habits, tasks, notes, journal entries, and passwords as a JSON file"
          action={
            <button className="btn btn-ghost flex items-center gap-2" onClick={handleExport}>
              <Download size={15} /> Export
            </button>
          }
        />
      </Section>

      <Section title="Danger zone" danger>
        <Row label="Clear all data"
          sub="Permanently delete all your notes, tasks, habits, journal entries, and passwords. Your account is kept."
          action={
            <button onClick={() => openModal('clear')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
              <Trash2 size={14} /> Clear data
            </button>
          }
        />
        <Row label="Delete account"
          sub="Permanently delete your account and all associated data. You will be signed out immediately."
          action={
            <button onClick={() => openModal('delete')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium"
              style={{ background: '#ef4444', color: '#fff' }}>
              <AlertTriangle size={14} /> Delete account
            </button>
          }
        />
      </Section>

      <Section title="About">
        <Row label="FlowTrail" sub="v2.0.0 · Personal productivity workspace"
          action={
            <a href="https://github.com/harishsivakumarjs/flowtrail" target="_blank" rel="noreferrer"
              className="btn btn-ghost flex items-center gap-2">
              <Github size={15} /> GitHub
            </a>
          }
        />
        <Row label="Developed by Harish Sivakumar" sub="Full-stack developer · Connect on LinkedIn"
          action={
            <a href="https://www.linkedin.com/in/harishsivakumarjs/" target="_blank" rel="noreferrer"
              className="btn btn-ghost flex items-center gap-2" style={{ color: '#0A66C2' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </a>
          }
        />
        <Row label="Tech stack" sub="React · Vite · Supabase · TailwindCSS · Recharts · Tiptap" />
      </Section>

      {/* Modals */}
      {modal && (
        <ConfirmDangerModal variant={modal} userEmail={user?.email || ''}
          value={confirmText} onChange={setConfirmText}
          onConfirm={modal === 'clear' ? handleClearData : handleDeleteAccount}
          onClose={closeModal} working={working} />
      )}
      {vaultModal && (
        <VaultPasswordModal mode={vaultModal} onClose={() => setVaultModal(null)} onDone={handleVaultDone} />
      )}
    </div>
  )
}
