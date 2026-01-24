// ============================================
// HABIT BRIDGE (DO NOT TOUCH HABITS.JS)
// This file connects habits.js → dashboard logic
// ============================================

function getDayCompletion(dateStr) {
  const date = dateStr || new Date().toISOString().split("T")[0];

  if (typeof habits === "undefined" || !Array.isArray(habits)) {
    return { percent: 0, done: 0, total: 0 };
  }

  if (typeof habitCompletions === "undefined") {
    return { percent: 0, done: 0, total: habits.length };
  }

  let done = 0;
  const total = habits.length;

  habits.forEach(h => {
    if (habitCompletions[date] && habitCompletions[date][h.id]) {
      done++;
    }
  });

  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return { percent, done, total };
}
