// ============================================
// LOOKSMAXXING MODULE v2.3 (RPG x Elite Masculine)
// IMPROVEMENT #2: STREAK SYSTEM (Routines + Jaw/Neck)
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
    if (streak.lastDate === yesterday) {
      streak.count += 1;
    } else {
      streak.count = 1;
    }
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
    if (streak.lastDate === yesterday) {
      streak.count += 1;
    } else {
      streak.count = 1;
    }
    streak.lastDate = today;
  }
}

// ---------- MAIN RENDER ----------
function renderLooksMaxxing() {
  const container = document.getElementById("looksMaxxingContainer");
  if (!container) return;

  container.innerHTML = `
    <h2>💎 LooksMaxxing RPG System</h2>

    <div class="habit-section">
      <div class="section-title">🦷 Jaw & Neck Training</div>
      ${renderJawNeck()}
    </div>

    <div class="habit-section">
      <div class="section-title">✨ Routines</div>
      <div id="routinesGrid"></div>
    </div>
  `;

  renderRoutinesGrid();
}

// ---------- JAW & NECK ----------
function renderJawNeck() {
  const today = getTodayKey();
  const log = looksData.jawNeckLogs[today] || { jaw: false, neck: false };
  const jawStreak = looksData.streaks.jaw.count;
  const neckStreak = looksData.streaks.neck.count;

  return `
    <div style="display:grid; gap:8px;">
      <div onclick="toggleJawNeck('jaw')" style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.05);cursor:pointer;">
        🦷 Jaw Training ${log.jaw ? "✅" : "○"}
        ${jawStreak ? `<div style="font-size:0.9rem;color:#F59E0B;">🔥 ${jawStreak}-day streak</div>` : ""}
      </div>
      <div onclick="toggleJawNeck('neck')" style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.05);cursor:pointer;">
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
      <div style="margin-bottom:12px;">
        <div style="font-weight:700;margin-bottom:6px;">${cat}</div>
        ${routines.map(r => {
          const done = r.lastDone === today;
          const streak = looksData.streaks.routines[r.id]?.count || 0;
          return `
            <div onclick="markRoutineDone('${r.id}')" style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.05);cursor:pointer;margin-bottom:6px;">
              <strong>${r.name}</strong> ${done ? "✅" : ""}
              ${streak ? `<div style="font-size:0.85rem;color:#F59E0B;">🔥 ${streak}-day streak</div>` : ""}
            </div>
          `;
        }).join("")}
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
(function bootLooksMaxxing() {
  initLooksMaxxing();
  renderLooksMaxxing();
})();
