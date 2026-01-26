// ============================================
// WORKOUT MODULE (SAFE UPGRADE: HISTORY + STREAK + SUMMARY + WEEKLY TRACKER)
// - Keeps ALL existing features
// - Adds workout history saved per day (workoutHistory)
// - Adds streak + best streak
// - Adds Today summary + Last 7 days tracker
// - Adds clickable history list (opens modal with that day's details)
// ============================================

let workoutData = {};
let lifetimePushups = 0;
let lifetimePullups = 0;

// NEW: day-based history (does NOT replace workoutData)
let workoutHistory = {}; // { "YYYY-MM-DD": { entries: [...], totals: {...} } }

// ---------- Helpers ----------
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateShort(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
  } catch {
    return "";
  }
}

function getDayKey(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function parseDayKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, (m - 1), d);
}

function getPastDayKeys(n = 7) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(getDayKey(d));
  }
  return out;
}

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function getExerciseListContainer() {
  // If we injected a dedicated list container, use it.
  const list = document.getElementById("exerciseList");
  if (list) return list;

  // Fallback to the original container.
  return document.getElementById("exerciseCards");
}

// ---------- NEW: Storage for history ----------
function loadWorkoutHistory() {
  const saved = localStorage.getItem("workoutHistory");
  if (saved) {
    try {
      workoutHistory = JSON.parse(saved) || {};
    } catch {
      workoutHistory = {};
    }
  } else {
    workoutHistory = {};
  }
}

function saveWorkoutHistory() {
  localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
}

// ---------- NEW: History aggregation ----------
function ensureDayHistory(dayKey) {
  if (!workoutHistory[dayKey]) {
    workoutHistory[dayKey] = {
      entries: [], // [{dateISO, exercise, weight, reps, sets, volume}]
      totals: { volume: 0, sets: 0, reps: 0, exercises: 0 }
    };
  }
  if (!Array.isArray(workoutHistory[dayKey].entries)) workoutHistory[dayKey].entries = [];
  if (!workoutHistory[dayKey].totals || typeof workoutHistory[dayKey].totals !== "object") {
    workoutHistory[dayKey].totals = { volume: 0, sets: 0, reps: 0, exercises: 0 };
  }
}

function recalcDayTotals(dayKey) {
  ensureDayHistory(dayKey);
  const entries = workoutHistory[dayKey].entries || [];

  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;

  const exerciseSet = new Set();
  entries.forEach(e => {
    const vol = safeNum(e.volume);
    totalVolume += vol;
    totalSets += safeNum(e.sets);
    totalReps += safeNum(e.reps) * safeNum(e.sets);
    if (e.exercise) exerciseSet.add(e.exercise);
  });

  workoutHistory[dayKey].totals = {
    volume: Math.round(totalVolume),
    sets: Math.round(totalSets),
    reps: Math.round(totalReps),
    exercises: exerciseSet.size
  };
}

function addHistoryEntry(exerciseName, session) {
  const dayKey = getDayKey(new Date(session.date));
  ensureDayHistory(dayKey);

  const volume = safeNum(session.weight) * safeNum(session.reps) * safeNum(session.sets);

  workoutHistory[dayKey].entries.push({
    dateISO: session.date,
    exercise: exerciseName,
    weight: safeNum(session.weight),
    reps: safeNum(session.reps),
    sets: safeNum(session.sets),
    volume: Math.round(volume)
  });

  recalcDayTotals(dayKey);
  saveWorkoutHistory();
}

// ---------- NEW: Streak ----------
function getWorkoutDaysSorted() {
  const keys = Object.keys(workoutHistory || {}).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
  keys.sort((a, b) => parseDayKey(a) - parseDayKey(b));
  return keys;
}

function didWorkoutOnDay(dayKey) {
  const day = workoutHistory?.[dayKey];
  return !!(day && Array.isArray(day.entries) && day.entries.length > 0);
}

function computeCurrentStreak() {
  // counts a day as trained if at least 1 logged exercise (safe + reliable)
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const key = getDayKey(cursor);
    if (didWorkoutOnDay(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function computeBestStreak() {
  const keys = getWorkoutDaysSorted();
  if (!keys.length) return 0;

  let best = 0;
  let current = 0;

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!didWorkoutOnDay(k)) continue;

    if (current === 0) {
      current = 1;
    } else {
      const prevKey = keys[i - 1];
      const prev = parseDayKey(prevKey);
      const cur = parseDayKey(k);
      const diffDays = Math.round((cur - prev) / (1000 * 60 * 60 * 24));
      if (diffDays === 1 && didWorkoutOnDay(prevKey)) current++;
      else current = 1;
    }
    if (current > best) best = current;
  }

  return best;
}

// ---------- UI Injection (UPGRADED) ----------
function ensureWorkoutUI() {
  const page = document.getElementById("workoutPage");
  if (!page) return;

  // If we already built the UI, don’t rebuild it.
  if (document.getElementById("workoutLogPanel")) return;

  // Your HTML currently has: <div id="workoutPage" class="page"><div id="exerciseCards"></div></div>
  const host = document.getElementById("exerciseCards");
  if (!host) return;

  host.innerHTML = `
    <!-- LOG PANEL -->
    <div id="workoutLogPanel" class="workout-log" style="padding:16px; margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:12px;">💪 Log Workout</div>

      <div style="display:grid; grid-template-columns: 1.5fr 1fr 1fr 1fr auto; gap:10px; align-items:end;">
        <div class="form-group" style="margin-bottom:0;">
          <label style="display:block; margin-bottom:6px; color:#d1d5db; font-weight:700;">Exercise</label>
          <input id="exerciseName" class="form-input" placeholder="e.g. Bench Press" />
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label style="display:block; margin-bottom:6px; color:#d1d5db; font-weight:700;">Weight</label>
          <input id="exerciseWeight" class="form-input" inputmode="numeric" type="number" placeholder="lbs" />
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label style="display:block; margin-bottom:6px; color:#d1d5db; font-weight:700;">Reps</label>
          <input id="exerciseReps" class="form-input" inputmode="numeric" type="number" placeholder="reps" />
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label style="display:block; margin-bottom:6px; color:#d1d5db; font-weight:700;">Sets</label>
          <input id="exerciseSets" class="form-input" inputmode="numeric" type="number" placeholder="sets" />
        </div>

        <button onclick="logWorkout()" class="form-submit" style="height:42px; white-space:nowrap;" title="Log this session">
          Log
        </button>
      </div>

      <div style="margin-top:10px; color:#9ca3af; font-size:0.9rem;">
        Tip: Click an exercise card to open progress + recent sessions.
      </div>
    </div>

    <!-- TODAY + STREAK + WEEK -->
    <div class="habit-section" style="padding:16px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:12px;">
        <div class="section-title" style="margin:0;">📊 Workout Intel</div>
        <button class="form-submit" style="padding:10px 12px;" onclick="openWorkoutHistoryModal()" title="View full history">
          View History
        </button>
      </div>

      <div id="workoutIntelGrid" style="display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:12px;"></div>

      <div style="margin-top:12px;">
        <div style="color:#9ca3af; font-size:0.9rem; margin-bottom:8px;">Last 7 Days</div>
        <div id="workoutWeekStrip" style="display:grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap:10px;"></div>
      </div>
    </div>

    <!-- LIFETIME COUNTERS -->
    <div id="lifetimePanel" class="habit-section" style="padding:16px; margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:12px;">🏆 Lifetime Counters</div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <div class="lifetime-counter" style="min-width:260px;">
          <div class="counter-title">Lifetime Pushups</div>
          <div class="counter-value" id="lifetimePushups">0</div>

          <div style="display:flex; gap:8px; margin-top:10px;">
            <input id="pushupsToAdd" class="form-input" inputmode="numeric" type="number" placeholder="Add reps" />
            <button onclick="addPushups()" class="form-submit" style="white-space:nowrap;">Add</button>
          </div>
        </div>

        <div class="lifetime-counter" style="min-width:260px;">
          <div class="counter-title">Lifetime Pullups</div>
          <div class="counter-value" id="lifetimePullups">0</div>

          <div style="display:flex; gap:8px; margin-top:10px;">
            <input id="pullupsToAdd" class="form-input" inputmode="numeric" type="number" placeholder="Add reps" />
            <button onclick="addPullups()" class="form-submit" style="white-space:nowrap;">Add</button>
          </div>
        </div>
      </div>
    </div>

    <!-- WORKOUT DAY HISTORY LIST (QUICK VIEW) -->
    <div class="habit-section" style="padding:16px; margin-bottom:16px;">
      <div class="section-title" style="margin-bottom:12px;">🗓️ Recent Workout Days</div>
      <div id="workoutHistoryList"></div>
    </div>

    <!-- EXERCISE LIST -->
    <div class="habit-section" style="padding:16px;">
      <div class="section-title" style="margin-bottom:12px;">📈 Exercises</div>
      <div id="exerciseList"></div>
    </div>
  `;
}

// ---------- NEW: Render intel panels ----------
function renderWorkoutIntel() {
  ensureWorkoutUI();

  const grid = document.getElementById("workoutIntelGrid");
  const strip = document.getElementById("workoutWeekStrip");
  const list = document.getElementById("workoutHistoryList");

  if (!grid || !strip || !list) return;

  const today = getDayKey();
  ensureDayHistory(today);
  recalcDayTotals(today);

  const todayTotals = workoutHistory[today]?.totals || { volume: 0, sets: 0, reps: 0, exercises: 0 };
  const currentStreak = computeCurrentStreak();
  const bestStreak = computeBestStreak();

  // last 7 days totals
  const last7 = getPastDayKeys(7);
  let daysTrained = 0;
  let weekVolume = 0;

  last7.forEach(k => {
    if (didWorkoutOnDay(k)) {
      daysTrained++;
      recalcDayTotals(k);
      weekVolume += safeNum(workoutHistory?.[k]?.totals?.volume);
    }
  });

  grid.innerHTML = `
    <div style="padding:14px; border-radius:14px; border:1px solid rgba(255,255,255,0.14); background:rgba(255,255,255,0.05);">
      <div style="color:#9ca3af; font-weight:800; font-size:0.85rem;">Today Exercises</div>
      <div style="color:white; font-size:1.8rem; font-weight:950; margin-top:6px;">${todayTotals.exercises}</div>
    </div>

    <div style="padding:14px; border-radius:14px; border:1px solid rgba(255,255,255,0.14); background:rgba(255,255,255,0.05);">
      <div style="color:#9ca3af; font-weight:800; font-size:0.85rem;">Today Sets</div>
      <div style="color:white; font-size:1.8rem; font-weight:950; margin-top:6px;">${todayTotals.sets}</div>
    </div>

    <div style="padding:14px; border-radius:14px; border:1px solid rgba(255,255,255,0.14); background:rgba(255,255,255,0.05);">
      <div style="color:#9ca3af; font-weight:800; font-size:0.85rem;">Current Streak</div>
      <div style="color:white; font-size:1.8rem; font-weight:950; margin-top:6px;">${currentStreak}</div>
      <div style="color:#6b7280; font-size:0.85rem; margin-top:4px;">Best: ${bestStreak}</div>
    </div>

    <div style="padding:14px; border-radius:14px; border:1px solid rgba(255,255,255,0.14); background:rgba(255,255,255,0.05);">
      <div style="color:#9ca3af; font-weight:800; font-size:0.85rem;">7-Day Volume</div>
      <div style="color:white; font-size:1.8rem; font-weight:950; margin-top:6px;">${Math.round(weekVolume).toLocaleString()}</div>
      <div style="color:#6b7280; font-size:0.85rem; margin-top:4px;">Days trained: ${daysTrained}/7</div>
    </div>
  `;

  strip.innerHTML = last7.map(k => {
    const d = parseDayKey(k);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const trained = didWorkoutOnDay(k);

    recalcDayTotals(k);
    const vol = safeNum(workoutHistory?.[k]?.totals?.volume);

    return `
      <div
        onclick="${trained ? `openWorkoutDay('${k}')` : ""}"
        title="${trained ? `Trained • Volume ${vol.toLocaleString()}` : "No workout"}"
        style="
          padding:10px 8px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,0.12);
          background:${trained ? "rgba(34,197,94,0.10)" : "rgba(255,255,255,0.05)"};
          cursor:${trained ? "pointer" : "default"};
          text-align:center;
        "
      >
        <div style="color:${trained ? "rgba(255,255,255,0.95)" : "#9ca3af"}; font-weight:900; font-size:0.85rem;">${label}</div>
        <div style="margin-top:6px; font-size:1.05rem;">${trained ? "✅" : "—"}</div>
      </div>
    `;
  }).join("");

  // recent workout days list (last 10 days that actually have entries)
  const allKeys = getWorkoutDaysSorted().reverse();
  const recentKeys = allKeys.filter(didWorkoutOnDay).slice(0, 10);

  if (!recentKeys.length) {
    list.innerHTML = `<div style="color:#9CA3AF; padding:10px;">No workout days yet. Log your first session above.</div>`;
    return;
  }

  list.innerHTML = recentKeys.map(k => {
    recalcDayTotals(k);
    const totals = workoutHistory[k].totals;

    return `
      <div
        onclick="openWorkoutDay('${k}')"
        style="
          padding:12px 12px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.05);
          margin-bottom:10px;
          cursor:pointer;
          display:flex;
          justify-content:space-between;
          gap:12px;
          align-items:center;
        "
      >
        <div>
          <div style="color:white; font-weight:950;">${k}</div>
          <div style="color:#9ca3af; margin-top:4px; font-size:0.9rem;">
            Exercises: ${totals.exercises} • Sets: ${totals.sets}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="color:white; font-weight:950;">${totals.volume.toLocaleString()}</div>
          <div style="color:#6b7280; font-size:0.85rem;">volume</div>
        </div>
      </div>
    `;
  }).join("");
}

// ---------- NEW: Day modal ----------
function openWorkoutDay(dayKey) {
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");
  if (!modal || !modalBody) return;

  if (!didWorkoutOnDay(dayKey)) return;

  recalcDayTotals(dayKey);
  const totals = workoutHistory[dayKey].totals;
  const entries = workoutHistory[dayKey].entries || [];

  // group by exercise
  const byExercise = {};
  entries.forEach(e => {
    if (!byExercise[e.exercise]) byExercise[e.exercise] = [];
    byExercise[e.exercise].push(e);
  });

  const exerciseNames = Object.keys(byExercise).sort((a, b) => a.localeCompare(b));

  modalBody.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div>
        <div style="color:white; font-weight:950; font-size:1.15rem;">🗓️ Workout Day</div>
        <div style="color:#9ca3af; margin-top:4px;">${dayKey}</div>
      </div>
      <button onclick="closeModal()" class="form-submit" style="padding:10px 12px;">Close</button>
    </div>

    <div style="margin-top:14px; display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:10px;">
      <div style="padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05);">
        <div style="color:#9ca3af; font-weight:800; font-size:0.85rem;">Exercises</div>
        <div style="color:white; font-weight:950; font-size:1.6rem; margin-top:6px;">${totals.exercises}</div>
      </div>
      <div style="padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05);">
        <div style="color:#9ca3af; font-weight:800; font-size:0.85rem;">Sets</div>
        <div style="color:white; font-weight:950; font-size:1.6rem; margin-top:6px;">${totals.sets}</div>
      </div>
      <div style="padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05);">
        <div style="color:#9ca3af; font-weight:800; font-size:0.85rem;">Volume</div>
        <div style="color:white; font-weight:950; font-size:1.6rem; margin-top:6px;">${totals.volume.toLocaleString()}</div>
      </div>
    </div>

    <div style="margin-top:16px;">
      <div style="color:white; font-weight:900; margin-bottom:10px;">Exercises</div>
      ${exerciseNames.map(name => {
        const sets = byExercise[name];
        const last = sets[sets.length - 1];
        const exVol = sets.reduce((a, s) => a + safeNum(s.volume), 0);

        return `
          <div style="
            padding:12px;
            border-radius:14px;
            border:1px solid rgba(255,255,255,0.12);
            background:rgba(255,255,255,0.05);
            margin-bottom:10px;
          ">
            <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
              <div style="color:white; font-weight:950;">${escapeHtml(name)}</div>
              <div style="color:#9ca3af; font-size:0.9rem;">Volume: ${Math.round(exVol).toLocaleString()}</div>
            </div>

            <div style="margin-top:8px; color:#e5e7eb; font-weight:800;">
              Latest: ${last.weight} lbs × ${last.sets} sets × ${last.reps} reps
            </div>

            <div style="margin-top:8px; color:#9ca3af; font-size:0.9rem;">
              ${sets.slice(-4).reverse().map(s => `${s.weight}×${s.sets}×${s.reps}`).join(" • ")}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  modal.style.display = "flex";
}

function openWorkoutHistoryModal() {
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");
  if (!modal || !modalBody) return;

  const keys = getWorkoutDaysSorted().reverse().filter(didWorkoutOnDay);
  if (!keys.length) {
    modalBody.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <div style="color:white; font-weight:950; font-size:1.15rem;">Workout History</div>
        <button onclick="closeModal()" class="form-submit" style="padding:10px 12px;">Close</button>
      </div>
      <div style="margin-top:14px; color:#9CA3AF;">No workout days yet.</div>
    `;
    modal.style.display = "flex";
    return;
  }

  modalBody.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div style="color:white; font-weight:950; font-size:1.15rem;">📚 Workout History</div>
      <button onclick="closeModal()" class="form-submit" style="padding:10px 12px;">Close</button>
    </div>

    <div style="margin-top:14px;">
      ${keys.map(k => {
        recalcDayTotals(k);
        const t = workoutHistory[k].totals;
        return `
          <div
            onclick="openWorkoutDay('${k}')"
            style="
              padding:12px;
              border-radius:14px;
              border:1px solid rgba(255,255,255,0.12);
              background:rgba(255,255,255,0.05);
              margin-bottom:10px;
              cursor:pointer;
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:12px;
            "
          >
            <div>
              <div style="color:white; font-weight:950;">${k}</div>
              <div style="color:#9ca3af; font-size:0.9rem; margin-top:4px;">
                Exercises: ${t.exercises} • Sets: ${t.sets}
              </div>
            </div>
            <div style="text-align:right;">
              <div style="color:white; font-weight:950;">${t.volume.toLocaleString()}</div>
              <div style="color:#6b7280; font-size:0.85rem;">volume</div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  modal.style.display = "flex";
}

// Initialize workout data
function initWorkoutData() {
  const saved = localStorage.getItem("workoutData");
  if (saved) {
    try {
      workoutData = JSON.parse(saved) || {};
    } catch {
      workoutData = {};
    }
  } else {
    workoutData = {};
  }

  const savedPushups = localStorage.getItem("lifetimePushups");
  if (savedPushups) lifetimePushups = parseInt(savedPushups, 10) || 0;

  const savedPullups = localStorage.getItem("lifetimePullups");
  if (savedPullups) lifetimePullups = parseInt(savedPullups, 10) || 0;

  // NEW: load history
  loadWorkoutHistory();

  // NEW: build UI if needed
  ensureWorkoutUI();

  renderLifetimeCounters();
  renderExerciseCards();
  renderWorkoutIntel();
}

// Save workout data
function saveWorkoutData() {
  localStorage.setItem("workoutData", JSON.stringify(workoutData));
}

// Log workout
function logWorkout() {
  const nameEl = document.getElementById("exerciseName");
  const weightEl = document.getElementById("exerciseWeight");
  const repsEl = document.getElementById("exerciseReps");
  const setsEl = document.getElementById("exerciseSets");

  const exerciseName = nameEl ? nameEl.value.trim() : "";
  const weight = weightEl ? parseInt(weightEl.value, 10) : NaN;
  const reps = repsEl ? parseInt(repsEl.value, 10) : NaN;
  const sets = setsEl ? parseInt(setsEl.value, 10) : NaN;

  if (!exerciseName || !Number.isFinite(weight) || !Number.isFinite(reps) || !Number.isFinite(sets)) {
    alert("Please fill in all fields");
    return;
  }

  if (!workoutData[exerciseName]) workoutData[exerciseName] = [];

  const session = {
    date: new Date().toISOString(),
    weight,
    reps,
    sets
  };

  workoutData[exerciseName].push(session);

  // NEW: save in day-history too (safe add-on)
  addHistoryEntry(exerciseName, session);

  saveWorkoutData();

  // Clear inputs
  if (nameEl) nameEl.value = "";
  if (weightEl) weightEl.value = "";
  if (repsEl) repsEl.value = "";
  if (setsEl) setsEl.value = "";

  renderExerciseCards();
  renderWorkoutIntel();
}

// Render exercise cards
function renderExerciseCards() {
  // NEW: ensure UI exists (in case page was loaded before init)
  ensureWorkoutUI();

  const container = getExerciseListContainer();
  if (!container) return;

  const exercises = Object.keys(workoutData || {});
  if (exercises.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; color:#9CA3AF; padding:22px;">
        No exercises logged yet. Use <strong>Log Workout</strong> above to start tracking.
      </div>
    `;
    return;
  }

  // Keep stable ordering (A→Z)
  exercises.sort((a, b) => a.localeCompare(b));

  let html = "";

  exercises.forEach(exerciseName => {
    const sessions = workoutData[exerciseName] || [];
    const latest = sessions[sessions.length - 1];
    const first = sessions[0];

    const totalSessions = sessions.length;
    const weightGain = (latest?.weight ?? 0) - (first?.weight ?? 0);

    const bestWeight = Math.max(...sessions.map(s => Number(s.weight || 0)));
    const progressPct = bestWeight ? Math.round(((latest?.weight || 0) / bestWeight) * 100) : 0;

    const volume = (latest?.weight || 0) * (latest?.reps || 0) * (latest?.sets || 0);

    html += `
      <div
        class="exercise-card"
        onclick="showExerciseChart('${escapeHtml(exerciseName).replaceAll("&#039;", "\\'")}')"
        style="
          border-radius:18px;
          border:1px solid rgba(255,255,255,0.16);
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
          padding:16px;
          margin-bottom:12px;
          cursor:pointer;
        "
      >
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px;">
          <div style="color:white; font-weight:900; font-size:1.05rem;">
            ${escapeHtml(exerciseName)}
          </div>
          <div style="color:#9CA3AF; font-size:0.9rem;">
            ${totalSessions} session${totalSessions === 1 ? "" : "s"}
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px;">
          <div>
            <div style="color:#9CA3AF; font-size:0.82rem;">Current</div>
            <div style="color:white; font-weight:900;">${latest.weight} lbs</div>
          </div>
          <div>
            <div style="color:#9CA3AF; font-size:0.82rem;">Best</div>
            <div style="color:white; font-weight:900;">${bestWeight} lbs</div>
          </div>
          <div>
            <div style="color:#9CA3AF; font-size:0.82rem;">Gain</div>
            <div style="font-weight:900; color:${weightGain >= 0 ? "#10B981" : "#EF4444"};">
              ${weightGain > 0 ? "+" : ""}${weightGain} lbs
            </div>
          </div>
          <div>
            <div style="color:#9CA3AF; font-size:0.82rem;">Volume</div>
            <div style="color:white; font-weight:900;">${volume.toLocaleString()}</div>
          </div>
        </div>

        <div style="margin-top:10px;">
          <div style="display:flex; justify-content:space-between; color:#9CA3AF; font-size:0.82rem;">
            <span>Latest: ${latest.sets} × ${latest.reps}</span>
            <span>${formatDateShort(latest.date)}</span>
          </div>

          <div style="
            height:10px;
            border-radius:999px;
            background: rgba(255,255,255,0.08);
            border:1px solid rgba(255,255,255,0.10);
            margin-top:8px;
            overflow:hidden;
          ">
            <div style="
              height:100%;
              width:${Math.max(6, Math.min(100, progressPct))}%;
              border-radius:999px;
              background: linear-gradient(135deg, rgba(99,102,241,0.95), rgba(236,72,153,0.95));
            "></div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Show exercise chart
function showExerciseChart(exerciseName) {
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");
  if (!modal || !modalBody) return;

  const sessions = workoutData[exerciseName];
  if (!sessions || !sessions.length) return;

  let html = `<h2 style="color:white; margin-bottom:20px;">${escapeHtml(exerciseName)}</h2>`;

  const latest = sessions[sessions.length - 1];
  const first = sessions[0];
  const totalSessions = sessions.length;
  const weightGain = latest.weight - first.weight;

  html += '<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:15px; margin-bottom: 20px;">';
  html += `
    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; border:1px solid rgba(255,255,255,0.10);">
      <div style="color: #9CA3AF; font-size: 0.9em;">Current Weight</div>
      <div style="font-size: 2em; color: white; font-weight: 900;">${latest.weight} lbs</div>
    </div>

    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; border:1px solid rgba(255,255,255,0.10);">
      <div style="color: #9CA3AF; font-size: 0.9em;">Total Gain</div>
      <div style="font-size: 2em; color: ${weightGain >= 0 ? "#10B981" : "#EF4444"}; font-weight: 900;">
        ${weightGain > 0 ? "+" : ""}${weightGain} lbs
      </div>
    </div>

    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; border:1px solid rgba(255,255,255,0.10);">
      <div style="color: #9CA3AF; font-size: 0.9em;">Total Sessions</div>
      <div style="font-size: 2em; color: white; font-weight: 900;">${totalSessions}</div>
    </div>

    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; border:1px solid rgba(255,255,255,0.10);">
      <div style="color: #9CA3AF; font-size: 0.9em;">Latest Volume</div>
      <div style="font-size: 1.5em; color: white; font-weight: 900;">
        ${latest.sets} × ${latest.reps}
      </div>
    </div>
  `;
  html += "</div>";

  // Progress chart (bar-style)
  html += '<div style="margin-bottom: 20px;">';
  html += '<div style="color: white; font-weight: 800; margin-bottom: 10px;">Weight Progress</div>';
  html += '<div style="display:flex; gap:3px; height: 150px; align-items:flex-end;">';

  const maxWeight = Math.max(...sessions.map(s => Number(s.weight || 0)));
  sessions.forEach((session, index) => {
    const height = maxWeight ? (session.weight / maxWeight) * 100 : 0;
    html += `
      <div
        style="flex:1; background: rgba(16,185,129,0.6); height:${height}%; border-radius: 3px;"
        title="Session ${index + 1}: ${session.weight} lbs"
      ></div>
    `;
  });

  html += "</div>";
  html += "</div>";

  // Recent sessions
  html += '<div style="margin-bottom: 20px;">';
  html += '<div style="color: white; font-weight: 800; margin-bottom: 10px;">Recent Sessions</div>';
  const recentSessions = sessions.slice(-6).reverse();

  recentSessions.forEach(session => {
    html += `
      <div style="
        background: rgba(255,255,255,0.05);
        padding: 10px 12px;
        border-radius: 10px;
        margin-bottom: 8px;
        display:flex;
        justify-content:space-between;
        gap:10px;
        border:1px solid rgba(255,255,255,0.10);
      ">
        <span style="color:#9CA3AF;">${formatDateShort(session.date)}</span>
        <span style="color:white; font-weight:700;">
          ${session.weight} lbs × ${session.sets} sets × ${session.reps} reps
        </span>
      </div>
    `;
  });

  html += "</div>";

  html += '<div style="display:flex; gap:10px;">';
  html += `
    <button
      onclick="deleteExercise('${escapeHtml(exerciseName).replaceAll("&#039;", "\\'")}')"
      style="flex:1; padding: 10px 12px; background: rgba(255,50,50,0.18); border: 1px solid rgba(255,50,50,0.30); border-radius: 12px; color: #ffb4b4; cursor:pointer; font-weight:800;"
    >
      Delete Exercise
    </button>
  `;
  html += `
    <button
      onclick="closeModal()"
      style="flex:1; padding: 10px 12px; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.20); border-radius: 12px; color: white; cursor:pointer; font-weight:800;"
    >
      Close
    </button>
  `;
  html += "</div>";

  modalBody.innerHTML = html;
  modal.style.display = "flex";
}

// Delete exercise
function deleteExercise(exerciseName) {
  if (!confirm(`Delete all data for ${exerciseName}?`)) return;

  delete workoutData[exerciseName];
  saveWorkoutData();
  renderExerciseCards();
  renderWorkoutIntel(); // safe refresh
  closeModal();
}

// Add pushups
function addPushups() {
  const input = document.getElementById("pushupsToAdd");
  const reps = input ? parseInt(input.value, 10) : NaN;

  if (!Number.isFinite(reps) || reps <= 0) {
    alert("Please enter a valid number");
    return;
  }

  lifetimePushups += reps;
  localStorage.setItem("lifetimePushups", String(lifetimePushups));
  if (input) input.value = "";
  renderLifetimeCounters();
}

// Add pullups
function addPullups() {
  const input = document.getElementById("pullupsToAdd");
  const reps = input ? parseInt(input.value, 10) : NaN;

  if (!Number.isFinite(reps) || reps <= 0) {
    alert("Please enter a valid number");
    return;
  }

  lifetimePullups += reps;
  localStorage.setItem("lifetimePullups", String(lifetimePullups));
  if (input) input.value = "";
  renderLifetimeCounters();
}

// Render lifetime counters
function renderLifetimeCounters() {
  // ensure UI exists so these elements exist
  ensureWorkoutUI();

  const pushupsEl = document.getElementById("lifetimePushups");
  const pullupsEl = document.getElementById("lifetimePullups");

  if (pushupsEl) pushupsEl.textContent = lifetimePushups.toLocaleString();
  if (pullupsEl) pullupsEl.textContent = lifetimePullups.toLocaleString();
}

// Optional: keep page reliable even if init wasn’t called yet
(function bootWorkoutSafe() {
  try {
    ensureWorkoutUI();
    loadWorkoutHistory();
    renderWorkoutIntel();
  } catch {}
})();
