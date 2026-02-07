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
    looksmaxxing: 4,
    journal: 5,
    visionBoard: 6,
    content: 7,
    books: 8,
    settings: 9
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

    // NOTE: scheduleContainer now shows Weekly Planner (safe swap)
    if (typeof renderSchedule === "function") renderSchedule();

    // ✅ SAFETY: never hard-crash if a module isn't loaded
    if (typeof renderLifeScore === "function") renderLifeScore();
    if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
    if (typeof renderDNAProfile === "function") renderDNAProfile();

    if (typeof renderInsightsWidget === "function") renderInsightsWidget();
    if (typeof renderEmbeddedCalendar === "function") renderEmbeddedCalendar();
  }

  if (page === "journal") {
    if (typeof renderJournal === "function") renderJournal();
  }

  if (page === "looksmaxxing") {
    if (typeof renderLooksMaxxing === "function") renderLooksMaxxing();
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

let todos = [];
let todoHistory = {};
let lastTodoDate = null;

// Load from storage on init
try {
  todos = JSON.parse(localStorage.getItem("todos")) || [];
  todoHistory = JSON.parse(localStorage.getItem("todoHistory")) || {};
  lastTodoDate = localStorage.getItem("lastTodoDate");
} catch (e) {
  console.error("Error loading todos:", e);
  todos = [];
  todoHistory = {};
  lastTodoDate = null;
}

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
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// =====================================================
// ✅ WEEKLY PLANNER SYSTEM (REPLACES DAILY SCHEDULE UI)
// =====================================================

const WEEKLY_PLANNER_KEY = "weeklyPlannerData";
const WEEKLY_PLANNER_SELECTED_DAY_KEY = "weeklyPlannerSelectedDay";

let weeklyPlannerData = {};
let weeklyPlannerSelectedDay = null;

function safeParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : fallback;
  } catch {
    return fallback;
  }
}

function getLocalDayKey(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function getWeekStartKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return getLocalDayKey(d);
}

function getWeekDatesFromStart(weekStartKey) {
  const [y, m, d] = weekStartKey.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  start.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    days.push(x);
  }
  return days;
}

function loadWeeklyPlanner() {
  weeklyPlannerData = safeParse(localStorage.getItem(WEEKLY_PLANNER_KEY), {});
  weeklyPlannerSelectedDay = localStorage.getItem(WEEKLY_PLANNER_SELECTED_DAY_KEY) || null;

  // Ensure selected day defaults to today
  const today = getTodayKey();
  if (!weeklyPlannerSelectedDay) weeklyPlannerSelectedDay = today;

  // Ensure current week exists
  const ws = getWeekStartKey(new Date());
  if (!weeklyPlannerData[ws]) {
    weeklyPlannerData[ws] = { days: {} };
    saveWeeklyPlanner();
  }

  // Ensure today exists inside its week
  ensureWeeklyPlannerDay(today);
}

function saveWeeklyPlanner() {
  localStorage.setItem(WEEKLY_PLANNER_KEY, JSON.stringify(weeklyPlannerData));
  localStorage.setItem(WEEKLY_PLANNER_SELECTED_DAY_KEY, weeklyPlannerSelectedDay || getTodayKey());
}

function ensureWeeklyPlannerDay(dayKey) {
  const dt = new Date(dayKey);
  if (isNaN(dt.getTime())) return;

  const ws = getWeekStartKey(dt);
  if (!weeklyPlannerData[ws]) weeklyPlannerData[ws] = { days: {} };

  if (!weeklyPlannerData[ws].days[dayKey]) {
    weeklyPlannerData[ws].days[dayKey] = {
      intentions: "",
      items: [] // {time, task, done}
    };
  }
}

function setWeeklyPlannerSelectedDay(dayKey) {
  weeklyPlannerSelectedDay = dayKey;
  ensureWeeklyPlannerDay(dayKey);
  saveWeeklyPlanner();
  renderWeeklyPlanner(); // immediate UI refresh
}

function getSelectedPlannerDayKey() {
  return weeklyPlannerSelectedDay || getTodayKey();
}

function getPlannerDayData(dayKey) {
  ensureWeeklyPlannerDay(dayKey);
  const ws = getWeekStartKey(new Date(dayKey));
  return weeklyPlannerData?.[ws]?.days?.[dayKey] || { intentions: "", items: [] };
}

function getPlannerCompletionForDay(dayKey) {
  const data = getPlannerDayData(dayKey);
  const items = Array.isArray(data.items) ? data.items : [];
  const total = items.length;
  const done = items.filter(i => i && i.done).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  return { percent, done, total };
}

// Export for other modules (Life Engine update will read this)
window.getPlannerCompletionForDay = getPlannerCompletionForDay;
window.getSelectedPlannerDayKey = getSelectedPlannerDayKey;

function setPlannerIntentions(value) {
  const dayKey = getSelectedPlannerDayKey();
  ensureWeeklyPlannerDay(dayKey);

  const ws = getWeekStartKey(new Date(dayKey));
  weeklyPlannerData[ws].days[dayKey].intentions = String(value || "");
  saveWeeklyPlanner();

  // Trigger dashboard updates (no refresh needed)
  if (typeof renderLifeScore === "function") renderLifeScore();
  if (typeof renderDNAProfile === "function") renderDNAProfile();
  if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
  if (typeof renderDashboardTrendChart === "function") renderDashboardTrendChart();
}

function addPlannerItem() {
  const dayKey = getSelectedPlannerDayKey();
  ensureWeeklyPlannerDay(dayKey);

  const timeInput = document.getElementById("plannerTime");
  const taskInput = document.getElementById("plannerTask");

  if (!timeInput || !taskInput) return;

  const time = (timeInput.value || "").trim();
  const task = (taskInput.value || "").trim();

  if (!time || !task) return;

  const ws = getWeekStartKey(new Date(dayKey));
  const day = weeklyPlannerData[ws].days[dayKey];

  day.items.push({ time, task, done: false });
  day.items.sort((a, b) => String(a.time).localeCompare(String(b.time)));

  timeInput.value = "";
  taskInput.value = "";

  saveWeeklyPlanner();
  renderWeeklyPlanner();

  if (typeof renderLifeScore === "function") renderLifeScore();
  if (typeof renderDNAProfile === "function") renderDNAProfile();
  if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
  if (typeof renderDashboardTrendChart === "function") renderDashboardTrendChart();
}

function togglePlannerItem(index) {
  const dayKey = getSelectedPlannerDayKey();
  const ws = getWeekStartKey(new Date(dayKey));
  const day = weeklyPlannerData?.[ws]?.days?.[dayKey];
  if (!day || !Array.isArray(day.items) || !day.items[index]) return;

  day.items[index].done = !day.items[index].done;

  saveWeeklyPlanner();
  renderWeeklyPlanner();

  if (typeof renderLifeScore === "function") renderLifeScore();
  if (typeof renderDNAProfile === "function") renderDNAProfile();
  if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
  if (typeof renderDashboardTrendChart === "function") renderDashboardTrendChart();
}

function deletePlannerItem(index) {
  const dayKey = getSelectedPlannerDayKey();
  const ws = getWeekStartKey(new Date(dayKey));
  const day = weeklyPlannerData?.[ws]?.days?.[dayKey];
  if (!day || !Array.isArray(day.items)) return;

  day.items.splice(index, 1);

  saveWeeklyPlanner();
  renderWeeklyPlanner();

  if (typeof renderLifeScore === "function") renderLifeScore();
  if (typeof renderDNAProfile === "function") renderDNAProfile();
  if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
  if (typeof renderDashboardTrendChart === "function") renderDashboardTrendChart();
}

function renderWeeklyPlanner() {
  const container = document.getElementById("scheduleContainer");
  if (!container) return;

  // Ensure data exists
  const today = getTodayKey();
  const dayKey = getSelectedPlannerDayKey() || today;
  ensureWeeklyPlannerDay(dayKey);

  const ws = getWeekStartKey(new Date(dayKey));
  if (!weeklyPlannerData[ws]) weeklyPlannerData[ws] = { days: {} };
  ensureWeeklyPlannerDay(dayKey);

  const dayData = getPlannerDayData(dayKey);
  const weekDates = getWeekDatesFromStart(ws);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const activeDatePretty = (() => {
    try {
      return new Date(dayKey).toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric"
      });
    } catch {
      return dayKey;
    }
  })();

  const completion = getPlannerCompletionForDay(dayKey);

  let html = `
    <div style="
      padding:16px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,0.14);
      background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
    ">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;">
        <div style="font-weight:900; font-size:1.05rem;">Weekly Planner</div>
        <div style="color:#9CA3AF; font-size:0.85rem;">${completion.done}/${completion.total} done • ${completion.percent}%</div>
      </div>

      <div style="color:#E5E7EB; font-weight:800; margin-bottom:8px;">
        ${activeDatePretty}
        <span style="color:#9CA3AF; font-weight:700; margin-left:8px;">(${dayKey})</span>
      </div>

      <div style="margin-bottom:12px;">
        <div style="color:#9CA3AF; font-size:0.85rem; margin-bottom:6px;">Intentions</div>
        <textarea
          id="plannerIntentions"
          class="form-input"
          style="min-height:90px; width:100%; resize:vertical;"
          placeholder="Write your intention for this day..."
          oninput="setPlannerIntentions(this.value)"
        >${escapeHtml(dayData.intentions || "")}</textarea>
      </div>

      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <input id="plannerTime" type="time" class="form-input" style="width:120px;" />
        <input id="plannerTask" class="form-input" placeholder="Time block task..." style="flex:1;" />
        <button class="form-submit" onclick="addPlannerItem()">Add</button>
      </div>

      <div id="plannerList" style="margin-bottom:14px;"></div>

      <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:6px;">
        ${weekDates.map((d, i) => {
          const dk = getLocalDayKey(d);
          const isActive = dk === dayKey;
          const isToday = dk === today;
          const pct = getPlannerCompletionForDay(dk).percent;

          const bg = isActive
            ? "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(236,72,153,0.75))"
            : "rgba(255,255,255,0.05)";

          const border = isToday
            ? "2px solid rgba(99,102,241,0.9)"
            : "1px solid rgba(255,255,255,0.14)";

          return `
            <div
              onclick="setWeeklyPlannerSelectedDay('${dk}')"
              style="
                cursor:pointer;
                padding:10px 8px;
                border-radius:14px;
                border:${border};
                background:${bg};
                text-align:center;
                transition:transform 0.12s ease;
              "
              onmouseover="this.style.transform='scale(1.03)'"
              onmouseout="this.style.transform='scale(1)'"
              title="${dk}"
            >
              <div style="font-weight:900; font-size:0.82rem; color:${isActive ? "white" : "#9CA3AF"};">${dayNames[i]}</div>
              <div style="font-weight:900; font-size:1.05rem; margin-top:2px; color:${isActive ? "white" : "#E5E7EB"};">${d.getDate()}</div>
              <div style="margin-top:6px; font-size:0.72rem; color:${isActive ? "rgba(255,255,255,0.9)" : "#9CA3AF"};">${pct}%</div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Render planner list
  const list = document.getElementById("plannerList");
  if (!list) return;

  const items = Array.isArray(dayData.items) ? dayData.items : [];
  if (!items.length) {
    list.innerHTML = `<div style="color:#9CA3AF;">No time blocks for this day yet.</div>`;
    return;
  }

  list.innerHTML = "";
  items.forEach((item, idx) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "12px";
    row.style.alignItems = "center";
    row.style.marginBottom = "8px";
    row.style.padding = "10px";
    row.style.borderRadius = "10px";
    row.style.border = "1px solid rgba(255,255,255,0.1)";
    row.style.background = item.done ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.02)";

    row.innerHTML = `
      <div style="font-weight:900; color:#6366F1; min-width:64px;">${escapeHtml(item.time)}</div>
      <span
        style="cursor:pointer; flex:1; ${item.done ? "text-decoration:line-through; color:#6B7280;" : "color:#E5E7EB;"}"
        onclick="togglePlannerItem(${idx})"
      >${escapeHtml(item.task)}</span>
      <button onclick="deletePlannerItem(${idx})" style="background:none; border:none; color:#EF4444; cursor:pointer;">✕</button>
    `;
    list.appendChild(row);
  });
}

// Make functions available for inline onclick usage
window.setWeeklyPlannerSelectedDay = setWeeklyPlannerSelectedDay;
window.setPlannerIntentions = setPlannerIntentions;
window.addPlannerItem = addPlannerItem;
window.togglePlannerItem = togglePlannerItem;
window.deletePlannerItem = deletePlannerItem;

// ===============================
// 📅 SCHEDULE SYSTEM (OLD - PRESERVED FOR SAFETY)
// ===============================
let schedule = [];
let lastScheduleDate = null;

// Load from storage on init
try {
  schedule = JSON.parse(localStorage.getItem("schedule")) || [];
  lastScheduleDate = localStorage.getItem("lastScheduleDate");
} catch (e) {
  console.error("Error loading schedule:", e);
  schedule = [];
  lastScheduleDate = null;
}

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

// ✅ SAFE SWAP: renderSchedule now renders Weekly Planner in scheduleContainer
function renderSchedule() {
  renderWeeklyPlanner();
}

// ===============================
// BOOT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  checkDailyTaskReset(); // 🔥 important
  checkDailyScheduleReset(); // 🔥 important (legacy)
  loadWeeklyPlanner(); // ✅ important

  // Restore last page or default to dashboard
  const lastPage = localStorage.getItem("currentPage") || "dashboard";
  showPage(lastPage);

  if (typeof initHabitsData === "function") initHabitsData();
  if (typeof initMoodData === "function") initMoodData();

  renderTodos();
  renderSchedule(); // now renders weekly planner

  // ✅ SAFETY: never hard-crash if a module isn't loaded
  if (typeof renderLifeScore === "function") renderLifeScore();
  if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
  if (typeof renderDNAProfile === "function") renderDNAProfile();
});
