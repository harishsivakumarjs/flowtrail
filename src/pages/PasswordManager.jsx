import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import {
  Lock, Plus, Eye, EyeOff, Copy, Search, X, Trash2,
  Edit2, Check, RefreshCw, Upload, Shield, KeyRound, ChevronDown,
} from 'lucide-react'

const CATEGORIES = ['General', 'Social', 'Work', 'Banking', 'Shopping']
const EMPTY_FORM  = { site_name: '', site_url: '', username: '', password: '', notes: '', category: 'General' }

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateVaultPassword(pw) {
  if (!pw || pw.length < 8) return 'At least 8 characters required'
  if (!/[a-z]/.test(pw))        return 'Add a lowercase letter (a-z)'
  if (!/[A-Z]/.test(pw))        return 'Add an uppercase letter (A-Z)'
  if (!/[0-9]/.test(pw))        return 'Add a number (0-9)'
  if (!/[^a-zA-Z0-9]/.test(pw)) return 'Add a special character (!@#$…)'
  return null
}

function getStrength(pw) {
  if (!pw) return { level: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (pw.length >= 16) score++
  if (/[a-z]/.test(pw))        score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  if (score <= 3) return { level: 1, label: 'Weak',   color: 'var(--red)' }
  if (score <= 5) return { level: 2, label: 'Medium', color: 'var(--amber)' }
  return               { level: 3, label: 'Strong',  color: 'var(--green)' }
}

function generatePassword(length = 16) {
  const lower   = 'abcdefghijklmnopqrstuvwxyz'
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits  = '0123456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  const all     = lower + upper + digits + symbols
  let pw = lower[Math.floor(Math.random() * lower.length)]
         + upper[Math.floor(Math.random() * upper.length)]
         + digits[Math.floor(Math.random() * digits.length)]
         + symbols[Math.floor(Math.random() * symbols.length)]
  for (let i = 4; i < length; i++) pw += all[Math.floor(Math.random() * all.length)]
  return pw.split('').sort(() => Math.random() - 0.5).join('')
}

function getFaviconUrl(url) {
  if (!url) return null
  try {
    const raw  = url.startsWith('http') ? url : `https://${url}`
    const host = new URL(raw).hostname
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`
  } catch { return null }
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (!lines.length) return []
  const first     = lines[0].toLowerCase()
  const hasHeader = first.includes('site_name') || first.includes('site') || first.includes('username')
  const data      = hasHeader ? lines.slice(1) : lines
  return data.map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
    return { site_name: cols[0] || '', username: cols[1] || '', password: cols[2] || '', site_url: cols[3] || '', notes: cols[4] || '' }
  }).filter(r => r.site_name && r.password)
}

function getSecurityData() {
  try { return JSON.parse(atob(localStorage.getItem('ft-vault-security') || '')) }
  catch { return null }
}

function getVaultPassHash() {
  return localStorage.getItem('ft-vault-pass')
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SiteFavicon({ url, name }) {
  const [err, setErr] = useState(false)
  const faviconUrl    = getFaviconUrl(url)
  if (!faviconUrl || err) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: 'color-mix(in srgb, var(--brand) 15%, transparent)', color: 'var(--brand)' }}>
        {(name?.[0] || '?').toUpperCase()}
      </div>
    )
  }
  return <img src={faviconUrl} alt={name} onError={() => setErr(true)}
    className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
}

function StrengthBar({ password }) {
  const { level, label, color } = getStrength(password)
  if (!password) return null
  return (
    <div className="space-y-1 mt-1">
      <div className="flex gap-1">
        {[1,2,3].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all"
            style={{ background: i <= level ? color : 'var(--border)' }} />
        ))}
      </div>
      <p className="text-xs" style={{ color }}>{label}</p>
    </div>
  )
}

function CopyBtn({ text, label }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch { return }
    setDone(true)
    setTimeout(() => setDone(false), 2000)
  }
  return (
    <button onClick={copy} title={`Copy ${label}`}
      className="p-1.5 rounded-lg transition-colors flex-shrink-0"
      style={{ color: done ? 'var(--green)' : 'var(--text-muted)' }}>
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

// ── Password input with show/hide ─────────────────────────────────────────────
function PwInput({ value, onChange, placeholder = 'Password', autoFocus, onEnter, className = '' }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        placeholder={placeholder}
        className={`input-base w-full pr-10 ${className}`}
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

// ── Set/reset vault password screen ──────────────────────────────────────────
function SetNewPasswordScreen({ onSaved, onCancel, title = 'Set vault password' }) {
  const [pw,      setPw]      = useState('')
  const [confirm, setConfirm] = useState('')
  const [error,   setError]   = useState('')

  const save = () => {
    const err = validateVaultPassword(pw)
    if (err) { setError(err); return }
    if (pw !== confirm) { setError('Passwords do not match'); return }
    localStorage.setItem('ft-vault-pass', btoa(pw))
    onSaved()
  }

  return (
    <div className="w-full max-w-xs mx-auto space-y-3">
      <p className="text-sm font-semibold text-center mb-1" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-xs text-center mb-3" style={{ color: 'var(--text-muted)' }}>
        8+ characters · uppercase · number · special char
      </p>
      <PwInput value={pw} onChange={v => { setPw(v); setError('') }} placeholder="New password" autoFocus />
      <StrengthBar password={pw} />
      <PwInput value={confirm} onChange={v => { setConfirm(v); setError('') }} placeholder="Confirm password" onEnter={save} />
      {error && <p className="text-xs text-center" style={{ color: 'var(--red)' }}>{error}</p>}
      <button onClick={save} className="btn btn-primary w-full">Save password</button>
      {onCancel && <button onClick={onCancel} className="btn btn-ghost w-full">Cancel</button>}
    </div>
  )
}

// ── Security recovery screen ──────────────────────────────────────────────────
function SecurityRecoveryScreen({ onResetDone, onBack }) {
  const secData = getSecurityData()
  const [a1, setA1]           = useState('')
  const [a2, setA2]           = useState('')
  const [error, setError]     = useState('')
  const [verified, setVerified] = useState(false)

  // No security questions set up (migrated from old PIN system)
  if (!secData) {
    return (
      <div className="flex flex-col items-center justify-center p-6 w-full max-w-xs mx-auto text-center">
        <Shield size={36} className="mb-4" style={{ color: 'var(--brand)' }} />
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No security questions set</p>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          This vault was created without security questions. Remove the vault password to regain access — your saved passwords will not be deleted.
        </p>
        <button onClick={() => {
          localStorage.removeItem('ft-vault-pass')
          localStorage.removeItem('ft-vault-pin')
          localStorage.removeItem('ft-vault-security')
          onResetDone()
        }} className="btn btn-primary w-full mb-2">Remove vault password</button>
        <button onClick={onBack} className="btn btn-ghost w-full">← Back</button>
      </div>
    )
  }

  if (verified) {
    return (
      <SetNewPasswordScreen
        title="Set a new vault password"
        onSaved={onResetDone}
        onCancel={() => setVerified(false)}
      />
    )
  }

  const verify = () => {
    const ok1 = btoa(a1.toLowerCase().trim()) === secData.a1
    const ok2 = btoa(a2.toLowerCase().trim()) === secData.a2
    if (ok1 && ok2) { setVerified(true) }
    else { setError('One or more answers are incorrect. Answers are case-insensitive.') }
  }

  return (
    <div className="w-full max-w-xs mx-auto space-y-4">
      <div className="text-center mb-2">
        <Shield size={32} className="mx-auto mb-2" style={{ color: 'var(--brand)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Security questions</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Answer both questions to reset your password</p>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{secData.q1}</label>
        <input value={a1} onChange={e => { setA1(e.target.value); setError('') }}
          className="input-base w-full" placeholder="Your answer" autoFocus />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{secData.q2}</label>
        <input value={a2} onChange={e => { setA2(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && verify()}
          className="input-base w-full" placeholder="Your answer" />
      </div>
      {error && <p className="text-xs text-center" style={{ color: 'var(--red)' }}>{error}</p>}
      <button onClick={verify} className="btn btn-primary w-full">Verify answers</button>
      <button onClick={onBack} className="btn btn-ghost w-full">← Back to login</button>
    </div>
  )
}

// ── Vault login screen ────────────────────────────────────────────────────────
function VaultPasswordScreen({ onUnlock, onForgot }) {
  const [pw,      setPw]      = useState('')
  const [shake,   setShake]   = useState(false)
  const [error,   setError]   = useState('')
  const [attempts, setAttempts] = useState(0)
  const [phase,   setPhase]   = useState('login') // 'login' | 'recovery'

  const MAX_ATTEMPTS = 3

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => { setShake(false); setPw('') }, 550)
  }

  const verify = () => {
    if (!pw) return
    if (btoa(pw) === getVaultPassHash()) {
      onUnlock()
    } else {
      triggerShake()
      const next = attempts + 1
      setAttempts(next)
      if (next >= MAX_ATTEMPTS) {
        setPhase('recovery')
      } else {
        setError(`Incorrect password · ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next !== 1 ? 's' : ''} remaining`)
      }
    }
  }

  if (phase === 'recovery') {
    return (
      <div className="flex flex-col items-center justify-center p-6" style={{ minHeight: 'calc(100vh - 60px)', background: 'var(--bg-base)' }}>
        <SecurityRecoveryScreen
          onResetDone={() => { setPhase('login'); setAttempts(0); setError(''); setPw('') }}
          onBack={() => { setPhase('login'); setAttempts(0); setError(''); setPw('') }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-6"
      style={{ minHeight: 'calc(100vh - 60px)', background: 'var(--bg-base)' }}>

      <style>{`
        @keyframes vault-shake {
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-10px)} 30%{transform:translateX(10px)}
          45%{transform:translateX(-7px)}  60%{transform:translateX(7px)}
          75%{transform:translateX(-4px)}  90%{transform:translateX(4px)}
        }
        .vault-shake{animation:vault-shake .5s ease-in-out}
      `}</style>

      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'color-mix(in srgb, var(--brand) 12%, transparent)' }}>
        <Lock size={28} style={{ color: 'var(--brand)' }} />
      </div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Vault</h2>
      <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Enter your password to access</p>

      <div className={`w-full max-w-xs space-y-3 ${shake ? 'vault-shake' : ''}`}>
        <PwInput value={pw} onChange={v => { setPw(v); setError('') }} placeholder="Vault password" autoFocus onEnter={verify} />
        {error && <p className="text-xs text-center" style={{ color: 'var(--red)' }}>{error}</p>}
        <button onClick={verify} className="btn btn-primary w-full">Unlock vault</button>
      </div>

      <button onClick={() => setPhase('recovery')} className="mt-8 text-sm"
        style={{ color: 'var(--text-muted)' }}>
        Forgot password?
      </button>
    </div>
  )
}

// ── Vault setup modal (create password + security questions) ──────────────────
function VaultSetupModal({ onClose, onSaved }) {
  const [step,    setStep]    = useState('password') // 'password' | 'questions'
  const [pw,      setPw]      = useState('')
  const [confirm, setConfirm] = useState('')
  const [q1,      setQ1]      = useState(SECURITY_QUESTIONS[0])
  const [q2,      setQ2]      = useState(SECURITY_QUESTIONS[2])
  const [a1,      setA1]      = useState('')
  const [a2,      setA2]      = useState('')
  const [error,   setError]   = useState('')

  const nextStep = () => {
    setError('')
    const err = validateVaultPassword(pw)
    if (err) { setError(err); return }
    if (pw !== confirm) { setError('Passwords do not match'); return }
    setStep('questions')
  }

  const save = () => {
    setError('')
    if (!a1.trim()) { setError('Please answer question 1'); return }
    if (!a2.trim()) { setError('Please answer question 2'); return }
    if (q1 === q2)  { setError('Please choose two different questions'); return }
    // Save password
    localStorage.setItem('ft-vault-pass', btoa(pw))
    // Save security Q&A (answers stored lowercased + encoded)
    localStorage.setItem('ft-vault-security', btoa(JSON.stringify({
      q1, a1: btoa(a1.toLowerCase().trim()),
      q2, a2: btoa(a2.toLowerCase().trim()),
    })))
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {step === 'password' ? 'Create vault password' : 'Security questions'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Step {step === 'password' ? '1' : '2'} of 2
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {step === 'password' ? (
            <>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Must be 8+ characters with uppercase, number, and special character.
              </p>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Password</label>
                <PwInput value={pw} onChange={v => { setPw(v); setError('') }} placeholder="Create a strong password" autoFocus />
                <StrengthBar password={pw} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Confirm password</label>
                <PwInput value={confirm} onChange={v => { setConfirm(v); setError('') }} placeholder="Re-enter password" onEnter={nextStep} />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                These questions will be used to recover your vault if you forget your password.
              </p>
              {[
                { q: q1, setQ: setQ1, a: a1, setA: setA1, label: 'Question 1', exclude: q2 },
                { q: q2, setQ: setQ2, a: a2, setA: setA2, label: 'Question 2', exclude: q1 },
              ].map(({ q, setQ, a, setA, label, exclude }) => (
                <div key={label} className="space-y-1.5">
                  <label className="block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <div className="relative">
                    <select value={q} onChange={e => setQ(e.target.value)}
                      className="input-base w-full appearance-none pr-8">
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

          {error && <p className="text-xs text-center font-medium" style={{ color: 'var(--red)' }}>{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {step === 'questions' && (
            <button onClick={() => { setStep('password'); setError('') }} className="btn btn-ghost text-sm">← Back</button>
          )}
          <button onClick={onClose} className="btn btn-ghost text-sm">Cancel</button>
          <button onClick={step === 'password' ? nextStep : save} className="btn btn-primary text-sm">
            {step === 'password' ? 'Next →' : 'Save vault'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Password add/edit modal ───────────────────────────────────────────────────

function PasswordModal({ initial, onSave, onClose }) {
  const isEdit = Boolean(initial)
  const [form, setForm]     = useState(initial || EMPTY_FORM)
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.site_name.trim() || !form.password.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-raised)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit password' : 'Add password'}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {[
            { key: 'site_name', label: 'Site name *',      placeholder: 'Google, GitHub, Netflix…', type: 'text' },
            { key: 'site_url',  label: 'URL',              placeholder: 'https://example.com',       type: 'text' },
            { key: 'username',  label: 'Username / Email', placeholder: 'user@example.com',          type: 'text' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
              <input value={form[key]} onChange={e => set(key, e.target.value)}
                placeholder={placeholder} type={type} className="input-base w-full" />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Password *</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Enter or generate…" className="input-base w-full pr-9" />
                <button onClick={() => setShowPw(p => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button onClick={() => set('password', generatePassword())}
                className="btn btn-ghost px-3 flex-shrink-0 flex items-center gap-1 text-xs">
                <RefreshCw size={13} /> Gen
              </button>
            </div>
            <StrengthBar password={form.password} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className="input-base w-full">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Security question, 2FA backup…" rows={3} className="input-base w-full resize-none" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="btn btn-ghost text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.site_name || !form.password}
            className="btn btn-primary text-sm">
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add password'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Password row ──────────────────────────────────────────────────────────────

function PasswordRow({ item, revealed, onReveal, onEdit, onDelete }) {
  const isRevealed = revealed.has(item.id)
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-[var(--bg-overlay)]"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
      <SiteFavicon url={item.site_url} name={item.site_name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.site_name}</span>
          {item.site_url && (
            <a href={item.site_url.startsWith('http') ? item.site_url : `https://${item.site_url}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs truncate hidden sm:block" style={{ color: 'var(--text-muted)' }}
              onClick={e => e.stopPropagation()}>
              {item.site_url.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{item.username || '—'}</span>
          {item.username && <CopyBtn text={item.username} label="username" />}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', letterSpacing: isRevealed ? 0 : '0.05em' }}>
            {isRevealed ? item.password : '●'.repeat(Math.min(item.password.length, 12))}
          </span>
          <button onClick={() => onReveal(item.id)} className="p-1 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          <CopyBtn text={item.password} label="password" />
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
          style={{ color: 'var(--text-muted)' }}><Edit2 size={14} /></button>
        <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
          style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
      </div>
    </div>
  )
}

// ── Vault ─────────────────────────────────────────────────────────────────────

function Vault({ userId, hasPin, onLock, onSetPin }) {
  const [passwords, setPasswords]           = useState([])
  const [search, setSearch]                 = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [modal, setModal]                   = useState(null)
  const [revealed, setRevealed]             = useState(new Set())
  const csvInputRef                         = useRef(null)

  const fetchPasswords = useCallback(async () => {
    if (!userId || !supabase) return
    const { data, error } = await supabase.from('passwords').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false })
    if (error) console.error('fetchPasswords:', error)
    else setPasswords(data || [])
  }, [userId])

  useEffect(() => { fetchPasswords() }, [fetchPasswords])

  const filtered = passwords.filter(p => {
    const matchSearch = p.site_name.toLowerCase().includes(search.toLowerCase()) ||
      p.username.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'All' || p.category === activeCategory
    return matchSearch && matchCat
  })

  const grouped = {}
  filtered.forEach(p => {
    const key = p.category || 'General'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(p)
  })

  const handleSave = async (form) => {
    if (!supabase || !userId) return
    if (modal?.mode === 'edit') {
      await supabase.from('passwords').update({ ...form, updated_at: new Date().toISOString() }).eq('id', modal.item.id)
    } else {
      await supabase.from('passwords').insert({
        id: crypto.randomUUID(), user_id: userId, ...form,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      })
    }
    await fetchPasswords()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this password?')) return
    await supabase.from('passwords').delete().eq('id', id)
    await fetchPasswords()
  }

  const toggleReveal = (id) => {
    setRevealed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !userId || !supabase) return
    const rows = parseCSV(await file.text())
    if (!rows.length) { alert('No valid rows found in CSV'); return }
    const records = rows.map(r => ({
      id: crypto.randomUUID(), user_id: userId,
      site_name: r.site_name, site_url: r.site_url || '',
      username: r.username || '', password: r.password,
      notes: r.notes || '', category: 'General',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }))
    const { error } = await supabase.from('passwords').insert(records)
    if (error) { alert('Import failed: ' + error.message); return }
    await fetchPasswords()
    e.target.value = ''
    alert(`Imported ${records.length} password${records.length !== 1 ? 's' : ''}`)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Shield size={18} style={{ color: 'var(--brand)' }} />
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Vault</h1>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'color-mix(in srgb, var(--brand) 12%, transparent)', color: 'var(--brand)' }}>
            {passwords.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          <button onClick={() => csvInputRef.current?.click()} className="btn btn-ghost text-xs flex items-center gap-1.5">
            <Upload size={13} /> Import CSV
          </button>
          {hasPin ? (
            <button onClick={onLock} className="btn btn-ghost text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <Lock size={13} /> Lock
            </button>
          ) : (
            <button onClick={onSetPin} className="btn btn-ghost text-xs flex items-center gap-1.5">
              <Lock size={13} /> Set vault password
            </button>
          )}
          <button onClick={() => setModal({ mode: 'add' })} className="btn btn-primary text-sm flex items-center gap-1.5">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {['All', ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: activeCategory === c ? 'var(--brand)' : 'var(--bg-overlay)',
              color:      activeCategory === c ? '#fff'         : 'var(--text-secondary)',
              border:     `1px solid ${activeCategory === c ? 'transparent' : 'var(--border)'}`,
            }}>
            {c}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
        style={{ background: 'var(--bg-overlay)', borderColor: 'var(--border)' }}>
        <Search size={15} style={{ color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search site name or username…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text-primary)' }} />
        {search && <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)' }}><X size={14} /></button>}
      </div>

      {passwords.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <KeyRound size={32} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No passwords saved — click Add to start</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No passwords match</p>
        </div>
      ) : (
        <div className="space-y-6 pb-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <section key={cat}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                {cat} · {items.length}
              </div>
              <div className="space-y-2">
                {items.map(item => (
                  <PasswordRow key={item.id} item={item} revealed={revealed}
                    onReveal={toggleReveal}
                    onEdit={item => setModal({ mode: 'edit', item })}
                    onDelete={handleDelete} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--bg-overlay)' }}>
        CSV format: <code>site_name, username, password, url, notes</code>
      </div>

      {modal && (
        <PasswordModal
          initial={modal.mode === 'edit' ? {
            site_name: modal.item.site_name, site_url: modal.item.site_url,
            username: modal.item.username,   password: modal.item.password,
            notes: modal.item.notes,         category: modal.item.category,
          } : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ── Page entry ────────────────────────────────────────────────────────────────

export default function PasswordManager() {
  const { user } = useAppStore()
  const userId = user?.id

  // Support both old (ft-vault-pin) and new (ft-vault-pass) storage keys
  const [hasPin, setHasPin] = useState(() =>
    !!localStorage.getItem('ft-vault-pass') || !!localStorage.getItem('ft-vault-pin')
  )
  const [unlocked, setUnlocked] = useState(() =>
    !localStorage.getItem('ft-vault-pass') && !localStorage.getItem('ft-vault-pin')
  )
  const [showSetup, setShowSetup] = useState(false)

  const handleUnlock = () => setUnlocked(true)
  const handleLock   = () => setUnlocked(false)

  const handlePinSaved = () => {
    setHasPin(true)
    setShowSetup(false)
  }

  if (hasPin && !unlocked) {
    return <VaultPasswordScreen onUnlock={handleUnlock} />
  }

  return (
    <>
      <Vault userId={userId} hasPin={hasPin} onLock={handleLock} onSetPin={() => setShowSetup(true)} />
      {showSetup && (
        <VaultSetupModal onClose={() => setShowSetup(false)} onSaved={handlePinSaved} />
      )}
    </>
  )
}
