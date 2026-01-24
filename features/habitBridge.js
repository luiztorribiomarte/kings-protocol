// ===============================
// HABIT BRIDGE ENGINE
// SINGLE SOURCE OF TRUTH FOR HABITS
// ===============================

// Get habits list
function getHabitsList() {
  return JSON.parse(localStorage.getItem("habitsList") || "[]");
}

// Get habit completions
function getHabitCompletions() {
  return JSON.parse(localStorage.getItem("habitCompletions") || "{}");
}

// Save completions
function saveHabitCompletions(data) {
  localStorage.setItem("habitCompletions", JSON.stringify(data));
}

// Get today's habit stats
function getTodayHabitStats() {
  const habits = getHabitsList();
  const completions = getHabitCompletions();
  const today = new Date().toISOString().split("T")[0];

  if (!habits.length) return { percent: 0, done: 0, total: 0 };

  const todayData = completions[today] || {};
  const done = habits.filter(h => todayData[h.id]).length;
  const total = habits.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return { percent, done, total };
}

// GLOBAL API (used everywhere)
window.getDayCompletion = function () {
  return getTodayHabitStats();
};

// Debug tool
window.debugHabits = function () {
  console.log("Habits List:", getHabitsList());
  console.log("Completions:", getHabitCompletions());
  console.log("Today Stats:", getTodayHabitStats());
};

console.log("Habit Bridge Engine loaded.");
