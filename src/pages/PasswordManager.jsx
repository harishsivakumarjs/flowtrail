import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { PinPad } from '@/components/ui/AppLock'
import {
  Lock, Plus, Eye, EyeOff, Copy, Search, X, Trash2,
  Edit2, Check, RefreshCw, Upload, Shield, KeyRound,
} from 'lucide-react'

const CATEGORIES = ['General', 'Social', 'Work', 'Banking', 'Shopping']
const EMPTY_FORM  = { site_name: '', site_url: '', username: '', password: '', notes: '', category: 'General' }

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStrength(pw) {
  if (!pw) return { level: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (pw.length >= 16) score++
  if (/[a-z]/.test(pw))       score++
  if (/[A-Z]/.test(pw))       score++
  if (/[0-9]/.test(pw))       score++
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
    const raw = url.startsWith('http') ? url : `https://${url}`
    const host = new URL(raw).hostname
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`
  } catch { return null }
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (!lines.length) return []
  const first = lines[0].toLowerCase()
  const hasHeader = first.includes('site_name') || first.includes('site') || first.includes('username')
  const data = hasHeader ? lines.slice(1) : lines
  return data.map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
    return {
      site_name: cols[0] || '',
      username:  cols[1] || '',
      password:  cols[2] || '',
      site_url:  cols[3] || '',
      notes:     cols[4] || '',
    }
  }).filter(r => r.site_name && r.password)
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SiteFavicon({ url, name }) {
  const [err, setErr] = useState(false)
  const faviconUrl = getFaviconUrl(url)
  if (!faviconUrl || err) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: 'color-mix(in srgb, var(--brand) 15%, transparent)', color: 'var(--brand)' }}>
        {(name?.[0] || '?').toUpperCase()}
      </div>
    )
  }
  return (
    <img src={faviconUrl} alt={name} onError={() => setErr(true)}
      className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
  )
}

function StrengthBar({ password }) {
  const { level, label, color } = getStrength(password)
  if (!password) return null
  return (
    <div className="space-y-1 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3].map(i => (
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


// ── Password modal (add / edit) ───────────────────────────────────────────────

function PasswordModal({ initial, onSave, onClose }) {
  const isEdit = Boolean(initial)
  const [form, setForm]       = useState(initial || EMPTY_FORM)
  const [showPw, setShowPw]   = useState(false)
  const [saving, setSaving]   = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.site_name.trim()) return
    if (!form.password.trim()) return
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

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit password' : 'Add password'}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Site name */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Site name *
            </label>
            <input value={form.site_name} onChange={e => set('site_name', e.target.value)}
              placeholder="Google, GitHub, Netflix…"
              className="input-field w-full" />
          </div>

          {/* URL */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              URL
            </label>
            <input value={form.site_url} onChange={e => set('site_url', e.target.value)}
              placeholder="https://example.com"
              className="input-field w-full" />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Username / Email
            </label>
            <input value={form.username} onChange={e => set('username', e.target.value)}
              placeholder="user@example.com"
              className="input-field w-full" />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Password *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Enter or generate…"
                  className="input-field w-full pr-9" />
                <button onClick={() => setShowPw(p => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button
                onClick={() => set('password', generatePassword())}
                title="Generate password"
                className="btn btn-ghost px-3 flex-shrink-0 flex items-center gap-1 text-xs">
                <RefreshCw size={13} /> Gen
              </button>
            </div>
            <StrengthBar password={form.password} />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Category
            </label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="input-field w-full">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              Notes
            </label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Security question, 2FA backup…"
              rows={3}
              className="input-field w-full resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: 'var(--border)' }}>
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

// ── Password row ─────────────────────────────────────────────────────────────

function PasswordRow({ item, revealed, onReveal, onEdit, onDelete }) {
  const isRevealed = revealed.has(item.id)

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-[var(--bg-overlay)]"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
      <SiteFavicon url={item.site_url} name={item.site_name} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {item.site_name}
          </span>
          {item.site_url && (
            <a href={item.site_url.startsWith('http') ? item.site_url : `https://${item.site_url}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs truncate hidden sm:block"
              style={{ color: 'var(--text-muted)' }}
              onClick={e => e.stopPropagation()}>
              {item.site_url.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
            {item.username || '—'}
          </span>
          {item.username && <CopyBtn text={item.username} label="username" />}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', letterSpacing: isRevealed ? 0 : '0.05em' }}>
            {isRevealed ? item.password : '●'.repeat(Math.min(item.password.length, 12))}
          </span>
          <button onClick={() => onReveal(item.id)}
            className="p-1 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          <CopyBtn text={item.password} label="password" />
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onEdit(item)}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
          style={{ color: 'var(--text-muted)' }}>
          <Edit2 size={14} />
        </button>
        <button onClick={() => onDelete(item.id)}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
          style={{ color: 'var(--red)' }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Main vault ───────────────────────────────────────────────────────────────

function Vault({ userId, onLock }) {
  const [passwords, setPasswords]     = useState([])
  const [search, setSearch]           = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [modal, setModal]             = useState(null) // null | { mode:'add' } | { mode:'edit', item }
  const [revealed, setRevealed]       = useState(new Set())
  const csvInputRef                   = useRef(null)

  const fetchPasswords = useCallback(async () => {
    if (!userId || !supabase) return
    const { data, error } = await supabase
      .from('passwords')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
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

  // Group by category
  const grouped = {}
  filtered.forEach(p => {
    const key = p.category || 'General'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(p)
  })

  const handleSave = async (form) => {
    if (!supabase || !userId) return
    if (modal?.mode === 'edit') {
      const { error } = await supabase.from('passwords').update({
        ...form, updated_at: new Date().toISOString(),
      }).eq('id', modal.item.id)
      if (error) { console.error('updatePassword:', error); return }
    } else {
      const { error } = await supabase.from('passwords').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        ...form,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      if (error) { console.error('insertPassword:', error); return }
    }
    await fetchPasswords()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this password?')) return
    await supabase.from('passwords').delete().eq('id', id)
    await fetchPasswords()
  }

  const toggleReveal = (id) => {
    setRevealed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !userId || !supabase) return
    const text = await file.text()
    const rows = parseCSV(text)
    if (!rows.length) { alert('No valid rows found in CSV'); return }
    const records = rows.map(r => ({
      id: crypto.randomUUID(), user_id: userId,
      site_name: r.site_name, site_url: r.site_url || '',
      username: r.username || '', password: r.password,
      notes: r.notes || '', category: 'General',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
    const { error } = await supabase.from('passwords').insert(records)
    if (error) { console.error('importCSV:', error); alert('Import failed: ' + error.message); return }
    await fetchPasswords()
    e.target.value = ''
    alert(`Imported ${records.length} password${records.length !== 1 ? 's' : ''}`)
  }

  const chips = ['All', ...CATEGORIES]

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      {/* Header */}
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
          {/* Import CSV */}
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          <button onClick={() => csvInputRef.current?.click()}
            className="btn btn-ghost text-xs flex items-center gap-1.5">
            <Upload size={13} /> Import CSV
          </button>
          {/* Lock vault */}
          <button onClick={onLock}
            className="btn btn-ghost text-xs flex items-center gap-1.5"
            style={{ color: 'var(--text-muted)' }}>
            <Lock size={13} /> Lock
          </button>
          {/* Add */}
          <button onClick={() => setModal({ mode: 'add' })}
            className="btn btn-primary text-sm flex items-center gap-1.5">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {chips.map(c => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: activeCategory === c ? 'var(--brand)' : 'var(--bg-overlay)',
              color: activeCategory === c ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${activeCategory === c ? 'transparent' : 'var(--border)'}`,
            }}>
            {c}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
        style={{ background: 'var(--bg-overlay)', borderColor: 'var(--border)' }}>
        <Search size={15} style={{ color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search site name or username…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text-primary)' }} />
        {search && (
          <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Password list */}
      {passwords.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <KeyRound size={32} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No passwords saved — click Add to start
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No passwords match</p>
        </div>
      ) : (
        <div className="space-y-6 pb-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <section key={cat}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--text-muted)' }}>
                {cat} · {items.length}
              </div>
              <div className="space-y-2">
                {items.map(item => (
                  <PasswordRow
                    key={item.id}
                    item={item}
                    revealed={revealed}
                    onReveal={toggleReveal}
                    onEdit={item => setModal({ mode: 'edit', item })}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* CSV format hint */}
      <div className="text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--bg-overlay)' }}>
        CSV format: <code>site_name, username, password, url, notes</code>
      </div>

      {/* Modals */}
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

// ── Page entry ───────────────────────────────────────────────────────────────

export default function PasswordManager() {
  const { user } = useAppStore()
  const userId   = user?.id
  const [unlocked, setUnlocked] = useState(false)

  if (!unlocked) {
    return (
      <PinPad
        pinKey="ft-vault-pin"
        heading="Vault locked"
        onUnlock={() => setUnlocked(true)}
        onForgot={() => {
          if (!window.confirm('Remove vault PIN protection? Your passwords will not be deleted.')) return
          localStorage.removeItem('ft-vault-pin')
          setUnlocked(true)
        }}
        forgotLabel="Forgot vault PIN?"
        zIndex={100}
      />
    )
  }

  return <Vault userId={userId} onLock={() => setUnlocked(false)} />
}
