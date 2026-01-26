// ============================================
// LIFE ENGINE 6.1 — FIXED + COMPATIBLE + UPGRADED
// DOES NOT BREAK EXISTING FEATURES
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

function getAllDaysFromStorage() {
  const habitData = JSON.parse(localStorage.getItem("habitCompletions") || "{}");
  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");

  const keys = new Set([
    ...Object.keys(habitData),
    ...Object.keys(moodData)
  ]);

  return [...keys].sort();
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

function getTaskPercentForDay(dateKey = todayKey()) {
  try {
    const history = JSON.parse(localStorage.getItem("todoHistory") || "{}");
    if (history[dateKey]) return history[dateKey];

    const todos = JSON.parse(localStorage.getItem("todos") || "[]");
    if (!todos.length) return 0;
    const done = todos.filter(t => t.done).length;
    return Math.round((done / todos.length) * 100);
  } catch {}
  return 0;
}

function getTaskPercent() {
  return getTaskPercentForDay(todayKey());
}

function getStreakBonus() {
  let streak = 0;
  const days = getLastDays(30);

  for (const d of days) {
    const pct = getHabitPercent(d);
    if (pct >= 80) streak++;
    else break;
  }

  return Math.min(streak * 2, 15);
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

// ---------- LIFE SCORE UI ----------
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
      flex-wrap:wrap;
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

      <div style="flex:1; min-width:200px;">
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

      <div id="dnaPanel" style="flex:1; min-width:220px;"></div>
    </div>
  `;

  renderDNAPanel();
}

// ---------- PRODUCTIVITY DNA ----------
function calculateDNA() {
  const days = getLastDays(14);
  const habitVals = days.map(d => getHabitPercent(d));
  const avgHabit = Math.round(habitVals.reduce((a,b)=>a+b,0)/14);

  const variance = Math.round(
    habitVals.reduce((a,b)=>a+Math.abs(b-avgHabit),0)/14
  );

  const discipline = Math.min(100, avgHabit + getStreakBonus());
  const consistency = Math.max(0, 100 - variance);
  const execution = Math.round((avgHabit + getTaskPercent()) / 2);
  const avg14 = avgHabit;

  return { discipline, consistency, execution, avg14 };
}

function renderDNAPanel() {
  const el = document.getElementById("dnaPanel");
  if (!el) return;

  const dna = calculateDNA();

  el.innerHTML = `
    <div style="
      padding:14px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,0.12);
      background:rgba(255,255,255,0.04);
    ">
      <div style="font-weight:900; margin-bottom:8px;">Productivity DNA</div>

      <div style="font-size:0.9rem; color:#E5E7EB; line-height:1.7;">
        Discipline: ${dna.discipline}<br>
        Consistency: ${dna.consistency}<br>
        Execution: ${dna.execution}<br>
        14-Day Avg: ${dna.avg14}%
      </div>
    </div>
  `;
}

// ✅ COMPATIBILITY FIX (DO NOT REMOVE)
function renderDNAProfile() {
  renderDNAPanel();
}

// ---------- UNIFIED PERFORMANCE GRAPH ----------
let performanceChartInstance = null;

function openPerformanceGraph() {
  if (typeof openModal !== "function") return alert("Modal system not found.");

  openModal(`
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div>
        <div style="color:white; font-size:1.2em; font-weight:700;">Performance Graph</div>
        <div style="color:#9CA3AF; font-size:0.9em;">Habits vs Energy vs Tasks</div>
      </div>
      <select id="performanceRange" style="padding:10px; border-radius:10px; background:rgba(255,255,255,0.08); color:white;">
        <option value="7">Last 7 Days</option>
        <option value="30">Last 30 Days</option>
        <option value="all">All Time</option>
      </select>
    </div>

    <div style="margin-top:16px;">
      <canvas id="performanceChartCanvas" height="140"></canvas>
    </div>
  `);

  document.getElementById("performanceRange").addEventListener("change", renderPerformanceGraph);
  renderPerformanceGraph();
}

function renderPerformanceGraph() {
  const canvas = document.getElementById("performanceChartCanvas");
  if (!canvas || typeof Chart === "undefined") return;

  const range = document.getElementById("performanceRange").value;
  let days = [];

  if (range === "all") {
    days = getAllDaysFromStorage();
  } else {
    days = getLastDays(parseInt(range)).reverse();
  }

  const labels = days.map(d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }));

  const habitData = days.map(d => getHabitPercent(d));
  const energyData = days.map(d => getEnergyScore(d));
  const taskData = days.map(d => getTaskPercentForDay(d));

  if (performanceChartInstance) {
    performanceChartInstance.destroy();
    performanceChartInstance = null;
  }

  performanceChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Habits %", data: habitData, tension: 0.3 },
        { label: "Energy %", data: energyData, tension: 0.3 },
        { label: "Tasks %", data: taskData, tension: 0.3 }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#E5E7EB" } }
      },
      scales: {
        x: { ticks: { color: "#9CA3AF" } },
        y: { min: 0, max: 100, ticks: { color: "#9CA3AF" } }
      }
    }
  });
}

// ---------- WEEKLY SUMMARY ----------
function renderWeeklyGraph() {
  const el = document.getElementById("weeklyCompletion");
  if (!el) return;

  const days = getLastDays(7).reverse();

  const habitAvg = Math.round(days.reduce((a,d)=>a+getHabitPercent(d),0)/7);
  const energyAvg = Math.round(days.reduce((a,d)=>a+getEnergyScore(d),0)/7);
  const taskAvg = Math.round(days.reduce((a,d)=>a+getTaskPercentForDay(d),0)/7);

  const overall = Math.round((habitAvg + energyAvg + taskAvg) / 3);

  el.innerHTML = `
    <span style="cursor:pointer;" onclick="openPerformanceGraph()">
      ${overall}%
    </span>
  `;
}

console.log("Life Engine 6.1 loaded");
