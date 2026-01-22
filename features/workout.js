// ============================================
// WORKOUT MODULE
// ============================================

let workoutData = {};
let lifetimePushups = 0;
let lifetimePullups = 0;

/* ---------- Data Normalization (prevents old/bad saved shapes from crashing UI) ---------- */
function normalizeWorkoutDataShape(data) {
  // Ensure we always end up with: { [exerciseName]: [ {date, weight, reps, sets, category?}, ... ] }
  const safe = {};
  if (!data || typeof data !== "object" || Array.isArray(data)) return safe;

  Object.keys(data).forEach((key) => {
    const val = data[key];

    // If already an array, keep only valid objects
    if (Array.isArray(val)) {
      safe[key] = val
        .filter((s) => s && typeof s === "object")
        .map((s) => ({
          date: s.date || new Date().toISOString(),
          weight: Number(s.weight) || 0,
          reps: Number(s.reps) || 0,
          sets: Number(s.sets) || 0,
          category: (s.category && String(s.category)) || "Other"
        }))
        .filter((s) => s.weight > 0 && s.reps > 0 && s.sets > 0);
      return;
    }

    // If it’s a single object (bad older save), wrap it into an array
    if (val && typeof val === "object") {
      const s = val;
      safe[key] = [
        {
          date: s.date || new Date().toISOString(),
          weight: Number(s.weight) || 0,
          reps: Number(s.reps) || 0,
          sets: Number(s.sets) || 0,
          category: (s.category && String(s.category)) || "Other"
        }
      ].filter((x) => x.weight > 0 && x.reps > 0 && x.sets > 0);
      return;
    }

    // Anything else becomes an empty array
    safe[key] = [];
  });

  return safe;
}

/* ---------- Ensure Category UI exists (no HTML edits required) ---------- */
function ensureWorkoutCategoryDropdown() {
  // Only create once
  if (document.getElementById("exerciseCategory")) return;

  const nameEl = document.getElementById("exerciseName");
  const weightEl = document.getElementById("exerciseWeight");
  const setsEl = document.getElementById("exerciseSets");
  const repsEl = document.getElementById("exerciseReps");

  // If the workout form isn’t on the page yet, do nothing safely
  if (!nameEl || !weightEl || !setsEl || !repsEl) return;

  // Create select
  const select = document.createElement("select");
  select.id = "exerciseCategory";
  select.className = "form-input";
  select.style.minWidth = "160px";
  select.style.height = "42px";

  const options = ["Push", "Pull", "Legs", "Cardio", "Mobility", "Other"];
  select.innerHTML = options.map((o) => `<option value="${o}">${o}</option>`).join("");

  // Try to place it neatly in the same row as the inputs:
  // Insert after Weight input if possible
  const parent = weightEl.parentElement;
  if (parent) {
    // If the inputs are inside a flex row, this keeps it aligned
    parent.insertBefore(select, setsEl);
  } else {
    // Fallback: put it right after weight input in DOM
    weightEl.insertAdjacentElement("afterend", select);
  }
}

/* ---------- Initialize workout data ---------- */
function initWorkoutData() {
  const saved = localStorage.getItem("workoutData");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      workoutData = normalizeWorkoutDataShape(parsed);
    } catch {
      workoutData = {};
    }
  } else {
    workoutData = {};
  }

  const savedPushups = localStorage.getItem("lifetimePushups");
  if (savedPushups) {
    lifetimePushups = parseInt(savedPushups);
    if (Number.isNaN(lifetimePushups)) lifetimePushups = 0;
  }

  const savedPullups = localStorage.getItem("lifetimePullups");
  if (savedPullups) {
    lifetimePullups = parseInt(savedPullups);
    if (Number.isNaN(lifetimePullups)) lifetimePullups = 0;
  }

  // Make sure the dropdown appears when the Workouts UI is present
  ensureWorkoutCategoryDropdown();

  renderLifetimeCounters();
  renderExerciseCards();
}

/* ---------- Save workout data ---------- */
function saveWorkoutData() {
  localStorage.setItem("workoutData", JSON.stringify(workoutData));
}

/* ---------- Log workout ---------- */
function logWorkout() {
  const exerciseName = document.getElementById("exerciseName")?.value.trim();
  const weight = parseInt(document.getElementById("exerciseWeight")?.value);
  const reps = parseInt(document.getElementById("exerciseReps")?.value);
  const sets = parseInt(document.getElementById("exerciseSets")?.value);

  // Category is optional UI; default to Other if missing
  const categoryEl = document.getElementById("exerciseCategory");
  const category = categoryEl ? String(categoryEl.value || "Other") : "Other";

  if (!exerciseName || !weight || !reps || !sets) {
    alert("Please fill in all fields");
    return;
  }

  // Ensure array exists
  if (!Array.isArray(workoutData[exerciseName])) {
    workoutData[exerciseName] = [];
  }

  workoutData[exerciseName].push({
    date: new Date().toISOString(),
    weight,
    reps,
    sets,
    category
  });

  saveWorkoutData();

  // Clear inputs
  const nameEl = document.getElementById("exerciseName");
  const weightEl = document.getElementById("exerciseWeight");
  const repsEl = document.getElementById("exerciseReps");
  const setsEl = document.getElementById("exerciseSets");

  if (nameEl) nameEl.value = "";
  if (weightEl) weightEl.value = "";
  if (repsEl) repsEl.value = "";
  if (setsEl) setsEl.value = "";

  renderExerciseCards();
}

/* ---------- Render exercise cards ---------- */
function renderExerciseCards() {
  // Ensure dropdown appears anytime we render
  ensureWorkoutCategoryDropdown();

  const container = document.getElementById("exerciseCards");
  if (!container) return;

  const exercises = Object.keys(workoutData || {}).filter((k) => Array.isArray(workoutData[k]) && workoutData[k].length);

  if (exercises.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; color: #6B7280; padding: 40px;">No exercises logged yet. Start tracking your workouts above!</div>';
    return;
  }

  let html = "";
  exercises.forEach((exerciseName) => {
    const sessions = workoutData[exerciseName];

    // extra safety
    if (!Array.isArray(sessions) || sessions.length === 0) return;

    const latest = sessions[sessions.length - 1];
    const first = sessions[0];
    const totalSessions = sessions.length;
    const weightGain = (latest.weight || 0) - (first.weight || 0);
    const latestCategory = latest.category || "Other";

    html += `
      <div class="exercise-card" onclick="showExerciseChart('${escapeHtml(exerciseName)}')">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
          <h3 style="color:white; margin:0;">${escapeHtml(exerciseName)}</h3>
          <span style="color:#9CA3AF; font-size:0.9em;">${totalSessions} sessions • ${escapeHtml(latestCategory)}</span>
        </div>

        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px;">
          <div>
            <div style="color:#9CA3AF; font-size:0.85em;">Current</div>
            <div style="color:white; font-weight:bold;">${latest.weight} lbs</div>
          </div>
          <div>
            <div style="color:#9CA3AF; font-size:0.85em;">Started</div>
            <div style="color:white; font-weight:bold;">${first.weight} lbs</div>
          </div>
          <div>
            <div style="color:#9CA3AF; font-size:0.85em;">Gain</div>
            <div style="color:${weightGain >= 0 ? "#10B981" : "#EF4444"}; font-weight:bold;">
              ${weightGain > 0 ? "+" : ""}${weightGain} lbs
            </div>
          </div>
        </div>

        <div style="margin-top:10px; color:#6B7280; font-size:0.85em;">
          Latest: ${latest.sets} × ${latest.reps} reps
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/* ---------- Show exercise chart ---------- */
function showExerciseChart(exerciseName) {
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");
  if (!modal || !modalBody) return;

  const sessions = workoutData[exerciseName];
  if (!Array.isArray(sessions) || sessions.length === 0) return;

  let html = `<h2 style="color:white; margin-bottom:20px;">${escapeHtml(exerciseName)}</h2>`;

  const latest = sessions[sessions.length - 1];
  const first = sessions[0];
  const totalSessions = sessions.length;
  const weightGain = (latest.weight || 0) - (first.weight || 0);

  html += `<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:15px; margin-bottom:20px;">`;
  html += `
    <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px;">
      <div style="color:#9CA3AF; font-size:0.9em;">Current Weight</div>
      <div style="font-size:2em; color:white; font-weight:bold;">${latest.weight} lbs</div>
    </div>
    <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px;">
      <div style="color:#9CA3AF; font-size:0.9em;">Total Gain</div>
      <div style="font-size:2em; color:${weightGain >= 0 ? "#10B981" : "#EF4444"}; font-weight:bold;">
        ${weightGain > 0 ? "+" : ""}${weightGain} lbs
      </div>
    </div>
    <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px;">
      <div style="color:#9CA3AF; font-size:0.9em;">Total Sessions</div>
      <div style="font-size:2em; color:white; font-weight:bold;">${totalSessions}</div>
    </div>
    <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px;">
      <div style="color:#9CA3AF; font-size:0.9em;">Latest Volume</div>
      <div style="font-size:1.5em; color:white; font-weight:bold;">${latest.sets} × ${latest.reps}</div>
    </div>
  `;
  html += `</div>`;

  // Progress bars (mini chart)
  html += `<div style="margin-bottom:20px;">`;
  html += `<div style="color:white; font-weight:600; margin-bottom:10px;">Weight Progress</div>`;
  html += `<div style="display:flex; gap:3px; height:150px; align-items:flex-end;">`;

  const maxWeight = Math.max(...sessions.map((s) => Number(s.weight) || 0), 1);
  sessions.forEach((session, index) => {
    const height = ((Number(session.weight) || 0) / maxWeight) * 100;
    html += `<div
      style="flex:1; background:rgba(16,185,129,0.6); height:${height}%; border-radius:2px;"
      title="Session ${index + 1}: ${session.weight} lbs"
    ></div>`;
  });

  html += `</div>`;
  html += `</div>`;

  // Recent sessions
  html += `<div style="margin-bottom:20px;">`;
  html += `<div style="color:white; font-weight:600; margin-bottom:10px;">Recent Sessions</div>`;
  const recentSessions = sessions.slice(-5).reverse();
  recentSessions.forEach((session) => {
    const date = new Date(session.date);
    html += `
      <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between;">
        <span style="color:#9CA3AF;">${date.toLocaleDateString()}</span>
        <span style="color:white;">
          ${session.weight} lbs × ${session.sets} sets × ${session.reps} reps
        </span>
      </div>
    `;
  });
  html += `</div>`;

  html += `<div style="display:flex; gap:10px;">`;
  html += `<button onclick="deleteExercise('${escapeHtml(exerciseName)}')" style="flex:1; padding:10px; background:rgba(255,50,50,0.2); border:1px solid rgba(255,50,50,0.3); border-radius:8px; color:#ff9999; cursor:pointer;">Delete Exercise</button>`;
  html += `<button onclick="closeModal()" style="flex:1; padding:10px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:8px; color:white; cursor:pointer;">Close</button>`;
  html += `</div>`;

  modalBody.innerHTML = html;
  modal.style.display = "flex";
}

/* ---------- Delete exercise ---------- */
function deleteExercise(exerciseName) {
  if (!confirm(`Delete all data for ${exerciseName}?`)) return;

  delete workoutData[exerciseName];
  saveWorkoutData();
  renderExerciseCards();
  closeModal();
}

/* ---------- Add pushups ---------- */
function addPushups() {
  const input = document.getElementById("pushupsToAdd");
  const reps = parseInt(input?.value);

  if (!reps || reps <= 0) {
    alert("Please enter a valid number");
    return;
  }

  lifetimePushups += reps;
  localStorage.setItem("lifetimePushups", lifetimePushups.toString());
  if (input) input.value = "";
  renderLifetimeCounters();
}

/* ---------- Add pullups ---------- */
function addPullups() {
  const input = document.getElementById("pullupsToAdd");
  const reps = parseInt(input?.value);

  if (!reps || reps <= 0) {
    alert("Please enter a valid number");
    return;
  }

  lifetimePullups += reps;
  localStorage.setItem("lifetimePullups", lifetimePullups.toString());
  if (input) input.value = "";
  renderLifetimeCounters();
}

/* ---------- Render lifetime counters ---------- */
function renderLifetimeCounters() {
  const pushupsEl = document.getElementById("lifetimePushups");
  const pullupsEl = document.getElementById("lifetimePullups");

  if (pushupsEl) pushupsEl.textContent = lifetimePushups.toLocaleString();
  if (pullupsEl) pullupsEl.textContent = lifetimePullups.toLocaleString();
}

/* ---------- Helpers ---------- */
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- Boot (safe) ---------- */
(function bootWorkout() {
  // This module can load on every page; only fully works when Workouts DOM exists.
  try {
    initWorkoutData();
  } catch (e) {
    // Don’t crash the whole app if something unexpected happens
    console.error("Workout boot error:", e);
  }
})();
