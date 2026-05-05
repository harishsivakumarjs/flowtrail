-- ══════════════════════════════════════════════════════════
-- FlowTrail Database Schema
-- Run this entire file in your Supabase SQL Editor once.
-- ══════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── Profiles ───────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url  text,
  theme       text default 'dark',
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users manage own profile"
  on public.profiles for all using (auth.uid() = id);

-- ── Habits ─────────────────────────────────────────────────
create table public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  icon        text default '★',
  color       text default '#5254e7',
  frequency   text default 'daily',      -- 'daily' | 'weekdays' | 'weekends' | 'custom'
  target_days int[] default '{1,2,3,4,5,6,7}',  -- 1=Mon … 7=Sun
  goal_type   text default 'streak',     -- 'streak' | 'count'
  goal_value  int default 30,
  sort_order  int default 0,
  archived    boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.habits enable row level security;
create policy "Users manage own habits"
  on public.habits for all using (auth.uid() = user_id);

-- ── Habit logs ─────────────────────────────────────────────
create table public.habit_logs (
  id          uuid primary key default gen_random_uuid(),
  habit_id    uuid references public.habits(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  log_date    date not null,
  completed   boolean default true,
  updated_at  timestamptz default now(),
  unique(habit_id, log_date)
);
alter table public.habit_logs enable row level security;
create policy "Users manage own habit logs"
  on public.habit_logs for all using (auth.uid() = user_id);

-- ── Sleep logs ─────────────────────────────────────────────
create table public.sleep_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  log_date    date not null,
  hours       numeric(3,1) not null,
  updated_at  timestamptz default now(),
  unique(user_id, log_date)
);
alter table public.sleep_logs enable row level security;
create policy "Users manage own sleep logs"
  on public.sleep_logs for all using (auth.uid() = user_id);

-- ── Tasks ──────────────────────────────────────────────────
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  notes       text,
  priority    text default 'medium',     -- 'high' | 'medium' | 'low'
  status      text default 'pending',    -- 'pending' | 'done'
  due_date    date,
  completed_at timestamptz,
  updated_at  timestamptz default now(),
  created_at  timestamptz default now()
);
alter table public.tasks enable row level security;
create policy "Users manage own tasks"
  on public.tasks for all using (auth.uid() = user_id);

-- ── Journal entries ────────────────────────────────────────
create table public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  entry_date  date not null,
  prompt      text,
  content     text not null default '',
  word_count  int default 0,
  mood        int,                        -- 1-5 optional mood rating
  updated_at  timestamptz default now(),
  created_at  timestamptz default now(),
  unique(user_id, entry_date)
);
alter table public.journal_entries enable row level security;
create policy "Users manage own journal"
  on public.journal_entries for all using (auth.uid() = user_id);

-- ── Real-time: enable replication ──────────────────────────
alter publication supabase_realtime add table public.habits;
alter publication supabase_realtime add table public.habit_logs;
alter publication supabase_realtime add table public.sleep_logs;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.journal_entries;

-- ══════════════════════════════════════════════════════════
-- Done! Your FlowTrail database is ready.
-- ══════════════════════════════════════════════════════════
