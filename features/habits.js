(function () {
  "use strict";

  const App = window.App;

  window.habits = window.habits || [];
  window.habitCompletions = window.habitCompletions || {};

  let habitsInitialized = false;

  function fireHabitsUpdated() {
    window.dispatchEvent(new Event("habitsUpdated"));
  }

  function saveHabits() {
    localStorage.setItem("habits", JSON.stringify(window.habits));
    fireHabitsUpdated();
  }

  function saveCompletions() {
    localStorage.setItem("habitCompletions", JSON.stringify(window.habitCompletions));
    fireHabitsUpdated();
  }

  function getDateStringLocal(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }

  function getWeekDates(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();

    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);

    const out = [];
    for (let i = 0; i < 7; i++) {
      const x = new Date(d);
      x.setDate(d.getDate() + i);
      out.push(x);
    }
    return out;
  }

  function utcToLocalKey(k) {
    return getDateStringLocal(new Date(k + "T00:00:00Z"));
  }

  function migrateUTCKeysIfNeeded() {
    const src = window.habitCompletions || {};
    const migrated = {};
    let changed = false;

    Object.keys(src).forEach((k) => {
      const local = utcToLocalKey(k);
      if (!migrated[local]) migrated[local] = {};
      Object.assign(migrated[local], src[k]);
      if (local !== k) changed = true;
    });

    if (changed) {
      window.habitCompletions = migrated;
      localStorage.setItem("habitCompletions", JSON.stringify(window.habitCompletions));
    }
  }

  function isDone(habitId, dateKey) {
    return !!(window.habitCompletions?.[dateKey]?.[habitId]);
  }

  function toggleHabit(habitId, dateKey) {
    if (!window.habitCompletions[dateKey]) window.habitCompletions[dateKey] = {};
    window.habitCompletions[dateKey][habitId] = !window.habitCompletions[dateKey][habitId];

    saveCompletions();
    renderHabits();

    if (typeof window.renderLifeScore === "function") window.renderLifeScore();
    if (typeof window.renderDashboardTrendChart === "function") window.renderDashboardTrendChart();
    if (typeof window.renderDNAProfile === "function") window.renderDNAProfile();
    if (typeof window.renderWeeklyGraph === "function") window.renderWeeklyGraph();
  }

  function getDayCompletion(dateStr = getDateStringLocal()) {
    const habits = window.habits || [];
    if (!habits.length) return { percent: 0, done: 0, total: 0 };

    let done = 0;
    habits.forEach((h) => {
      if (isDone(h.id, dateStr)) done++;
    });

    const total = habits.length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    return { percent, done, total };
  }

  function calculateCurrentStreak() {
    let streak = 0;
    let cursor = new Date();

    while (true) {
      const k = getDateStringLocal(cursor);
      const pct = getDayCompletion(k).percent;
      if (pct >= 80) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }

    return streak;
  }

  function renderHabits() {
    const grid = document.getElementById("habitGrid");
    if (!grid) return;

    const week = getWeekDates(new Date());
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const habits = window.habits || [];

    let html = `
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;align-items:center;">
        <strong>Daily Habits - This Week</strong>
        <button onclick="openHabitManager()" style="padding:6px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);color:white;cursor:pointer;">
          ⚙ Manage
        </button>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="width:34px;"></th>
            <th style="text-align:left;padding:12px;">Habit</th>
            ${week.map((d, i) =>
              `<th style="text-align:center;padding:12px;">${names[i]}<br>${d.getDate()}</th>`
            ).join("")}
          </tr>
        </thead>
        <tbody>
    `;

    habits.forEach((h) => {
      html += `<tr>
        <td style="text-align:center;color:#9CA3AF;">☰</td>
        <td style="padding:12px;font-weight:600;">${h.icon} ${window.escapeHtml(h.name)}</td>
      `;

      week.forEach((d) => {
        const k = getDateStringLocal(d);
        const done = isDone(h.id, k);

        html += `
          <td onclick="toggleHabit('${h.id}','${k}')"
              style="cursor:pointer;text-align:center;padding:12px;">
            ${done ? "✅" : "○"}
          </td>`;
      });

      html += `</tr>`;
    });

    html += `</tbody></table>`;
    grid.innerHTML = html;
  }

  function openHabitManager() {
    const habits = window.habits || [];

    window.openModal(`
      <h2>Manage Habits</h2>

      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <input id="hn" placeholder="Habit name" class="form-input" />
        <input id="hi" placeholder="Emoji" class="form-input" style="width:80px;" />
        <button class="form-submit" onclick="addHabit()">Add</button>
      </div>

      <div style="max-height:300px; overflow:auto;">
        ${habits.map(h => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid rgba(255,255,255,0.1);">
            <div>${h.icon} ${window.escapeHtml(h.name)}</div>
            <button onclick="deleteHabit('${h.id}')" style="color:#EF4444; background:none; border:none; cursor:pointer;">Delete</button>
          </div>
        `).join("")}
      </div>
    `);
  }

  function addHabit() {
    const name = (document.getElementById("hn")?.value || "").trim();
    const icon = (document.getElementById("hi")?.value || "").trim() || "✨";

    if (!name) return alert("Habit name required");

    window.habits.push({
      id: "h_" + Date.now(),
      name,
      icon
    });

    saveHabits();
    window.closeModal?.();
    renderHabits();
  }

  function deleteHabit(id) {
    if (!confirm("Delete this habit?")) return;

    window.habits = window.habits.filter(h => h.id !== id);

    Object.keys(window.habitCompletions || {}).forEach(day => {
      delete window.habitCompletions[day][id];
    });

    saveHabits();
    saveCompletions();

    window.closeModal?.();
    renderHabits();
  }

  function initHabitsData() {
    if (habitsInitialized) return;
    habitsInitialized = true;

    try {
      const raw = localStorage.getItem("habits");

      if (raw === null) {
        window.habits = [
          { id: "wake", name: "Wake Up At 7 AM", icon: "⏰" },
          { id: "sun", name: "Morning Sunlight", icon: "☀️" },
          { id: "skin", name: "Skincare", icon: "🧴" }
        ];

        saveHabits();
      } else {
        const parsed = JSON.parse(raw);
        window.habits = Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      window.habits = [];
    }

    try {
      const saved = JSON.parse(localStorage.getItem("habitCompletions") || "{}");
      window.habitCompletions = saved && typeof saved === "object" ? saved : {};
    } catch {
      window.habitCompletions = {};
    }

    migrateUTCKeysIfNeeded();
  }

  window.initHabitsData = initHabitsData;
  window.renderHabits = renderHabits;
  window.toggleHabit = toggleHabit;
  window.openHabitManager = openHabitManager;
  window.addHabit = addHabit;
  window.deleteHabit = deleteHabit;
  window.getDayCompletion = getDayCompletion;
  window.calculateCurrentStreak = calculateCurrentStreak;

  if (App) {
    App.features.habits = { init: initHabitsData, render: renderHabits };

    App.on("dashboard", function () {
      initHabitsData();
      renderHabits();
      fireHabitsUpdated();
    });
  }
})();
