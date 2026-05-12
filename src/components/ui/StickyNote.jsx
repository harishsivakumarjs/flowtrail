import { useState, useEffect } from 'react'

const COLORS = [
  { id: 'yellow', bg: '#FEF08A', text: '#713F12', border: '#EAB308' },
  { id: 'blue',   bg: '#BAE6FD', text: '#0C4A6E', border: '#0EA5E9' },
  { id: 'green',  bg: '#BBF7D0', text: '#14532D', border: '#22C55E' },
  { id: 'pink',   bg: '#FBCFE8', text: '#831843', border: '#EC4899' },
  { id: 'purple', bg: '#DDD6FE', text: '#4C1D95', border: '#8B5CF6' },
  { id: 'orange', bg: '#FED7AA', text: '#7C2D12', border: '#F97316' },
]

const STORAGE_KEY = 'flowtrail-sticky-note'

export default function StickyNote() {
  const [note,    setNote]    = useState(() => localStorage.getItem(STORAGE_KEY + '-text') || '')
  const [colorId, setColorId] = useState(() => localStorage.getItem(STORAGE_KEY + '-color') || 'yellow')
  const [showColors, setShowColors] = useState(false)

  const color = COLORS.find(c => c.id === colorId) || COLORS[0]

  useEffect(() => { localStorage.setItem(STORAGE_KEY + '-text', note) }, [note])
  useEffect(() => { localStorage.setItem(STORAGE_KEY + '-color', colorId) }, [colorId])

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm"
      style={{ background: color.bg, border: `1.5px solid ${color.border}` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2"
        style={{ background: color.border + '33' }}>
        <span className="text-xs font-semibold" style={{ color: color.text }}>📌 Quick note</span>
        <div className="relative">
          <button onClick={() => setShowColors(v => !v)}
            className="w-5 h-5 rounded-full border-2 shadow-sm"
            style={{ background: color.bg, borderColor: color.border }} />
          {showColors && (
            <div className="absolute right-0 top-7 flex gap-1.5 p-2 rounded-xl shadow-lg z-50"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
              {COLORS.map(c => (
                <button key={c.id}
                  onClick={() => { setColorId(c.id); setShowColors(false) }}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: c.bg, borderColor: c.border,
                    outline: colorId === c.id ? `2px solid ${c.border}` : 'none',
                    outlineOffset: 2 }} />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Text area */}
      <textarea
        className="w-full resize-none bg-transparent outline-none text-sm leading-relaxed px-3 py-2.5"
        style={{ color: color.text, minHeight: 110, caretColor: color.text }}
        placeholder="Write anything here…"
        value={note}
        onChange={e => setNote(e.target.value)}
        onClick={() => setShowColors(false)}
      />
    </div>
  )
}