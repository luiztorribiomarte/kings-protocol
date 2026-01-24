// ===============================
// HABIT BRIDGE ENGINE (SAFE MODE)
// Does NOT modify existing habit logic
// Only READS habit data from all known sources
// ===============================

(function () {
  function safeJSON(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function getDateKey(date = new Date()) {
    return typeof date === "string"
      ? date
      : date.toISOString().split("T")[0];
  }

  function getAllHabits() {
    const listA = safeJSON("habits", []);
    const listB = safeJSON("habitsList", []);
    const listC = safeJSON("habitData", []);
    
    const merged = [...listA, ...listB, ...listC];
    return [...new Set(merged.map(h => h?.name || h))].filter(Boolean);
  }

  function getCompletionFromHabitCompletions(dateKey) {
    const data = safeJSON("habitCompletions", {});
    return data?.[dateKey] || {};
  }

  function getCompletionFromDailyMem(dateKey) {
    const key = `dailyBriefHabitsMem:${dateKey}`;
    return safeJSON(key, {});
  }

  function calculateCompletion(dateKey) {
    const habits = getAllHabits();
    if (!habits.length) return { percent: 0, done: 0, total: 0 };

    const completionsA = getCompletionFromHabitCompletions(dateKey);
    const completionsB = getCompletionFromDailyMem(dateKey);

    let done = 0;

    habits.forEach(habit => {
      const name = typeof habit === "string" ? habit : habit?.name;

      const completed =
        completionsA?.[name] === true ||
        completionsB?.[name] === true ||
        completionsA?.[name]?.done === true ||
        completionsB?.[name]?.done === true;

      if (completed) done++;
    });

    const total = habits.length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    return { percent, done, total };
  }

  // 🔥 UNIVERSAL FUNCTION FOR YOUR APP
  window.getUnifiedHabitPercent = function (date = new Date()) {
    const key = getDateKey(date);
    return calculateCompletion(key);
  };

  console.log("🧠 Habit Bridge Engine loaded.");
})();
