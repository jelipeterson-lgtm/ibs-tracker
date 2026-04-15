import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveEntry, updateEntry } from '../storage';

const PRESETS = [
  {
    label: 'Loose stool + urgency + cramping',
    values: {
      isConstipationDay: false, isTenesmus: false,
      stoolType: 'Loose/mushy', urgency: 'Moderate — had to go soon',
      pain: 'Moderate (4-6)', bloating: 'Moderate', straining: 'No straining',
      distension: 'No', mucus: 'No', episodeNum: '1st of the day',
      impact: ['No impact'], meds: ['None'],
    }
  },
  {
    label: 'Constipation, no pain',
    values: {
      isConstipationDay: true, isTenesmus: false,
      pain: 'None', bloating: 'Mild', distension: 'No', mucus: 'No',
      episodeNum: 'Constipation/No BM', stoolType: 'No BM today',
      urgency: 'No urgency', straining: 'No straining',
      impact: ['No impact'], meds: ['None'],
    }
  },
  {
    label: 'Constipation + cramping',
    values: {
      isConstipationDay: true, isTenesmus: false,
      pain: 'Moderate (4-6)', bloating: 'Moderate',
      distension: 'Yes — noticeable swelling', mucus: 'No',
      episodeNum: 'Constipation/No BM', stoolType: 'No BM today',
      urgency: 'No urgency', straining: 'No straining',
      impact: ['No impact'], meds: ['None'],
    }
  },
  {
    label: 'Pain + urge, no BM',
    values: {
      isConstipationDay: false, isTenesmus: true,
      pain: 'Moderate (4-6)', urgency: 'Moderate — had to go soon',
      bloating: 'Moderate', distension: 'No', mucus: 'No',
      straining: 'Mild straining', duration: '15–30 minutes',
      episodeNum: 'Abdominal Pain/Failed Urge', stoolType: 'No BM today',
      impact: ['No impact'], meds: ['None'],
    }
  },
  {
    label: 'Post-meal urgency + loose stool',
    values: {
      isConstipationDay: false, isTenesmus: false,
      stoolType: 'Loose/mushy', urgency: 'Severe — could not wait',
      pain: 'Mild (1-3)', bloating: 'Mild', straining: 'No straining',
      distension: 'No', mucus: 'No', episodeNum: '1st of the day',
      impact: ['No impact'], meds: ['None'],
    }
  },
  {
    label: 'Severe — multiple symptoms',
    values: {
      isConstipationDay: false, isTenesmus: false,
      pain: 'Severe (7-10)', urgency: 'Severe — could not wait',
      stoolType: 'Watery/explosive', straining: 'Significant straining',
      bloating: 'Severe', distension: 'Yes — noticeable swelling',
      mucus: 'Yes — mucus present', episodeNum: '1st of the day',
      impact: ['Had to leave work or meeting'], meds: ['Imodium'],
    }
  },
];

export default function Log() {
  const navigate = useNavigate();
  const location = useLocation();
  const editEntry = location.state?.editEntry || null;
  const isEditMode = !!editEntry;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Step management: 1-4
  const [step, setStep] = useState(isEditMode ? 2 : 1);

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
  const [showDateTime, setShowDateTime] = useState(false);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isBackdated = entryDate !== todayStr;

  // Episode type
  const [isConstipationDay, setIsConstipationDay] = useState(editEntry?.isConstipationDay || false);
  const [isTenesmus, setIsTenesmus] = useState(editEntry?.isTenesmus || false);

  // Fields
  const [episodeNum, setEpisodeNum] = useState(editEntry?.episodeNum || null);
  const [pain, setPain] = useState(editEntry?.pain || null);
  const [urgency, setUrgency] = useState(editEntry?.urgency || null);
  const [stoolType, setStoolType] = useState(editEntry?.stoolType || null);
  const [straining, setStraining] = useState(editEntry?.straining || null);
  const [bloating, setBloating] = useState(editEntry?.bloating || null);
  const [distension, setDistension] = useState(editEntry?.distension || null);
  const [mucus, setMucus] = useState(editEntry?.mucus || null);
  const [impact, setImpact] = useState(editEntry?.impact?.length > 0 ? editEntry.impact : []);
  const [meds, setMeds] = useState(editEntry?.meds?.length > 0 ? editEntry.meds : []);
  const [notes, setNotes] = useState(editEntry?.notes || '');
  const [duration, setDuration] = useState(editEntry?.duration || null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (editEntry) {
      if (editEntry.impact?.length === 0) setImpact(['No impact']);
      if (editEntry.meds?.length === 0) setMeds(['None']);
    }
  }, [editEntry]);

  // Preset applies all values and jumps to step 4 (review/save)
  const applyPreset = (preset) => {
    const v = preset.values;
    setIsConstipationDay(v.isConstipationDay);
    setIsTenesmus(v.isTenesmus);
    setEpisodeNum(v.episodeNum || null);
    setPain(v.pain || null);
    setUrgency(v.urgency || null);
    setStoolType(v.stoolType || null);
    setStraining(v.straining || null);
    setBloating(v.bloating || null);
    setDistension(v.distension || null);
    setMucus(v.mucus || null);
    setImpact(v.impact || []);
    setMeds(v.meds || []);
    setDuration(v.duration || null);
    setNotes('');
    setStep(4);
  };

  const selectType = (type) => {
    if (type === 'constipation') {
      setIsConstipationDay(true); setIsTenesmus(false);
      setEpisodeNum('Constipation/No BM'); setStoolType('No BM today');
      setUrgency('No urgency'); setStraining('No straining'); setDuration(null);
    } else if (type === 'tenesmus') {
      setIsConstipationDay(false); setIsTenesmus(true);
      setEpisodeNum('Abdominal Pain/Failed Urge'); setStoolType('No BM today');
      setUrgency(null); setStraining(null); setDuration(null);
    } else {
      setIsConstipationDay(false); setIsTenesmus(false);
      setEpisodeNum(null); setStoolType(null);
      setUrgency(null); setStraining(null); setDuration(null);
    }
    setStep(2);
    window.scrollTo(0, 0);
  };

  // Qualifying count
  const qualifyingCount = useMemo(() => {
    let count = 0;
    if (stoolType && stoolType !== 'Normal/formed' && stoolType !== 'No BM today') count++;
    if (urgency && urgency !== 'No urgency') count++;
    if (straining && straining !== 'No straining') count++;
    if (mucus === 'Yes — mucus present') count++;
    if (bloating && bloating !== 'None') count++;
    if (distension === 'Yes — noticeable swelling') count++;
    return count;
  }, [stoolType, urgency, straining, mucus, bloating, distension]);

  const handleImpactToggle = (val) => {
    if (val === 'No impact') { setImpact(['No impact']); }
    else { setImpact(prev => { const w = prev.filter(v => v !== 'No impact'); return w.includes(val) ? w.filter(v => v !== val) : [...w, val]; }); }
  };

  const handleMedsToggle = (val) => {
    if (val === 'None') { setMeds(['None']); }
    else { setMeds(prev => { const w = prev.filter(v => v !== 'None'); return w.includes(val) ? w.filter(v => v !== val) : [...w, val]; }); }
  };

  const canAdvance = (fromStep) => {
    if (fromStep === 2) {
      if (!pain) return 'Select a pain level';
      if (!isConstipationDay && !isTenesmus && !episodeNum) return 'Select episode number';
      if (!isConstipationDay && !isTenesmus && !stoolType) return 'Select stool type';
      if (!isConstipationDay && !urgency) return 'Select urgency';
      if (!isConstipationDay && !straining) return 'Select straining';
      if (isTenesmus && !duration) return 'Select duration';
    }
    if (fromStep === 3) {
      if (!bloating) return 'Select bloating';
      if (!distension) return 'Select distension';
      if (!mucus) return 'Select mucus';
    }
    if (fromStep === 4) {
      if (impact.length === 0) return 'Select functional impact';
      if (meds.length === 0) return 'Select medications';
    }
    return null;
  };

  const handleNext = () => {
    const err = canAdvance(step);
    if (err) { setError(err); return; }
    setError('');
    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setError('');
    if (step === 2 && !isEditMode) { setStep(1); }
    else { setStep(Math.max(2, step - 1)); }
    window.scrollTo(0, 0);
  };

  const handleSave = () => {
    const err = canAdvance(4);
    if (err) { setError(err); return; }
    setError('');

    const [year, month, day] = entryDate.split('-').map(Number);
    const [hour, minute] = entryTime.split(':').map(Number);
    const entryTs = new Date(year, month - 1, day, hour, minute).toISOString();

    const entry = {
      id: isEditMode ? editEntry.id : crypto.randomUUID(),
      ts: isEditMode ? editEntry.ts : entryTs,
      episodeNum: isConstipationDay ? 'Constipation/No BM' : (isTenesmus ? 'Abdominal Pain/Failed Urge' : episodeNum),
      pain,
      urgency: isConstipationDay ? 'No urgency' : urgency,
      stoolType: (isConstipationDay || isTenesmus) ? 'No BM today' : stoolType,
      straining: isConstipationDay ? 'No straining' : straining,
      bloating, distension, mucus,
      meds: meds.includes('None') ? [] : meds,
      impact: impact.includes('No impact') ? [] : impact,
      notes, isConstipationDay,
      isTenesmus: isTenesmus || false,
      duration: isTenesmus ? duration : undefined,
      isBackdated: isEditMode ? (editEntry.isBackdated || false) : isBackdated,
    };

    if (isEditMode) {
      entry.ts = editEntry.ts;
      entry.editedAt = new Date().toISOString();
      if (!isBackdated && editEntry.isBackdated) entry.isBackdated = true;
      updateEntry(entry);
    } else {
      saveEntry(entry);
    }
    setToast(true);
    setTimeout(() => navigate(isEditMode ? '/history' : '/'), 2000);
  };

  // --- Styles ---
  const pill = (selected) => ({
    background: selected ? 'var(--blue-dim)' : 'var(--bg-input)',
    border: `1px solid ${selected ? 'var(--blue)' : 'var(--border)'}`,
    color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
    borderRadius: 8, padding: '12px 16px', minHeight: 48, fontSize: 15,
    width: '100%', textAlign: 'left', cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    fontFamily: 'var(--font-body)',
  });

  const painPill = (val, selected) => {
    const c = { 'None': { bg: 'var(--bg-surface)', b: 'var(--text-muted)', t: 'var(--text-muted)' },
      'Mild (1-3)': { bg: 'var(--yellow-bg)', b: 'var(--yellow)', t: 'var(--yellow)' },
      'Moderate (4-6)': { bg: '#431407', b: '#f97316', t: '#f97316' },
      'Severe (7-10)': { bg: 'var(--red-bg)', b: 'var(--red)', t: 'var(--red)' },
    }[val] || { bg: 'var(--bg-surface)', b: 'var(--text-muted)', t: 'var(--text-muted)' };
    return { ...pill(false), background: selected ? c.bg : 'var(--bg-input)',
      border: `1px solid ${selected ? c.b : 'var(--border)'}`, color: selected ? c.t : 'var(--text-secondary)' };
  };

  const label = (text) => (
    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
      color: 'var(--text-secondary)', letterSpacing: '0.06em', marginBottom: 8 }}>{text}</div>
  );

  const qColor = qualifyingCount >= 2 ? 'var(--green)' : qualifyingCount === 1 ? 'var(--yellow)' : 'var(--text-muted)';

  const stepLabels = ['Type', 'Symptoms', 'Details', 'Impact'];

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Header */}
      <div style={{ paddingTop: 20, paddingBottom: 8 }}>
        <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
          {isEditMode ? 'EDIT EPISODE' : 'LOG EPISODE'}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {stepLabels.map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: 3, borderRadius: 2, marginBottom: 4,
              background: i + 1 <= step ? 'var(--blue)' : 'var(--border)',
              transition: 'background 0.2s',
            }} />
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: i + 1 <= step ? 'var(--blue-light)' : 'var(--text-muted)' }}>{s}</div>
          </div>
        ))}
      </div>

      {/* ====== STEP 1: Type + Presets ====== */}
      {step === 1 && (
        <div>
          {/* Date/Time toggle */}
          <button onClick={() => setShowDateTime(!showDateTime)} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '10px 14px', width: '100%', textAlign: 'left', cursor: 'pointer',
            marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: isBackdated ? 'var(--yellow)' : 'var(--text-muted)' }}>
              {isBackdated ? `⏱ ${entryDate} ${entryTime}` : `Now — ${entryTime}`}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{showDateTime ? '▲' : 'Change ▼'}</span>
          </button>

          {showDateTime && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '8px 10px', fontSize: 16, color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)', outline: 'none' }} />
              </div>
              <div style={{ flex: 1 }}>
                <input type="time" value={entryTime} onChange={e => setEntryTime(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '8px 10px', fontSize: 16, color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)', outline: 'none' }} />
              </div>
            </div>
          )}

          {/* Quick presets */}
          {!isEditMode && (
            <>
              {label('QUICK LOG — ONE TAP')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                {PRESETS.map((p, i) => (
                  <button key={i} onClick={() => applyPreset(p)} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '12px 14px', width: '100%', textAlign: 'left',
                    cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                  }}>{p.label}</button>
                ))}
              </div>
            </>
          )}

          {/* Manual type selection */}
          {label('OR SELECT TYPE')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => selectType('normal')} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--blue)',
              borderRadius: 10, padding: '16px', textAlign: 'left', cursor: 'pointer', width: '100%',
            }}>
              <div style={{ fontSize: 15, color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>Bowel Episode</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Diarrhea, loose stool, or normal BM with symptoms</div>
            </button>

            <button onClick={() => selectType('constipation')} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--yellow)',
              borderRadius: 10, padding: '16px', textAlign: 'left', cursor: 'pointer', width: '100%',
            }}>
              <div style={{ fontSize: 15, color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>Constipation / No BM</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>No bowel movement today</div>
            </button>

            <button onClick={() => selectType('tenesmus')} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid #8b5cf6',
              borderRadius: 10, padding: '16px', textAlign: 'left', cursor: 'pointer', width: '100%',
            }}>
              <div style={{ fontSize: 15, color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>Abdominal Pain / Failed Urge</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Had urge to defecate but could not — no BM</div>
            </button>
          </div>
        </div>
      )}

      {/* ====== STEP 2: Core Symptoms ====== */}
      {step === 2 && (
        <div>
          {/* Pain */}
          {label('ABDOMINAL PAIN LEVEL')}
          {isTenesmus && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 8, marginTop: -4 }}>Moderate or Severe counts toward VA pain days for this type</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['None', 'Mild (1-3)', 'Moderate (4-6)', 'Severe (7-10)'].map(v => (
              <button key={v} onClick={() => setPain(v)} style={painPill(v, pain === v)}>{v}</button>
            ))}
          </div>

          {/* Episode # — normal only */}
          {!isConstipationDay && !isTenesmus && (
            <div style={{ marginTop: 16 }}>
              {label('EPISODE # TODAY')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {['1st of the day', '2nd', '3rd', '4th', '5th', '6th or more'].map(v => (
                  <button key={v} onClick={() => setEpisodeNum(v)} style={pill(episodeNum === v)}>{v}</button>
                ))}
              </div>
            </div>
          )}

          {/* Urgency — normal + tenesmus */}
          {!isConstipationDay && (
            <div style={{ marginTop: 16 }}>
              {label('URGENCY')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['No urgency', 'Mild — could wait', 'Moderate — had to go soon', 'Severe — could not wait'].map(v => (
                  <button key={v} onClick={() => setUrgency(v)} style={pill(urgency === v)}>{v}</button>
                ))}
              </div>
            </div>
          )}

          {/* Stool — normal only */}
          {!isConstipationDay && !isTenesmus && (
            <div style={{ marginTop: 16 }}>
              {label('STOOL CONSISTENCY')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Normal/formed', 'Hard pellets', 'Loose/mushy', 'Watery/explosive', 'Mixed'].map(v => (
                  <button key={v} onClick={() => setStoolType(v)} style={pill(stoolType === v)}>{v}</button>
                ))}
              </div>
            </div>
          )}

          {/* Straining — normal + tenesmus */}
          {!isConstipationDay && (
            <div style={{ marginTop: 16 }}>
              {label('STRAINING')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['No straining', 'Mild straining', 'Significant straining'].map(v => (
                  <button key={v} onClick={() => setStraining(v)} style={pill(straining === v)}>{v}</button>
                ))}
              </div>
            </div>
          )}

          {/* Duration — tenesmus only */}
          {isTenesmus && (
            <div style={{ marginTop: 16 }}>
              {label('DURATION OF EPISODE')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['< 15 minutes', '15–30 minutes', '30–60 minutes', '> 1 hour'].map(v => (
                  <button key={v} onClick={() => setDuration(v)} style={pill(duration === v)}>{v}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== STEP 3: Other Symptoms ====== */}
      {step === 3 && (
        <div>
          {label('BLOATING')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['None', 'Mild', 'Moderate', 'Severe'].map(v => (
              <button key={v} onClick={() => setBloating(v)} style={pill(bloating === v)}>{v}</button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            {label('ABDOMINAL DISTENSION')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['No', 'Yes — noticeable swelling'].map(v => (
                <button key={v} onClick={() => setDistension(v)} style={pill(distension === v)}>{v}</button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            {label('MUCUS IN STOOL')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['No', 'Yes — mucus present'].map(v => (
                <button key={v} onClick={() => setMucus(v)} style={pill(mucus === v)}>{v}</button>
              ))}
            </div>
          </div>

          {/* Qualifying counter preview */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 12, marginTop: 20,
          }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>
              QUALIFYING SYMPTOMS
            </div>
            <div style={{ background: 'var(--bg-input)', height: 5, borderRadius: 3, width: '100%' }}>
              <div style={{ height: 5, borderRadius: 3, background: qColor, width: `${Math.min(100, (qualifyingCount / 6) * 100)}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ marginTop: 4, fontSize: 12, fontFamily: 'var(--font-mono)', color: qColor }}>
              {qualifyingCount}/6 — {qualifyingCount >= 2 ? '✓ Counts toward rating' : qualifyingCount === 1 ? 'Need 1 more' : 'None yet'}
            </div>
          </div>
        </div>
      )}

      {/* ====== STEP 4: Impact & Save ====== */}
      {step === 4 && (
        <div>
          {label('FUNCTIONAL IMPACT')}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, marginTop: -4 }}>Select all that apply</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['No impact', 'Had to leave work or meeting', 'Caused me to be late', 'Cancelled or modified plans', 'Multiple urgent trips at work', 'Socially disruptive gas or odor', 'Travel disrupted'].map(v => (
              <button key={v} onClick={() => handleImpactToggle(v)} style={pill(impact.includes(v))}>{v}</button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            {label('MEDICATIONS / MANAGEMENT')}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, marginTop: -4 }}>Select all that apply</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['None', 'Imodium', 'Fiber supplement', 'Dairy avoidance', 'Other dietary restriction'].map(v => (
                <button key={v} onClick={() => handleMedsToggle(v)} style={pill(meds.includes(v))}>{v}</button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            {label('NOTES (OPTIONAL)')}
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any other details..."
              style={{
                minHeight: 80, background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 8, padding: 12, fontSize: 16, width: '100%', color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--border-active)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Final qualifying counter */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 12, marginTop: 16,
          }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>
              QUALIFYING SYMPTOMS
            </div>
            <div style={{ background: 'var(--bg-input)', height: 5, borderRadius: 3, width: '100%' }}>
              <div style={{ height: 5, borderRadius: 3, background: qColor, width: `${Math.min(100, (qualifyingCount / 6) * 100)}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ marginTop: 4, fontSize: 12, fontFamily: 'var(--font-mono)', color: qColor }}>
              {qualifyingCount}/6 — {qualifyingCount >= 2 ? '✓ Counts toward rating' : qualifyingCount === 1 ? 'Need 1 more' : 'None yet'}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div style={{ color: 'var(--red)', fontSize: 13, padding: '8px 0', fontFamily: 'var(--font-mono)' }}>{error}</div>}

      {/* Navigation buttons */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16, marginBottom: 24 }}>
        {step > 1 && (
          <button onClick={handleBack} style={{
            flex: 1, height: 48, borderRadius: 10, background: 'transparent',
            border: '1px solid var(--border)', color: 'var(--text-secondary)',
            fontSize: 15, fontFamily: 'var(--font-mono)', cursor: 'pointer',
          }}>BACK</button>
        )}
        {step < 4 ? (
          <button onClick={handleNext} style={{
            flex: 2, height: 48, borderRadius: 10, background: 'var(--blue)',
            color: 'white', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-mono)',
            border: 'none', cursor: 'pointer', textTransform: 'uppercase',
          }}>NEXT</button>
        ) : (
          <button onClick={handleSave} style={{
            flex: 2, height: 52, borderRadius: 10, background: 'var(--blue)',
            color: 'white', fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            border: 'none', cursor: 'pointer',
          }}>{isEditMode ? 'UPDATE EPISODE' : 'SAVE EPISODE'}</button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom) + 12px)',
          left: '50%', transform: 'translateX(-50%)',
          background: 'var(--green-dim)', border: '1px solid var(--green)',
          color: 'var(--green)', padding: '10px 24px', borderRadius: 24,
          fontSize: 14, fontFamily: 'var(--font-mono)', zIndex: 100, whiteSpace: 'nowrap',
          animation: 'fadeInOut 2s ease-in-out',
        }}>{isEditMode ? '✓ Episode updated' : '✓ Episode saved'}</div>
      )}

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; } 10% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
