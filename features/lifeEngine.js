// ============================================
// LIFE ENGINE — SAFE RESTORE (NO FEATURES REMOVED)
// Uses habits + mood + todos without breaking anything
// ============================================

// ---------- Helpers ----------
function safeNumber(n) {
  return typeof n === "number" && !isNaN(n) ? n : 0;
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

// ---------- LIFE SCORE ----------
function renderLifeScore() {
  const el = document.getElementById("dailyStatus");
  if (!el) return;

  let habitPercent = 0;
  let moodScore = 0;
  let taskPercent = 0;

  // HABITS
  try {
    if (typeof getDayCompletion === "function") {
      const data = getDayCompletion(getTodayKey());
      habitPercent = safeNumber(data.percent);
    }
  } catch {}

  // MOOD / ENERGY
  try {
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const today = moodData[getTodayKey()];
    if (today && today.energy) {
      moodScore = safeNumber(today.energy) * 10; // convert 1–10 → %
    }
  } catch {}

  // TASKS (TODOS)
  try {
    const todos = JSON.parse(localStorage.getItem("todos") || "[]");
    if (todos.length > 0) {
      const done = todos.filter(t => t.done).length;
      taskPercent = Math.round((done / todos.length) * 100);
    }
  } catch {}

  // FINAL LIFE SCORE (balanced)
  const lifeScore = Math.round(
    habitPercent * 0.5 +
    moodScore * 0.3 +
    taskPercent * 0.2
  );

  let label = "⚠️ Low Day";
  if (lifeScore >= 80) label = "🔥 Elite Day";
  else if (lifeScore >= 60) label = "💪 Strong Day";
  else if (lifeScore >= 40) label = "🙂 Average Day";

  el.innerHTML = `
    <div style="margin-top:10px; font-weight:700;">
      Life Score: <span style="color:#A78BFA;">${lifeScore}%</span> — ${label}
    </div>
  `;
}

// ---------- WEEKLY GRAPH (SIMPLE VERSION) ----------
function renderWeeklyGraph() {
  const el = document.getElementById("weeklyCompletion");
  if (!el) return;

  let total = 0;
  let count = 0;

  if (typeof getDayCompletion === "function") {
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const data = getDayCompletion(key);
      total += safeNumber(data.percent);
      count++;
    }
  }

  const avg = count ? Math.round(total / count) : 0;
  el.textContent = avg + "%";
}

// ---------- DNA PROFILE ----------
function renderDNAProfile() {
  const el = document.getElementById("currentStreak");
  if (!el || typeof getDayCompletion !== "function") return;

  let streak = 0;

  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const data = getDayCompletion(key);

    if (data.percent >= 80) streak++;
    else break;
  }

  el.textContent = streak;
}

// ---------- REGISTER WITH CORE ----------
if (window.App) {
  App.features.lifeEngine = {
    renderLifeScore,
    renderWeeklyGraph,
    renderDNAProfile
  };

  App.on("dashboard", () => {
    renderLifeScore();
    renderWeeklyGraph();
    renderDNAProfile();
  });
}

console.log("Life Engine loaded");
