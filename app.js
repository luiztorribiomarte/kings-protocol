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
}

function toggleTodo(index) {
  todos[index].done = !todos[index].done;
  saveTodos();
  renderTodos();
  renderLifeScore();
  renderInsights();
}

function deleteTodo(index) {
  todos.splice(index, 1);
  saveTodos();
  renderTodos();
  renderLifeScore();
  renderInsights();
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
// ANALYTICAL INSIGHT ENGINE (NEW)
// ===============================
function getLastNDays(n) {
  const days = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function avg(arr) {
  return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
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
  const prev7 = getLastNDays(14).slice(7);

  const habitPercents = days =>
    days.map(d => typeof getDayCompletion === "function" ? getDayCompletion(d).percent || 0 : 0);

  const energyValues = days =>
    days.map(d => moodData[d]?.energy || 0);

  const todoRates = days => {
    if (!todos.length) return [0];
    const done = todos.filter(t => t.done).length;
    return [Math.round((done / todos.length) * 100)];
  };

  const habitChange = avg(habitPercents(last7)) - avg(habitPercents(prev7));
  const energyChange = avg(energyValues(last7)) - avg(energyValues(prev7));
  const todoEfficiency = todoRates(last7)[0];

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
});
