import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Zap, CheckSquare, BookOpen, Trophy } from 'lucide-react'

const TABS = [
  { to: '/',         icon: LayoutDashboard, label: 'Home'    },
  { to: '/habits',   icon: Zap,             label: 'Habits'  },
  { to: '/tasks',    icon: CheckSquare,     label: 'Tasks'   },
  { to: '/journal',  icon: BookOpen,        label: 'Journal' },
  { to: '/progress', icon: Trophy,          label: 'Progress'},
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav-safe flex border-t"
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-xs transition-colors
             ${isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 400 }}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}