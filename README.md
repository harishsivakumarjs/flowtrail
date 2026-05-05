# FlowTrail

**Personal productivity app — habits, tasks, journal & calendar. One codebase, all devices.**

Built with React + Vite, powered by Supabase for cloud sync, Dexie for offline storage. Installable as a PWA on Android and Windows. Free to host. Open source.

---

## Features

- **Habit tracker** — daily grid view, streaks, colour-coded per habit
- **To-do list** — priorities (high/med/low), due dates, filter by today/upcoming/all
- **Calendar** — unified monthly view of habits and tasks
- **Journal** — daily rich-text writing with rotating prompts, auto-save, word count, entry history
- **Analytics** — completion charts, sleep trends, per-habit breakdown
- **Sleep logging** — track hours slept, see patterns over time
- **Dark & light mode** — toggle anytime, persisted across sessions
- **Offline-first** — works without internet, syncs when connected
- **Cross-device sync** — same data on laptop, phone, and tablet via Supabase real-time
- **PWA** — install on Android (Add to Home Screen) and Windows (Chrome install)

---

## Quick start (5 minutes)

### 1. Clone & install

```bash
git clone https://github.com/yourusername/flowtrail.git
cd flowtrail
npm install
```

### 2. Set up Supabase (free)

1. Go to [supabase.com](https://supabase.com) → **New project** (pick any name)
2. Wait ~2 min for it to provision
3. Go to **SQL Editor** → paste the entire contents of `supabase/schema.sql` → click **Run**
4. Go to **Settings → API** → copy:
   - **Project URL** (looks like `https://abcdef.supabase.co`)
   - **anon public** key

### 3. Add your credentials

```bash
cp .env.example .env
```

Edit `.env` and paste your values:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Sign in with your email (magic link — no password needed).

> **No Supabase?** Click **"Try demo mode"** on the login page. All data stays local.

---

## Deploy to Vercel (free hosting)

1. Push this repo to your GitHub account
2. Go to [vercel.com](https://vercel.com) → **New project** → import your repo
3. In **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**

Your app is now live at `https://flowtrail-yourname.vercel.app` — accessible from any device.

---

## Install on Android (PWA)

1. Open your Vercel URL in **Chrome on Android**
2. Tap the **⋮ menu → Add to Home Screen**
3. Done — it installs like a native app, works offline, looks fullscreen

## Install on Windows (PWA)

1. Open your Vercel URL in **Chrome**
2. Click the **install icon** in the address bar (or Chrome menu → Install FlowTrail)

---

## Project structure

```
flowtrail/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx     ← today's overview
│   │   ├── Habits.jsx        ← month grid + streaks
│   │   ├── Tasks.jsx         ← to-do list
│   │   ├── Calendar.jsx      ← unified calendar
│   │   ├── Journal.jsx       ← daily writing
│   │   ├── Analytics.jsx     ← charts & trends
│   │   ├── Settings.jsx      ← theme, export, account
│   │   └── Login.jsx         ← magic link auth
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.jsx  ← responsive wrapper
│   │   │   ├── Sidebar.jsx   ← desktop nav
│   │   │   └── BottomNav.jsx ← mobile nav
│   │   └── ui/
│   │       ├── Modal.jsx
│   │       ├── ThemeToggle.jsx
│   │       └── SyncIndicator.jsx
│   ├── hooks/
│   │   ├── useHabits.js      ← habit CRUD + streaks
│   │   ├── useTasks.js       ← task CRUD
│   │   └── useJournal.js     ← journal + sleep CRUD
│   ├── lib/
│   │   ├── supabase.js       ← Supabase client
│   │   ├── db.js             ← Dexie offline DB
│   │   ├── sync.js           ← offline→cloud sync engine
│   │   ├── prompts.js        ← 30 journal prompts
│   │   └── utils.js          ← date helpers
│   ├── store/
│   │   └── appStore.js       ← Zustand global state
│   ├── App.jsx               ← routing + auth
│   ├── main.jsx              ← entry point
│   └── index.css             ← design tokens + global styles
├── supabase/
│   └── schema.sql            ← run once in Supabase SQL editor
├── public/
│   └── favicon.svg
├── .env.example              ← copy to .env and fill in
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Tech stack

| Layer | Tool | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast, modern, great DX |
| Styling | TailwindCSS | Utility-first, dark mode easy |
| Routing | React Router v6 | Industry standard |
| State | Zustand | Minimal, no boilerplate |
| Offline DB | Dexie.js (IndexedDB) | Fast offline store |
| Cloud DB | Supabase (PostgreSQL) | Free tier, real-time, auth |
| Rich text | Tiptap | Headless editor, no dependencies |
| Charts | Recharts | React-native, composable |
| PWA | vite-plugin-pwa | One-line PWA setup |

---

## License

MIT — do whatever you want with it.
