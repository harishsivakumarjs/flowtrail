import { useEffect, useRef } from 'react'
import { useDopamineStore } from '@/store/dopamineStore'
import { X } from 'lucide-react'

/** Inline badge — use inside Dashboard header */
export function FocusScoreBadge() {
  const { focusScore } = useDopamineStore()
  const color = focusScore >= 75 ? 'var(--green)' : focusScore >= 40 ? 'var(--amber)' : 'var(--red)'
  const label = focusScore >= 75 ? 'Focused' : focusScore >= 40 ? 'Distracted' : 'Off track'

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
      style={{ background: 'var(--bg-overlay)', color }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      Focus {focusScore} · {label}
    </div>
  )
}

/** Warning toasts only — rendered once in AppShell */
export default function FocusScore() {
  const { recordActivity, recordTabSwitch, tickInactive, warnings, dismissWarning } = useDopamineStore()
  const timer = useRef(null)

  useEffect(() => {
    const onActivity = () => recordActivity()
    window.addEventListener('mousemove', onActivity)
    window.addEventListener('keydown',   onActivity)
    window.addEventListener('click',     onActivity)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) recordTabSwitch()
    })
    timer.current = setInterval(tickInactive, 1000)
    return () => {
      window.removeEventListener('mousemove', onActivity)
      window.removeEventListener('keydown',   onActivity)
      window.removeEventListener('click',     onActivity)
      clearInterval(timer.current)
    }
  }, [])

  if (!warnings.length) return null

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
      {warnings.slice(0, 2).map(w => (
        <div key={w.time}
          className="flex items-start gap-2 px-3 py-2.5 rounded-xl shadow-lg animate-slide-up"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
          <span className="text-xs flex-1" style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {w.msg}
          </span>
          <button onClick={() => dismissWarning(w.time)}
            className="p-0.5 rounded flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}