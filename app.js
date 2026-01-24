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
    renderWeeklyGraph();
    renderDNAProfile();
  }

  if (page === "journal") {
    renderJournal();
  }
}

// ===============================
// 🪟 GLOBAL MODAL SYSTEM (FIX)
// ===============================
function openModal(html) {
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");

  if (!modal || !modalBody) {
    alert("Modal system not found. Make sure modal exists in HTML.");
    return;
  }

  modalBody.innerHTML = html;
  modal.style.display = "flex";
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.style.display = "none";
}

// ===============================
// 📊 MOOD + PERFORMANCE CHART (7 / 30 / ALL TIME)
// ===============================
let moodChartInstance = null;

function openMoodChart() {
  openModal(`
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div>
        <div style="color:white; font-size:1.2em; font-weight:700;">Mood & Performance</div>
        <div style="color:#9CA3AF; font-size:0.9em;">Energy vs Habits vs Tasks</div>
      </div>
      <select id="moodChartRange" style="padding:10px; border-radius:10px; background:rgba(255,255,255,0.08); color:white;">
        <option value="7">Last 7 Days</option>
        <option value="30">Last 30 Days</option>
        <option value="all">All Time</option>
      </select>
    </div>

    <div style="margin-top:16px;">
      <canvas id="moodChartCanvas" height="140"></canvas>
    </div>
  `);

  document.getElementById("moodChartRange").addEventListener("change", renderMoodChart);
  renderMoodChart();
}

function renderMoodChart() {
  const canvas = document.getElementById("moodChartCanvas");
  if (!canvas || typeof Chart === "undefined") return;

  const range = document.getElementById("moodChartRange").value;
  let days = [];

  if (range === "all") {
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    days = Object.keys(moodData).sort();
  } else {
    days = getLastNDays(parseInt(range));
  }

  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");

  const labels = days.map(d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }));

  const energy = days.map(d => (moodData[d]?.energy || 0) * 10);
  const habits = days.map(getHabitPercentForDay);

  const tasks = days.map(() => {
    const total = todos.length;
    const done = todos.filter(t => t.done).length;
    return total === 0 ? 0 : Math.round((done / total) * 100);
  });

  if (moodChartInstance) {
    moodChartInstance.destroy();
    moodChartInstance = null;
  }

  moodChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Energy", data: energy, tension: 0.3 },
        { label: "Habits %", data: habits, tension: 0.3 },
        { label: "Tasks %", data: tasks, tension: 0.3 }
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
// LIFE SCORE ENGINE (UNCHANGED)
// ===============================
/* ⬇️ I DID NOT TOUCH YOUR LIFE SCORE / WEEKLY GRAPH / DNA CODE ⬇️ */
// (your existing code stays exactly the same)

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
