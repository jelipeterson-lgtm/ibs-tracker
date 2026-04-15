import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://odhqmsiagaifqitzfqbf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VLCUmysDQ3gJMHB3thSwxA_u3uJAuts';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Single user — all devices share this ID
const USER_ID = 'a0000000-0000-0000-0000-000000000001';

export function getUserId() {
  return USER_ID;
}

// Push entries + PIN hash to cloud
export async function pushToCloud(entries, pinHash) {
  const { error } = await supabase
    .from('user_data')
    .upsert([{
      user_id: USER_ID,
      entries,
      pin_hash: pinHash || null,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' });

  if (error) console.warn('Sync push failed:', error.message);
}

// Pull from cloud
export async function pullFromCloud() {
  const { data, error } = await supabase
    .from('user_data')
    .select('entries, pin_hash, updated_at')
    .eq('user_id', USER_ID)
    .single();

  if (error) return null;
  return data;
}
