// ============================================
// HABIT BRIDGE (source of truth for dashboard)
// - Provides getDayCompletion() for app.js Life Score
// - Keeps localStorage currentStreak in sync
// - Forces dashboard refresh after habits change
// ============================================

(function () {
  // Helpers
  function todayKey() {
    return new Date().toISOString().split("T")[0];
  }

  function safeNumber(n) {
    return Number.isFinite(n) ? n : 0;
  }

  // 1) Expose a stable API used by app.js (Life Score)
  //    app.js calls getDayCompletion() with NO args.
  window.getDayCompletion = function (dateStr) {
    try {
      // habits + habitCompletions are defined in features/habits.js
      if (!Array.isArray(window.habits) || window.habits.length === 0) {
        return { percent: 0, done: 0, total: 0 };
      }

      const key = dateStr || todayKey();
      const total = window.habits.length;

      // isComplete() exists in habits.js; fallback if missing
      const done = window.habits.reduce((sum, h) => {
        const id = h?.id;
        if (!id) return sum;

        if (typeof window.isComplete === "function") {
          return sum + (window.isComplete(id, key) ? 1 : 0);
        }

        // fallback read directly
        const map = window.habitCompletions || {};
        return sum + (map[key] && map[key][id] ? 1 : 0);
      }, 0);

      const percent = total === 0 ? 0 : Math.round((done / total) * 100);

      return { percent, done, total };
    } catch (e) {
      return { percent: 0, done: 0, total: 0 };
    }
  };

  // 2) Wrap updateStats() so it ALSO:
  //    - saves currentStreak to localStorage (Life Score reads this)
  //    - refreshes Life Score + other dashboard cards after habit changes
  if (typeof window.updateStats === "function" && !window.__statsWrapped) {
    window.__statsWrapped = true;

    const originalUpdateStats = window.updateStats;

    window.updateStats = function () {
      // run original stats (daysAt80, weeklyCompletion, currentStreak UI)
      try {
        originalUpdateStats();
      } catch {}

      // sync streak to localStorage so Life Score uses the real number
      try {
        let streak = 0;

        // habits.js has calculateCurrentStreak()
        if (typeof window.calculateCurrentStreak === "function") {
          streak = safeNumber(window.calculateCurrentStreak());
        } else {
          // fallback read from UI if present
          const el = document.getElementById("currentStreak");
          streak = safeNumber(parseInt(el?.textContent || "0", 10));
        }

        localStorage.setItem("currentStreak", String(streak));
      } catch {}

      // refresh dashboard modules that depend on habits
      try {
        if (typeof window.renderLifeScore === "function") window.renderLifeScore();
      } catch {}

      try {
        if (typeof window.renderInsights === "function") window.renderInsights();
      } catch {}

      try {
        if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
      } catch {}

      try {
        if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();
      } catch {}
    };
  }

  // 3) On load, make sure streak + life score are synced once
  document.addEventListener("DOMContentLoaded", () => {
    try {
      if (typeof window.updateStats === "function") window.updateStats();
    } catch {}
  });
})();
