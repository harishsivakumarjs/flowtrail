import { useGamificationStore, getLevel } from '@/store/gamificationStore'
import { Zap } from 'lucide-react'

export default function XPBar({ compact = false }) {
  const { xp, lastXPGain } = useGamificationStore()
  const level = getLevel(xp)

  if (compact) return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: 'var(--brand)', color: '#fff' }}>
        {level.level}
      </div>
      <div className="flex-1">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-overlay)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${level.progress}%`, background: 'var(--brand)' }} />
        </div>
      </div>
      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{xp}xp</span>
    </div>
  )

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
            style={{ background: 'var(--brand)', color: '#fff' }}>
            {level.level}
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{level.label}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{xp} XP total</div>
          </div>
        </div>
        {level.next && (
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {level.next.xp - xp} XP to {level.next.label}
          </div>
        )}
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-overlay)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${level.progress}%`, background: 'linear-gradient(90deg, var(--brand), #8a8cf2)' }} />
      </div>
    </div>
  )
}