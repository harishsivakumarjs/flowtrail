import { useState } from 'react'
import { Sparkles, Plus, X, Loader } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { addTask } from '@/hooks/useTasks'
import { useAppStore } from '@/store/appStore'
import { TODAY } from '@/lib/utils'

export default function PlanMyDay({ open, onClose }) {
  const [goal, setGoal]         = useState('')
  const [tasks, setTasks]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [added, setAdded]       = useState(false)
  const { user }                = useAppStore()

  const generatePlan = async () => {
    if (!goal.trim()) return
    setLoading(true)
    setError('')
    setTasks([])

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `I want to accomplish this today: "${goal}"
            
Break this into 3-6 specific, actionable tasks I can complete today. Return ONLY a JSON array, no other text:
[
  {"title": "task title", "priority": "high|medium|low", "reason": "why this task matters"},
  ...
]
Order them by what should be done first. Keep titles short and action-oriented.`
          }]
        })
      })

      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('Could not parse response')
      const parsed = JSON.parse(match[0])
      setTasks(parsed)
    } catch (err) {
      setError('Could not generate plan. Check your internet connection.')
    }
    setLoading(false)
  }

  const addAllTasks = async () => {
    for (const t of tasks) {
      await addTask({
        title:    t.title,
        priority: t.priority || 'medium',
        dueDate:  TODAY(),
        notes:    t.reason || '',
        userId:   user.id,
      })
    }
    setAdded(true)
    setTimeout(() => { onClose(); setGoal(''); setTasks([]); setAdded(false) }, 1500)
  }

  return (
    <Modal open={open} onClose={onClose} title="Plan My Day" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl p-3"
          style={{ background: 'color-mix(in srgb, var(--brand) 8%, transparent)' }}>
          <Sparkles size={15} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Type your main goal for today and AI will break it into actionable tasks with priorities.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            className="input-base flex-1"
            placeholder="e.g. Finish the project proposal and send it"
            value={goal}
            onChange={e => setGoal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generatePlan()}
            autoFocus
          />
          <button className="btn btn-primary px-4" onClick={generatePlan} disabled={loading || !goal.trim()}>
            {loading ? <Loader size={15} className="animate-spin" /> : <Sparkles size={15} />}
          </button>
        </div>

        {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}

        {tasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              AI suggested {tasks.length} tasks:
            </p>
            {tasks.map((t, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'var(--bg-overlay)' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: 'var(--brand)', color: '#fff' }}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.title}</div>
                  {t.reason && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.reason}</div>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-lg font-medium badge-${t.priority || 'medium'}`}>
                  {t.priority || 'medium'}
                </span>
              </div>
            ))}

            <button
              className="btn btn-primary w-full"
              onClick={addAllTasks}
              disabled={added}
            >
              {added ? '✓ Added to tasks!' : `Add all ${tasks.length} tasks to today`}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}