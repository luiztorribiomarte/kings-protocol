// ============================================
// WORKOUT TEMPLATES (MODE B) — TODAY'S WORKOUT PLAN
// SAFE LAYER: does NOT modify workout.js
// Requirements:
// - workout.js must load before this (so ensureWorkoutUI + logWorkout inputs exist)
// - uses localStorage for daily plan persistence
// - auto-resets plan each new day
// ============================================

(function () {
  // -------- helpers --------
  function byId(id) {
    return document.getElementById(id);
  }

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function todayKey() {
    return new Date().toISOString().split("T")[0];
  }

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  // -------- storage --------
  const STORE_KEY = "workoutTodayPlan_v1";

  function loadPlan() {
    const plan = safeParse(localStorage.getItem(STORE_KEY) || "null", null);

    // auto-reset daily
    if (!plan || plan.date !== todayKey()) {
      const fresh = {
        date: todayKey(),
        template: null,
        items: [] // { name: string, done: boolean }
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(fresh));
      return fresh;
    }

    // normalize
    if (!Array.isArray(plan.items)) plan.items = [];
    return plan;
  }

  function savePlan(plan) {
    localStorage.setItem(STORE_KEY, JSON.stringify(plan));
  }

  // -------- templates --------
  const templates = {
    push: [
      "Bench Press",
      "Incline Press",
      "Shoulder Press",
      "Dips",
      "Tricep Extensions",
      "Lateral Raises"
    ],
    pull: [
      "Pull Ups",
      "Barbell Row",
      "Lat Pulldown",
      "Face Pulls",
      "Bicep Curls",
      "Hammer Curls"
    ],
    legs: [
      "Squat",
      "Romanian Deadlift",
      "Leg Press",
      "Leg Extension",
      "Hamstring Curl",
      "Calf Raises"
    ]
  };

  // -------- ui injection --------
  function ensureTemplatesUI() {
    // workout.js injects workoutLogPanel into exerciseCards.
    const logPanel = byId("workoutLogPanel");
    if (!logPanel) return false;

    if (byId("todayPlanPanel")) return true;

    const panel = document.createElement("div");
    panel.id = "todayPlanPanel";
    panel.className = "habit-section";
    panel.style.padding = "16px";
    panel.style.marginBottom = "16px";

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:10px;">
        <div class="section-title" style="margin:0;">Today’s Workout Plan</div>

        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button class="form-submit" style="padding:10px 12px; border-radius:12px;" onclick="setWorkoutTemplate('push')">Push</button>
          <button class="form-submit" style="padding:10px 12px; border-radius:12px;" onclick="setWorkoutTemplate('pull')">Pull</button>
          <button class="form-submit" style="padding:10px 12px; border-radius:12px;" onclick="setWorkoutTemplate('legs')">Legs</button>
          <button class="form-submit" style="padding:10px 12px; border-radius:12px; background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.18);" onclick="openAddPlanExercise()">Add</button>
        </div>
      </div>

      <div id="todayPlanMeta" style="color:#9ca3af; font-size:0.9rem; margin-bottom:10px;">—</div>

      <div id="todayPlanList" style="display:flex; flex-direction:column; gap:8px;"></div>

      <div style="margin-top:10px; color:#9ca3af; font-size:0.88rem;">
        Tip: click an exercise to auto-fill the log form. Logging it will mark it complete.
      </div>
    `;

    // insert directly under the Log Workout panel
    logPanel.parentNode.insertBefore(panel, logPanel.nextSibling);

    renderPlanUI();
    return true;
  }

  function renderPlanUI() {
    const plan = loadPlan();

    const meta = byId("todayPlanMeta");
    const list = byId("todayPlanList");

    if (meta) {
      const done = plan.items.filter(i => i.done).length;
      const total = plan.items.length;

      const name = plan.template ? plan.template.toUpperCase() : "CUSTOM";
      meta.textContent = `${name} • ${done}/${total} completed • resets daily`;
    }

    if (!list) return;

    if (!plan.items.length) {
      list.innerHTML = `
        <div style="color:#9ca3af; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.03);">
          No plan set for today. Tap Push / Pull / Legs to generate one, or Add to build a custom plan.
        </div>
      `;
      return;
    }

    list.innerHTML = plan.items.map((item, idx) => {
      const doneStyle = item.done
        ? "text-decoration:line-through; color:rgba(255,255,255,0.55);"
        : "color:white;";

      const border = item.done
        ? "border:1px solid rgba(34,197,94,0.25); background:rgba(34,197,94,0.06);"
        : "border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.03);";

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 12px; border-radius:12px; ${border}">
          <div style="display:flex; align-items:center; gap:10px; flex:1;">
            <div style="min-width:22px;">${item.done ? "✅" : "○"}</div>
            <div style="font-weight:900; cursor:pointer; ${doneStyle}" onclick="fillWorkoutExercise(${idx})">
              ${esc(item.name)}
            </div>
          </div>

          <div style="display:flex; gap:8px; align-items:center;">
            <button
              style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.14); color:white; padding:8px 10px; border-radius:10px; cursor:pointer;"
              onclick="togglePlanDone(${idx})"
              title="Mark done/undone"
            >
              Toggle
            </button>

            <button
              style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.25); color:#ffd1d1; padding:8px 10px; border-radius:10px; cursor:pointer;"
              onclick="removePlanExercise(${idx})"
              title="Remove"
            >
              ✕
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  // -------- public actions (onclick handlers) --------
  window.setWorkoutTemplate = function (type) {
    const base = templates[type];
    if (!base) return;

    const plan = loadPlan();
    plan.template = type;
    plan.items = base.map(name => ({ name, done: false }));
    savePlan(plan);
    renderPlanUI();
  };

  window.openAddPlanExercise = function () {
    if (typeof window.openModal !== "function") {
      const name = prompt("Exercise name to add to today’s plan:");
      if (name && name.trim()) {
        addExerciseToPlan(name.trim());
      }
      return;
    }

    window.openModal(`
      <h2 style="color:white; margin-bottom:14px;">Add Exercise to Today’s Plan</h2>

      <div class="form-group">
        <label style="color:#d1d5db; font-weight:800;">Exercise</label>
        <input id="planExerciseName" class="form-input" placeholder="e.g. Incline Dumbbell Press" />
      </div>

      <div style="display:flex; gap:10px; margin-top:14px;">
        <button class="form-submit" style="flex:1;" onclick="savePlanExerciseFromModal()">Add</button>
        <button class="form-cancel" style="flex:1;" onclick="closeModal()">Cancel</button>
      </div>
    `);
  };

  window.savePlanExerciseFromModal = function () {
    const input = byId("planExerciseName");
    const name = input ? input.value.trim() : "";
    if (!name) return;

    addExerciseToPlan(name);
    if (typeof window.closeModal === "function") window.closeModal();
  };

  function addExerciseToPlan(name) {
    const plan = loadPlan();
    plan.template = plan.template || "custom";

    plan.items.push({ name, done: false });
    savePlan(plan);
    renderPlanUI();
  }

  window.removePlanExercise = function (idx) {
    const plan = loadPlan();
    if (!plan.items[idx]) return;

    plan.items.splice(idx, 1);
    savePlan(plan);
    renderPlanUI();
  };

  window.togglePlanDone = function (idx) {
    const plan = loadPlan();
    if (!plan.items[idx]) return;

    plan.items[idx].done = !plan.items[idx].done;
    savePlan(plan);
    renderPlanUI();
  };

  window.fillWorkoutExercise = function (idx) {
    const plan = loadPlan();
    const item = plan.items[idx];
    if (!item) return;

    const nameEl = byId("exerciseName");
    if (nameEl) {
      nameEl.value = item.name;
      nameEl.focus();
    }
  };

  // -------- auto-mark done after logging --------
  function markDoneIfMatchesLoggedExercise() {
    const nameEl = byId("exerciseName");
    // workout.js clears the inputs after logging; so we capture BEFORE logging via wrapper.
    // this function is used in the wrapper with captured name.
  }

  function patchLogWorkout() {
    if (typeof window.logWorkout !== "function") return false;
    if (window.logWorkout.__kpPlanWrapped) return true;

    const original = window.logWorkout;

    const wrapped = function () {
      // capture exercise name before workout.js clears it
      const nameEl = byId("exerciseName");
      const exerciseName = nameEl ? String(nameEl.value || "").trim() : "";

      const res = original.apply(this, arguments);

      if (exerciseName) {
        const plan = loadPlan();
        const idx = plan.items.findIndex(i => i.name.toLowerCase() === exerciseName.toLowerCase());
        if (idx >= 0) {
          plan.items[idx].done = true;
          savePlan(plan);
          renderPlanUI();
        }
      }

      return res;
    };

    wrapped.__kpPlanWrapped = true;
    window.logWorkout = wrapped;
    return true;
  }

  // -------- boot safely --------
  function boot() {
    try {
      ensureTemplatesUI();
      patchLogWorkout();
      renderPlanUI();
    } catch (e) {
      console.error("workoutTemplates boot failed:", e);
    }
  }

  // keep trying until workout.js has injected the UI and logWorkout exists
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    const okUI = ensureTemplatesUI();
    const okWrap = patchLogWorkout();
    if (okUI && okWrap) {
      renderPlanUI();
      clearInterval(timer);
    }
    if (tries > 40) clearInterval(timer);
  }, 200);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // also refresh on focus (in case date changed at midnight)
  window.addEventListener("focus", () => {
    try {
      ensureTemplatesUI();
      renderPlanUI();
    } catch {}
  });
})();
