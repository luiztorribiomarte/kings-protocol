// features/boot.js
// Safe feature loader for Kings Protocol (does NOT touch app.js)

(function () {
  if (window.__KP_BOOT_LOADED__) return;
  window.__KP_BOOT_LOADED__ = true;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.defer = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // Load future features safely (we will add them one by one)
  Promise.resolve()
    .then(() => console.log("KP Boot loaded"))
    .catch((e) => console.warn("KP boot error:", e));

  // Patch showPage safely (without breaking your existing logic)
  const waitForShowPage = setInterval(() => {
    if (typeof window.showPage === "function") {
      clearInterval(waitForShowPage);

      if (window.__KP_SHOWPAGE_PATCHED__) return;
      window.__KP_SHOWPAGE_PATCHED__ = true;

      const originalShowPage = window.showPage;

      window.showPage = function (page) {
        originalShowPage(page);

        try {
          if (page === "dashboard") {
            if (typeof window.renderKingDashboard === "function") window.renderKingDashboard();
            if (typeof window.renderShadowCoachPanel === "function") window.renderShadowCoachPanel();
          }

          if (page === "goalsHabits") {
            if (typeof window.renderHabitIntelligence === "function") window.renderHabitIntelligence();
          }

          if (page === "visionBoard") {
            if (typeof window.renderLifeNarrative === "function") window.renderLifeNarrative();
          }
        } catch (e) {
          console.warn("KP feature render error:", e);
        }
      };
    }
  }, 50);
})();
