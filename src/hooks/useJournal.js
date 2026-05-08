import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { uuid } from '@/lib/db'
import { TODAY } from '@/lib/utils'

function useSupabaseTable(table, userId, query = null) {
  const [data, setData] = useState([])

  useEffect(() => {
    if (!userId || !supabase) return
    const fetch = async () => {
      const q = query
        ? query(supabase.from(table).select('*').eq('user_id', userId))
        : supabase.from(table).select('*').eq('user_id', userId)
      const { data: rows } = await q
      if (rows) setData(rows)
    }
    fetch()
    const channel = supabase.channel(`${table}_${userId}_${Math.random()}`)
    channel.on('postgres_changes',
      { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
      () => fetch()
    ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return data
}

export function useJournalEntries(userId) {
  const entries = useSupabaseTable('journal_entries', userId,
    q => q.order('updated_at', { ascending: false })
  )
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
  const { error } = await supabase.from('journal_entries').insert(record)
  if (error) { console.error('createJournalEntry:', error); return null }
  return record.id
}

export async function updateJournalEntry(id, { content, title }) {
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
  return useSupabaseTable('sleep_logs', userId, q => q.order('log_date', { ascending: false }).limit(days))
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