import { pushToCloud, pullFromCloud, getUserId, generateUserId, supabase } from './supabase';

const ENTRIES_KEY = 'ibs_log_entries';
const LAST_LOG_KEY = 'ibs_last_log_time';
const PIN_HASH_KEY = 'ibs_pin_hash';
const WEBAUTHN_CRED_KEY = 'ibs_webauthn_cred';
const MAX_ENTRIES = 500;

// --- Core entry functions ---

export function getEntries() {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeEntries(entries) {
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  if (entries.length > 0) {
    localStorage.setItem(LAST_LOG_KEY, entries[0].ts);
  }
}

export function saveEntry(entry) {
  const entries = getEntries();
  entries.unshift(entry);
  writeEntries(entries);
  syncPush();
}

export function updateEntry(updatedEntry) {
  const entries = getEntries();
  const idx = entries.findIndex(e => e.id === updatedEntry.id);
  if (idx === -1) return false;
  entries[idx] = updatedEntry;
  writeEntries(entries);
  syncPush();
  return true;
}

export function getLastLogTime() {
  return localStorage.getItem(LAST_LOG_KEY) || null;
}

export function clearAll() {
  localStorage.removeItem(ENTRIES_KEY);
  localStorage.removeItem(LAST_LOG_KEY);
}

// --- PIN ---

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode('ibs-va-tracker-salt:' + pin);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function isPinSet() {
  return !!localStorage.getItem(PIN_HASH_KEY);
}

export function getPinHash() {
  return localStorage.getItem(PIN_HASH_KEY);
}

export async function setPin(pin) {
  const h = await hashPin(pin);
  localStorage.setItem(PIN_HASH_KEY, h);
  syncPush();
}

export async function verifyPin(pin) {
  const stored = localStorage.getItem(PIN_HASH_KEY);
  if (!stored) return true;
  const h = await hashPin(pin);
  return h === stored;
}

export async function changePin(currentPin, newPin) {
  const valid = await verifyPin(currentPin);
  if (!valid) return false;
  await setPin(newPin);
  return true;
}

// --- WebAuthn (always per-device, not synced) ---

export function getWebAuthnCredential() {
  try {
    const raw = localStorage.getItem(WEBAUTHN_CRED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setWebAuthnCredential(cred) {
  localStorage.setItem(WEBAUTHN_CRED_KEY, JSON.stringify(cred));
}

export function clearWebAuthnCredential() {
  localStorage.removeItem(WEBAUTHN_CRED_KEY);
}

// --- Cloud Sync ---

// Fire-and-forget push to cloud after any local change
function syncPush() {
  const entries = getEntries();
  const pinHash = getPinHash();
  pushToCloud(entries, pinHash).catch(() => {});
}

// Merge cloud data into local — called on app load
export async function syncOnLoad() {
  if (!supabase) return;

  // Ensure we have a user ID
  let userId = getUserId();
  if (!userId) {
    userId = generateUserId();
  }

  const cloud = await pullFromCloud(userId);

  if (!cloud) {
    // No cloud data yet — push local state up
    syncPush();
    return;
  }

  const localEntries = getEntries();
  const cloudEntries = cloud.entries || [];

  // Merge: build map by ID, newest wins
  const merged = new Map();
  for (const e of localEntries) {
    merged.set(e.id, e);
  }
  for (const e of cloudEntries) {
    if (!e.id) continue;
    const existing = merged.get(e.id);
    if (!existing) {
      merged.set(e.id, e);
    } else {
      const existingTime = existing.editedAt || existing.ts;
      const cloudTime = e.editedAt || e.ts;
      if (new Date(cloudTime) > new Date(existingTime)) {
        merged.set(e.id, e);
      }
    }
  }

  // Sort newest first, write back
  const allEntries = Array.from(merged.values()).sort((a, b) => new Date(b.ts) - new Date(a.ts));
  writeEntries(allEntries);

  // Sync PIN from cloud if local doesn't have one
  if (!isPinSet() && cloud.pin_hash) {
    localStorage.setItem(PIN_HASH_KEY, cloud.pin_hash);
  }

  // Push merged state back to cloud
  syncPush();
}

// Link to existing account — pulls everything from cloud
export async function linkToAccount(existingUserId) {
  const { linkDevice } = await import('./supabase');
  const cloud = await linkDevice(existingUserId);

  // Replace local data with cloud data
  const cloudEntries = cloud.entries || [];
  cloudEntries.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  writeEntries(cloudEntries);

  if (cloud.pin_hash) {
    localStorage.setItem(PIN_HASH_KEY, cloud.pin_hash);
  }

  return { entries: cloudEntries.length };
}

// --- JSON Export/Import (kept as backup option) ---

export function exportAllData() {
  const entries = getEntries();
  const data = { version: 2, exportedAt: new Date().toISOString(), userId: getUserId(), entries };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  a.href = url;
  a.download = `IBS_Backup_${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const incoming = data.entries || data;
    if (!Array.isArray(incoming)) throw new Error('Invalid format');

    const existing = getEntries();
    const existingIds = new Set(existing.map(e => e.id));

    let added = 0, updated = 0;
    for (const entry of incoming) {
      if (!entry.id || !entry.ts) continue;
      const idx = existing.findIndex(e => e.id === entry.id);
      if (idx === -1) { existing.push(entry); added++; }
      else {
        const existingEdited = existing[idx].editedAt || existing[idx].ts;
        const incomingEdited = entry.editedAt || entry.ts;
        if (new Date(incomingEdited) > new Date(existingEdited)) { existing[idx] = entry; updated++; }
      }
    }

    existing.sort((a, b) => new Date(b.ts) - new Date(a.ts));
    writeEntries(existing);
    syncPush();
    return { added, updated };
  } catch (e) {
    throw new Error('Could not read backup file: ' + e.message);
  }
}
