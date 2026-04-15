import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEntries } from '../storage';
import { filterTo90Days } from '../ratingEngine';
import { Pencil } from 'lucide-react';

const painBadgeStyle = (pain) => {
  const colors = {
    'None': { bg: 'var(--bg-input)', text: 'var(--text-muted)' },
    'Mild (1-3)': { bg: 'var(--yellow-bg)', text: 'var(--yellow)' },
    'Moderate (4-6)': { bg: '#431407', text: '#f97316' },
    'Severe (7-10)': { bg: 'var(--red-bg)', text: 'var(--red)' },
  };
  const c = colors[pain] || colors['None'];
  return {
    fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
    padding: '3px 8px', borderRadius: 4, background: c.bg, color: c.text, whiteSpace: 'nowrap'
  };
};

function formatShortTs(isoStr) {
  const d = new Date(isoStr);
  const mon = d.toLocaleDateString('en-US', { month: 'short' });
  const day = d.getDate();
  let h = d.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mon} ${day} ${h}:${min}${ampm}`;
}

export default function History() {
  const navigate = useNavigate();
  const entries = useMemo(() => getEntries(), []);
  const filtered = useMemo(() => filterTo90Days(entries), [entries]);

  const grouped = useMemo(() => {
    const groups = {};
    const order = [];
    for (const e of filtered) {
      const d = new Date(e.ts);
      const key = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(e);
    }
    return { groups, order };
  }, [filtered]);

  const handleEdit = (entry) => {
    navigate('/log', { state: { editEntry: entry } });
  };

  if (filtered.length === 0) {
    return (
      <div style={{ padding: '0 16px' }}>
        <div style={{ paddingTop: 20, paddingBottom: 16 }}>
          <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>HISTORY</div>
          <div style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-muted)' }}>Last 90 days</div>
        </div>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 24, textAlign: 'center'
        }}>
          <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>NO ENTRIES YET</div>
          <div style={{ fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', marginBottom: 12 }}>Your logged episodes will appear here.</div>
          <button onClick={() => navigate('/log')} style={{
            background: 'none', border: 'none', color: 'var(--blue-light)',
            fontSize: 15, cursor: 'pointer', fontFamily: 'var(--font-body)'
          }}>Log First Episode</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ paddingTop: 20, paddingBottom: 16 }}>
        <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>HISTORY</div>
        <div style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-muted)' }}>Last 90 days</div>
      </div>

      {grouped.order.map(dateKey => {
        const dayEntries = grouped.groups[dateKey];
        return (
          <div key={dateKey} style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 8
            }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>{dateKey}</span>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{dayEntries.length} episode{dayEntries.length !== 1 ? 's' : ''}</span>
            </div>

            {dayEntries.map(e => {
              const d = new Date(e.ts);
              let hours = d.getHours();
              const ampm = hours >= 12 ? 'PM' : 'AM';
              hours = hours % 12 || 12;
              const timeStr = `${hours}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;

              const badges = [];
              if (e.bloating && e.bloating !== 'None') badges.push('Bloating');
              if (e.mucus === 'Yes — mucus present') badges.push('Mucus');
              if (e.distension === 'Yes — noticeable swelling') badges.push('Distension');
              if (e.impact && !e.impact.includes('No impact')) {
                for (const imp of e.impact) {
                  if (imp !== 'No impact') badges.push(imp);
                }
              }

              const isConstip = e.isConstipationDay;
              const isTen = e.isTenesmus;

              // Determine left border color
              let leftBorder = '1px solid var(--border)';
              if (isConstip) leftBorder = '2px solid var(--yellow-dim)';
              else if (isTen) leftBorder = '2px solid #5b21b6';

              return (
                <div key={e.id} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderLeft: leftBorder,
                  borderRadius: 10, padding: 14, marginBottom: 8
                }}>
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{timeStr}</span>
                      {e.isBackdated && (
                        <span style={{ fontSize: 11, color: 'var(--yellow)', fontFamily: 'var(--font-mono)' }} title="Backdated entry">⏱</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={painBadgeStyle(e.pain)}>{e.pain}</span>
                      <button
                        onClick={() => handleEdit(e)}
                        style={{
                          background: 'none', border: '1px solid var(--border)',
                          borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4,
                          color: 'var(--text-muted)', fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Row 2: type info */}
                  <div style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: isConstip ? 'var(--yellow-dim)' : isTen ? '#7c3aed' : 'var(--text-secondary)', marginTop: 4 }}>
                    {isConstip ? 'No BM today' :
                     isTen ? `Failed urge · ${e.urgency}${e.duration ? ` · ${e.duration}` : ''}` :
                     `${e.stoolType} · ${e.urgency}`}
                  </div>

                  {/* Badges */}
                  {badges.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {badges.map((b, i) => {
                        const isImpact = !['Bloating', 'Mucus', 'Distension'].includes(b);
                        return (
                          <span key={i} style={{
                            fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 6px',
                            background: isImpact ? 'var(--yellow-bg)' : 'var(--bg-input)',
                            border: `1px solid ${isImpact ? 'var(--yellow-dim)' : 'var(--border)'}`,
                            borderRadius: 4, color: isImpact ? 'var(--yellow)' : 'var(--text-secondary)'
                          }}>{b}</span>
                        );
                      })}
                    </div>
                  )}

                  {/* Notes */}
                  {e.notes && (
                    <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-muted)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                      {e.notes.length > 80 ? e.notes.slice(0, 80) + '…' : e.notes}
                    </div>
                  )}

                  {/* Timestamps: logged / edited */}
                  {e.editedAt && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                      Logged: {formatShortTs(e.ts)} — Edited: {formatShortTs(e.editedAt)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
