import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { supabase } from '@/lib/supabase'
import { fullSync, subscribeRealtime } from '@/lib/sync'

import AppShell     from '@/components/layout/AppShell'
import Login        from '@/pages/Login'
import AuthCallback from '@/pages/AuthCallback'
import Dashboard    from '@/pages/Dashboard'
import Habits       from '@/pages/Habits'
import Tasks        from '@/pages/Tasks'
import Calendar     from '@/pages/Calendar'
import Journal      from '@/pages/Journal'
import Analytics    from '@/pages/Analytics'
import Settings     from '@/pages/Settings'
import Focus        from '@/pages/Focus'

function ProtectedRoute({ children }) {
  const { user } = useAppStore()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, setUser, applyTheme, setSyncing, setLastSync } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => { applyTheme() }, [])

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        navigate('/', { replace: true })
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        navigate('/login', { replace: true })
      } else if (session?.user) {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user?.id || user?.demo) return
    setSyncing(true)
    fullSync(user.id).then(() => { setSyncing(false); setLastSync() })
    const unsub    = subscribeRealtime(user.id, () => setLastSync())
    const interval = setInterval(() => {
      if (navigator.onLine) fullSync(user.id).then(setLastSync)
    }, 60000)
    return () => { unsub(); clearInterval(interval) }
  }, [user?.id])

  return (
    <Routes>
      <Route path="/login"         element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index              element={<Dashboard />} />
        <Route path="habits"      element={<Habits />} />
        <Route path="tasks"       element={<Tasks />} />
        <Route path="calendar"    element={<Calendar />} />
        <Route path="journal"     element={<Journal />} />
        <Route path="analytics"   element={<Analytics />} />
        <Route path="focus"       element={<Focus />} />
        <Route path="settings"    element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}