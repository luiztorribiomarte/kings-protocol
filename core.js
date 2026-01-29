/* core.js
   single source of truth for: App bus, navigation, modal, time/date, todos, schedule
   (no DOMContentLoaded boot in here — app.js handles boot)
*/

(function () {
  "use strict";

  // ===============================
  // APP EVENT BUS (prevents "App is not defined")
  // ===============================
  const App = (window.App = window.App || {});
  App.features = App.features || {};
  App._events = App._events || {};

  App.on = App.on || function (eventName, handler) {
    if (!App._events[eventName]) App._events[eventName] = [];
    App._events[eventName].push(handler);
  };

  App.emit = App.emit || function (eventName, payload) {
    const handlers = App._events[eventName] || [];
    handlers.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.error(`App handler failed for "${eventName}":`, e);
      }
    });
  };

  // ===============================
  // SAFE CALL
  // ===============================
  window.safeCall = window.safeCall || function (fnName, ...args) {
    const fn = window[fnName];
    if (typeof fn === "function") return fn(...args);
  };

  // ===============================
  // PAGE NAVIGATION
  // ===============================
  window.showPage = function showPage(page) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".nav-tab").forEach((b) => b.classList.remove("active"));

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

    // persist last page
    try {
      localStorage.setItem("currentPage", page);
    } catch {}

    // dashboard renders
    if (page === "dashboard") {
      safeCall("renderMoodTracker");
      safeCall("renderHabits");
      safeCall("renderTodos");
      safeCall("renderSchedule");
      safeCall("renderLifeScore");
      safeCall("renderWeeklyGraph");
      safeCall("renderDNAProfile");
      safeCall("renderInsightsWidget");
      App.emit("dashboard");
    }

    if (page === "journal") {
      safeCall("renderJournal");
      App.emit("journal");
    }

    if (page === "looksmaxxing") {
      safeCall("renderLooksMaxxing");
      App.emit("looksmaxxing");
    }
  };

  // ===============================
  // MODAL SYSTEM
  // ===============================
  window.openModal = function openModal(html) {
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modalBody");

    if (!modal || !modalBody) {
      alert("Modal system not found.");
      return;
    }

    modalBody.innerHTML = html;
    modal.style.display = "flex";
  };

  window.closeModal = function closeModal() {
    const modal = document.getElementById("modal");
    if (modal) modal.style.display = "none";
  };

  // ===============================
  // TIME + DATE
  // ===============================
  window.updateTime = function updateTime() {
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
  };

  // start the clock immediately
  try {
    setInterval(window.updateTime, 1000);
    window.updateTime();
  } catch {}

  // ===============================
  // HELPERS
  // ===============================
  window.getTodayKey = window.getTodayKey || function getTodayKey() {
    return new Date().toISOString().split("T")[0];
  };

  window.escapeHtml = window.escapeHtml || function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  };

  // ===============================
  // TODOS (global state, no redeclare)
  // ===============================
  window.todos = window.todos || [];
  window.todoHistory = window.todoHistory || {};
  window.lastTodoDate = window.lastTodoDate || null;

  function loadTodosFromStorage() {
    try {
      const t = JSON.parse(localStorage.getItem("todos") || "[]");
      window.todos = Array.isArray(t) ? t : [];
    } catch {
      window.todos = [];
    }

    try {
      const raw = JSON.parse(localStorage.getItem("todoHistory") || "{}");
      window.todoHistory = raw && typeof raw === "object" ? raw : {};
    } catch {
      window.todoHistory = {};
    }

    try {
      window.lastTodoDate = localStorage.getItem("lastTodoDate") || null;
    } catch {
      window.lastTodoDate = null;
    }

    // migrate old history format: { "YYYY-MM-DD": 75 } -> { percent: 75, ... }
    const h = window.todoHistory || {};
    Object.keys(h).forEach((k) => {
      if (typeof h[k] === "number") {
        h[k] = { percent: h[k], total: 0, completed: 0, tasks: [] };
      }
    });
    window.todoHistory = h;
    try {
      localStorage.setItem("todoHistory", JSON.stringify(h));
    } catch {}
  }

  window.checkDailyTaskReset = function checkDailyTaskReset() {
    const today = getTodayKey();

    // ensure loaded
    if (!Array.isArray(window.todos)) window.todos = [];
    if (!window.todoHistory || typeof window.todoHistory !== "object") window.todoHistory = {};

    if (window.lastTodoDate && window.lastTodoDate !== today) {
      const todos = window.todos;

      if (todos.length > 0) {
        const done = todos.filter((t) => t.done).length;
        const percent = Math.round((done / todos.length) * 100);

        window.todoHistory[window.lastTodoDate] = {
          percent,
          total: todos.length,
          completed: done,
          tasks: todos.map((t) => ({ text: t.text, done: !!t.done }))
        };

        try {
          localStorage.setItem("todoHistory", JSON.stringify(window.todoHistory));
        } catch {}
      }

      window.todos = [];
      try {
        localStorage.setItem("todos", JSON.stringify(window.todos));
      } catch {}
    }

    window.lastTodoDate = today;
    try {
      localStorage.setItem("lastTodoDate", today);
    } catch {}
  };

  window.saveTodos = function saveTodos() {
    try {
      localStorage.setItem("todos", JSON.stringify(window.todos || []));
    } catch {}
  };

  window.addTodo = function addTodo() {
    const input = document.getElementById("todoInput");
    if (!input || !input.value.trim()) return;

    window.todos = window.todos || [];
    window.todos.push({ text: input.value.trim(), done: false });

    input.value = "";
    saveTodos();
    safeCall("renderTodos");

    safeCall("renderLifeScore");
    safeCall("renderDNAProfile");
    safeCall("renderWeeklyGraph");
    safeCall("renderDashboardTrendChart");
  };

  window.toggleTodo = function toggleTodo(index) {
    window.todos = window.todos || [];
    if (!window.todos[index]) return;

    window.todos[index].done = !window.todos[index].done;
    saveTodos();
    safeCall("renderTodos");

    safeCall("renderLifeScore");
    safeCall("renderDNAProfile");
    safeCall("renderWeeklyGraph");
    safeCall("renderDashboardTrendChart");
  };

  window.deleteTodo = function deleteTodo(index) {
    window.todos = window.todos || [];
    window.todos.splice(index, 1);

    saveTodos();
    safeCall("renderTodos");

    safeCall("renderLifeScore");
    safeCall("renderDNAProfile");
    safeCall("renderWeeklyGraph");
    safeCall("renderDashboardTrendChart");
  };

  window.renderTodos = function renderTodos() {
    const list = document.getElementById("todoList");
    if (!list) return;

    const todos = window.todos || [];
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
        <span style="cursor:pointer; flex:1; ${
          todo.done ? "text-decoration:line-through; color:#6B7280;" : "color:#E5E7EB;"
        }" onclick="toggleTodo(${i})">${escapeHtml(todo.text)}</span>
        <button onclick="deleteTodo(${i})" style="background:none; border:none; color:#EF4444; cursor:pointer; font-size:1.1rem;">✕</button>
      `;
      list.appendChild(row);
    });
  };

  // ===============================
  // SCHEDULE (optional feature)
  // ===============================
  window.schedule = window.schedule || [];
  window.lastScheduleDate = window.lastScheduleDate || null;

  function loadScheduleFromStorage() {
    try {
      const s = JSON.parse(localStorage.getItem("schedule") || "[]");
      window.schedule = Array.isArray(s) ? s : [];
    } catch {
      window.schedule = [];
    }
    try {
      window.lastScheduleDate = localStorage.getItem("lastScheduleDate") || null;
    } catch {
      window.lastScheduleDate = null;
    }
  }

  window.checkDailyScheduleReset = function checkDailyScheduleReset() {
    const today = getTodayKey();
    if (window.lastScheduleDate && window.lastScheduleDate !== today) {
      window.schedule = [];
      try {
        localStorage.setItem("schedule", JSON.stringify([]));
      } catch {}
    }
    window.lastScheduleDate = today;
    try {
      localStorage.setItem("lastScheduleDate", today);
    } catch {}
  };

  window.saveSchedule = function saveSchedule() {
    try {
      localStorage.setItem("schedule", JSON.stringify(window.schedule || []));
    } catch {}
  };

  window.addScheduleItem = function addScheduleItem() {
    const timeInput = document.getElementById("scheduleTime");
    const taskInput = document.getElementById("scheduleTask");
    if (!timeInput || !taskInput || !timeInput.value || !taskInput.value.trim()) return;

    window.schedule = window.schedule || [];
    window.schedule.push({ time: timeInput.value, task: taskInput.value.trim(), done: false });
    window.schedule.sort((a, b) => a.time.localeCompare(b.time));

    timeInput.value = "";
    taskInput.value = "";

    saveSchedule();
    renderSchedule();
  };

  window.toggleScheduleItem = function toggleScheduleItem(index) {
    window.schedule = window.schedule || [];
    if (!window.schedule[index]) return;

    window.schedule[index].done = !window.schedule[index].done;
    saveSchedule();
    renderSchedule();
  };

  window.deleteScheduleItem = function deleteScheduleItem(index) {
    window.schedule = window.schedule || [];
    window.schedule.splice(index, 1);
    saveSchedule();
    renderSchedule();
  };

  window.renderSchedule = function renderSchedule() {
    const container = document.getElementById("scheduleContainer");
    if (!container) return;

    const schedule = window.schedule || [];

    container.innerHTML = `
      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <input id="scheduleTime" type="time" class="form-input" style="width:120px;" />
        <input id="scheduleTask" class="form-input" placeholder="What are you doing?" style="flex:1;" />
        <button class="form-submit" onclick="addScheduleItem()">Add</button>
      </div>
      <div id="scheduleList"></div>
    `;

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
        <div style="font-weight:800; color:#6366F1; min-width:60px;">${escapeHtml(item.time)}</div>
        <span style="cursor:pointer; flex:1; ${item.done ? "text-decoration:line-through; color:#6B7280;" : ""}"
              onclick="toggleScheduleItem(${i})">${escapeHtml(item.task)}</span>
        <button onclick="deleteScheduleItem(${i})" style="background:none; border:none; color:#EF4444; cursor:pointer;">✕</button>
      `;
      list.appendChild(row);
    });
  };

  // expose loaders for app.js boot
  window.__loadCoreStorage = function __loadCoreStorage() {
    loadTodosFromStorage();
    loadScheduleFromStorage();
  };
})();
