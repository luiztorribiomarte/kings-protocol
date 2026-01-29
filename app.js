// =====================================
// APP CORE CONTROLLER
// =====================================

window.App = window.App || {
  features: {},
  events: {},
  on(page, fn) {
    if (!this.events[page]) this.events[page] = [];
    this.events[page].push(fn);
  },
  trigger(page) {
    (this.events[page] || []).forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error("App trigger error:", e);
      }
    });
  }
};

// -------------------------------------
// PAGE NAVIGATION
// -------------------------------------

function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));

  const map = {
    dashboard: 1,
    workout: 2,
    looksmaxxing: 3,
    journal: 4,
    visionBoard: 5,
    content: 6,
    books: 7
  };

  const pageId = page + "Page";
  const el = document.getElementById(pageId);
  if (el) el.classList.add("active");

  const tab = document.querySelector(`.nav-tab:nth-child(${map[page]})`);
  if (tab) tab.classList.add("active");

  // trigger feature renders
  App.trigger(page);

  // dashboard-specific renders (RESTORED)
  if (page === "dashboard") {
    if (typeof initHabitsData === "function") initHabitsData();
    if (typeof renderHabits === "function") renderHabits();

    if (typeof renderMoodTracker === "function") renderMoodTracker();
    if (typeof renderLifeScore === "function") renderLifeScore();
    if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
    if (typeof renderDNAProfile === "function") renderDNAProfile();
    if (typeof renderDashboardTrendChart === "function") renderDashboardTrendChart();
    if (typeof renderSchedule === "function") renderSchedule();
  }

  if (page === "looksmaxxing") {
    if (typeof renderLooksMaxxing === "function") renderLooksMaxxing();
  }
}

// -------------------------------------
// APP BOOT
// -------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  try {
    if (typeof initHabitsData === "function") initHabitsData();
    if (typeof renderHabits === "function") renderHabits();

    if (typeof renderSchedule === "function") renderSchedule();

    if (typeof renderMoodTracker === "function") renderMoodTracker();
    if (typeof renderLifeScore === "function") renderLifeScore();
    if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
    if (typeof renderDNAProfile === "function") renderDNAProfile();
    if (typeof renderDashboardTrendChart === "function") renderDashboardTrendChart();
  } catch (e) {
    console.error("App boot error:", e);
  }
});
