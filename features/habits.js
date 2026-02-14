/* features/habits.js
   FULL RESTORE + FIX
   - Weekly grid
   - Local dates
   - UTC migration
   - Stable API
   - Trend/Life sync
*/

(function () {
  "use strict";

  const App = window.App;

  window.habits = window.habits || [];
  window.habitCompletions = window.habitCompletions || {};

  /* =========================
     STORAGE
  ========================= */

  function saveHabits() {
    localStorage.setItem("habits", JSON.stringify(window.habits));
  }

  function saveCompletions() {
    localStorage.setItem(
      "habitCompletions",
      JSON.stringify(window.habitCompletions)
    );
  }

  /* =========================
     DATES
  ========================= */

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

  function utcToLocal(key) {
    return getDateStringLocal(
      new Date(key + "T00:00:00Z")
    );
  }

  /* =========================
     MIGRATION
  ========================= */

  function migrateUTC() {
    let fixed = false;
    const migrated = {};

    Object.keys(window.habitCompletions || {}).forEach(
      (k) => {
        const local = utcToLocal(k);

        if (!migrated[local]) migrated[local] = {};

        Object.assign(
          migrated[local],
          window.habitCompletions[k]
        );

        if (local !== k) fixed = true;
      }
    );

    if (fixed) {
      window.habitCompletions = migrated;
      saveCompletions();
      console.log("Habits migrated");
    }
  }

  /* =========================
     CORE
  ========================= */

  function isDone(id, date) {
    return !!(
      window.habitCompletions?.[date]?.[id]
    );
  }

  function toggleHabit(id, date) {
    if (!window.habitCompletions[date]) {
      window.habitCompletions[date] = {};
    }

    window.habitCompletions[date][id] =
      !window.habitCompletions[date][id];

    saveCompletions();

    renderHabits();
    syncAll();
  }

  function getDayCompletion(date) {
    const habits = window.habits || [];
    if (!habits.length)
      return { percent: 0, done: 0, total: 0 };

    let done = 0;

    habits.forEach((h) => {
      if (isDone(h.id, date)) done++;
    });

    const total = habits.length;

    return {
      done,
      total,
      percent: total
        ? Math.round((done / total) * 100)
        : 0
    };
  }

  function calculateCurrentStreak() {
    let s = 0;
    let d = new Date();

    while (true) {
      const k = getDateStringLocal(d);

      if (getDayCompletion(k).percent >= 80) {
        s++;
        d.setDate(d.getDate() - 1);
      } else break;
    }

    return s;
  }

  /* =========================
     SYNC
  ========================= */

  function syncAll() {
    window.renderLifeScore?.();
    window.renderWeeklyGraph?.();
    window.renderDNAProfile?.();
    window.renderDashboardTrendChart?.();
  }

  /* =========================
     UI
  ========================= */

  function renderHabits() {
    const grid = document.getElementById("habitGrid");
    if (!grid) return;

    const week = getWeekDates();
    const names = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const habits = window.habits || [];

    let html = `
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
      <strong>Daily Habits - This Week</strong>
      <button onclick="openHabitManager()"
        style="padding:6px 12px;border-radius:10px;">
        ⚙ Manage
      </button>
    </div>

    <table style="width:100%;border-collapse:collapse;">
    <thead><tr>
      <th></th>
      <th>Habit</th>
      ${week.map((d,i)=>`
        <th>${names[i]}<br>${d.getDate()}</th>
      `).join("")}
    </tr></thead><tbody>
    `;

    habits.forEach((h) => {
      html += `<tr>
        <td>☰</td>
        <td>${h.icon} ${window.escapeHtml(h.name)}</td>
      `;

      week.forEach((d) => {
        const k = getDateStringLocal(d);
        const done = isDone(h.id, k);

        html += `
        <td onclick="toggleHabit('${h.id}','${k}')"
            style="cursor:pointer;text-align:center;">
          ${done ? "✅" : "○"}
        </td>`;
      });

      html += `</tr>`;
    });

    html += `</tbody></table>`;

    grid.innerHTML = html;
  }

  /* =========================
     MANAGER
  ========================= */

  function openHabitManager() {
    window.openModal(`
      <h2>Manage Habits</h2>

      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <input id="hn" class="form-input" placeholder="Name"/>
        <input id="hi" class="form-input" placeholder="Emoji" style="width:80px"/>
        <button class="form-submit" onclick="addHabit()">Add</button>
      </div>

      ${(window.habits||[]).map(h=>`
        <div style="display:flex;justify-content:space-between;padding:6px;">
          <div>${h.icon} ${window.escapeHtml(h.name)}</div>
          <button onclick="deleteHabit('${h.id}')"
            style="color:#EF4444">Delete</button>
        </div>
      `).join("")}
    `);
  }

  function addHabit() {
    const name =
      document.getElementById("hn")?.value.trim();

    const icon =
      document.getElementById("hi")?.value.trim() || "✨";

    if (!name) return alert("Name required");

    window.habits.push({
      id: "h_" + Date.now(),
      name,
      icon
    });

    saveHabits();
    closeModal();

    renderHabits();
    syncAll();
  }

  function deleteHabit(id) {
    window.habits = window.habits.filter(
      (h) => h.id !== id
    );

    Object.keys(window.habitCompletions).forEach(
      (d) => delete window.habitCompletions[d][id]
    );

    saveHabits();
    saveCompletions();

    closeModal();
    renderHabits();
    syncAll();
  }

  /* =========================
     INIT
  ========================= */

  function init() {
    try {
      window.habits =
        JSON.parse(localStorage.getItem("habits")) || [];
    } catch {}

    try {
      window.habitCompletions =
        JSON.parse(localStorage.getItem("habitCompletions")) || {};
    } catch {}

    migrateUTC();

    if (!window.habits.length) {
      window.habits = [
        { id: "wake", name: "Wake 7AM", icon: "⏰" },
        { id: "work", name: "Workout", icon: "💪" },
        { id: "med", name: "Meditate", icon: "🧘" }
      ];
      saveHabits();
    }
  }

  /* =========================
     EXPORTS
  ========================= */

  window.initHabitsData = init;
  window.renderHabits = renderHabits;
  window.toggleHabit = toggleHabit;

  window.openHabitManager = openHabitManager;
  window.addHabit = addHabit;
  window.deleteHabit = deleteHabit;

  window.getDayCompletion = getDayCompletion;
  window.calculateCurrentStreak = calculateCurrentStreak;

  if (App) {
    App.on("dashboard", renderHabits);
  }

  console.log("Habits fixed + synced");
})();
