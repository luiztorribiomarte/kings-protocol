// features/habit-intelligence.js
// Adds Habit Intelligence WITHOUT modifying existing habit logic

(function () {
  if (window.__KP_HABIT_INTELLIGENCE__) return;
  window.__KP_HABIT_INTELLIGENCE__ = true;

  function safe(fn) {
    try { fn(); } catch (e) { console.warn("Habit Intelligence error:", e); }
  }

  function getHabitData() {
    try {
      const raw = localStorage.getItem("habits");
      const habits = JSON.parse(raw || "[]");
      return Array.isArray(habits) ? habits : [];
    } catch {
      return [];
    }
  }

  function getHabitHistory() {
    try {
      const raw = localStorage.getItem("habitHistory");
      const data = JSON.parse(raw || "{}");
      return typeof data === "object" && data !== null ? data : {};
    } catch {
      return {};
    }
  }

  function calculateHabitStats() {
    const habits = getHabitData();
    const history = getHabitHistory();

    const today = new Date().toISOString().split("T")[0];

    let total = habits.length;
    let completedToday = 0;
    let streaks = [];
    let consistencyScores = [];

    habits.forEach(h => {
      const id = h.id || h.name || h.title;
      const days = history[id] || {};

      if (days[today]) completedToday++;

      let streak = 0;
      let d = new Date();
      for (let i = 0; i < 30; i++) {
        const key = d.toISOString().split("T")[0];
        if (days[key]) streak++;
        else break;
        d.setDate(d.getDate() - 1);
      }

      streaks.push(streak);

      const last14 = [];
      let d2 = new Date();
      for (let i = 0; i < 14; i++) {
        const key = d2.toISOString().split("T")[0];
        last14.push(days[key] ? 1 : 0);
        d2.setDate(d2.getDate() - 1);
      }

      const consistency = last14.reduce((a, b) => a + b, 0) / 14;
      consistencyScores.push(consistency);
    });

    const avgStreak = streaks.length ? Math.round(streaks.reduce((a, b) => a + b, 0) / streaks.length) : 0;
    const consistency = consistencyScores.length
      ? Math.round((consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length) * 100)
      : 0;

    return {
      total,
      completedToday,
      avgStreak,
      consistency
    };
  }

  window.renderHabitIntelligence = function () {
    safe(() => {
      const page = document.getElementById("goalsHabitsPage") || document.getElementById("dashboardPage");
      if (!page) return;

      let card = document.getElementById("habitIntelligenceCard");
      if (!card) {
        card = document.createElement("div");
        card.id = "habitIntelligenceCard";
        card.className = "habit-section";
        page.prepend(card);
      }

      const stats = calculateHabitStats();

      let status = "Unstable";
      if (stats.consistency >= 75) status = "Disciplined";
      else if (stats.consistency >= 50) status = "Developing";
      else if (stats.consistency >= 30) status = "Inconsistent";

      card.innerHTML = `
        <div class="section-title">🧠 Habit Intelligence</div>
        <div style="display:flex; gap:18px; flex-wrap:wrap; margin-top:10px;">
          <div>
            <div style="color:#9CA3AF;">Total Habits</div>
            <div style="font-size:1.4rem; font-weight:900;">${stats.total}</div>
          </div>
          <div>
            <div style="color:#9CA3AF;">Completed Today</div>
            <div style="font-size:1.4rem; font-weight:900;">${stats.completedToday}</div>
          </div>
          <div>
            <div style="color:#9CA3AF;">Avg Streak</div>
            <div style="font-size:1.4rem; font-weight:900;">${stats.avgStreak} days</div>
          </div>
          <div>
            <div style="color:#9CA3AF;">Consistency</div>
            <div style="font-size:1.4rem; font-weight:900;">${stats.consistency}%</div>
          </div>
        </div>

        <div style="margin-top:12px; color:#E5E7EB; font-weight:800;">
          Status: ${status}
        </div>

        <div style="margin-top:10px; height:10px; border-radius:999px; background:rgba(255,255,255,0.08); overflow:hidden;">
          <div style="height:100%; width:${stats.consistency}%; border-radius:999px; background:linear-gradient(90deg,#6366f1,#22c55e);"></div>
        </div>
      `;
    });
  };

})();
