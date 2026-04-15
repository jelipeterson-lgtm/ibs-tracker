import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEntries, exportAllData, linkToAccount, isPinSet, changePin } from '../storage';
import { getUserId } from '../supabase';

function exportCSV(entries) {
  const header = 'Date,Time,Episode #,Pain Level,Urgency,Stool Type,Straining,Bloating,Distension,Mucus,Duration,Functional Impact,Medications,Notes';
  const rows = [header];
  for (const e of entries) {
    const d = new Date(e.ts);
    const date = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const time = `${String(hours).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
    const impact = (e.impact || []).join(';');
    const meds = (e.meds || []).join(';');
    const notes = `"${(e.notes || '').replace(/"/g, '""')}"`;
    const duration = e.duration || '';
    rows.push(`${date},${time},${e.episodeNum},${e.pain},${e.urgency},${e.stoolType},${e.straining},${e.bloating},${e.distension},${e.mucus},${duration},${impact},${meds},${notes}`);
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  a.href = url;
  a.download = `IBS_Log_${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Settings() {
  const navigate = useNavigate();
  const entries = getEntries();
  const userId = getUserId();

  const [linkId, setLinkId] = useState('');
  const [syncMsg, setSyncMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const [showPinChange, setShowPinChange] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');

  const handleCopy = () => {
    if (userId) {
      navigator.clipboard.writeText(userId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }
  };

  const handleLink = async () => {
    const id = linkId.trim();
    if (!id) return;
    try {
      const result = await linkToAccount(id);
      setSyncMsg(`Linked! ${result.entries} entries synced. Reloading...`);
      setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
      setSyncMsg(e.message);
    }
  };

  const handlePinChange = async () => {
    if (currentPin.length !== 4 || newPin.length !== 4) {
      setPinMsg('PIN must be 4 digits');
      return;
    }
    const ok = await changePin(currentPin, newPin);
    if (ok) {
      setPinMsg('PIN updated');
      setShowPinChange(false);
      setCurrentPin('');
      setNewPin('');
    } else {
      setPinMsg('Current PIN is incorrect');
    }
  };

  const sectionLabel = (text) => (
    <div style={{
      fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
      color: 'var(--text-secondary)', letterSpacing: '0.06em', marginBottom: 8, marginTop: 20,
    }}>{text}</div>
  );

  const card = (children) => (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16, marginBottom: 8,
    }}>{children}</div>
  );

  const btnStyle = (primary) => ({
    width: '100%', height: 42, borderRadius: 8,
    background: primary ? 'var(--blue)' : 'transparent',
    border: primary ? 'none' : '1px solid var(--border)',
    color: primary ? 'white' : 'var(--blue-light)',
    fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono)',
  });

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Header */}
      <div style={{ paddingTop: 20, paddingBottom: 8 }}>
        <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
          SETTINGS
        </div>
      </div>

      {/* === Account & Sync === */}
      {sectionLabel('ACCOUNT & SYNC')}
      {card(
        <>
          {userId && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Your Account ID</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 10px', fontSize: 11, fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)', wordBreak: 'break-all',
                }}>{userId}</div>
                <button onClick={handleCopy} style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 12px', fontSize: 12,
                  color: copied ? 'var(--green)' : 'var(--blue-light)',
                  fontFamily: 'var(--font-mono)', cursor: 'pointer', whiteSpace: 'nowrap',
                }}>{copied ? '✓ Copied' : 'Copy'}</button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Entries and PIN sync automatically across devices.
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Link Another Device</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={linkId} onChange={e => setLinkId(e.target.value)}
              placeholder="Paste Account ID"
              style={{
                flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '8px 10px', fontSize: 16, color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)', outline: 'none',
              }}
            />
            <button onClick={handleLink} style={btnStyle(true)}>Link</button>
          </div>
          {syncMsg && (
            <div style={{ fontSize: 12, color: syncMsg.includes('!') ? 'var(--green)' : 'var(--red)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
              {syncMsg}
            </div>
          )}
        </>
      )}

      {/* === Security === */}
      {sectionLabel('SECURITY')}
      {card(
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>PIN Lock</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {isPinSet() ? 'PIN is set · Locks after 5 min' : 'Not set'}
              </div>
            </div>
            {isPinSet() && (
              <button onClick={() => setShowPinChange(!showPinChange)} style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 6, padding: '6px 12px', fontSize: 12,
                color: 'var(--blue-light)', fontFamily: 'var(--font-mono)', cursor: 'pointer',
              }}>Change</button>
            )}
          </div>
          {showPinChange && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="password" inputMode="numeric" maxLength={4}
                value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Current PIN"
                style={{
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 10px', fontSize: 16, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)', outline: 'none',
                }}
              />
              <input
                type="password" inputMode="numeric" maxLength={4}
                value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="New PIN"
                style={{
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 10px', fontSize: 16, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)', outline: 'none',
                }}
              />
              <button onClick={handlePinChange} style={btnStyle(true)}>Update PIN</button>
              {pinMsg && (
                <div style={{ fontSize: 12, color: pinMsg === 'PIN updated' ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                  {pinMsg}
                </div>
              )}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Biometrics (Face ID / Touch ID) are set up per device.
          </div>
        </>
      )}

      {/* === Exports === */}
      {sectionLabel('EXPORTS')}
      {card(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => exportCSV(entries)} style={btnStyle(false)}>
            Export Log to CSV
          </button>
          <button onClick={exportAllData} style={btnStyle(false)}>
            Export JSON Backup
          </button>
          <button onClick={() => navigate('/report')} style={btnStyle(false)}>
            Generate VA Report
          </button>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            CSV for your VSO · JSON for device backup · Report for VA claim
          </div>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}
