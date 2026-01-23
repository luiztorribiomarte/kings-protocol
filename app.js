// ===============================
// GLOBAL MODAL SYSTEM
// ===============================
function openModal(html) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modalBody");
  if (!modal || !body) return;

  body.innerHTML = html;
  modal.style.display = "flex";
}

function closeModal(event) {
  const modal = document.getElementById("modal");
  if (!modal) return;

  if (!event || event.target === modal) {
    modal.style.display = "none";
    document.getElementById("modalBody").innerHTML = "";
  }
}

// ===============================
// GLOBAL PAGE NAVIGATION
// ===============================
function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));

  if (page === "dashboard") {
    document.getElementById("dashboardPage").classList.add("active");
    document.querySelector(".nav-tab:nth-child(1)").classList.add("active");

    if (typeof renderMoodTracker === "function") renderMoodTracker();
    if (typeof renderHabits === "function") renderHabits();
    if (typeof renderTodos === "function") renderTodos();
    if (typeof renderLifeScore === "function") renderLifeScore();
    if (typeof renderInsights === "function") renderInsights();
    if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
    if (typeof renderDNAProfile === "function") renderDNAProfile();

  } else if (page === "goalsHabits") {
    document.getElementById("goalsHabitsPage").classList.add("active");
    document.querySelector(".nav-tab:nth-child(2)").classList.add("active");
    if (typeof renderGoals === "function") renderGoals();

  } else if (page === "workout") {
    document.getElementById("workoutPage").classList.add("active");
    document.querySelector(".nav-tab:nth-child(3)").classList.add("active");
    if (typeof renderExerciseCards === "function") renderExerciseCards();

  } else if (page === "journal") {
    document.getElementById("journalPage").classList.add("active");
    document.querySelector(".nav-tab:nth-child(4)").classList.add("active");

  } else if (page === "visionBoard") {
    document.getElementById("visionBoardPage").classList.add("active");
    document.querySelector(".nav-tab:nth-child(5)").classList.add("active");

  } else if (page === "content") {
    document.getElementById("contentPage").classList.add("active");
    document.querySelector(".nav-tab:nth-child(6)").classList.add("active");

  } else if (page === "books") {
    document.getElementById("booksPage").classList.add("active");
    document.querySelector(".nav-tab:nth-child(7)").classList.add("active");

  } else if (page === "settings") {
    document.getElementById("settingsPage").classList.add("active");
    document.querySelector(".nav-tab:nth-child(8)").classList.add("active");
  }
}

// ===============================
// TIME + DATE
// ===============================
function updateTime() {
  const now = new Date();
  const timeEl = document.getElementById("currentTime");
  const dateEl = document.getElementById("currentDate");

  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  }
}

setInterval(updateTime, 1000);
updateTime();

// ===============================
// TODO LIST
// ===============================
let todos = JSON.parse(localStorage.getItem("todos")) || [];

function addTodo() {
  const input = document.getElementById("todoInput");
  if (!input || !input.value.trim()) return;

  todos.push({ text: input.value.trim(), done: false });

  input.value = "";
  saveTodos();
  renderTodos();
  renderLifeScore();
  renderInsights();
  renderWeeklyGraph();
  renderDNAProfile();
}

function toggleTodo(index) {
  todos[index].done = !todos[index].done;
  saveTodos();
  renderTodos();
  renderLifeScore();
  renderInsights();
  renderWeeklyGraph();
  renderDNAProfile();
}

function deleteTodo(index) {
  todos.splice(index, 1);
  saveTodos();
  renderTodos();
  renderLifeScore();
  renderInsights();
  renderWeeklyGraph();
  renderDNAProfile();
}

function saveTodos() {
  localStorage.setItem("todos", JSON.stringify(todos));
}

function renderTodos() {
  const list = document.getElementById("todoList");
  if (!list) return;

  list.innerHTML = "";

  if (!todos.length) {
    list.innerHTML = `<div style="color:#9CA3AF;">No tasks yet.</div>`;
    return;
  }

  todos.forEach((todo, i) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.marginBottom = "6px";

    row.innerHTML = `
      <span style="cursor:pointer; ${todo.done ? "text-decoration:line-through; color:#6B7280;" : ""}"
            onclick="toggleTodo(${i})">
        ${todo.text}
      </span>
      <button onclick="deleteTodo(${i})" style="background:none; border:none; color:#EF4444; cursor:pointer;">✕</button>
    `;

    list.appendChild(row);
  });
}

// ===============================
// LIFE SCORE ENGINE
// ===============================
function animateNumber(el, start, end, duration = 800) {
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const value = Math.floor(start + (end - start) * progress);
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function renderLifeScore() {
  const containerId = "lifeScoreCard";
  let card = document.getElementById(containerId);

  const dashboard = document.getElementById("dashboardPage");
  if (!dashboard) return;

  if (!card) {
    card = document.createElement("div");
    card.id = containerId;
    card.className = "habit-section";
    dashboard.prepend(card);
  }

  let habitPercent = 0;
  if (typeof getDayCompletion === "function") {
    const today = new Date().toISOString().split("T")[0];
    const data = getDayCompletion(today);
    habitPercent = data.percent || 0;
  }
  const habitScore = Math.round((habitPercent / 100) * 50);

  let energyScore = 0;
  try {
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const todayKey = new Date().toISOString().split("T")[0];
    const energy = moodData[todayKey]?.energy || 5;
    energyScore = Math.round((energy / 10) * 25);
  } catch {}

  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.done).length;
  const todoScore = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 20);

  let streakBonus = 0;
  try {
    const streak = parseInt(localStorage.getItem("currentStreak") || "0");
    streakBonus = Math.min(5, streak);
  } catch {}

  const totalScore = habitScore + energyScore + todoScore + streakBonus;

  let status = "Slipping";
  let color = "red";
  if (totalScore >= 80) {
    status = "Dominating";
    color = "green";
  } else if (totalScore >= 60) {
    status = "Solid";
    color = "yellow";
  } else if (totalScore >= 40) {
    status = "Recovering";
    color = "yellow";
  }

  let glowClass =
    color === "green" ? "life-glow-green" :
    color === "yellow" ? "life-glow-yellow" :
    "life-glow-red";

  const angle = Math.round((totalScore / 100) * 360);

  card.innerHTML = `
    <div class="section-title">👑 Life Score</div>

    <div class="life-score-wrap">
      <div class="life-ring ${glowClass} life-pulse"
        style="background: conic-gradient(
          ${color === "green" ? "#22c55e" : color === "yellow" ? "#eab308" : "#ef4444"} ${angle}deg,
          rgba(255,255,255,0.08) ${angle}deg
        );">
        <span id="lifeScoreNumber">0</span>
      </div>

      <div>
        <div style="font-size:1.1rem; font-weight:800;">Status: ${status}</div>
        <div class="life-score-details">
          Habits: ${habitScore}/50<br>
          Energy: ${energyScore}/25<br>
          Tasks: ${todoScore}/20<br>
          Streak: +${streakBonus}
        </div>
      </div>
    </div>
  `;

  const numEl = document.getElementById("lifeScoreNumber");
  if (numEl) animateNumber(numEl, 0, totalScore);
}

// ===============================
// ANALYTICAL INSIGHT ENGINE
// ===============================
function getLastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function avg(arr) {
  return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function stdDev(arr) {
  const clean = arr.filter(v => Number.isFinite(v));
  if (clean.length <= 1) return 0;
  const m = avg(clean);
  const variance = avg(clean.map(v => (v - m) ** 2));
  return Math.sqrt(variance);
}

function renderInsights() {
  const dashboard = document.getElementById("dashboardPage");
  if (!dashboard) return;

  let card = document.getElementById("insightCard");
  if (!card) {
    card = document.createElement("div");
    card.id = "insightCard";
    card.className = "habit-section";
    dashboard.insertBefore(card, dashboard.children[1]);
  }

  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");

  const last7 = getLastNDays(7);
  const prev7 = getLastNDays(14).slice(0, 7);

  const habitPercents = days =>
    days.map(d => typeof getDayCompletion === "function" ? getDayCompletion(d).percent || 0 : 0);

  const energyValues = days =>
    days.map(d => moodData[d]?.energy || 0);

  const habitChange = avg(habitPercents(last7)) - avg(habitPercents(prev7));
  const energyChange = avg(energyValues(last7)) - avg(energyValues(prev7));

  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.done).length;
  const todoEfficiency = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 100);

  let trend = "Stable";
  if (habitChange > 5 || energyChange > 0.5) trend = "Improving";
  if (habitChange < -5 || energyChange < -0.5) trend = "Declining";

  card.innerHTML = `
    <div class="section-title">📊 Data Insights (7-Day Analysis)</div>
    <div style="color:#E5E7EB; line-height:1.6;">
      Habits: ${habitChange >= 0 ? "+" : ""}${habitChange.toFixed(1)}% vs last week<br>
      Energy: ${energyChange >= 0 ? "+" : ""}${energyChange.toFixed(2)} avg change<br>
      Task efficiency: ${todoEfficiency}%<br>
      Trend: <strong>${trend}</strong>
    </div>
  `;
}

// ===============================
// WEEKLY PERFORMANCE GRAPH
// ===============================
let weeklyChart = null;

function renderWeeklyGraph() {
  const dashboard = document.getElementById("dashboardPage");
  if (!dashboard) return;

  let card = document.getElementById("weeklyGraphCard");
  if (!card) {
    card = document.createElement("div");
    card.id = "weeklyGraphCard";
    card.className = "habit-section";
    dashboard.insertBefore(card, dashboard.children[2]);
  }

  card.innerHTML = `
    <div class="section-title">📈 Weekly Performance</div>
    <canvas id="weeklyChartCanvas" height="140"></canvas>
  `;

  const ctx = document.getElementById("weeklyChartCanvas");
  if (!ctx || typeof Chart === "undefined") return;

  const days = getLastNDays(7);
  const labels = days.map(d => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  });

  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");

  const habitData = days.map(d =>
    typeof getDayCompletion === "function" ? getDayCompletion(d).percent || 0 : 0
  );

  const energyData = days.map(d => (moodData[d]?.energy || 0) * 10); // 0–100 scale
  const todoData = days.map(() => {
    const total = todos.length;
    const done = todos.filter(t => t.done).length;
    return total === 0 ? 0 : Math.round((done / total) * 100);
  });

  const lifeScoreData = habitData.map((h, i) => {
    const e = energyData[i] / 4;
    const t = todoData[i] / 5;
    return Math.min(100, Math.round(h * 0.5 + e + t));
  });

  if (weeklyChart) weeklyChart.destroy();

  weeklyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Habits %", data: habitData, borderWidth: 2, tension: 0.3 },
        { label: "Energy", data: energyData, borderWidth: 2, tension: 0.3 },
        { label: "Tasks %", data: todoData, borderWidth: 2, tension: 0.3 },
        { label: "Life Score", data: lifeScoreData, borderWidth: 3, tension: 0.35 }
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

// ===============================
// PRODUCTIVITY DNA (NEW)
// ===============================
function getCurrentStreakSafe() {
  try {
    const s = parseInt(localStorage.getItem("currentStreak") || "0");
    return Number.isFinite(s) ? s : 0;
  } catch {
    return 0;
  }
}

function getHabitPercentForDay(dayKey) {
  try {
    if (typeof getDayCompletion === "function") {
      const data = getDayCompletion(dayKey);
      return data?.percent ? data.percent : 0;
    }
  } catch {}
  return 0;
}

function getEnergyForDay(dayKey) {
  try {
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const e = moodData?.[dayKey]?.energy;
    return Number.isFinite(e) ? e : 0;
  } catch {
    return 0;
  }
}

function getTaskEfficiencyPercent() {
  const total = todos.length;
  const done = todos.filter(t => t.done).length;
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function buildBar(label, value, hint) {
  const v = clamp(Math.round(value), 0, 100);
  return `
    <div style="margin-top:12px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
        <div style="color:#E5E7EB; font-weight:800;">${label}</div>
        <div style="color:#9CA3AF; font-weight:800;">${v}</div>
      </div>
      <div style="margin-top:8px; height:10px; border-radius:999px; background:rgba(255,255,255,0.08); overflow:hidden;">
        <div style="height:100%; width:${v}%; border-radius:999px; background:linear-gradient(90deg, rgba(99,102,241,0.95), rgba(236,72,153,0.95));"></div>
      </div>
      ${hint ? `<div style="margin-top:8px; color:#9CA3AF; font-size:0.9rem; line-height:1.35;">${hint}</div>` : ""}
    </div>
  `;
}

function getDNASummary(discipline, consistency, execution, volatility) {
  // “best it can be” = specific + actionable, not generic
  let type = "Balanced Builder";
  let line = "You’re steady—now push for a higher floor.";

  if (discipline >= 75 && consistency >= 70 && volatility <= 35) {
    type = "Iron Operator";
    line = "You don’t rely on motivation. You execute.";
  } else if (execution >= 75 && discipline < 60) {
    type = "Burst Finisher";
    line = "You can finish tasks, but habits aren’t locked in yet.";
  } else if (discipline >= 70 && execution < 55) {
    type = "Routine Soldier";
    line = "Habits are strong, but task output is the bottleneck.";
  } else if (volatility >= 65) {
    type = "Chaos Reactor";
    line = "Your days swing hard. Build consistency to unlock progress.";
  } else if (consistency >= 75 && discipline < 55) {
    type = "Steady Starter";
    line = "You’re consistent—now raise the intensity.";
  }

  // make it “what to do next” based on weakest metric
  const metrics = [
    { k: "Discipline", v: discipline },
    { k: "Consistency", v: consistency },
    { k: "Execution", v: execution },
    { k: "Volatility", v: 100 - volatility } // invert for weakness detection (higher = better)
  ].sort((a, b) => a.v - b.v);

  const weakest = metrics[0]?.k || "Execution";

  let directive = "Next move: tighten your system.";
  if (weakest === "Discipline") directive = "Next move: make 1 habit non-negotiable daily.";
  if (weakest === "Consistency") directive = "Next move: stop the swings—aim for repeatable 70% days.";
  if (weakest === "Execution") directive = "Next move: cap tasks at 3 and finish them.";
  if (weakest === "Volatility") directive = "Next move: stabilize sleep + start times for 7 days.";

  return { type, line, directive };
}

function renderDNAProfile() {
  const dashboard = document.getElementById("dashboardPage");
  if (!dashboard) return;

  let card = document.getElementById("dnaCard");
  if (!card) {
    card = document.createElement("div");
    card.id = "dnaCard";
    card.className = "habit-section";
    // put it right under Weekly Performance
    dashboard.insertBefore(card, dashboard.children[3] || null);
  }

  const days = getLastNDays(14);
  const habitPercents = days.map(getHabitPercentForDay);
  const energies = days.map(getEnergyForDay); // 0–10

  const habitAvg = avg(habitPercents); // 0–100
  const habitStd = stdDev(habitPercents); // 0–?
  const energyAvg = avg(energies); // 0–10
  const energyStd = stdDev(energies);

  const taskEfficiency = getTaskEfficiencyPercent(); // 0–100
  const streak = getCurrentStreakSafe();

  // DISCIPLINE: habits avg (70%) + streak (30%)
  const streakScore = clamp(streak * 5, 0, 100);
  const discipline = clamp(habitAvg * 0.7 + streakScore * 0.3, 0, 100);

  // CONSISTENCY: lower variability = higher score (habits + energy)
  // map std dev into a 0–100 score
  const habitConsistency = clamp(100 - habitStd * 1.4, 0, 100); // 1.4 tuned for typical % swings
  const energyConsistency = clamp(100 - energyStd * 12, 0, 100); // 12 tuned for 0–10 scale
  const consistency = clamp(habitConsistency * 0.65 + energyConsistency * 0.35, 0, 100);

  // EXECUTION: tasks (55%) + habits avg (45%)
  const execution = clamp(taskEfficiency * 0.55 + habitAvg * 0.45, 0, 100);

  // VOLATILITY: based on day-to-day swings (habits + energy)
  // high std dev => high volatility
  const volatility = clamp(habitStd * 1.2 + energyStd * 10, 0, 100);

  const summary = getDNASummary(discipline, consistency, execution, volatility);

  const disciplineHint =
    `Based on your last 14 days: avg habits ${habitAvg.toFixed(1)}% + streak score ${streakScore}.`;

  const consistencyHint =
    `Your steadiness is driven by swings: habits σ ${habitStd.toFixed(1)}, energy σ ${energyStd.toFixed(2)}. Lower is better.`;

  const executionHint =
    `Tasks are ${taskEfficiency}% complete right now. This score blends tasks + habits.`;

  const volatilityHint =
    volatility >= 60
      ? `Big swings detected. Your output is inconsistent day to day.`
      : `Your swings are controlled. Keep your baseline stable.`;

  card.innerHTML = `
    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap;">
      <div>
        <div class="section-title">🧬 Productivity DNA</div>
        <div style="color:#E5E7EB; font-weight:900; font-size:1.05rem;">${summary.type}</div>
        <div style="margin-top:6px; color:#9CA3AF; line-height:1.4;">
          ${summary.line}<br>
          <span style="color:#E5E7EB; font-weight:800;">${summary.directive}</span>
        </div>
      </div>

      <div style="min-width:200px; text-align:right;">
        <div style="color:#9CA3AF; font-weight:800;">Window</div>
        <div style="color:#E5E7EB; font-weight:900;">Last 14 days</div>
        <div style="margin-top:8px; color:#9CA3AF; font-weight:800;">Streak</div>
        <div style="color:#E5E7EB; font-weight:900;">${streak} days</div>
      </div>
    </div>

    ${buildBar("Discipline", discipline, disciplineHint)}
    ${buildBar("Consistency", consistency, consistencyHint)}
    ${buildBar("Execution", execution, executionHint)}
    ${buildBar("Volatility", 100 - volatility, volatilityHint)}
  `;
}

// ===============================
// INITIAL LOAD
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  showPage("dashboard");

  if (typeof initHabits === "function") initHabits();
  if (typeof initGoalsData === "function") initGoalsData();
  if (typeof initWorkoutData === "function") initWorkoutData();
  if (typeof initMoodData === "function") initMoodData();

  const moodEl = document.getElementById("moodTracker");
  if (moodEl && typeof renderMoodTracker === "function") {
    renderMoodTracker();
  }

  renderTodos();
  renderLifeScore();
  renderInsights();
  renderWeeklyGraph();
  renderDNAProfile();
});
