import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://odhqmsiagaifqitzfqbf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VLCUmysDQ3gJMHB3thSwxA_u3uJAuts';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USER_ID_KEY = 'ibs_user_id';
const USERNAME_KEY = 'ibs_username';

export function getUserId() {
  return localStorage.getItem(USER_ID_KEY);
}

export function setUserId(id) {
  localStorage.setItem(USER_ID_KEY, id);
}

export function getUsername() {
  return localStorage.getItem(USERNAME_KEY);
}

export function setUsername(name) {
  localStorage.setItem(USERNAME_KEY, name);
}

// Create a new account with username
export async function createAccount(username, pinHash) {
  const userId = crypto.randomUUID();
  const { error } = await supabase
    .from('user_data')
    .insert([{ user_id: userId, username: username.toLowerCase().trim(), pin_hash: pinHash, entries: [], updated_at: new Date().toISOString() }]);

  if (error) {
    if (error.code === '23505') throw new Error('That name is already taken. Try another.');
    throw new Error('Could not create account: ' + error.message);
  }

  setUserId(userId);
  setUsername(username.toLowerCase().trim());
  return userId;
}

// Sign in with username + PIN hash
export async function signIn(username, pinHash) {
  const { data, error } = await supabase
    .from('user_data')
    .select('user_id, entries, pin_hash')
    .eq('username', username.toLowerCase().trim())
    .single();

  if (error || !data) throw new Error('No account found with that name.');
  if (data.pin_hash !== pinHash) throw new Error('Incorrect PIN.');

  setUserId(data.user_id);
  setUsername(username.toLowerCase().trim());
  return data;
}

// Push local state to cloud
export async function pushToCloud(entries, pinHash) {
  const userId = getUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('user_data')
    .upsert([{ user_id: userId, entries, pin_hash: pinHash || undefined, updated_at: new Date().toISOString() }], { onConflict: 'user_id' });

  if (error) console.warn('Sync push failed:', error.message);
}

// Pull cloud state
export async function pullFromCloud() {
  const userId = getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('user_data')
    .select('entries, pin_hash, updated_at')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
}
