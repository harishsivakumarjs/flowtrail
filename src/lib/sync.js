// Sync is now handled directly via Supabase in each hook
// This file kept for import compatibility
export const deletedIds = new Set()
export function markLocalWrite() {}
export async function upsertToCloud() {}
export async function deleteFromCloud() {}
export async function syncToCloud() {}
export async function syncFromCloud() {}
export async function fullSync() {}
export function subscribeRealtime(userId, onUpdate) {
  return () => {}
}