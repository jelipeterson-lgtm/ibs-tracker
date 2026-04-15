import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEntries } from '../storage';
import { calculateCurrentRating, filterTo90Days, groupByDate, getQualifyingSymptomCount } from '../ratingEngine';

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

const ratingColors = { 0: 'var(--text-muted)', 10: 'var(--yellow)', 20: '#86efac', 30: 'var(--green)' };

export default function Summary() {
  const navigate = useNavigate();
  const entries = useMemo(() => getEntries(), []);
  const filtered = useMemo(() => filterTo90Days(entries), [entries]);
  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const rating = useMemo(() => calculateCurrentRating(entries), [entries]);

  const totalEpisodes = filtered.length;
  const daysLogged = Object.keys(grouped).length;

  const painDays = useMemo(() => {
    let count = 0;
    for (const dateKey of Object.keys(grouped)) {
      if (grouped[dateKey].some(e => e.pain !== 'None')) count++;
    }
    return count;
  }, [grouped]);

  const qualifyingDays = useMemo(() => {
    let count = 0;
    for (const dateKey of Object.keys(grouped)) {
      if (grouped[dateKey].some(e => getQualifyingSymptomCount(e) >= 2)) count++;
    }
    return count;
  }, [grouped]);

  const painDaysPerWeek = useMemo(() => {
    if (daysLogged === 0) return '0.0';
    const dates = filtered.map(e => new Date(e.ts));
    const earliest = new Date(Math.min(...dates));
    const today = new Date();
    const earliestDay = new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const totalDays = Math.floor((todayDay - earliestDay) / (1000 * 60 * 60 * 24)) + 1;
    const weeks = Math.max(1, totalDays / 7);
    return (painDays / weeks).toFixed(1);
  }, [filtered, painDays, daysLogged]);

  const mostCommonStool = useMemo(() => {
    const counts = {};
    for (const e of filtered) {
      if (e.stoolType) {
        counts[e.stoolType] = (counts[e.stoolType] || 0) + 1;
      }
    }
    let max = 0, result = '—';
    for (const [k, v] of Object.entries(counts)) {
      if (v > max) { max = v; result = k; }
    }
    return result;
  }, [filtered]);

  if (filtered.length === 0) {
    return (
      <div style={{ padding: '0 16px' }}>
        <div style={{ paddingTop: 20, paddingBottom: 16 }}>
          <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>SUMMARY</div>
          <div style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-muted)' }}>90-Day Report</div>
        </div>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 24, textAlign: 'center'
        }}>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>No data yet. Start logging to see your summary.</div>
          <button onClick={() => navigate('/log')} style={{
            background: 'var(--blue)', color: 'white', border: 'none',
            borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-body)'
          }}>Log an Episode</button>
        </div>
      </div>
    );
  }

  const criteriaRows = [
    { rating: '30%', req: 'Pain ≥ 1x/week (13 days)', data: `${painDays} days`, met: painDays >= 13 && qualifyingDays >= 13 },
    { rating: '20%', req: 'Pain ≥ 3x/month (9 days)', data: `${painDays} days`, met: painDays >= 9 && qualifyingDays >= 9 },
    { rating: '10%', req: 'Pain ≥ 1 time (1 day)', data: `${painDays} days`, met: painDays >= 1 && qualifyingDays >= 1 },
  ];

  // Find highest met row index
  const highestMetIdx = criteriaRows.findIndex(r => r.met);

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Header */}
      <div style={{ paddingTop: 20, paddingBottom: 16 }}>
        <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>SUMMARY</div>
        <div style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-muted)' }}>90-Day Report</div>
      </div>

      {/* VA Rating Criteria */}
      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
        VA RATING CRITERIA — DC 7319
      </div>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden', marginBottom: 16
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '50px 1fr 70px 70px',
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)'
        }}>
          <span>Rating</span><span>Requirement</span><span>Your Data</span><span>Status</span>
        </div>
        {criteriaRows.map((r, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '50px 1fr 70px 70px',
            padding: '12px 16px',
            borderBottom: i < criteriaRows.length - 1 ? '1px solid var(--border)' : 'none',
            background: i === highestMetIdx ? 'var(--blue-dim)' : 'transparent',
            borderLeft: i === highestMetIdx ? '3px solid var(--blue)' : 'none',
            fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-primary)',
            alignItems: 'center'
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.rating}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.req}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{r.data}</span>
            <span style={{ color: r.met ? 'var(--green)' : 'var(--text-muted)', fontSize: 12 }}>
              {r.met ? '✓ Met' : '○ Not yet'}
            </span>
          </div>
        ))}
      </div>

      {/* 90-Day Stats Grid */}
      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
        90-DAY STATS
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { num: totalEpisodes, l1: 'TOTAL', l2: 'EPISODES' },
          { num: daysLogged, l1: 'DAYS', l2: 'LOGGED' },
          { num: painDays, l1: 'PAIN', l2: 'DAYS' },
          { num: qualifyingDays, l1: 'QUALIFYING', l2: 'DAYS' },
          { num: painDaysPerWeek, l1: 'PAIN DAYS', l2: '/WEEK AVG' },
          { num: mostCommonStool, l1: 'MOST COMMON', l2: 'STOOL', isText: true },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 8px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center'
          }}>
            <div style={{
              fontSize: s.isText ? 14 : 28, fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)', wordBreak: 'break-word'
            }}>{s.num}</div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{s.l1}</div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{s.l2}</div>
          </div>
        ))}
      </div>

      {/* Current Rating */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center'
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
      </div>

      {/* Export */}
      <button onClick={() => exportCSV(entries)} style={{
        width: '100%', height: 52, borderRadius: 10, background: 'transparent',
        border: '1px solid var(--border-active)', color: 'var(--blue-light)',
        fontFamily: 'var(--font-mono)', fontSize: 15, textTransform: 'uppercase',
        letterSpacing: '0.06em', cursor: 'pointer'
      }}>↓ EXPORT LOG TO CSV</button>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24 }}>
        This log is intended to support a VA disability claim. Present this export to your VSO. Actual VA rating is determined at a C&P exam, not by this app.
      </div>
    </div>
  );
}
