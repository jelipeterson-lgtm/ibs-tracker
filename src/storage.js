const ENTRIES_KEY = 'ibs_log_entries';
const LAST_LOG_KEY = 'ibs_last_log_time';
const PIN_HASH_KEY = 'ibs_pin_hash';
const WEBAUTHN_CRED_KEY = 'ibs_webauthn_cred';
const MAX_ENTRIES = 500;

export function getEntries() {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEntry(entry) {
  const entries = getEntries();
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  localStorage.setItem(LAST_LOG_KEY, entry.ts);
}

export function updateEntry(updatedEntry) {
  const entries = getEntries();
  const idx = entries.findIndex(e => e.id === updatedEntry.id);
  if (idx === -1) return false;
  entries[idx] = updatedEntry;
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  return true;
}

export function getLastLogTime() {
  return localStorage.getItem(LAST_LOG_KEY) || null;
}

export function clearAll() {
  localStorage.removeItem(ENTRIES_KEY);
  localStorage.removeItem(LAST_LOG_KEY);
}

// --- JSON Export/Import for cross-device sync ---

export function exportAllData() {
  const entries = getEntries();
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    entries,
  };
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

    let added = 0;
    let updated = 0;
    for (const entry of incoming) {
      if (!entry.id || !entry.ts) continue;
      const idx = existing.findIndex(e => e.id === entry.id);
      if (idx === -1) {
        existing.push(entry);
        added++;
      } else {
        // If imported entry has been edited more recently, update it
        const existingEdited = existing[idx].editedAt || existing[idx].ts;
        const incomingEdited = entry.editedAt || entry.ts;
        if (new Date(incomingEdited) > new Date(existingEdited)) {
          existing[idx] = entry;
          updated++;
        }
      }
    }

    // Sort newest first
    existing.sort((a, b) => new Date(b.ts) - new Date(a.ts));
    if (existing.length > MAX_ENTRIES) existing.length = MAX_ENTRIES;

    localStorage.setItem(ENTRIES_KEY, JSON.stringify(existing));
    if (existing.length > 0) {
      localStorage.setItem(LAST_LOG_KEY, existing[0].ts);
    }

    return { added, updated };
  } catch (e) {
    throw new Error('Could not read backup file: ' + e.message);
  }
}

// --- PIN Lock ---

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode('ibs-va-tracker-salt:' + pin);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function isPinSet() {
  return !!localStorage.getItem(PIN_HASH_KEY);
}

export async function setPin(pin) {
  const h = await hashPin(pin);
  localStorage.setItem(PIN_HASH_KEY, h);
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
