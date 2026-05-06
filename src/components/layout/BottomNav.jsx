import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Zap, CheckSquare, CalendarDays, BarChart2 } from 'lucide-react'

const TABS = [
  { to: '/dashboard',           icon: LayoutDashboard, label: 'Home',     end: true  },
  { to: '/dashboard/habits',    icon: Zap,             label: 'Habits',   end: false },
  { to: '/dashboard/tasks',     icon: CheckSquare,     label: 'Tasks',    end: false },
  { to: '/dashboard/calendar',  icon: CalendarDays,    label: 'Calendar', end: false },
  { to: '/dashboard/analytics', icon: BarChart2,       label: 'More',     end: false },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav-safe flex border-t flex-shrink-0"
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
      {TABS.map(({ to, icon: Icon, label, end }) => (
        <NavLink key={to} to={to} end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-xs transition-colors
             ${isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`
          }>
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