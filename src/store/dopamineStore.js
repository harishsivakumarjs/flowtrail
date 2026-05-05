import { create } from 'zustand'

export const useDopamineStore = create((set, get) => ({
  focusScore:     100,
  warnings:       [],
  tabSwitches:    0,
  lastActivity:   Date.now(),
  sessionStart:   null,
  inactiveSeconds: 0,

  recordActivity: () => {
    set({ lastActivity: Date.now(), inactiveSeconds: 0 })
  },

  recordTabSwitch: () => {
    set(s => {
      const switches = s.tabSwitches + 1
      let score = s.focusScore
      let warnings = [...s.warnings]

      if (switches % 3 === 0) {
        score = Math.max(0, score - 5)
        if (switches >= 6) {
          warnings = [{ msg: '⚠️ You are getting distracted — come back!', time: Date.now() }, ...warnings].slice(0, 5)
        }
      }
      return { tabSwitches: switches, focusScore: score, warnings }
    })
  },

  tickInactive: () => {
    set(s => {
      const secs = s.inactiveSeconds + 1
      let score = s.focusScore
      let warnings = [...s.warnings]

      if (secs === 120) {
        warnings = [{ msg: '😴 You have been inactive for 2 minutes', time: Date.now() }, ...warnings].slice(0, 5)
        score = Math.max(0, score - 3)
      }
      if (secs === 300) {
        warnings = [{ msg: '🔴 5 minutes of inactivity — time to refocus', time: Date.now() }, ...warnings].slice(0, 5)
        score = Math.max(0, score - 10)
      }
      return { inactiveSeconds: secs, focusScore: score, warnings }
    })
  },

  boostScore: (amount = 10) => {
    set(s => ({ focusScore: Math.min(100, s.focusScore + amount) }))
  },

  resetScore: () => {
    set({ focusScore: 100, tabSwitches: 0, warnings: [], inactiveSeconds: 0 })
  },

  dismissWarning: (time) => {
    set(s => ({ warnings: s.warnings.filter(w => w.time !== time) }))
  },
}))