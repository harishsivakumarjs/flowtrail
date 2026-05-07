import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { uuid } from '@/lib/db'
import { TODAY } from '@/lib/utils'

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
    if (!supabase || !userId) return
    const sub = supabase.channel(`journal_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries', filter: `user_id=eq.${userId}` }, fetch)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [userId, fetch])
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
    prompt, content, word_count: wordCount,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  await supabase.from('journal_entries').insert(record)
  return record.id
}

export async function updateJournalEntry(id, { content, title, userId }) {
  if (!supabase) return
  const wordCount = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length
  await supabase.from('journal_entries').update({
    content, title: title || '', word_count: wordCount,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
}

export async function deleteJournalEntry(id) {
  if (!supabase) return
  await supabase.from('journal_entries').delete().eq('id', id)
}

export function useSleepLogs(userId, days = 30) {
  const [logs, setLogs] = useState([])
  const fetch = useCallback(async () => {
    if (!userId || !supabase) return
    const { data } = await supabase.from('sleep_logs').select('*')
      .eq('user_id', userId).order('log_date', { ascending: false }).limit(days)
    if (data) setLogs(data)
  }, [userId, days])
  useEffect(() => { fetch() }, [fetch])
  return logs
}

export async function saveSleepLog({ userId, date, hours }) {
  if (!supabase) return
  const { data: existing } = await supabase.from('sleep_logs').select('id')
    .eq('user_id', userId).eq('log_date', date).single()
  if (existing) {
    await supabase.from('sleep_logs').update({ hours, updated_at: new Date().toISOString() }).eq('id', existing.id)
  } else {
    await supabase.from('sleep_logs').insert({ id: uuid(), user_id: userId, log_date: date, hours, updated_at: new Date().toISOString() })
  }
}

export function useSleepLog(userId, date) {
  const [log, setLog] = useState(null)
  useEffect(() => {
    if (!userId || !supabase) return
    supabase.from('sleep_logs').select('*').eq('user_id', userId).eq('log_date', date).single()
      .then(({ data }) => setLog(data || null))
  }, [userId, date])
  return log
}