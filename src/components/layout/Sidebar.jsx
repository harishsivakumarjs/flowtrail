import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, CalendarDays,
  BookOpen, BarChart2, Settings, Zap, X, LogOut, StickyNote, Lock
} from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import SyncIndicator from '@/components/ui/SyncIndicator'
import { useAppStore } from '@/store/appStore'
import { supabase } from '@/lib/supabase'

const NAV = [
  { to: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/habits',    icon: Zap,             label: 'Habits' },
  { to: '/dashboard/tasks',     icon: CheckSquare,     label: 'Tasks' },
  { to: '/dashboard/notes',     icon: StickyNote,      label: 'Notes' },
  { to: '/dashboard/calendar',  icon: CalendarDays,    label: 'Calendar' },
  { to: '/dashboard/journal',   icon: BookOpen,        label: 'Journal' },
  { to: '/dashboard/analytics', icon: BarChart2,       label: 'Analytics' },
  { to: '/dashboard/passwords', icon: Lock,            label: 'Passwords' },
  { to: '/dashboard/settings',  icon: Settings,        label: 'Settings' },
]

function NavItem({ to, icon: Icon, label, onClick, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
         ${isActive
           ? 'bg-[var(--brand)] text-white'
           : 'text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]'
         }`
      }
    >
      <Icon size={17} />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Sidebar({ mobile = false, onClose }) {
  const { user, setUser } = useAppStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
    navigate('/', { replace: true })
  }

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'YO'

  return (
    <aside className="flex flex-col h-full"
      style={{ background: 'var(--sidebar-bg)', width: mobile ? '100%' : '220px' }}>

      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b"
        style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--brand)' }}>
              <Zap size={14} color="white" fill="white" />
            </div>
            <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              FlowTrail
            </span>
          </div>
          <div className="text-xs mt-0.5 ml-9" style={{ color: 'var(--text-muted)' }}>
            personal workspace
          </div>
        </div>
        {mobile && (
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
            style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        {NAV.map((item, i) => (
          <NavItem
            key={item.to}
            {...item}
            end={i === 0}
            onClick={mobile ? onClose : undefined}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
        <SyncIndicator />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
              style={{ background: 'color-mix(in srgb, var(--brand) 20%, transparent)', color: 'var(--brand)' }}>
              {initials}
            </div>
            <div>
              <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {user?.email?.split('@')[0] || 'Demo'}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>personal</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-[var(--bg-overlay)] transition-colors"
              style={{ color: 'var(--text-muted)' }} title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
