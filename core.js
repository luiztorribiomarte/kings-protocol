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
        try {
          fn();
        } catch (e) {
          console.error("App trigger error:", e);
        }
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

  function openModal(html) {
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modalBody");
    if (!modal || !modalBody) return;

    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.zIndex = "99999";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";

    document.body.style.overflow = "hidden";
    modalBody.innerHTML = html;
  }

  function closeModal() {
    const modal = document.getElementById("modal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
  }

  window.openModal = openModal;
  window.closeModal = closeModal;

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

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toLocalISODate(date = new Date()) {
    return (
      date.getFullYear() +
      "-" +
      pad2(date.getMonth() + 1) +
      "-" +
      pad2(date.getDate())
    );
  }

  function parseLocalISODate(dayKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return new Date();
    const [y, m, d] = dayKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function getTodayKey() {
    return toLocalISODate(new Date());
  }

  function findTabForPage(page) {
    return [...document.querySelectorAll(".nav-tab")].find((t) =>
      (t.getAttribute("onclick") || "").includes(page)
    );
  }

  function showPage(page) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".nav-tab").forEach((b) => b.classList.remove("active"));

    const el = document.getElementById(page + "Page");
    if (el) el.classList.add("active");

    const tab = findTabForPage(page);
    if (tab) tab.classList.add("active");

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

  /* ================= TASK HISTORY ================= */

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
        const done = todos.filter((t) => t.done).length;

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

  window.todos = todos;
  window.todoHistory = todoHistory;

  /* ================= WEEKLY PLANNER ================= */

  const WEEKLY_PLANNER_KEY = "weeklyPlannerData";
  const WEEKLY_PLANNER_SELECTED_DAY_KEY = "weeklyPlannerSelectedDay";

  let weeklyPlannerData = {};
  let weeklyPlannerSelectedDay = null;

  function safeParse(raw, fallback) {
    try {
      return JSON.parse(raw) || fallback;
    } catch {
      return fallback;
    }
  }

  function getWeekStartKey(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return toLocalISODate(d);
  }

  function ensureWeeklyPlannerDay(dayKey) {
    if (!dayKey) return;

    const ws = getWeekStartKey(parseLocalISODate(dayKey));

    if (!weeklyPlannerData[ws])
      weeklyPlannerData[ws] = { days: {} };

    if (!weeklyPlannerData[ws].days[dayKey])
      weeklyPlannerData[ws].days[dayKey] = { intentions: "", items: [] };
  }

  function saveWeeklyPlanner() {
    localStorage.setItem(WEEKLY_PLANNER_KEY, JSON.stringify(weeklyPlannerData));
    localStorage.setItem(
      WEEKLY_PLANNER_SELECTED_DAY_KEY,
      weeklyPlannerSelectedDay
    );
  }

  function loadWeeklyPlanner() {
    weeklyPlannerData = safeParse(
      localStorage.getItem(WEEKLY_PLANNER_KEY),
      {}
    );

    const today = getTodayKey();

    let saved = localStorage.getItem(WEEKLY_PLANNER_SELECTED_DAY_KEY);

    // ✅ FORCE SYNC TO TODAY IF OLD
    if (!saved || saved !== today) {
      saved = today;
      localStorage.setItem(WEEKLY_PLANNER_SELECTED_DAY_KEY, today);
    }

    weeklyPlannerSelectedDay = saved;

    ensureWeeklyPlannerDay(saved);
  }

  function setWeeklyPlannerSelectedDay(dayKey) {
    weeklyPlannerSelectedDay = dayKey || getTodayKey();

    ensureWeeklyPlannerDay(weeklyPlannerSelectedDay);
    saveWeeklyPlanner();
    renderWeeklyPlanner();
  }

  function getSelectedPlannerDayKey() {
    return weeklyPlannerSelectedDay || getTodayKey();
  }

  function getPlannerDayData(dayKey) {
    ensureWeeklyPlannerDay(dayKey);

    const ws = getWeekStartKey(parseLocalISODate(dayKey));

    return (
      weeklyPlannerData?.[ws]?.days?.[dayKey] || {
        intentions: "",
        items: []
      }
    );
  }

  function getPlannerCompletionForDay(dayKey) {
    const items = getPlannerDayData(dayKey).items || [];
    const done = items.filter((i) => i.done).length;

    return {
      done,
      total: items.length,
      percent: items.length
        ? Math.round((done / items.length) * 100)
        : 0
    };
  }

  window.getPlannerCompletionForDay = getPlannerCompletionForDay;

  function renderWeeklyPlanner() {
    const container = document.getElementById("scheduleContainer");
    if (!container) return;

    const today = getTodayKey();

    // ✅ AUTO-CORRECT IF DRIFTED
    if (weeklyPlannerSelectedDay !== today) {
      weeklyPlannerSelectedDay = today;
      saveWeeklyPlanner();
    }

    const dayKey = weeklyPlannerSelectedDay;

    ensureWeeklyPlannerDay(dayKey);

    const data = getPlannerDayData(dayKey);
    const completion = getPlannerCompletionForDay(dayKey);

    container.innerHTML = `
      <div style="padding:16px">
        <div style="font-weight:900">Weekly Planner</div>

        <div style="margin:6px 0;color:#9CA3AF">
          ${dayKey} • ${completion.percent}%
        </div>

        <textarea
          class="form-input"
          style="width:100%;min-height:80px"
          oninput="setPlannerIntentions(this.value)"
        >${escapeHtml(data.intentions)}</textarea>
      </div>
    `;
  }

  window.setWeeklyPlannerSelectedDay = setWeeklyPlannerSelectedDay;
  window.renderWeeklyPlanner = renderWeeklyPlanner;

  function renderSchedule() {
    renderWeeklyPlanner();
  }

  window.renderSchedule = renderSchedule;

  /* ================= AUTO DATE ROLLOVER ================= */

  let lastKnownDate = getTodayKey();

  setInterval(() => {
    const now = getTodayKey();

    if (now !== lastKnownDate) {
      lastKnownDate = now;

      loadWeeklyPlanner();
      renderWeeklyPlanner();
      window.renderLifeScore?.();
      window.renderDashboardTrendChart?.();
    }
  }, 60000);

  /* ================= BOOT ================= */

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
