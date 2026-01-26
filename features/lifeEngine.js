// ============================================
// LIFE ENGINE 2.0 — CLEAN + POWERFUL + SAFE
// Uses habits + mood + tasks + streak
// Does NOT remove any existing features
// ============================================

// ---------- Helpers ----------
function safeNum(n) {
  return typeof n === "number" && !isNaN(n) ? n : 0;
}

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function getLastDays(n) {
  const days = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

// ---------- CORE METRICS ----------
function getHabitPercent(dateKey = todayKey()) {
  try {
    if (typeof getDayCompletion === "function") {
      return safeNum(getDayCompletion(dateKey).percent);
    }
  } catch {}
  return 0;
}

function getEnergyScore(dateKey = todayKey()) {
  try {
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const energy = moodData[dateKey]?.energy || 0;
    return Math.round((energy / 10) * 100); // normalize to %
  } catch {}
  return 0;
}

function getTaskPercent() {
  try {
    const todos = JSON.parse(localStorage.getItem("todos") || "[]");
    if (!todos.length) return 0;
    const done = todos.filter(t => t.done).length;
    return Math.round((done / todos.length) * 100);
  } catch {}
  return 0;
}

function getStreakBonus() {
  let streak = 0;
  const days = getLastDays(30);

  for (const d of days) {
    const pct = getHabitPercent(d);
    if (pct >= 80) streak++;
    else break;
  }

  // bonus capped at +15 points
  return Math.min(streak * 2, 15);
}

// ---------- LIFE SCORE ----------
function calculateLifeScore() {
  const habitPct = getHabitPercent();
  const energyPct = getEnergyScore();
  const taskPct = getTaskPercent();
  const streakBonus = getStreakBonus();

  // weights (balanced system)
  const score =
    habitPct * 0.5 +     // habits = 50%
    energyPct * 0.25 +   // energy = 25%
    taskPct * 0.25 +     // tasks = 25%
    streakBonus;         // streak bonus

  return {
    score: Math.min(100, Math.round(score)),
    breakdown: {
      habits: habitPct,
      energy: energyPct,
      tasks: taskPct,
      streakBonus
    }
  };
}

// ---------- UI: LIFE SCORE PANEL ----------
function renderLifeScore() {
  const el = document.getElementById("dailyStatus");
  if (!el) return;

  const data = calculateLifeScore();
  const score = data.score;

  let label = "Slipping";
  let color = "#EF4444";

  if (score >= 80) {
    label = "Dominating";
    color = "#22C55E";
  } else if (score >= 60) {
    label = "Solid";
    color = "#A78BFA";
  } else if (score >= 40) {
    label = "Recovering";
    color = "#F59E0B";
  }

  el.innerHTML = `
    <div style="margin-top:14px; padding:14px; border-radius:14px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04);">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="font-weight:800;">Life Score</div>
        <div style="font-weight:900; color:${color};">${score}%</div>
      </div>

      <div style="margin-top:6px; font-size:0.9rem; color:${color}; font-weight:700;">
        Status: ${label}
      </div>

      <div style="margin-top:10px; font-size:0.85rem; color:#9CA3AF; line-height:1.5;">
        Habits: ${data.breakdown.habits}%<br>
        Energy: ${data.breakdown.energy}%<br>
        Tasks: ${data.breakdown.tasks}%<br>
        Streak Bonus: +${data.breakdown.streakBonus}
      </div>
    </div>
  `;
}

// ---------- WEEKLY PERFORMANCE ----------
function renderWeeklyGraph() {
  const el = document.getElementById("weeklyCompletion");
  if (!el) return;

  const days = getLastDays(7).reverse();

  const habitAvg = Math.round(days.reduce((a,d)=>a+getHabitPercent(d),0)/7);
  const energyAvg = Math.round(days.reduce((a,d)=>a+getEnergyScore(d),0)/7);
  const taskAvg = getTaskPercent();

  const overall = Math.round((habitAvg + energyAvg + taskAvg) / 3);

  el.textContent = overall + "%";
}

// ---------- PRODUCTIVITY DNA ----------
function renderDNAProfile() {
  const el = document.getElementById("currentStreak");
  if (!el) return;

  const days = getLastDays(14);

  const habitVals = days.map(d => getHabitPercent(d));
  const avgHabit = Math.round(habitVals.reduce((a,b)=>a+b,0)/14);

  const variance = Math.round(
    habitVals.reduce((a,b)=>a+Math.abs(b-avgHabit),0)/14
  );

  const discipline = Math.min(100, avgHabit + getStreakBonus());
  const consistency = Math.max(0, 100 - variance);
  const execution = Math.round((avgHabit + getTaskPercent()) / 2);

  el.textContent = Math.round((discipline + consistency + execution) / 3);
}

// ---------- CORE REGISTRATION ----------
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

console.log("Life Engine 2.0 loaded");
