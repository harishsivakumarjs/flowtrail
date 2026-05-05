import { useState } from 'react'
import { Sun, Moon, Download, Trash2, Github, Info } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { db } from '@/lib/db'

export default function Settings() {
  const { theme, toggleTheme, user } = useAppStore()
  const [clearing, setClearing] = useState(false)

  const handleExport = async () => {
    const userId = user?.id
    if (!userId) return
    const data = {
      habits:          await db.habits.where('user_id').equals(userId).toArray(),
      habit_logs:      await db.habit_logs.where('user_id').equals(userId).toArray(),
      sleep_logs:      await db.sleep_logs.where('user_id').equals(userId).toArray(),
      tasks:           await db.tasks.where('user_id').equals(userId).toArray(),
      journal_entries: await db.journal_entries.where('user_id').equals(userId).toArray(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `flowtrail-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClearLocal = async () => {
    if (!confirm('Clear all local data? This cannot be undone (cloud data is safe).')) return
    setClearing(true)
    await db.habits.clear()
    await db.habit_logs.clear()
    await db.sleep_logs.clear()
    await db.tasks.clear()
    await db.journal_entries.clear()
    setClearing(false)
    alert('Local data cleared. Reload to re-sync from cloud.')
  }

  const Section = ({ title, children }) => (
    <div>
      <h2 className="text-xs font-medium uppercase tracking-wider mb-3 px-1"
        style={{ color: 'var(--text-muted)' }}>
        {title}
      </h2>
      <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
        {children}
      </div>
    </div>
  )

  const Row = ({ label, sub, action }) => (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
      {action}
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
      </div>

      <Section title="Account">
        <Row
          label="Email"
          sub={user?.email || 'Demo mode — no account'}
          action={null}
        />
      </Section>

      <Section title="Appearance">
        <Row
          label="Theme"
          sub={theme === 'dark' ? 'Dark mode active' : 'Light mode active'}
          action={
            <button
              onClick={toggleTheme}
              className="btn btn-ghost flex items-center gap-2"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            </button>
          }
        />
      </Section>

      <Section title="Data">
        <Row
          label="Export all data"
          sub="Download your habits, tasks, and journal as JSON"
          action={
            <button className="btn btn-ghost flex items-center gap-2" onClick={handleExport}>
              <Download size={15} />
              Export
            </button>
          }
        />
        <Row
          label="Clear local data"
          sub="Wipes IndexedDB — cloud data is unaffected"
          action={
            <button className="btn btn-danger flex items-center gap-2" onClick={handleClearLocal} disabled={clearing}>
              <Trash2 size={15} />
              {clearing ? 'Clearing…' : 'Clear'}
            </button>
          }
        />
      </Section>

      <Section title="About">
        <Row
          label="FlowTrail"
          sub="v1.0.0 · Open source personal productivity app"
          action={
            <a
              href="https://github.com/yourusername/flowtrail"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost flex items-center gap-2"
            >
              <Github size={15} />
              GitHub
            </a>
          }
        />
        <Row
          label="Tech stack"
          sub="React · Vite · Supabase · Dexie · TailwindCSS · Recharts · Tiptap"
          action={null}
        />
      </Section>
    </div>
  )
}
