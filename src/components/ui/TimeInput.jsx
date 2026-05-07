import { useState, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export default function TimeInput({ value, onChange }) {
  const [hours, setHours]   = useState('12')
  const [minutes, setMinutes] = useState('00')
  const [period, setPeriod]  = useState('AM')
  const minutesRef = useRef(null)

  useEffect(() => {
    if (!value) { setHours('12'); setMinutes('00'); setPeriod('AM'); return }
    const [h, m] = value.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    setHours(String(h12).padStart(2, '0'))
    setMinutes(String(m).padStart(2, '0'))
    setPeriod(h >= 12 ? 'PM' : 'AM')
  }, [value])

  const emit = (h, m, p) => {
    let h24 = parseInt(h)
    if (p === 'AM' && h24 === 12) h24 = 0
    if (p === 'PM' && h24 !== 12) h24 += 12
    onChange(`${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }

  const adjH = (d) => {
    const cur = parseInt(hours) || 12
    const next = d > 0 ? (cur % 12) + 1 : cur === 1 ? 12 : cur - 1
    const ns = String(next).padStart(2, '0')
    setHours(ns); emit(ns, minutes, period)
  }

  const adjM = (d) => {
    const cur = parseInt(minutes) || 0
    const next = ((cur + d * 5) + 60) % 60
    const ns = String(next).padStart(2, '0')
    setMinutes(ns); emit(hours, ns, period)
  }

  const togP = () => {
    const np = period === 'AM' ? 'PM' : 'AM'
    setPeriod(np); emit(hours, minutes, np)
  }

  const onHChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-2)
    setHours(v)
    const n = parseInt(v)
    if (n >= 1 && n <= 12) {
      emit(String(n).padStart(2, '0'), minutes, period)
      if (v.length === 2) minutesRef.current?.select()
    }
  }

  const onMChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-2)
    setMinutes(v)
    const n = parseInt(v)
    if (!isNaN(n) && n >= 0 && n <= 59) {
      emit(hours, String(n).padStart(2, '0'), period)
    }
  }

  const btn = (fn) => (
    <button type="button" onClick={fn}
      className="p-0.5 rounded hover:bg-[var(--bg-raised)] transition-colors"
      style={{ color: 'var(--text-muted)', lineHeight: 1 }}>
    </button>
  )

  const numStyle = {
    width: 28, background: 'transparent', border: 'none', outline: 'none',
    textAlign: 'center', fontSize: 15, fontWeight: 600,
    color: 'var(--text-primary)', fontFamily: 'inherit', padding: 0,
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl"
        style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)' }}>

        {/* Hours */}
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => adjH(1)} className="p-0.5 rounded hover:bg-[var(--bg-raised)]" style={{ color: 'var(--text-muted)', lineHeight:1 }}>
            <ChevronUp size={12} />
          </button>
          <input style={numStyle} value={hours} onChange={onHChange}
            onFocus={e => e.target.select()} maxLength={2} />
          <button type="button" onClick={() => adjH(-1)} className="p-0.5 rounded hover:bg-[var(--bg-raised)]" style={{ color: 'var(--text-muted)', lineHeight:1 }}>
            <ChevronDown size={12} />
          </button>
        </div>

        <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => adjM(1)} className="p-0.5 rounded hover:bg-[var(--bg-raised)]" style={{ color: 'var(--text-muted)', lineHeight:1 }}>
            <ChevronUp size={12} />
          </button>
          <input ref={minutesRef} style={numStyle} value={minutes} onChange={onMChange}
            onFocus={e => e.target.select()} maxLength={2} />
          <button type="button" onClick={() => adjM(-1)} className="p-0.5 rounded hover:bg-[var(--bg-raised)]" style={{ color: 'var(--text-muted)', lineHeight:1 }}>
            <ChevronDown size={12} />
          </button>
        </div>

        {/* AM/PM */}
        <div className="flex flex-col gap-0.5 ml-1">
          {['AM','PM'].map(p => (
            <button key={p} type="button" onClick={() => { setPeriod(p); emit(hours, minutes, p) }}
              className="px-1.5 py-0.5 rounded text-xs font-semibold transition-all"
              style={{
                background: period === p ? 'var(--brand)' : 'transparent',
                color: period === p ? '#fff' : 'var(--text-muted)',
                fontSize: 10,
              }}>{p}</button>
          ))}
        </div>
      </div>

      {value && (
        <button type="button" onClick={() => { setHours('12'); setMinutes('00'); setPeriod('AM'); onChange('') }}
          className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
      )}
    </div>
  )
}