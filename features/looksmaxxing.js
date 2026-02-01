// ============================================
// LOOKSMAXXING MODULE v3.0 (RPG x Elite Masculine)


let looksData = {
  routines: [],
  measurements: [],
  photos: [],
  goals: [],
  checkIns: [],
  weightLogs: [],
  jawNeckLogs: {},
  streaks: {
    routines: {},
    jaw: { count: 0, lastDate: null },
    neck: { count: 0, lastDate: null }
  },
  settings: {
    mode: "bulk" // bulk | cut | maintain
  },
  meta: {
    lastActiveDate: null,
    lastWeeklySummaryDate: null,
    ui: {
      forceExpanded: false
    }
  }
};

// ---------- INIT ----------
function initLooksMaxxing() {
  const saved = localStorage.getItem("looksMaxxingData");
  if (saved) {
    try {
      looksData = JSON.parse(saved) || looksData;
    } catch {}
  }

  // SAFETY GUARDS (do not crash, stay backward compatible)
  if (!looksData) looksData = {};
  if (!looksData.routines) looksData.routines = [];
  if (!looksData.measurements) looksData.measurements = [];
  if (!looksData.photos) looksData.photos = [];
  if (!looksData.goals) looksData.goals = [];
  if (!looksData.checkIns) looksData.checkIns = [];
  if (!looksData.weightLogs) looksData.weightLogs = [];
  if (!looksData.jawNeckLogs) looksData.jawNeckLogs = {};

  if (!looksData.streaks) looksData.streaks = {};
  if (!looksData.streaks.routines) looksData.streaks.routines = {};
  if (!looksData.streaks.jaw) looksData.streaks.jaw = { count: 0, lastDate: null };
  if (!looksData.streaks.neck) looksData.streaks.neck = { count: 0, lastDate: null };

  if (!looksData.settings) looksData.settings = {};
  if (!looksData.settings.mode) looksData.settings.mode = "bulk";

  if (!looksData.meta) looksData.meta = {};
  if (!looksData.meta.lastActiveDate) looksData.meta.lastActiveDate = null;
  if (!looksData.meta.lastWeeklySummaryDate) looksData.meta.lastWeeklySummaryDate = null;
  if (!looksData.meta.ui) looksData.meta.ui = {};
  if (typeof looksData.meta.ui.forceExpanded !== "boolean") looksData.meta.ui.forceExpanded = false;

  // defaults
  if (looksData.routines.length === 0) {
    looksData.routines = [
      { id: "skincare_am", category: "Face", name: "Morning Skincare", frequency: "daily", lastDone: null },
      { id: "skincare_pm", category: "Face", name: "Night Skincare", frequency: "daily", lastDone: null },
      { id: "haircut", category: "Style", name: "Haircut", frequency: "monthly", lastDone: null },
      { id: "beard", category: "Style", name: "Beard Trim", frequency: "weekly", lastDone: null },
      { id: "posture", category: "Body", name: "Posture Check", frequency: "daily", lastDone: null },
      { id: "workout", category: "Body", name: "Workout", frequency: "daily", lastDone: null }
    ];
    saveLooksData();
  }
}

function saveLooksData() {
  localStorage.setItem("looksMaxxingData", JSON.stringify(looksData));
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function addDaysKey(baseKey, deltaDays) {
  const d = new Date(baseKey + "T00:00:00");
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().split("T")[0];
}

function getYesterdayKey() {
  return addDaysKey(getTodayKey(), -1);
}

function daysBetweenKeys(aKey, bKey) {
  // absolute day difference between YYYY-MM-DD
  const a = new Date(aKey + "T00:00:00");
  const b = new Date(bKey + "T00:00:00");
  const ms = Math.abs(b - a);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function markActive() {
  looksData.meta.lastActiveDate = getTodayKey();
  saveLooksData();
}

// ---------- SANITIZE ----------
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ---------- STREAK HELPERS ----------
function updateRoutineStreak(routineId, completed) {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  const streak = looksData.streaks.routines[routineId] || { count: 0, lastDate: null };

  if (!completed) {
    streak.count = 0;
    streak.lastDate = null;
  } else {
    if (streak.lastDate === yesterday) streak.count += 1;
    else streak.count = 1;
    streak.lastDate = today;
  }

  looksData.streaks.routines[routineId] = streak;
}

function updateJawNeckStreak(type, completed) {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  const streak = looksData.streaks[type];

  if (!completed) {
    streak.count = 0;
    streak.lastDate = null;
  } else {
    if (streak.lastDate === yesterday) streak.count += 1;
    else streak.count = 1;
    streak.lastDate = today;
  }
}

// ---------- DAILY COMPLETION (for explanations + missed-day detection) ----------
function getDayCompletion(dayKey) {
  const routines = looksData.routines || [];
  const totalRoutines = routines.length || 1;
  const doneRoutines = routines.filter(r => r && r.lastDone === dayKey).length;

  const jawNeck = looksData.jawNeckLogs[dayKey] || { jaw: false, neck: false };
  const jawNeckDone = (jawNeck.jaw ? 1 : 0) + (jawNeck.neck ? 1 : 0);
  const jawNeckTotal = 2;

  const weightLogged = (looksData.weightLogs || []).some(w => w && w.date === dayKey) ? 1 : 0;
  const weightTotal = 1;

  const total = totalRoutines + jawNeckTotal + weightTotal;
  const done = doneRoutines + jawNeckDone + weightLogged;

  const percent = Math.round((done / total) * 100);
  return {
    percent,
    doneRoutines,
    totalRoutines,
    jawDone: !!jawNeck.jaw,
    neckDone: !!jawNeck.neck,
    weightLogged: !!weightLogged
  };
}

// ---------- MODE-AWARE WEIGHT TREND ----------
function getWeightTrendModeAware() {
  const mode = looksData.settings.mode || "bulk";
  const logs = (looksData.weightLogs || []).slice(-7);
  if (logs.length < 2) return { status: "Not enough data", delta: 0, mode };

  const first = logs[0].weight;
  const last = logs[logs.length - 1].weight;
  const delta = +(last - first).toFixed(1);

  // Thresholds kept conservative (signal, not noise)
  const goodUp = delta > 0.5;
  const flat = delta >= -0.5 && delta <= 0.5;
  const goodDown = delta < -0.5;

  let status = "Stalled";

  if (mode === "bulk") {
    status = goodUp ? "On Track" : goodDown ? "Off Track" : "Stalled";
  } else if (mode === "cut") {
    status = goodDown ? "On Track" : goodUp ? "Off Track" : "Stalled";
  } else {
    // maintain
    status = flat ? "On Track" : (goodUp || goodDown) ? "Off Track" : "Stalled";
  }

  return { status, delta, mode };
}

// ---------- RPG STATS ----------
function calculateLooksStats() {
  const today = getTodayKey();

  const routines = looksData.routines || [];
  const routineDone = routines.filter(r => r && r.lastDone === today).length;
  const routineTotal = routines.length || 1;
  const routineScore = Math.round((routineDone / routineTotal) * 100);

  const todayJawData = looksData.jawNeckLogs[today] || { jaw: false, neck: false };
  const jawDone = todayJawData.jaw ? 1 : 0;
  const neckDone = todayJawData.neck ? 1 : 0;
  const jawScore = Math.round(((jawDone + neckDone) / 2) * 100);

  const trend = getWeightTrendModeAware();

  // Body score is mostly trend + consistency
  let bodyScore = 50;
  if (trend.status === "On Track") bodyScore = 80;
  if (trend.status === "Off Track") bodyScore = 30;

  const face = Math.min(100, Math.round((routineScore + jawScore) / 2));
  const body = Math.min(100, Math.round((bodyScore + routineScore) / 2));
  const style = Math.min(100, routineScore);
  const discipline = Math.min(100, Math.round((routineScore + bodyScore) / 2));
  const aura = Math.min(100, Math.round((face + body + discipline) / 3));
  const looksScore = Math.round((face + body + style + discipline + aura) / 5);

  return { face, body, style, discipline, aura, looksScore, routineScore, jawScore, trend };
}

// ---------- CONFIDENCE INDEX ----------
function getConfidenceIndex() {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  const t = getDayCompletion(today).percent;
  const y = getDayCompletion(yesterday).percent;

  const routineStreaks = Object.values(looksData.streaks.routines || []).map(s => s?.count || 0);
  const bestRoutineStreak = routineStreaks.length ? Math.max(...routineStreaks) : 0;

  const jawStreak = looksData.streaks.jaw?.count || 0;
  const neckStreak = looksData.streaks.neck?.count || 0;

  // Composite (0-100-ish)
  const streakPower = Math.min(40, (bestRoutineStreak * 3) + (jawStreak * 2) + (neckStreak * 2));
  const adherencePower = Math.min(60, Math.round((t / 100) * 60));
  const score = Math.min(100, streakPower + adherencePower);

  // Direction
  let direction = "Stable";
  if (t > y + 10) direction = "Rising";
  if (t < y - 10) direction = "Dropping";

  return { score, direction, todayPercent: t, yesterdayPercent: y };
}

// ---------- ARCHETYPE MODE ----------
function getArchetype() {
  // based on last 14 days adherence + streaks
  const today = getTodayKey();
  const days = [];
  for (let i = 0; i < 14; i++) days.push(addDaysKey(today, -i));

  const percents = days.map(k => getDayCompletion(k).percent);
  const avg = Math.round(percents.reduce((a, b) => a + b, 0) / percents.length);

  const routineStreaks = Object.values(looksData.streaks.routines || []).map(s => s?.count || 0);
  const bestStreak = routineStreaks.length ? Math.max(...routineStreaks) : 0;

  // Identify recent “comeback”
  const last3 = percents.slice(0, 3);
  const prev3 = percents.slice(3, 6);
  const comeback = (last3.reduce((a, b) => a + b, 0) / 3) - (prev3.reduce((a, b) => a + b, 0) / 3);

  if (avg >= 75 && bestStreak >= 4) return "The Disciplined";
  if (comeback >= 15) return "The Resurgent";
  if (avg >= 55) return "The Builder";
  return "The Inconsistent";
}

// ---------- WEEKLY CHECK-INS ----------
function getThisWeekCheckIns() {
  if (!looksData.checkIns) return 0;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return looksData.checkIns.filter(c => new Date(c.date) >= weekAgo).length;
}

function isWeeklySummaryDue() {
  const today = getTodayKey();
  const last = looksData.meta.lastWeeklySummaryDate;
  if (!last) return true;
  return daysBetweenKeys(last, today) >= 7;
}

function generateWeeklyIdentitySummary() {
  const today = getTodayKey();
  const days = [];
  for (let i = 0; i < 7; i++) days.push(addDaysKey(today, -i));

  const completion = days.map(k => getDayCompletion(k).percent);
  const avg = Math.round(completion.reduce((a, b) => a + b, 0) / completion.length);

  const routinesHit = days.reduce((acc, k) => acc + (looksData.routines || []).filter(r => r && r.lastDone === k).length, 0);
  const jawHits = days.reduce((acc, k) => acc + ((looksData.jawNeckLogs[k]?.jaw) ? 1 : 0), 0);
  const neckHits = days.reduce((acc, k) => acc + ((looksData.jawNeckLogs[k]?.neck) ? 1 : 0), 0);
  const weightHits = days.reduce((acc, k) => acc + ((looksData.weightLogs || []).some(w => w && w.date === k) ? 1 : 0), 0);

  const archetype = getArchetype();

  const bullets = [
    `Average adherence: ${avg}%`,
    `Routines completed: ${routinesHit}`,
    `Jaw sessions: ${jawHits} · Neck sessions: ${neckHits}`,
    `Weight logs: ${weightHits}`,
    `Identity this week: ${archetype}`
  ];

  return bullets;
}

function logWeeklyCheckIn() {
  const today = getTodayKey();
  const summary = generateWeeklyIdentitySummary();

  looksData.checkIns = looksData.checkIns || [];
  looksData.checkIns.push({ date: today, summary });

  looksData.meta.lastWeeklySummaryDate = today;
  markActive();
  saveLooksData();
  renderLooksMaxxing();
}

// ---------- HEAT METER (last 7 days) ----------
function heat(count, max) {
  const n = Math.max(0, Math.min(max, count));
  if (n === 0) return "—";
  return "🔥".repeat(n);
}

function getHeatMeter() {
  const today = getTodayKey();
  const days = [];
  for (let i = 0; i < 7; i++) days.push(addDaysKey(today, -i));

  // Face: Face category routines done (count)
  const faceDone = days.reduce((acc, k) => {
    return acc + (looksData.routines || []).filter(r => r && r.category === "Face" && r.lastDone === k).length;
  }, 0);

  // Body: Body category routines + weight logs
  const bodyDone = days.reduce((acc, k) => {
    const bodyR = (looksData.routines || []).filter(r => r && r.category === "Body" && r.lastDone === k).length;
    const w = (looksData.weightLogs || []).some(x => x && x.date === k) ? 1 : 0;
    return acc + bodyR + w;
  }, 0);

  // Style: Style routines
  const styleDone = days.reduce((acc, k) => {
    return acc + (looksData.routines || []).filter(r => r && r.category === "Style" && r.lastDone === k).length;
  }, 0);

  // Discipline: total completion average converted to 0..5 flames
  const avg = Math.round(days.map(k => getDayCompletion(k).percent).reduce((a, b) => a + b, 0) / 7);
  const disciplineFlames = Math.max(0, Math.min(5, Math.round(avg / 20)));

  // Convert raw counts to 0..5 flames (cap)
  return {
    face: heat(Math.min(5, Math.round(faceDone / 3)), 5),
    body: heat(Math.min(5, Math.round(bodyDone / 4)), 5),
    style: heat(Math.min(5, Math.round(styleDone / 2)), 5),
    discipline: heat(disciplineFlames, 5)
  };
}

// ---------- 30-DAY NARRATIVE ----------
function getThirtyDayNarrative() {
  const today = getTodayKey();

  // Need at least 10 days of meaningful data to avoid garbage output
  const days = [];
  for (let i = 0; i < 30; i++) days.push(addDaysKey(today, -i));

  const percents = days.map(k => getDayCompletion(k).percent);
  const dataPoints = percents.filter(p => p > 0).length;

  if (dataPoints < 10) return null;

  const avg = Math.round(percents.reduce((a, b) => a + b, 0) / percents.length);

  // Compare first 10 vs last 10
  const first10 = percents.slice(-10);
  const last10 = percents.slice(0, 10);
  const avgFirst = Math.round(first10.reduce((a, b) => a + b, 0) / first10.length);
  const avgLast = Math.round(last10.reduce((a, b) => a + b, 0) / last10.length);

  const diff = avgLast - avgFirst;
  const direction = diff > 5 ? "up" : diff < -5 ? "down" : "flat";

  return {
    avg,
    avgFirst,
    avgLast,
    diff,
    direction
  };
}

// ---------- MISSED-DAY EXPLANATION ----------
function getMissedDayMessage() {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  const t = getDayCompletion(today).percent;
  const y = getDayCompletion(yesterday).percent;

  if (y === 0) return null; // no baseline
  if (t >= y - 5) return null; // not slipping enough to comment

  return `Momentum dipped today (${t}% vs ${y}% yesterday). Tomorrow’s focus will prioritize the easiest high-leverage wins.`;
}

// ---------- DIFFICULTY SCALING + ONE THING LOCK ----------
function getDifficultyLevel() {
  // based on last 7 days average adherence
  const today = getTodayKey();
  const days = [];
  for (let i = 0; i < 7; i++) days.push(addDaysKey(today, -i));
  const avg = Math.round(days.map(k => getDayCompletion(k).percent).reduce((a, b) => a + b, 0) / 7);

  if (avg >= 75) return "hard";
  if (avg >= 50) return "normal";
  return "easy";
}

function getRoutineCandidates(category, today) {
  return (looksData.routines || [])
    .filter(r => r && r.category === category && r.lastDone !== today)
    .sort((a, b) => {
      const af = a.frequency === "daily" ? 0 : 1;
      const bf = b.frequency === "daily" ? 0 : 1;
      return af - bf;
    });
}

function getTodaysFocus() {
  const today = getTodayKey();
  const difficulty = getDifficultyLevel();

  const jawNeck = looksData.jawNeckLogs[today] || { jaw: false, neck: false };
  const weightLoggedToday = (looksData.weightLogs || []).some(w => w && w.date === today);

  const facePick = getRoutineCandidates("Face", today)[0] || null;
  const bodyPick = getRoutineCandidates("Body", today)[0] || null;

  // Discipline action priority
  const styleCandidates = getRoutineCandidates("Style", today);
  let disciplinePick = null;

  if (!weightLoggedToday) {
    disciplinePick = { type: "weight", label: "Log Body Weight" };
  } else if (!jawNeck.jaw) {
    disciplinePick = { type: "jaw", label: "Jaw Training" };
  } else if (!jawNeck.neck) {
    disciplinePick = { type: "neck", label: "Neck Training" };
  } else if (styleCandidates.length) {
    disciplinePick = { type: "routine", routineId: styleCandidates[0].id, label: styleCandidates[0].name };
  }

  const allRoutinesDone = (looksData.routines || []).every(r => !r || r.lastDone === today);
  const doneEverything = allRoutinesDone && !!jawNeck.jaw && !!jawNeck.neck && weightLoggedToday;

  // One Thing Lock (when struggling)
  const missedMsg = getMissedDayMessage();
  const oneThingLock = (difficulty === "easy") || !!missedMsg;

  if (doneEverything) {
    return {
      difficulty,
      oneThingLock: false,
      items: [
        { label: "Maintain posture + hydration", action: null, done: true, kind: "win" },
        { label: "Get sunlight + 10 min walk", action: null, done: true, kind: "win" },
        { label: "Sleep target: 7–9 hours", action: null, done: true, kind: "win" }
      ]
    };
  }

  const items = [];

  // EASY = emphasize simplest leverage (skin + weight + jaw/neck)
  // HARD = can include extra optional style as bonus if already strong
  if (facePick) {
    items.push({
      label: facePick.name,
      done: facePick.lastDone === today,
      kind: "routine",
      action: () => markRoutineDone(facePick.id)
    });
  } else {
    items.push({ label: "Face routine complete", done: true, kind: "info", action: null });
  }

  if (!oneThingLock) {
    if (bodyPick) {
      items.push({
        label: bodyPick.name,
        done: bodyPick.lastDone === today,
        kind: "routine",
        action: () => markRoutineDone(bodyPick.id)
      });
    } else {
      items.push({ label: "Body routine complete", done: true, kind: "info", action: null });
    }
  } else {
    // One Thing Lock replaces body with a single high-leverage item
    // Choose the most missing, most leverage
    if (!weightLoggedToday) {
      items.push({ label: "Log Body Weight", done: false, kind: "weight", action: () => focusWeightInput() });
    } else if (!jawNeck.jaw) {
      items.push({ label: "Jaw Training", done: false, kind: "jaw", action: () => toggleJawNeck("jaw") });
    } else if (!jawNeck.neck) {
      items.push({ label: "Neck Training", done: false, kind: "neck", action: () => toggleJawNeck("neck") });
    } else if (bodyPick) {
      items.push({ label: bodyPick.name, done: false, kind: "routine", action: () => markRoutineDone(bodyPick.id) });
    } else {
      items.push({ label: "Posture Check", done: true, kind: "info", action: null });
    }
  }

  if (disciplinePick) {
    if (disciplinePick.type === "weight") {
      items.push({
        label: disciplinePick.label,
        done: weightLoggedToday,
        kind: "weight",
        action: () => focusWeightInput()
      });
    } else if (disciplinePick.type === "jaw") {
      items.push({
        label: disciplinePick.label,
        done: !!jawNeck.jaw,
        kind: "jaw",
        action: () => toggleJawNeck("jaw")
      });
    } else if (disciplinePick.type === "neck") {
      items.push({
        label: disciplinePick.label,
        done: !!jawNeck.neck,
        kind: "neck",
        action: () => toggleJawNeck("neck")
      });
    } else if (disciplinePick.type === "routine" && disciplinePick.routineId) {
      items.push({
        label: disciplinePick.label,
        done: false,
        kind: "routine",
        action: () => markRoutineDone(disciplinePick.routineId)
      });
    }
  } else {
    items.push({ label: "Discipline actions complete", done: true, kind: "info", action: null });
  }

  // HARD mode bonus (optional 4th item displayed as “Bonus”)
  let bonus = null;
  if (difficulty === "hard") {
    const styleLeft = getRoutineCandidates("Style", today);
    if (styleLeft.length) {
      bonus = { label: `Bonus: ${styleLeft[0].name}`, done: false, kind: "routine", action: () => markRoutineDone(styleLeft[0].id) };
    }
  }

  return { difficulty, oneThingLock, items: items.slice(0, 3), bonus };
}

function runLooksFocusAction(index) {
  try {
    const pack = getTodaysFocus();
    const item = pack.items[index];
    if (item && typeof item.action === "function") item.action();
  } catch (e) {
    console.error("Looks focus action error:", e);
  }
}

function runLooksFocusBonus() {
  try {
    const pack = getTodaysFocus();
    if (pack.bonus && typeof pack.bonus.action === "function") pack.bonus.action();
  } catch (e) {
    console.error("Looks bonus action error:", e);
  }
}

// ---------- UI HELPERS ----------
function focusWeightInput() {
  const input = document.getElementById("weightInput");
  if (input) input.focus();
}

function setMode(mode) {
  const allowed = ["bulk", "cut", "maintain"];
  if (!allowed.includes(mode)) return;
  looksData.settings.mode = mode;
  markActive();
  saveLooksData();
  renderLooksMaxxing();
}

function setForceExpanded(v) {
  looksData.meta.ui.forceExpanded = !!v;
  saveLooksData();
  renderLooksMaxxing();
}

// ---------- RENDER: FOCUS ----------
function renderTodaysFocus() {
  const pack = getTodaysFocus();
  const focus = pack.items || [];
  const missedMsg = getMissedDayMessage();

  const rows = focus.map((item, idx) => {
    const done = !!item.done;
    const bg = done ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)";
    const border = done ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.10)";
    const mark = done ? "✅" : "○";
    const cursor = item.action ? "cursor:pointer;" : "cursor:default;";
    const click = item.action ? `onclick="runLooksFocusAction(${idx})"` : "";

    return `
      <div ${click} style="padding:10px; border-radius:12px; background:${bg}; border:${border}; ${cursor} display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; gap:10px; align-items:center;">
          <div style="width:22px; text-align:center; font-weight:900;">${mark}</div>
          <div style="opacity:0.9;">
            <div style="font-weight:800;">${escapeHtml(item.label)}</div>
            <div style="color:#9CA3AF; font-size:0.9rem;">
              ${pack.oneThingLock ? "One Thing Lock" : "Today’s Focus"} · Difficulty: ${pack.difficulty}
            </div>
          </div>
        </div>
        <div style="color:#A78BFA; font-weight:800;">${done ? "COMPLETE" : "DO THIS"}</div>
      </div>
    `;
  }).join("");

  const bonus = pack.bonus
    ? `
      <div onclick="runLooksFocusBonus()" style="padding:10px; border-radius:12px; background:rgba(255,255,255,0.04); border:1px dashed rgba(167,139,250,0.5); cursor:pointer;">
        <div style="font-weight:800; color:#A78BFA;">${escapeHtml(pack.bonus.label)}</div>
        <div style="color:#9CA3AF; font-size:0.9rem;">Optional bonus for momentum</div>
      </div>
    `
    : "";

  const missed = missedMsg
    ? `<div style="margin-top:10px; color:#F59E0B; font-size:0.95rem;">${escapeHtml(missedMsg)}</div>`
    : "";

  return `
    <div class="habit-section" style="margin-bottom:20px;">
      <div class="section-title">🎯 Today’s Focus</div>
      <div style="display:grid; gap:10px;">
        ${rows}
        ${bonus}
      </div>
      <div style="margin-top:10px; color:#9CA3AF; font-size:0.95rem;">
        Win the day by completing these. Consistency beats intensity.
      </div>
      ${missed}
    </div>
  `;
}

// ---------- RENDER: MODE + WEIGHT ----------
function renderModeSelector() {
  const mode = looksData.settings.mode || "bulk";
  return `
    <div style="display:flex; gap:8px; align-items:center; margin-bottom:10px;">
      <div style="color:#9CA3AF; font-weight:700;">Mode</div>
      <select class="form-input" style="width:auto; padding:6px 10px;" onchange="setMode(this.value)">
        <option value="bulk" ${mode === "bulk" ? "selected" : ""}>Bulk</option>
        <option value="cut" ${mode === "cut" ? "selected" : ""}>Cut</option>
        <option value="maintain" ${mode === "maintain" ? "selected" : ""}>Maintain</option>
      </select>
    </div>
  `;
}

function renderWeightHistory() {
  const last = (looksData.weightLogs || []).slice(-5).reverse();
  if (!last.length) return `<div style="color:#9CA3AF;">No weight logs yet.</div>`;
  return last.map(w => `<div>${escapeHtml(w.date)}: <strong>${escapeHtml(w.weight)} lbs</strong></div>`).join("");
}

function logWeight() {
  const input = document.getElementById("weightInput");
  const weight = parseFloat(input?.value);
  if (!weight) return;

  looksData.weightLogs.push({ date: getTodayKey(), weight });
  if (input) input.value = "";

  markActive();
  saveLooksData();
  renderLooksMaxxing();
}

// ---------- RENDER: JAW & NECK ----------
function renderJawNeck() {
  const today = getTodayKey();
  const log = looksData.jawNeckLogs[today] || { jaw: false, neck: false };

  const jawStreak = looksData.streaks.jaw?.count || 0;
  const neckStreak = looksData.streaks.neck?.count || 0;

  return `
    <div style="display:grid; gap:8px;">
      <div onclick="toggleJawNeck('jaw')" style="padding:10px; border-radius:10px; background:${log.jaw ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)'}; cursor:pointer;">
        🦷 Jaw Training ${log.jaw ? "✅" : "○"}
        ${jawStreak ? `<div style="font-size:0.9rem;color:#F59E0B;">🔥 ${jawStreak}-day streak</div>` : ""}
      </div>
      <div onclick="toggleJawNeck('neck')" style="padding:10px; border-radius:10px; background:${log.neck ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)'}; cursor:pointer;">
        💪 Neck Training ${log.neck ? "✅" : "○"}
        ${neckStreak ? `<div style="font-size:0.9rem;color:#F59E0B;">🔥 ${neckStreak}-day streak</div>` : ""}
      </div>
    </div>
  `;
}

function toggleJawNeck(type) {
  const today = getTodayKey();
  if (!looksData.jawNeckLogs[today]) looksData.jawNeckLogs[today] = { jaw: false, neck: false };

  looksData.jawNeckLogs[today][type] = !looksData.jawNeckLogs[today][type];
  updateJawNeckStreak(type, looksData.jawNeckLogs[today][type]);

  markActive();
  saveLooksData();
  renderLooksMaxxing();
}

// ---------- RENDER: ROUTINES ----------
function renderRoutinesGrid() {
  const el = document.getElementById("routinesGrid");
  if (!el) return;

  const today = getTodayKey();
  const categories = [...new Set((looksData.routines || []).map(r => r?.category).filter(Boolean))];

  el.innerHTML = categories.map(cat => {
    const routines = (looksData.routines || []).filter(r => r && r.category === cat);
    return `
      <div style="margin-bottom:12px;">
        <div style="font-weight:700; color:#A78BFA; margin-bottom:6px;">${escapeHtml(cat)}</div>
        ${routines.map(r => {
          const done = r.lastDone === today;
          const streak = looksData.streaks.routines[r.id]?.count || 0;
          return `
            <div onclick="markRoutineDone('${escapeHtml(r.id)}')" style="padding:10px; border-radius:10px; background:${done ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)'}; cursor:pointer; margin-bottom:6px;">
              <strong>${escapeHtml(r.name)}</strong>
              <span style="color:#9CA3AF;">(${escapeHtml(r.frequency)})</span>
              ${done ? "✅" : ""}
              ${streak ? `<div style="font-size:0.85rem;color:#F59E0B;">🔥 ${streak}-day streak</div>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }).join("");
}

function markRoutineDone(id) {
  const r = (looksData.routines || []).find(x => x && x.id === id);
  if (!r) return;

  const today = getTodayKey();
  const completed = r.lastDone !== today;
  r.lastDone = completed ? today : null;

  updateRoutineStreak(id, completed);

  markActive();
  saveLooksData();
  renderLooksMaxxing();
}

// ---------- RENDER: STAT BAR ----------
function renderStatBar(label, value) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return `
    <div style="margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between;">
        <span>${escapeHtml(label)}</span>
        <span style="font-weight:700;">${v}</span>
      </div>
      <div style="height:8px; background:rgba(255,255,255,0.1); border-radius:6px;">
        <div style="height:100%; width:${v}%; background:linear-gradient(90deg,#6366F1,#EC4899); border-radius:6px;"></div>
      </div>
    </div>
  `;
}

// ---------- RENDER: STAT EXPLANATIONS ----------
function renderStatExplanations(stats) {
  const today = getTodayKey();
  const completion = getDayCompletion(today);

  const trend = stats.trend;
  const mode = trend.mode;

  const modeTip =
    mode === "bulk"
      ? "Bulk: aim for slow upward trend."
      : mode === "cut"
      ? "Cut: aim for slow downward trend."
      : "Maintain: aim for stable weight.";

  const explanations = [
    {
      title: "Face",
      text:
        stats.jawScore < 100 || completion.doneRoutines < completion.totalRoutines
          ? "Face dips when skincare routines or jaw/neck work are skipped."
          : "Face is strong because skincare + jaw/neck are consistent.",
      win: "Fastest win: do skincare + jaw/neck today."
    },
    {
      title: "Body",
      text:
        trend.status === "On Track"
          ? `Body improves because your trend matches your mode (${mode}).`
          : trend.status === "Off Track"
          ? `Body suffers because your trend is opposite your mode (${mode}).`
          : "Body is stalled. Your trend is flat.",
      win:
        trend.status === "Stalled"
          ? "Fastest win: adjust calories slightly and log weight consistently."
          : "Fastest win: keep consistency. Don’t change what’s working."
    },
    {
      title: "Discipline",
      text:
        stats.routineScore < 70
          ? "Discipline falls when routines are skipped."
          : "Discipline rises when you keep the chain alive.",
      win: "Fastest win: complete Today’s Focus (3 wins)."
    },
    {
      title: "Aura",
      text: "Aura rises when Face, Body, and Discipline are consistent together.",
      win: "Fastest win: stack simple wins daily."
    }
  ];

  return `
    <div class="habit-section" style="margin-bottom:20px;">
      <div class="section-title">🧠 Why Your Stats Changed</div>
      <div style="color:#9CA3AF; margin-bottom:10px;">${escapeHtml(modeTip)}</div>
      ${explanations
        .map(
          e => `
          <div style="margin-bottom:10px; padding:10px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);">
            <div style="font-weight:900; margin-bottom:6px;">${escapeHtml(e.title)}</div>
            <div style="color:#E5E7EB; margin-bottom:6px;">${escapeHtml(e.text)}</div>
            <div style="color:#A78BFA; font-weight:800;">${escapeHtml(e.win)}</div>
          </div>
        `
        )
        .join("")}
    </div>
  `;
}

// ---------- RENDER: WEEKLY SUMMARY ----------
function renderWeeklySummary() {
  const due = isWeeklySummaryDue();
  const bullets = generateWeeklyIdentitySummary();
  const archetype = getArchetype();

  return `
    <div class="habit-section" style="margin-bottom:20px;">
      <div class="section-title">🧾 Weekly Identity Summary</div>
      <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:10px;">
        <div style="color:${due ? "#F59E0B" : "#22C55E"}; font-weight:900;">
          ${due ? "Weekly Check-in Due" : "Up to date"}
        </div>
        ${due ? `<button class="form-submit" onclick="logWeeklyCheckIn()">Log Weekly Check-in</button>` : ""}
      </div>
      <div style="margin-bottom:8px; color:#9CA3AF;">Archetype: <strong style="color:#E5E7EB;">${escapeHtml(archetype)}</strong></div>
      <ul style="margin:0; padding-left:18px; color:#E5E7EB;">
        ${bullets.map(b => `<li>${escapeHtml(b)}</li>`).join("")}
      </ul>
    </div>
  `;
}

// ---------- RENDER: HEAT + NARRATIVE ----------
function renderHeatAndNarrative() {
  const h = getHeatMeter();
  const narrative = getThirtyDayNarrative();

  const narrativeHtml = !narrative
    ? `<div style="color:#9CA3AF;">Not enough data yet for a 30-day narrative.</div>`
    : `
      <div style="color:#E5E7EB;">
        30-day adherence average: <strong>${narrative.avg}%</strong><br/>
        Last 10 days vs first 10 days: <strong>${narrative.avgLast}%</strong> vs <strong>${narrative.avgFirst}%</strong>
        (${narrative.diff > 0 ? "+" : ""}${narrative.diff}%)
      </div>
    `;

  return `
    <div class="habit-section" style="margin-bottom:20px;">
      <div class="section-title">🔥 Consistency Heat (Last 7 Days)</div>
      <div style="display:flex; gap:12px; flex-wrap:wrap; color:#E5E7EB;">
        <div>Face: <strong>${h.face}</strong></div>
        <div>Body: <strong>${h.body}</strong></div>
        <div>Style: <strong>${h.style}</strong></div>
        <div>Discipline: <strong>${h.discipline}</strong></div>
      </div>
    </div>

    <div class="habit-section" style="margin-bottom:20px;">
      <div class="section-title">📆 30-Day Before/After</div>
      ${narrativeHtml}
    </div>
  `;
}

// ---------- REGRESSION GUARD ----------
function getInactivityDays() {
  const last = looksData.meta.lastActiveDate;
  if (!last) return 0;
  return daysBetweenKeys(last, getTodayKey());
}

function shouldUseCompactView() {
  if (looksData.meta.ui.forceExpanded) return false;
  return getInactivityDays() >= 3;
}

function renderCompactReturnView(stats, confidence) {
  const inactiveDays = getInactivityDays();

  return `
    <div style="margin-bottom:20px;">
      <h2>💎 LooksMaxxing RPG System</h2>
      <div style="color:#9CA3AF;">Welcome back. You were away for ${inactiveDays} days.</div>
    </div>

    ${renderTodaysFocus()}

    <div class="habit-section" style="margin-bottom:20px;">
      <div class="section-title">🧠 Confidence Index</div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-weight:900; font-size:1.4rem;">${confidence.score}</div>
        <div style="color:${confidence.direction === "Rising" ? "#22C55E" : confidence.direction === "Dropping" ? "#EF4444" : "#F59E0B"}; font-weight:900;">
          ${confidence.direction}
        </div>
      </div>
      <div style="color:#9CA3AF;">Today: ${confidence.todayPercent}% · Yesterday: ${confidence.yesterdayPercent}%</div>
      <div style="margin-top:10px;">
        <button class="form-submit" onclick="setForceExpanded(true)">Show Full Dashboard</button>
      </div>
    </div>
  `;
}

// ---------- MAIN RENDER ----------
function renderLooksMaxxing() {
  const container = document.getElementById("looksMaxxingContainer");
  if (!container) return;

  const stats = calculateLooksStats();
  const confidence = getConfidenceIndex();
  const latestWeight = (looksData.weightLogs || []).slice(-1)[0]?.weight || "—";
  const trend = stats.trend;

  // Compact view if user went inactive (silent regression guard)
  if (shouldUseCompactView()) {
    container.innerHTML = renderCompactReturnView(stats, confidence);
    return;
  }

  const archetype = getArchetype();

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <h2>💎 LooksMaxxing RPG System</h2>
      <div style="color:#9CA3AF;">Elite masculine optimization dashboard</div>
    </div>

    ${renderTodaysFocus()}

    <div class="stats-grid" style="margin-bottom:20px;">
      <div class="stat-card">
        <div class="stat-value">${stats.looksScore}</div>
        <div class="stat-label">Looks Score</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${latestWeight}</div>
        <div class="stat-label">Body Weight (lbs)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${getThisWeekCheckIns()}</div>
        <div class="stat-label">Weekly Check-ins</div>
      </div>
    </div>

    <div class="habit-section" style="margin-bottom:20px;">
      <div class="section-title">🧠 Confidence Index</div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-weight:900; font-size:1.4rem;">${confidence.score}</div>
        <div style="color:${confidence.direction === "Rising" ? "#22C55E" : confidence.direction === "Dropping" ? "#EF4444" : "#F59E0B"}; font-weight:900;">
          ${confidence.direction}
        </div>
      </div>
      <div style="color:#9CA3AF;">Today: ${confidence.todayPercent}% · Yesterday: ${confidence.yesterdayPercent}%</div>
      <div style="margin-top:6px; color:#9CA3AF;">Archetype: <strong style="color:#E5E7EB;">${escapeHtml(archetype)}</strong></div>
    </div>

    <div class="habit-section" style="margin-bottom:20px;">
      <div class="section-title">🧬 RPG Character Stats</div>
      ${renderStatBar("Face", stats.face)}
      ${renderStatBar("Body", stats.body)}
      ${renderStatBar("Style", stats.style)}
      ${renderStatBar("Discipline", stats.discipline)}
      ${renderStatBar("Aura", stats.aura)}
    </div>

    <div class="habit-section" style="margin-bottom:20px;">
      <div class="section-title">🏋️ Body Weight Tracker</div>
      ${renderModeSelector()}
      <div style="display:flex; gap:8px; margin-bottom:10px;">
        <input id="weightInput" type="number" placeholder="Enter weight (lbs)" class="form-input"/>
        <button onclick="logWeight()" class="form-submit">Log</button>
      </div>
      <div style="margin-bottom:6px;"><strong>Status:</strong>
        <span style="color:${
          trend.status === "On Track" ? "#22C55E" : trend.status === "Off Track" ? "#EF4444" : "#F59E0B"
        }; font-weight:900;">
          ${escapeHtml(trend.status)}
        </span>
      </div>
      <div style="margin-bottom:8px;"><strong>7-log change:</strong> ${trend.delta > 0 ? "+" : ""}${escapeHtml(trend.delta)} lbs</div>
      <div id="weightHistory">${renderWeightHistory()}</div>
    </div>

    <div class="habit-section" style="margin-bottom:20px;">
      <div class="section-title">🦷 Jawline & Neck Training</div>
      <div id="jawNeckGrid">${renderJawNeck()}</div>
    </div>

    <div class="habit-section" style="margin-bottom:20px;">
      <div class="section-title">✨ Routines</div>
      <div id="routinesGrid"></div>
    </div>

    ${renderStatExplanations(stats)}
    ${renderWeeklySummary()}
    ${renderHeatAndNarrative()}

    <div class="habit-section" style="margin-bottom:20px;">
      <div class="section-title">⚙️ Quick Controls</div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="form-submit" onclick="setForceExpanded(false)">Enable Return Guard</button>
        <button class="form-submit" onclick="setForceExpanded(true)">Force Full View</button>
      </div>
      <div style="margin-top:8px; color:#9CA3AF;">
        Return Guard shows a simplified view if you go inactive for 3+ days.
      </div>
    </div>
  `;

  // routines render after HTML injection
  renderRoutinesGrid();
}

// ---------- BOOT ----------
(function bootLooksMaxxing() {
  try {
    initLooksMaxxing();
    const container = document.getElementById("looksMaxxingContainer");
    if (container) renderLooksMaxxing();
  } catch (e) {
    console.error("LooksMaxxing init failed:", e);
  }
})();

console.log("LooksMaxxing RPG module loaded");
