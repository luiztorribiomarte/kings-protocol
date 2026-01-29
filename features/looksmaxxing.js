// ============================================
// LOOKSMAXXING MODULE
// Track appearance, routines, progress photos, measurements
// ============================================

let looksData = {
  routines: [],
  measurements: [],
  photos: [],
  goals: [],
  checkIns: []
};

// ---------- INIT ----------
function initLooksMaxxing() {
  const saved = localStorage.getItem("looksMaxxingData");
  if (saved) {
    try {
      looksData = JSON.parse(saved) || {
        routines: [],
        measurements: [],
        photos: [],
        goals: [],
        checkIns: []
      };
    } catch {
      looksData = {
        routines: [],
        measurements: [],
        photos: [],
        goals: [],
        checkIns: []
      };
    }
  }

  if (!looksData.routines || looksData.routines.length === 0) {
    looksData.routines = [
      { id: "skincare_am", category: "Skincare", name: "Morning Routine", frequency: "daily", lastDone: null },
      { id: "skincare_pm", category: "Skincare", name: "Evening Routine", frequency: "daily", lastDone: null },
      { id: "haircut", category: "Grooming", name: "Haircut", frequency: "monthly", lastDone: null },
      { id: "beard", category: "Grooming", name: "Beard Trim", frequency: "weekly", lastDone: null },
      { id: "nails", category: "Grooming", name: "Nail Care", frequency: "weekly", lastDone: null },
      { id: "teeth", category: "Health", name: "Teeth Whitening", frequency: "monthly", lastDone: null },
      { id: "posture", category: "Fitness", name: "Posture Check", frequency: "daily", lastDone: null }
    ];
    saveLooksData();
  }

  if (!looksData.goals || looksData.goals.length === 0) {
    looksData.goals = [
      { id: "weight", name: "Weight", current: 0, target: 0, unit: "lbs", active: true },
      { id: "waist", name: "Waist", current: 0, target: 0, unit: "in", active: true },
      { id: "chest", name: "Chest", current: 0, target: 0, unit: "in", active: false },
      { id: "arms", name: "Arms (flexed)", current: 0, target: 0, unit: "in", active: false },
      { id: "pushups", name: "Push-ups (max set)", current: 0, target: 0, unit: "reps", active: false },
      { id: "pullups", name: "Pull-ups", current: 0, target: 0, unit: "reps", active: false },
      { id: "plank", name: "Plank Hold", current: 0, target: 0, unit: "sec", active: false }
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

// ---------- CHECK-INS (FIXED & RESTORED) ----------
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

  const html = `
    <div style="margin-bottom:24px;">
      <h2 style="margin:0 0 8px 0;">💎 LooksMaxxing Hub</h2>
      <p style="color:#9CA3AF; margin:0;">Track your appearance, routines, and physical progress</p>
    </div>

    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card" onclick="openProgressPhotos()">
        <div class="stat-value">${looksData.photos?.length || 0}</div>
        <div class="stat-label">Progress Photos</div>
      </div>
      <div class="stat-card" onclick="openMeasurements()">
        <div class="stat-value">${looksData.measurements?.length || 0}</div>
        <div class="stat-label">Measurements Logged</div>
      </div>
      <div class="stat-card" onclick="openCheckIns()">
        <div class="stat-value">${getThisWeekCheckIns()}</div>
        <div class="stat-label">Check-ins This Week</div>
      </div>
    </div>

    <div class="habit-section" style="margin-bottom:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div class="section-title">🎯 Body Goals</div>
        <button onclick="openEditGoals()" class="form-submit" style="padding:6px 12px;">Edit Goals</button>
      </div>
      <div id="goalsProgress"></div>
    </div>

    <div class="habit-section" style="margin-bottom:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div class="section-title">✨ Routines & Grooming</div>
        <button onclick="openManageRoutines()" class="form-submit" style="padding:6px 12px;">Manage</button>
      </div>
      <div id="routinesGrid"></div>
    </div>

    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
      <button onclick="openProgressPhotos()" class="form-submit" style="width:100%; padding:14px;">📸 Progress Photos</button>
      <button onclick="openMeasurements()" class="form-submit" style="width:100%; padding:14px;">📏 Body Measurements</button>
      <button onclick="openCheckIns()" class="form-submit" style="width:100%; padding:14px;">📝 Weekly Check-in</button>
    </div>
  `;

  container.innerHTML = html;
  renderGoalsProgress();
  renderRoutinesGrid();
}

// ---------- GOALS PROGRESS ----------
function renderGoalsProgress() {
  const el = document.getElementById("goalsProgress");
  if (!el) return;

  const activeGoals = looksData.goals.filter(g => g.active !== false);

  if (activeGoals.length === 0) {
    el.innerHTML = `<div style="color:#9CA3AF;">No active goals.</div>`;
    return;
  }

  el.innerHTML = activeGoals.map(goal => {
    const progress = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
    const color = progress >= 100 ? "#22C55E" : progress >= 75 ? "#A78BFA" : progress >= 50 ? "#F59E0B" : "#EF4444";

    return `
      <div style="margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <div style="font-weight:700;">${goal.name}</div>
          <div style="color:${color}; font-weight:800;">
            ${goal.current} / ${goal.target} ${goal.unit}
          </div>
        </div>
        <div style="height:8px; border-radius:6px; background:rgba(255,255,255,0.1); overflow:hidden;">
          <div style="height:100%; width:${progress}%; background:${color};"></div>
        </div>
      </div>
    `;
  }).join("");
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
      <div style="margin-bottom:18px;">
        <div style="font-weight:700; color:#A78BFA; margin-bottom:8px;">${cat}</div>
        <div style="display:grid; gap:8px;">
          ${routines.map(r => {
            const done = r.lastDone === today;
            return `
              <div onclick="markRoutineDone('${r.id}')" style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                padding:12px;
                border-radius:10px;
                border:1px solid rgba(255,255,255,0.1);
                background:${done ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)'};
                cursor:pointer;">
                <div>
                  <div style="font-weight:600;">${r.name}</div>
                  <div style="font-size:0.85rem; color:#9CA3AF;">${r.frequency}</div>
                </div>
                <div>${done ? '✅' : '○'}</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");
}

function markRoutineDone(id) {
  const r = looksData.routines.find(x => x.id === id);
  if (!r) return;
  r.lastDone = r.lastDone === getTodayKey() ? null : getTodayKey();
  saveLooksData();
  renderRoutinesGrid();
}

// ---------- CHECK-INS UI ----------
function openCheckIns() {
  const html = `
    <h2>📝 Weekly Check-ins</h2>
    <div style="margin:14px 0;">
      <textarea id="checkInWins" placeholder="Wins..." class="form-input"></textarea>
      <textarea id="checkInChallenges" placeholder="Challenges..." class="form-input"></textarea>
      <textarea id="checkInFocus" placeholder="Focus..." class="form-input"></textarea>
      <button onclick="addCheckIn()" class="form-submit" style="width:100%;">Submit</button>
    </div>
  `;
  openModal(html);
}

function addCheckIn() {
  const wins = document.getElementById("checkInWins")?.value.trim();
  const challenges = document.getElementById("checkInChallenges")?.value.trim();
  const focus = document.getElementById("checkInFocus")?.value.trim();

  const checkIn = {
    id: "checkin_" + Date.now(),
    date: getTodayKey(),
    wins,
    challenges,
    focus
  };

  looksData.checkIns.push(checkIn);
  saveLooksData();
  renderLooksMaxxing();
  closeModal();
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

console.log("LooksMaxxing module loaded");
