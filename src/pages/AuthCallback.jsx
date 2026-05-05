import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { Zap } from 'lucide-react'

export default function AuthCallback() {
  const navigate    = useNavigate()
  const { setUser } = useAppStore()

  useEffect(() => {
    // Supabase puts the token in the URL hash — this call exchanges it for a session
    supabase.auth.exchangeCodeForSession(window.location.search)
      .catch(() => {})

    // Listen for the session to be established
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        subscription.unsubscribe()
        navigate('/', { replace: true })
      }
    })

    // Also try getting existing session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        navigate('/', { replace: true })
      }
    })

    const fallback = setTimeout(() => navigate('/login', { replace: true }), 8000)
    return () => {
      clearTimeout(fallback)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--bg-base)' }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center animate-pulse-soft"
        style={{ background: 'var(--brand)' }}>
        <Zap size={28} color="white" fill="white" />
      </div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Signing you in…
      </p>
    </div>
  )
}