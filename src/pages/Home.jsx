import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEntries, exportAllData, importData, linkToAccount } from '../storage';
import { getUserId } from '../supabase';
import { calculateCurrentRating, calculatePaceStatus, filterTo90Days, groupByDate } from '../ratingEngine';

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

const statusColors = {
  green: { dot: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green)', label: 'ON PACE' },
  yellow: { dot: 'var(--yellow)', bg: 'var(--yellow-bg)', border: 'var(--yellow)', label: 'WATCH YOUR PACE' },
  red: { dot: 'var(--red)', bg: 'var(--red-bg)', border: 'var(--red)', label: 'OFF PACE' },
};

const ratingColors = { 0: 'var(--text-muted)', 10: 'var(--yellow)', 20: '#86efac', 30: 'var(--green)' };

function SyncSection() {
  const [linkId, setLinkId] = useState('');
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const userId = getUserId();

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
      setMsg(`Linked! ${result.entries} entries synced. Reloading...`);
      setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16, marginBottom: 24,
    }}>
      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
        ACCOUNT & SYNC
      </div>

      {userId && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Your Account ID</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 10px', fontSize: 12, fontFamily: 'var(--font-mono)',
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
            Entries and PIN sync automatically. Copy this ID to link another device.
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Link Another Device</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={linkId} onChange={e => setLinkId(e.target.value)}
            placeholder="Paste Account ID here"
            style={{
              flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 10px', fontSize: 16, color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)', outline: 'none',
            }}
          />
          <button onClick={handleLink} style={{
            background: 'var(--blue)', border: 'none', borderRadius: 6,
            padding: '8px 16px', color: 'white', fontSize: 13,
            fontFamily: 'var(--font-mono)', cursor: 'pointer',
          }}>Link</button>
        </div>
      </div>

      {msg && (
        <div style={{ fontSize: 12, color: msg.includes('!') ? 'var(--green)' : 'var(--red)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
          {msg}
        </div>
      )}

      <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <button onClick={exportAllData} style={{
          width: '100%', height: 38, borderRadius: 8, background: 'transparent',
          border: '1px solid var(--border)', color: 'var(--text-muted)',
          fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)',
        }}>Export JSON Backup</button>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const entries = useMemo(() => getEntries(), []);
  const hasEntries = entries.length > 0;
  const rating = useMemo(() => calculateCurrentRating(entries), [entries]);
  const pace = useMemo(() => calculatePaceStatus(entries), [entries]);
  const filtered90 = useMemo(() => filterTo90Days(entries), [entries]);
  const grouped90 = useMemo(() => groupByDate(filtered90), [filtered90]);


  const daysLogged = Object.keys(grouped90).length;
  const todayEpisodes = grouped90[(() => {
    const d = new Date();
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  })()] || [];
  const total90 = filtered90.length;

  const sc = statusColors[pace.status] || statusColors.green;
  const progressPct = Math.min(100, (pace.painDaysLogged / 13) * 100);

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Header */}
      <div style={{ paddingTop: 20, paddingBottom: 16 }}>
        <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
          IBS VA TRACKER
        </div>
        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          DC 7319 — Symptom Log
        </div>
      </div>

      {!hasEntries ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderLeft: '3px solid var(--blue)', borderRadius: 12, padding: 16, marginBottom: 12
        }}>
          <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--blue-light)', marginBottom: 8 }}>
            START YOUR LOG
          </div>
          <div style={{ fontSize: 15, color: 'var(--text-primary)', marginBottom: 8 }}>
            Log your first episode to begin building evidence for your VA claim.
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Target: 13+ pain days in 90 days for a 30% rating under DC 7319.
          </div>
          <button onClick={() => navigate('/log')} style={{
            background: 'none', border: 'none', color: 'var(--blue-light)',
            fontSize: 15, cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0
          }}>Log First Episode →</button>
        </div>
      ) : (
        <>
          {/* Pace Tracker Card */}
          <div style={{
            background: sc.bg, border: '1px solid var(--border)',
            borderLeft: `3px solid ${sc.border}`, borderRadius: 12, padding: 16, marginBottom: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: sc.dot }} />
              <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: sc.dot }}>
                {sc.label}
              </span>
            </div>
            <div style={{ marginTop: 12, background: 'var(--bg-input)', height: 8, borderRadius: 4, width: '100%' }}>
              <div style={{
                height: 8, borderRadius: 4, background: sc.dot,
                width: `${progressPct}%`, transition: 'width 0.6s ease'
              }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {pace.painDaysLogged} of 13 pain days · {pace.daysRemaining} days left
            </div>
            <div style={{ marginTop: 10, fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
              {pace.message}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, fontFamily: 'var(--font-body)', color: 'var(--text-muted)' }}>
              30% VA rating requires 1 pain day/week (DC 7319)
            </div>
          </div>

          {/* VA Rating Estimate Card */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 16, marginBottom: 12, textAlign: 'center'
          }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              ESTIMATED RATING
            </div>
            <div style={{ fontSize: 48, fontFamily: 'var(--font-mono)', color: ratingColors[rating.rating], marginTop: 4 }}>
              {rating.rating}%
            </div>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
              {rating.rating > 0 ? 'Criteria likely met' : 'Keep logging'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              DC 7319 · Based on last 90 days · Actual rating determined at C&P exam
            </div>
          </div>

          {/* Stats Row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { num: daysLogged, l1: 'DAYS', l2: 'LOGGED' },
              { num: todayEpisodes.length, l1: 'TODAY', l2: 'EPISODES' },
              { num: total90, l1: '90 DAYS', l2: 'EPISODES' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 8px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center'
              }}>
                <div style={{ fontSize: 28, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{s.num}</div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{s.l1}</div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{s.l2}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <button onClick={() => navigate('/log')} style={{
          width: '100%', height: 52, borderRadius: 10, background: 'var(--blue)',
          color: 'white', fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-body)',
          border: 'none', cursor: 'pointer'
        }}>Log an Episode</button>
        {hasEntries && (
          <button onClick={() => exportCSV(entries)} style={{
            width: '100%', height: 48, borderRadius: 10, background: 'transparent',
            border: '1px solid var(--border-active)', color: 'var(--blue-light)',
            fontSize: 15, cursor: 'pointer', fontFamily: 'var(--font-body)'
          }}>Export Log to CSV</button>
        )}
      </div>

      {/* Account & Sync */}
      <SyncSection />
    </div>
  );
}
