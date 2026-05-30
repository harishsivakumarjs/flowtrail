import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { Menu } from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function AppShell() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [drawerOpen, setDrawer] = useState(false)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])



  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <div className="flex-shrink-0 border-r" style={{ borderColor: 'var(--border)' }}>
          <Sidebar />
        </div>
      )}

      {/* Mobile drawer */}
      {isMobile && drawerOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={() => setDrawer(false)} />
          <div className="relative z-50 w-72 h-full animate-slide-up">
            <Sidebar mobile onClose={() => setDrawer(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        {isMobile && (
          <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
            style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
            <button onClick={() => setDrawer(true)}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)]"
              style={{ color: 'var(--text-secondary)' }}>
              <Menu size={20} />
            </button>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>FlowTrail</span>
            <ThemeToggle />
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>

        {isMobile && <BottomNav />}
      </div>
    </div>
  )
}