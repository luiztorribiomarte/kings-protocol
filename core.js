/* =========================================================
   MAIN CORE (MERGED + FIXED)
   ========================================================= */

(function () {
  "use strict";

  window.App = window.App || {
    features: {},
    events: {},
    on(page, fn) {
      if (!this.events[page]) this.events[page] = [];
      this.events[page].push(fn);
    },
    trigger(page) {
      (this.events[page] || []).forEach((fn) => {
        try { fn(); } catch (e) { console.error(e); }
      });
    }
  };

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
  window.escapeHtml = escapeHtml;

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

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toLocalISODate(date = new Date()) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }

  function parseLocalISODate(dayKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return new Date();
    const [y, m, d] = dayKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function getTodayKey() {
    return toLocalISODate(new Date());
  }

  function showPage(page) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".nav-tab").forEach((b) => b.classList.remove("active"));

    const el = document.getElementById(page + "Page");
    if (el) el.classList.add("active");

    localStorage.setItem("currentPage", page);

    if (page === "dashboard") {
      window.renderMoodTracker?.();
      window.renderHabits?.();
      window.renderSchedule?.();
      window.renderLifeScore?.();
      window.renderWeeklyGraph?.();
      window.renderDNAProfile?.();
      window.renderInsightsWidget?.();
      window.renderEmbeddedCalendar?.();
    }

    window.App.trigger(page);
  }

  window.showPage = showPage;

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

    if (lastTodoDate && lastTodoDate !== today) {
      if (todos.length) {
        const done = todos.filter(t => t.done).length;

        todoHistory[lastTodoDate] = {
          percent: Math.round((done / todos.length) * 100),
          total: todos.length,
          completed: done
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

  function renderTodos() {
    const list = document.getElementById("todoList");
    if (!list) return;

    list.innerHTML = "";

    if (!todos.length) {
      list.innerHTML = `<div style="color:#9CA3AF;">No tasks yet today.</div>`;
      return;
    }

    todos.forEach((t, i) => {
      const row = document.createElement("div");

      row.innerHTML = `
        <span onclick="toggleTodo(${i})"
        style="cursor:pointer;${t.done ? "text-decoration:line-through;color:#6B7280" : ""}">
        ${escapeHtml(t.text)}</span>
        <button onclick="deleteTodo(${i})">✕</button>
      `;

      list.appendChild(row);
    });
  }

  window.addTodo = function () {
    const input = document.getElementById("todoInput");
    if (!input?.value.trim()) return;

    todos.push({ text: input.value.trim(), done: false });
    input.value = "";
    saveTodos();
    renderTodos();
  };

  window.toggleTodo = function (i) {
    if (!todos[i]) return;
    todos[i].done = !todos[i].done;
    saveTodos();
    renderTodos();
  };

  window.deleteTodo = function (i) {
    todos.splice(i, 1);
    saveTodos();
    renderTodos();
  };

  window.todos = todos;
  window.todoHistory = todoHistory;

  const WEEKLY_PLANNER_KEY = "weeklyPlannerData";
  const WEEKLY_PLANNER_SELECTED_DAY_KEY = "weeklyPlannerSelectedDay";

  let weeklyPlannerData = {};
  let weeklyPlannerSelectedDay = null;

  function safeParse(raw, fallback) {
    try { return JSON.parse(raw) || fallback; } catch { return fallback; }
  }

  function getWeekStartKey(date = new Date()) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return toLocalISODate(d);
  }

  function isValidDayKey(k) {
    return /^\d{4}-\d{2}-\d{2}$/.test(k);
  }

  function saveWeeklyPlanner() {
    localStorage.setItem(WEEKLY_PLANNER_KEY, JSON.stringify(weeklyPlannerData));
    localStorage.setItem(WEEKLY_PLANNER_SELECTED_DAY_KEY, weeklyPlannerSelectedDay);
  }

  function ensureWeeklyPlannerDay(dayKey) {
    if (!isValidDayKey(dayKey)) return;

    const ws = getWeekStartKey(parseLocalISODate(dayKey));

    if (!weeklyPlannerData[ws]) weeklyPlannerData[ws] = { days: {} };

    if (!weeklyPlannerData[ws].days[dayKey]) {
      weeklyPlannerData[ws].days[dayKey] = { intentions: "", items: [] };
    }
  }

  // ==============================
  // ✅ FIXED REAL-TIME DATE SYNC
  // ==============================
  function loadWeeklyPlanner() {
    weeklyPlannerData = safeParse(localStorage.getItem(WEEKLY_PLANNER_KEY), {});
    weeklyPlannerSelectedDay = localStorage.getItem(WEEKLY_PLANNER_SELECTED_DAY_KEY);

    const today = getTodayKey();

    if (weeklyPlannerSelectedDay !== today) {
      weeklyPlannerSelectedDay = today;
    }

    if (!isValidDayKey(weeklyPlannerSelectedDay)) {
      weeklyPlannerSelectedDay = today;
    }

    const ws = getWeekStartKey(parseLocalISODate(weeklyPlannerSelectedDay));

    if (!weeklyPlannerData[ws]) {
      weeklyPlannerData[ws] = { days: {} };
      saveWeeklyPlanner();
    }

    ensureWeeklyPlannerDay(weeklyPlannerSelectedDay);
  }

  function renderWeeklyPlanner() {
    const el = document.getElementById("scheduleContainer");
    if (!el) return;

    const key = weeklyPlannerSelectedDay;
    const data = weeklyPlannerData[getWeekStartKey(parseLocalISODate(key))].days[key];

    el.innerHTML = `
      <div>
        <h3>Weekly Planner</h3>
        <div>${key}</div>
        <textarea
          oninput="setPlannerIntentions(this.value)"
          class="form-input">${escapeHtml(data.intentions)}</textarea>
      </div>
    `;
  }

  window.setPlannerIntentions = function (v) {
    const key = weeklyPlannerSelectedDay;
    ensureWeeklyPlannerDay(key);

    const ws = getWeekStartKey(parseLocalISODate(key));

    weeklyPlannerData[ws].days[key].intentions = v;
    saveWeeklyPlanner();
    renderWeeklyPlanner();
  };

  window.renderSchedule = function () {
    renderWeeklyPlanner();
  };

  document.addEventListener("DOMContentLoaded", () => {
    checkDailyTaskReset();
    loadWeeklyPlanner();

    window.initHabitsData?.();
    window.initMoodData?.();

    const lastPage = localStorage.getItem("currentPage") || "dashboard";
    showPage(lastPage);

    renderSchedule();
    window.renderLifeScore?.();
    window.renderWeeklyGraph?.();
    window.renderDNAProfile?.();
  });

})();
