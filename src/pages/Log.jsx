import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveEntry, updateEntry } from '../storage';

const PRESETS = [
  {
    label: 'Loose stool with urgency and cramping',
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
    label: 'Constipation with significant cramping',
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
    label: 'Abdominal pain, urge, no bowel movement',
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
    label: 'Post-meal urgency with loose stool',
    values: {
      isConstipationDay: false, isTenesmus: false,
      stoolType: 'Loose/mushy', urgency: 'Severe — could not wait',
      pain: 'Mild (1-3)', bloating: 'Mild', straining: 'No straining',
      distension: 'No', mucus: 'No', episodeNum: '1st of the day',
      impact: ['No impact'], meds: ['None'],
    }
  },
  {
    label: 'Severe pain, multiple symptoms, high impact',
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

  // Edit mode: entry data passed via location state
  const editEntry = location.state?.editEntry || null;
  const isEditMode = !!editEntry;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // --- Date/Time picker state ---
  const now = new Date();
  const defaultDate = editEntry
    ? new Date(editEntry.ts).toISOString().slice(0, 10)
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const defaultTime = editEntry
    ? `${String(new Date(editEntry.ts).getHours()).padStart(2, '0')}:${String(new Date(editEntry.ts).getMinutes()).padStart(2, '0')}`
    : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [entryDate, setEntryDate] = useState(defaultDate);
  const [entryTime, setEntryTime] = useState(defaultTime);

  // Check if backdated (different calendar day than today)
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isBackdated = entryDate !== todayStr;

  // --- Episode type states ---
  const [isConstipationDay, setIsConstipationDay] = useState(editEntry?.isConstipationDay || false);
  const [isTenesmus, setIsTenesmus] = useState(editEntry?.isTenesmus || false);

  // --- Form field states ---
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
  const [error, setError] = useState(false);
  const [toast, setToast] = useState(false);

  // Fix impact/meds for edit mode: empty arrays mean "None" was selected
  useEffect(() => {
    if (editEntry) {
      if (editEntry.impact?.length === 0) setImpact(['No impact']);
      if (editEntry.meds?.length === 0) setMeds(['None']);
    }
  }, [editEntry]);

  const setEpisodeType = (type) => {
    // type: 'normal', 'constipation', 'tenesmus'
    if (type === 'constipation') {
      setIsConstipationDay(true);
      setIsTenesmus(false);
      setEpisodeNum('Constipation/No BM');
      setStoolType('No BM today');
      setUrgency(null);
      setStraining(null);
      setDuration(null);
    } else if (type === 'tenesmus') {
      setIsConstipationDay(false);
      setIsTenesmus(true);
      setEpisodeNum('Abdominal Pain/Failed Urge');
      setStoolType('No BM today');
      setDuration(null);
    } else {
      // normal
      setIsConstipationDay(false);
      setIsTenesmus(false);
      setEpisodeNum(null);
      setStoolType(null);
      setDuration(null);
    }
  };

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
  };

  // Qualifying symptom counter
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
    if (val === 'No impact') {
      setImpact(['No impact']);
    } else {
      setImpact(prev => {
        const without = prev.filter(v => v !== 'No impact');
        return without.includes(val) ? without.filter(v => v !== val) : [...without, val];
      });
    }
  };

  const handleMedsToggle = (val) => {
    if (val === 'None') {
      setMeds(['None']);
    } else {
      setMeds(prev => {
        const without = prev.filter(v => v !== 'None');
        return without.includes(val) ? without.filter(v => v !== val) : [...without, val];
      });
    }
  };

  const handleSave = () => {
    const missing = [];
    if (!isConstipationDay && !isTenesmus && !episodeNum) missing.push('episode');
    if (!pain) missing.push('pain');
    if (!isConstipationDay && !isTenesmus && !urgency) missing.push('urgency');
    if (!isConstipationDay && !isTenesmus && !stoolType) missing.push('stool');
    if (!isConstipationDay && !isTenesmus && !straining) missing.push('straining');
    if (isTenesmus && !urgency) missing.push('urgency');
    if (isTenesmus && !duration) missing.push('duration');
    if (!bloating) missing.push('bloating');
    if (!distension) missing.push('distension');
    if (!mucus) missing.push('mucus');
    if (impact.length === 0) missing.push('impact');
    if (meds.length === 0) missing.push('meds');

    if (missing.length > 0) {
      setError(true);
      return;
    }
    setError(false);

    // Build timestamp from date/time picker
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
      bloating,
      distension,
      mucus,
      meds: meds.includes('None') ? [] : meds,
      impact: impact.includes('No impact') ? [] : impact,
      notes,
      isConstipationDay,
      isTenesmus: isTenesmus || false,
      duration: isTenesmus ? duration : undefined,
      isBackdated: isEditMode ? (editEntry.isBackdated || false) : isBackdated,
    };

    if (isEditMode) {
      entry.ts = editEntry.ts; // preserve original timestamp
      entry.editedAt = new Date().toISOString();
      if (!isBackdated && editEntry.isBackdated) entry.isBackdated = true; // preserve original backdated status
      updateEntry(entry);
      setToast(true);
      setTimeout(() => navigate('/history'), 2000);
    } else {
      saveEntry(entry);
      setToast(true);
      setTimeout(() => navigate('/'), 2000);
    }
  };

  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const pillStyle = (selected) => ({
    background: selected ? 'var(--blue-dim)' : 'var(--bg-input)',
    border: `1px solid ${selected ? 'var(--blue)' : 'var(--border)'}`,
    color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
    borderRadius: 8, padding: '12px 16px', minHeight: 48, fontSize: 15,
    width: '100%', textAlign: 'left', cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    fontFamily: 'var(--font-body)'
  });

  const painPillStyle = (val, selected) => {
    const colors = {
      'None': { bg: 'var(--bg-surface)', border: 'var(--text-muted)', text: 'var(--text-muted)' },
      'Mild (1-3)': { bg: 'var(--yellow-bg)', border: 'var(--yellow)', text: 'var(--yellow)' },
      'Moderate (4-6)': { bg: '#431407', border: '#f97316', text: '#f97316' },
      'Severe (7-10)': { bg: 'var(--red-bg)', border: 'var(--red)', text: 'var(--red)' },
    };
    const c = colors[val] || colors['None'];
    return {
      background: selected ? c.bg : 'var(--bg-input)',
      border: `1px solid ${selected ? c.border : 'var(--border)'}`,
      color: selected ? c.text : 'var(--text-secondary)',
      borderRadius: 8, padding: '12px 16px', minHeight: 48, fontSize: 15,
      width: '100%', textAlign: 'left', cursor: 'pointer',
      transition: 'border-color 0.15s, background 0.15s',
      fontFamily: 'var(--font-body)'
    };
  };

  const sectionLabel = (text) => (
    <div style={{
      fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
      color: 'var(--text-secondary)', letterSpacing: '0.06em', marginBottom: 8
    }}>{text}</div>
  );

  const divider = <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />;

  const qBarColor = qualifyingCount >= 2 ? 'var(--green)' : qualifyingCount === 1 ? 'var(--yellow)' : 'var(--text-muted)';

  // Show stool/urgency/straining/episode# for normal episodes only
  const showNormalFields = !isConstipationDay && !isTenesmus;
  // Tenesmus shows urgency, straining, duration but not stool or episode#
  const showUrgency = !isConstipationDay; // both normal and tenesmus
  const showStraining = !isConstipationDay; // both normal and tenesmus

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Header */}
      <div style={{ paddingTop: 20, paddingBottom: 16 }}>
        <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
          {isEditMode ? 'EDIT EPISODE' : 'LOG EPISODE'}
        </div>
        <div style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-muted)' }}>{dayName}</div>
      </div>

      {/* Date/Time Picker */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 14, marginBottom: 16,
        display: 'flex', gap: 10,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>DATE</div>
          <input
            type="date"
            value={entryDate}
            onChange={e => setEntryDate(e.target.value)}
            style={{
              width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 10px', fontSize: 16, color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)', outline: 'none',
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>TIME</div>
          <input
            type="time"
            value={entryTime}
            onChange={e => setEntryTime(e.target.value)}
            style={{
              width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 10px', fontSize: 16, color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Backdated indicator */}
      {isBackdated && !isEditMode && (
        <div style={{
          fontSize: 12, color: 'var(--yellow)', fontFamily: 'var(--font-mono)',
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, marginTop: -8,
        }}>
          <span style={{ fontSize: 14 }}>⏱</span> Backdated entry
        </div>
      )}

      {/* Quick Presets — only for new entries */}
      {!isEditMode && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
            color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 8
          }}>QUICK PRESETS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PRESETS.map((p, i) => (
              <button key={i} onClick={() => applyPreset(p)} style={{
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '6px 12px', fontSize: 12,
                color: 'var(--text-secondary)', cursor: 'pointer',
                fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
              }}>{p.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Episode Type Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {/* Constipation Toggle */}
        <button onClick={() => setEpisodeType(isConstipationDay ? 'normal' : 'constipation')} style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: isConstipationDay ? 'var(--yellow-bg)' : 'var(--bg-card)',
          border: isConstipationDay ? '1px solid var(--yellow-dim)' : '1px solid var(--border)',
          borderLeft: isConstipationDay ? '3px solid var(--yellow)' : '1px solid var(--border)',
          borderRadius: 10, padding: '14px 16px',
        }}>
          <div style={{
            fontSize: isConstipationDay ? 14 : 15,
            fontFamily: isConstipationDay ? 'var(--font-mono)' : 'var(--font-body)',
            textTransform: isConstipationDay ? 'uppercase' : 'none',
            color: isConstipationDay ? 'var(--yellow)' : 'var(--text-primary)'
          }}>
            {isConstipationDay ? 'CONSTIPATION DAY' : 'No BM / Constipated Today'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {isConstipationDay ? 'Stool questions hidden' : 'Tap to log a constipation day'}
          </div>
        </button>

        {/* Tenesmus Toggle */}
        <button onClick={() => setEpisodeType(isTenesmus ? 'normal' : 'tenesmus')} style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: isTenesmus ? '#1a0f2e' : 'var(--bg-card)',
          border: isTenesmus ? '1px solid #5b21b6' : '1px solid var(--border)',
          borderLeft: isTenesmus ? '3px solid #8b5cf6' : '1px solid var(--border)',
          borderRadius: 10, padding: '14px 16px',
        }}>
          <div style={{
            fontSize: isTenesmus ? 14 : 15,
            fontFamily: isTenesmus ? 'var(--font-mono)' : 'var(--font-body)',
            textTransform: isTenesmus ? 'uppercase' : 'none',
            color: isTenesmus ? '#8b5cf6' : 'var(--text-primary)'
          }}>
            {isTenesmus ? 'ABDOMINAL PAIN / FAILED URGE' : 'Abdominal Pain / Failed Urge'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {isTenesmus ? 'Had urge, unable to defecate — no BM' : 'Had urge to defecate, was unable to, no bowel movement'}
          </div>
        </button>
      </div>

      {/* Q1 Episode Number — normal episodes only */}
      {showNormalFields && (
        <>
          {sectionLabel('EPISODE NUMBER TODAY')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 0 }}>
            {['1st of the day', '2nd', '3rd', '4th', '5th', '6th or more'].map(v => (
              <button key={v} onClick={() => setEpisodeNum(v)} style={pillStyle(episodeNum === v)}>{v}</button>
            ))}
          </div>
          {divider}
        </>
      )}

      {/* Q2 Pain Level — always shown */}
      {sectionLabel('ABDOMINAL PAIN LEVEL')}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 8, marginTop: -4 }}>
        {isTenesmus
          ? '(Moderate or Severe counts toward VA pain days for this episode type)'
          : '(must be tied to defecation to count toward VA rating)'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['None', 'Mild (1-3)', 'Moderate (4-6)', 'Severe (7-10)'].map(v => (
          <button key={v} onClick={() => setPain(v)} style={painPillStyle(v, pain === v)}>{v}</button>
        ))}
      </div>
      {divider}

      {/* Q3 Urgency — normal and tenesmus */}
      {showUrgency && (
        <>
          {sectionLabel('URGENCY TO REACH BATHROOM')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['No urgency', 'Mild — could wait', 'Moderate — had to go soon', 'Severe — could not wait'].map(v => (
              <button key={v} onClick={() => setUrgency(v)} style={pillStyle(urgency === v)}>{v}</button>
            ))}
          </div>
          {divider}
        </>
      )}

      {/* Q4 Stool Consistency — normal only */}
      {showNormalFields && (
        <>
          {sectionLabel('STOOL CONSISTENCY')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Normal/formed', 'Hard pellets', 'Loose/mushy', 'Watery/explosive', 'Mixed'].map(v => (
              <button key={v} onClick={() => setStoolType(v)} style={pillStyle(stoolType === v)}>{v}</button>
            ))}
          </div>
          {divider}
        </>
      )}

      {/* Q5 Straining — normal and tenesmus */}
      {showStraining && (
        <>
          {sectionLabel('STRAINING')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['No straining', 'Mild straining', 'Significant straining'].map(v => (
              <button key={v} onClick={() => setStraining(v)} style={pillStyle(straining === v)}>{v}</button>
            ))}
          </div>
          {divider}
        </>
      )}

      {/* Duration — tenesmus only */}
      {isTenesmus && (
        <>
          {sectionLabel('DURATION OF EPISODE')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['< 15 minutes', '15–30 minutes', '30–60 minutes', '> 1 hour'].map(v => (
              <button key={v} onClick={() => setDuration(v)} style={pillStyle(duration === v)}>{v}</button>
            ))}
          </div>
          {divider}
        </>
      )}

      {/* Q6 Bloating */}
      {sectionLabel('BLOATING')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {['None', 'Mild', 'Moderate', 'Severe'].map(v => (
          <button key={v} onClick={() => setBloating(v)} style={pillStyle(bloating === v)}>{v}</button>
        ))}
      </div>
      {divider}

      {/* Q7 Distension */}
      {sectionLabel('ABDOMINAL DISTENSION')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {['No', 'Yes — noticeable swelling'].map(v => (
          <button key={v} onClick={() => setDistension(v)} style={pillStyle(distension === v)}>{v}</button>
        ))}
      </div>
      {divider}

      {/* Q8 Mucus */}
      {sectionLabel('MUCUS IN STOOL')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {['No', 'Yes — mucus present'].map(v => (
          <button key={v} onClick={() => setMucus(v)} style={pillStyle(mucus === v)}>{v}</button>
        ))}
      </div>
      {divider}

      {/* Q9 Functional Impact */}
      {sectionLabel('FUNCTIONAL IMPACT')}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, marginTop: -4 }}>Select all that apply</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['No impact', 'Had to leave work or meeting', 'Caused me to be late', 'Cancelled or modified plans', 'Multiple urgent trips at work', 'Socially disruptive gas or odor', 'Travel disrupted'].map(v => (
          <button key={v} onClick={() => handleImpactToggle(v)} style={pillStyle(impact.includes(v))}>{v}</button>
        ))}
      </div>
      {divider}

      {/* Q10 Medications */}
      {sectionLabel('MEDICATIONS / MANAGEMENT')}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, marginTop: -4 }}>Select all that apply</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {['None', 'Imodium', 'Fiber supplement', 'Dairy avoidance', 'Other dietary restriction'].map(v => (
          <button key={v} onClick={() => handleMedsToggle(v)} style={pillStyle(meds.includes(v))}>{v}</button>
        ))}
      </div>
      {divider}

      {/* Q11 Notes */}
      {sectionLabel('NOTES (OPTIONAL)')}
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Any other details..."
        style={{
          minHeight: 80, background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 12, fontSize: 16, width: '100%', color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none'
        }}
        onFocus={e => e.target.style.borderColor = 'var(--border-active)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />

      {/* Qualifying Symptom Counter */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 14, marginTop: 16
      }}>
        <div style={{
          fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
          color: 'var(--text-secondary)', marginBottom: 8
        }}>QUALIFYING SYMPTOMS THIS EPISODE</div>
        <div style={{ background: 'var(--bg-input)', height: 6, borderRadius: 3, width: '100%' }}>
          <div style={{
            height: 6, borderRadius: 3, background: qBarColor,
            width: `${Math.min(100, (qualifyingCount / 6) * 100)}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ marginTop: 6, fontSize: 13, fontFamily: 'var(--font-mono)', color: qBarColor }}>
          {qualifyingCount} of 6 qualifying symptoms
        </div>
        <div style={{ fontSize: 12, marginTop: 4, color: qualifyingCount >= 2 ? 'var(--green)' : qualifyingCount === 1 ? 'var(--yellow)' : 'var(--text-muted)' }}>
          {qualifyingCount >= 2 ? '✓ This episode counts toward your VA rating' :
           qualifyingCount === 1 ? 'Need 1 more qualifying symptom to count' :
           'No qualifying symptoms selected yet'}
        </div>
      </div>

      {/* Validation Error */}
      {error && (
        <div style={{ color: 'var(--red)', fontSize: 13, padding: '8px 0' }}>
          Please answer all required questions
        </div>
      )}

      {/* Save Button */}
      <button onClick={handleSave} style={{
        width: '100%', height: 52, borderRadius: 10, background: 'var(--blue)',
        color: 'white', fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        border: 'none', cursor: 'pointer', marginTop: 12, marginBottom: 24
      }}>{isEditMode ? 'UPDATE EPISODE' : 'SAVE EPISODE'}</button>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom) + 12px)',
          left: '50%', transform: 'translateX(-50%)',
          background: 'var(--green-dim)', border: '1px solid var(--green)',
          color: 'var(--green)', padding: '10px 24px', borderRadius: 24,
          fontSize: 14, fontFamily: 'var(--font-mono)', zIndex: 100, whiteSpace: 'nowrap',
          animation: 'fadeInOut 2s ease-in-out'
        }}>{isEditMode ? '✓ Episode updated' : '✓ Episode saved'}</div>
      )}

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; }
          10% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
