import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { Search, Plus, Pin, Trash2, X, Check } from 'lucide-react'

const COLORS = [
  { name: 'White',  value: '#ffffff' },
  { name: 'Yellow', value: '#fef9c3' },
  { name: 'Blue',   value: '#dbeafe' },
  { name: 'Green',  value: '#dcfce7' },
  { name: 'Pink',   value: '#fce7f3' },
  { name: 'Purple', value: '#f3e8ff' },
  { name: 'Orange', value: '#ffedd5' },
  { name: 'Grey',   value: '#f1f5f9' },
]

const DEFAULT_FOLDERS = ['Work', 'Personal', 'Ideas']

function isColorDark(hex) {
  if (!hex) return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

function NoteCard({ note, onClick }) {
  const preview = note.content.slice(0, 200)
  const dark = isColorDark(note.color)
  const textColor = dark ? '#fff' : '#111'
  const mutedColor = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.4)'

  return (
    <div
      onClick={onClick}
      className="rounded-xl p-4 cursor-pointer transition-all hover:shadow-md break-inside-avoid mb-3"
      style={{ background: note.color || '#ffffff', border: '1px solid rgba(0,0,0,0.07)' }}>
      {note.pinned && (
        <div className="mb-2"><Pin size={12} style={{ color: mutedColor }} /></div>
      )}
      {note.folder && note.folder !== 'All' && (
        <span className="inline-block text-xs mb-1.5 px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(0,0,0,0.06)', color: mutedColor }}>
          {note.folder}
        </span>
      )}
      {note.title && (
        <div className="text-sm font-semibold mb-1 leading-snug" style={{ color: textColor }}>
          {note.title}
        </div>
      )}
      {preview ? (
        <div className="text-xs leading-relaxed whitespace-pre-wrap line-clamp-6"
          style={{ color: dark ? 'rgba(255,255,255,0.82)' : '#444' }}>
          {preview}
        </div>
      ) : !note.title ? (
        <div className="text-xs italic" style={{ color: mutedColor }}>Empty note</div>
      ) : null}
    </div>
  )
}

function NoteEditor({ note, allFolders, onClose, onSave, onDelete, onFolderMove }) {
  const [title, setTitle]   = useState(note.title || '')
  const [content, setContent] = useState(note.content || '')
  const [color, setColor]   = useState(note.color || '#ffffff')
  const [pinned, setPinned] = useState(note.pinned || false)
  const [folder, setFolder] = useState(note.folder || 'All')
  const saveTimer = useRef(null)
  const dark = isColorDark(color)
  const textColor = dark ? '#fff' : '#111'

  const flush = (t, c, col, pin, fol) => {
    clearTimeout(saveTimer.current)
    onSave(note.id, { title: t, content: c, color: col, pinned: pin, folder: fol })
  }

  const schedule = (t, c, col, pin, fol) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onSave(note.id, { title: t, content: c, color: col, pinned: pin, folder: fol })
    }, 500)
  }

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const handleClose = () => {
    flush(title, content, color, pinned, folder)
    onClose()
  }

  const handleDelete = () => {
    if (!confirm('Delete this note?')) return
    clearTimeout(saveTimer.current)
    onDelete(note.id)
  }

  const handleColorChange = (col) => {
    setColor(col)
    flush(title, content, col, pinned, folder)
  }

  const handlePin = () => {
    const next = !pinned
    setPinned(next)
    flush(title, content, color, next, folder)
  }

  const handleFolderChange = (fol) => {
    setFolder(fol)
    flush(title, content, color, pinned, fol)
    // Tell parent to switch the active folder filter so the note stays visible
    onFolderMove?.(fol)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={handleClose}>
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: color, maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Toolbar: colors + actions */}
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLORS.map(c => (
              <button key={c.value} onClick={() => handleColorChange(c.value)} title={c.name}
                className="w-5 h-5 rounded-full transition-transform"
                style={{
                  background: c.value,
                  border: `2px solid ${color === c.value ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.12)'}`,
                  transform: color === c.value ? 'scale(1.2)' : 'scale(1)',
                }} />
            ))}
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button onClick={handlePin} title={pinned ? 'Unpin' : 'Pin'}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
                background: pinned ? (dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)') : 'transparent',
              }}>
              <Pin size={15} />
            </button>
            <button onClick={handleDelete} title="Delete"
              className="p-1.5 rounded-lg"
              style={{ color: dark ? 'rgba(255,140,140,0.9)' : 'rgba(180,0,0,0.65)' }}>
              <Trash2 size={15} />
            </button>
            <button onClick={handleClose}
              className="p-1.5 rounded-lg"
              style={{ color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Folder selector + creation date */}
        <div className="px-4 pt-3 pb-0 flex-shrink-0 flex items-center justify-between gap-3"
          onClick={e => e.stopPropagation()}>
          {/* Folder dropdown */}
          <select
            value={folder}
            onChange={e => handleFolderChange(e.target.value)}
            className="text-xs px-2 py-1 rounded-lg outline-none cursor-pointer font-medium"
            style={{
              background: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.07)',
              color: textColor,
              border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
            }}>
            <option value="All">All notes</option>
            {allFolders.filter(f => f !== 'All').map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          {/* Creation date */}
          {note.created_at && (
            <span className="text-xs flex-shrink-0"
              style={{ color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)' }}>
              {format(new Date(note.created_at), 'EEE, MMM d yyyy · h:mm a')}
            </span>
          )}
        </div>

        {/* Title + content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); schedule(e.target.value, content, color, pinned, folder) }}
            placeholder="Title"
            className="w-full bg-transparent text-base font-semibold outline-none border-none"
            style={{ color: textColor, caretColor: textColor }}
          />
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); schedule(title, e.target.value, color, pinned, folder) }}
            placeholder="Take a note…"
            className="w-full bg-transparent text-sm outline-none border-none resize-none"
            style={{
              color: dark ? 'rgba(255,255,255,0.88)' : '#333',
              caretColor: textColor,
              minHeight: '220px',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default function Notes() {
  const { user } = useAppStore()
  const userId = user?.id

  const [notes, setNotes]             = useState([])
  const [search, setSearch]           = useState('')
  const [activeFolder, setActiveFolder] = useState('All')
  const [openNote, setOpenNote]       = useState(null)
  const [showFolderInput, setShowFolderInput] = useState(false)
  const [newFolderName, setNewFolderName]     = useState('')
  const [customFolders, setCustomFolders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ft-notes-folders') || '[]') } catch { return [] }
  })

  const allFolders = ['All', ...DEFAULT_FOLDERS, ...customFolders.filter(f => !DEFAULT_FOLDERS.includes(f))]

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    if (!userId || !supabase) return
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    if (error) { console.error('fetchNotes:', error); return }
    if (data) setNotes(data)
  }, [userId])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  // ── Filter ─────────────────────────────────────────────────────
  const filtered = notes.filter(n => {
    const matchSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
    const matchFolder = activeFolder === 'All' || n.folder === activeFolder
    return matchSearch && matchFolder
  })
  const pinned   = filtered.filter(n => n.pinned)
  const unpinned = filtered.filter(n => !n.pinned)

  // ── Create ─────────────────────────────────────────────────────
  const handleCreate = async () => {
    const uid = user?.id
    if (!uid) { console.error('createNote: no userId'); return }
    const newNote = {
      id: crypto.randomUUID(),
      user_id: uid,
      title: '',
      content: '',
      color: '#ffffff',
      pinned: false,
      folder: activeFolder || 'All',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('notes').insert(newNote).select().single()
    if (error) { console.error('createNote error:', error); return }
    // Optimistic: prepend to list immediately, then open editor
    setNotes(prev => [data, ...prev])
    setOpenNote(data)
  }

  // ── Save ───────────────────────────────────────────────────────
  const handleSave = async (id, fields) => {
    if (!supabase) return
    const { error } = await supabase.from('notes').update({
      ...fields,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) { console.error('updateNote:', error); return }
    await fetchNotes()
    setOpenNote(prev => prev?.id === id ? { ...prev, ...fields } : prev)
  }

  // ── Delete ─────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!supabase) return
    await supabase.from('notes').delete().eq('id', id)
    await fetchNotes()
    setOpenNote(null)
  }

  // ── Custom folder ──────────────────────────────────────────────
  const addCustomFolder = () => {
    const name = newFolderName.trim()
    if (!name || allFolders.includes(name)) {
      setShowFolderInput(false); setNewFolderName(''); return
    }
    const updated = [...customFolders, name]
    setCustomFolders(updated)
    localStorage.setItem('ft-notes-folders', JSON.stringify(updated))
    setActiveFolder(name)
    setShowFolderInput(false)
    setNewFolderName('')
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Notes</h1>
      </div>

      {/* ── Folder chips ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {allFolders.map(f => (
          <button key={f} onClick={() => setActiveFolder(f)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: activeFolder === f ? 'var(--brand)' : 'var(--bg-overlay)',
              color: activeFolder === f ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${activeFolder === f ? 'transparent' : 'var(--border)'}`,
            }}>
            {f}
          </button>
        ))}

        {showFolderInput ? (
          <div className="flex items-center gap-1">
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addCustomFolder()
                if (e.key === 'Escape') { setShowFolderInput(false); setNewFolderName('') }
              }}
              placeholder="Folder name"
              autoFocus
              className="px-2 py-1 text-xs rounded-lg border outline-none"
              style={{ background: 'var(--bg-overlay)', borderColor: 'var(--border)', color: 'var(--text-primary)', width: '110px' }}
            />
            <button onClick={addCustomFolder} className="p-1" style={{ color: 'var(--brand)' }}>
              <Check size={13} />
            </button>
            <button onClick={() => { setShowFolderInput(false); setNewFolderName('') }}
              className="p-1" style={{ color: 'var(--text-muted)' }}>
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowFolderInput(true)}
            className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-all"
            style={{ background: 'var(--bg-overlay)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            <Plus size={11} /> Folder
          </button>
        )}
      </div>

      {/* ── Search ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
        style={{ background: 'var(--bg-overlay)', borderColor: 'var(--border)' }}>
        <Search size={15} style={{ color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text-primary)' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      {notes.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No notes yet — tap + to create one
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notes match</p>
        </div>
      ) : (
        <div className="space-y-5 pb-24">
          {pinned.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider mb-2"
                style={{ color: 'var(--text-muted)' }}>
                <Pin size={11} /> Pinned
              </div>
              <div className="columns-2 md:columns-3 gap-3">
                {pinned.map(note => (
                  <NoteCard key={note.id} note={note} onClick={() => setOpenNote({ ...note })} />
                ))}
              </div>
            </section>
          )}
          {unpinned.length > 0 && (
            <section>
              {pinned.length > 0 && (
                <div className="text-xs font-medium uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-muted)' }}>
                  Others
                </div>
              )}
              <div className="columns-2 md:columns-3 gap-3">
                {unpinned.map(note => (
                  <NoteCard key={note.id} note={note} onClick={() => setOpenNote({ ...note })} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── FAB ──────────────────────────────────────────────────── */}
      <button
        onClick={handleCreate}
        className="fixed bottom-24 right-5 md:bottom-8 md:right-8 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-30"
        style={{ background: 'var(--brand)', color: '#fff' }}>
        <Plus size={24} />
      </button>

      {/* ── Editor modal ─────────────────────────────────────────── */}
      {openNote && (
        <NoteEditor
          note={openNote}
          allFolders={allFolders}
          onClose={() => setOpenNote(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          onFolderMove={newFolder => setActiveFolder(newFolder)}
        />
      )}
    </div>
  )
}
