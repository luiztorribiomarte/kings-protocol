// ===============================
// HABIT BRIDGE (SINGLE SOURCE OF TRUTH)
// This file unifies ALL habit logic without touching core code.
// ===============================

(function () {
  console.log("Habit Bridge Engine loaded.");

  function getTodayKey() {
    return new Date().toISOString().split("T")[0];
  }

  // Detect habit storage automatically
  function getHabitsList() {
    let habits =
      JSON.parse(localStorage.getItem("habits")) ||
      JSON.parse(localStorage.getItem("habitsList")) ||
      JSON.parse(localStorage.getItem("habitData")) ||
      [];

    if (!Array.isArray(habits)) habits = [];
    return habits;
  }

  function getHabitCompletions() {
    let data =
      JSON.parse(localStorage.getItem("habitCompletions")) ||
      JSON.parse(localStorage.getItem("habitData")) ||
      {};

    if (typeof data !== "object" || data === null) data = {};
    return data;
  }

  function calculateTodayHabitPercent() {
    const habits = getHabitsList();
    const completions = getHabitCompletions();
    const today = getTodayKey();

    if (!habits.length) return 0;

    const todayData = completions[today] || {};
    let completed = 0;

    habits.forEach(h => {
      if (todayData[h.id] === true || todayData[h.name] === true) {
        completed++;
      }
    });

    return Math.round((completed / habits.length) * 100);
  }

  // GLOBAL function used by Life Score, DNA, Insights, etc.
  window.getDayCompletion = function (dateKey) {
    const habits = getHabitsList();
    const completions = getHabitCompletions();

    if (!habits.length) return { percent: 0, completed: 0, total: 0 };

    const dayData = completions[dateKey] || {};
    let completed = 0;

    habits.forEach(h => {
      if (dayData[h.id] === true || dayData[h.name] === true) {
        completed++;
      }
    });

    const percent = Math.round((completed / habits.length) * 100);

    return {
      percent,
      completed,
      total: habits.length
    };
  };

  // Debug panel (optional but powerful)
  window.debugHabits = function () {
    console.log("Habits List:", getHabitsList());
    console.log("Habit Completions:", getHabitCompletions());
    console.log("Today %:", calculateTodayHabitPercent());
  };

})();
