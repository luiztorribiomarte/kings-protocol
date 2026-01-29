/* app.js
   boot/orchestration only
   (removes all duplicate declarations that caused: "Identifier 'todos' has already been declared")
*/

(function () {
  "use strict";

  function initFeaturesOnce() {
    const App = window.App;
    if (!App || !App.features) return;

    Object.keys(App.features).forEach((key) => {
      const f = App.features[key];
      if (!f || f.__inited) return;
      f.__inited = true;

      try {
        if (typeof f.init === "function") f.init();
      } catch (e) {
        console.error(`Feature init failed: ${key}`, e);
      }
    });
  }

  function renderFeaturesForDashboard() {
    const App = window.App;
    if (!App || !App.features) return;

    Object.keys(App.features).forEach((key) => {
      const f = App.features[key];
      if (!f) return;

      try {
        if (typeof f.render === "function") f.render();
      } catch (e) {
        console.error(`Feature render failed: ${key}`, e);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // load + migrate storage (todos/history/schedule)
    if (typeof window.__loadCoreStorage === "function") window.__loadCoreStorage();

    // daily resets (safe)
    if (typeof window.checkDailyTaskReset === "function") window.checkDailyTaskReset();
    if (typeof window.checkDailyScheduleReset === "function") window.checkDailyScheduleReset();

    // init features (habits/mood register here)
    initFeaturesOnce();

    // restore last page
    let lastPage = "dashboard";
    try {
      lastPage = localStorage.getItem("currentPage") || "dashboard";
    } catch {}

    if (typeof window.showPage === "function") {
      window.showPage(lastPage);
    } else {
      // fallback
      renderFeaturesForDashboard();
      if (typeof window.renderTodos === "function") window.renderTodos();
      if (typeof window.renderSchedule === "function") window.renderSchedule();
    }
  });
})();
