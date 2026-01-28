// ============================================
// LIFE ENGINE 7.2 — FIXED FOR DYNAMIC HABITS
// Properly recalculates when habits are added/removed
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
  for (let i = n - 1; i >= 0; i--) {
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
    ...Object.keys(habitData || {}),
    ...Object.keys(moodData || {})
  ]);

  // If empty, fallback to last 7 so chart doesn't crash
  const out = [...keys].filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
  return out.length ? out : getLastDays(7);
}

function prettyLabel(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

// ---------- Core metrics (FIXED) ----------
function getHabitPercent(dateKey = todayKey()) {
  try {
    // Always use the latest getDayCompletion function
    if (typeof getDayCompletion === "function") {
      const result = getDayCompletion(dateKey);
      return safeNum(result.percent);
    }
  } catch (e) {
    console.error("Error getting habit percent:", e);
  }
  return 0;
}

function getEnergyPercent(dateKey = todayKey()) {
  try {
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const energy = moodData?.[dateKey]?.energy ?? 0; // 0–10
    return Math.round((energy / 10) * 100); // 0–100
  } catch {}
  return 0;
}

function getTaskPercentToday() {
  try {
    const todos = JSON.parse(localStorage.getItem("todos") || "[]");
    if (!todos.length) return 0;
    const done = todos.filter(t => t.done).length;
    return Math.round((done / todos.length) * 100);
  } catch {}
  return 0;
}

function getTaskPercentForDay(dateKey = todayKey()) {
  try {
    const hist = JSON.parse(localStorage.getItem("todoHistory") || "{}");
    if (hist && typeof hist === "object" && hist[dateKey]) {
      // New format stores an object with percent
      if (typeof hist[dateKey] === "object" && typeof hist[dateKey].percent === "number") {
        return hist[dateKey].percent;
      }
      // Old format stores just the number
      if (typeof hist[dateKey] === "number") {
        return hist[dateKey];
      }
    }
  } catch {}
  
  // For today, use current tasks
  if (dateKey === todayKey()) {
    return getTaskPercentToday();
  }
  
  return 0;
}

function getStreakBonus() {
  let streak = 0;
  const days = getLastDays(30).slice().reverse(); // walk backward from today

  for (const d of days) {
    const pct = getHabitPercent(d);
    if (pct >= 80) streak++;
    else break;
  }

  return Math.min(streak * 2, 15);
}

// ---------- Life Score (FIXED) ----------
function calculateLifeScore() {
  const habitPct = getHabitPercent();
  const energyPct = getEnergyPercent();
  const taskPct = getTaskPercentToday();
  const streakBonus = getStreakBonus();

  // Debug logging
  console.log("Life Score Calculation:", { habitPct, energyPct, taskPct, streakBonus });

  const score =
    habitPct * 0.5 +
    energyPct * 0.25 +
    taskPct * 0.25 +
    streakBonus;

  return {
    score: Math.min(100, Math.round(score)),
    breakdown: {
      habits: Math.round(habitPct),
      energy: Math.round(energyPct),
      tasks: Math.round(taskPct),
      streakBonus: Math.round(streakBonus)
    }
  };
}

// ---------- DNA (FIXED) ----------
function calculateDNA() {
  const days = getLastDays(14);
  const habitVals = days.map(d => getHabitPercent(d));
  const avgHabit = Math.round(habitVals.reduce((a, b) => a + b, 0) / (habitVals.length || 1));

  const variance = Math.round(
    habitVals.reduce((a, b) => a + Math.abs(b - avgHabit), 0) / (habitVals.length || 1)
  );

  const discipline = Math.min(100, avgHabit + getStreakBonus());
  const consistency = Math.max(0, 100 - variance);
  const execution = Math.round((avgHabit + getTaskPercentToday()) / 2);
  const avg14 = avgHabit;

  return { discipline, consistency, execution, avg14 };
}

// ---------- UI: Life Score panel ----------
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
        <div style="font-size:1.1rem; font-weight:900; color:${color};">${label}</div>

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

// ---------- UI: DNA panel ----------
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

// Compatibility: your app.js calls renderDNAProfile()
function renderDNAProfile() {
  renderDNAPanel();
}

// ---------- Dashboard Performance Trend Chart (FIXED) ----------
let dashboardTrendChart = null;

function getTrendDays(range) {
  if (range === "all") return getAllDaysFromStorage();
  const n = range === "30" ? 30 : 7;
  return getLastDays(n);
}

function renderDashboardTrendChart() {
  const canvas = document.getElementById("trendChart");
  const select = document.getElementById("trendRange");

  // If you haven't added the HTML container yet, do nothing (no crash)
  if (!canvas || typeof Chart === "undefined") return;

  const range = select ? select.value : "7";
  const days = getTrendDays(range);

  const labels = days.map(prettyLabel);
  const habits = days.map(d => getHabitPercent(d));
  const energy = days.map(d => getEnergyPercent(d));
  const tasks = days.map(d => getTaskPercentForDay(d));

  if (dashboardTrendChart) {
    try { dashboardTrendChart.destroy(); } catch {}
    dashboardTrendChart = null;
  }

  dashboardTrendChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { 
          label: "Habits %", 
          data: habits, 
          tension: 0.3,
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)'
        },
        { 
          label: "Energy %", 
          data: energy, 
          tension: 0.3,
          borderColor: '#EC4899',
          backgroundColor: 'rgba(236, 72, 153, 0.1)'
        },
        { 
          label: "Tasks %", 
          data: tasks, 
          tension: 0.3,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#E5E7EB" } }
      },
      scales: {
        x: { ticks: { color: "#9CA3AF" }, grid: { color: "rgba(255,255,255,0.06)" } },
        y: { min: 0, max: 100, ticks: { color: "#9CA3AF" }, grid: { color: "rgba(255,255,255,0.06)" } }
      }
    }
  });
}

function bindTrendRange() {
  const select = document.getElementById("trendRange");
  if (!select || select.__kpBound) return;

  select.addEventListener("change", () => {
    renderDashboardTrendChart();
  });

  select.__kpBound = true;
}

// ---------- Weekly summary stat (FIXED) ----------
function renderWeeklyGraph() {
  const el = document.getElementById("weeklyCompletion");
  if (!el) return;

  const days = getLastDays(7);
  const habitAvg = Math.round(days.reduce((a, d) => a + getHabitPercent(d), 0) / 7);
  const energyAvg = Math.round(days.reduce((a, d) => a + getEnergyPercent(d), 0) / 7);
  const taskAvg = Math.round(days.reduce((a, d) => a + getTaskPercentForDay(d), 0) / 7);

  const overall = Math.round((habitAvg + energyAvg + taskAvg) / 3);
  el.textContent = overall + "%";
}

// ---------- Boot / Safe refresh ----------
(function bootLifeEngine() {
  function safeInit() {
    try {
      // Render panels
      renderLifeScore();
      renderWeeklyGraph();
      renderDNAProfile();

      // Dashboard chart
      bindTrendRange();
      renderDashboardTrendChart();
    } catch (e) {
      console.error("Life Engine boot error:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeInit);
  } else {
    safeInit();
  }

  // If mood updates from other tabs etc
  window.addEventListener("storage", (e) => {
    if (e.key === "moodData" || e.key === "habitCompletions" || e.key === "todos" || e.key === "habits") {
      safeInit();
    }
  });
})();

console.log("Life Engine 7.2 (Fixed for dynamic habits) loaded");
