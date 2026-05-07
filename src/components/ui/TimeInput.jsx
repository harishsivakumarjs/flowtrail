import { useState, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

/**
 * TimeInput — supports both typing and scroll/click to change hours and minutes
 * Value format: "HH:MM" (24-hour) or "" for empty
 */
export default function TimeInput({ value, onChange, placeholder = 'HH:MM' }) {
  const [hours, setHours]     = useState('')
  const [minutes, setMinutes] = useState('')
  const [period, setPeriod]   = useState('AM')
  const hoursRef   = useRef(null)
  const minutesRef = useRef(null)

  // Parse incoming value (24h "HH:MM") → 12h display
  useEffect(() => {
    if (!value) { setHours(''); setMinutes(''); setPeriod('AM'); return }
    const [h, m] = value.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    setHours(String(h12).padStart(2, '0'))
    setMinutes(String(m).padStart(2, '0'))
    setPeriod(h >= 12 ? 'PM' : 'AM')
  }, [value])

  const emit = (h, m, p) => {
    if (!h || !m) { onChange(''); return }
    let h24 = parseInt(h)
    if (p === 'AM' && h24 === 12) h24 = 0
    if (p === 'PM' && h24 !== 12) h24 += 12
    onChange(`${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }

  const adjustHours = (dir) => {
    const cur = parseInt(hours) || 12
    const next = dir > 0 ? (cur % 12) + 1 : cur === 1 ? 12 : cur - 1
    const ns = String(next).padStart(2, '0')
    setHours(ns)
    emit(ns, minutes || '00', period)
  }

  const adjustMinutes = (dir) => {
    const cur = parseInt(minutes) || 0
    const next = ((cur + dir * 5) + 60) % 60
    const ns = String(next).padStart(2, '0')
    setMinutes(ns)
    emit(hours || '12', ns, period)
  }

  const togglePeriod = () => {
    const np = period === 'AM' ? 'PM' : 'AM'
    setPeriod(np)
    emit(hours || '12', minutes || '00', np)
  }

  const handleHoursChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-2)
    const n = parseInt(v)
    if (v === '') { setHours(''); return }
    if (n >= 1 && n <= 12) {
      const ns = String(n).padStart(2, '0')
      setHours(ns)
      emit(ns, minutes || '00', period)
      if (v.length === 2) minutesRef.current?.select()
    }
  }

  const handleMinutesChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-2)
    const n = parseInt(v)
    if (v === '') { setMinutes(''); return }
    if (n >= 0 && n <= 59) {
      const ns = String(n).padStart(2, '0')
      setMinutes(ns)
      emit(hours || '12', ns, period)
    }
  }

  const handleScroll = (type, e) => {
    e.preventDefault()
    const dir = e.deltaY < 0 ? 1 : -1
    if (type === 'h') adjustHours(dir)
    else adjustMinutes(dir)
  }

  const inputStyle = {
    width: 40, background: 'transparent', border: 'none', outline: 'none',
    textAlign: 'center', fontSize: 22, fontWeight: 600,
    color: 'var(--text-primary)', fontFamily: 'inherit',
  }

  const chevronBtn = (onClick) => ({
    onClick,
    className: 'p-1 rounded-lg hover:bg-[var(--bg-overlay)] transition-colors cursor-pointer',
    style: { color: 'var(--text-muted)', display: 'flex' }
  })

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1 px-4 py-3 rounded-2xl"
        style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)' }}>

        {/* Hours */}
        <div className="flex flex-col items-center">
          <button {...chevronBtn(() => adjustHours(1))}><ChevronUp size={18} /></button>
          <input
            ref={hoursRef}
            style={inputStyle}
            value={hours}
            onChange={handleHoursChange}
            onWheel={(e) => handleScroll('h', e)}
            onFocus={e => e.target.select()}
            placeholder="12"
            maxLength={2}
          />
          <button {...chevronBtn(() => adjustHours(-1))}><ChevronDown size={18} /></button>
        </div>

        <span className="text-2xl font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <button {...chevronBtn(() => adjustMinutes(1))}><ChevronUp size={18} /></button>
          <input
            ref={minutesRef}
            style={inputStyle}
            value={minutes}
            onChange={handleMinutesChange}
            onWheel={(e) => handleScroll('m', e)}
            onFocus={e => e.target.select()}
            placeholder="00"
            maxLength={2}
          />
          <button {...chevronBtn(() => adjustMinutes(-1))}><ChevronDown size={18} /></button>
        </div>

        {/* AM/PM */}
        <div className="flex flex-col items-center ml-2 gap-1">
          <button
            onClick={() => { if (period !== 'AM') togglePeriod() }}
            className="px-2 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: period === 'AM' ? 'var(--brand)' : 'transparent',
              color: period === 'AM' ? '#fff' : 'var(--text-muted)',
            }}>AM</button>
          <button
            onClick={() => { if (period !== 'PM') togglePeriod() }}
            className="px-2 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: period === 'PM' ? 'var(--brand)' : 'transparent',
              color: period === 'PM' ? '#fff' : 'var(--text-muted)',
            }}>PM</button>
        </div>
      </div>

      {value && (
        <button onClick={() => { setHours(''); setMinutes(''); setPeriod('AM'); onChange('') }}
          className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Clear time
        </button>
      )}
    </div>
  )
}