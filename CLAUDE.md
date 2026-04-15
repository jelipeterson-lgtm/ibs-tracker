# IBS VA Symptom Tracker — Claude Code Build Specification
## Version: 3.0 — Production Ready, Full Design System
## Last Updated: April 14, 2026

---

## PRIME DIRECTIVE

Build this app completely and correctly on the first pass. Do not ask clarifying questions. Do not offer options. Do not stub out features. Every screen, every component, every piece of logic, and every design detail described in this document must be fully implemented. This is a production app for a US military veteran. Ship it right.

---

## PROJECT OVERVIEW

A mobile-first Progressive Web App (PWA) for a US military veteran logging IBS symptoms to support a VA disability rating increase claim under VASRD Diagnostic Code 7319. The app runs in iOS Safari, is saveable to the iPhone home screen, works fully offline, and stores all data in localStorage. There is no backend, no database, no login, and no server of any kind.

**Veteran:** James Eli Peterson — Portland, OR
**VSO:** Kelly, Washington County VSO
**Claim:** IBS rating increase under DC 7319
**Target log duration:** 60–90 days minimum

---

## TECH STACK — NO ALTERNATIVES

- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS v4 + custom CSS variables (defined below)
- **Fonts:** Load from Google Fonts — IBM Plex Mono (headings/numbers) + Inter (body) — via link in index.html
- **Icons:** Lucide React (lucide-react npm package)
- **Data:** localStorage only — no external calls ever
- **Export:** Native CSV via Blob/URL (no SheetJS)
- **PWA:** manifest.json + manual service worker
- **Routing:** React Router v6
- **Hosting:** Vercel — deploy from GitHub, auto-deploy on push
- **No backend. No Supabase. No auth. No API keys. Nothing external.**

---

## FILE STRUCTURE

```
ibs-tracker/
├── CLAUDE.md
├── index.html
├── vite.config.js
├── package.json
├── vercel.json
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── icon-192.png
│   └── icon-512.png
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── storage.js
    ├── ratingEngine.js
    └── pages/
        ├── Home.jsx
        ├── Log.jsx
        ├── History.jsx
        └── Summary.jsx
```

---

## DESIGN SYSTEM — IMPLEMENT EXACTLY AS SPECIFIED

### Aesthetic Direction

**Tone:** Military-clinical utility. Think VA paperwork meets a modern health app — authoritative, structured, no-nonsense. Dark theme. Monospaced numbers that feel like instrument readouts. Every element earns its place. Nothing decorative that is not functional.

**The one thing a user will remember:** The pace tracker on the Home screen looks like a mission status panel — a bold colored status card with a progress bar and a clear readout that tells you at a glance whether you are building your case or falling behind.

### CSS Variables — define in src/index.css

```css
:root {
  --bg-base: #080f1a;
  --bg-surface: #0f1e2e;
  --bg-card: #152538;
  --bg-card-hover: #1a2e42;
  --bg-input: #0d1a26;
  --border: #1e3347;
  --border-active: #2d5a8a;
  --text-primary: #e8f0f7;
  --text-secondary: #7a9ab5;
  --text-muted: #3d5a73;
  --blue: #2d7dd2;
  --blue-light: #5ba3e8;
  --blue-dim: #1a4a7a;
  --green: #22c55e;
  --green-dim: #14532d;
  --green-bg: #0b2e1a;
  --yellow: #eab308;
  --yellow-dim: #713f12;
  --yellow-bg: #2a1f04;
  --red: #ef4444;
  --red-dim: #7f1d1d;
  --red-bg: #2a0a0a;
  --font-mono: 'IBM Plex Mono', monospace;
  --font-body: 'Inter', sans-serif;
}

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

body {
  background-color: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.5;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

html { -webkit-text-size-adjust: 100%; }

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: var(--bg-base); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
```

### Typography Rules

- All numbers, percentages, ratings, and counts: font-family var(--font-mono) — non-negotiable
- Page titles and section labels: var(--font-mono), uppercase, letter-spacing 0.08em
- Body text, questions, answer labels: var(--font-body)
- Minimum font size anywhere: 16px (iOS zoom prevention on inputs — all input and textarea must be 16px)
- Stat numbers on Home: 28px monospaced
- Rating percentage display: 48px monospaced

### Spacing and Layout

- App max-width: 430px, centered on desktop with margin 0 auto
- Page padding: 16px horizontal
- Card padding: 16px
- Card border-radius: 12px
- Card border: 1px solid var(--border)
- Gap between cards: 12px
- Section label margin-bottom: 8px

### Card Pattern

Every card uses:
```
background: var(--bg-card)
border: 1px solid var(--border)
border-radius: 12px
padding: 16px
```

Cards with status get a left border accent: border-left: 3px solid [status color]

### Pill Button Styles (Log form answers)

Unselected:
```
background: var(--bg-input)
border: 1px solid var(--border)
color: var(--text-secondary)
border-radius: 8px
padding: 12px 16px
min-height: 48px
font-size: 15px
width: 100%
text-align: left
cursor: pointer
transition: border-color 0.15s, background 0.15s
```

Selected:
```
background: var(--blue-dim)
border: 1px solid var(--blue)
color: var(--text-primary)
```

Hover unselected:
```
border-color: var(--border-active)
background: var(--bg-card-hover)
```

---

## APP LAYOUT SHELL — src/App.jsx

```
div (max-width 430px, margin 0 auto, min-height 100vh, position relative)
  NudgeBanner (conditional, fixed top, z-index 50)
  main (padding-bottom: calc(80px + env(safe-area-inset-bottom)), padding-top: nudge ? 64px : 0)
    Routes
  BottomNav (fixed bottom)
  FloatingLogButton (fixed bottom-right)
```

---

## NUDGE BANNER

Show when: last log more than 18 hours ago OR after 20:00 local with no entry today.

Layout: full-width, fixed top, z-index 50, height ~64px
Background: var(--yellow-bg)
Border-bottom: 1px solid var(--yellow-dim)
Border-left: 3px solid var(--yellow)
Padding: 12px 16px

Text left: "No log in 18+ hours. Constipated or forgot?" — 14px body
Buttons right: "Log Now" (var(--yellow), semibold, navigates to /log) | "Dismiss" (muted, sets dismissed=true in React state only)

---

## BOTTOM NAVIGATION

Fixed bottom, full width, max-width 430px centered.
Background: #0a1520
Border-top: 1px solid var(--border)
Height: calc(64px + env(safe-area-inset-bottom))
Padding-bottom: env(safe-area-inset-bottom)

Four tabs, flex row, equal width:
- Home / house icon / /
- Log / plus icon / /log
- History / clipboard icon / /history
- Summary / bar-chart icon / /summary

Active tab: color var(--blue-light), 2px top border in var(--blue)
Inactive tab: color var(--text-muted)
Icon: 22px Lucide icon above label
Label: 11px var(--font-body)

### Floating Plus Button

```
position: fixed
bottom: calc(80px + env(safe-area-inset-bottom) + 8px)
right: 20px
width: 52px
height: 52px
border-radius: 50%
background: var(--blue)
color: white
box-shadow: 0 4px 20px rgba(45,125,210,0.4)
z-index: 40
border: none
cursor: pointer
display: flex
align-items: center
justify-content: center
```

Use Lucide Plus icon (24px) inside.

---

## SCREEN 1 — HOME (src/pages/Home.jsx)

### Page Header

"IBS VA TRACKER" — 18px var(--font-mono) uppercase letter-spacing 0.08em var(--text-primary)
"DC 7319 — Symptom Log" — 12px var(--font-mono) var(--text-muted)
Padding-top: 20px, padding-bottom: 16px

---

### Pace Tracker Card (most dominant element)

Card with status-colored left border (3px). Card background matches status bg var.

Top row: colored dot (10px circle, filled) + status label (14px var(--font-mono) uppercase)
- GREEN: dot var(--green), label "ON PACE"
- YELLOW: dot var(--yellow), label "WATCH YOUR PACE"
- RED: dot var(--red), label "OFF PACE"

Progress bar (margin-top 12px):
- Track: var(--bg-input), height 8px, border-radius 4px, full width
- Fill: status color, width = (painDaysLogged / 13 * 100)%, max 100%
- CSS transition on fill width: width 0.6s ease on mount

Below bar (margin-top 6px): "{painDaysLogged} of 13 pain days · {daysRemaining} days left"
Font: 13px var(--font-mono) var(--text-secondary)

Message (margin-top 10px): message string from calculatePaceStatus
Font: 14px var(--font-body) var(--text-primary)

Footer note (margin-top 8px): "30% VA rating requires 1 pain day/week (DC 7319)"
Font: 11px var(--font-body) var(--text-muted)

Status card background:
- GREEN: var(--green-bg) card, var(--green) left border
- YELLOW: var(--yellow-bg) card, var(--yellow) left border
- RED: var(--red-bg) card, var(--red) left border

---

### VA Rating Estimate Card

Smaller card, standard var(--bg-card) background.

"ESTIMATED RATING" — 11px var(--font-mono) uppercase var(--text-muted) letter-spacing 0.08em

Rating percentage centered: 48px var(--font-mono)
- 0%: var(--text-muted)
- 10%: var(--yellow)
- 20%: #86efac
- 30%: var(--green)

Sub-label: "Criteria likely met" or "Keep logging" — 13px var(--font-body) var(--text-secondary)
Footer: "DC 7319 · Based on last 90 days · Actual rating determined at C&P exam" — 11px var(--text-muted)

Empty state (0 entries): show "—" in muted with "Start logging to see your estimate"

---

### Stats Row

Three equal cards in a flex row, gap 8px.

Each card: var(--bg-card), border var(--border), border-radius 10px, padding 12px 8px, flex column centered

Number: 28px var(--font-mono) var(--text-primary)
Label line 1: 10px var(--font-mono) uppercase var(--text-muted)
Label line 2: 10px var(--font-mono) uppercase var(--text-muted)

Cards:
1. Days Logged / DAYS / LOGGED
2. [count today] / TODAY / EPISODES
3. [count 90 days] / 90 DAYS / EPISODES

---

### Action Buttons

Primary — full width, 52px height, border-radius 10px:
```
background: var(--blue)
color: white
font-size: 16px
font-weight: 600
font-family: var(--font-body)
border: none
```
Label: "Log an Episode"

Secondary (only if entries exist) — full width, 48px, border-radius 10px:
```
background: transparent
border: 1px solid var(--border-active)
color: var(--blue-light)
font-size: 15px
```
Label: "Export Log to CSV"

---

### Empty State (zero entries)

Replace pace tracker, rating badge, and stats with a single welcome card:

Card: var(--bg-card), border-left 3px solid var(--blue)
"START YOUR LOG" — 13px var(--font-mono) uppercase var(--blue-light)
Body text: "Log your first episode to begin building evidence for your VA claim."
"Target: 13+ pain days in 90 days for a 30% rating under DC 7319." — 13px var(--text-muted)
Button inside card: "Log First Episode →" — blue text, no background

---

## SCREEN 2 — LOG (src/pages/Log.jsx)

Scroll to top on mount.

### Page Header

"LOG EPISODE" — 18px var(--font-mono) uppercase letter-spacing 0.08em
Today's date (e.g. "Tuesday, April 14, 2026") — 13px var(--font-body) var(--text-muted)
Padding-top 20px, padding-bottom 16px

### Form Layout

Each question block:
- Section label: 12px var(--font-mono) uppercase var(--text-secondary) letter-spacing 0.06em, margin-bottom 8px
- Answer options below
- Divider between question groups: 1px solid var(--border), margin 16px 0

---

### Constipation Toggle — TOP OF FORM, before all questions

Full-width card-style toggle, taller than pill buttons.

OFF state:
```
background: var(--bg-card)
border: 1px solid var(--border)
border-radius: 10px
padding: 14px 16px
```
Main text: "No BM / Constipated Today" — 15px var(--font-body) var(--text-primary)
Sub-text: "Tap to log a constipation day" — 12px var(--text-muted)

ON state:
```
background: var(--yellow-bg)
border: 1px solid var(--yellow-dim)
border-left: 3px solid var(--yellow)
```
Main text: "CONSTIPATION DAY" — 14px var(--font-mono) uppercase var(--yellow)
Sub-text: "Stool questions hidden" — 12px var(--text-muted)

When ON: hide Q1, Q3, Q4, Q5. Keep Q2, Q6, Q7, Q8, Q9, Q10, Q11.
Set isConstipationDay: true, stoolType: "No BM today", episodeNum: "Constipation/No BM"

---

### Q1. EPISODE NUMBER TODAY — hidden if constipation day

Label: "EPISODE NUMBER TODAY"
3-column grid of pills: "1st of the day" | "2nd" | "3rd" | "4th" | "5th" | "6th or more"
Required.

---

### Q2. ABDOMINAL PAIN LEVEL — always shown

Label: "ABDOMINAL PAIN LEVEL"
Sub-label directly below: "(must be tied to defecation to count toward VA rating)" — 11px var(--text-muted) italic
Required. Single column pills with color-coded selected states:
- "None" → selected: gray (var(--bg-surface) bg, var(--text-muted) text)
- "Mild (1-3)" → selected: var(--yellow-bg) bg, var(--yellow) border and text
- "Moderate (4-6)" → selected: #431407 bg, #f97316 border and text
- "Severe (7-10)" → selected: var(--red-bg) bg, var(--red) border and text

---

### Q3. URGENCY TO REACH BATHROOM — hidden if constipation day

Label: "URGENCY TO REACH BATHROOM"
Single column pills: "No urgency" | "Mild — could wait" | "Moderate — had to go soon" | "Severe — could not wait"
Required.

---

### Q4. STOOL CONSISTENCY — hidden if constipation day

Label: "STOOL CONSISTENCY"
Single column pills: "Normal/formed" | "Hard pellets" | "Loose/mushy" | "Watery/explosive" | "Mixed"
Required.

---

### Q5. STRAINING — hidden if constipation day

Label: "STRAINING"
Single column pills: "No straining" | "Mild straining" | "Significant straining"
Required.

---

### Q6. BLOATING — always shown

Label: "BLOATING"
2-column grid: "None" | "Mild" | "Moderate" | "Severe"
Required.

---

### Q7. ABDOMINAL DISTENSION — always shown

Label: "ABDOMINAL DISTENSION"
2-column grid: "No" | "Yes — noticeable swelling"
Required.

---

### Q8. MUCUS IN STOOL — always shown

Label: "MUCUS IN STOOL"
2-column grid: "No" | "Yes — mucus present"
Required.

---

### Q9. FUNCTIONAL IMPACT — always shown

Label: "FUNCTIONAL IMPACT"
Sub-label: "Select all that apply" — 11px muted
Single column multi-select pills.
Selecting "No impact" deselects all others. Selecting any other deselects "No impact".
Options: "No impact" | "Had to leave work or meeting" | "Caused me to be late" | "Cancelled or modified plans" | "Multiple urgent trips at work" | "Socially disruptive gas or odor" | "Travel disrupted"

---

### Q10. MEDICATIONS / MANAGEMENT — always shown

Label: "MEDICATIONS / MANAGEMENT"
Sub-label: "Select all that apply" — 11px muted
Wrap in 2-column grid: "None" | "Imodium" | "Fiber supplement" | "Dairy avoidance" | "Other dietary restriction"

---

### Q11. NOTES — always shown, optional

Label: "NOTES (OPTIONAL)"
Textarea: min-height 80px, background var(--bg-input), border 1px solid var(--border), border-radius 8px, padding 12px, font-size 16px, width 100%, color var(--text-primary)
Placeholder: "Any other details..."
Focus: border-color var(--border-active), outline none

---

### Qualifying Symptom Counter — above Save button

Live counter card. Updates every time any pill selection changes.

Card: var(--bg-card), border var(--border), border-radius 10px, padding 14px

Label: "QUALIFYING SYMPTOMS THIS EPISODE" — 11px var(--font-mono) uppercase var(--text-secondary)

Progress bar: same style as pace tracker bar, height 6px
- Count / 6, fill color: green if >= 2, yellow if 1, var(--text-muted) if 0

Below bar: "{count} of 6 qualifying symptoms"
Font: 13px var(--font-mono)
Color: green if >= 2, yellow if 1, muted if 0

Status text:
- >= 2: "✓ This episode counts toward your VA rating"  — var(--green) 12px
- 1: "Need 1 more qualifying symptom to count" — var(--yellow) 12px
- 0: "No qualifying symptoms selected yet" — var(--text-muted) 12px

Qualifying symptom logic (must match ratingEngine.js exactly):
1. stoolType !== "Normal/formed" && stoolType !== "No BM today" && stoolType is not null
2. urgency !== "No urgency" && urgency is not null
3. straining !== "No straining" && straining is not null
4. mucus === "Yes — mucus present"
5. bloating !== "None" && bloating is not null
6. distension === "Yes — noticeable swelling"

Note: for constipation days, urgency and straining are null (hidden), so they do not count.

---

### Save Button and Validation

Full-width, 52px height, border-radius 10px:
```
background: var(--blue)
color: white
font-size: 16px
font-weight: 600
font-family: var(--font-mono)
text-transform: uppercase
letter-spacing: 0.06em
```
Label: "SAVE EPISODE"

Validation before save: all required visible fields must be answered. If not, show inline error directly above save button: "Please answer all required questions" — 13px var(--red), padding 8px 0.

On valid save:
1. crypto.randomUUID() for id
2. new Date().toISOString() for ts
3. Call saveEntry(entry)
4. Show success toast (see below)
5. Navigate to Home after 2 seconds

Success toast:
```
position: fixed
bottom: calc(80px + env(safe-area-inset-bottom) + 12px)
left: 50%
transform: translateX(-50%)
background: var(--green-dim)
border: 1px solid var(--green)
color: var(--green)
padding: 10px 24px
border-radius: 24px
font-size: 14px
font-family: var(--font-mono)
z-index: 100
white-space: nowrap
```
Content: "✓ Episode saved"
Animation: fade in over 0.2s, hold 1.6s, fade out over 0.2s. Use React state + setTimeout.

---

## SCREEN 3 — HISTORY (src/pages/History.jsx)

### Page Header

"HISTORY" — 18px var(--font-mono) uppercase
"Last 90 days" — 13px var(--font-body) var(--text-muted)

### Entry Groups

Filter to last 90 days. Group by local calendar date. Newest date first.

Date header row:
"Tuesday, April 14, 2026" left — 13px var(--font-body) var(--text-secondary)
"3 episodes" right — 13px var(--font-mono) var(--text-muted)
Full-width 1px border below in var(--border)
Margin-bottom 8px

Entry card (var(--bg-card), border var(--border), border-radius 10px, padding 14px, margin-bottom 8px):

Top row: time left (13px var(--font-mono) var(--text-muted)) + pain badge right

Pain badge (small pill, 11px var(--font-mono) uppercase, padding 3px 8px, border-radius 4px):
- None: var(--bg-input) bg, var(--text-muted) text
- Mild: var(--yellow-bg) bg, var(--yellow) text
- Moderate: #431407 bg, #f97316 text
- Severe: var(--red-bg) bg, var(--red) text

Row 2: stool type + urgency — 13px var(--font-body) var(--text-secondary) separated by " · "
If constipation day: show "No BM today" in var(--yellow-dim) instead

Small badges row (margin-top 6px, flex wrap, gap 4px):
Small pills (10px var(--font-mono), padding 2px 6px, var(--bg-input), var(--border) border, border-radius 4px):
- "Bloating" if bloating not None
- "Mucus" if mucus yes
- "Distension" if distension yes
- Each functional impact item (if not "No impact") as yellow-dim badge

Notes (margin-top 6px, if present): 13px italic var(--text-muted) — truncate at 80 chars with ellipsis

Constipation day card: add border-left 2px solid var(--yellow-dim)

### Empty State

Single centered card:
"NO ENTRIES YET" — 13px var(--font-mono) uppercase var(--text-muted)
"Your logged episodes will appear here." — 14px var(--font-body)
"Log First Episode" button — blue text link style, navigates to /log

---

## SCREEN 4 — SUMMARY (src/pages/Summary.jsx)

### Page Header

"SUMMARY" — 18px var(--font-mono) uppercase
"90-Day Report" — 13px var(--font-body) var(--text-muted)

### Section: VA Rating Criteria Status

Label: "VA RATING CRITERIA — DC 7319" — 12px var(--font-mono) uppercase var(--text-secondary)

Render as a table card (var(--bg-card), border var(--border), border-radius 12px, overflow hidden):

Four columns: Rating | Requirement | Your Data | Status

Rows:
- 30% | Pain >= 1x/week (13 days) | {painDays} days | Met or Not yet
- 20% | Pain >= 3x/month (9 days) | {painDays} days | Met or Not yet
- 10% | Pain >= 1 time (1 day) | {painDays} days | Met or Not yet

Row style: padding 12px 16px, border-bottom 1px solid var(--border)
Met rows: green checkmark "✓ Met" in var(--green)
Not yet rows: "○ Not yet" in var(--text-muted)
Highest currently-met row: background var(--blue-dim), border-left 3px solid var(--blue)

### Section: 90-Day Stats Grid

Label: "90-DAY STATS" — 12px var(--font-mono) uppercase

2x3 grid of stat mini-cards (same style as Home stats row):
1. Total Episodes
2. Days Logged
3. Pain Days
4. Qualifying Days (2+ symptoms)
5. Pain Days/Week Avg (X.X — monospaced)
6. Most Common Stool (short text label)

### Section: Current Rating

Same badge as Home screen, centered. 48px monospaced percentage.

### Section: Export

Full-width button, 52px height, border-radius 10px:
```
background: transparent
border: 1px solid var(--border-active)
color: var(--blue-light)
font-family: var(--font-mono)
font-size: 15px
text-transform: uppercase
letter-spacing: 0.06em
```
Label: "↓ EXPORT LOG TO CSV"

Disclaimer (margin-top 12px): "This log is intended to support a VA disability claim. Present this export to your VSO. Actual VA rating is determined at a C&P exam, not by this app." — 12px var(--text-muted) centered

### Empty State (no entries)

Replace all sections with: "No data yet. Start logging to see your summary." centered, muted, with Log button.

---

## DATA STORAGE — src/storage.js

localStorage keys:
- ibs_log_entries — JSON array of entry objects, newest first
- ibs_last_log_time — ISO timestamp string of most recent save

Cap at 500 entries on save. If length > 500, slice to 500 (keep newest).

Entry schema:
```json
{
  "id": "uuid-string",
  "ts": "2026-04-14T14:32:00.000Z",
  "episodeNum": "2nd",
  "pain": "Moderate (4-6)",
  "urgency": "Severe — could not wait",
  "stoolType": "Watery/explosive",
  "straining": "Mild straining",
  "bloating": "Moderate",
  "distension": "No",
  "mucus": "No",
  "meds": ["Imodium"],
  "impact": ["Had to leave work or meeting"],
  "notes": "",
  "isConstipationDay": false
}
```

Constipation day entry:
```json
{
  "id": "uuid-string",
  "ts": "2026-04-14T20:00:00.000Z",
  "episodeNum": "Constipation/No BM",
  "pain": "None",
  "urgency": "No urgency",
  "stoolType": "No BM today",
  "straining": "No straining",
  "bloating": "Moderate",
  "distension": "No",
  "mucus": "No",
  "meds": [],
  "impact": [],
  "notes": "",
  "isConstipationDay": true
}
```

Export these functions:
- getEntries() — returns array or []
- saveEntry(entry) — prepend to array, update ibs_last_log_time, cap at 500, write back
- getLastLogTime() — returns ISO string or null
- clearAll() — removes both keys (do not expose in UI)

---

## RATING ENGINE — src/ratingEngine.js

All pure functions. No side effects. No storage calls.

### getQualifyingSymptomCount(entry)

Returns integer 0-6:
1. entry.stoolType !== "Normal/formed" && entry.stoolType !== "No BM today" && entry.stoolType !== null && entry.stoolType !== undefined
2. entry.urgency !== "No urgency" && entry.urgency !== null && entry.urgency !== undefined
3. entry.straining !== "No straining" && entry.straining !== null && entry.straining !== undefined
4. entry.mucus === "Yes — mucus present"
5. entry.bloating !== "None" && entry.bloating !== null && entry.bloating !== undefined
6. entry.distension === "Yes — noticeable swelling"

Count each true condition, return total.

### filterTo90Days(entries)

Returns entries where ts is within the last 90 calendar days from today (today = day 1, day 90 = 89 days ago at start of that day).

### groupByDate(entries)

Groups entries by local calendar date string (e.g. "4/14/2026"). Returns object keyed by date string.

### calculateCurrentRating(entries)

1. Filter to 90 days
2. Group by date
3. painDays = count of dates where any entry has pain !== "None"
4. qualifyingDays = count of dates where any entry has getQualifyingSymptomCount() >= 2
5. Return:
   - painDays >= 13 && qualifyingDays >= 13 → { rating: 30, painDays, qualifyingDays }
   - painDays >= 9 && qualifyingDays >= 9 → { rating: 20, painDays, qualifyingDays }
   - painDays >= 1 && qualifyingDays >= 1 → { rating: 10, painDays, qualifyingDays }
   - else → { rating: 0, painDays, qualifyingDays }

### calculatePaceStatus(entries)

1. Filter to 90 days → windowEntries
2. painDaysLogged = count of distinct local calendar dates in windowEntries with pain !== "None"
3. targetPainDays = 13
4. Find earliest entry date in windowEntries. daysElapsed = calendar days from that date to today inclusive. Cap at 90. If no entries, daysElapsed = 0.
5. daysRemaining = 90 - daysElapsed
6. painDaysNeeded = Math.max(0, targetPainDays - painDaysLogged)
7. paceRequired = daysRemaining > 0 ? painDaysNeeded / daysRemaining : (painDaysLogged >= 13 ? 0 : 999)

Status and message:
- painDaysLogged >= 13 → status: "green", message: "30% threshold met. Keep logging to maintain your record."
- daysRemaining === 0 && painDaysLogged < 13 → status: "red", message: "90-day window complete. Export your log and share with your VSO."
- daysElapsed <= 7 → status: "green", message: "Early in your log. Keep logging daily — you are building your case."
- paceRequired <= 0.5 → status: "green", message: "On pace for 30%. " + painDaysLogged + " of 13 pain days logged, " + daysRemaining + " days left."
- paceRequired <= 0.85 → status: "yellow", message: "Getting tight. You need pain logged most of the next " + daysRemaining + " days to reach 30%."
- paceRequired > 0.85 → status: "red", message: "30% threshold is very unlikely this window. Log consistently for 20% evidence instead."

Return: { status, painDaysLogged, targetPainDays: 13, daysRemaining, daysElapsed, painDaysNeeded, paceRequired, message }

---

## CSV EXPORT

Filename: IBS_Log_ + MM-DD-YYYY using today's local date + .csv

Header row:
Date,Time,Episode #,Pain Level,Urgency,Stool Type,Straining,Bloating,Distension,Mucus,Functional Impact,Medications,Notes

Per entry row:
- Date: MM/DD/YYYY from entry.ts interpreted as local time
- Time: hh:mm AM/PM from entry.ts local time (12-hour, zero-padded hours)
- Episode #: entry.episodeNum
- Pain Level: entry.pain
- Urgency: entry.urgency
- Stool Type: entry.stoolType
- Straining: entry.straining
- Bloating: entry.bloating
- Distension: entry.distension
- Mucus: entry.mucus
- Functional Impact: entry.impact.join(";") — no spaces after semicolons
- Medications: entry.meds.join(";")
- Notes: always wrapped in double quotes. Escape internal double-quotes by doubling them.

Generate via: new Blob([rows.join("\n")], { type: "text/csv" }) → URL.createObjectURL() → programmatic anchor click → URL.revokeObjectURL()

---

## PWA CONFIGURATION

### public/manifest.json
```json
{
  "name": "IBS VA Tracker",
  "short_name": "IBS Log",
  "description": "VA disability symptom log for IBS — DC 7319",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#080f1a",
  "theme_color": "#080f1a",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### public/sw.js
```js
const CACHE = 'ibs-tracker-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
    )
  );
});
```

### index.html required head tags
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="theme-color" content="#080f1a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="IBS Log">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="manifest" href="/manifest.json">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

### src/main.jsx service worker registration
```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

### Icon generation

Create a script scripts/generate-icons.mjs that uses the canvas npm package to generate icon-192.png and icon-512.png with:
- Background: #080f1a (fill entire canvas)
- A rounded rectangle inset 10% on each side, fill #1a4a7a, corner radius 15% of canvas width
- Centered white text "IBS" in bold sans-serif, sized at 30% of canvas width
- Below that, smaller text "VA" in #5ba3e8, sized at 15% of canvas width
Save both files to public/. Run this script as part of setup before vite build.
Add "generate-icons": "node scripts/generate-icons.mjs" to package.json scripts.

---

## ROUTING

React Router v6. BrowserRouter in main.jsx. Routes in App.jsx:
- / → Home
- /log → Log
- /history → History
- /summary → Summary

### vercel.json
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## VA RATING CRITERIA — REFERENCE (do not modify any values)

| Rating | Requirement |
|--------|-------------|
| 30% | Pain tied to defecation >= 1 day/week over 90 days + 2+ qualifying symptoms |
| 20% | Pain tied to defecation >= 3 days/month over 90 days + 2+ qualifying symptoms |
| 10% | Pain tied to defecation >= 1 time in 90 days + 2+ qualifying symptoms |
| 0% | Does not meet above |

Qualifying symptoms: abnormal stool type, urgency, straining, mucus, bloating, distension.

---

## CRITICAL DEVELOPER RULES

1. Every question maps to VA regulatory criteria. Do not rename, simplify, or remove any question or answer option. Exact wording is required.

2. No entries are editable or deletable after save. This preserves log integrity for the VA claim.

3. No data leaves the device. No external calls, no analytics, no error reporting, no fetch calls of any kind.

4. Pain = "None" entries do NOT count toward painDays in the rating engine even if other symptoms are present. Per DC 7319, pain must be tied to defecation.

5. The 90-day window is rolling — always the 90 days ending today. Recalculate on every render of Home and Summary.

6. iOS safe area insets are required. Use env(safe-area-inset-bottom) on bottom nav, floating button, and toast. Without this, elements are hidden behind the iPhone home indicator.

7. All input and textarea elements must use font-size 16px minimum. iOS Safari auto-zooms on any input with font-size below 16px. This is a hard requirement.

8. The qualifying symptom live counter on the Log form is required UX — not optional. Veterans need real-time feedback on whether an episode counts.

9. Monospaced font (IBM Plex Mono) must be used for all numbers, percentages, ratings, stat counts, and the pace tracker display. No exceptions.

10. All empty states must be implemented for every screen. Do not render zero stats that look broken.

11. The pace tracker is the most important UI element in the entire app. It must be visually dominant, accurate, and clearly communicate whether the veteran is on track for a 30% rating.

---

## DEPLOYMENT STEPS

1. npm install
2. npm run generate-icons
3. git init && git add . && git commit -m "Initial build — IBS VA Tracker v1.0"
4. Create GitHub repo ibs-tracker under jelipeterson-lgtm
5. git remote add origin https://github.com/jelipeterson-lgtm/ibs-tracker.git && git push -u origin main
6. Go to vercel.com/dashboard → New Project → Import ibs-tracker → Deploy
7. No environment variables needed

Post-deploy verification checklist:
- App loads on iPhone Safari at Vercel URL
- Add to Home Screen works and opens in standalone mode (no Safari chrome)
- Log form saves and entry appears in History
- Pace tracker shows green on Home after saving entry with pain level not None
- Qualifying symptom counter updates live on Log form
- CSV export downloads and opens in Excel with correct columns
- App works in airplane mode after first load
- Bottom nav not hidden behind iPhone home indicator
- No iOS auto-zoom on any input field tap
- IBM Plex Mono renders on all numbers and stat cards
