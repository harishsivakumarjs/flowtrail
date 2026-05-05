import { useEffect, useState, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { supabase } from '@/lib/supabase'
import { fullSync, syncFromCloud, subscribeRealtime } from '@/lib/sync'

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
  // Give Zustand 100ms to rehydrate persisted user from localStorage
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100)
    return () => clearTimeout(t)
  }, [])
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, setUser, applyTheme, setSyncing, setLastSync } = useAppStore()
  const navigate   = useNavigate()
  const [authReady, setAuthReady] = useState(false)

  // Apply theme immediately
  useEffect(() => { applyTheme() }, [])

  // Auth — only runs if Supabase configured
  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return
    }

    // Check for existing session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user)
      setAuthReady(true)
    })

    // Listen for auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth:', event, session?.user?.email)
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        const path = window.location.pathname
        if (path === '/login' || path === '/auth/callback') {
          navigate('/', { replace: true })
        }
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        navigate('/login', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // If user is persisted from storage but authReady never set (no supabase), unblock
  useEffect(() => {
    if (user?.demo) setAuthReady(true)
  }, [user])

  // Sync — runs when user logs in, then every 15 seconds
  useEffect(() => {
    if (!user?.id || user?.demo || !supabase) return

    // Initial full sync
    setSyncing(true)
    fullSync(user.id).then(() => {
      setSyncing(false)
      setLastSync()
    })

    // Real-time subscription for instant cross-device updates
    const unsub = subscribeRealtime(user.id, () => {
      setLastSync()
    })

    // Poll every 15 seconds as fallback
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncFromCloud(user.id).then(setLastSync)
      }
    }, 15000)

    return () => {
      unsub()
      clearInterval(interval)
    }
  }, [user?.id])

  // Show loading spinner until auth state is known
  if (!authReady && !user) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}>
      <div className="w-8 h-8 rounded-lg animate-pulse-soft"
        style={{ background: 'var(--brand)' }} />
    </div>
  )

  return (
    <Routes>
      <Route path="/login"         element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/"
        element={<ProtectedRoute><AppShell /></ProtectedRoute>}
      >
        <Route index            element={<Dashboard />} />
        <Route path="habits"    element={<Habits />} />
        <Route path="tasks"     element={<Tasks />} />
        <Route path="calendar"  element={<Calendar />} />
        <Route path="journal"   element={<Journal />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="focus"     element={<Focus />} />
        <Route path="settings"  element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}