// =====================================================
// WORKOUTS INTELLIGENCE SYSTEM (BOOKS-STYLE REDESIGN)
// - Planned → Currently Training → Completed
// - Progress tracking + streaks + XP
// - Daily training logs + line chart
// - Mirrors Books system architecture
// - Safe mount (never breaks other features)
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "workoutsData";
  const HISTORY_KEY = "workoutsHistory";
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

  function loadWorkouts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveWorkouts(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveHistory(data) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
  }

  function uuid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function todayKey() {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d.getTime();
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;");
  }

  // ==========================
  // CORE ACTIONS
  // ==========================

  window.Workouts = window.Workouts || {};

  Workouts.addWorkout = function(name, type, status) {
    if (!name.trim()) return;

    const workouts = loadWorkouts();
    workouts.push({
      id: uuid(),
      name: name.trim(),
      type: type.trim(),
      sessions: 0,
      status: status || "planned",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    saveWorkouts(workouts);
    renderWorkouts();
  };

  Workouts.moveWorkout = function(id, status) {
    const workouts = loadWorkouts();
    const workout = workouts.find(w => w.id === id);
    if (!workout) return;

    workout.status = status;
    workout.updatedAt = Date.now();

    saveWorkouts(workouts);
    renderWorkouts();
  };

  Workouts.deleteWorkout = function(id) {
    const workouts = loadWorkouts().filter(w => w.id !== id);
    saveWorkouts(workouts);
    renderWorkouts();
  };

  Workouts.logSession = function(id) {
    const workouts = loadWorkouts();
    const workout = workouts.find(w => w.id === id);
    if (!workout) return;

    workout.sessions += 1;
    workout.updatedAt = Date.now();

    saveWorkouts(workouts);

    const history = loadHistory();
    history.push({
      workoutId: id,
      day: todayKey(),
      sessions: workout.sessions
    });
    saveHistory(history);

    renderWorkouts();
  };

  // ==========================
  // STREAK + XP
  // ==========================

  function calculateStreak() {
    const history = loadHistory();
    if (!history.length) return 0;

    const days = [...new Set(history.map(h => h.day))].sort((a,b)=>b-a);
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
    return workouts.reduce((sum,w)=>sum + w.sessions * 10, 0);
  }

  // ==========================
  // RENDER UI
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

    mount.innerHTML = `
      <div class="habit-section">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="section-title">💪 Currently Training</div>
          <button class="form-submit" id="addWorkoutBtn">Add Workout</button>
        </div>
        <div style="margin-top:6px; color:#9CA3AF;">
          🔥 Streak: <b>${streak} days</b> • ⚡ XP: <b>${xp}</b>
        </div>
        ${current.length ? current.map(renderWorkoutCard).join("") : `<div style="color:#9CA3AF;">No active workouts.</div>`}
      </div>

      <div class="habit-section">
        <div class="section-title">🧩 Planned Workouts</div>
        ${planned.length ? planned.map(renderWorkoutCard).join("") : `<div style="color:#9CA3AF;">No planned workouts.</div>`}
      </div>

      <div class="habit-section">
        <div class="section-title">✅ Completed Workouts</div>
        ${completed.length ? completed.map(renderWorkoutCard).join("") : `<div style="color:#9CA3AF;">No completed workouts yet.</div>`}
      </div>

      <div class="habit-section">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="section-title">📈 Training Progress</div>
          <select id="workoutSelect" class="form-input" style="width:auto;">
            ${current.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join("")}
          </select>
        </div>
        <canvas id="workoutChart" height="140"></canvas>
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
      buttons += `<button class="form-submit" data-action="log" data-id="${workout.id}">Log Session</button>`;
      buttons += `<button class="form-submit" data-action="move" data-id="${workout.id}" data-status="completed">Finish</button>`;
    }

    buttons += `<button class="form-cancel" data-action="delete" data-id="${workout.id}" style="color:#ef4444;">Delete</button>`;

    return `
      <div class="idea-item" style="margin-top:10px;">
        <div style="display:flex; justify-content:space-between; gap:10px;">
          <div>
            <div style="font-weight:800;">${escapeHtml(workout.name)}</div>
            <div style="color:#9CA3AF;">${escapeHtml(workout.type || "")}</div>
            <div style="color:#a78bfa;">Sessions: ${workout.sessions}</div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${buttons}
          </div>
        </div>
      </div>
    `;
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
        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === "move") Workouts.moveWorkout(id, btn.dataset.status);
        if (action === "delete") Workouts.deleteWorkout(id);
        if (action === "log") Workouts.logSession(id);
      };
    });
  }

  // ==========================
  // MODALS
  // ==========================

  function openAddWorkoutModal() {
    if (typeof openModal !== "function") return alert("Modal system missing.");

    openModal(`
      <div class="section-title">Add Workout</div>

      <div class="form-group">
        <label>Name</label>
        <input id="workoutName" class="form-input">
      </div>

      <div class="form-group">
        <label>Type (Push, Pull, Legs, etc.)</label>
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

  // ==========================
  // CHART
  // ==========================

  function renderChart() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    const select = mount.querySelector("#workoutSelect");
    const canvas = mount.querySelector("#workoutChart");
    if (!select || !canvas) return;

    const workoutId = select.value;
    const history = loadHistory().filter(h => h.workoutId === workoutId);

    const labels = history.map(h => new Date(h.day).toLocaleDateString(undefined,{month:"short",day:"numeric"}));
    const data = history.map(h => h.sessions);

    if (chart) chart.destroy();

    chart = new Chart(canvas, {
      type:"line",
      data:{
        labels,
        datasets:[{
          label:"Sessions",
          data,
          tension:0.35
        }]
      },
      options:{
        responsive:true,
        scales:{ y:{ beginAtZero:true } }
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
      setTimeout(renderWorkouts, 100);
    });
  }

  function boot() {
    hook();
    setTimeout(renderWorkouts, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
