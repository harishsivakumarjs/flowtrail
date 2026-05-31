import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function StickyNote({ userId }) {
  const [note,       setNote]       = useState('')
  const [loaded,     setLoaded]     = useState(false)
  const saveTimer = useRef(null)

  // Load from Supabase user metadata on mount
  useEffect(() => {
    if (!userId || !supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.quick_note_text !== undefined) {
        setNote(user.user_metadata.quick_note_text || '')
      }
      setLoaded(true)
    })
  }, [userId])

  // Debounced save to Supabase
  const scheduleS = (text) => {
    if (!userId || !supabase || !loaded) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      supabase.auth.updateUser({ data: { quick_note_text: text } })
    }, 800)
  }

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const handleChange = (e) => {
    setNote(e.target.value)
    scheduleS(e.target.value)
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)' }}>
      <div className="flex items-center px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>📌 Quick note</span>
      </div>
      <textarea
        className="w-full resize-none bg-transparent outline-none text-sm leading-relaxed px-3 py-2.5"
        style={{ color: 'var(--text-primary)', minHeight: 110, caretColor: 'var(--brand)' }}
        placeholder="Write anything here…"
        value={note}
        onChange={handleChange}
      />
    </div>
  )
}
