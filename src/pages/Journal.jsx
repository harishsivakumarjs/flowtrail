import { useState, useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { format } from 'date-fns'
import { Save, ChevronLeft, ChevronRight, BookOpen, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useJournalEntry, useJournalEntries, saveJournalEntry } from '@/hooks/useJournal'
import { TODAY, displayDay } from '@/lib/utils'
import { getPromptForDate, PROMPTS } from '@/lib/prompts'

function EntryHistory({ entries, activeDate, onSelect }) {
  return (
    <div className="space-y-1">
      {entries.map(entry => (
        <button
          key={entry.id}
          onClick={() => onSelect(entry.entry_date)}
          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all
            ${activeDate === entry.entry_date
              ? 'bg-[var(--brand)] text-white'
              : 'hover:bg-[var(--bg-overlay)] text-[var(--text-secondary)]'
            }`}
        >
          <div className="font-medium text-xs">
            {format(new Date(entry.entry_date + 'T00:00'), 'MMM d, yyyy')}
          </div>
          <div className={`text-xs mt-0.5 truncate ${activeDate === entry.entry_date ? 'text-white/70' : ''}`}
            style={{ color: activeDate === entry.entry_date ? undefined : 'var(--text-muted)' }}>
            {entry.word_count} words ·{' '}
            {entry.content.replace(/<[^>]*>/g, '').slice(0, 40)}…
          </div>
        </button>
      ))}
    </div>
  )
}

export default function Journal() {
  const { user } = useAppStore()
  const userId = user?.id
  const [activeDate, setActiveDate] = useState(TODAY())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState(() => getPromptForDate(TODAY()))

  const entry   = useJournalEntry(userId, activeDate)
  const entries = useJournalEntries(userId)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your story for today… there are no rules here.',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor focus:outline-none',
      },
    },
  })

  // Load entry into editor when date or entry changes
  useEffect(() => {
    if (!editor) return
    const content = entry?.content || ''
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content, false)
    }
    setCurrentPrompt(entry?.prompt || getPromptForDate(activeDate))
  }, [entry, activeDate, editor])

  const handleSave = useCallback(async () => {
    if (!editor || !userId) return
    setSaving(true)
    await saveJournalEntry({
      userId,
      date:    activeDate,
      content: editor.getHTML(),
      prompt:  currentPrompt,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [editor, userId, activeDate, currentPrompt])

  // Auto-save every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (editor && userId && !editor.isEmpty) handleSave()
    }, 30000)
    return () => clearInterval(interval)
  }, [handleSave, editor, userId])

  const goDay = (dir) => {
    const d = new Date(activeDate + 'T00:00')
    d.setDate(d.getDate() + dir)
    const ds = format(d, 'yyyy-MM-dd')
    if (ds > TODAY()) return
    setActiveDate(ds)
  }

  const wordCount = editor
    ? editor.getText().trim().split(/\s+/).filter(Boolean).length
    : 0

  const refreshPrompt = () => {
    const idx = Math.floor(Math.random() * PROMPTS.length)
    setCurrentPrompt(PROMPTS[idx])
  }

  return (
    <div className="h-full flex" style={{ maxHeight: 'calc(100vh - 60px)' }}>
      {/* Sidebar — entry history (desktop) */}
      <div className="hidden md:flex flex-col w-64 border-r flex-shrink-0 overflow-hidden"
        style={{ borderColor: 'var(--border)', background: 'var(--sidebar-bg)' }}>
        <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <BookOpen size={15} style={{ color: 'var(--brand)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Past entries
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {entries.length} entries written
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <button
            onClick={() => setActiveDate(TODAY())}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm mb-2 transition-all font-medium
              ${activeDate === TODAY()
                ? 'bg-[var(--brand)] text-white'
                : 'hover:bg-[var(--bg-overlay)]'}`}
            style={{ color: activeDate === TODAY() ? undefined : 'var(--brand)' }}
          >
            Today
          </button>
          <EntryHistory entries={entries} activeDate={activeDate} onSelect={setActiveDate} />
        </div>
      </div>

      {/* Main editor */}
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
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {wordCount} words
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
            {saved && (
              <span className="text-xs" style={{ color: 'var(--green)' }}>Saved ✓</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary text-sm"
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Prompt card */}
        <div className="px-4 md:px-8 pt-5 flex-shrink-0">
          <div className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: 'color-mix(in srgb, var(--brand) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 20%, transparent)' }}>
            <div className="flex-1">
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--brand)' }}>
                Today's prompt
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {currentPrompt}
              </p>
            </div>
            <button
              onClick={refreshPrompt}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)] flex-shrink-0 mt-0.5"
              style={{ color: 'var(--brand)' }}
              title="Get a different prompt"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
