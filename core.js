/* =========================================================
   MAIN CORE (CLEANED — TODO SYSTEM REMOVED)
   - App controller intact
   - Weekly Planner ONLY (no daily todo system)
   - Navigation + Modal preserved
   - Life Engine compatible
   ========================================================= */

(function () {
  "use strict";

  // =====================================================
  // APP CONTROLLER
  // =====================================================
  window.App = window.App || {
    features: {},
    events: {},
    on(page, fn) {
      if (!this.events[page]) this.events[page] = [];
      this.events[page].push(fn);
    },
    trigger(page) {
      (this.events[page] || []).forEach((fn) => {
        try { fn(); } catch (e) { console.error(e); }
      });
    }
  };

  // =====================================================
  // HTML ESCAPE
  // =====================================================
  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
  window.escapeHtml = escapeHtml;

  // =====================================================
  // TIME
  // =====================================================
  function updateTime() {
    const now = new Date();
    const timeEl = document.getElementById("currentTime");
    const dateEl = document.getElementById("currentDate");

    if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (dateEl)
      dateEl.textContent = now.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
  }
  setInterval(updateTime, 1000);
  updateTime();

  // =====================================================
  // DATE HELPERS
  // =====================================================
  function pad2(n) { return String(n).padStart(2, "0"); }

  function toLocalISODate(date = new Date()) {
    return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;
  }

  function parseLocalISODate(k) {
    const [y,m,d] = k.split("-").map(Number);
    return new Date(y, m-1, d);
  }

  function getTodayKey() { return toLocalISODate(new Date()); }

  // =====================================================
  // NAVIGATION
  // =====================================================
  function showPage(page) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));

    const pageId = page + "Page";
    const el = document.getElementById(pageId);
    if (el) el.classList.add("active");

    localStorage.setItem("currentPage", page);

    if (page === "dashboard") {
      if (window.renderMoodTracker) window.renderMoodTracker();
      if (window.renderHabits) window.renderHabits();
      if (window.renderWeeklyPlanner) window.renderWeeklyPlanner();
      if (window.renderLifeScore) window.renderLifeScore();
      if (window.renderDNAProfile) window.renderDNAProfile();
      if (window.renderWeeklyGraph) window.renderWeeklyGraph();
      if (window.renderInsightsWidget) window.renderInsightsWidget();
      if (window.renderEmbeddedCalendar) window.renderEmbeddedCalendar();
    }

    try { window.App.trigger(page); } catch(e){}
  }

  window.showPage = showPage;

  // =====================================================
  // WEEKLY PLANNER SYSTEM
  // =====================================================
  const WEEKLY_PLANNER_KEY = "weeklyPlannerData";
  const WEEKLY_PLANNER_SELECTED_DAY_KEY = "weeklyPlannerSelectedDay";

  let weeklyPlannerData = {};
  let weeklyPlannerSelectedDay = null;

  function safeParse(raw, fallback) {
    try {
      const v = JSON.parse(raw);
      return v && typeof v === "object" ? v : fallback;
    } catch { return fallback; }
  }

  function getWeekStartKey(date) {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - d.getDay());
    return toLocalISODate(d);
  }

  function getWeekDatesFromStart(startKey) {
    const start = parseLocalISODate(startKey);
    const out = [];
    for (let i=0;i<7;i++){
      const d = new Date(start);
      d.setDate(start.getDate()+i);
      out.push(d);
    }
    return out;
  }

  function saveWeeklyPlanner() {
    localStorage.setItem(WEEKLY_PLANNER_KEY, JSON.stringify(weeklyPlannerData));
    localStorage.setItem(WEEKLY_PLANNER_SELECTED_DAY_KEY, weeklyPlannerSelectedDay);
  }

  function loadWeeklyPlanner() {
    weeklyPlannerData = safeParse(localStorage.getItem(WEEKLY_PLANNER_KEY), {});
    weeklyPlannerSelectedDay = localStorage.getItem(WEEKLY_PLANNER_SELECTED_DAY_KEY) || getTodayKey();
  }

  function getSelectedPlannerDayKey() {
    return weeklyPlannerSelectedDay || getTodayKey();
  }

  function ensureDay(dayKey) {
    const ws = getWeekStartKey(parseLocalISODate(dayKey));
    if (!weeklyPlannerData[ws]) weeklyPlannerData[ws] = { days:{} };
    if (!weeklyPlannerData[ws].days[dayKey])
      weeklyPlannerData[ws].days[dayKey] = { intentions:"", items:[] };
  }

  function renderWeeklyPlanner() {
    const container = document.getElementById("scheduleContainer");
    if (!container) return;

    const dayKey = getSelectedPlannerDayKey();
    ensureDay(dayKey);

    container.innerHTML = `<div style="font-weight:900;">Weekly Planner Active</div>`;
  }

  window.renderWeeklyPlanner = renderWeeklyPlanner;

  // =====================================================
  // BOOT
  // =====================================================
  document.addEventListener("DOMContentLoaded", () => {

    loadWeeklyPlanner();

    if (window.initHabitsData) window.initHabitsData();
    if (window.initMoodData) window.initMoodData();

    const lastPage = localStorage.getItem("currentPage") || "dashboard";
    showPage(lastPage);
  });

  console.log("Core cleaned. Weekly Planner only.");
})();
