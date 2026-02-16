
(function () {
  "use strict";

  // =====================================================
  // ✅ APP CONTROLLER (RESTORED) — REQUIRED BY habits.js/mood.js
  // =====================================================
  window.App = window.App || {
    features: {},
    events: {},
    on(page, fn) {
      if (!this.events[page]) this.events[page] = [];
      this.events[page].push(fn);
    },
    trigger(page) {
      (this.events[page] || []).forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.error("App trigger error:", e);
        }
      });
    }
  };

  // =====================================================
  // ✅ HTML ESCAPE (EXPORTED) — habits.js calls window.escapeHtml()
  // =====================================================
  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
  window.escapeHtml = escapeHtml;

  // =====================================================
  // ✅ MODAL SYSTEM (FIXED OVERLAY + NO "SCROLL TO TOP")
  // =====================================================
  function openModal(html) {
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modalBody");

    if (!modal || !modalBody) {
      alert("Modal system not found.");
      return;
    }

    // Force true overlay behavior (even if CSS is off)
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.zIndex = "99999";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";

    // Prevent background scroll WITHOUT jumping
    document.body.dataset._scrollY = String(window.scrollY || 0);
    document.body.style.overflow = "hidden";

    modalBody.innerHTML = html;

    // Ensure it’s visible immediately
    requestAnimationFrame(() => {
      modal.style.opacity = "1";
    });
  }

  function closeModal() {
    const modal = document.getElementById("modal");
    if (modal) modal.style.display = "none";

    // Restore scrolling
    document.body.style.overflow = "";
    delete document.body.dataset._scrollY;
  }

  window.openModal = openModal;
  window.closeModal = closeModal;

  // =====================================================
  // TIME + DATE
  // =====================================================
  function updateTime() {
    const now = new Date();
    const timeEl = document.getElementById("currentTime");
    const dateEl = document.getElementById("currentDate");

    if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (dateEl)
      dateEl.textContent = now.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
  }
  setInterval(updateTime, 1000);
  updateTime();

  // =====================================================
  // ✅ LOCAL DAY KEY HELPERS (FIXES UTC DATE DRIFT)
  // =====================================================
  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toLocalISODate(date = new Date()) {
    const y = date.getFullYear();
    const m = pad2(date.getMonth() + 1);
    const d = pad2(date.getDate());
    return `${y}-${m}-${d}`;
  }

  function parseLocalISODate(dayKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dayKey || ""))) return new Date();
    const [y, m, d] = String(dayKey).split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  function getTodayKey() {
    return toLocalISODate(new Date());
  }

  // =====================================================
  // ✅ NAV HIGHLIGHT FIX (NO MORE nth-child BUG)
  // =====================================================
  function findTabForPage(page) {
    const tabs = Array.from(document.querySelectorAll(".nav-tab"));
    if (!tabs.length) return null;

    const byData = tabs.find((t) => (t.dataset && (t.dataset.page === page || t.dataset.target === page)));
    if (byData) return byData;

    const byOnclick = tabs.find((t) => {
      const oc = t.getAttribute("onclick") || "";
      return oc.includes(`showPage('${page}')`) || oc.includes(`showPage("${page}")`) || oc.includes(`showPage(${page})`);
    });
    if (byOnclick) return byOnclick;

    const byHref = tabs.find((t) => {
      const a = t.tagName === "A" ? t : t.querySelector("a");
      const href = a ? a.getAttribute("href") || "" : "";
      return href === `#${page}` || href.includes(page);
    });
    if (byHref) return byHref;

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
    const idx = map[page];
    if (idx && tabs[idx - 1]) return tabs[idx - 1];

    return null;
  }

  // =====================================================
  // PAGE NAVIGATION (FIXED + App.trigger)
  // =====================================================
  function showPage(page) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".nav-tab").forEach((b) => b.classList.remove("active"));

    const pageId = page + "Page";
    const el = document.getElementById(pageId);
    if (el) el.classList.add("active");

    const tab = findTabForPage(page);
    if (tab) tab.classList.add("active");

    localStorage.setItem("currentPage", page);

    // PAGE-SPECIFIC RENDERS (SAFE)
    if (page === "dashboard") {
      if (typeof window.renderMoodTracker === "function") window.renderMoodTracker();
      if (typeof window.renderHabits === "function") window.renderHabits();

      if (typeof window.renderSchedule === "function") window.renderSchedule();

      if (typeof window.renderLifeScore === "function") window.renderLifeScore();
      if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
      if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();

      if (typeof window.renderInsightsWidget === "function") window.renderInsightsWidget();
      if (typeof window.renderEmbeddedCalendar === "function") window.renderEmbeddedCalendar();
    }

    if (page === "journal") {
      if (typeof window.renderJournal === "function") window.renderJournal();
    }

    if (page === "looksmaxxing") {
      if (typeof window.renderLooksMaxxing === "function") window.renderLooksMaxxing();
    }

    try {
      window.App.trigger(page);
    } catch (e) {
      console.error("App.trigger failed:", e);
    }
  }

  window.showPage = showPage;

  // =====================================================
  // 🧠 TASK HISTORY SYSTEM (IMPROVED) — SAME AS YOUR CORE
  // (UI removed from HTML, but history remains intact for metrics)
  // =====================================================
  let todos = [];
  let todoHistory = {};
  let lastTodoDate = null;

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

  function checkDailyTaskReset() {
    const today = getTodayKey();

    if (lastTodoDate && lastTodoDate !== today) {
      if (todos.length > 0) {
        const done = todos.filter((t) => t.done).length;
        const percent = Math.round((done / todos.length) * 100);

        todoHistory[lastTodoDate] = {
          percent: percent,
          total: todos.length,
          completed: done,
          tasks: todos.map((t) => ({ text: t.text, done: t.done }))
        };
        localStorage.setItem("todoHistory", JSON.stringify(todoHistory));
      }

      todos = [];
      localStorage.setItem("todos", JSON.stringify(todos));
    }

    lastTodoDate = today;
    localStorage.setItem("lastTodoDate", today);
  }

  function saveTodos() {
    localStorage.setItem("todos", JSON.stringify(todos));
    checkDailyTaskReset();
  }

  function addTodo() {
    const input = document.getElementById("todoInput");
    if (!input || !input.value.trim()) return;

    todos.push({ text: input.value.trim(), done: false });
    input.value = "";
    saveTodos();
    renderTodos();

    if (typeof window.renderLifeScore === "function") window.renderLifeScore();
    if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();
    if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
    if (typeof window.renderDashboardTrendChart === "function") window.renderDashboardTrendChart();
  }

  function toggleTodo(index) {
    if (!todos[index]) return;
    todos[index].done = !todos[index].done;
    saveTodos();
    renderTodos();

    if (typeof window.renderLifeScore === "function") window.renderLifeScore();
    if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();
    if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
    if (typeof window.renderDashboardTrendChart === "function") window.renderDashboardTrendChart();
  }

  function deleteTodo(index) {
    todos.splice(index, 1);
    saveTodos();
    renderTodos();

    if (typeof window.renderLifeScore === "function") window.renderLifeScore();
    if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();
    if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
    if (typeof window.renderDashboardTrendChart === "function") window.renderDashboardTrendChart();
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

  window.todos = todos;
  window.todoHistory = todoHistory;

  window.addTodo = addTodo;
  window.toggleTodo = toggleTodo;
  window.deleteTodo = deleteTodo;
  window.renderTodos = renderTodos;

  // =====================================================
  // ✅ WEEKLY PLANNER SYSTEM (UNCHANGED LOGIC)
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
    return toLocalISODate(date);
  }

  function getWeekStartKey(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return getLocalDayKey(d);
  }

  function getWeekDatesFromStart(weekStartKey) {
    const start = parseLocalISODate(weekStartKey);
    start.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const x = new Date(start);
      x.setDate(start.getDate() + i);
      days.push(x);
    }
    return days;
  }

  function isValidDayKey(k) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(k || ""));
  }

  function saveWeeklyPlanner() {
    localStorage.setItem(WEEKLY_PLANNER_KEY, JSON.stringify(weeklyPlannerData));
    localStorage.setItem(WEEKLY_PLANNER_SELECTED_DAY_KEY, weeklyPlannerSelectedDay || getTodayKey());
  }

  function ensureWeeklyPlannerDay(dayKey) {
    if (!isValidDayKey(dayKey)) return;
    const dt = parseLocalISODate(dayKey);
    if (isNaN(dt.getTime())) return;

    const ws = getWeekStartKey(dt);
    if (!weeklyPlannerData[ws]) weeklyPlannerData[ws] = { days: {} };

    if (!weeklyPlannerData[ws].days[dayKey]) {
      weeklyPlannerData[ws].days[dayKey] = { intentions: "", items: [] };
    }
  }

  function loadWeeklyPlanner() {
    weeklyPlannerData = safeParse(localStorage.getItem(WEEKLY_PLANNER_KEY), {});
    weeklyPlannerSelectedDay = localStorage.getItem(WEEKLY_PLANNER_SELECTED_DAY_KEY) || null;

    const today = getTodayKey();
    if (!isValidDayKey(weeklyPlannerSelectedDay)) weeklyPlannerSelectedDay = today;

    const ws = getWeekStartKey(parseLocalISODate(weeklyPlannerSelectedDay));
    if (!weeklyPlannerData[ws]) {
      weeklyPlannerData[ws] = { days: {} };
      saveWeeklyPlanner();
    }

    ensureWeeklyPlannerDay(weeklyPlannerSelectedDay);
  }

  function setWeeklyPlannerSelectedDay(dayKey) {
    if (!isValidDayKey(dayKey)) dayKey = getTodayKey();
    weeklyPlannerSelectedDay = dayKey;

    ensureWeeklyPlannerDay(dayKey);
    saveWeeklyPlanner();
    renderWeeklyPlanner();
  }

  function getSelectedPlannerDayKey() {
    const k = weeklyPlannerSelectedDay || getTodayKey();
    return isValidDayKey(k) ? k : getTodayKey();
  }

  function getPlannerDayData(dayKey) {
    ensureWeeklyPlannerDay(dayKey);
    const ws = getWeekStartKey(parseLocalISODate(dayKey));
    return weeklyPlannerData?.[ws]?.days?.[dayKey] || { intentions: "", items: [] };
  }

  function getPlannerCompletionForDay(dayKey) {
    const data = getPlannerDayData(dayKey);
    const items = Array.isArray(data.items) ? data.items : [];
    const total = items.length;
    const done = items.filter((i) => i && i.done).length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    return { percent, done, total };
  }

  window.getPlannerCompletionForDay = getPlannerCompletionForDay;
  window.getSelectedPlannerDayKey = getSelectedPlannerDayKey;

  function setPlannerIntentions(value) {
    const dayKey = getSelectedPlannerDayKey();
    ensureWeeklyPlannerDay(dayKey);

    const ws = getWeekStartKey(parseLocalISODate(dayKey));
    weeklyPlannerData[ws].days[dayKey].intentions = String(value || "");
    saveWeeklyPlanner();

    if (typeof window.renderLifeScore === "function") window.renderLifeScore();
    if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();
    if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
    if (typeof window.renderDashboardTrendChart === "function") window.renderDashboardTrendChart();
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

    const ws = getWeekStartKey(parseLocalISODate(dayKey));
    const day = weeklyPlannerData[ws].days[dayKey];

    day.items.push({ time, task, done: false });
    day.items.sort((a, b) => String(a.time).localeCompare(String(b.time)));

    timeInput.value = "";
    taskInput.value = "";

    saveWeeklyPlanner();
    renderWeeklyPlanner();

    if (typeof window.renderLifeScore === "function") window.renderLifeScore();
    if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();
    if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
    if (typeof window.renderDashboardTrendChart === "function") window.renderDashboardTrendChart();
  }

  function togglePlannerItem(index) {
    const dayKey = getSelectedPlannerDayKey();
    const ws = getWeekStartKey(parseLocalISODate(dayKey));
    const day = weeklyPlannerData?.[ws]?.days?.[dayKey];
    if (!day || !Array.isArray(day.items) || !day.items[index]) return;

    day.items[index].done = !day.items[index].done;
    saveWeeklyPlanner();
    renderWeeklyPlanner();

    if (typeof window.renderLifeScore === "function") window.renderLifeScore();
    if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();
    if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
    if (typeof window.renderDashboardTrendChart === "function") window.renderDashboardTrendChart();
  }

  function deletePlannerItem(index) {
    const dayKey = getSelectedPlannerDayKey();
    const ws = getWeekStartKey(parseLocalISODate(dayKey));
    const day = weeklyPlannerData?.[ws]?.days?.[dayKey];
    if (!day || !Array.isArray(day.items)) return;

    day.items.splice(index, 1);
    saveWeeklyPlanner();
    renderWeeklyPlanner();

    if (typeof window.renderLifeScore === "function") window.renderLifeScore();
    if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();
    if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
    if (typeof window.renderDashboardTrendChart === "function") window.renderDashboardTrendChart();
  }

  function renderWeeklyPlanner() {
    const container = document.getElementById("scheduleContainer");
    if (!container) return;

    const today = getTodayKey();
    const dayKey = getSelectedPlannerDayKey() || today;
    ensureWeeklyPlannerDay(dayKey);

    const ws = getWeekStartKey(parseLocalISODate(dayKey));
    if (!weeklyPlannerData[ws]) weeklyPlannerData[ws] = { days: {} };
    ensureWeeklyPlannerDay(dayKey);

    const dayData = getPlannerDayData(dayKey);
    const weekDates = getWeekDatesFromStart(ws);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const activeDatePretty = (() => {
      try {
        return parseLocalISODate(dayKey).toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric"
        });
      } catch {
        return dayKey;
      }
    })();

    const completion = getPlannerCompletionForDay(dayKey);

    container.innerHTML = `
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
          ${weekDates
            .map((d, i) => {
              const dk = getLocalDayKey(d);
              const isActive = dk === dayKey;
              const isToday = dk === today;
              const pct = getPlannerCompletionForDay(dk).percent;

              const bg = isActive
                ? "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(236,72,153,0.75))"
                : "rgba(255,255,255,0.05)";

              const border = isToday ? "2px solid rgba(99,102,241,0.9)" : "1px solid rgba(255,255,255,0.14)";

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
            })
            .join("")}
        </div>
      </div>
    `;

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

  window.setWeeklyPlannerSelectedDay = setWeeklyPlannerSelectedDay;
  window.setPlannerIntentions = setPlannerIntentions;
  window.addPlannerItem = addPlannerItem;
  window.togglePlannerItem = togglePlannerItem;
  window.deletePlannerItem = deletePlannerItem;
  window.renderWeeklyPlanner = renderWeeklyPlanner;

  // =====================================================
  // LEGACY SCHEDULE (PRESERVED)
  // =====================================================
  let schedule = [];
  let lastScheduleDate = null;

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
      schedule = [];
      localStorage.setItem("schedule", JSON.stringify(schedule));
    }

    lastScheduleDate = today;
    localStorage.setItem("lastScheduleDate", today);
  }

  function renderSchedule() {
    renderWeeklyPlanner();
  }

  window.renderSchedule = renderSchedule;

  // =====================================================
  // BOOT (CRITICAL INIT ORDER)
  // =====================================================
  document.addEventListener("DOMContentLoaded", () => {
    checkDailyTaskReset();
    checkDailyScheduleReset();
    loadWeeklyPlanner();

    // ✅ INIT FEATURES FIRST (habits/mood store init)
    if (typeof window.initHabitsData === "function") window.initHabitsData();
    if (typeof window.initMoodData === "function") window.initMoodData();

    // ✅ Restore last page and render
    const lastPage = localStorage.getItem("currentPage") || "dashboard";
    showPage(lastPage);

    // Dashboard initial renders (safe)
    renderSchedule();

    if (typeof window.renderLifeScore === "function") window.renderLifeScore();
    if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
    if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();
  });

  // =====================================================
  // 🕛 MIDNIGHT / DATE CHANGE WATCHER (FIXES STUCK PLANNER)
  // =====================================================

  let _kpLastKnownDay = getTodayKey();

  function watchForDateChange() {
    const now = getTodayKey();

    if (now !== _kpLastKnownDay) {
      _kpLastKnownDay = now;

      // Force planner to today
      setWeeklyPlannerSelectedDay(now);

      // Reset daily systems
      checkDailyTaskReset();
      checkDailyScheduleReset();

      // Re-render dashboard systems
      if (typeof window.renderSchedule === "function") window.renderSchedule();
      if (typeof window.renderLifeScore === "function") window.renderLifeScore();
      if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
      if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();
    }
  }

  // Check every minute
  setInterval(watchForDateChange, 60000);

  console.log("Main core loaded (App restored, nav fixed, modal fixed)");
})();

