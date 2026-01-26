// ============================================
// LIFE ENGINE 3.0 — VISUAL + POWERFUL + SAFE
// Uses existing habits, mood, tasks, streak
// DOES NOT REMOVE ANY FEATURES
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
    return Math.round((energy / 10) * 100);
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

  return Math.min(streak * 2, 15); // capped bonus
}

// ---------- LIFE SCORE ----------
function calculateLifeScore() {
  const habitPct = getHabitPercent();
  const energyPct = getEnergyScore();
  const taskPct = getTaskPercent();
  const streakBonus = getStreakBonus();

  const score =
    habitPct * 0.5 +
    energyPct * 0.25 +
    taskPct * 0.25 +
    streakBonus;

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

// ---------- UI ----------
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

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  el.innerHTML = `
    <div style="
      margin-top:14px;
      padding:18px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,0.14);
      background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
      display:flex;
      gap:18px;
      align-items:center;
    ">

      <div style="position:relative; width:130px; height:130px;">
        <svg width="130" height="130">
          <circle cx="65" cy="65" r="${radius}"
            stroke="rgba(255,255,255,0.12)"
            stroke-width="10"
            fill="none" />
          <circle cx="65" cy="65" r="${radius}"
            stroke="${color}"
            stroke-width="10"
            fill="none"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"
            stroke-linecap="round"
            transform="rotate(-90 65 65)" />
        </svg>

        <div style="
          position:absolute;
          top:50%;
          left:50%;
          transform:translate(-50%,-50%);
          text-align:center;
        ">
          <div style="font-size:1.6rem; font-weight:900; color:${color};">${score}</div>
          <div style="font-size:0.75rem; color:#9CA3AF;">Life Score</div>
        </div>
      </div>

      <div style="flex:1;">
        <div style="font-size:1.1rem; font-weight:900; color:${color};">
          ${label}
        </div>

        <div style="margin-top:10px; font-size:0.9rem; color:#E5E7EB; line-height:1.6;">
          Habits: ${data.breakdown.habits}%<br>
          Energy: ${data.breakdown.energy}%<br>
          Tasks: ${data.breakdown.tasks}%<br>
          Streak Bonus: +${data.breakdown.streakBonus}
        </div>
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

console.log("Life Engine 3.0 loaded");
