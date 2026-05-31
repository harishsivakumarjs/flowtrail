import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { supabase } from '@/lib/supabase'

import AppShell     from '@/components/layout/AppShell'
import Landing      from '@/pages/Landing'
import AuthCallback from '@/pages/AuthCallback'
import Dashboard    from '@/pages/Dashboard'
import Habits       from '@/pages/Habits'
import Tasks        from '@/pages/Tasks'
import Calendar     from '@/pages/Calendar'
import Journal      from '@/pages/Journal'
import Analytics    from '@/pages/Analytics'
import Settings     from '@/pages/Settings'
import Notes           from '@/pages/Notes'
import PasswordManager from '@/pages/PasswordManager'

function HomeRoute() {
  const { user } = useAppStore()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 150)
    return () => clearTimeout(t)
  }, [])
  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="w-6 h-6 rounded-lg animate-pulse-soft" style={{ background: 'var(--brand)' }} />
    </div>
  )
  return user ? <Navigate to="/dashboard" replace /> : <Landing />
}

function ProtectedRoute({ children }) {
  const { user } = useAppStore()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 150)
    return () => clearTimeout(t)
  }, [])
  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="w-6 h-6 rounded-lg animate-pulse-soft" style={{ background: 'var(--brand)' }} />
    </div>
  )
  if (!user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user, setUser, applyTheme } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => { applyTheme() }, [])

  // Clean up legacy app-lock keys left from a previous version
  useEffect(() => {
    localStorage.removeItem('ft-lock-pin')
    localStorage.removeItem('ft-lock-last-active')
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        const p = window.location.pathname
        if (p === '/' || p === '/auth/callback') navigate('/dashboard', { replace: true })
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        navigate('/', { replace: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <Routes>
      {/* Public */}
      <Route path="/"              element={<HomeRoute />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected app */}
      <Route path="/dashboard" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index             element={<Dashboard />} />
        <Route path="habits"     element={<Habits />} />
        <Route path="tasks"      element={<Tasks />} />
        <Route path="calendar"   element={<Calendar />} />
        <Route path="journal"    element={<Journal />} />
        <Route path="analytics"  element={<Analytics />} />
        <Route path="notes"      element={<Notes />} />
        <Route path="passwords"  element={<PasswordManager />} />
        <Route path="settings"   element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
