import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { Search, Plus, Pin, Trash2, X, Check, Edit2, FolderInput } from 'lucide-react'

const DEFAULT_FOLDERS = ['Work', 'Personal', 'Ideas']

// ── Helpers ────────────────────────────────────────────────────
async function loadFolders() {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  const saved = user?.user_metadata?.notes_folders
  return Array.isArray(saved) && saved.length ? saved : null
}

async function saveFoldersRemote(folders) {
  if (!supabase) return
  await supabase.auth.updateUser({ data: { notes_folders: folders } })
}

// ── Note card ──────────────────────────────────────────────────
function NoteCard({ note, allFolders, onClick, onMoveFolder }) {
  const [showMove, setShowMove] = useState(false)
  const preview = note.content.slice(0, 200)

  return (
    <div
      className="rounded-xl p-4 cursor-pointer transition-all hover:shadow-md break-inside-avoid mb-3 relative group"
      style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}
      onClick={onClick}>

      {note.pinned && (
        <div className="mb-1.5"><Pin size={12} style={{ color: 'var(--text-muted)' }} /></div>
      )}

      {/* Folder badge + move button */}
      {note.folder && note.folder !== 'All' && (
        <div className="flex items-center gap-1 mb-1.5">
          <span className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--bg-overlay)', color: 'var(--text-muted)' }}>
            {note.folder}
          </span>
          <button
            onClick={e => { e.stopPropagation(); setShowMove(v => !v) }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--bg-overlay)]"
            title="Move to folder"
            style={{ color: 'var(--text-muted)' }}>
            <FolderInput size={12} />
          </button>
        </div>
      )}
      {(!note.folder || note.folder === 'All') && (
        <button
          onClick={e => { e.stopPropagation(); setShowMove(v => !v) }}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--bg-overlay)]"
          title="Move to folder"
          style={{ color: 'var(--text-muted)' }}>
          <FolderInput size={12} />
        </button>
      )}

      {/* Folder move dropdown */}
      {showMove && (
        <div
          className="absolute left-3 top-10 z-20 rounded-xl shadow-xl py-1 min-w-[130px]"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}
          onClick={e => e.stopPropagation()}>
          {['All', ...allFolders.filter(f => f !== 'All')].map(f => (
            <button key={f}
              onClick={() => { onMoveFolder(note.id, f); setShowMove(false) }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-overlay)] transition-colors"
              style={{ color: note.folder === f ? 'var(--brand)' : 'var(--text-primary)', fontWeight: note.folder === f ? 600 : 400 }}>
              {f === 'All' ? 'No folder' : f}
            </button>
          ))}
        </div>
      )}

      {note.title && (
        <div className="text-sm font-semibold mb-1 leading-snug" style={{ color: 'var(--text-primary)' }}>
          {note.title}
        </div>
      )}
      {preview ? (
        <div className="text-xs leading-relaxed whitespace-pre-wrap line-clamp-6" style={{ color: 'var(--text-secondary)' }}>
          {preview}
        </div>
      ) : !note.title ? (
        <div className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Empty note</div>
      ) : null}
    </div>
  )
}

// ── Note editor (full-screen) ──────────────────────────────────
function NoteEditor({ note, allFolders, onClose, onSave, onDelete, onFolderMove }) {
  const [title,   setTitle]   = useState(note.title || '')
  const [content, setContent] = useState(note.content || '')
  const [pinned,  setPinned]  = useState(note.pinned || false)
  const [folder,  setFolder]  = useState(note.folder || 'All')
  const saveTimer = useRef(null)

  const flush = (t, c, pin, fol) => {
    clearTimeout(saveTimer.current)
    onSave(note.id, { title: t, content: c, color: null, pinned: pin, folder: fol })
  }

  const schedule = (t, c, pin, fol) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => onSave(note.id, { title: t, content: c, color: null, pinned: pin, folder: fol }), 500)
  }

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const handleClose = () => { flush(title, content, pinned, folder); onClose() }

  const handleDelete = () => {
    if (!confirm('Delete this note?')) return
    clearTimeout(saveTimer.current)
    onDelete(note.id)
  }

  const handlePin = () => {
    const next = !pinned
    setPinned(next)
    flush(title, content, next, folder)
  }

  const handleFolderChange = (fol) => {
    setFolder(fol)
    flush(title, content, pinned, fol)
    onFolderMove?.(fol)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={handleClose}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <select
              value={folder}
              onChange={e => handleFolderChange(e.target.value)}
              className="text-xs px-2 py-1 rounded-lg outline-none cursor-pointer font-medium"
              style={{ background: 'var(--bg-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <option value="All">No folder</option>
              {allFolders.filter(f => f !== 'All').map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            {note.created_at && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {format(new Date(note.created_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handlePin} title={pinned ? 'Unpin' : 'Pin'}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: pinned ? 'var(--brand)' : 'var(--text-muted)', background: pinned ? 'var(--bg-overlay)' : 'transparent' }}>
              <Pin size={15} />
            </button>
            <button onClick={handleDelete} className="p-1.5 rounded-lg" style={{ color: 'var(--red)' }}>
              <Trash2 size={15} />
            </button>
            <button onClick={handleClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Title + content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); schedule(e.target.value, content, pinned, folder) }}
            placeholder="Title"
            className="w-full bg-transparent text-base font-semibold outline-none border-none"
            style={{ color: 'var(--text-primary)', caretColor: 'var(--brand)' }}
          />
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); schedule(title, e.target.value, pinned, folder) }}
            placeholder="Take a note…"
            className="w-full bg-transparent text-sm outline-none border-none resize-none flex-1"
            style={{ color: 'var(--text-secondary)', caretColor: 'var(--brand)', minHeight: '220px' }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Main Notes page ────────────────────────────────────────────
export default function Notes() {
  const { user } = useAppStore()
  const userId = user?.id

  const [notes,           setNotes]           = useState([])
  const [search,          setSearch]          = useState('')
  const [activeFolder,    setActiveFolder]    = useState('All')
  const [openNote,        setOpenNote]        = useState(null)
  const [showFolderInput, setShowFolderInput] = useState(false)
  const [newFolderName,   setNewFolderName]   = useState('')
  const [editingFolder,   setEditingFolder]   = useState(null)
  const [editFolderName,  setEditFolderName]  = useState('')
  const [customFolders,   setCustomFolders]   = useState([...DEFAULT_FOLDERS])
  const [foldersReady,    setFoldersReady]    = useState(false)

  const allFolders = ['All', ...customFolders]

  // ── Load folders from Supabase user metadata ───────────────────
  useEffect(() => {
    if (!userId) return
    loadFolders().then(saved => {
      if (saved) setCustomFolders(saved)
      setFoldersReady(true)
    })
  }, [userId])

  // Helper: persist folder list to Supabase + localStorage backup
  const persistFolders = useCallback(async (updated) => {
    setCustomFolders(updated)
    localStorage.setItem('ft-notes-folders', JSON.stringify(updated))
    await saveFoldersRemote(updated)
  }, [])

  // ── Fetch notes ────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    if (!userId || !supabase) return
    const { data, error } = await supabase
      .from('notes').select('*').eq('user_id', userId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    if (error) { console.error('fetchNotes:', error); return }
    if (data) setNotes(data)
  }, [userId])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  // ── Filter ─────────────────────────────────────────────────────
  const filtered = notes.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
                        n.content.toLowerCase().includes(search.toLowerCase())
    const matchFolder = activeFolder === 'All' || n.folder === activeFolder
    return matchSearch && matchFolder
  })
  const pinned   = filtered.filter(n => n.pinned)
  const unpinned = filtered.filter(n => !n.pinned)

  // ── Create ─────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!userId || !supabase) return
    const newNote = {
      id: crypto.randomUUID(), user_id: userId,
      title: '', content: '', color: null, pinned: false,
      folder: activeFolder === 'All' ? 'All' : activeFolder,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('notes').insert(newNote).select().single()
    if (error) { console.error('createNote:', error); return }
    setNotes(prev => [data, ...prev])
    setOpenNote(data)
  }

  // ── Save ───────────────────────────────────────────────────────
  const handleSave = async (id, fields) => {
    if (!supabase) return
    await supabase.from('notes').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
    await fetchNotes()
    setOpenNote(prev => prev?.id === id ? { ...prev, ...fields } : prev)
  }

  // ── Delete note ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!supabase) return
    await supabase.from('notes').delete().eq('id', id)
    await fetchNotes()
    setOpenNote(null)
  }

  // ── Move note to folder (from card) ───────────────────────────
  const handleMoveFolder = async (noteId, targetFolder) => {
    if (!supabase) return
    await supabase.from('notes')
      .update({ folder: targetFolder, updated_at: new Date().toISOString() })
      .eq('id', noteId)
    await fetchNotes()
  }

  // ── Folder management ──────────────────────────────────────────
  const addCustomFolder = async () => {
    const name = newFolderName.trim()
    if (!name || allFolders.includes(name)) { setShowFolderInput(false); setNewFolderName(''); return }
    const updated = [...customFolders, name]
    await persistFolders(updated)
    setActiveFolder(name)
    setShowFolderInput(false)
    setNewFolderName('')
  }

  const deleteFolder = async (name) => {
    if (!window.confirm(`Delete folder "${name}"? Notes inside will move to All.`)) return
    if (userId && supabase) {
      await supabase.from('notes')
        .update({ folder: 'All', updated_at: new Date().toISOString() })
        .eq('user_id', userId).eq('folder', name)
    }
    const updated = customFolders.filter(f => f !== name)
    await persistFolders(updated)
    if (activeFolder === name) setActiveFolder('All')
    await fetchNotes()
  }

  const startRenameFolder = (name) => { setEditingFolder(name); setEditFolderName(name) }

  const commitRenameFolder = async (oldName) => {
    const newName = editFolderName.trim()
    setEditingFolder(null); setEditFolderName('')
    if (!newName || newName === oldName || allFolders.includes(newName)) return
    if (userId && supabase) {
      await supabase.from('notes')
        .update({ folder: newName, updated_at: new Date().toISOString() })
        .eq('user_id', userId).eq('folder', oldName)
    }
    const updated = customFolders.map(f => f === oldName ? newName : f)
    await persistFolders(updated)
    if (activeFolder === oldName) setActiveFolder(newName)
    await fetchNotes()
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Notes</h1>

      {/* ── Folder chips ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setActiveFolder('All')}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
          style={{
            background: activeFolder === 'All' ? 'var(--brand)' : 'var(--bg-overlay)',
            color:      activeFolder === 'All' ? '#fff' : 'var(--text-secondary)',
            border:     `1px solid ${activeFolder === 'All' ? 'transparent' : 'var(--border)'}`,
          }}>All</button>

        {customFolders.map(f => {
          const isActive  = activeFolder === f
          const isEditing = editingFolder === f

          if (isEditing) return (
            <span key={f} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
              style={{ background: 'var(--bg-overlay)', border: '1px solid var(--brand)' }}>
              <input value={editFolderName} onChange={e => setEditFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitRenameFolder(f); if (e.key === 'Escape') { setEditingFolder(null); setEditFolderName('') } }}
                autoFocus className="bg-transparent outline-none"
                style={{ color: 'var(--text-primary)', width: `${Math.max(60, editFolderName.length * 8)}px` }} />
              <button onClick={() => commitRenameFolder(f)} style={{ color: 'var(--brand)' }}><Check size={12} /></button>
              <button onClick={() => { setEditingFolder(null); setEditFolderName('') }} style={{ color: 'var(--text-muted)' }}><X size={12} /></button>
            </span>
          )

          return (
            <span key={f} className="group flex items-center rounded-full text-xs font-medium transition-all"
              style={{ background: isActive ? 'var(--brand)' : 'var(--bg-overlay)', border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}` }}>
              <button onClick={() => setActiveFolder(f)} className="pl-3 pr-1.5 py-1.5"
                style={{ color: isActive ? '#fff' : 'var(--text-secondary)' }}>{f}</button>
              <button onClick={e => { e.stopPropagation(); startRenameFolder(f) }}
                className="p-1 rounded transition-opacity opacity-0 group-hover:opacity-100"
                style={{ color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                <Edit2 size={11} />
              </button>
              <button onClick={e => { e.stopPropagation(); deleteFolder(f) }}
                className="pr-2 pl-0.5 py-1.5 flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                <X size={12} />
              </button>
            </span>
          )
        })}

        {showFolderInput ? (
          <div className="flex items-center gap-1">
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustomFolder(); if (e.key === 'Escape') { setShowFolderInput(false); setNewFolderName('') } }}
              placeholder="Folder name" autoFocus
              className="px-2 py-1 text-xs rounded-lg border outline-none"
              style={{ background: 'var(--bg-overlay)', borderColor: 'var(--border)', color: 'var(--text-primary)', width: '110px' }} />
            <button onClick={addCustomFolder} className="p-1" style={{ color: 'var(--brand)' }}><Check size={13} /></button>
            <button onClick={() => { setShowFolderInput(false); setNewFolderName('') }} className="p-1" style={{ color: 'var(--text-muted)' }}><X size={13} /></button>
          </div>
        ) : (
          <button onClick={() => setShowFolderInput(true)}
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
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search notes…" className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text-primary)' }} />
        {search && <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)' }}><X size={14} /></button>}
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      {notes.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notes yet — tap + to create one</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notes match</p>
        </div>
      ) : (
        <div className="space-y-5 pb-24">
          {pinned.length > 0 && (
            <section>
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                <Pin size={11} /> Pinned
              </div>
              <div className="columns-2 md:columns-3 gap-3">
                {pinned.map(note => (
                  <NoteCard key={note.id} note={note} allFolders={allFolders}
                    onClick={() => setOpenNote({ ...note })}
                    onMoveFolder={handleMoveFolder} />
                ))}
              </div>
            </section>
          )}
          {unpinned.length > 0 && (
            <section>
              {pinned.length > 0 && (
                <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Others</div>
              )}
              <div className="columns-2 md:columns-3 gap-3">
                {unpinned.map(note => (
                  <NoteCard key={note.id} note={note} allFolders={allFolders}
                    onClick={() => setOpenNote({ ...note })}
                    onMoveFolder={handleMoveFolder} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── FAB ──────────────────────────────────────────────────── */}
      <button onClick={handleCreate}
        className="fixed bottom-24 right-5 md:bottom-8 md:right-8 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-30"
        style={{ background: 'var(--brand)', color: '#fff' }}>
        <Plus size={24} />
      </button>

      {/* ── Editor ───────────────────────────────────────────────── */}
      {openNote && (
        <NoteEditor note={openNote} allFolders={allFolders}
          onClose={() => setOpenNote(null)}
          onSave={handleSave} onDelete={handleDelete}
          onFolderMove={newFolder => setActiveFolder(newFolder)} />
      )}
    </div>
  )
}
