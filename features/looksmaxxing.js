// ============================================
// LOOKSMAXXING MODULE v2.2 (RPG x Elite Masculine)
// IMPROVEMENT #1: Daily Command Objective (TODAY'S FOCUS)
// ============================================

let looksData = {
  routines: [],
  measurements: [],
  photos: [],
  goals: [],
  checkIns: [],
  weightLogs: [],
  jawNeckLogs: {}
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
  if (!looksData.goals) looksData.goals = [];
  if (!looksData.checkIns) looksData.checkIns = [];
  if (!looksData.measurements) looksData.measurements = [];
  if (!looksData.photos) looksData.photos = [];

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

// ---------- RPG STAT SYSTEM ----------
function calculateLooksStats() {
  const today = getTodayKey();

  const routineDone = looksData.routines.filter(r => r.lastDone === today).length;
  const routineTotal = looksData.routines.length || 1;
  const routineScore = Math.round((routineDone / routineTotal) * 100);

  const todayJawData = looksData.jawNeckLogs[today] || { jaw: false, neck: false };
  const jawDone = todayJawData.jaw ? 1 : 0;
  const neckDone = todayJawData.neck ? 1 : 0;
  const jawScore = Math.round(((jawDone + neckDone) / 2) * 100);

  const weightTrend = looksData.weightLogs.slice(-7);
  let bodyScore = 50;
  if (weightTrend.length >= 2) {
    const diff = weightTrend[weightTrend.length - 1].weight - weightTrend[0].weight;
    bodyScore = diff > 0 ? 80 : diff === 0 ? 50 : 30;
  }

  const face = Math.min(100, Math.round((routineScore + jawScore) / 2));
  const body = Math.min(100, Math.round((bodyScore + routineScore) / 2));
  const style = Math.min(100, routineScore);
  const discipline = Math.min(100, Math.round((routineScore + bodyScore) / 2));
  const aura = Math.min(100, Math.round((face + body + discipline) / 3));

  const looksScore = Math.round((face + body + style + discipline + aura) / 5);

  return { face, body, style, discipline, aura, looksScore };
}

// ---------- CHECK-INS ----------
function getThisWeekCheckIns() {
  if (!looksData.checkIns) return 0;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return looksData.checkIns.filter(c => new Date(c.date) >= weekAgo).length;
}

// ---------- DAILY FOCUS ----------
function getTodaysFocus() {
  const today = getTodayKey();
  const jawNeck = looksData.jawNeckLogs[today] || { jaw: false, neck: false };
  const weightLogged = looksData.weightLogs.some(w => w.date === today);

  const pick = (cat) =>
    looksData.routines.find(r => r.category === cat && r.lastDone !== today) || null;

  const face = pick("Face");
  const body = pick("Body");

  const focus = [];

  focus.push(face
    ? { label: face.name, done: false, action: () => markRoutineDone(face.id) }
    : { label: "Face routines complete", done: true });

  focus.push(body
    ? { label: body.name, done: false, action: () => markRoutineDone(body.id) }
    : { label: "Body routines complete", done: true });

  if (!weightLogged) {
    focus.push({ label: "Log Body Weight", done: false, action: () => document.getElementById("weightInput")?.focus() });
  } else if (!jawNeck.jaw) {
    focus.push({ label: "Jaw Training", done: false, action: () => toggleJawNeck("jaw") });
  } else if (!jawNeck.neck) {
    focus.push({ label: "Neck Training", done: false, action: () => toggleJawNeck("neck") });
  } else {
    focus.push({ label: "Discipline complete", done: true });
  }

  return focus;
}

function renderTodaysFocus() {
  const focus = getTodaysFocus();

  return `
    <div class="habit-section" style="margin-bottom:20px;">
      <div class="section-title">🎯 Today's Focus</div>
      <div style="display:grid; gap:10px;">
        ${focus.map(f => `
          <div onclick="${f.action ? "("+f.action+")()" : ""}"
               style="padding:10px;border-radius:10px;
               background:${f.done ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)"};
               cursor:${f.action ? "pointer" : "default"};">
            ${f.done ? "✅" : "○"} ${f.label}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ---------- MAIN RENDER ----------
function renderLooksMaxxing() {
  const el = document.getElementById("looksMaxxingContainer");
  if (!el) return;

  const stats = calculateLooksStats();
  const latestWeight = looksData.weightLogs.at(-1)?.weight || "—";

  el.innerHTML = `
    <h2>💎 LooksMaxxing RPG System</h2>
    ${renderTodaysFocus()}
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${stats.looksScore}</div><div class="stat-label">Looks Score</div></div>
      <div class="stat-card"><div class="stat-value">${latestWeight}</div><div class="stat-label">Body Weight</div></div>
      <div class="stat-card"><div class="stat-value">${getThisWeekCheckIns()}</div><div class="stat-label">Weekly Check-ins</div></div>
    </div>
  `;
}

// ---------- BOOT ----------
(function () {
  initLooksMaxxing();
  renderLooksMaxxing();
})();
