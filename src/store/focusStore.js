import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Detect if running on Android/mobile browser */
export const isMobile = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

export const useFocusStore = create(
  persist(
    (set, get) => ({
      // ── Blocked sites ───────────────────────────────────
      blockedSites: [
        'instagram.com', 'twitter.com', 'x.com',
        'youtube.com', 'reddit.com', 'facebook.com',
        'tiktok.com', 'netflix.com', 'snapchat.com',
      ],
      addSite: (site) => {
        const clean = site.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].trim()
        if (!clean) return
        set(s => ({ blockedSites: [...new Set([...s.blockedSites, clean])] }))
      },
      removeSite: (site) =>
        set(s => ({ blockedSites: s.blockedSites.filter(b => b !== site) })),

      // ── Mobile soft-blocker active flag ────────────────
      mobileBlockerActive: false,
      setMobileBlocker: (v) => set({ mobileBlockerActive: v }),

      // ── Focus session ───────────────────────────────────
      sessionActive:  false,
      sessionMinutes: 25,
      sessionStart:   null,
      sessionLabel:   '',

      startSession: (minutes, label) => {
        set({
          sessionActive:  true,
          sessionMinutes: minutes,
          sessionStart:   Date.now(),
          sessionLabel:   label || 'Deep work',
        })
        if (isMobile()) set({ mobileBlockerActive: true })
      },

      endSession: (completedFully = false) => {
        const { sessionLabel, sessionMinutes } = get()
        set(s => ({
          sessionActive:       false,
          sessionStart:        null,
          sessionLabel:        '',
          mobileBlockerActive: false,
          sessionHistory: [
            { label: sessionLabel, minutes: sessionMinutes, completedFully, date: new Date().toISOString() },
            ...s.sessionHistory,
          ].slice(0, 50),
        }))
      },

      // ── Intent log ──────────────────────────────────────
      intentLog: [],
      addIntent: (site, reason) =>
        set(s => ({
          intentLog: [
            { site, reason, time: new Date().toISOString() },
            ...s.intentLog,
          ].slice(0, 100),
        })),
      clearIntentLog: () => set({ intentLog: [] }),

      // ── Session history ─────────────────────────────────
      sessionHistory: [],
    }),
    {
      name: 'flowtrail-focus',
      partialize: (s) => ({
        blockedSites:   s.blockedSites,
        intentLog:      s.intentLog,
        sessionHistory: s.sessionHistory,
      }),
    }
  )
)
