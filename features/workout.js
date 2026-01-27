// =====================================================
// WORKOUTS ELITE SYSTEM (KINGS PROTOCOL)
// - Books-style UX + elite strength tracking
// - Workouts → Exercises → Sets
// - PR system, streaks, XP, insights, charts
// - Safe mount, no breaking existing features
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "workoutsData";
  const HISTORY_KEY = "workoutsHistory";
  const PR_KEY = "workoutPRs";
  const MOUNT_ID = "workoutsMount";

  let chart = null;

  function getContainer() {
    return document.getElementById("exerciseCards");
  }

  function ensureMount() {
    const container = getContainer();
    if (!container) return null;

    let mount = document.getElementById(MOUNT_ID);
    if (mount) return mount;

    mount = document.createElement("div");
    mount.id = MOUNT_ID;
    container.prepend(mount);
    return mount;
  }

  function loadData(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function uuid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function todayKey() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ==========================
  // CORE STATE
  // ==========================

  function loadWorkouts() {
    return loadData(STORAGE_KEY, []);
  }

  function saveWorkouts(data) {
    saveData(STORAGE_KEY, data);
  }

  function loadHistory() {
    return loadData(HISTORY_KEY, []);
  }

  function saveHistory(data) {
    saveData(HISTORY_KEY, data);
  }

  function loadPRs() {
    return loadData(PR_KEY, {});
  }

  function savePRs(data) {
    saveData(PR_KEY, data);
  }

  // ==========================
  // GLOBAL API
  // ==========================

  window.Workouts = window.Workouts || {};

  Workouts.addWorkout = function (name, type, status) {
    if (!name.trim()) return;

    const workouts = loadWorkouts();
    workouts.push({
      id: uuid(),
      name: name.trim(),
      type: type.trim(),
      status: status || "planned",
      exercises: [],
      sessions: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    saveWorkouts(workouts);
    renderWorkouts();
  };

  Workouts.deleteWorkout = function (id) {
    const workouts = loadWorkouts().filter(w => w.id !== id);
    saveWorkouts(workouts);
    renderWorkouts();
  };

  Workouts.moveWorkout = function (id, status) {
    const workouts = loadWorkouts();
    const w = workouts.find(w => w.id === id);
    if (!w) return;

    w.status = status;
    w.updatedAt = Date.now();
    saveWorkouts(workouts);
    renderWorkouts();
  };

  Workouts.addExercise = function (workoutId, name) {
    const workouts = loadWorkouts();
    const w = workouts.find(w => w.id === workoutId);
    if (!w) return;

    w.exercises.push({
      id: uuid(),
      name,
      sets: []
    });

    w.updatedAt = Date.now();
    saveWorkouts(workouts);
    renderWorkouts();
  };

  Workouts.logSet = function (workoutId, exerciseId, weight, reps) {
    const workouts = loadWorkouts();
    const w = workouts.find(w => w.id === workoutId);
    if (!w) return;

    const ex = w.exercises.find(e => e.id === exerciseId);
    if (!ex) return;

    const set = {
      weight: Number(weight),
      reps: Number(reps),
      time: Date.now()
    };

    ex.sets.push(set);
    w.sessions += 1;
    w.updatedAt = Date.now();

    saveWorkouts(workouts);

    // HISTORY
    const history = loadHistory();
    history.push({
      day: todayKey(),
      workoutId,
      exercise: ex.name,
      weight: set.weight,
      reps: set.reps
    });
    saveHistory(history);

    // PR SYSTEM
    const prs = loadPRs();
    const key = ex.name.toLowerCase();
    const volume = set.weight * set.reps;

    if (!prs[key] || volume > prs[key].volume) {
      prs[key] = {
        exercise: ex.name,
        weight: set.weight,
        reps: set.reps,
        volume,
        date: Date.now()
      };
      savePRs(prs);
    }

    renderWorkouts();
  };

  // ==========================
  // STREAK + XP + INSIGHTS
  // ==========================

  function calculateStreak() {
    const history = loadHistory();
    if (!history.length) return 0;

    const days = [...new Set(history.map(h => h.day))].sort((a, b) => b - a);
    let streak = 0;
    let expected = todayKey();

    for (let d of days) {
      if (d === expected) {
        streak++;
        expected -= 86400000;
      } else break;
    }

    return streak;
  }

  function calculateXP() {
    const workouts = loadWorkouts();
    return workouts.reduce((sum, w) => sum + w.sessions * 15, 0);
  }

  function generateInsights() {
    const history = loadHistory();
    if (!history.length) return "No training data yet.";

    const byExercise = {};
    history.forEach(h => {
      if (!byExercise[h.exercise]) byExercise[h.exercise] = 0;
      byExercise[h.exercise]++;
    });

    const topExercise = Object.entries(byExercise).sort((a, b) => b[1] - a[1])[0];

    const streak = calculateStreak();

    if (streak >= 5) return "🔥 You’re on a serious training streak.";
    if (topExercise) return `💡 You train "${topExercise[0]}" most often.`;
    return "Keep logging workouts to unlock insights.";
  }

  // ==========================
  // UI RENDER
  // ==========================

  function renderWorkouts() {
    const mount = ensureMount();
    if (!mount) return;

    const workouts = loadWorkouts();

    const current = workouts.filter(w => w.status === "current");
    const planned = workouts.filter(w => w.status === "planned");
    const completed = workouts.filter(w => w.status === "completed");

    const streak = calculateStreak();
    const xp = calculateXP();
    const insight = generateInsights();

    mount.innerHTML = `
      <div class="habit-section">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="section-title">💪 Currently Training</div>
          <button class="form-submit" id="addWorkoutBtn">Add Workout</button>
        </div>
        <div style="margin-top:6px; color:#9CA3AF;">
          🔥 Streak: <b>${streak}</b> days • ⚡ XP: <b>${xp}</b>
        </div>
        <div style="margin-top:6px; color:#a78bfa;">${insight}</div>
        ${current.length ? current.map(renderWorkoutCard).join("") : `<div style="color:#9CA3AF;">No active workouts.</div>`}
      </div>

      <div class="habit-section">
        <div class="section-title">🧩 Planned Workouts</div>
        ${planned.length ? planned.map(renderWorkoutCard).join("") : `<div style="color:#9CA3AF;">No planned workouts.</div>`}
      </div>

      <div class="habit-section">
        <div class="section-title">✅ Completed Workouts</div>
        ${completed.length ? completed.map(renderWorkoutCard).join("") : `<div style="color:#9CA3AF;">No completed workouts.</div>`}
      </div>

      <div class="habit-section">
        <div class="section-title">🏆 Personal Records</div>
        ${renderPRs()}
      </div>

      <div class="habit-section">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="section-title">📈 Strength Progress</div>
          <select id="exerciseSelect" class="form-input" style="width:auto;">
            ${getExerciseOptions()}
          </select>
        </div>
        <canvas id="strengthChart" height="140"></canvas>
      </div>
    `;

    bindEvents();
    renderChart();
  }

  function renderWorkoutCard(workout) {
    let buttons = "";

    if (workout.status === "planned") {
      buttons += `<button class="form-submit" data-action="move" data-id="${workout.id}" data-status="current">Start</button>`;
    }
    if (workout.status === "current") {
      buttons += `<button class="form-submit" data-action="addExercise" data-id="${workout.id}">Add Exercise</button>`;
      buttons += `<button class="form-submit" data-action="move" data-id="${workout.id}" data-status="completed">Finish</button>`;
    }

    buttons += `<button class="form-cancel" data-action="delete" data-id="${workout.id}" style="color:#ef4444;">Delete</button>`;

    return `
      <div class="idea-item" style="margin-top:10px;">
        <div style="font-weight:800;">${escapeHtml(workout.name)}</div>
        <div style="color:#9CA3AF;">${escapeHtml(workout.type || "")}</div>
        ${workout.exercises.map(ex => renderExercise(workout.id, ex)).join("")}
        <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
          ${buttons}
        </div>
      </div>
    `;
  }

  function renderExercise(workoutId, ex) {
    return `
      <div style="margin-top:6px; padding:8px; border-radius:10px; border:1px solid rgba(255,255,255,0.12);">
        <div style="font-weight:700;">${escapeHtml(ex.name)}</div>
        <div style="display:flex; gap:6px; margin-top:6px;">
          <input type="number" placeholder="Weight" class="form-input" style="width:80px;" data-w="${workoutId}" data-e="${ex.id}" data-type="weight">
          <input type="number" placeholder="Reps" class="form-input" style="width:70px;" data-w="${workoutId}" data-e="${ex.id}" data-type="reps">
          <button class="form-submit" data-action="logSet" data-w="${workoutId}" data-e="${ex.id}">Log</button>
        </div>
      </div>
    `;
  }

  function renderPRs() {
    const prs = loadPRs();
    const entries = Object.values(prs);
    if (!entries.length) return `<div style="color:#9CA3AF;">No PRs yet.</div>`;

    return entries.map(p => `
      <div class="idea-item" style="margin-top:6px;">
        🏆 <b>${escapeHtml(p.exercise)}</b> — ${p.weight} lbs × ${p.reps} reps
      </div>
    `).join("");
  }

  function getExerciseOptions() {
    const history = loadHistory();
    const exercises = [...new Set(history.map(h => h.exercise))];
    return exercises.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("");
  }

  // ==========================
  // EVENTS
  // ==========================

  function bindEvents() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    const addBtn = mount.querySelector("#addWorkoutBtn");
    if (addBtn) addBtn.onclick = openAddWorkoutModal;

    mount.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;

        if (action === "move") Workouts.moveWorkout(btn.dataset.id, btn.dataset.status);
        if (action === "delete") Workouts.deleteWorkout(btn.dataset.id);
        if (action === "addExercise") openAddExerciseModal(btn.dataset.id);
        if (action === "logSet") {
          const w = btn.dataset.w;
          const e = btn.dataset.e;
          const weight = mount.querySelector(`[data-w="${w}"][data-e="${e}"][data-type="weight"]`).value;
          const reps = mount.querySelector(`[data-w="${w}"][data-e="${e}"][data-type="reps"]`).value;
          Workouts.logSet(w, e, weight, reps);
        }
      };
    });
  }

  // ==========================
  // MODALS
  // ==========================

  function openAddWorkoutModal() {
    openModal(`
      <div class="section-title">Add Workout</div>
      <div class="form-group">
        <label>Name</label>
        <input id="workoutName" class="form-input">
      </div>
      <div class="form-group">
        <label>Type</label>
        <input id="workoutType" class="form-input">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="workoutStatus" class="form-input">
          <option value="planned">Planned</option>
          <option value="current">Currently Training</option>
        </select>
      </div>
      <div class="form-actions">
        <button class="form-submit" id="saveWorkout">Save</button>
        <button class="form-cancel" onclick="closeModal()">Cancel</button>
      </div>
    `);

    document.getElementById("saveWorkout").onclick = () => {
      Workouts.addWorkout(
        document.getElementById("workoutName").value,
        document.getElementById("workoutType").value,
        document.getElementById("workoutStatus").value
      );
      closeModal();
    };
  }

  function openAddExerciseModal(workoutId) {
    openModal(`
      <div class="section-title">Add Exercise</div>
      <div class="form-group">
        <label>Exercise Name</label>
        <input id="exerciseName" class="form-input">
      </div>
      <div class="form-actions">
        <button class="form-submit" id="saveExercise">Add</button>
        <button class="form-cancel" onclick="closeModal()">Cancel</button>
      </div>
    `);

    document.getElementById("saveExercise").onclick = () => {
      Workouts.addExercise(workoutId, document.getElementById("exerciseName").value);
      closeModal();
    };
  }

  // ==========================
  // CHART
  // ==========================

  function renderChart() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    const select = mount.querySelector("#exerciseSelect");
    const canvas = mount.querySelector("#strengthChart");
    if (!select || !canvas) return;

    const exercise = select.value;
    const history = loadHistory().filter(h => h.exercise === exercise);

    const labels = history.map(h => new Date(h.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    const data = history.map(h => h.weight * h.reps);

    if (chart) chart.destroy();

    chart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Volume (weight × reps)",
          data,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
      }
    });

    select.onchange = renderChart;
  }

  // ==========================
  // NAV HOOK
  // ==========================

  function hook() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(renderWorkouts, 120);
    });
  }

  function boot() {
    hook();
    setTimeout(renderWorkouts, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
