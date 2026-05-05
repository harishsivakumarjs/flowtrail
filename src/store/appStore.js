import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set, get) => ({
      // ── Theme ──────────────────────────────────
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        document.documentElement.classList.toggle('dark',  next === 'dark')
        document.documentElement.classList.toggle('light', next === 'light')
      },
      applyTheme: () => {
        const t = get().theme
        document.documentElement.classList.toggle('dark',  t === 'dark')
        document.documentElement.classList.toggle('light', t === 'light')
      },

      // ── Auth — persisted so demo + real user survive page reload ──
      user: null,
      setUser: (user) => set({ user }),

      // ── Sync status ────────────────────────────
      syncing: false,
      lastSync: null,
      setSyncing: (v) => set({ syncing: v }),
      setLastSync: () => set({ lastSync: new Date().toISOString() }),

      // ── UI state ───────────────────────────────
      sidebarOpen: false,
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
    }),
    {
      name: 'flowtrail-app',
      // Now persists user AND theme
      partialize: (s) => ({ theme: s.theme, user: s.user }),
    }
  )
)