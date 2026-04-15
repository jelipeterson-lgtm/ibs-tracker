import { useState, useMemo } from 'react';
import { getEntries } from '../storage';
import { getQualifyingSymptomCount } from '../ratingEngine';
import { Printer } from 'lucide-react';

function formatDate(d) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatDateLong(d) {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime12(d) {
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
}

function getWeekStart(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function weekLabel(start) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export default function Report() {
  const allEntries = useMemo(() => getEntries(), []);

  const [veteranName, setVeteranName] = useState('');
  const [lastFourSSN, setLastFourSSN] = useState('');
  const [claimNumber, setClaimNumber] = useState('');

  // Date range from data, editable
  const dataRange = useMemo(() => {
    if (allEntries.length === 0) return { start: '', end: '' };
    const dates = allEntries.map(e => new Date(e.ts));
    const earliest = new Date(Math.min(...dates));
    const latest = new Date(Math.max(...dates));
    return {
      start: `${earliest.getFullYear()}-${String(earliest.getMonth() + 1).padStart(2, '0')}-${String(earliest.getDate()).padStart(2, '0')}`,
      end: `${latest.getFullYear()}-${String(latest.getMonth() + 1).padStart(2, '0')}-${String(latest.getDate()).padStart(2, '0')}`,
    };
  }, [allEntries]);

  const [startDate, setStartDate] = useState(dataRange.start);
  const [endDate, setEndDate] = useState(dataRange.end);

  // Filter entries to date range
  const entries = useMemo(() => {
    if (!startDate || !endDate) return allEntries;
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate + 'T23:59:59');
    return allEntries.filter(entry => {
      const d = new Date(entry.ts);
      return d >= s && d <= e;
    });
  }, [allEntries, startDate, endDate]);

  // --- Computed stats ---
  const stats = useMemo(() => {
    if (entries.length === 0) return null;

    const dates = entries.map(e => new Date(e.ts));
    const earliest = new Date(Math.min(...dates));
    const latest = new Date(Math.max(...dates));
    const earliestDay = new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate());
    const latestDay = new Date(latest.getFullYear(), latest.getMonth(), latest.getDate());
    const totalDays = Math.floor((latestDay - earliestDay) / (1000 * 60 * 60 * 24)) + 1;

    // Group by date
    const byDate = {};
    for (const e of entries) {
      const d = new Date(e.ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(e);
    }

    const daysLogged = Object.keys(byDate).length;
    let painDays = 0;
    let qualifyingDays = 0;
    let impactDays = 0;

    for (const dayEntries of Object.values(byDate)) {
      if (dayEntries.some(e => e.pain !== 'None')) painDays++;
      if (dayEntries.some(e => getQualifyingSymptomCount(e) >= 2)) qualifyingDays++;
      if (dayEntries.some(e => e.impact && e.impact.length > 0 && !e.impact.includes('No impact'))) impactDays++;
    }

    const weeks = Math.max(1, totalDays / 7);
    const painPerWeek = (painDays / weeks).toFixed(1);
    const qualifyingPct = entries.length > 0 ? Math.round((entries.filter(e => getQualifyingSymptomCount(e) >= 2).length / entries.length) * 100) : 0;

    // Impact counts
    const impactCounts = {};
    for (const e of entries) {
      if (e.impact) {
        for (const imp of e.impact) {
          if (imp !== 'No impact') {
            impactCounts[imp] = (impactCounts[imp] || 0) + 1;
          }
        }
      }
    }

    // Top impacts for summary
    const topImpacts = Object.entries(impactCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k.toLowerCase()} (${v}x)`)
      .join(', ');

    // Med counts
    const medCounts = {};
    for (const e of entries) {
      if (e.meds) {
        for (const m of e.meds) {
          if (m !== 'None') {
            medCounts[m] = (medCounts[m] || 0) + 1;
          }
        }
      }
    }

    // Stool pattern
    const stoolCounts = { loose: 0, constipation: 0, normal: 0, mixed: 0, hard: 0, tenesmus: 0 };
    for (const e of entries) {
      if (e.isTenesmus) { stoolCounts.tenesmus++; continue; }
      if (e.isConstipationDay || e.stoolType === 'No BM today') stoolCounts.constipation++;
      else if (e.stoolType === 'Loose/mushy' || e.stoolType === 'Watery/explosive') stoolCounts.loose++;
      else if (e.stoolType === 'Normal/formed') stoolCounts.normal++;
      else if (e.stoolType === 'Mixed') stoolCounts.mixed++;
      else if (e.stoolType === 'Hard pellets') stoolCounts.hard++;
    }
    const total = entries.length;
    const stoolPct = {
      loose: Math.round((stoolCounts.loose / total) * 100),
      constipation: Math.round((stoolCounts.constipation / total) * 100),
      normal: Math.round((stoolCounts.normal / total) * 100),
      mixed: Math.round((stoolCounts.mixed / total) * 100),
      hard: Math.round((stoolCounts.hard / total) * 100),
      tenesmus: Math.round((stoolCounts.tenesmus / total) * 100),
    };

    // IBS subtype
    const diarrheaPct = stoolPct.loose;
    const constipPct = stoolPct.constipation + stoolPct.hard;
    let ibsType = 'IBS-M (mixed/alternating)';
    if (diarrheaPct >= 50 && constipPct < 25) ibsType = 'IBS-D (diarrhea-predominant)';
    else if (constipPct >= 50 && diarrheaPct < 25) ibsType = 'IBS-C (constipation-predominant)';

    // Week-by-week
    const weekMap = {};
    for (const e of entries) {
      const d = new Date(e.ts);
      const ws = getWeekStart(d);
      const key = ws.toISOString().slice(0, 10);
      if (!weekMap[key]) weekMap[key] = { start: ws, entries: [], painDates: new Set(), qualEpisodes: 0, impactCount: 0, stoolCounts: {} };
      weekMap[key].entries.push(e);
      if (e.pain !== 'None') {
        const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        weekMap[key].painDates.add(dateStr);
      }
      if (getQualifyingSymptomCount(e) >= 2) weekMap[key].qualEpisodes++;
      if (e.impact && e.impact.length > 0 && !e.impact.includes('No impact')) weekMap[key].impactCount++;
      const st = e.isTenesmus ? 'Failed Urge' : e.isConstipationDay ? 'No BM' : (e.stoolType || 'Unknown');
      weekMap[key].stoolCounts[st] = (weekMap[key].stoolCounts[st] || 0) + 1;
    }

    const weekRows = Object.keys(weekMap).sort().map(key => {
      const w = weekMap[key];
      const dominantStool = Object.entries(w.stoolCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
      return {
        label: weekLabel(w.start),
        episodes: w.entries.length,
        painDays: w.painDates.size,
        qualEpisodes: w.qualEpisodes,
        dominantStool,
        impactCount: w.impactCount,
      };
    });

    return {
      totalEpisodes: entries.length,
      totalDays,
      daysLogged,
      painDays,
      qualifyingDays,
      impactDays,
      painPerWeek,
      qualifyingPct,
      impactCounts,
      topImpacts,
      medCounts,
      stoolPct,
      ibsType,
      weekRows,
      startDateFmt: formatDateLong(earliest),
      endDateFmt: formatDateLong(latest),
    };
  }, [entries]);

  if (allEntries.length === 0) {
    return (
      <div style={{ padding: '0 16px' }}>
        <div style={{ paddingTop: 20 }}>
          <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>REPORT</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, textAlign: 'center', marginTop: 16 }}>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No data yet. Start logging episodes to generate a report.</div>
        </div>
      </div>
    );
  }

  const thStyle = {
    padding: '8px 10px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '7px 10px', fontSize: 13, borderBottom: '1px solid var(--border)',
    fontFamily: 'var(--font-body)', color: 'var(--text-primary)', verticalAlign: 'top',
  };
  const tdMono = { ...tdStyle, fontFamily: 'var(--font-mono)' };

  const sectionTitle = (text) => (
    <h2 style={{
      fontSize: 13, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em',
      color: 'var(--text-secondary)', margin: '24px 0 10px', paddingBottom: 6,
      borderBottom: '1px solid var(--border)', pageBreakBefore: 'auto',
    }}>{text}</h2>
  );

  const inputStyle = {
    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6,
    padding: '8px 12px', fontSize: 16, color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
    outline: 'none', width: '100%',
  };

  return (
    <div className="report-page" style={{ padding: '0 16px' }}>
      {/* Screen-only header */}
      <div className="no-print" style={{ paddingTop: 20, paddingBottom: 8 }}>
        <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
          REPORT
        </div>
        <div style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-muted)' }}>
          VA Claim Support Document
        </div>
      </div>

      {/* Editable fields — screen only */}
      <div className="no-print" style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
        padding: 16, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>
          REPORT FIELDS (OPTIONAL)
        </div>
        <input style={inputStyle} placeholder="Veteran name" value={veteranName} onChange={e => setVeteranName(e.target.value)} />
        <input style={inputStyle} placeholder="Last 4 SSN (optional)" maxLength={4} value={lastFourSSN} onChange={e => setLastFourSSN(e.target.value.replace(/\D/g, ''))} />
        <input style={inputStyle} placeholder="Claim / file number" value={claimNumber} onChange={e => setClaimNumber(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Start date</div>
            <input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>End date</div>
            <input type="date" style={inputStyle} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Print button — screen only */}
      <button className="no-print" onClick={() => window.print()} style={{
        width: '100%', height: 52, borderRadius: 10, background: 'var(--blue)',
        color: 'white', fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase', letterSpacing: '0.06em', border: 'none',
        cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 8,
      }}>
        <Printer size={18} />
        PRINT REPORT
      </button>

      {/* ===== PRINTABLE CONTENT STARTS HERE ===== */}
      <div className="print-content">

        {/* Print header */}
        <div className="print-header" style={{
          borderBottom: '2px solid var(--border)', paddingBottom: 12, marginBottom: 16,
        }}>
          <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            VA Disability Claim Support Document
          </div>
          <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginTop: 2 }}>
            DC 7319 — Irritable Bowel Syndrome
          </div>

          {(veteranName || lastFourSSN || claimNumber) && (
            <div style={{ marginTop: 12, fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {veteranName && <div><strong>Veteran:</strong> {veteranName}{lastFourSSN ? ` (xxx-xx-${lastFourSSN})` : ''}</div>}
              {claimNumber && <div><strong>Claim #:</strong> {claimNumber}</div>}
              <div><strong>Period:</strong> {stats.startDateFmt} — {stats.endDateFmt} ({stats.totalDays} days)</div>
              <div><strong>Generated:</strong> {formatDateLong(new Date())}</div>
            </div>
          )}
          {!veteranName && !lastFourSSN && !claimNumber && (
            <div style={{ marginTop: 12, fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
              <div><strong>Period:</strong> {stats.startDateFmt} — {stats.endDateFmt} ({stats.totalDays} days)</div>
              <div><strong>Generated:</strong> {formatDateLong(new Date())}</div>
            </div>
          )}
        </div>

        {/* Executive Summary */}
        {sectionTitle('Executive Summary')}
        <div style={{ fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', lineHeight: 1.7 }}>
          Over the {stats.totalDays}-day period from {stats.startDateFmt} to {stats.endDateFmt}, the
          veteran logged {stats.totalEpisodes} bowel disturbance episode{stats.totalEpisodes !== 1 ? 's' : ''} across {stats.daysLogged} days.
          Abdominal pain tied to defecation was documented on {stats.painDays} day{stats.painDays !== 1 ? 's' : ''} ({stats.painPerWeek} days/week){parseFloat(stats.painPerWeek) >= 1.0
            ? ', exceeding the 30% rating threshold of 1.0 pain days/week'
            : parseFloat(stats.painPerWeek) >= 0.43
              ? ', consistent with the 20% rating threshold'
              : ''
          }. {stats.qualifyingPct}% of episodes included 2 or more qualifying symptoms
          (abnormal stool consistency, urgency, straining, bloating, distension, or mucus).
          {stats.impactDays > 0
            ? ` Functional impact was reported on ${stats.impactDays} day${stats.impactDays !== 1 ? 's' : ''}, including ${stats.topImpacts || 'various impacts'}.`
            : ''
          }
        </div>

        {/* Week-by-Week Table */}
        {sectionTitle('Week-by-Week Frequency')}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Week</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Episodes</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Pain Days</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Qualifying</th>
                <th style={thStyle}>Dominant Stool</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Impacts</th>
              </tr>
            </thead>
            <tbody>
              {stats.weekRows.map((w, i) => (
                <tr key={i}>
                  <td style={{ ...tdMono, fontSize: 12, whiteSpace: 'nowrap' }}>{w.label}</td>
                  <td style={{ ...tdMono, textAlign: 'center' }}>{w.episodes}</td>
                  <td style={{ ...tdMono, textAlign: 'center' }}>{w.painDays}</td>
                  <td style={{ ...tdMono, textAlign: 'center' }}>{w.qualEpisodes}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{w.dominantStool}</td>
                  <td style={{ ...tdMono, textAlign: 'center' }}>{w.impactCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stool Pattern Breakdown */}
        {sectionTitle('Stool Pattern Breakdown')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
          {[
            { label: 'Loose / Watery', pct: stats.stoolPct.loose },
            { label: 'Constipation / No BM', pct: stats.stoolPct.constipation },
            { label: 'Hard pellets', pct: stats.stoolPct.hard },
            { label: 'Normal / Formed', pct: stats.stoolPct.normal },
            { label: 'Mixed', pct: stats.stoolPct.mixed },
            { label: 'Failed Urge (Tenesmus)', pct: stats.stoolPct.tenesmus },
          ].map((s, i) => (
            <div key={i} style={{ minWidth: 100 }}>
              <div style={{ fontSize: 24, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{s.pct}%</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', marginTop: 4 }}>
          Pattern is consistent with <strong>{stats.ibsType}</strong>.
        </div>

        {/* Functional Impact Summary */}
        {sectionTitle('Functional Impact Summary')}
        {Object.keys(stats.impactCounts).length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Impact Type</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.impactCounts).sort((a, b) => b[1] - a[1]).map(([k, v], i) => (
                <tr key={i}>
                  <td style={tdStyle}>{k}</td>
                  <td style={{ ...tdMono, textAlign: 'center' }}>{v}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...tdStyle, fontWeight: 600 }}>Total impact days</td>
                <td style={{ ...tdMono, textAlign: 'center', fontWeight: 600 }}>{stats.impactDays}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No functional impact events recorded.</div>
        )}

        {/* Medication & Management Summary */}
        {sectionTitle('Medication & Management Summary')}
        {Object.keys(stats.medCounts).length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Medication / Strategy</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Times Used</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.medCounts).sort((a, b) => b[1] - a[1]).map(([k, v], i) => (
                <tr key={i}>
                  <td style={tdStyle}>{k}</td>
                  <td style={{ ...tdMono, textAlign: 'center' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No medications or management strategies recorded.</div>
        )}

        {/* Full Episode Log */}
        {sectionTitle('Full Episode Log')}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Ep #</th>
                <th style={thStyle}>Pain</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Qual.</th>
                <th style={thStyle}>Stool Type</th>
                <th style={thStyle}>Impact</th>
                <th style={thStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const d = new Date(e.ts);
                const impacts = (e.impact || []).filter(v => v !== 'No impact');
                return (
                  <tr key={e.id || i}>
                    <td style={{ ...tdMono, fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(d)}</td>
                    <td style={{ ...tdMono, fontSize: 12, whiteSpace: 'nowrap' }}>{formatTime12(d)}</td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{e.episodeNum}</td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{e.pain}</td>
                    <td style={{ ...tdMono, textAlign: 'center', fontSize: 12 }}>{getQualifyingSymptomCount(e)}</td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{e.stoolType}</td>
                    <td style={{ ...tdStyle, fontSize: 11 }}>{impacts.length > 0 ? impacts.join('; ') : '—'}</td>
                    <td style={{ ...tdStyle, fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 32, paddingTop: 12, borderTop: '1px solid var(--border)',
          fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-muted)',
          fontStyle: 'italic', lineHeight: 1.6,
        }}>
          This document was generated from a daily symptom log maintained by the veteran using a personal
          tracking application. All entries were recorded at or near the time of occurrence. This log is
          intended to support a VA disability claim under Diagnostic Code 7319 (Irritable Bowel Syndrome).
          Actual VA rating is determined at a Compensation & Pension examination.
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 12px !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print,
          nav,
          button[style*="position: fixed"],
          div[style*="position: fixed"][style*="bottom: 0"] {
            display: none !important;
          }

          .report-page {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .print-content {
            color: #111 !important;
          }

          .print-content * {
            color: #111 !important;
            border-color: #ccc !important;
          }

          .print-content strong {
            color: #000 !important;
          }

          .print-header {
            border-bottom-color: #333 !important;
          }

          .print-content h2 {
            border-bottom-color: #999 !important;
            color: #333 !important;
            page-break-after: avoid;
          }

          .print-content table {
            page-break-inside: auto;
          }

          .print-content tr {
            page-break-inside: avoid;
          }

          .print-content th {
            background: #f5f5f5 !important;
            color: #333 !important;
            border-bottom-color: #666 !important;
          }

          .print-content td {
            border-bottom-color: #ddd !important;
          }

          @page {
            margin: 0.75in;
            size: letter;
          }
        }
      `}</style>
    </div>
  );
}
