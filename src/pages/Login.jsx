import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Mail, ArrowRight, Github } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setUser } = useAppStore()
  const navigate = useNavigate()

  const handleMagicLink = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')

    if (!supabase) {
      setError('Supabase not configured. Use demo mode below.')
      setLoading(false)
      return
    }

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })

    if (err) { setError(err.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  const handleDemo = () => {
    setUser({ id: 'demo-user', email: 'demo@flowtrail.app', demo: true })
    navigate('/')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
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
          {sent ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--green) 15%, transparent)' }}>
                <Mail size={22} style={{ color: 'var(--green)' }} />
              </div>
              <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Check your email
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                We sent a magic link to <strong>{email}</strong>.<br />
                Click it to sign in — no password needed.
              </p>
              <button className="btn btn-ghost w-full text-sm" onClick={() => setSent(false)}>
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Sign in
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Enter your email to receive a magic link
                </p>
              </div>

              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  className="input-base"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                {error && (
                  <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>
                )}
                <button
                  className="btn btn-primary w-full"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Sending…' : 'Send magic link'}
                  {!loading && <ArrowRight size={15} />}
                </button>
              </form>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>

              <button className="btn btn-ghost w-full gap-2" onClick={handleDemo}>
                <Zap size={15} />
                Try demo mode (no account needed)
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          Open source ·{' '}
          <a
            href="https://github.com/yourusername/flowtrail"
            className="underline hover:text-[var(--text-secondary)]"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </p>
      </div>
    </div>
  )
}
