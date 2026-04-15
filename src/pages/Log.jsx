import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveEntry, updateEntry } from '../storage';

const PRESETS = [
  {
    label: 'Loose stool + urgency + cramping',
    type: 'normal',
    values: { pain: 'Moderate (4-6)', stoolType: 'Loose/mushy', symptoms: ['Urgency', 'Bloating'] },
  },
  {
    label: 'Constipation, no pain',
    type: 'constipation',
    values: { pain: 'None', symptoms: ['Bloating'] },
  },
  {
    label: 'Constipation + cramping',
    type: 'constipation',
    values: { pain: 'Moderate (4-6)', symptoms: ['Bloating', 'Swelling'] },
  },
  {
    label: 'Pain + urge, no BM',
    type: 'tenesmus',
    values: { pain: 'Moderate (4-6)', symptoms: ['Urgency', 'Straining', 'Bloating'], duration: '15–30 minutes' },
  },
  {
    label: 'Post-meal urgency + loose stool',
    type: 'normal',
    values: { pain: 'Mild (1-3)', stoolType: 'Loose/mushy', symptoms: ['Urgency'] },
  },
  {
    label: 'Severe — multiple symptoms',
    type: 'normal',
    values: { pain: 'Severe (7-10)', stoolType: 'Watery/explosive', symptoms: ['Urgency', 'Straining', 'Bloating', 'Swelling', 'Mucus'] },
  },
];

// Map simplified symptom chips to full entry values
function symptomsToEntry(symptoms) {
  return {
    urgency: symptoms.includes('Urgency') ? 'Moderate — had to go soon' : 'No urgency',
    straining: symptoms.includes('Straining') ? 'Mild straining' : 'No straining',
    bloating: symptoms.includes('Bloating') ? 'Moderate' : 'None',
    distension: symptoms.includes('Swelling') ? 'Yes — noticeable swelling' : 'No',
    mucus: symptoms.includes('Mucus') ? 'Yes — mucus present' : 'No',
  };
}

// Reverse map entry values to simplified symptom chips
function entryToSymptoms(entry) {
  const s = [];
  if (entry.urgency && entry.urgency !== 'No urgency') s.push('Urgency');
  if (entry.straining && entry.straining !== 'No straining') s.push('Straining');
  if (entry.bloating && entry.bloating !== 'None') s.push('Bloating');
  if (entry.distension === 'Yes — noticeable swelling') s.push('Swelling');
  if (entry.mucus === 'Yes — mucus present') s.push('Mucus');
  return s;
}

export default function Log() {
  const navigate = useNavigate();
  const location = useLocation();
  const editEntry = location.state?.editEntry || null;
  const isEditMode = !!editEntry;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Date/time
  const now = new Date();
  const defaultDate = editEntry
    ? new Date(editEntry.ts).toISOString().slice(0, 10)
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const defaultTime = editEntry
    ? `${String(new Date(editEntry.ts).getHours()).padStart(2, '0')}:${String(new Date(editEntry.ts).getMinutes()).padStart(2, '0')}`
    : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [entryDate, setEntryDate] = useState(defaultDate);
  const [entryTime, setEntryTime] = useState(defaultTime);
  const [showDateTime, setShowDateTime] = useState(isEditMode);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isBackdated = entryDate !== todayStr;

  // Episode type: 'normal' | 'constipation' | 'tenesmus'
  const editType = editEntry ? (editEntry.isTenesmus ? 'tenesmus' : editEntry.isConstipationDay ? 'constipation' : 'normal') : null;
  const [episodeType, setEpisodeType] = useState(editType);

  // Core fields
  const [pain, setPain] = useState(editEntry?.pain || null);
  const [stoolType, setStoolType] = useState(editEntry?.stoolType || null);
  const [symptoms, setSymptoms] = useState(editEntry ? entryToSymptoms(editEntry) : []);
  const [duration, setDuration] = useState(editEntry?.duration || null);

  // Optional details
  const [showDetails, setShowDetails] = useState(
    editEntry ? (editEntry.impact?.length > 0 || editEntry.meds?.length > 0 || editEntry.notes) : false
  );
  const [impact, setImpact] = useState(() => {
    if (!editEntry) return ['No impact'];
    return editEntry.impact?.length > 0 ? editEntry.impact : ['No impact'];
  });
  const [meds, setMeds] = useState(() => {
    if (!editEntry) return ['None'];
    return editEntry.meds?.length > 0 ? editEntry.meds : ['None'];
  });
  const [notes, setNotes] = useState(editEntry?.notes || '');

  const [error, setError] = useState('');
  const [toast, setToast] = useState(false);

  const toggleSymptom = (s) => {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleImpactToggle = (val) => {
    if (val === 'No impact') { setImpact(['No impact']); }
    else { setImpact(prev => { const w = prev.filter(v => v !== 'No impact'); return w.includes(val) ? w.filter(v => v !== val) : [...w, val]; }); }
  };

  const handleMedsToggle = (val) => {
    if (val === 'None') { setMeds(['None']); }
    else { setMeds(prev => { const w = prev.filter(v => v !== 'None'); return w.includes(val) ? w.filter(v => v !== val) : [...w, val]; }); }
  };

  const applyPreset = (preset) => {
    setEpisodeType(preset.type);
    setPain(preset.values.pain);
    setStoolType(preset.values.stoolType || null);
    setSymptoms(preset.values.symptoms || []);
    setDuration(preset.values.duration || null);
  };

  // Qualifying count
  const qualifyingCount = useMemo(() => {
    let count = 0;
    if (episodeType === 'normal' && stoolType && stoolType !== 'Normal/formed' && stoolType !== 'No BM today') count++;
    if (symptoms.includes('Urgency')) count++;
    if (symptoms.includes('Straining')) count++;
    if (symptoms.includes('Mucus')) count++;
    if (symptoms.includes('Bloating')) count++;
    if (symptoms.includes('Swelling')) count++;
    return count;
  }, [episodeType, stoolType, symptoms]);

  const handleSave = () => {
    if (!episodeType) { setError('Select episode type'); return; }
    if (!pain) { setError('Select pain level'); return; }
    if (episodeType === 'normal' && !stoolType) { setError('Select stool type'); return; }
    if (episodeType === 'tenesmus' && !duration) { setError('Select duration'); return; }
    setError('');

    const [year, month, day] = entryDate.split('-').map(Number);
    const [hour, minute] = entryTime.split(':').map(Number);
    const entryTs = new Date(year, month - 1, day, hour, minute).toISOString();

    const isConstipationDay = episodeType === 'constipation';
    const isTenesmus = episodeType === 'tenesmus';
    const mapped = symptomsToEntry(symptoms);

    const entry = {
      id: isEditMode ? editEntry.id : crypto.randomUUID(),
      ts: isEditMode ? entryTs : entryTs,
      episodeNum: isConstipationDay ? 'Constipation/No BM' : isTenesmus ? 'Abdominal Pain/Failed Urge' : 'Episode',
      pain,
      urgency: isConstipationDay ? 'No urgency' : mapped.urgency,
      stoolType: (isConstipationDay || isTenesmus) ? 'No BM today' : stoolType,
      straining: isConstipationDay ? 'No straining' : mapped.straining,
      bloating: mapped.bloating,
      distension: mapped.distension,
      mucus: mapped.mucus,
      meds: meds.includes('None') ? [] : meds,
      impact: impact.includes('No impact') ? [] : impact,
      notes,
      isConstipationDay,
      isTenesmus,
      duration: isTenesmus ? duration : undefined,
      isBackdated: isEditMode ? (editEntry.isBackdated || isBackdated) : isBackdated,
    };

    if (isEditMode) {
      entry.editedAt = new Date().toISOString();
      updateEntry(entry);
    } else {
      saveEntry(entry);
    }
    setToast(true);
    setTimeout(() => navigate(isEditMode ? '/history' : '/'), 2000);
  };

  // --- Styles ---
  const chip = (selected, color) => ({
    background: selected ? (color || 'var(--blue-dim)') : 'var(--bg-input)',
    border: `1px solid ${selected ? (color === 'var(--yellow-bg)' ? 'var(--yellow)' : color === '#431407' ? '#f97316' : color === 'var(--red-bg)' ? 'var(--red)' : 'var(--blue)') : 'var(--border)'}`,
    color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
    borderRadius: 8, padding: '10px 14px', fontSize: 14, cursor: 'pointer',
    fontFamily: 'var(--font-body)', textAlign: 'center', minHeight: 44,
    transition: 'all 0.15s',
  });

  const painChip = (val, selected) => {
    const c = {
      'None': { bg: 'var(--bg-surface)', b: 'var(--text-muted)', t: 'var(--text-muted)' },
      'Mild (1-3)': { bg: 'var(--yellow-bg)', b: 'var(--yellow)', t: 'var(--yellow)' },
      'Moderate (4-6)': { bg: '#431407', b: '#f97316', t: '#f97316' },
      'Severe (7-10)': { bg: 'var(--red-bg)', b: 'var(--red)', t: 'var(--red)' },
    }[val] || { bg: 'var(--bg-surface)', b: 'var(--text-muted)', t: 'var(--text-muted)' };
    return {
      background: selected ? c.bg : 'var(--bg-input)',
      border: `1px solid ${selected ? c.b : 'var(--border)'}`,
      color: selected ? c.t : 'var(--text-secondary)',
      borderRadius: 8, padding: '10px 14px', fontSize: 14, cursor: 'pointer',
      fontFamily: 'var(--font-body)', textAlign: 'center', minHeight: 44,
      transition: 'all 0.15s',
    };
  };

  const typeBtn = (type, selected, color, label, sub) => (
    <button onClick={() => setEpisodeType(type)} style={{
      flex: 1, background: selected ? 'var(--bg-card)' : 'var(--bg-input)',
      border: `1px solid ${selected ? color : 'var(--border)'}`,
      borderTop: selected ? `3px solid ${color}` : '1px solid var(--border)',
      borderRadius: 8, padding: '12px 8px', cursor: 'pointer', textAlign: 'center',
    }}>
      <div style={{ fontSize: 13, color: selected ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>{label}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
    </button>
  );

  const sectionLabel = (text) => (
    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
      color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 6, marginTop: 16 }}>{text}</div>
  );

  const qColor = qualifyingCount >= 2 ? 'var(--green)' : qualifyingCount === 1 ? 'var(--yellow)' : 'var(--text-muted)';

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Header */}
      <div style={{ paddingTop: 20, paddingBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
            {isEditMode ? 'EDIT' : 'LOG'}
          </div>
          {/* Date/time toggle */}
          <button onClick={() => setShowDateTime(!showDateTime)} style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 6,
            padding: '4px 10px', cursor: 'pointer',
            fontSize: 12, fontFamily: 'var(--font-mono)',
            color: isBackdated ? 'var(--yellow)' : 'var(--text-muted)',
          }}>
            {isBackdated ? `⏱ ${entryDate}` : entryTime}
          </button>
        </div>
      </div>

      {showDateTime && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)}
            style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 10px', fontSize: 16, color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)', outline: 'none' }} />
          <input type="time" value={entryTime} onChange={e => setEntryTime(e.target.value)}
            style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 10px', fontSize: 16, color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)', outline: 'none' }} />
        </div>
      )}

      {/* Presets — new entries only */}
      {!isEditMode && !episodeType && (
        <>
          {sectionLabel('QUICK LOG')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {PRESETS.map((p, i) => (
              <button key={i} onClick={() => applyPreset(p)} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 20, padding: '8px 14px', fontSize: 13,
                color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}>{p.label}</button>
            ))}
          </div>
        </>
      )}

      {/* Episode Type */}
      {sectionLabel('WHAT HAPPENED')}
      <div style={{ display: 'flex', gap: 8 }}>
        {typeBtn('normal', episodeType === 'normal', 'var(--blue)', 'Bowel', 'Had a BM')}
        {typeBtn('constipation', episodeType === 'constipation', 'var(--yellow)', 'No BM', 'Constipated')}
        {typeBtn('tenesmus', episodeType === 'tenesmus', '#8b5cf6', 'Failed Urge', 'Urge, no BM')}
      </div>

      {/* Pain — always */}
      {sectionLabel('PAIN LEVEL')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {['None', 'Mild (1-3)', 'Moderate (4-6)', 'Severe (7-10)'].map(v => (
          <button key={v} onClick={() => setPain(v)} style={painChip(v, pain === v)}>{v}</button>
        ))}
      </div>

      {/* Stool type — normal only */}
      {episodeType === 'normal' && (
        <>
          {sectionLabel('STOOL TYPE')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Normal/formed', 'Hard pellets', 'Loose/mushy', 'Watery/explosive', 'Mixed'].map(v => (
              <button key={v} onClick={() => setStoolType(v)} style={{
                ...chip(stoolType === v),
                padding: '8px 14px', fontSize: 13,
              }}>{v}</button>
            ))}
          </div>
        </>
      )}

      {/* Duration — tenesmus only */}
      {episodeType === 'tenesmus' && (
        <>
          {sectionLabel('DURATION')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['< 15 min', '15–30 min', '30–60 min', '> 1 hour'].map(v => (
              <button key={v} onClick={() => setDuration(v)} style={chip(duration === v)}>{v}</button>
            ))}
          </div>
        </>
      )}

      {/* Symptoms — always (constipation hides urgency/straining) */}
      {sectionLabel('SYMPTOMS PRESENT')}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, marginTop: -2 }}>Tap all that apply — need 2+ for VA qualifying</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(episodeType === 'constipation'
          ? ['Bloating', 'Swelling', 'Mucus']
          : ['Urgency', 'Straining', 'Bloating', 'Swelling', 'Mucus']
        ).map(s => (
          <button key={s} onClick={() => toggleSymptom(s)} style={{
            background: symptoms.includes(s) ? 'var(--blue-dim)' : 'var(--bg-input)',
            border: `1px solid ${symptoms.includes(s) ? 'var(--blue)' : 'var(--border)'}`,
            color: symptoms.includes(s) ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderRadius: 20, padding: '8px 16px', fontSize: 14, cursor: 'pointer',
            fontFamily: 'var(--font-body)', transition: 'all 0.15s',
          }}>{s}</button>
        ))}
      </div>

      {/* Claim strength message */}
      {pain && pain !== 'None' && qualifyingCount >= 2 && (
        <div style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--font-mono)', marginTop: 10 }}>
          ✓ This entry counts toward your 30% claim
        </div>
      )}

      {/* Impact — always visible */}
      {sectionLabel('IMPACT ON YOUR DAY')}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {['No impact', 'Left work', 'Late', 'Cancelled plans', 'Multiple trips', 'Gas/odor', 'Travel disrupted'].map(v => {
          const fullVal = v === 'Left work' ? 'Had to leave work or meeting' :
            v === 'Late' ? 'Caused me to be late' :
            v === 'Cancelled plans' ? 'Cancelled or modified plans' :
            v === 'Multiple trips' ? 'Multiple urgent trips at work' :
            v === 'Gas/odor' ? 'Socially disruptive gas or odor' :
            v === 'Travel disrupted' ? 'Travel disrupted' : v;
          return (
            <button key={v} onClick={() => handleImpactToggle(fullVal)} style={{
              background: impact.includes(fullVal) ? 'var(--blue-dim)' : 'var(--bg-input)',
              border: `1px solid ${impact.includes(fullVal) ? 'var(--blue)' : 'var(--border)'}`,
              color: impact.includes(fullVal) ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderRadius: 20, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}>{v}</button>
          );
        })}
      </div>

      {/* Notes */}
      {sectionLabel('NOTES')}
      <textarea
        value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="How did this affect you? (missed meeting, had to pull over, etc.)"
        style={{
          minHeight: 60, background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 10, fontSize: 16, width: '100%', color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none',
        }}
      />

      {/* Meds — collapsed */}
      <button onClick={() => setShowDetails(!showDetails)} style={{
        background: 'none', border: 'none', color: 'var(--text-muted)',
        fontSize: 12, fontFamily: 'var(--font-mono)', cursor: 'pointer',
        marginTop: 10, padding: 0,
      }}>
        {showDetails ? '▲ Hide medications' : '▼ Add medications taken'}
      </button>

      {showDetails && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['None', 'Imodium', 'Fiber', 'Dairy avoidance', 'Other diet'].map(v => {
            const fullVal = v === 'Fiber' ? 'Fiber supplement' :
              v === 'Other diet' ? 'Other dietary restriction' : v;
            return (
              <button key={v} onClick={() => handleMedsToggle(fullVal)} style={{
                background: meds.includes(fullVal) ? 'var(--blue-dim)' : 'var(--bg-input)',
                border: `1px solid ${meds.includes(fullVal) ? 'var(--blue)' : 'var(--border)'}`,
                color: meds.includes(fullVal) ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderRadius: 20, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}>{v}</button>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && <div style={{ color: 'var(--red)', fontSize: 13, padding: '8px 0', fontFamily: 'var(--font-mono)' }}>{error}</div>}

      {/* Save */}
      <button onClick={handleSave} style={{
        width: '100%', height: 52, borderRadius: 10, background: 'var(--blue)',
        color: 'white', fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        border: 'none', cursor: 'pointer', marginTop: 16, marginBottom: 24,
      }}>{isEditMode ? 'UPDATE' : 'SAVE'}</button>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom) + 12px)',
          left: '50%', transform: 'translateX(-50%)',
          background: 'var(--green-dim)', border: '1px solid var(--green)',
          color: 'var(--green)', padding: '10px 24px', borderRadius: 24,
          fontSize: 14, fontFamily: 'var(--font-mono)', zIndex: 100, whiteSpace: 'nowrap',
          animation: 'fadeInOut 2s ease-in-out',
        }}>{isEditMode ? '✓ Updated' : '✓ Saved'}</div>
      )}

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; } 10% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
