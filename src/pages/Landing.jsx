import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, CheckSquare, BookOpen, BarChart2, Shield, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import ThemeToggle from '@/components/ui/ThemeToggle'

const FEATURES = [
  { icon: Zap,         label: 'Habit Tracking',    desc: 'Streaks, grids, consistency' },
  { icon: CheckSquare, label: 'Smart Tasks',        desc: 'Priorities, AI planning' },
  { icon: Shield,      label: 'Focus Mode',         desc: 'Pomodoro + distraction control' },
  { icon: BarChart2,   label: 'Analytics',          desc: 'Weekly scores, XP system' },
  { icon: BookOpen,    label: 'Daily Journal',      desc: 'Multiple entries, prompts' },
  { icon: Zap,         label: 'Cross-device Sync',  desc: 'Laptop, phone, tablet' },
]

export default function Landing() {
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')
  const { setUser }             = useAppStore()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true); setError(''); setInfo('')

    if (!supabase) { setError('Supabase not configured. Use demo mode.'); setLoading(false); return }

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

  const handleGoogle = async () => {
    if (!supabase) return
    setError('')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  const handleDemo = () => {
    setUser({ id: 'demo-user', email: 'demo@flowtrail.app', demo: true })
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand)' }}>
            <Zap size={14} color="white" fill="white" />
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>FlowTrail</span>
        </div>
        <ThemeToggle />
      </nav>

      {/* Main — stacks vertically on mobile, side by side on desktop */}
      <div className="flex-1 flex flex-col md:flex-row md:items-center gap-0 md:gap-12 px-5 md:px-12 py-8 md:py-16 max-w-5xl mx-auto w-full">

        {/* Left — hero (hidden on small mobile, compact on tablet) */}
        <div className="flex-1 space-y-5 mb-6 md:mb-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'color-mix(in srgb, var(--brand) 12%, transparent)', color: 'var(--brand)' }}>
            <Zap size={11} /> Personal productivity, reimagined
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
            Control distractions.<br />
            Build discipline.<br />
            <span style={{ color: 'var(--brand)' }}>Track progress.</span>
          </h1>

          <p className="text-sm md:text-base leading-relaxed hidden md:block" style={{ color: 'var(--text-secondary)' }}>
            FlowTrail combines habit tracking, tasks, journaling, focus mode, and AI planning — synced across all your devices.
          </p>

          {/* Feature grid — 2 cols on mobile */}
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-2 p-2.5 md:p-3 rounded-xl"
                style={{ background: 'var(--bg-overlay)' }}>
                <Icon size={13} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
                  <div className="text-xs mt-0.5 hidden md:block" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — auth card */}
        <div className="w-full md:w-[360px] flex-shrink-0">
          <div className="card p-5 md:p-6 space-y-4">
            {/* Tab switcher */}
            <div className="flex p-1 rounded-xl gap-1" style={{ background: 'var(--bg-overlay)' }}>
              {['login','signup'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setInfo('') }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: mode === m ? 'var(--bg-raised)' : 'transparent',
                    color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}>
                  {m === 'login' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>

            {/* Google */}
            <button onClick={handleGoogle}
              className="btn btn-ghost w-full flex items-center gap-3 justify-center text-sm">
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

            {/* Email + password */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <input className="input-base text-sm" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
              <div className="relative">
                <input className="input-base text-sm pr-10"
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
              <button className="btn btn-primary w-full text-sm" type="submit" disabled={loading}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                {!loading && <ArrowRight size={14} />}
              </button>
            </form>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            <button className="btn btn-ghost w-full text-sm" onClick={handleDemo}>
              <Zap size={13} /> Try demo mode — no account needed
            </button>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Free forever · Open source ·{' '}
            <a href="https://github.com/harishsivakumarjs/flowtrail"
              className="underline" target="_blank" rel="noreferrer">GitHub</a>
          </p>
        </div>
      </div>
    </div>
  )
}