import { Sun, Moon } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useAppStore()

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-all hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-[var(--text-primary)] ${className}`}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark'
        ? <Sun size={17} />
        : <Moon size={17} />
      }
    </button>
  )
}
