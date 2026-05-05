import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { Zap } from 'lucide-react'

export default function AuthCallback() {
  const navigate    = useNavigate()
  const { setUser } = useAppStore()

  useEffect(() => {
    if (!supabase) { navigate('/login', { replace: true }); return }

    // For PKCE flow — exchange code for session
    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')

    const finish = async () => {
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (data?.session?.user) {
          setUser(data.session.user)
          navigate('/', { replace: true })
          return
        }
      }

      // Fallback — check existing session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        navigate('/', { replace: true })
        return
      }

      // Nothing worked — back to login
      navigate('/login', { replace: true })
    }

    finish()
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