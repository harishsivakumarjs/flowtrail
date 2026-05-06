import { useState } from 'react'
import { Sun, Moon, Download, Trash2, Github, Info, Linkedin } from 'lucide-react'
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
            <div className="flex items-center gap-2">
              <a href="https://github.com/harishsivakumarjs/flowtrail"
                target="_blank" rel="noreferrer"
                className="btn btn-ghost flex items-center gap-2">
                <Github size={15} /> GitHub
              </a>
            </div>
          }
        />
        <Row
          label="Developed by Harish Sivakumar"
          sub="Full-stack developer · Connect on LinkedIn"
          action={
            <a href="https://www.linkedin.com/in/harishsivakumarjs/"
              target="_blank" rel="noreferrer"
              className="btn btn-ghost flex items-center gap-2"
              style={{ color: '#0A66C2' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
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