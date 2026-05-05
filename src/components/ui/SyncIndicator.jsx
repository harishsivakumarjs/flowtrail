import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

export default function SyncIndicator() {
  const { syncing, lastSync } = useAppStore()
  const online = navigator.onLine

  if (!online) return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
      <CloudOff size={13} />
      <span>Offline</span>
    </div>
  )

  if (syncing) return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
      <RefreshCw size={13} className="animate-spin" />
      <span>Syncing…</span>
    </div>
  )

  return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
      <Cloud size={13} />
      <span>Synced</span>
    </div>
  )
}
