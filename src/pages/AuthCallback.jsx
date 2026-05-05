import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { Zap } from 'lucide-react'

export default function AuthCallback() {
  const navigate   = useNavigate()
  const { setUser } = useAppStore()

  useEffect(() => {
    const handle = async () => {
      // Exchange the code/token in the URL for a session
      const { data, error } = await supabase.auth.getSession()

      if (data?.session?.user) {
        setUser(data.session.user)
        navigate('/', { replace: true })
        return
      }

      // If no session yet, listen for it
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          setUser(session.user)
          subscription.unsubscribe()
          navigate('/', { replace: true })
        }
      })

      // Fallback — if nothing after 5s, go to login
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 5000)
    }

    handle()
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