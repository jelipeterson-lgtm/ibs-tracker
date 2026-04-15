export function getQualifyingSymptomCount(entry) {
  let count = 0;
  if (entry.stoolType !== 'Normal/formed' && entry.stoolType !== 'No BM today' && entry.stoolType !== null && entry.stoolType !== undefined) count++;
  if (entry.urgency !== 'No urgency' && entry.urgency !== null && entry.urgency !== undefined) count++;
  if (entry.straining !== 'No straining' && entry.straining !== null && entry.straining !== undefined) count++;
  if (entry.mucus === 'Yes — mucus present') count++;
  if (entry.bloating !== 'None' && entry.bloating !== null && entry.bloating !== undefined) count++;
  if (entry.distension === 'Yes — noticeable swelling') count++;
  return count;
}

// Determine if an entry counts as a pain day
// Tenesmus entries only count when pain is Moderate or Severe
function entryCountsAsPainDay(entry) {
  if (entry.pain === 'None') return false;
  if (entry.isTenesmus) {
    return entry.pain === 'Moderate (4-6)' || entry.pain === 'Severe (7-10)';
  }
  return true;
}

export function filterTo90Days(entries) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 89);
  return entries.filter(e => new Date(e.ts) >= cutoff);
}

export function groupByDate(entries) {
  const groups = {};
  for (const entry of entries) {
    const d = new Date(entry.ts);
    const key = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }
  return groups;
}

export function calculateCurrentRating(entries) {
  const filtered = filterTo90Days(entries);
  const grouped = groupByDate(filtered);
  let painDays = 0;
  let qualifyingDays = 0;
  for (const dateKey of Object.keys(grouped)) {
    const dayEntries = grouped[dateKey];
    const hasPain = dayEntries.some(e => entryCountsAsPainDay(e));
    const hasQualifying = dayEntries.some(e => getQualifyingSymptomCount(e) >= 2);
    if (hasPain) painDays++;
    if (hasQualifying) qualifyingDays++;
  }
  if (painDays >= 13 && qualifyingDays >= 13) return { rating: 30, painDays, qualifyingDays };
  if (painDays >= 9 && qualifyingDays >= 9) return { rating: 20, painDays, qualifyingDays };
  if (painDays >= 1 && qualifyingDays >= 1) return { rating: 10, painDays, qualifyingDays };
  return { rating: 0, painDays, qualifyingDays };
}

export function calculatePaceStatus(entries) {
  const windowEntries = filterTo90Days(entries);
  const grouped = groupByDate(windowEntries);
  let painDaysLogged = 0;
  for (const dateKey of Object.keys(grouped)) {
    if (grouped[dateKey].some(e => entryCountsAsPainDay(e))) painDaysLogged++;
  }
  const targetPainDays = 13;

  let daysElapsed = 0;
  if (windowEntries.length > 0) {
    const dates = windowEntries.map(e => new Date(e.ts));
    const earliest = new Date(Math.min(...dates));
    const today = new Date();
    const earliestDay = new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    daysElapsed = Math.floor((todayDay - earliestDay) / (1000 * 60 * 60 * 24)) + 1;
    if (daysElapsed > 90) daysElapsed = 90;
  }

  const daysRemaining = 90 - daysElapsed;
  const painDaysNeeded = Math.max(0, targetPainDays - painDaysLogged);
  const paceRequired = daysRemaining > 0 ? painDaysNeeded / daysRemaining : (painDaysLogged >= 13 ? 0 : 999);

  let status, message;
  if (painDaysLogged >= 13) {
    status = 'green';
    message = '30% threshold met. Keep logging to maintain your record.';
  } else if (daysRemaining === 0 && painDaysLogged < 13) {
    status = 'red';
    message = '90-day window complete. Export your log and share with your VSO.';
  } else if (daysElapsed <= 7) {
    status = 'green';
    message = 'Early in your log. Keep logging daily — you are building your case.';
  } else if (paceRequired <= 0.5) {
    status = 'green';
    message = 'On pace for 30%. ' + painDaysLogged + ' of 13 pain days logged, ' + daysRemaining + ' days left.';
  } else if (paceRequired <= 0.85) {
    status = 'yellow';
    message = 'Getting tight. You need pain logged most of the next ' + daysRemaining + ' days to reach 30%.';
  } else {
    status = 'red';
    message = '30% threshold is very unlikely this window. Log consistently for 20% evidence instead.';
  }

  return { status, painDaysLogged, targetPainDays: 13, daysRemaining, daysElapsed, painDaysNeeded, paceRequired, message };
}
