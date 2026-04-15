import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEntries, exportAllData, isPinSet, changePin } from '../storage';

function exportCSV(entries) {
  const header = 'Date,Time,Pain Level,Stool Type,Urgency,Straining,Bloating,Distension,Mucus,Duration,Functional Impact,Medications,Notes';
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
    rows.push(`${date},${time},${e.pain},${e.stoolType},${e.urgency},${e.straining},${e.bloating},${e.distension},${e.mucus},${duration},${impact},${meds},${notes}`);
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
  const [showPinChange, setShowPinChange] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');

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

  const btn = (label, onClick) => (
    <button onClick={onClick} style={{
      width: '100%', height: 42, borderRadius: 8, background: 'transparent',
      border: '1px solid var(--border)', color: 'var(--blue-light)',
      fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono)', marginBottom: 6,
    }}>{label}</button>
  );

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ paddingTop: 20, paddingBottom: 8 }}>
        <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
          SETTINGS
        </div>
      </div>

      {/* Security */}
      {sectionLabel('SECURITY')}
      {card(
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>PIN Lock</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {isPinSet() ? 'Locks after 5 min inactivity' : 'Not set'}
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
              <input type="password" inputMode="numeric" maxLength={4}
                value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Current PIN"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 10px', fontSize: 16, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)', outline: 'none' }} />
              <input type="password" inputMode="numeric" maxLength={4}
                value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="New PIN"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 10px', fontSize: 16, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)', outline: 'none' }} />
              <button onClick={handlePinChange} style={{
                width: '100%', height: 42, borderRadius: 8, background: 'var(--blue)',
                border: 'none', color: 'white', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono)',
              }}>Update PIN</button>
              {pinMsg && <div style={{ fontSize: 12, color: pinMsg === 'PIN updated' ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>{pinMsg}</div>}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Face ID / Touch ID set up per device on first sign-in.
          </div>
        </>
      )}

      {/* Exports */}
      {sectionLabel('EXPORTS')}
      {card(
        <div>
          {btn('Export Log to CSV', () => exportCSV(entries))}
          {btn('Export JSON Backup', exportAllData)}
          {btn('Generate VA Report', () => navigate('/report'))}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            CSV for your VSO · JSON for backup · Report for VA claim
          </div>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}
