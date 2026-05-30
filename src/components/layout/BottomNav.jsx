import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, StickyNote, CalendarDays, BarChart2 } from 'lucide-react'

const TABS = [
  { to: '/dashboard',           icon: LayoutDashboard, label: 'Home',     end: true,  primary: false },
  { to: '/dashboard/tasks',     icon: CheckSquare,     label: 'Tasks',    end: false, primary: false },
  { to: '/dashboard/notes',     icon: StickyNote,      label: 'Notes',    end: false, primary: true  },
  { to: '/dashboard/calendar',  icon: CalendarDays,    label: 'Calendar', end: false, primary: false },
  { to: '/dashboard/analytics', icon: BarChart2,       label: 'More',     end: false, primary: false },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav-safe flex border-t flex-shrink-0"
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
      {TABS.map(({ to, icon: Icon, label, end, primary }) => (
        <NavLink key={to} to={to} end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors
             ${isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`
          }>
          {({ isActive }) =>
            primary ? (
              <>
                <div
                  className="w-12 h-8 rounded-2xl flex items-center justify-center mb-0.5 transition-colors"
                  style={{ background: isActive ? 'var(--brand)' : 'var(--bg-overlay)' }}>
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.75}
                    style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}
                  />
                </div>
                <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 400 }}>{label}</span>
              </>
            ) : (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 400 }}>{label}</span>
              </>
            )
          }
        </NavLink>
      ))}
    </nav>
  )
}
