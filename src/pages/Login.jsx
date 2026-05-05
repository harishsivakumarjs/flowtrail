import { useState } from 'react'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function Login() {
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')
  const { setUser }             = useAppStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')
    setInfo('')

    if (!supabase) {
      setError('Supabase not configured. Use demo mode below.')
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      const { data, error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      if (data?.session?.user) {
        setUser(data.session.user)
      } else {
        setInfo('Account created! Please sign in with your email and password.')
        setMode('login')
      }
    } else {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      if (data?.session?.user) setUser(data.session.user)
    }

    setLoading(false)
  }

  const handleGoogle = async () => {
    if (!supabase) return
    setError('')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:  `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      }
    })
    if (err) setError(err.message)
  }

  const handleDemo = () => {
    setUser({ id: 'demo-user', email: 'demo@flowtrail.app', demo: true })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--bg-base)' }}>

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--brand)' }}>
            <Zap size={28} color="white" fill="white" />
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            FlowTrail
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            habits · tasks · journal · calendar
          </p>
        </div>

        <div className="card p-6 space-y-4">
          {/* Tab switcher */}
          <div className="flex p-1 rounded-xl gap-1" style={{ background: 'var(--bg-overlay)' }}>
            {['login','signup'].map(m => (
              <button key={m}
                onClick={() => { setMode(m); setError(''); setInfo('') }}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize"
                style={{
                  background: mode === m ? 'var(--bg-raised)' : 'transparent',
                  color:      mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {m === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          {/* Google */}
          <button onClick={handleGoogle}
            className="btn btn-ghost w-full flex items-center gap-3 justify-center">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* Email + password */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input className="input-base" type="email"
              placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required autoFocus />
            <div className="relative">
              <input className="input-base pr-10"
                type={showPass ? 'text' : 'password'}
                placeholder="Password (min 6 characters)"
                value={password} onChange={e => setPassword(e.target.value)}
                required minLength={6} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
            {info  && <p className="text-xs" style={{ color: 'var(--green)' }}>{info}</p>}
            <button className="btn btn-primary w-full" type="submit" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <button className="btn btn-ghost w-full text-sm" onClick={handleDemo}>
            <Zap size={14} /> Try demo mode (no account needed)
          </button>
        </div>
      </div>
    </div>
  )
}