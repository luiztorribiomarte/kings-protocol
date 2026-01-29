/* features/habits.js
   wrapped to avoid global function collisions + consistent window state
   exports only what the rest of the app needs
*/

(function () {
  "use strict";

  const App = window.App;

  // state
  window.habits = window.habits || [];
  window.habitCompletions = window.habitCompletions || {};

  function saveHabits() {
    localStorage.setItem("habits", JSON.stringify(window.habits));
  }

  function saveHabitCompletions() {
    localStorage.setItem("habitCompletions", JSON.stringify(window.habitCompletions));
  }

  function getDateStringLocal(date = new Date()) {
    return date.toISOString().split("T")[0];
  }

  function getWeekDatesLocal(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - day);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const x = new Date(start);
      x.setDate(start.getDate() + i);
      days.push(x);
    }
    return days;
  }

  function isComplete(habitId, dateStr) {
    const hc = window.habitCompletions;
    return !!(hc[dateStr] && hc[dateStr][habitId]);
  }

  function getHabitStreak(habitId) {
    let streak = 0;
    let date = new Date();

    while (true) {
      const dateStr = getDateStringLocal(date);
      if (isComplete(habitId, dateStr)) {
        streak++;
        date.setDate(date.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  function getStreakEmoji(streak) {
    if (streak >= 30) return "🏆";
    if (streak >= 14) return "🔥🔥🔥";
    if (streak >= 7) return "🔥🔥";
    if (streak >= 1) return "🔥";
    return "";
  }

  function getDayCompletion(dateStr = getDateStringLocal()) {
    const habits = window.habits || [];
    if (!habits.length) return { percent: 0, done: 0, total: 0 };

    let done = 0;
    habits.forEach((h) => {
      if (isComplete(h.id, dateStr)) done++;
    });

    const total = habits.length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    return { percent, done, total };
  }

  function getDayCompletionPercent(dateStr) {
    return getDayCompletion(dateStr).percent;
  }

  function calculateCurrentStreak() {
    let streak = 0;
    let cursor = new Date();

    while (true) {
      const dateStr = getDateStringLocal(cursor);
      const pct = getDayCompletionPercent(dateStr);
      if (pct >= 80) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }

    return streak;
  }

  function toggleHabit(habitId, dateStr) {
    if (!window.habitCompletions[dateStr]) window.habitCompletions[dateStr] = {};
    window.habitCompletions[dateStr][habitId] = !window.habitCompletions[dateStr][habitId];

    saveHabitCompletions();
    renderHabits();

    if (typeof window.renderLifeScore === "function") window.renderLifeScore();
    if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
    if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();
    if (typeof window.renderDashboardTrendChart === "function") window.renderDashboardTrendChart();
  }

  // drag & drop
  let draggedHabitIndex = null;

  function handleDragStart(e, index) {
    draggedHabitIndex = index;
    e.target.style.opacity = "0.4";
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd(e) {
    e.target.style.opacity = "1";
    draggedHabitIndex = null;
  }

  function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    return false;
  }

  function handleDragEnter(e) {
    e.target.closest("tr")?.classList.add("drag-over");
  }

  function handleDragLeave(e) {
    e.target.closest("tr")?.classList.remove("drag-over");
  }

  function handleDrop(e, dropIndex) {
    if (e.stopPropagation) e.stopPropagation();
    e.target.closest("tr")?.classList.remove("drag-over");

    if (draggedHabitIndex !== null && draggedHabitIndex !== dropIndex) {
      const habits = window.habits || [];
      const draggedItem = habits[draggedHabitIndex];
      habits.splice(draggedHabitIndex, 1);
      habits.splice(dropIndex, 0, draggedItem);
      window.habits = habits;
      saveHabits();
      renderHabits();
    }
    return false;
  }

  function updateStats() {
    const daysAt80El = document.getElementById("daysAt80");
    const weeklyCompletionEl = document.getElementById("weeklyCompletion");
    const currentStreakEl = document.getElementById("currentStreak");

    const weekDates = getWeekDatesLocal(new Date());
    const dayPercents = weekDates.map((d) => getDayCompletionPercent(getDateStringLocal(d)));

    const daysAt80 = dayPercents.filter((p) => p >= 80).length;
    const weeklyAvg = dayPercents.reduce((a, b) => a + b, 0) / (dayPercents.length || 1);
    const weeklyPercent = Math.round(weeklyAvg);
    const streak = calculateCurrentStreak();

    if (daysAt80El) daysAt80El.textContent = `${daysAt80}/7`;
    if (weeklyCompletionEl) weeklyCompletionEl.textContent = `${weeklyPercent}%`;
    if (currentStreakEl) currentStreakEl.textContent = String(streak);
  }

  function renderHabits() {
    const grid = document.getElementById("habitGrid");
    if (!grid) return;

    const weekDates = getWeekDatesLocal(new Date());
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const habits = window.habits || [];

    let html = `
      <style>
        .drag-over { border-top: 2px solid #6366F1 !important; }
        .habit-row { cursor: move; }
        .habit-row:hover { background: rgba(255,255,255,0.03); }
      </style>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="font-weight:800;">Daily Habits - This Week</div>
        <button onclick="openHabitManager()" style="padding:6px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.05); color:white; cursor:pointer;">
          ⚙ Manage Habits
        </button>
      </div>

      <table class="habit-table" style="width:100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding:14px; border-bottom:1px solid rgba(255,255,255,0.08); width:30px;">
              <span style="font-size:0.8rem; color:#9CA3AF;">☰</span>
            </th>
            <th style="text-align:left; padding:14px; border-bottom:1px solid rgba(255,255,255,0.08);">Habit</th>
            ${weekDates
              .map(
                (d, i) => `
              <th style="text-align:center; padding:14px; border-bottom:1px solid rgba(255,255,255,0.08);">
                ${dayNames[i]}<br>${d.getDate()}
              </th>
            `
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${habits
            .map((h, habitIndex) => {
              const streak = getHabitStreak(h.id);
              const streakEmoji = getStreakEmoji(streak);

              return `
                <tr class="habit-row"
                    draggable="true"
                    ondragstart="handleDragStart(event, ${habitIndex})"
                    ondragend="handleDragEnd(event)"
                    ondragover="handleDragOver(event)"
                    ondragenter="handleDragEnter(event)"
                    ondragleave="handleDragLeave(event)"
                    ondrop="handleDrop(event, ${habitIndex})">
                  <td style="padding:14px; text-align:center; color:#9CA3AF; cursor:move;">☰</td>
                  <td onclick="openHabitChart('${h.id}')" style="cursor:pointer; padding:14px; font-weight:600;">
                    ${h.icon} ${window.escapeHtml(h.name)}
                    ${streakEmoji ? `<span style="margin-left:8px; font-size:0.9rem;" title="${streak} day streak">${streakEmoji}</span>` : ""}
                  </td>
                  ${weekDates
                    .map((d) => {
                      const dateStr = getDateStringLocal(d);
                      const done = isComplete(h.id, dateStr);
                      return `
                        <td onclick="toggleHabit('${h.id}','${dateStr}')" style="text-align:center; cursor:pointer; padding:14px;">
                          ${done ? "✅" : "○"}
                        </td>
                      `;
                    })
                    .join("")}
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;

    grid.innerHTML = html;
    updateStats();
  }

  function openHabitManager() {
    const habits = window.habits || [];
    window.openModal(`
      <h2>Manage Habits</h2>

      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <input id="newHabitName" placeholder="Habit name" class="form-input" />
        <input id="newHabitIcon" placeholder="Emoji (optional)" class="form-input" style="width:80px;" />
        <button class="form-submit" onclick="addHabit()">Add</button>
      </div>

      <div style="max-height:300px; overflow:auto;">
        ${habits
          .map(
            (h) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid rgba(255,255,255,0.1);">
            <div>${h.icon} ${window.escapeHtml(h.name)}</div>
            <button onclick="deleteHabit('${h.id}')" style="color:#EF4444; background:none; border:none; cursor:pointer;">Delete</button>
          </div>
        `
          )
          .join("")}
      </div>
    `);
  }

  function addHabit() {
    const nameEl = document.getElementById("newHabitName");
    const iconEl = document.getElementById("newHabitIcon");
    const name = (nameEl?.value || "").trim();
    const icon = (iconEl?.value || "").trim() || "✨";

    if (!name) return alert("Habit name required");

    const habits = window.habits || [];
    habits.push({ id: "h_" + Date.now(), name, icon });
    window.habits = habits;

    saveHabits();
    window.closeModal();
    renderHabits();

    if (typeof window.renderLifeScore === "function") window.renderLifeScore();
    if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
    if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();
    if (typeof window.renderDashboardTrendChart === "function") window.renderDashboardTrendChart();
  }

  function deleteHabit(id) {
    if (!confirm("Delete this habit?")) return;

    window.habits = (window.habits || []).filter((h) => h.id !== id);
    saveHabits();
    window.closeModal();
    renderHabits();

    if (typeof window.renderLifeScore === "function") window.renderLifeScore();
    if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
    if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();
    if (typeof window.renderDashboardTrendChart === "function") window.renderDashboardTrendChart();
  }

  // chart
  let habitChartInstance = null;

  function getLastDaysLocal(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(getDateStringLocal(d));
    }
    return days;
  }

  function openHabitChart(habitId) {
    const habit = (window.habits || []).find((h) => h.id === habitId);
    if (!habit) return;

    window.openModal(`
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-weight:800;">${habit.icon} ${window.escapeHtml(habit.name)}</div>
        <select id="habitChartRange" style="padding:6px 10px; border-radius:10px; background:rgba(255,255,255,0.08); color:white;">
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="all">All time</option>
        </select>
      </div>
      <canvas id="habitChartCanvas" height="200" style="margin-top:14px;"></canvas>
    `);

    const rangeEl = document.getElementById("habitChartRange");
    if (rangeEl) rangeEl.onchange = () => renderHabitChart(habitId);

    renderHabitChart(habitId);
  }

  function renderHabitChart(habitId) {
    const canvas = document.getElementById("habitChartCanvas");
    if (!canvas || typeof Chart === "undefined") return;

    const range = document.getElementById("habitChartRange")?.value || "7";
    let days = [];

    if (range === "all") {
      days = Object.keys(window.habitCompletions || {}).sort();
    } else {
      days = getLastDaysLocal(parseInt(range, 10));
    }

    const labels = days.map((d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    const data = days.map((d) => (isComplete(habitId, d) ? 100 : 0));

    if (habitChartInstance) habitChartInstance.destroy();

    habitChartInstance = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Completion %",
            data,
            tension: 0.3,
            borderWidth: 3
          }
        ]
      },
      options: { responsive: true, scales: { y: { min: 0, max: 100 } } }
    });
  }

  function initHabitsData() {
    // load habits
    const savedHabits = localStorage.getItem("habits");
    if (savedHabits) {
      try {
        const parsed = JSON.parse(savedHabits);
        window.habits = Array.isArray(parsed) ? parsed : [];
      } catch {
        window.habits = [];
      }
    }

    // load completions
    const savedCompletions = localStorage.getItem("habitCompletions");
    if (savedCompletions) {
      try {
        const parsed = JSON.parse(savedCompletions);
        window.habitCompletions = parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        window.habitCompletions = {};
      }
    }

    // defaults
    if (!Array.isArray(window.habits) || window.habits.length === 0) {
      window.habits = [
        { id: "wake", name: "Wake Up At 7 AM", icon: "⏰" },
        { id: "sun", name: "Morning Sunlight", icon: "☀️" },
        { id: "skin", name: "Skincare", icon: "🧴" },
        { id: "med", name: "Meditation", icon: "🧘" },
        { id: "journal", name: "Journal/Reflect", icon: "📝" },
        { id: "workout", name: "Work Out", icon: "💪" },
        { id: "read", name: "Read 10 Pages", icon: "📚" },
        { id: "yt", name: "YouTube Work (2hrs)", icon: "🎬" },
        { id: "noporn", name: "No Porn", icon: "🚫" },
        { id: "noweed", name: "No Weed", icon: "🌿" },
        { id: "mobility", name: "Nightly Mobility", icon: "🧘‍♂️" }
      ];
      saveHabits();
    }
  }

  // exports needed by other modules / HTML onclicks
  window.initHabitsData = initHabitsData;
  window.renderHabits = renderHabits;
  window.toggleHabit = toggleHabit;
  window.openHabitManager = openHabitManager;
  window.addHabit = addHabit;
  window.deleteHabit = deleteHabit;
  window.openHabitChart = openHabitChart;

  window.getDayCompletion = getDayCompletion;
  window.calculateCurrentStreak = calculateCurrentStreak;

  // exports for drag handlers used in HTML string
  window.handleDragStart = handleDragStart;
  window.handleDragEnd = handleDragEnd;
  window.handleDragOver = handleDragOver;
  window.handleDragEnter = handleDragEnter;
  window.handleDragLeave = handleDragLeave;
  window.handleDrop = handleDrop;

  // register with App
  if (App) {
    App.features.habits = { init: initHabitsData, render: renderHabits };
    App.on("dashboard", renderHabits);
  }

  console.log("Habits module loaded");
})();
