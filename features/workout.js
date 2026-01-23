// ============================================
// WORKOUT MODULE (UPGRADED UI + RELIABLE RENDER)
// - Adds an always-visible "Log Workout" panel
// - Adds Lifetime Pushups/Pullups panel (if missing in HTML)
// - Prevents the “No workouts logged…” box from showing under other UI
// - DOES NOT remove any existing features (charts, delete, storage)
// ============================================

let workoutData = {};
let lifetimePushups = 0;
let lifetimePullups = 0;

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

function getExerciseListContainer() {
  // If we injected a dedicated list container, use it.
  const list = document.getElementById("exerciseList");
  if (list) return list;

  // Fallback to the original container.
  return document.getElementById("exerciseCards");
}

// ---------- UI Injection (NEW) ----------
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
    <div id="workoutLogPanel" class="workout-log" style="
      padding:16px;
      margin-bottom:16px;
    ">
      <div class="section-title" style="margin-bottom:12px;">💪 Log Workout</div>

      <div style="
        display:grid;
        grid-template-columns: 1.5fr 1fr 1fr 1fr auto;
        gap:10px;
        align-items:end;
      ">

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

        <button
          onclick="logWorkout()"
          class="form-submit"
          style="height:42px; white-space:nowrap;"
          title="Log this session"
        >
          Log
        </button>
      </div>

      <div style="margin-top:10px; color:#9ca3af; font-size:0.9rem;">
        Tip: Click an exercise card to open progress + recent sessions.
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

    <!-- EXERCISE LIST -->
    <div class="habit-section" style="padding:16px;">
      <div class="section-title" style="margin-bottom:12px;">📈 Exercises</div>
      <div id="exerciseList"></div>
    </div>
  `;
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

  // NEW: build UI if needed
  ensureWorkoutUI();

  renderLifetimeCounters();
  renderExerciseCards();
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

  workoutData[exerciseName].push({
    date: new Date().toISOString(),
    weight,
    reps,
    sets
  });

  saveWorkoutData();

  // Clear inputs
  if (nameEl) nameEl.value = "";
  if (weightEl) weightEl.value = "";
  if (repsEl) repsEl.value = "";
  if (setsEl) setsEl.value = "";

  renderExerciseCards();
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
  // NEW: ensure UI exists so these elements exist
  ensureWorkoutUI();

  const pushupsEl = document.getElementById("lifetimePushups");
  const pullupsEl = document.getElementById("lifetimePullups");

  if (pushupsEl) pushupsEl.textContent = lifetimePushups.toLocaleString();
  if (pullupsEl) pullupsEl.textContent = lifetimePullups.toLocaleString();
}

// Optional: keep page reliable even if init wasn’t called yet
(function bootWorkoutSafe() {
  // If workout page exists at load, build UI so it’s never “empty”
  try {
    ensureWorkoutUI();
  } catch {}
})();
