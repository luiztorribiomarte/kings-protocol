// ===============================
// PAGE NAVIGATION
// ===============================
function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));

  const map = {
    dashboard: 1,
    goalsHabits: 2,
    workout: 3,
    journal: 4,
    visionBoard: 5,
    content: 6,
    books: 7,
    settings: 8
  };

  const pageId = page + "Page";
  const el = document.getElementById(pageId);
  if (el) el.classList.add("active");

  const tab = document.querySelector(`.nav-tab:nth-child(${map[page]})`);
  if (tab) tab.classList.add("active");

  if (page === "dashboard") {
    if (typeof renderMoodTracker === "function") renderMoodTracker();
    if (typeof renderHabits === "function") renderHabits();
    if (typeof renderTodos === "function") renderTodos();
    renderLifeScore();
    renderWeeklyGraph(); // ✅ now placed under Life Score
    renderDNAProfile();
  }

  if (page === "journal") {
    renderJournal();
  }
}

// ===============================
// TIME + DATE
// ===============================
function updateTime() {
  const now = new Date();
  const timeEl = document.getElementById("currentTime");
  const dateEl = document.getElementById("currentDate");

  if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (dateEl) dateEl.textContent = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}
setInterval(updateTime, 1000);
updateTime();

// ===============================
// TODO SYSTEM
// ===============================
let todos = JSON.parse(localStorage.getItem("todos")) || [];

function saveTodos() {
  localStorage.setItem("todos", JSON.stringify(todos));
}

function addTodo() {
  const input = document.getElementById("todoInput");
  if (!input || !input.value.trim()) return;

  todos.push({ text: input.value.trim(), done: false });
  input.value = "";
  saveTodos();
  renderTodos();
  renderLifeScore();
  renderDNAProfile();
  renderWeeklyGraph();
}

function toggleTodo(index) {
  todos[index].done = !todos[index].done;
  saveTodos();
  renderTodos();
  renderLifeScore();
  renderDNAProfile();
  renderWeeklyGraph();
}

function deleteTodo(index) {
  todos.splice(index, 1);
  saveTodos();
  renderTodos();
  renderLifeScore();
  renderDNAProfile();
  renderWeeklyGraph();
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
            onclick="toggleTodo(${i})">${todo.text}</span>
      <button onclick="deleteTodo(${i})" style="background:none; border:none; color:#EF4444; cursor:pointer;">✕</button>
    `;
    list.appendChild(row);
  });
}

// ===============================
// LIFE SCORE ENGINE
// ===============================
function renderLifeScore() {
  const dashboard = document.getElementById("dashboardPage");
  if (!dashboard) return;

  let card = document.getElementById("lifeScoreCard");
  if (!card) {
    card = document.createElement("div");
    card.id = "lifeScoreCard";
    card.className = "habit-section";
    dashboard.prepend(card);
  }

  let habitPercent = 0;
  let habitDone = 0;
  let habitTotal = 0;

  if (typeof getDayCompletion === "function") {
    const stats = getDayCompletion();
    habitPercent = stats.percent;
    habitDone = stats.done;
    habitTotal = stats.total;
  }

  const habitScore = Math.round((habitPercent / 100) * 50);

  let energyScore = 0;
  try {
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const todayKey = new Date().toISOString().split("T")[0];
    energyScore = Math.round(((moodData[todayKey]?.energy || 5) / 10) * 25);
  } catch {}

  const completedTodos = todos.filter(t => t.done).length;
  const todoScore = todos.length === 0 ? 0 : Math.round((completedTodos / todos.length) * 20);

  let streakBonus = Math.min(5, parseInt(localStorage.getItem("currentStreak") || "0"));

  const totalScore = habitScore + energyScore + todoScore + streakBonus;

  let status = "Slipping", color = "red";
  if (totalScore >= 80) { status = "Dominating"; color = "green"; }
  else if (totalScore >= 60) { status = "Solid"; color = "yellow"; }
  else if (totalScore >= 40) { status = "Recovering"; color = "yellow"; }

  const angle = Math.round((totalScore / 100) * 360);

  card.innerHTML = `
    <div class="section-title">👑 Life Score</div>
    <div class="life-score-wrap">
      <div class="life-ring"
        style="background: conic-gradient(
          ${color === "green" ? "#22c55e" : color === "yellow" ? "#eab308" : "#ef4444"} ${angle}deg,
          rgba(255,255,255,0.08) ${angle}deg
        );">
        <span>${totalScore}</span>
      </div>
      <div>
        <div style="font-size:1.1rem; font-weight:800;">Status: ${status}</div>
        <div class="life-score-details">
          Habits: ${habitDone}/${habitTotal} (${habitPercent}%)<br>
          Energy: ${energyScore}/25<br>
          Tasks: ${todoScore}/20<br>
          Streak: +${streakBonus}
        </div>
      </div>
    </div>
  `;
}

// ===============================
// 📈 WEEKLY GRAPH (PLACED UNDER LIFE SCORE)
// ===============================
let weeklyChart = null;

function getLastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function getHabitPercentForDay(dateStr) {
  if (typeof getDayCompletion === "function") {
    return getDayCompletion(dateStr).percent || 0;
  }
  return 0;
}

function renderWeeklyGraph() {
  const dashboard = document.getElementById("dashboardPage");
  if (!dashboard) return;

  let card = document.getElementById("weeklyGraphCard");
  if (!card) {
    card = document.createElement("div");
    card.id = "weeklyGraphCard";
    card.className = "habit-section";

    // ✅ Insert directly after Life Score
    const lifeScoreCard = document.getElementById("lifeScoreCard");
    if (lifeScoreCard && lifeScoreCard.nextSibling) {
      dashboard.insertBefore(card, lifeScoreCard.nextSibling);
    } else if (lifeScoreCard) {
      dashboard.appendChild(card);
    } else {
      dashboard.appendChild(card);
    }
  }

  card.innerHTML = `
    <div class="section-title">📈 Weekly Performance</div>
    <canvas id="weeklyChartCanvas" height="140"></canvas>
  `;

  const canvas = document.getElementById("weeklyChartCanvas");
  if (!canvas || typeof Chart === "undefined") return;

  const days = getLastNDays(7);
  const labels = days.map(d => new Date(d).toLocaleDateString("en-US", { weekday: "short" }));

  const habitData = days.map(getHabitPercentForDay);

  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
  const energyData = days.map(d => (moodData[d]?.energy || 0) * 10);

  const todoData = days.map(() => {
    const total = todos.length;
    const done = todos.filter(t => t.done).length;
    return total === 0 ? 0 : Math.round((done / total) * 100);
  });

  if (weeklyChart) {
    weeklyChart.destroy();
    weeklyChart = null;
  }

  weeklyChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Habits %", data: habitData, borderWidth: 2, tension: 0.3 },
        { label: "Energy", data: energyData, borderWidth: 2, tension: 0.3 },
        { label: "Tasks %", data: todoData, borderWidth: 2, tension: 0.3 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#E5E7EB" } } },
      scales: {
        x: { ticks: { color: "#9CA3AF" } },
        y: { min: 0, max: 100, ticks: { color: "#9CA3AF" } }
      }
    }
  });
}

// ===============================
// 🧬 DNA PROFILE (unchanged)
// ===============================
function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stdDev(arr) {
  if (arr.length <= 1) return 0;
  const mean = avg(arr);
  return Math.sqrt(avg(arr.map(x => (x - mean) ** 2)));
}

function renderDNAProfile() {
  const dashboard = document.getElementById("dashboardPage");
  if (!dashboard) return;

  let card = document.getElementById("dnaCard");
  if (!card) {
    card = document.createElement("div");
    card.id = "dnaCard";
    card.className = "habit-section";
    dashboard.appendChild(card);
  }

  const days = getLastNDays(14);
  const habitPercents = days.map(getHabitPercentForDay);

  const habitAvg = avg(habitPercents);
  const habitStd = stdDev(habitPercents);

  const completedTodos = todos.filter(t => t.done).length;
  const taskEfficiency = todos.length === 0 ? 0 : (completedTodos / todos.length) * 100;

  const streak = parseInt(localStorage.getItem("currentStreak") || "0");

  const discipline = Math.round(habitAvg * 0.7 + Math.min(streak * 5, 100) * 0.3);
  const consistency = Math.round(100 - habitStd * 1.2);
  const execution = Math.round(taskEfficiency * 0.6 + habitAvg * 0.4);

  card.innerHTML = `
    <div class="section-title">🧬 Productivity DNA</div>
    <div style="line-height:1.6;">
      Discipline: <strong>${discipline}</strong><br>
      Consistency: <strong>${consistency}</strong><br>
      Execution: <strong>${execution}</strong><br>
      Habit Avg (14d): ${habitAvg.toFixed(1)}%
    </div>
  `;
}

// ===============================
// BOOT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  showPage("dashboard");

  if (typeof initHabitsData === "function") initHabitsData();
  if (typeof initMoodData === "function") initMoodData();

  renderTodos();
  renderLifeScore();
  renderWeeklyGraph();
  renderDNAProfile();
});
