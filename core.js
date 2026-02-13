// =====================================================
// MASTER CORE CONTROLLER (MERGED + STABLE)
// =====================================================

// ===============================
// PAGE NAVIGATION (FIXED)
// ===============================
function showPage(page) {
  document.querySelectorAll(".page").forEach(p =>
    p.classList.remove("active")
  );

  document.querySelectorAll(".nav-tab").forEach(b =>
    b.classList.remove("active")
  );

  // Use data-page attribute instead of nth-child
  const tab = document.querySelector(`.nav-tab[data-page="${page}"]`);
  if (tab) tab.classList.add("active");

  const el = document.getElementById(page + "Page");
  if (el) el.classList.add("active");

  localStorage.setItem("currentPage", page);

  if (page === "dashboard") {
    safe(renderMoodTracker);
    safe(renderHabits);
    safe(renderTodos);
    safe(renderSchedule);
    safe(renderLifeScore);
    safe(renderWeeklyGraph);
    safe(renderDNAProfile);
    safe(renderInsightsWidget);
    safe(renderEmbeddedCalendar);
    safe(renderDashboardCalendarSystem);
  }

  if (page === "journal") safe(renderJournal);
  if (page === "looksmaxxing") safe(renderLooksMaxxing);

  // Prevent auto scroll jump
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function safe(fn) {
  if (typeof fn === "function") fn();
}

// ===============================
// MODAL SYSTEM (NO SCROLL JUMP)
// ===============================
function openModal(html) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modalBody");

  if (!modal || !body) return;

  body.innerHTML = html;

  modal.style.display = "flex";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";

  document.body.style.overflow = "hidden";
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (!modal) return;

  modal.style.display = "none";
  document.body.style.overflow = "";
}

// ===============================
// CLOCK
// ===============================
function updateTime() {
  const now = new Date();

  const timeEl = document.getElementById("currentTime");
  const dateEl = document.getElementById("currentDate");

  if (timeEl)
    timeEl.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

  if (dateEl)
    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
}

setInterval(updateTime, 1000);
updateTime();

// ===============================
// DATE HELPERS (LOCAL SAFE)
// ===============================
function pad2(n) {
  return String(n).padStart(2, "0");
}

function toLocalISODate(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseLocalISODate(k) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return new Date();
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getTodayKey() {
  return toLocalISODate(new Date());
}

// ===============================
// TODOS
// ===============================
let todos = [];
let todoHistory = {};
let lastTodoDate = null;

try {
  todos = JSON.parse(localStorage.getItem("todos")) || [];
  todoHistory = JSON.parse(localStorage.getItem("todoHistory")) || {};
  lastTodoDate = localStorage.getItem("lastTodoDate");
} catch {}

function checkDailyTaskReset() {
  const today = getTodayKey();

  if (lastTodoDate && lastTodoDate !== today && todos.length) {
    const done = todos.filter(t => t.done).length;

    todoHistory[lastTodoDate] = {
      percent: Math.round((done / todos.length) * 100),
      total: todos.length,
      completed: done
    };

    localStorage.setItem("todoHistory", JSON.stringify(todoHistory));

    todos = [];
    localStorage.setItem("todos", "[]");
  }

  lastTodoDate = today;
  localStorage.setItem("lastTodoDate", today);
}

function saveTodos() {
  localStorage.setItem("todos", JSON.stringify(todos));
  checkDailyTaskReset();
}

function addTodo() {
  const i = document.getElementById("todoInput");
  if (!i || !i.value.trim()) return;

  todos.push({ text: i.value.trim(), done: false });
  i.value = "";

  saveTodos();
  renderTodos();
}

function toggleTodo(i) {
  if (!todos[i]) return;

  todos[i].done = !todos[i].done;
  saveTodos();
  renderTodos();
}

function deleteTodo(i) {
  todos.splice(i, 1);
  saveTodos();
  renderTodos();
}

function renderTodos() {
  const list = document.getElementById("todoList");
  if (!list) return;

  list.innerHTML = "";

  if (!todos.length) {
    list.innerHTML = `<div style="color:#9CA3AF;">No tasks.</div>`;
    return;
  }

  todos.forEach((t, i) => {
    const row = document.createElement("div");

    row.innerHTML = `
      <span onclick="toggleTodo(${i})"
        style="cursor:pointer;flex:1;${t.done ? "text-decoration:line-through;color:#6B7280;" : ""}">
        ${escapeHtml(t.text)}
      </span>

      <button onclick="deleteTodo(${i})"
        style="background:none;border:none;color:#EF4444;">✕</button>
    `;

    row.style.display = "flex";
    row.style.marginBottom = "6px";

    list.appendChild(row);
  });
}

// ===============================
// ESCAPE
// ===============================
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// ===============================
// WEEKLY PLANNER (UNCHANGED CORE)
// ===============================

const WEEKLY_PLANNER_KEY = "weeklyPlannerData";
const WEEKLY_PLANNER_SELECTED_DAY_KEY = "weeklyPlannerSelectedDay";

let weeklyPlannerData = {};
let weeklyPlannerSelectedDay = null;

function safeParse(r, f) {
  try {
    const v = JSON.parse(r);
    return v && typeof v === "object" ? v : f;
  } catch {
    return f;
  }
}

function getWeekStartKey(d = new Date()) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  return toLocalISODate(x);
}

function loadWeeklyPlanner() {
  weeklyPlannerData = safeParse(
    localStorage.getItem(WEEKLY_PLANNER_KEY),
    {}
  );

  weeklyPlannerSelectedDay =
    localStorage.getItem(WEEKLY_PLANNER_SELECTED_DAY_KEY) ||
    getTodayKey();
}

function saveWeeklyPlanner() {
  localStorage.setItem(
    WEEKLY_PLANNER_KEY,
    JSON.stringify(weeklyPlannerData)
  );

  localStorage.setItem(
    WEEKLY_PLANNER_SELECTED_DAY_KEY,
    weeklyPlannerSelectedDay
  );
}

function renderSchedule() {
  if (typeof renderWeeklyPlanner === "function") {
    renderWeeklyPlanner();
  }
}

// ===============================
// DASHBOARD CALENDAR (FROM APP.JS)
// ===============================

let calendarOpen = false;
let selectedDateKey = getTodayKey();
let calendarData = {};

try {
  calendarData =
    JSON.parse(localStorage.getItem("calendarData")) || {};
} catch {}

function saveCalendarData() {
  localStorage.setItem(
    "calendarData",
    JSON.stringify(calendarData)
  );
}

function getDayData(k) {
  if (!calendarData[k]) {
    calendarData[k] = { intent: "", tasks: [] };
  }
  return calendarData[k];
}

function renderDashboardCalendarSystem() {
  const dash = document.getElementById("dashboardPage");

  if (!dash || document.getElementById("calendarSystem")) return;

  const s = document.createElement("div");

  s.id = "calendarSystem";

  s.innerHTML = `
    <div id="selectedDayBox"></div>

    <button onclick="toggleCalendar()">
      📅 Calendar
    </button>

    <div id="calendarWrap" style="display:none;">
      <div id="calendarGrid"
        style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;">
      </div>
    </div>
  `;

  dash.appendChild(s);

  renderCalendar();
  renderSelectedDay();
}

function toggleCalendar() {
  calendarOpen = !calendarOpen;

  document.getElementById("calendarWrap").style.display =
    calendarOpen ? "block" : "none";
}

function renderCalendar() {
  const cal = document.getElementById("calendarGrid");
  if (!cal) return;

  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();

  const last = new Date(y, m + 1, 0);

  let html = "";

  for (let i = 1; i <= last.getDate(); i++) {
    const k = toLocalISODate(new Date(y, m, i));

    html += `
      <div onclick="selectCalendarDay('${k}')"
        style="padding:8px;cursor:pointer;
        background:${k === selectedDateKey ? "#6366F155" : "#ffffff08"};">
        ${i}
      </div>
    `;
  }

  cal.innerHTML = html;
}

function selectCalendarDay(k) {
  selectedDateKey = k;
  renderCalendar();
  renderSelectedDay();
}

function renderSelectedDay() {
  const box = document.getElementById("selectedDayBox");
  if (!box) return;

  const d = getDayData(selectedDateKey);

  box.innerHTML = `
    <div style="font-weight:700;">
      ${selectedDateKey}
    </div>

    <textarea oninput="saveIntent(this.value)">
      ${d.intent}
    </textarea>
  `;
}

function saveIntent(v) {
  getDayData(selectedDateKey).intent = v;
  saveCalendarData();
}

// ===============================
// BOOT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  checkDailyTaskReset();
  loadWeeklyPlanner();

  const last =
    localStorage.getItem("currentPage") || "dashboard";

  showPage(last);

  safe(initHabitsData);
  safe(initMoodData);

  renderTodos();
  renderSchedule();
});
