import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, CheckSquare, BookOpen, BarChart2, Shield, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import ThemeToggle from '@/components/ui/ThemeToggle'

const FEATURES = [
  { icon: Zap,         label: 'Habit Tracking',   desc: 'Streaks, grids, and consistency scores' },
  { icon: CheckSquare, label: 'Smart Tasks',       desc: 'Priorities, due dates, AI planning' },
  { icon: Shield,      label: 'Focus Mode',        desc: 'Pomodoro timer + distraction control' },
  { icon: BarChart2,   label: 'Analytics',         desc: 'Weekly scores, trends, XP system' },
  { icon: BookOpen,    label: 'Daily Journal',     desc: 'Prompted writing with streak tracking' },
  { icon: Zap,         label: 'Cross-device Sync', desc: 'Same data on laptop, phone, tablet' },
]

function AuthCard({ onDemo }) {
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')
  const { setUser }             = useAppStore()
  const navigate                = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true); setError(''); setInfo('')
    if (!supabase) { setError('Supabase not configured.'); setLoading(false); return }

    if (mode === 'signup') {
      const { data, error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      if (data?.session?.user) { setUser(data.session.user); navigate('/dashboard') }
      else { setInfo('Account created! Sign in below.'); setMode('login') }
    } else {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      if (data?.session?.user) { setUser(data.session.user); navigate('/dashboard') }
    }
    setLoading(false)
  }

  const googleLogin = async () => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <div className="card p-6 w-full max-w-sm mx-auto space-y-4">
      <div className="flex p-1 rounded-xl gap-1" style={{ background: 'var(--bg-overlay)' }}>
        {['login','signup'].map(m => (
          <button key={m} onClick={() => { setMode(m); setError(''); setInfo('') }}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize"
            style={{
              background: mode === m ? 'var(--bg-raised)' : 'transparent',
              color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
            }}>
            {m === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        ))}
      </div>

      <button onClick={googleLogin} className="btn btn-ghost w-full flex items-center gap-3 justify-center">
        <svg width="16" height="16" viewBox="0 0 48 48">
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

      <form onSubmit={submit} className="space-y-3">
        <input className="input-base" type="email" placeholder="you@example.com"
          value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        <div className="relative">
          <input className="input-base pr-10" type={showPass ? 'text' : 'password'}
            placeholder="Password (min 6 characters)" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6} />
          <button type="button" onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
        {info  && <p className="text-xs" style={{ color: 'var(--green)' }}>{info}</p>}
        <button className="btn btn-primary w-full" type="submit" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          {!loading && <ArrowRight size={14} />}
        </button>
      </form>

      <button className="btn btn-ghost w-full text-sm" onClick={onDemo}>
        <Zap size={13} /> Try demo mode — no account needed
      </button>
    </div>
  )
}

export default function Landing() {
  const { setUser } = useAppStore()
  const navigate    = useNavigate()

  const handleDemo = () => {
    setUser({ id: 'demo-user', email: 'demo@flowtrail.app', demo: true })
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--brand)' }}>
            <Zap size={14} color="white" fill="white" />
          </div>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>FlowTrail</span>
        </div>
        <ThemeToggle />
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left — hero */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'color-mix(in srgb, var(--brand) 12%, transparent)', color: 'var(--brand)' }}>
              <Zap size={11} /> Personal productivity, reimagined
            </div>

            <h1 className="text-4xl md:text-5xl font-semibold leading-tight"
              style={{ color: 'var(--text-primary)' }}>
              Control distractions.<br />
              Build discipline.<br />
              <span style={{ color: 'var(--brand)' }}>Track your progress.</span>
            </h1>

            <p className="text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              FlowTrail combines habit tracking, tasks, journaling, focus mode, and AI planning into one seamless workspace — synced across all your devices.
            </p>

            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{ background: 'var(--bg-overlay)' }}>
                  <Icon size={14} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — auth card */}
          <div className="animate-slide-up">
            <AuthCard onDemo={handleDemo} />
            <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
              Free forever · Open source ·{' '}
              <a href="https://github.com/harishsivakumarjs/flowtrail"
                className="underline" target="_blank" rel="noreferrer">GitHub</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}