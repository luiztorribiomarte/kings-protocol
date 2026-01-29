// ============================================
// LOOKSMAXXING MODULE
// Track appearance, routines, progress photos, measurements
// + BODY WEIGHT TRACKER + JAW & NECK SYSTEM (UPGRADE)
// ============================================

let looksData = {
  routines: [],
  measurements: [],
  photos: [],
  goals: [],
  checkIns: [],
  bodyWeight: [] // NEW: weight tracking
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
        checkIns: [],
        bodyWeight: []
      };
    } catch {
      looksData = {
        routines: [],
        measurements: [],
        photos: [],
        goals: [],
        checkIns: [],
        bodyWeight: []
      };
    }
  }

  // Initialize default routines if empty
  if (!looksData.routines || looksData.routines.length === 0) {
    looksData.routines = [
      { id: "skincare_am", category: "Skincare", name: "Morning Routine", frequency: "daily", lastDone: null },
      { id: "skincare_pm", category: "Skincare", name: "Evening Routine", frequency: "daily", lastDone: null },
      { id: "haircut", category: "Grooming", name: "Haircut", frequency: "monthly", lastDone: null },
      { id: "beard", category: "Grooming", name: "Beard Trim", frequency: "weekly", lastDone: null },
      { id: "nails", category: "Grooming", name: "Nail Care", frequency: "weekly", lastDone: null },
      { id: "teeth", category: "Health", name: "Teeth Whitening", frequency: "monthly", lastDone: null },
      { id: "posture", category: "Fitness", name: "Posture Check", frequency: "daily", lastDone: null },

      // 🔥 NEW: Jaw & Neck routines
      { id: "jaw_training", category: "Jaw & Neck", name: "Jaw Training", frequency: "daily", lastDone: null },
      { id: "neck_training", category: "Jaw & Neck", name: "Neck Training", frequency: "weekly", lastDone: null }
    ];
    saveLooksData();
  }

  // Initialize default goals if empty
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

  if (!looksData.bodyWeight) looksData.bodyWeight = [];
}

function saveLooksData() {
  localStorage.setItem("looksMaxxingData", JSON.stringify(looksData));
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

// ============================================
// 🔥 BODY WEIGHT TRACKER (BULKING SYSTEM)
// ============================================

function addBodyWeight(weight) {
  if (!weight || weight <= 0) return alert("Enter a valid weight");

  looksData.bodyWeight.push({
    date: getTodayKey(),
    weight: parseFloat(weight)
  });

  saveLooksData();
  renderLooksMaxxing();
}

function getWeeklyWeightChange() {
  const data = looksData.bodyWeight;
  if (data.length < 2) return 0;

  const last7 = data.slice(-7);
  const first = last7[0]?.weight;
  const last = last7[last7.length - 1]?.weight;

  return first && last ? (last - first).toFixed(2) : 0;
}

function getBulkStatus() {
  const change = parseFloat(getWeeklyWeightChange());

  if (change > 1.5) return { text: "Too fast (fat gain risk)", color: "#EF4444" };
  if (change > 0.25 && change <= 1.5) return { text: "Optimal bulk", color: "#22C55E" };
  if (change > 0 && change < 0.25) return { text: "Slow bulk", color: "#F59E0B" };
  return { text: "No progress", color: "#9CA3AF" };
}

// ============================================
// 🔥 JAW & NECK SCORE SYSTEM
// ============================================

function getJawNeckScore() {
  const today = getTodayKey();
  const jaw = looksData.routines.find(r => r.id === "jaw_training");
  const neck = looksData.routines.find(r => r.id === "neck_training");

  let score = 0;

  if (jaw?.lastDone === today) score += 50;
  if (neck?.lastDone === today) score += 50;

  return score;
}

function getJawNeckStreak() {
  let streak = 0;
  const jaw = looksData.routines.find(r => r.id === "jaw_training");
  if (!jaw?.lastDone) return 0;

  let date = new Date(jaw.lastDone);
  while (true) {
    const key = date.toISOString().split("T")[0];
    if (jaw.lastDone === key) {
      streak++;
      date.setDate(date.getDate() - 1);
    } else break;
  }
  return streak;
}

// ============================================
// MAIN RENDER (UPGRADED UI)
// ============================================

function renderLooksMaxxing() {
  const container = document.getElementById("looksMaxxingContainer");
  if (!container) return;

  const latestWeight = looksData.bodyWeight.slice(-1)[0]?.weight || "--";
  const weeklyChange = getWeeklyWeightChange();
  const bulkStatus = getBulkStatus();
  const jawScore = getJawNeckScore();
  const jawStreak = getJawNeckStreak();

  const html = `
    <div style="margin-bottom:24px;">
      <h2 style="margin:0 0 8px 0;">💎 LooksMaxxing Hub</h2>
      <p style="color:#9CA3AF; margin:0;">Track your appearance, routines, and physical progress</p>
    </div>

    <!-- 🔥 BODY WEIGHT TRACKER -->
    <div class="habit-section" style="margin-bottom:24px;">
      <div class="section-title">⚖️ Body Weight Tracker (Bulk Mode)</div>
      <div style="display:flex; gap:10px; margin-bottom:10px;">
        <input id="weightInput" type="number" step="0.1" placeholder="Enter weight (lbs)" class="form-input" />
        <button onclick="addBodyWeight(document.getElementById('weightInput').value)" class="form-submit">Log</button>
      </div>
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px;">
        <div class="stat-card">
          <div class="stat-value">${latestWeight}</div>
          <div class="stat-label">Current Weight</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${weeklyChange}</div>
          <div class="stat-label">Weekly Change</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:${bulkStatus.color};">${bulkStatus.text}</div>
          <div class="stat-label">Bulk Quality</div>
        </div>
      </div>
    </div>

    <!-- 🔥 JAW & NECK DEVELOPMENT -->
    <div class="habit-section" style="margin-bottom:24px;">
      <div class="section-title">🦴 Jaw & Neck Development</div>
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-bottom:10px;">
        <div class="stat-card">
          <div class="stat-value">${jawScore}/100</div>
          <div class="stat-label">Jaw & Neck Score</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${jawStreak}</div>
          <div class="stat-label">Jaw Streak (days)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${looksData.routines.filter(r => r.category === "Jaw & Neck").length}</div>
          <div class="stat-label">Jaw/Neck Routines</div>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
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

    <!-- Goals Progress -->
    <div class="habit-section" style="margin-bottom:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div class="section-title">🎯 Body Goals</div>
        <button onclick="openEditGoals()" class="form-submit" style="padding:6px 12px;">Edit Goals</button>
      </div>
      <div id="goalsProgress"></div>
    </div>

    <!-- Daily Routines -->
    <div class="habit-section" style="margin-bottom:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div class="section-title">✨ Routines & Grooming</div>
        <button onclick="openManageRoutines()" class="form-submit" style="padding:6px 12px;">Manage</button>
      </div>
      <div id="routinesGrid"></div>
    </div>
  `;

  container.innerHTML = html;
  renderGoalsProgress();
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

console.log("LooksMaxxing module loaded");
