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

  localStorage.setItem("currentPage", page);

  if (page === "dashboard") {
    renderDashboardCalendarSystem();
    if (typeof renderMoodTracker === "function") renderMoodTracker();
    if (typeof renderHabits === "function") renderHabits();
    if (typeof renderSchedule === "function") renderSchedule();
    renderLifeScore();
    renderWeeklyGraph();
    renderDNAProfile();
  }

  if (page === "journal") {
    renderJournal();
  }

  if (page === "looksmaxxing") {
    if (typeof renderLooksMaxxing === "function") renderLooksMaxxing();
  }
}

// ===============================
// DATE HELPERS
// ===============================
function getDateKey(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function formatDateLabel(key) {
  const d = new Date(key);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
}

// ===============================
// 📅 CALENDAR + INTENT SYSTEM
// ===============================
let calendarOpen = false;
let selectedDateKey = getDateKey();

let calendarData = {};
try {
  calendarData = JSON.parse(localStorage.getItem("calendarData")) || {};
} catch {
  calendarData = {};
}

function saveCalendarData() {
  localStorage.setItem("calendarData", JSON.stringify(calendarData));
}

function getDayData(key) {
  if (!calendarData[key]) {
    calendarData[key] = { intent: "", tasks: [] };
  }
  return calendarData[key];
}

// ---------- TASKS ----------
function addDayTask() {
  const input = document.getElementById("dayTaskInput");
  if (!input || !input.value.trim()) return;

  getDayData(selectedDateKey).tasks.push({
    text: input.value.trim(),
    done: false
  });

  input.value = "";
  saveCalendarData();
  renderSelectedDay();
}

function toggleDayTask(i) {
  const tasks = getDayData(selectedDateKey).tasks;
  tasks[i].done = !tasks[i].done;
  saveCalendarData();
  renderSelectedDay();
}

function deleteDayTask(i) {
  getDayData(selectedDateKey).tasks.splice(i, 1);
  saveCalendarData();
  renderSelectedDay();
}

// ---------- INTENT ----------
function saveIntent(val) {
  getDayData(selectedDateKey).intent = val;
  saveCalendarData();
}

// ---------- UI ----------
function renderSelectedDay() {
  const box = document.getElementById("selectedDayBox");
  if (!box) return;

  const day = getDayData(selectedDateKey);

  let tasksHtml = day.tasks.length
    ? day.tasks.map((t, i) => `
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span onclick="toggleDayTask(${i})"
            style="cursor:pointer; flex:1; ${t.done ? "text-decoration:line-through; color:#6B7280;" : ""}">
            ${t.text}
          </span>
          <button onclick="deleteDayTask(${i})"
            style="background:none;border:none;color:#EF4444;cursor:pointer;">✕</button>
        </div>
      `).join("")
    : `<div style="color:#9CA3AF;">No tasks planned for this day.</div>`;

  box.innerHTML = `
    <div style="margin-bottom:10px; font-weight:700;">
      Tasks for ${formatDateLabel(selectedDateKey)}
    </div>

    <textarea
      placeholder="Daily intention..."
      oninput="saveIntent(this.value)"
      style="width:100%;margin-bottom:10px;"
    >${day.intent}</textarea>

    <div style="display:flex;gap:8px;margin-bottom:10px;">
      <input id="dayTaskInput" placeholder="Add task..." style="flex:1;" />
      <button onclick="addDayTask()">Add</button>
    </div>

    ${tasksHtml}
  `;
}

function renderCalendar() {
  const cal = document.getElementById("calendarGrid");
  if (!cal) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  let html = "";
  for (let d = 1; d <= last.getDate(); d++) {
    const key = getDateKey(new Date(year, month, d));
    html += `
      <div onclick="selectCalendarDay('${key}')"
        style="
          padding:10px;
          border-radius:8px;
          cursor:pointer;
          background:${key === selectedDateKey ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)'};
        ">
        ${d}
      </div>
    `;
  }
  cal.innerHTML = html;
}

function selectCalendarDay(key) {
  selectedDateKey = key;
  renderCalendar();
  renderSelectedDay();
}

function toggleCalendar() {
  calendarOpen = !calendarOpen;
  document.getElementById("calendarWrap").style.display = calendarOpen ? "block" : "none";
}

// ---------- DASHBOARD INSERT ----------
function renderDashboardCalendarSystem() {
  const dash = document.getElementById("dashboardPage");
  if (!dash || document.getElementById("calendarSystem")) return;

  const section = document.createElement("div");
  section.id = "calendarSystem";
  section.innerHTML = `
    <div id="selectedDayBox" style="margin-bottom:16px;"></div>

    <button onclick="toggleCalendar()" style="width:100%;margin-bottom:12px;">
      📅 Open Calendar
    </button>

    <div id="calendarWrap" style="display:none;">
      <div id="calendarGrid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;"></div>
    </div>
  `;

  dash.appendChild(section);

  renderCalendar();
  renderSelectedDay();
}

// ===============================
// BOOT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const lastPage = localStorage.getItem("currentPage") || "dashboard";
  showPage(lastPage);
});
