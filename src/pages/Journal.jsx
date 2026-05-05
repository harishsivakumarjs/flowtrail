import { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { format, subDays, addDays } from 'date-fns'
import { Save, ChevronLeft, ChevronRight, BookOpen,
         RefreshCw, Plus, Trash2, Edit2, X, Check } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import {
  useJournalEntries, useJournalEntriesForDate,
  createJournalEntry, updateJournalEntry, deleteJournalEntry
} from '@/hooks/useJournal'
import { TODAY, displayDay } from '@/lib/utils'
import { getPromptForDate, PROMPTS } from '@/lib/prompts'

// ── Entry card in the list ───────────────────────────────────
function EntryCard({ entry, isActive, onClick, onDelete }) {
  const preview = entry.content.replace(/<[^>]*>/g, '').slice(0, 60)
  const time    = entry.created_at
    ? format(new Date(entry.created_at), 'h:mm a')
    : ''

  return (
    <div
      onClick={onClick}
      className="group px-3 py-2.5 rounded-xl cursor-pointer transition-all relative"
      style={{
        background: isActive ? 'var(--brand)' : 'var(--bg-overlay)',
        border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
      }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {entry.title && (
            <div className="text-xs font-semibold truncate mb-0.5"
              style={{ color: isActive ? '#fff' : 'var(--text-primary)' }}>
              {entry.title}
            </div>
          )}
          <div className="text-xs truncate"
            style={{ color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' }}>
            {preview || 'Empty entry…'}
          </div>
          <div className="text-xs mt-0.5"
            style={{ color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>
            {time} · {entry.word_count || 0} words
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(entry) }}
          className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          style={{ color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Date sidebar ─────────────────────────────────────────────
function DateSidebar({ entries, activeDate, activeEntryId, onSelectDate, onSelectEntry, onNewEntry }) {
  // Group entries by date
  const byDate = {}
  entries.forEach(e => {
    if (!byDate[e.entry_date]) byDate[e.entry_date] = []
    byDate[e.entry_date].push(e)
  })

  const handleDelete = async (entry) => {
    if (!confirm('Delete this journal entry?')) return
    await deleteJournalEntry(entry.id, entry.user_id)
  }

  return (
    <div className="hidden md:flex flex-col w-64 border-r flex-shrink-0 overflow-hidden"
      style={{ borderColor: 'var(--border)', background: 'var(--sidebar-bg)' }}>
      <div className="px-4 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <BookOpen size={15} style={{ color: 'var(--brand)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Journal</span>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {entries.length} entries
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Today shortcut */}
        <div>
          <button
            onClick={() => onSelectDate(TODAY())}
            className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all mb-1"
            style={{
              background: activeDate === TODAY() && !activeEntryId ? 'var(--brand)' : 'transparent',
              color: activeDate === TODAY() && !activeEntryId ? '#fff' : 'var(--brand)',
            }}>
            + New entry for today
          </button>
        </div>

        {/* Entries grouped by date */}
        {Object.entries(byDate)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, dateEntries]) => (
            <div key={date}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1.5 px-1"
                style={{ color: 'var(--text-muted)' }}>
                {date === TODAY()
                  ? 'Today'
                  : format(new Date(date + 'T00:00'), 'MMM d, yyyy')}
                <span className="ml-1.5 font-normal">· {dateEntries.length}</span>
              </div>
              <div className="space-y-1.5">
                {dateEntries.map(entry => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    isActive={activeEntryId === entry.id}
                    onClick={() => onSelectEntry(entry)}
                    onDelete={handleDelete}
                  />
                ))}
                {/* Add another entry for this date */}
                <button
                  onClick={() => onNewEntry(date)}
                  className="w-full text-left px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  <Plus size={11} /> Add entry
                </button>
              </div>
            </div>
          ))
        }

        {entries.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
            No entries yet — start writing
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main Journal page ─────────────────────────────────────────
export default function Journal() {
  const { user }    = useAppStore()
  const userId      = user?.id
  const [activeDate, setActiveDate]           = useState(TODAY())
  const [activeEntryId, setActiveEntryId]     = useState(null)  // null = new entry mode
  const [entryTitle, setEntryTitle]           = useState('')
  const [saving, setSaving]                   = useState(false)
  const [saved, setSaved]                     = useState(false)
  const [currentPrompt, setCurrentPrompt]     = useState(() => getPromptForDate(TODAY()))
  const [skipPrompt, setSkipPrompt]           = useState(false)
  const autoSaveRef                           = useRef(null)

  const allEntries         = useJournalEntries(userId)
  const todayEntries       = useJournalEntriesForDate(userId, activeDate)

  // The entry being edited (if activeEntryId set)
  const activeEntry = activeEntryId
    ? allEntries.find(e => e.id === activeEntryId)
    : null

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your thoughts for today… no rules, just you.',
      }),
    ],
    content: '',
    editorProps: {
      attributes: { class: 'tiptap-editor focus:outline-none' },
    },
  })

  // Load content when switching entries
  useEffect(() => {
    if (!editor) return
    if (activeEntry) {
      editor.commands.setContent(activeEntry.content || '', false)
      setEntryTitle(activeEntry.title || '')
      setCurrentPrompt(activeEntry.prompt || getPromptForDate(activeDate))
    } else {
      editor.commands.setContent('', false)
      setEntryTitle('')
      setCurrentPrompt(getPromptForDate(activeDate))
      setSkipPrompt(false)
    }
  }, [activeEntryId, activeDate, editor])

  // Auto-save every 30s
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (editor && userId && !editor.isEmpty) handleSave(true)
    }, 30000)
    return () => clearInterval(autoSaveRef.current)
  }, [editor, userId, activeEntryId, activeDate, entryTitle])

  const handleSave = useCallback(async (silent = false) => {
    if (!editor || !userId || editor.isEmpty) return
    if (!silent) setSaving(true)
    const content = editor.getHTML()

    if (activeEntryId) {
      await updateJournalEntry(activeEntryId, { content, title: entryTitle, userId })
    } else {
      const newId = await createJournalEntry({
        userId, date: activeDate, content,
        prompt: skipPrompt ? '' : currentPrompt,
        title: entryTitle,
      })
      setActiveEntryId(newId)
    }

    if (!silent) {
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }, [editor, userId, activeEntryId, activeDate, entryTitle, currentPrompt, skipPrompt])

  const handleNewEntry = (date) => {
    setActiveDate(date)
    setActiveEntryId(null)
    setEntryTitle('')
    setCurrentPrompt(getPromptForDate(date))
    setSkipPrompt(false)
  }

  const handleSelectEntry = (entry) => {
    setActiveDate(entry.entry_date)
    setActiveEntryId(entry.id)
  }

  const handleDeleteActive = async () => {
    if (!activeEntryId) return
    if (!confirm('Delete this journal entry?')) return
    await deleteJournalEntry(activeEntryId, userId)
    setActiveEntryId(null)
    editor?.commands.setContent('', false)
    setEntryTitle('')
  }

  const goDay = (dir) => {
    const d = new Date(activeDate + 'T00:00')
    d.setDate(d.getDate() + dir)
    const ds = format(d, 'yyyy-MM-dd')
    if (ds > TODAY()) return
    handleNewEntry(ds)
  }

  const wordCount = editor ? editor.getText().trim().split(/\s+/).filter(Boolean).length : 0
  const isEditing = !!activeEntryId

  return (
    <div className="h-full flex" style={{ maxHeight: 'calc(100vh - 60px)' }}>
      {/* Sidebar */}
      <DateSidebar
        entries={allEntries}
        activeDate={activeDate}
        activeEntryId={activeEntryId}
        onSelectDate={handleNewEntry}
        onSelectEntry={handleSelectEntry}
        onNewEntry={handleNewEntry}
      />

      {/* Editor pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => goDay(-1)} className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
              style={{ color: 'var(--text-muted)' }}>
              <ChevronLeft size={17} />
            </button>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {activeDate === TODAY() ? 'Today' : format(new Date(activeDate + 'T00:00'), 'MMM d, yyyy')}
                {isEditing && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'color-mix(in srgb, var(--brand) 12%, transparent)', color: 'var(--brand)' }}>
                    Editing
                  </span>
                )}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {wordCount} words
                {todayEntries.length > 0 && ` · ${todayEntries.length} entr${todayEntries.length === 1 ? 'y' : 'ies'} today`}
              </div>
            </div>
            {activeDate < TODAY() && (
              <button onClick={() => goDay(1)} className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
                style={{ color: 'var(--text-muted)' }}>
                <ChevronRight size={17} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* New entry button */}
            <button onClick={() => handleNewEntry(activeDate)}
              className="btn btn-ghost text-sm gap-1.5">
              <Plus size={14} /> New entry
            </button>
            {/* Delete active entry */}
            {isEditing && (
              <button onClick={handleDeleteActive}
                className="btn btn-ghost p-2" style={{ color: 'var(--red)' }}
                title="Delete this entry">
                <Trash2 size={15} />
              </button>
            )}
            {saved && <span className="text-xs" style={{ color: 'var(--green)' }}>Saved ✓</span>}
            <button onClick={() => handleSave(false)} disabled={saving}
              className="btn btn-primary text-sm">
              <Save size={14} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Optional title input */}
        <div className="px-4 md:px-8 pt-4 flex-shrink-0">
          <input
            className="w-full bg-transparent text-xl font-semibold outline-none border-none placeholder:text-[var(--text-muted)]"
            placeholder="Entry title (optional)"
            value={entryTitle}
            onChange={e => setEntryTitle(e.target.value)}
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        {/* Prompt card */}
        {!skipPrompt && (
          <div className="px-4 md:px-8 pt-3 flex-shrink-0">
            <div className="rounded-xl p-3 flex items-start gap-3"
              style={{ background: 'color-mix(in srgb, var(--brand) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 15%, transparent)' }}>
              <div className="flex-1">
                <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--brand)' }}>Today's prompt</div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{currentPrompt}</p>
              </div>
              <button onClick={() => setSkipPrompt(true)}
                className="p-1 rounded-lg flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Today's other entries (quick nav) */}
        {todayEntries.length > 0 && (
          <div className="px-4 md:px-8 pt-3 flex-shrink-0">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleNewEntry(activeDate)}
                className="text-xs px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: !isEditing ? 'var(--brand)' : 'var(--bg-overlay)',
                  color: !isEditing ? '#fff' : 'var(--text-muted)',
                }}>
                + New
              </button>
              {todayEntries.map((e, i) => (
                <button key={e.id} onClick={() => handleSelectEntry(e)}
                  className="text-xs px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: activeEntryId === e.id ? 'var(--brand)' : 'var(--bg-overlay)',
                    color: activeEntryId === e.id ? '#fff' : 'var(--text-muted)',
                  }}>
                  {e.title || `Entry ${i + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}