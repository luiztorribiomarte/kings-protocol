// ============================================
// HARDCORE MODE — DISCIPLINE ENFORCEMENT
// File: features/hardcoreMode.js
// Enforces penalties when standards drop
// ============================================

(function () {
  "use strict";

  const MODE_KEY = "kp_hardcore_state";
  const PANEL_ID = "hardcoreBanner";

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

  // ---------- Standards ----------
  const LIMITS = {
    habits: 70,
    energy: 50,
    tasks: 60
  };

  // ---------- Core ----------
  function evaluate() {
    const d = todayKey();

    const habits = getHabitPct(d);
    const energy = getEnergyPct(d);
    const tasks = getTaskPct(d);

    const failed =
      habits < LIMITS.habits ||
      energy < LIMITS.energy ||
      tasks < LIMITS.tasks;

    const state = {
      date: d,
      habits,
      energy,
      tasks,
      failed
    };

    localStorage.setItem(MODE_KEY, JSON.stringify(state));

    applyState(state);
  }

  // ---------- UI Enforcement ----------
  function applyState(state) {
    const body = document.body;

    removeBanner();

    if (!state.failed) {
      body.classList.remove("hardcore-fail");
      return;
    }

    body.classList.add("hardcore-fail");

    injectBanner(state);
    lockWidgets();
  }

  function injectBanner(state) {
    const dash = document.getElementById("dashboardPage");
    if (!dash) return;

    const banner = document.createElement("div");
    banner.id = PANEL_ID;

    banner.style.padding = "14px";
    banner.style.marginBottom = "14px";
    banner.style.borderRadius = "14px";
    banner.style.border = "1px solid rgba(239,68,68,0.4)";
    banner.style.background = "rgba(239,68,68,0.08)";
    banner.style.color = "#FCA5A5";
    banner.style.fontWeight = "900";

    banner.innerHTML = `
      ⚠ HARDCORE MODE ACTIVE

      <div style="margin-top:6px;font-size:0.85rem;color:#FECACA;font-weight:600;">
        Habits: ${state.habits}% |
        Energy: ${state.energy}% |
        Tasks: ${state.tasks}%
      </div>

      <div style="margin-top:6px;font-size:0.8rem;color:#F87171;">
        Standards not met. Privileges restricted.
      </div>
    `;

    dash.prepend(banner);
  }

  function removeBanner() {
    const old = document.getElementById(PANEL_ID);
    if (old) old.remove();
  }

  function lockWidgets() {
    const blocked = [
      "#insightsWidget",
      "#visionBoardContainer",
      "#contentContainer"
    ];

    blocked.forEach(sel => {
      const el = document.querySelector(sel);
      if (!el) return;

      el.style.opacity = "0.35";
      el.style.pointerEvents = "none";
      el.style.filter = "grayscale(1)";
    });
  }

  function unlockWidgets() {
    const blocked = [
      "#insightsWidget",
      "#visionBoardContainer",
      "#contentContainer"
    ];

    blocked.forEach(sel => {
      const el = document.querySelector(sel);
      if (!el) return;

      el.style.opacity = "";
      el.style.pointerEvents = "";
      el.style.filter = "";
    });
  }

  // ---------- Reactive ----------
  function refresh() {
    try {
      const raw = JSON.parse(localStorage.getItem(MODE_KEY) || "{}");
      if (!raw.failed) unlockWidgets();
    } catch {}

    evaluate();
  }

  ["storage","todosUpdated","habitsUpdated","moodUpdated","plannerUpdated"].forEach(evt => {
    window.addEventListener(evt, refresh);
  });

  // ---------- Boot ----------
  function boot() {
    refresh();
    setInterval(refresh, 60000); // check every minute
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  console.log("Hardcore Mode engaged");
})();
