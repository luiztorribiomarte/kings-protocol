/* features/habits.js
   FIXED:
   - Uses LOCAL date (same as core.js)
   - Trend safe when habits added/removed
   - LifeScore + DNA sync stable
*/

(function () {
  "use strict";

  const App = window.App;

  window.habits = window.habits || [];
  window.habitCompletions = window.habitCompletions || {};

  function saveHabits() {
    localStorage.setItem("habits", JSON.stringify(window.habits));
  }

  function saveHabitCompletions() {
    localStorage.setItem("habitCompletions", JSON.stringify(window.habitCompletions));
  }

  // ✅ MATCHES core.js DATE FORMAT (LOCAL ONLY)
  function getDateStringLocal(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function isComplete(habitId, dateStr) {
    return !!(
      window.habitCompletions?.[dateStr] &&
      window.habitCompletions[dateStr][habitId]
    );
  }

  function getDayCompletion(dateStr = getDateStringLocal()) {
    const habits = window.habits || [];
    if (!habits.length) return { percent: 0, done: 0, total: 0 };

    let done = 0;

    habits.forEach((h) => {
      if (isComplete(h.id, dateStr)) done++;
    });

    const total = habits.length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    return { percent, done, total };
  }

  function calculateCurrentStreak() {
    let streak = 0;
    let cursor = new Date();

    while (true) {
      const dateStr = getDateStringLocal(cursor);
      const pct = getDayCompletion(dateStr).percent;

      if (pct >= 80) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }

    return streak;
  }

  function toggleHabit(habitId, dateStr) {
    if (!window.habitCompletions[dateStr]) {
      window.habitCompletions[dateStr] = {};
    }

    window.habitCompletions[dateStr][habitId] =
      !window.habitCompletions[dateStr][habitId];

    saveHabitCompletions();
    renderHabits();

    if (window.renderLifeScore) window.renderLifeScore();
    if (window.renderWeeklyGraph) window.renderWeeklyGraph();
    if (window.renderDNAProfile) window.renderDNAProfile();
    if (window.renderDashboardTrendChart)
      window.renderDashboardTrendChart();
  }

  function renderHabits() {
    const grid = document.getElementById("habitGrid");
    if (!grid) return;

    const habits = window.habits || [];

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="font-weight:800;">Daily Habits</div>
        <button onclick="openHabitManager()" 
          style="padding:6px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.05); color:white; cursor:pointer;">
          ⚙ Manage
        </button>
      </div>
    `;

    habits.forEach((h) => {
      const today = getDateStringLocal();
      const done = isComplete(h.id, today);

      html += `
        <div style="display:flex; justify-content:space-between; padding:10px; margin-bottom:6px; border:1px solid rgba(255,255,255,0.1); border-radius:10px;">
          <div>${h.icon} ${window.escapeHtml(h.name)}</div>
          <div onclick="toggleHabit('${h.id}','${today}')" style="cursor:pointer;">
            ${done ? "✅" : "○"}
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;
  }

  function openHabitManager() {
    const habits = window.habits || [];

    window.openModal(`
      <h2>Manage Habits</h2>
      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <input id="newHabitName" placeholder="Habit name" class="form-input" />
        <input id="newHabitIcon" placeholder="Emoji" class="form-input" style="width:80px;" />
        <button class="form-submit" onclick="addHabit()">Add</button>
      </div>
      ${habits
        .map(
          (h) => `
        <div style="display:flex; justify-content:space-between; padding:8px;">
          <div>${h.icon} ${window.escapeHtml(h.name)}</div>
          <button onclick="deleteHabit('${h.id}')" 
            style="background:none; border:none; color:#EF4444; cursor:pointer;">Delete</button>
        </div>
      `
        )
        .join("")}
    `);
  }

  function addHabit() {
    const name = document.getElementById("newHabitName")?.value.trim();
    const icon =
      document.getElementById("newHabitIcon")?.value.trim() || "✨";

    if (!name) return alert("Habit name required");

    window.habits.push({
      id: "h_" + Date.now(),
      name,
      icon
    });

    saveHabits();
    window.closeModal();
    renderHabits();

    if (window.renderLifeScore) window.renderLifeScore();
    if (window.renderDashboardTrendChart)
      window.renderDashboardTrendChart();
  }

  function deleteHabit(id) {
    window.habits = window.habits.filter((h) => h.id !== id);
    saveHabits();
    window.closeModal();
    renderHabits();

    if (window.renderLifeScore) window.renderLifeScore();
    if (window.renderDashboardTrendChart)
      window.renderDashboardTrendChart();
  }

  function initHabitsData() {
    const savedHabits = localStorage.getItem("habits");
    const savedCompletions =
      localStorage.getItem("habitCompletions");

    if (savedHabits) {
      try {
        window.habits = JSON.parse(savedHabits) || [];
      } catch {
        window.habits = [];
      }
    }

    if (savedCompletions) {
      try {
        window.habitCompletions =
          JSON.parse(savedCompletions) || {};
      } catch {
        window.habitCompletions = {};
      }
    }

    if (!window.habits.length) {
      window.habits = [
        { id: "wake", name: "Wake Up At 7 AM", icon: "⏰" },
        { id: "workout", name: "Workout", icon: "💪" },
        { id: "med", name: "Meditate", icon: "🧘" }
      ];
      saveHabits();
    }
  }

  window.initHabitsData = initHabitsData;
  window.renderHabits = renderHabits;
  window.toggleHabit = toggleHabit;
  window.openHabitManager = openHabitManager;
  window.addHabit = addHabit;
  window.deleteHabit = deleteHabit;
  window.getDayCompletion = getDayCompletion;
  window.calculateCurrentStreak = calculateCurrentStreak;

  if (App) {
    App.on("dashboard", renderHabits);
  }

  console.log("Habits module loaded (LOCAL DATE FIXED)");
})();
