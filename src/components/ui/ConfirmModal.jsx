export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}>
      <div
        className="card p-5 w-full max-w-xs"
        onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          {title ?? 'Marking a future date'}
        </p>
        <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>{message}</p>
        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
