import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { uuid } from '@/lib/db'
import { TODAY } from '@/lib/utils'

// Global listeners for instant UI updates without realtime
let journalListeners = []
function notifyJournal() { journalListeners.forEach(fn => fn()) }

export function useJournalEntries(userId) {
  const [entries, setEntries] = useState([])

  const fetch = useCallback(async () => {
    if (!userId || !supabase) return
    const { data } = await supabase.from('journal_entries').select('*')
      .eq('user_id', userId).order('updated_at', { ascending: false })
    if (data) setEntries(data)
  }, [userId])

  useEffect(() => {
    fetch()
    journalListeners.push(fetch)
    return () => { journalListeners = journalListeners.filter(f => f !== fetch) }
  }, [fetch])

  return entries
}

export function useJournalEntriesForDate(userId, date) {
  const all = useJournalEntries(userId)
  return all.filter(e => e.entry_date === date)
    .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
}

export async function createJournalEntry({ userId, date, content, prompt, title }) {
  if (!supabase) return null
  const wordCount = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length
  const record = {
    id: uuid(), user_id: userId,
    entry_date: date, title: title || '',
    prompt: prompt || '', content, word_count: wordCount,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('journal_entries').insert(record)
  if (error) { console.error('createJournalEntry:', error); return null }
  notifyJournal()
  return record.id
}

export async function updateJournalEntry(id, { content, title }) {
  if (!supabase) return
  const wordCount = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length
  const { error } = await supabase.from('journal_entries').update({
    content, title: title || '', word_count: wordCount,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) console.error('updateJournalEntry:', error)
  else notifyJournal()
}

export async function deleteJournalEntry(id) {
  if (!supabase) return
  const { error } = await supabase.from('journal_entries').delete().eq('id', id)
  if (error) console.error('deleteJournalEntry:', error)
  else notifyJournal()
}

export function useSleepLog(userId, date) {
  const [log, setLog] = useState(null)
  useEffect(() => {
    if (!userId || !supabase) return
    supabase.from('sleep_logs').select('*').eq('user_id', userId).eq('log_date', date).maybeSingle()
      .then(({ data }) => setLog(data || null))
  }, [userId, date])
  return log
}

export function useSleepLogs(userId, days = 30) {
  const [logs, setLogs] = useState([])
  useEffect(() => {
    if (!userId || !supabase) return
    supabase.from('sleep_logs').select('*').eq('user_id', userId)
      .order('log_date', { ascending: false }).limit(days)
      .then(({ data }) => { if (data) setLogs(data) })
  }, [userId, days])
  return logs
}

export async function saveSleepLog({ userId, date, hours }) {
  if (!supabase) return
  const { data: existing } = await supabase.from('sleep_logs').select('id')
    .eq('user_id', userId).eq('log_date', date).maybeSingle()
  if (existing) {
    await supabase.from('sleep_logs').update({ hours, updated_at: new Date().toISOString() }).eq('id', existing.id)
  } else {
    await supabase.from('sleep_logs').insert({ id: uuid(), user_id: userId, log_date: date, hours, updated_at: new Date().toISOString() })
  }
}