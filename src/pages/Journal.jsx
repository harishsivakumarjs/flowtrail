import { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { format } from 'date-fns'
import {
  Save, Plus, Trash2, ChevronLeft,
  Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import {
  useJournalEntries,
  createJournalEntry, updateJournalEntry, deleteJournalEntry,
} from '@/hooks/useJournal'
import { TODAY } from '@/lib/utils'

function groupByMonth(entries) {
  const groups = {}
  entries.forEach(entry => {
    const key = format(new Date(entry.entry_date + 'T00:00'), 'MMMM yyyy')
    if (!groups[key]) groups[key] = []
    groups[key].push(entry)
  })
  return groups
}

function ToolbarBtn({ active, onClick, title, children }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className="p-1.5 rounded-lg transition-colors"
      style={{
        background: active ? 'var(--brand)' : 'transparent',
        color: active ? '#fff' : 'var(--text-secondary)',
      }}>
      {children}
    </button>
  )
}

function EditorToolbar({ editor }) {
  if (!editor) return null
  return (
    <div className="flex items-center gap-0.5 px-4 md:px-8 py-2 border-b flex-shrink-0"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
      <ToolbarBtn
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold">
        <Bold size={14} />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic">
        <Italic size={14} />
      </ToolbarBtn>
      <div className="w-px h-4 mx-1 flex-shrink-0" style={{ background: 'var(--border)' }} />
      <ToolbarBtn
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1">
        <Heading1 size={14} />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2">
        <Heading2 size={14} />
      </ToolbarBtn>
      <div className="w-px h-4 mx-1 flex-shrink-0" style={{ background: 'var(--border)' }} />
      <ToolbarBtn
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list">
        <List size={14} />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list">
        <ListOrdered size={14} />
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Blockquote">
        <Quote size={14} />
      </ToolbarBtn>
    </div>
  )
}

function EntryItem({ entry, isActive, onClick }) {
  const isToday = entry.entry_date === TODAY()
  const dateLabel = isToday
    ? 'Today'
    : format(new Date(entry.entry_date + 'T00:00'), 'MMM d')

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
      style={{
        background: isActive ? 'var(--brand)' : 'transparent',
      }}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium"
          style={{ color: isActive ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)' }}>
          {dateLabel}
        </span>
        <span className="text-xs flex-shrink-0"
          style={{ color: isActive ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)' }}>
          {entry.word_count || 0}w
        </span>
      </div>
      <div className="text-xs mt-0.5 truncate font-medium"
        style={{ color: isActive ? '#fff' : 'var(--text-primary)' }}>
        {entry.title || 'Untitled'}
      </div>
    </button>
  )
}

function EntrySidebar({ entries, selectedId, onSelect, onNew }) {
  const groups = groupByMonth(entries)
  const monthKeys = Object.keys(groups).sort((a, b) => {
    return new Date(groups[b][0].entry_date) - new Date(groups[a][0].entry_date)
  })

  return (
    <aside className="flex flex-col border-r flex-shrink-0 overflow-hidden"
      style={{ width: '240px', borderColor: 'var(--border)', background: 'var(--sidebar-bg)' }}>
      <div className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Journal</span>
        <button
          onClick={onNew}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium"
          style={{ background: 'var(--brand)', color: '#fff' }}>
          <Plus size={12} /> New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {entries.length === 0 && (
          <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>
            No entries yet
          </p>
        )}
        {monthKeys.map(month => (
          <div key={month}>
            <div className="text-xs font-semibold uppercase tracking-wider px-3 mb-1.5"
              style={{ color: 'var(--text-muted)' }}>
              {month}
            </div>
            <div className="space-y-0.5">
              {groups[month].map(entry => (
                <EntryItem
                  key={entry.id}
                  entry={entry}
                  isActive={selectedId === entry.id}
                  onClick={() => onSelect(entry)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

function MobileEntryList({ entries, selectedId, onSelect, onNew }) {
  const groups = groupByMonth(entries)
  const monthKeys = Object.keys(groups).sort((a, b) => {
    return new Date(groups[b][0].entry_date) - new Date(groups[a][0].entry_date)
  })

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--sidebar-bg)' }}>
        <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Journal</span>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium"
          style={{ background: 'var(--brand)', color: '#fff' }}>
          <Plus size={14} /> New entry
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {entries.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No entries yet — tap New entry to start</p>
          </div>
        )}
        {monthKeys.map(month => (
          <div key={month}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-muted)' }}>
              {month}
            </div>
            <div className="space-y-1">
              {groups[month].map(entry => (
                <button
                  key={entry.id}
                  onClick={() => onSelect(entry)}
                  className="w-full text-left px-4 py-3 rounded-xl transition-colors"
                  style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {entry.entry_date === TODAY() ? 'Today' : format(new Date(entry.entry_date + 'T00:00'), 'MMM d, yyyy')}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {entry.word_count || 0} words
                    </span>
                  </div>
                  <div className="text-sm font-medium mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>
                    {entry.title || 'Untitled'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Journal() {
  const { user } = useAppStore()
  const userId = user?.id
  const [selectedId, setSelectedId] = useState(null)
  const [entryTitle, setEntryTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [mobileView, setMobileView] = useState('list')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const autoSaveRef   = useRef(null)
  // Refs so the auto-save interval always reads current values
  const selectedIdRef  = useRef(selectedId)
  const entryTitleRef  = useRef(entryTitle)
  useEffect(() => { selectedIdRef.current  = selectedId  }, [selectedId])
  useEffect(() => { entryTitleRef.current  = entryTitle  }, [entryTitle])

  const allEntries = useJournalEntries(userId)
  console.log('entries:', allEntries)
  const selectedEntry = selectedId ? allEntries.find(e => e.id === selectedId) : null

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: '',
    editorProps: {
      attributes: { class: 'tiptap-editor focus:outline-none min-h-[200px]' },
    },
  })

  // Load selected entry into editor
  useEffect(() => {
    if (!editor) return
    if (selectedEntry) {
      editor.commands.setContent(selectedEntry.content || '', false)
      setEntryTitle(selectedEntry.title || '')
    } else {
      editor.commands.setContent('', false)
      setEntryTitle('')
    }
  }, [selectedId, editor])

  // Auto-save every 30s — use refs so stale closures never fire with wrong id/title
  useEffect(() => {
    autoSaveRef.current = setInterval(async () => {
      if (!editor || !userId || editor.isEmpty) return
      const sid = selectedIdRef.current
      const t   = entryTitleRef.current
      if (sid) {
        await updateJournalEntry(sid, { content: editor.getHTML(), title: t })
      }
    }, 30000)
    return () => clearInterval(autoSaveRef.current)
  }, [editor, userId])

  const handleSave = useCallback(async (silent = false) => {
    if (!editor || !userId) return
    if (!silent) setSaving(true)
    const content = editor.getHTML()

    if (selectedId) {
      await updateJournalEntry(selectedId, { content, title: entryTitle })
    } else {
      const newId = await createJournalEntry({
        userId, date: TODAY(), content, title: entryTitle, prompt: '',
      })
      if (newId) setSelectedId(newId)
    }

    if (!silent) {
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }, [editor, userId, selectedId, entryTitle])

  const handleNew = async () => {
    if (!userId) return
    const newId = await createJournalEntry({
      userId, date: TODAY(), content: '', title: '', prompt: '',
    })
    if (newId) {
      setSelectedId(newId)
      editor?.commands.setContent('', false)
      setEntryTitle('')
    }
    if (isMobile) setMobileView('editor')
  }

  const handleSelect = (entry) => {
    setSelectedId(entry.id)
    if (isMobile) setMobileView('editor')
  }

  const handleDelete = async () => {
    if (!selectedId) return
    if (!confirm('Delete this journal entry?')) return
    await deleteJournalEntry(selectedId)
    setSelectedId(null)
    editor?.commands.setContent('', false)
    setEntryTitle('')
    if (isMobile) setMobileView('list')
  }

  const wordCount = editor
    ? editor.getText().trim().split(/\s+/).filter(Boolean).length
    : 0

  const entryDate = selectedEntry?.entry_date

  // ── Mobile list view ──────────────────────────────────────────
  if (isMobile && mobileView === 'list') {
    return (
      <MobileEntryList
        entries={allEntries}
        selectedId={selectedId}
        onSelect={handleSelect}
        onNew={handleNew}
      />
    )
  }

  // ── Mobile editor view ────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 112px)' }}>
        {/* Mobile header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
          <button
            onClick={() => { handleSave(true); setMobileView('list') }}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
            style={{ color: 'var(--text-secondary)' }}>
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
            {entryDate
              ? format(new Date(entryDate + 'T00:00'), 'MMMM d, yyyy')
              : 'New entry'}
          </span>
          {saved && <span className="text-xs font-medium" style={{ color: 'var(--green)' }}>Saved</span>}
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="p-1.5 rounded-lg"
            style={{ background: 'var(--brand)', color: '#fff' }}>
            <Save size={15} />
          </button>
        </div>

        <EditorToolbar editor={editor} />

        {/* Title */}
        <div className="px-5 pt-5 pb-2 flex-shrink-0">
          <input
            value={entryTitle}
            onChange={e => setEntryTitle(e.target.value)}
            placeholder="Untitled"
            className="w-full bg-transparent outline-none border-none text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          />
          {entryDate && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {format(new Date(entryDate + 'T00:00'), 'EEEE, MMMM d, yyyy')}
            </p>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <EditorContent editor={editor} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
          {selectedId ? (
            <button onClick={handleDelete} style={{ color: 'var(--red)' }} title="Delete entry">
              <Trash2 size={15} />
            </button>
          ) : <div />}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{wordCount} words</span>
        </div>
      </div>
    )
  }

  // ── Desktop layout ────────────────────────────────────────────
  return (
    <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 0px)' }}>
      <EntrySidebar
        entries={allEntries}
        selectedId={selectedId}
        onSelect={handleSelect}
        onNew={handleNew}
      />

      {/* Editor pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <EditorToolbar editor={editor} />

        {/* Title + date */}
        <div className="px-10 pt-10 pb-4 flex-shrink-0">
          <input
            value={entryTitle}
            onChange={e => setEntryTitle(e.target.value)}
            placeholder="Untitled"
            className="w-full bg-transparent outline-none border-none font-bold"
            style={{ color: 'var(--text-primary)', fontSize: '2rem', lineHeight: '1.2' }}
          />
          {entryDate ? (
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              {format(new Date(entryDate + 'T00:00'), 'EEEE, MMMM d, yyyy')}
            </p>
          ) : (
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              Select an entry from the sidebar or create a new one
            </p>
          )}
        </div>

        {/* Tiptap content */}
        <div className="flex-1 overflow-y-auto px-10 pb-6">
          <EditorContent editor={editor} />
        </div>

        {/* Footer bar */}
        <div className="flex items-center justify-between px-10 py-3 border-t flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
          <div className="flex items-center gap-2">
            {selectedId && (
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
                style={{ color: 'var(--red)' }}
                title="Delete entry">
                <Trash2 size={15} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-xs font-medium" style={{ color: 'var(--green)' }}>Saved ✓</span>
            )}
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {wordCount} words
            </span>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="btn btn-primary text-sm flex items-center gap-1.5">
              <Save size={14} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
