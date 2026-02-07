// =====================================================
// KINGS PROTOCOL — WORKOUT SYSTEM (WITH ARCHIVE GROUPING)
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "kp_workouts_v2";
  const UI_STATE_KEY = "kp_workouts_ui_v2";
  const MOUNT_ID = "kpWorkoutMount_v2";

  let weeklyChart = null;
  let exerciseChart = null;

  // -----------------------------
  // Helpers
  // -----------------------------
  function byId(id) {
    return document.getElementById(id);
  }

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function load(key, fallback) {
    return safeParse(localStorage.getItem(key), fallback);
  }

  function uuid() {
    return Math.random().toString(36).slice(2) + Date.now();
  }

  function todayISO() {
    return new Date().toISOString().split("T")[0];
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function formatDay(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
  }

  function getMonthKey(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function formatMonth(key) {
    const [y, m] = key.split("-");
    return new Date(y, m - 1).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long"
    });
  }

  // -----------------------------
  // Data
  // -----------------------------
  function loadWorkouts() {
    return load(STORAGE_KEY, []);
  }

  function saveWorkouts(w) {
    save(STORAGE_KEY, w);
  }

  function loadUI() {
    return load(UI_STATE_KEY, {
      archiveOpen: {},
      completedSearch: "",
      exerciseChartExercise: "",
      exerciseChartMetric: "1rm"
    });
  }

  function saveUI(s) {
    save(UI_STATE_KEY, s);
  }

  // -----------------------------
  // Mount
  // -----------------------------
  function ensureMount() {
    const host = byId("exerciseCards");
    if (!host) return null;

    let m = byId(MOUNT_ID);
    if (m) return m;

    m = document.createElement("div");
    m.id = MOUNT_ID;
    host.prepend(m);

    return m;
  }

  function isActive() {
    return byId("workoutPage")?.classList.contains("active");
  }

  // -----------------------------
  // Navigation Hook
  // -----------------------------
  function hookNav() {
    if (!window.showPage || window.showPage.__kp) return;

    const orig = window.showPage;

    window.showPage = function (p) {
      const r = orig.apply(this, arguments);

      if (p === "workout") {
        setTimeout(render, 60);
      }

      return r;
    };

    window.showPage.__kp = true;
  }

  // -----------------------------
  // Group Completed By Month
  // -----------------------------
  function groupCompleted(workouts, search) {
    const groups = {};

    workouts.forEach(w => {
      if (search && !w.name.toLowerCase().includes(search)) return;

      const date =
        w.updatedAt
          ? new Date(w.updatedAt).toISOString().split("T")[0]
          : todayISO();

      const key = getMonthKey(date);

      if (!groups[key]) groups[key] = [];

      groups[key].push(w);
    });

    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]));
  }

  // -----------------------------
  // Core Render
  // -----------------------------
  function render() {
    const mount = ensureMount();
    if (!mount) return;

    const workouts = loadWorkouts();
    const ui = loadUI();

    const current = workouts.filter(w => w.status === "current");
    const planned = workouts.filter(w => w.status === "planned");
    const completed = workouts.filter(w => w.status === "completed");

    const completedGroups = groupCompleted(
      completed,
      ui.completedSearch.toLowerCase()
    );

    mount.innerHTML = `
    <div class="habit-section" style="padding:18px;margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="section-title">Workouts</div>

        <div style="display:flex;gap:10px;">
          <button class="form-submit" id="kpAddWorkoutBtn">Add workout</button>
        </div>
      </div>
    </div>

    <div class="habit-section" style="padding:18px;margin-bottom:18px;">
      <div class="section-title">Currently training</div>

      ${
        current.length
          ? current.map(renderWorkoutCard).join("")
          : `<div style="color:#9ca3af;">No active workouts.</div>`
      }
    </div>

    <div class="habit-section" style="padding:18px;margin-bottom:18px;">
      <div class="section-title">Planned workouts</div>

      ${
        planned.length
          ? planned.map(renderWorkoutCard).join("")
          : `<div style="color:#9ca3af;">No planned workouts.</div>`
      }
    </div>

    <div class="habit-section" style="padding:18px;margin-bottom:18px;">

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div class="section-title">Workouts completed</div>
      </div>

      <input
        id="kpCompletedSearch"
        class="form-input"
        placeholder="Search completed workouts..."
        value="${escapeHtml(ui.completedSearch)}"
        style="margin-bottom:14px;"
      />

      ${
        completedGroups.length
          ? completedGroups.map(([month, list]) =>
              renderCompletedGroup(month, list, ui)
            ).join("")
          : `<div style="color:#9ca3af;">No completed workouts.</div>`
      }

    </div>
    `;

    bindTop();
    bindArchive();
  }

  // -----------------------------
  // Completed Month Group
  // -----------------------------
  function renderCompletedGroup(month, list, ui) {
    const open = ui.archiveOpen[month] !== false;

    return `
    <div style="margin-bottom:14px;border:1px solid rgba(255,255,255,0.12);border-radius:14px;overflow:hidden;">

      <div
        class="kp-archive-header"
        data-month="${month}"
        style="cursor:pointer;padding:12px 14px;background:rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center;"
      >
        <div style="font-weight:900;">
          ${formatMonth(month)} (${list.length})
        </div>

        <div style="font-size:1.1rem;">
          ${open ? "▼" : "▶"}
        </div>
      </div>

      <div style="display:${open ? "block" : "none"};padding:12px;">
        ${list.map(renderWorkoutCard).join("")}
      </div>

    </div>
    `;
  }

  // -----------------------------
  // Workout Card (unchanged)
  // -----------------------------
  function renderWorkoutCard(w) {
    return `
    <div class="idea-item" style="margin-bottom:10px;">

      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">

        <div>
          <div style="font-weight:900;">${escapeHtml(w.name)}</div>
          <div style="color:#9ca3af;font-size:0.85rem;">${escapeHtml(w.type || "")}</div>
        </div>

        <div style="display:flex;gap:8px;">
          ${
            w.status === "completed"
              ? `<button class="form-submit" data-action="reopen" data-id="${w.id}">Re-open</button>`
              : ""
          }

          <button class="form-cancel" data-action="delete" data-id="${w.id}" style="color:#ef4444;">
            Delete
          </button>
        </div>

      </div>

    </div>
    `;
  }

  // -----------------------------
  // Bindings
  // -----------------------------
  function bindTop() {
    const btn = byId("kpAddWorkoutBtn");

    if (btn) btn.onclick = () => {
      window.KPWorkouts?.addWorkout("New Workout", "", "planned");
    };

    const search = byId("kpCompletedSearch");

    if (search) {
      search.oninput = () => {
        const ui = loadUI();
        ui.completedSearch = search.value;
        saveUI(ui);
        render();
      };
    }
  }

  function bindArchive() {
    document.querySelectorAll(".kp-archive-header").forEach(h => {
      h.onclick = () => {
        const m = h.dataset.month;
        const ui = loadUI();

        ui.archiveOpen[m] = ui.archiveOpen[m] === false ? true : false;

        saveUI(ui);
        render();
      };
    });

    document.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;

        const workouts = loadWorkouts();

        if (action === "delete") {
          saveWorkouts(workouts.filter(w => w.id !== id));
          render();
        }

        if (action === "reopen") {
          const w = workouts.find(x => x.id === id);
          if (w) w.status = "current";
          saveWorkouts(workouts);
          render();
        }
      };
    });
  }

  // -----------------------------
  // Boot
  // -----------------------------
  function boot() {
    hookNav();

    setTimeout(() => {
      if (isActive()) render();
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
