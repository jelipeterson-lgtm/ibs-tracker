import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const USER_ID_KEY = 'ibs_user_id';

export function getUserId() {
  return localStorage.getItem(USER_ID_KEY);
}

export function setUserId(id) {
  localStorage.setItem(USER_ID_KEY, id);
}

export function generateUserId() {
  const id = crypto.randomUUID();
  setUserId(id);
  return id;
}

// Push local state to Supabase
export async function pushToCloud(entries, pinHash) {
  if (!supabase) return;
  const userId = getUserId();
  if (!userId) return;

  const payload = { user_id: userId, entries, pin_hash: pinHash || null, updated_at: new Date().toISOString() };

  const { error } = await supabase
    .from('user_data')
    .upsert([payload], { onConflict: 'user_id' });

  if (error) console.warn('Sync push failed:', error.message);
}

// Pull cloud state
export async function pullFromCloud(userId) {
  if (!supabase) return null;
  const id = userId || getUserId();
  if (!id) return null;

  const { data, error } = await supabase
    .from('user_data')
    .select('entries, pin_hash, updated_at')
    .eq('user_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no row found
    console.warn('Sync pull failed:', error.message);
    return null;
  }
  return data;
}

// Link this device to an existing cloud account
export async function linkDevice(existingUserId) {
  if (!supabase) throw new Error('Sync not configured');

  const data = await pullFromCloud(existingUserId);
  if (!data) throw new Error('No account found with that ID');

  setUserId(existingUserId);
  return data;
}
