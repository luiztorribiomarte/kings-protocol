// ===============================
// KP APP CORE (UPGRADED)
// ===============================

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

    App.emit("dashboard");
  }

  if (page === "goalsHabits") {
    if (typeof renderGoals === "function") renderGoals();
    App.emit("goals");
  }

  if (page === "journal") {
    if (typeof renderJournal === "function") renderJournal();
    App.emit("journal");
  }

  if (page === "workout") {
    App.emit("workout");
  }
}

// ===============================
// GLOBAL MODAL SYSTEM
// ===============================
function openModal(html) {
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");

  if (!modal || !modalBody) {
    alert("Modal system not found.");
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
App.state.todos = JSON.parse(localStorage.getItem("todos")) || [];
const todos = App.state.todos;

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
// BOOT SYSTEM (SINGLE AUTHORITY)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  showPage("dashboard");

  if (typeof initHabitsData === "function") initHabitsData();
  if (typeof initMoodData === "function") initMoodData();
  if (typeof initGoalsData === "function") initGoalsData();

  renderTodos();
  renderLifeScore();
  renderWeeklyGraph();
  renderDNAProfile();

  App.emit("ready");
});
