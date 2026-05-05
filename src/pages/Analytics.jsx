import { useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { format, subDays, eachDayOfInterval } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { Flame, TrendingUp, BookOpen, Moon } from 'lucide-react'

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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-sm" style={{ color: 'var(--text-primary)' }}>
      <p className="font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { user } = useAppStore()
  const userId = user?.id

  const habits = useLiveQuery(
    () => userId ? db.habits.where('user_id').equals(userId).filter(h => !h.archived).toArray() : Promise.resolve([]),
    [userId]
  ) ?? []

  const habitLogs = useLiveQuery(
    () => userId ? db.habit_logs.where('user_id').equals(userId).filter(l => l.completed).toArray() : Promise.resolve([]),
    [userId]
  ) ?? []

  const sleepLogs = useLiveQuery(
    () => userId ? db.sleep_logs.where('user_id').equals(userId).toArray() : Promise.resolve([]),
    [userId]
  ) ?? []

  const journalEntries = useLiveQuery(
    () => userId ? db.journal_entries.where('user_id').equals(userId).toArray() : Promise.resolve([]),
    [userId]
  ) ?? []

  const tasks = useLiveQuery(
    () => userId ? db.tasks.where('user_id').equals(userId).toArray() : Promise.resolve([]),
    [userId]
  ) ?? []

  // Last 30 days
  const last30 = useMemo(() => {
    const end   = new Date()
    const start = subDays(end, 29)
    return eachDayOfInterval({ start, end })
  }, [])

  // Daily completion data
  const dailyData = useMemo(() => {
    const logsByDate = {}
    habitLogs.forEach(l => {
      logsByDate[l.log_date] = (logsByDate[l.log_date] || 0) + 1
    })
    const total = habits.length || 1

    return last30.slice(-14).map(day => {
      const ds   = format(day, 'yyyy-MM-dd')
      const count = logsByDate[ds] || 0
      return {
        date:    format(day, 'MMM d'),
        done:    count,
        pct:     Math.round(count / total * 100),
      }
    })
  }, [habitLogs, habits, last30])

  // Sleep data (last 14 days)
  const sleepData = useMemo(() => {
    const sleepByDate = {}
    sleepLogs.forEach(s => { sleepByDate[s.log_date] = s.hours })
    return last30.slice(-14).map(day => {
      const ds = format(day, 'yyyy-MM-dd')
      return {
        date:  format(day, 'MMM d'),
        hours: sleepByDate[ds] || null,
      }
    }).filter(d => d.hours !== null)
  }, [sleepLogs, last30])

  // Per-habit stats
  const habitStats = useMemo(() => {
    return habits.map(h => {
      const logs = habitLogs.filter(l => l.habit_id === h.id)
      return {
        ...h,
        totalDone: logs.length,
        pct: last30.length > 0 ? Math.round(logs.length / last30.length * 100) : 0,
      }
    }).sort((a, b) => b.pct - a.pct)
  }, [habits, habitLogs, last30])

  // Summary stats
  const totalDone     = tasks.filter(t => t.status === 'done').length
  const avgSleep      = sleepLogs.length ? (sleepLogs.reduce((s, l) => s + l.hours, 0) / sleepLogs.length).toFixed(1) : '—'
  const journalStreak = journalEntries.length
  const overallPct    = dailyData.length ? Math.round(dailyData.reduce((s, d) => s + d.pct, 0) / dailyData.length) : 0

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Last 30 days</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Avg completion" value={`${overallPct}%`} sub="habits/day" icon={TrendingUp} color="var(--brand)" />
        <StatCard label="Avg sleep" value={`${avgSleep}h`} sub="per night" icon={Moon} color="#8b5cf6" />
        <StatCard label="Tasks done" value={totalDone} sub="all time" icon={Flame} color="var(--amber)" />
        <StatCard label="Journal entries" value={journalStreak} sub="entries written" icon={BookOpen} color="var(--teal)" />
      </div>

      {/* Habit completion chart */}
      <div className="card p-4 md:p-5">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
          Daily habit completion — last 14 days
        </h2>
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
              <Bar dataKey="pct" radius={[4, 4, 0, 0]} name="Completion">
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
        <div className="card p-4 md:p-5">
          <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
            Sleep hours
          </h2>
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
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 3 }}
                  name="Hours slept"
                />
                <Line
                  dataKey={() => 7}
                  stroke="var(--green)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Goal (7h)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Per-habit breakdown */}
        <div className="card p-4 md:p-5">
          <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
            Habit breakdown (30d)
          </h2>
          {habitStats.length === 0 ? (
            <div className="h-32 flex items-center justify-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No habits yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {habitStats.map(h => (
                <div key={h.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                      {h.icon} {h.name}
                    </span>
                    <span className="text-xs font-medium"
                      style={{ color: h.pct >= 70 ? 'var(--green)' : 'var(--amber)' }}>
                      {h.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${h.pct}%`,
                        background: h.color || 'var(--brand)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
