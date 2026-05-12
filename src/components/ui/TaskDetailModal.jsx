import { format } from 'date-fns'
import { Clock, Calendar, FileText, AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import { toggleTask } from '@/hooks/useTasks'

export default function TaskDetailModal({ task, open, onClose, onEdit, onDelete }) {
  if (!task) return null

  const timeStr = task.due_time
    ? format(new Date(`${task.due_date}T${task.due_time}`), 'h:mm a') +
      (task.end_time ? ' → ' + format(new Date(`${task.due_date}T${task.end_time}`), 'h:mm a') : '')
    : null

  const dateStr = task.due_date
    ? format(new Date(task.due_date + 'T00:00'), 'EEEE, MMMM d, yyyy')
    : null

  const isDone = task.status === 'done'

  const handleCheck = async () => {
    await toggleTask(task.id)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Task" size="sm">
      <div className="space-y-4">
        {/* Title + checkbox */}
        <div className="flex items-start gap-3">
          <button onClick={handleCheck}
            className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
              ${isDone ? 'border-[var(--green)] bg-[var(--green)]' : 'border-[var(--border-mid)] hover:border-[var(--brand)]'}`}>
            {isDone && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <div className="flex-1">
            <h3 className="text-base font-semibold" style={{
              color: 'var(--text-primary)',
              textDecoration: isDone ? 'line-through' : 'none',
              opacity: isDone ? 0.6 : 1
            }}>
              {task.title}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium mt-1 inline-block badge-${task.priority}`}>
              {task.priority} priority
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-2 rounded-xl p-3" style={{ background: 'var(--bg-overlay)' }}>
          {dateStr && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Calendar size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
              {dateStr}
            </div>
          )}
          {timeStr && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Clock size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
              {timeStr}
            </div>
          )}
        </div>

        {/* Notes */}
        {task.notes && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              <FileText size={12} /> Notes
            </div>
            <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
              {task.notes}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {onEdit && (
            <button onClick={() => { onClose(); onEdit(task) }}
              className="btn btn-ghost flex-1 text-sm">Edit</button>
          )}
          {onDelete && (
            <button onClick={() => { onClose(); onDelete(task) }}
              className="btn btn-danger flex-1 text-sm">Delete</button>
          )}
        </div>
      </div>
    </Modal>
  )
}