(function () {
  console.log("Habit Bridge Engine loaded.");

  function getTodayKey() {
    return new Date().toISOString().split("T")[0];
  }

  function getHabitsList() {
    let habits =
      JSON.parse(localStorage.getItem("habits")) ||
      JSON.parse(localStorage.getItem("habitsList")) ||
      [];

    if (!Array.isArray(habits)) habits = [];
    return habits;
  }

  function getHabitCompletions() {
    let data =
      JSON.parse(localStorage.getItem("habitCompletions")) ||
      {};

    if (typeof data !== "object" || data === null) data = {};
    return data;
  }

  function normalizeHabitName(h) {
    return (h.name || h.title || h.id || "").toString().toLowerCase().trim();
  }

  window.getDayCompletion = function (dateKey) {
    const habits = getHabitsList();
    const completions = getHabitCompletions();

    if (!habits.length) return { percent: 0, completed: 0, total: 0 };

    const dayData = completions[dateKey] || {};
    let completed = 0;

    habits.forEach(h => {
      const name = normalizeHabitName(h);

      Object.keys(dayData).forEach(k => {
        if (k.toLowerCase().trim() === name && dayData[k] === true) {
          completed++;
        }
      });
    });

    const percent = Math.round((completed / habits.length) * 100);

    return {
      percent,
      completed,
      total: habits.length
    };
  };

  window.debugHabits = function () {
    const today = getTodayKey();
    console.log("Habits:", getHabitsList());
    console.log("Completions:", getHabitCompletions());
    console.log("Today:", window.getDayCompletion(today));
  };

})();
