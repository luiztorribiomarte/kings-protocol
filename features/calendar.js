// ============================================
// CALENDAR VIEW 2.0
// - Restores "toggle open calendar" behavior
// - Adds Selected Day panel ABOVE calendar (tasks + intentions)
// - Keeps showDayDetails modal intact (no removals)
// ============================================

(function() {
  "use strict";

  // ---------- small helpers ----------
  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  function getDateString(date) {
    return date.toISOString().split("T")[0];
  }

  function prettyFullDate(dateStr) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  }

  function safeGetDayCompletion(dateStr) {
    try {
      if (typeof window.getDayCompletion === "function") return window.getDayCompletion(dateStr);
    } catch (e) {
      console.error("Error getting day completion:", e);
    }
    return { percent: 0, done: 0, total: 0 };
  }

  function safeGetMoodForDay(dateStr) {
    try {
      const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
      return moodData?.[dateStr] || null;
    } catch {
      return null;
    }
  }

  function safeGetTasksForDay(dateStr) {
    const today = getDateString(new Date());

    // Today uses live todos
    if (dateStr === today) {
      try {
        const todos = JSON.parse(localStorage.getItem("todos") || "[]");
        return Array.isArray(todos) ? todos : [];
      } catch {
        return [];
      }
    }

    // Past days use todoHistory.tasks if present
    try {
      const hist = JSON.parse(localStorage.getItem("todoHistory") || "{}");
      const entry = hist?.[dateStr];
      if (entry && typeof entry === "object" && Array.isArray(entry.tasks)) {
        return entry.tasks.map(t => ({ text: t.text, done: !!t.done }));
      }
    } catch {}

    return [];
  }

  function safeGetTaskPercentForDay(dateStr) {
    const today = getDateString(new Date());

    if (dateStr === today) {
      try {
        const todos = JSON.parse(localStorage.getItem("todos") || "[]");
        if (!Array.isArray(todos) || !todos.length) return 0;
        const done = todos.filter(t => t.done).length;
        return Math.round((done / todos.length) * 100);
      } catch {
        return 0;
      }
    }

    try {
      const hist = JSON.parse(localStorage.getItem("todoHistory") || "{}");
      const entry = hist?.[dateStr];
      if (entry && typeof entry === "object" && typeof entry.percent === "number") return entry.percent;
      if (typeof entry === "number") return entry;
    } catch {}

    return 0;
  }

  // intentions storage (per day)
  function getIntentionsData() {
    try {
      const raw = JSON.parse(localStorage.getItem("intentionsData") || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }

  function setIntentionForDay(dateStr, text) {
    const all = getIntentionsData();
    all[dateStr] = String(text || "");
    localStorage.setItem("intentionsData", JSON.stringify(all));

    // let other systems react (Life Engine listens for plannerUpdated)
    try { window.dispatchEvent(new Event("plannerUpdated")); } catch {}
  }

  function getIntentionForDay(dateStr) {
    const all = getIntentionsData();
    return typeof all[dateStr] === "string" ? all[dateStr] : "";
  }

  // calendar state
  function getCalendarExpanded() {
    return localStorage.getItem("calendarExpanded") === "1";
  }

  function setCalendarExpanded(val) {
    localStorage.setItem("calendarExpanded", val ? "1" : "0");
  }

  function getSelectedDate() {
    const today = getDateString(new Date());
    return localStorage.getItem("calendarSelectedDate") || today;
  }

  function setSelectedDate(dateStr) {
    localStorage.setItem("calendarSelectedDate", dateStr);
  }

  // ---------- monthly dates ----------
  function getMonthDates(year, month) {
    const lastDay = new Date(year, month + 1, 0);
    const dates = [];
    for (let d = 1; d <= lastDay.getDate(); d++) dates.push(new Date(year, month, d));
    return dates;
  }

  function getDayColor(dateStr) {
    const pct = safeGetDayCompletion(dateStr).percent;

    if (pct >= 80) return { bg: "rgba(34,197,94,0.2)", border: "rgba(34,197,94,0.5)", text: "Perfect" };
    if (pct >= 60) return { bg: "rgba(168,85,247,0.2)", border: "rgba(168,85,247,0.5)", text: "Solid" };
    if (pct >= 40) return { bg: "rgba(245,158,11,0.2)", border: "rgba(245,158,11,0.5)", text: "OK" };
    if (pct > 0) return { bg: "rgba(239,68,68,0.2)", border: "rgba(239,68,68,0.5)", text: "Weak" };
    return { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)", text: "No data" };
  }

  // ---------- Selected Day panel ----------
  function renderSelectedDayPanel(dateStr) {
    const habitData = safeGetDayCompletion(dateStr);
    const mood = safeGetMoodForDay(dateStr);
    const energyPct = mood?.energy ? Math.round((mood.energy / 10) * 100) : 0;
    const taskPct = safeGetTaskPercentForDay(dateStr);

    const tasks = safeGetTasksForDay(dateStr);
    const intention = getIntentionForDay(dateStr);

    const tasksHtml = tasks.length
      ? tasks.map(t => `
          <div style="display:flex; gap:10px; align-items:center; padding:8px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:1.1rem;">${t.done ? "✅" : "○"}</div>
            <div style="flex:1; ${t.done ? "text-decoration:line-through; color:#6B7280;" : "color:#E5E7EB;"}">${escapeHtml(t.text)}</div>
          </div>
        `).join("")
      : `<div style="color:#9CA3AF; padding:10px 0;">No tasks logged for this day.</div>`;

    return `
      <div style="
        padding:14px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.14);
        background:linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02));
        margin-bottom:12px;
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div style="font-weight:900; color:#E5E7EB;">Selected Day</div>
          <div style="color:#9CA3AF;">${escapeHtml(prettyFullDate(dateStr))}</div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-top:12px;">
          <div style="padding:12px; border-radius:14px; background:rgba(99,102,241,0.10); border:1px solid rgba(99,102,241,0.25); text-align:center;">
            <div style="font-size:1.6rem; font-weight:900;">${habitData.percent}%</div>
            <div style="color:#9CA3AF; font-size:0.85rem;">Habits</div>
          </div>
          <div style="padding:12px; border-radius:14px; background:rgba(236,72,153,0.10); border:1px solid rgba(236,72,153,0.25); text-align:center;">
            <div style="font-size:1.6rem; font-weight:900;">${energyPct}%</div>
            <div style="color:#9CA3AF; font-size:0.85rem;">Energy</div>
          </div>
          <div style="padding:12px; border-radius:14px; background:rgba(245,158,11,0.10); border:1px solid rgba(245,158,11,0.25); text-align:center;">
            <div style="font-size:1.6rem; font-weight:900;">${taskPct}%</div>
            <div style="color:#9CA3AF; font-size:0.85rem;">Tasks</div>
          </div>
        </div>

        <div style="margin-top:14px;">
          <div style="font-weight:800; margin-bottom:8px;">Intentions for this day</div>
          <textarea id="intentionsInput"
            placeholder="Write what matters most today..."
            style="width:100%; min-height:90px; resize:vertical; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.14); background:rgba(255,255,255,0.04); color:white; outline:none;"
          >${escapeHtml(intention)}</textarea>
          <div style="display:flex; gap:10px; margin-top:10px;">
            <button class="form-submit" style="width:100%;" onclick="saveIntentionsForSelectedDay()">
              Save intentions
            </button>
          </div>
          <div style="color:#6B7280; font-size:0.82rem; margin-top:8px;">
            Saves per-date automatically. Click any day to load it.
          </div>
        </div>

        <div style="margin-top:14px;">
          <div style="font-weight:800; margin-bottom:10px;">Tasks for this day</div>
          <div style="display:grid; gap:8px;">
            ${tasksHtml}
          </div>
        </div>
      </div>
    `;
  }

  // exposed helper for textarea save button
  window.saveIntentionsForSelectedDay = function() {
    const dateStr = getSelectedDate();
    const el = document.getElementById("intentionsInput");
    const val = el ? el.value : "";
    setIntentionForDay(dateStr, val);

    // refresh panel (keeps cursor safe)
    renderEmbeddedCalendar();
  };

  // ---------- Embedded Calendar (Dashboard) ----------
  function renderEmbeddedCalendar() {
    const container = document.getElementById("embeddedCalendar");
    if (!container) return;

    const expanded = getCalendarExpanded();
    const selected = getSelectedDate();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const dates = getMonthDates(year, month);
    const firstDayOfWeek = dates[0].getDay();
    const monthName = dates[0].toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const todayStr = getDateString(new Date());

    const weeklyReviewButton = `
      <button
        class="form-submit"
        style="width:100%; margin-bottom:10px;"
        onclick="(typeof openWeeklyReview==='function' ? openWeeklyReview() : alert('Weekly Review not loaded'))"
      >
        Open Weekly Review
      </button>
    `;

    const toggleButton = `
      <button
        class="form-submit"
        style="width:100%;"
        onclick="toggleCalendarOpen()"
      >
        ${expanded ? "Close Calendar" : "Open Calendar"}
      </button>
    `;

    const calendarBody = expanded ? `
      <div style="margin-top:12px;">
        ${renderSelectedDayPanel(selected)}

        <div style="padding:14px; border-radius:16px; border:1px solid rgba(255,255,255,0.14); background:rgba(255,255,255,0.03);">
          <div style="margin-bottom:10px; text-align:center; font-weight:900; color:#E5E7EB;">
            ${escapeHtml(monthName)}
          </div>

          <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px; margin-bottom:8px;">
            ${dayNames.map(day => `
              <div style="text-align:center; font-weight:700; color:#9CA3AF; font-size:0.8rem; padding:4px;">
                ${day}
              </div>
            `).join("")}
          </div>

          <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px;">
            ${Array(firstDayOfWeek).fill(null).map(() => `
              <div style="aspect-ratio:1; background:transparent;"></div>
            `).join("")}

            ${dates.map(date => {
              const dateStr = getDateString(date);
              const color = getDayColor(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selected;

              return `
                <div
                  onclick="selectCalendarDay('${dateStr}')"
                  style="
                    aspect-ratio:1;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    border-radius:10px;
                    border:2px solid ${isSelected ? "#FFFFFF" : (isToday ? "#6366F1" : color.border)};
                    background:${color.bg};
                    cursor:pointer;
                    transition:transform 0.2s ease;
                    font-weight:${isToday ? "900" : "700"};
                    font-size:0.9rem;
                    box-shadow:${isSelected ? "0 0 0 2px rgba(255,255,255,0.25)" : "none"};
                  "
                  onmouseover="this.style.transform='scale(1.05)'"
                  onmouseout="this.style.transform='scale(1)'"
                  title="${escapeHtml(color.text)}"
                >
                  ${date.getDate()}
                </div>
              `;
            }).join("")}
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:14px; padding:10px; border-radius:10px; background:rgba(255,255,255,0.02); font-size:0.8rem;">
            <div style="display:flex; align-items:center; gap:6px;">
              <div style="width:12px; height:12px; border-radius:3px; background:rgba(34,197,94,0.5);"></div>
              <span>80%+</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <div style="width:12px; height:12px; border-radius:3px; background:rgba(168,85,247,0.5);"></div>
              <span>60-79%</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <div style="width:12px; height:12px; border-radius:3px; background:rgba(245,158,11,0.5);"></div>
              <span>40-59%</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <div style="width:12px; height:12px; border-radius:3px; background:rgba(239,68,68,0.5);"></div>
              <span><40%</span>
            </div>
          </div>

          <div style="margin-top:10px; color:#6B7280; font-size:0.82rem;">
            Tip: click a day to load that day’s tasks + intentions above.
          </div>
        </div>
      </div>
    ` : "";

    container.innerHTML = `
      <div style="width:100%;">
        ${weeklyReviewButton}
        ${toggleButton}
        ${calendarBody}
      </div>
    `;
  }

  // toggle open/close (dashboard calendar)
  window.toggleCalendarOpen = function() {
    setCalendarExpanded(!getCalendarExpanded());
    renderEmbeddedCalendar();
  };

  // select a day to drive the Selected Day panel
  window.selectCalendarDay = function(dateStr) {
    setSelectedDate(dateStr);
    renderEmbeddedCalendar();

    // optional: still allow the detailed modal when you want it
    // (keeps old behavior available without forcing it)
  };

  // ---------- Day details modal (kept intact) ----------
  window.showDayDetails = function(dateStr) {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    const habitData = safeGetDayCompletion(dateStr);

    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const dayMood = moodData[dateStr];

    const todoHistory = JSON.parse(localStorage.getItem("todoHistory") || "{}");
    const dayTasks = todoHistory[dateStr];

    const habits = JSON.parse(localStorage.getItem("habits") || "[]");
    const habitCompletions = JSON.parse(localStorage.getItem("habitCompletions") || "{}");

    const html = `
      <h2>${escapeHtml(dayName)}</h2>

      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:14px; margin-bottom:20px;">
        <div style="padding:14px; border-radius:12px; background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.3); text-align:center;">
          <div style="font-size:2rem; font-weight:900;">${habitData.percent}%</div>
          <div style="color:#9CA3AF; font-size:0.9rem;">Habits</div>
          <div style="color:#E5E7EB; font-size:0.85rem; margin-top:4px;">${habitData.done}/${habitData.total}</div>
        </div>

        <div style="padding:14px; border-radius:12px; background:rgba(236,72,153,0.1); border:1px solid rgba(236,72,153,0.3); text-align:center;">
          <div style="font-size:2rem; font-weight:900;">${dayMood?.energy || "—"}</div>
          <div style="color:#9CA3AF; font-size:0.9rem;">Energy</div>
          <div style="font-size:1.5rem; margin-top:4px;">${dayMood?.mood || "—"}</div>
        </div>

        <div style="padding:14px; border-radius:12px; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); text-align:center;">
          <div style="font-size:2rem; font-weight:900;">${dayTasks?.percent || 0}%</div>
          <div style="color:#9CA3AF; font-size:0.9rem;">Tasks</div>
          <div style="color:#E5E7EB; font-size:0.85rem; margin-top:4px;">${dayTasks?.completed || 0}/${dayTasks?.total || 0}</div>
        </div>
      </div>

      ${habits.length > 0 ? `
        <div style="margin-bottom:20px;">
          <div style="font-weight:800; margin-bottom:10px;">Habits Completed</div>
          <div style="display:grid; gap:6px;">
            ${habits.map(habit => {
              const done = habitCompletions[dateStr]?.[habit.id];
              return `
                <div style="display:flex; align-items:center; gap:8px; padding:8px; border-radius:8px; background:rgba(255,255,255,0.03);">
                  <div style="font-size:1.2rem;">${done ? "✅" : "○"}</div>
                  <div>${escapeHtml(habit.icon)} ${escapeHtml(habit.name)}</div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      ` : ""}

      ${dayTasks?.tasks ? `
        <div>
          <div style="font-weight:800; margin-bottom:10px;">Tasks</div>
          <div style="display:grid; gap:6px;">
            ${dayTasks.tasks.map(task => `
              <div style="display:flex; align-items:center; gap:8px; padding:8px; border-radius:8px; background:rgba(255,255,255,0.03);">
                <div style="font-size:1.2rem;">${task.done ? "✅" : "○"}</div>
                <div style="${task.done ? "text-decoration:line-through; color:#6B7280;" : ""}">${escapeHtml(task.text)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
    `;

    if (typeof window.openModal === "function") window.openModal(html);
  };

  // Export for use
  window.renderEmbeddedCalendar = renderEmbeddedCalendar;

  // Auto-render on dashboard
  function boot() {
    // default selected date = today if missing
    const t = getDateString(new Date());
    if (!localStorage.getItem("calendarSelectedDate")) setSelectedDate(t);

    renderEmbeddedCalendar();

    // keep it reactive (no refresh needed)
    ["todosUpdated","habitsUpdated","moodUpdated","plannerUpdated","storage"].forEach(evt => {
      window.addEventListener(evt, () => {
        // only re-render if calendar widget exists
        if (document.getElementById("embeddedCalendar")) renderEmbeddedCalendar();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  console.log("Calendar View 2.0 loaded");
})();
