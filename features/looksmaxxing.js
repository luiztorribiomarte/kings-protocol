// ============================================
// LOOKSMAXXING MODULE v2 (RPG x Elite Masculine)
// - Adds RPG stats, body weight tracker, jaw/neck tracker
// - Does NOT break existing routines/goals/check-ins
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

  if (!looksData.routines || looksData.routines.length === 0) {
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

  if (!looksData.goals || looksData.goals.length === 0) {
    looksData.goals = [
      { id: "weight", name: "Weight", current: 0, target: 0, unit: "lbs", active: true }
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

  const jawDone = looksData.jawNeckLogs[today]?.jaw ? 1 : 0;
  const neckDone = looksData.jawNeckLogs[today]?.neck ? 1 : 0;
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

// ---------- MAIN RENDER ----------
function renderLooksMaxxing() {
  const container = document.getElementById("looksMaxxingContainer");
  if (!container) return;

  const stats = calculateLooksStats();
  const latestWeight = looksData.weightLogs.slice(-1)[0]?.weight || "—";

  const html = `
    <div style="margin-bottom:20px;">
      <h2>💎 LooksMaxxing RPG System</h2>
      <div style="color:#9CA3AF;">Elite masculine optimization dashboard</div>
    </div>

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
      <div class="section-title">🧬 RPG Character Stats</div>
      ${renderStatBar("Face", stats.face)}
      ${renderStatBar("Body", stats.body)}
      ${renderStatBar("Style", stats.style)}
      ${renderStatBar("Discipline", stats.discipline)}
      ${renderStatBar("Aura", stats.aura)}
    </div>

    <div class="habit-section" style="margin-bottom:20px;">
      <div class="section-title">🏋️ Body Weight Tracker (Bulking)</div>
      <div style="display:flex; gap:8px; margin-bottom:10px;">
        <input id="weightInput" type="number" placeholder="Enter weight (lbs)" class="form-input"/>
        <button onclick="logWeight()" class="form-submit">Log</button>
      </div>
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
  `;

  container.innerHTML = html;
  renderRoutinesGrid();
}

// ---------- STAT BAR ----------
function renderStatBar(label, value) {
  return `
    <div style="margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between;">
        <span>${label}</span>
        <span style="font-weight:700;">${value}</span>
      </div>
      <div style="height:8px; background:rgba(255,255,255,0.1); border-radius:6px;">
        <div style="height:100%; width:${value}%; background:linear-gradient(90deg,#6366F1,#EC4899); border-radius:6px;"></div>
      </div>
    </div>
  `;
}

// ---------- WEIGHT TRACKER ----------
function logWeight() {
  const input = document.getElementById("weightInput");
  const weight = parseFloat(input.value);
  if (!weight) return;

  looksData.weightLogs.push({ date: getTodayKey(), weight });
  saveLooksData();
  renderLooksMaxxing();
}

function renderWeightHistory() {
  const last = looksData.weightLogs.slice(-5).reverse();
  if (!last.length) return `<div style="color:#9CA3AF;">No weight logs yet.</div>`;
  return last.map(w => `<div>${w.date}: <strong>${w.weight} lbs</strong></div>`).join("");
}

// ---------- JAW & NECK ----------
function renderJawNeck() {
  const today = getTodayKey();
  const log = looksData.jawNeckLogs[today] || { jaw: false, neck: false };

  return `
    <div style="display:grid; gap:8px;">
      <div onclick="toggleJawNeck('jaw')" style="padding:10px; border-radius:10px; background:${log.jaw ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)'}; cursor:pointer;">
        🦷 Jaw Training ${log.jaw ? "✅" : "○"}
      </div>
      <div onclick="toggleJawNeck('neck')" style="padding:10px; border-radius:10px; background:${log.neck ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)'}; cursor:pointer;">
        💪 Neck Training ${log.neck ? "✅" : "○"}
      </div>
    </div>
  `;
}

function toggleJawNeck(type) {
  const today = getTodayKey();
  if (!looksData.jawNeckLogs[today]) looksData.jawNeckLogs[today] = { jaw: false, neck: false };
  looksData.jawNeckLogs[today][type] = !looksData.jawNeckLogs[today][type];
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
        <div style="font-weight:700; color:#A78BFA; margin-bottom:6px;">${cat}</div>
        ${routines.map(r => {
          const done = r.lastDone === today;
          return `
            <div onclick="markRoutineDone('${r.id}')" style="padding:10px; border-radius:10px; background:${done ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)'}; cursor:pointer; margin-bottom:6px;">
              <strong>${r.name}</strong> <span style="color:#9CA3AF;">(${r.frequency})</span> ${done ? "✅" : ""}
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
  r.lastDone = r.lastDone === getTodayKey() ? null : getTodayKey();
  saveLooksData();
  renderLooksMaxxing();
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
