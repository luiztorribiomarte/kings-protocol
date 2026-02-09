// ============================================
// OPTIMIZATION COACH — AUTO PERFORMANCE GUIDANCE
// File: features/optimizationCoach.js
// Detects weakest pillar and prescribes fixes
// ============================================

(function () {
  "use strict";

  const PANEL_ID = "optimizationCoachPanel";

  // ---------- Helpers ----------
  function todayKey() {
    return new Date().toISOString().split("T")[0];
  }

  function safeNum(n) {
    return typeof n === "number" && !isNaN(n) ? n : 0;
  }

  function getHabitPct(day) {
    try {
      if (typeof window.getDayCompletion === "function") {
        return safeNum(window.getDayCompletion(day)?.percent || 0);
      }
    } catch {}
    return 0;
  }

  function getEnergyPct(day) {
    try {
      const mood = JSON.parse(localStorage.getItem("moodData") || "{}");
      const e = mood?.[day]?.energy || 0;
      return Math.round((e / 10) * 100);
    } catch {}
    return 0;
  }

  function getTaskPct(day) {
    try {
      const hist = JSON.parse(localStorage.getItem("todoHistory") || "{}");
      if (hist?.[day]?.percent != null) return hist[day].percent;
    } catch {}

    if (day === todayKey()) {
      try {
        const todos = JSON.parse(localStorage.getItem("todos") || "[]");
        if (!todos.length) return 0;
        const done = todos.filter(t => t.done).length;
        return Math.round((done / todos.length) * 100);
      } catch {}
    }

    return 0;
  }

  // ---------- Core ----------
  function analyze() {
    const d = todayKey();

    const habits = getHabitPct(d);
    const energy = getEnergyPct(d);
    const tasks = getTaskPct(d);

    const pillars = [
      { key: "habits", value: habits },
      { key: "energy", value: energy },
      { key: "tasks", value: tasks }
    ];

    pillars.sort((a, b) => a.value - b.value);

    return {
      date: d,
      weakest: pillars[0],
      pillars
    };
  }

  function prescription(result) {
    const w = result.weakest;

    if (w.key === "habits") {
      return {
        title: "DISCIPLINE FAILURE",
        action: "Complete remaining habits immediately",
        steps: [
          "Open Habits tab",
          "Finish all critical habits",
          "Recheck score in 30 min"
        ]
      };
    }

    if (w.key === "energy") {
      return {
        title: "ENERGY DEFICIT",
        action: "Recover physical system",
        steps: [
          "Drink water",
          "10-min walk",
          "Deep breathing",
          "Early sleep"
        ]
      };
    }

    if (w.key === "tasks") {
      return {
        title: "EXECUTION GAP",
        action: "Clear unfinished tasks",
        steps: [
          "Select top task",
          "Finish it now",
          "Mark complete",
          "Repeat"
        ]
      };
    }

    return null;
  }

  // ---------- UI ----------
  function render() {
    const dash = document.getElementById("dashboardPage");
    if (!dash) return;

    remove();

    const result = analyze();
    const plan = prescription(result);
    if (!plan) return;

    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    panel.style.marginBottom = "14px";
    panel.style.padding = "16px";
    panel.style.borderRadius = "16px";
    panel.style.border = "1px solid rgba(99,102,241,0.3)";
    panel.style.background = "rgba(99,102,241,0.06)";

    panel.innerHTML = `
      <div style="font-weight:900;color:#A5B4FC;">
        ⚡ OPTIMIZATION COACH
      </div>

      <div style="margin-top:6px;font-weight:900;">
        ${plan.title}
      </div>

      <div style="margin-top:6px;color:#E5E7EB;">
        Primary action: <strong>${plan.action}</strong>
      </div>

      <ul style="margin-top:8px;padding-left:18px;color:#CBD5F5;font-size:0.9rem;">
        ${plan.steps.map(s => `<li>${s}</li>`).join("")}
      </ul>
    `;

    dash.prepend(panel);
  }

  function remove() {
    const old = document.getElementById(PANEL_ID);
    if (old) old.remove();
  }

  // ---------- Reactive ----------
  function refresh() {
    render();
  }

  ["storage","todosUpdated","habitsUpdated","moodUpdated","plannerUpdated"].forEach(evt => {
    window.addEventListener(evt, refresh);
  });

  // ---------- Boot ----------
  function boot() {
    refresh();
    setInterval(refresh, 120000); // every 2 min
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  console.log("Optimization Coach online");
})();
