import { pushToCloud, pullFromCloud, getUserId, supabase } from './supabase';

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

// --- WebAuthn (per-device) ---

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

function syncPush() {
  if (!getUserId()) return;
  const entries = getEntries();
  const pinHash = getPinHash();
  pushToCloud(entries, pinHash).catch(() => {});
}

// Called on app load — merge cloud data with local
export async function syncOnLoad() {
  if (!supabase || !getUserId()) return;

  const cloud = await pullFromCloud();
  if (!cloud) { syncPush(); return; }

  const localEntries = getEntries();
  const cloudEntries = cloud.entries || [];

  // Merge by ID, newest wins
  const merged = new Map();
  for (const e of localEntries) merged.set(e.id, e);
  for (const e of cloudEntries) {
    if (!e.id) continue;
    const existing = merged.get(e.id);
    if (!existing) {
      merged.set(e.id, e);
    } else {
      const localTime = existing.editedAt || existing.ts;
      const cloudTime = e.editedAt || e.ts;
      if (new Date(cloudTime) > new Date(localTime)) merged.set(e.id, e);
    }
  }

  const allEntries = Array.from(merged.values()).sort((a, b) => new Date(b.ts) - new Date(a.ts));
  writeEntries(allEntries);

  if (!isPinSet() && cloud.pin_hash) {
    localStorage.setItem(PIN_HASH_KEY, cloud.pin_hash);
  }

  syncPush();
}

// --- Export ---

export function exportAllData() {
  const entries = getEntries();
  const data = { version: 2, exportedAt: new Date().toISOString(), entries };
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
