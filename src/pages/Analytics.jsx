import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { supabase } from '@/lib/supabase'
import { Flame, TrendingUp, BookOpen, Moon, Trophy, Star } from 'lucide-react'
import { useGamificationStore, getLevel, BADGES } from '@/store/gamificationStore'
import XPBar from '@/components/ui/XPBar'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>
      <p className="font-medium">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
    </div>
  )
}

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
        <div className="text-xl font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function Analytics() {
  const { user } = useAppStore()
  const userId   = user?.id
  const { xp, earnedBadges, totalHabitsDone, totalTasksDone, totalSessions } = useGamificationStore()
  const level = getLevel(xp)

  const [habits, setHabits]                 = useState([])
  const [habitLogs, setHabitLogs]           = useState([])
  const [sleepLogs, setSleepLogs]           = useState([])
  const [journalEntries, setJournalEntries] = useState([])
  const [tasks, setTasks]                   = useState([])

  useEffect(() => {
    if (!userId || !supabase) return
    supabase.from('habits').select('*').eq('user_id', userId).then(({ data }) => data && setHabits(data))
    supabase.from('habit_logs').select('*').eq('user_id', userId).then(({ data }) => data && setHabitLogs(data))
    supabase.from('sleep_logs').select('*').eq('user_id', userId).then(({ data }) => data && setSleepLogs(data))
    supabase.from('journal_entries').select('*').eq('user_id', userId).then(({ data }) => data && setJournalEntries(data))
    supabase.from('tasks').select('*').eq('user_id', userId).then(({ data }) => data && setTasks(data))
  }, [userId])


  const last30 = useMemo(() => {
    const end = new Date(), start = subDays(end, 29)
    return eachDayOfInterval({ start, end })
  }, [])

  // Weekly productivity score (0-100)
  const weeklyScore = useMemo(() => {
    const weekStart = startOfWeek(new Date())
    const weekEnd   = endOfWeek(new Date())
    const weekDays  = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const total     = habits.length || 1
    const logsByDate = {}
    habitLogs.forEach(l => { logsByDate[l.log_date] = (logsByDate[l.log_date] || 0) + 1 })
    const pcts = weekDays.map(d => {
      const ds = format(d, 'yyyy-MM-dd')
      return Math.round((logsByDate[ds] || 0) / total * 100)
    })
    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
  }, [habitLogs, habits])

  // Daily completion data (last 14 days)
  const dailyData = useMemo(() => {
    const logsByDate = {}
    habitLogs.forEach(l => { logsByDate[l.log_date] = (logsByDate[l.log_date] || 0) + 1 })
    const total = habits.length || 1
    return last30.slice(-14).map(day => ({
      date: format(day, 'MMM d'),
      pct:  Math.round((logsByDate[format(day, 'yyyy-MM-dd')] || 0) / total * 100),
    }))
  }, [habitLogs, habits, last30])

  // Sleep data
  const sleepData = useMemo(() => {
    const byDate = {}
    sleepLogs.forEach(s => { byDate[s.log_date] = s.hours })
    return last30.slice(-14).map(day => ({
      date:  format(day, 'MMM d'),
      hours: byDate[format(day, 'yyyy-MM-dd')] || null,
    })).filter(d => d.hours !== null)
  }, [sleepLogs, last30])

  // Per-habit breakdown
  const habitStats = useMemo(() =>
    habits.map(h => ({
      ...h,
      pct: last30.length > 0
        ? Math.round(habitLogs.filter(l => l.habit_id === h.id).length / last30.length * 100)
        : 0
    })).sort((a, b) => b.pct - a.pct)
  , [habits, habitLogs, last30])

  const avgSleep = sleepLogs.length
    ? (sleepLogs.reduce((s, l) => s + l.hours, 0) / sleepLogs.length).toFixed(1)
    : '—'

  const overallPct = dailyData.length
    ? Math.round(dailyData.reduce((s, d) => s + d.pct, 0) / dailyData.length)
    : 0

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Last 30 days</p>
      </div>

      {/* XP bar */}
      <XPBar />

      {/* Weekly score banner */}
      <div className="card p-5 flex items-center justify-between gap-4"
        style={{ background: `linear-gradient(135deg, color-mix(in srgb, var(--brand) 15%, transparent), var(--bg-raised))` }}>
        <div>
          <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Weekly productivity score
          </div>
          <div className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{weeklyScore}%</div>
          <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {weeklyScore >= 80 ? '🔥 Excellent week!' : weeklyScore >= 50 ? '💪 Good progress' : '📈 Room to improve'}
          </div>
        </div>
        <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `conic-gradient(var(--brand) ${weeklyScore * 3.6}deg, var(--bg-overlay) 0deg)` }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-raised)' }}>
            <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>{weeklyScore}%</span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Avg completion" value={`${overallPct}%`} sub="habits/day" icon={TrendingUp} color="var(--brand)" />
        <StatCard label="Avg sleep"      value={`${avgSleep}h`}   sub="per night"  icon={Moon}       color="#8b5cf6" />
        <StatCard label="Tasks done"     value={totalTasksDone}   sub="all time"   icon={Flame}      color="var(--amber)" />
        <StatCard label="Journal days"   value={journalEntries.length} sub="entries" icon={BookOpen} color="var(--teal)" />
      </div>

      {/* Charts */}
      <div className="card p-4 md:p-5">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Daily habit completion — last 14 days</h2>
        {dailyData.length === 0 ? (
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Log habits to see your chart</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pct" radius={[4,4,0,0]} name="Completion">
                {dailyData.map((d, i) => (
                  <Cell key={i} fill={d.pct >= 80 ? 'var(--green)' : d.pct >= 50 ? 'var(--amber)' : 'var(--red)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Sleep chart */}
        <div className="card p-4">
          <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Sleep hours</h2>
          {sleepData.length === 0 ? (
            <div className="h-32 flex items-center justify-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Log sleep on the dashboard</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={sleepData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} domain={[0, 12]} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 3 }} name="Hours slept" />
                <Line dataKey={() => 7} stroke="var(--green)" strokeWidth={1}
                  strokeDasharray="4 4" dot={false} name="Goal (7h)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Habit breakdown */}
        <div className="card p-4">
          <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Habit breakdown (30d)</h2>
          {habitStats.length === 0 ? (
            <div className="h-32 flex items-center justify-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No habits yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {habitStats.map(h => (
                <div key={h.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{h.icon} {h.name}</span>
                    <span className="text-xs font-medium" style={{ color: h.pct >= 70 ? 'var(--green)' : 'var(--amber)' }}>{h.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${h.pct}%`, background: h.color || 'var(--brand)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="card p-4 md:p-5">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
          Badges — {earnedBadges.length} earned
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {BADGES.map(badge => {
            const earned = earnedBadges.includes(badge.id)
            return (
              <div key={badge.id}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all"
                style={{
                  background: earned ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'var(--bg-overlay)',
                  border: `1px solid ${earned ? 'color-mix(in srgb, var(--brand) 25%, transparent)' : 'var(--border)'}`,
                  opacity: earned ? 1 : 0.4,
                }}>
                <span className="text-2xl">{badge.icon}</span>
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{badge.label}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{badge.desc}</div>
                {earned && badge.xp > 0 && (
                  <div className="text-xs font-medium" style={{ color: 'var(--brand)' }}>+{badge.xp}xp</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}