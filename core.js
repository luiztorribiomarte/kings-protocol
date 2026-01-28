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

  // Save current page to localStorage
  localStorage.setItem("currentPage", page);

  if (page === "dashboard") {
    if (typeof renderMoodTracker === "function") renderMoodTracker();
    if (typeof renderHabits === "function") renderHabits();
    if (typeof renderTodos === "function") renderTodos();
    if (typeof renderSchedule === "function") renderSchedule();
    renderLifeScore();
    renderWeeklyGraph();
    renderDNAProfile();
  }

  if (page === "journal") {
    renderJournal();
  }
}

// ===============================
// MODAL SYSTEM
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
// 🧠 TASK HISTORY SYSTEM (IMPROVED)
// ===============================
function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

let todos = JSON.parse(localStorage.getItem("todos")) || [];
let todoHistory = JSON.parse(localStorage.getItem("todoHistory")) || {};
let lastTodoDate = localStorage.getItem("lastTodoDate");

// 🔥 DAILY RESET + SAVE HISTORY
function checkDailyTaskReset() {
  const today = getTodayKey();

  if (lastTodoDate && lastTodoDate !== today) {
    // Save yesterday's completion % AND the actual tasks
    if (todos.length > 0) {
      const done = todos.filter(t => t.done).length;
      const percent = Math.round((done / todos.length) * 100);
      
      // Store both percentage and task details
      todoHistory[lastTodoDate] = {
        percent: percent,
        total: todos.length,
        completed: done,
        tasks: todos.map(t => ({ text: t.text, done: t.done }))
      };
      localStorage.setItem("todoHistory", JSON.stringify(todoHistory));
    }

    // Clear tasks for new day
    todos = [];
    localStorage.setItem("todos", JSON.stringify(todos));
  }

  lastTodoDate = today;
  localStorage.setItem("lastTodoDate", today);
}

// ===============================
// TODO SYSTEM
// ===============================
function saveTodos() {
  localStorage.setItem("todos", JSON.stringify(todos));
  checkDailyTaskReset(); // Check if we need to archive
}

function addTodo() {
  const input = document.getElementById("todoInput");
  if (!input || !input.value.trim()) return;

  todos.push({ text: input.value.trim(), done: false });
  input.value = "";
  saveTodos();
  renderTodos();
  
  // Trigger all dashboard updates
  if (typeof renderLifeScore === "function") renderLifeScore();
  if (typeof renderDNAProfile === "function") renderDNAProfile();
  if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
  if (typeof renderDashboardTrendChart === "function") renderDashboardTrendChart();
}

function toggleTodo(index) {
  if (!todos[index]) return;
  todos[index].done = !todos[index].done;
  saveTodos();
  renderTodos();
  
  // Trigger all dashboard updates
  if (typeof renderLifeScore === "function") renderLifeScore();
  if (typeof renderDNAProfile === "function") renderDNAProfile();
  if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
  if (typeof renderDashboardTrendChart === "function") renderDashboardTrendChart();
}

function deleteTodo(index) {
  todos.splice(index, 1);
  saveTodos();
  renderTodos();
  
  // Trigger all dashboard updates
  if (typeof renderLifeScore === "function") renderLifeScore();
  if (typeof renderDNAProfile === "function") renderDNAProfile();
  if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
  if (typeof renderDashboardTrendChart === "function") renderDashboardTrendChart();
}

function renderTodos() {
  const list = document.getElementById("todoList");
  if (!list) return;

  list.innerHTML = "";
  if (!todos.length) {
    list.innerHTML = `<div style="color:#9CA3AF;">No tasks yet today.</div>`;
    return;
  }

  todos.forEach((todo, i) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.marginBottom = "6px";
    row.style.padding = "4px";

    row.innerHTML = `
      <span style="cursor:pointer; flex:1; ${todo.done ? "text-decoration:line-through; color:#6B7280;" : "color:#E5E7EB;"}"
            onclick="toggleTodo(${i})">${escapeHtml(todo.text)}</span>
      <button onclick="deleteTodo(${i})" style="background:none; border:none; color:#EF4444; cursor:pointer; font-size:1.1rem;">✕</button>
    `;
    list.appendChild(row);
  });
}

function escapeHtml(str) {
  return String(str||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

// ===============================
// 📅 SCHEDULE SYSTEM (NEW)
// ===============================
let schedule = JSON.parse(localStorage.getItem("schedule")) || [];
let lastScheduleDate = localStorage.getItem("lastScheduleDate");

function checkDailyScheduleReset() {
  const today = getTodayKey();
  
  if (lastScheduleDate && lastScheduleDate !== today) {
    // Clear schedule for new day
    schedule = [];
    localStorage.setItem("schedule", JSON.stringify(schedule));
  }
  
  lastScheduleDate = today;
  localStorage.setItem("lastScheduleDate", today);
}

function saveSchedule() {
  localStorage.setItem("schedule", JSON.stringify(schedule));
  checkDailyScheduleReset();
}

function addScheduleItem() {
  const timeInput = document.getElementById("scheduleTime");
  const taskInput = document.getElementById("scheduleTask");
  
  if (!timeInput || !taskInput || !timeInput.value || !taskInput.value.trim()) {
    return;
  }
  
  schedule.push({
    time: timeInput.value,
    task: taskInput.value.trim(),
    done: false
  });
  
  // Sort by time
  schedule.sort((a, b) => a.time.localeCompare(b.time));
  
  timeInput.value = "";
  taskInput.value = "";
  saveSchedule();
  renderSchedule();
}

function toggleScheduleItem(index) {
  schedule[index].done = !schedule[index].done;
  saveSchedule();
  renderSchedule();
}

function deleteScheduleItem(index) {
  schedule.splice(index, 1);
  saveSchedule();
  renderSchedule();
}

function renderSchedule() {
  const container = document.getElementById("scheduleContainer");
  if (!container) return;
  
  let html = `
    <div style="display:flex; gap:8px; margin-bottom:12px;">
      <input id="scheduleTime" type="time" class="form-input" style="width:120px;" />
      <input id="scheduleTask" class="form-input" placeholder="What are you doing?" style="flex:1;" />
      <button class="form-submit" onclick="addScheduleItem()">Add</button>
    </div>
    <div id="scheduleList"></div>
  `;
  
  container.innerHTML = html;
  
  const list = document.getElementById("scheduleList");
  if (!list) return;
  
  if (!schedule.length) {
    list.innerHTML = `<div style="color:#9CA3AF;">No schedule for today. Add time blocks above.</div>`;
    return;
  }
  
  schedule.forEach((item, i) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "12px";
    row.style.alignItems = "center";
    row.style.marginBottom = "8px";
    row.style.padding = "8px";
    row.style.borderRadius = "8px";
    row.style.border = "1px solid rgba(255,255,255,0.1)";
    row.style.background = item.done ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.02)";
    
    row.innerHTML = `
      <div style="font-weight:800; color:#6366F1; min-width:60px;">${item.time}</div>
      <span style="cursor:pointer; flex:1; ${item.done ? "text-decoration:line-through; color:#6B7280;" : ""}"
            onclick="toggleScheduleItem(${i})">${item.task}</span>
      <button onclick="deleteScheduleItem(${i})" style="background:none; border:none; color:#EF4444; cursor:pointer;">✕</button>
    `;
    list.appendChild(row);
  });
}

// ===============================
// BOOT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  checkDailyTaskReset(); // 🔥 important
  checkDailyScheduleReset(); // 🔥 important

  // Restore last page or default to dashboard
  const lastPage = localStorage.getItem("currentPage") || "dashboard";
  showPage(lastPage);

  if (typeof initHabitsData === "function") initHabitsData();
  if (typeof initMoodData === "function") initMoodData();

  renderTodos();
  renderSchedule();
  renderLifeScore();
  renderWeeklyGraph();
  renderDNAProfile();
});
