// ============================================
// LOOKSMAXXING MODULE v2.5 (RPG x Elite Masculine)
// IMPROVEMENT #4: STAT EXPLANATIONS (CAUSE → EFFECT)
// ============================================

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

  if (!looksData.jawNeckLogs) looksData.jawNeckLogs = {};
  if (!looksData.weightLogs) looksData.weightLogs = [];
  if (!looksData.routines) looksData.routines = [];
  if (!looksData.checkIns) looksData.checkIns = [];
  if (!looksData.streaks) looksData.streaks = { routines: {}, jaw: { count: 0 }, neck: { count: 0 } };
  if (!looksData.streaks.routines) looksData.streaks.routines = {};

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

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
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

// ---------- WEIGHT TREND ----------
function getWeightTrend() {
  const logs = looksData.weightLogs.slice(-7);
  if (logs.length < 2) return { status: "Not enough data", delta: 0 };

  const first = logs[0].weight;
  const last = logs[logs.length - 1].weight;
  const delta = +(last - first).toFixed(1);

  let status = "Stalled";
  if (delta > 0.5) status = "On Track";
  if (delta < -0.5) status = "Losing";

  return { status, delta };
}

// ---------- STAT CALC ----------
function calculateLooksStats() {
  const today = getTodayKey();

  const routineDone = looksData.routines.filter(r => r.lastDone === today).length;
  const routineTotal = looksData.routines.length || 1;
  const routineScore = Math.round((routineDone / routineTotal) * 100);

  const todayJaw = looksData.jawNeckLogs[today]?.jaw ? 1 : 0;
  const todayNeck = looksData.jawNeckLogs[today]?.neck ? 1 : 0;
  const jawScore = Math.round(((todayJaw + todayNeck) / 2) * 100);

  const trend = getWeightTrend();
  let bodyScore = trend.status === "On Track" ? 80 : trend.status === "Losing" ? 30 : 50;

  const face = Math.min(100, Math.round((routineScore + jawScore) / 2));
  const body = Math.min(100, Math.round((bodyScore + routineScore) / 2));
  const style = Math.min(100, routineScore);
  const discipline = Math.min(100, Math.round((routineScore + bodyScore) / 2));
  const aura = Math.min(100, Math.round((face + body + discipline) / 3));
  const looksScore = Math.round((face + body + style + discipline + aura) / 5);

  return { face, body, style, discipline, aura, looksScore, routineScore, jawScore, trend };
}

// ---------- STAT EXPLANATIONS ----------
function renderStatExplanations(stats) {
  const explanations = [
    {
      title: "Face",
      text: stats.jawScore < 100
        ? "Face drops when jaw/neck or skincare routines are skipped."
        : "Face is strong due to consistent skincare and jaw/neck work."
    },
    {
      title: "Body",
      text: stats.trend.status === "On Track"
        ? "Body is improving because weight is trending up."
        : stats.trend.status === "Losing"
        ? "Body is dropping because weight is trending down."
        : "Body is stalled. Increase calories or consistency."
    },
    {
      title: "Discipline",
      text: stats.routineScore < 70
        ? "Discipline falls when routines are skipped."
        : "Discipline is high due to routine consistency."
    },
    {
      title: "Aura",
      text: "Aura rises when Face, Body, and Discipline stay consistent together."
    }
  ];

  return `
    <div class="habit-section" style="margin-top:20px;">
      <div class="section-title">🧠 Why Your Stats Changed</div>
      ${explanations.map(e => `
        <div style="margin-bottom:8px;">
          <strong>${e.title}:</strong> ${e.text}
        </div>
      `).join("")}
    </div>
  `;
}

// ---------- MAIN RENDER ----------
function renderLooksMaxxing() {
  const container = document.getElementById("looksMaxxingContainer");
  if (!container) return;

  const stats = calculateLooksStats();
  const latestWeight = looksData.weightLogs.at(-1)?.weight || "—";

  container.innerHTML = `
    <h2>💎 LooksMaxxing RPG System</h2>

    <div class="habit-section">
      <div class="section-title">🏋️ Body Weight Tracker</div>
      <input id="weightInput" type="number" class="form-input" placeholder="Enter weight (lbs)" />
      <button onclick="logWeight()" class="form-submit">Log</button>
      <div>Current: ${latestWeight} lbs</div>
      <div>Status: ${stats.trend.status} (${stats.trend.delta > 0 ? "+" : ""}${stats.trend.delta} lbs)</div>
    </div>

    <div class="habit-section">
      <div class="section-title">🦷 Jaw & Neck Training</div>
      ${renderJawNeck()}
    </div>

    <div class="habit-section">
      <div class="section-title">✨ Routines</div>
      <div id="routinesGrid"></div>
    </div>

    ${renderStatExplanations(stats)}
  `;

  renderRoutinesGrid();
}

// ---------- WEIGHT ----------
function logWeight() {
  const input = document.getElementById("weightInput");
  const weight = parseFloat(input.value);
  if (!weight) return;

  looksData.weightLogs.push({ date: getTodayKey(), weight });
  saveLooksData();
  renderLooksMaxxing();
}

// ---------- JAW & NECK ----------
function renderJawNeck() {
  const today = getTodayKey();
  const log = looksData.jawNeckLogs[today] || { jaw: false, neck: false };
  const jawStreak = looksData.streaks.jaw.count;
  const neckStreak = looksData.streaks.neck.count;

  return `
    <div onclick="toggleJawNeck('jaw')">🦷 Jaw ${log.jaw ? "✅" : "○"} ${jawStreak ? `🔥 ${jawStreak}` : ""}</div>
    <div onclick="toggleJawNeck('neck')">💪 Neck ${log.neck ? "✅" : "○"} ${neckStreak ? `🔥 ${neckStreak}` : ""}</div>
  `;
}

function toggleJawNeck(type) {
  const today = getTodayKey();
  if (!looksData.jawNeckLogs[today]) looksData.jawNeckLogs[today] = { jaw: false, neck: false };
  looksData.jawNeckLogs[today][type] = !looksData.jawNeckLogs[today][type];

  updateJawNeckStreak(type, looksData.jawNeckLogs[today][type]);
  saveLooksData();
  renderLooksMaxxing();
}

// ---------- ROUTINES ----------
function renderRoutinesGrid() {
  const el = document.getElementById("routinesGrid");
  if (!el) return;

  const today = getTodayKey();
  const categories = [...new Set(looksData.routines.map(r => r.category))];

  el.innerHTML = categories.map(cat => {
    const routines = looksData.routines.filter(r => r.category === cat);
    return `
      <div>
        <strong>${cat}</strong>
        ${routines.map(r => `
          <div onclick="markRoutineDone('${r.id}')">
            ${r.name} ${r.lastDone === today ? "✅" : ""}
          </div>
        `).join("")}
      </div>
    `;
  }).join("");
}

function markRoutineDone(id) {
  const r = looksData.routines.find(x => x.id === id);
  if (!r) return;

  const today = getTodayKey();
  const completed = r.lastDone !== today;
  r.lastDone = completed ? today : null;

  updateRoutineStreak(id, completed);
  saveLooksData();
  renderLooksMaxxing();
}

// ---------- BOOT ----------
(function () {
  initLooksMaxxing();
  renderLooksMaxxing();
})();
