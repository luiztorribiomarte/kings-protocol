// ============================================
// WORKOUT PLAN SYSTEM — BOOKS PAGE STYLE
// Sections: Planned → Completed
// ============================================

(function () {
  const KEY = "kp_workout_plan";

  function loadPlan() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { planned: [], completed: [] };
    } catch {
      return { planned: [], completed: [] };
    }
  }

  function savePlan(plan) {
    localStorage.setItem(KEY, JSON.stringify(plan));
  }

  function ensureUI() {
    const mount = document.getElementById("workoutsMount");
    if (!mount || document.getElementById("workoutPlanPanel")) return;

    const panel = document.createElement("div");
    panel.id = "workoutPlanPanel";
    panel.className = "habit-section";
    panel.style.marginBottom = "20px";
    panel.style.padding = "16px";

    panel.innerHTML = `
      <div class="section-title">Workout Plan</div>

      <div style="margin-top:10px;">
        <div style="font-weight:900; margin-bottom:6px;">Planned</div>
        <div id="plannedList"></div>
        <button class="form-submit" style="margin-top:8px;" onclick="addPlannedExercise()">+ Add Exercise</button>
      </div>

      <div style="margin-top:16px;">
        <div style="font-weight:900; margin-bottom:6px;">Completed</div>
        <div id="completedList"></div>
      </div>
    `;

    mount.prepend(panel);
    render();
  }

  function render() {
    const plan = loadPlan();
    const planned = document.getElementById("plannedList");
    const completed = document.getElementById("completedList");

    planned.innerHTML = plan.planned.map((e, i) => `
      <div style="display:flex; justify-content:space-between; padding:8px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); margin-bottom:6px;">
        <span>${e}</span>
        <div style="display:flex; gap:6px;">
          <button class="form-submit" onclick="markCompleted(${i})">Done</button>
          <button class="form-cancel" onclick="deletePlanned(${i})">Delete</button>
        </div>
      </div>
    `).join("");

    completed.innerHTML = plan.completed.map((e, i) => `
      <div style="display:flex; justify-content:space-between; padding:8px; border-radius:10px; border:1px solid rgba(34,197,94,0.25); background:rgba(34,197,94,0.05); margin-bottom:6px;">
        <span>${e}</span>
        <button class="form-cancel" onclick="deleteCompleted(${i})">Delete</button>
      </div>
    `).join("");
  }

  window.addPlannedExercise = function () {
    const name = prompt("Exercise name:");
    if (!name) return;
    const plan = loadPlan();
    plan.planned.push(name.trim());
    savePlan(plan);
    render();
  };

  window.markCompleted = function (index) {
    const plan = loadPlan();
    const ex = plan.planned.splice(index, 1)[0];
    plan.completed.push(ex);
    savePlan(plan);
    render();
  };

  window.deletePlanned = function (index) {
    const plan = loadPlan();
    plan.planned.splice(index, 1);
    savePlan(plan);
    render();
  };

  window.deleteCompleted = function (index) {
    const plan = loadPlan();
    plan.completed.splice(index, 1);
    savePlan(plan);
    render();
  };

  function boot() {
    ensureUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
