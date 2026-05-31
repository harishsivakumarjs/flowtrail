import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function MonthYearPicker({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false)
  const [yearInput, setYearInput] = useState(String(value.getFullYear()))
  const containerRef = useRef(null)

  // Sync year input when value changes externally
  useEffect(() => {
    setYearInput(String(value.getFullYear()))
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const currentYear  = value.getFullYear()
  const currentMonth = value.getMonth()

  const selectMonth = (monthIdx) => {
    const yr = parseInt(yearInput, 10)
    const safeYear = isNaN(yr) ? currentYear : yr
    onChange(new Date(safeYear, monthIdx, 1))
    setOpen(false)
  }

  const adjustYear = (delta) => {
    const yr = (parseInt(yearInput, 10) || currentYear) + delta
    setYearInput(String(yr))
  }

  const handleYearKey = (e) => {
    if (e.key === 'Enter') {
      const yr = parseInt(yearInput, 10)
      if (!isNaN(yr) && yr > 1900 && yr < 2200) {
        onChange(new Date(yr, currentMonth, 1))
      }
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="text-sm font-medium px-2 py-0.5 rounded-lg hover:bg-[var(--bg-overlay)] transition-colors"
        style={{ color: 'var(--text-secondary)' }}>
        {format(value, 'MMMM yyyy')}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-xl p-3 w-56"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>

          {/* Year row */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => adjustYear(-1)}
              className="p-1 rounded-lg hover:bg-[var(--bg-overlay)] transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              <ChevronLeft size={15} />
            </button>
            <input
              type="number"
              value={yearInput}
              onChange={e => setYearInput(e.target.value)}
              onKeyDown={handleYearKey}
              className="w-16 text-center text-sm font-semibold outline-none bg-transparent rounded-lg border px-1 py-0.5"
              style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
              min={1900}
              max={2200}
            />
            <button onClick={() => adjustYear(1)}
              className="p-1 rounded-lg hover:bg-[var(--bg-overlay)] transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1">
            {MONTHS.map((m, idx) => {
              const yr = parseInt(yearInput, 10) || currentYear
              const isSelected = idx === currentMonth && yr === currentYear
              return (
                <button
                  key={m}
                  onClick={() => selectMonth(idx)}
                  className="py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-[var(--bg-overlay)]"
                  style={{
                    background: isSelected ? 'var(--brand)' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                  }}>
                  {m}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
