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
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }

  // ── ROLLING 7-DAY WINDOW ──────────────────────────────────────────────────
  // Always shows the last 7 days ending today so your streak never disappears
  // on a new calendar week.
  function getRollingWeek() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d);
    }
    return days; // oldest → newest (today is last / rightmost)
  }

  // Keep for any external callers that expected getWeekDates
  window.getWeekDates = getRollingWeek;

  function migrateUTCKeysIfNeeded() {}

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
    habits.forEach(h => { if (isDone(h.id, dateStr)) done++; });
    const total = habits.length;
    return { percent: total ? Math.round((done / total) * 100) : 0, done, total };
  }

  function calculateCurrentStreak() {
    let streak = 0;
    const cursor = new Date();
    while (true) {
      const k = getDateStringLocal(cursor);
      if (getDayCompletion(k).percent >= 80) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    return streak;
  }

  // ── RENDER HABITS GRID ────────────────────────────────────────────────────

  function renderHabits() {
    const grid = document.getElementById("habitGrid");
    if (!grid) return;

    const week     = getRollingWeek();
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const habits   = window.habits || [];
    const todayStr = getDateStringLocal();

    let html = `
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;align-items:center;">
        <strong>Last 7 Days</strong>
        <button onclick="openHabitManager()" style="padding:6px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);color:white;cursor:pointer;">
          ⚙ Manage
        </button>
      </div>

      <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;min-width:480px;">
        <thead>
          <tr>
            <th style="width:28px;"></th>
            <th style="text-align:left;padding:10px 12px;">Habit</th>
            ${week.map(d => {
              const isToday = getDateStringLocal(d) === todayStr;
              return `<th style="text-align:center;padding:10px 8px;${isToday ? "color:#a78bfa;" : "color:#9CA3AF;"}font-weight:${isToday ? "900" : "600"};">
                ${dayNames[d.getDay()]}<br>
                <span style="font-size:0.95rem;">${d.getDate()}</span>
                ${isToday ? `<div style="width:5px;height:5px;border-radius:50%;background:#a78bfa;margin:3px auto 0;"></div>` : ""}
              </th>`;
            }).join("")}
          </tr>
        </thead>
        <tbody>
    `;

    if (!habits.length) {
      html += `<tr><td colspan="9" style="padding:20px;text-align:center;color:#9CA3AF;">No habits yet — tap ⚙ Manage to add some.</td></tr>`;
    }

    habits.forEach(h => {
      html += `<tr>
        <td style="text-align:center;color:#6b7280;font-size:0.85rem;">☰</td>
        <td style="padding:10px 12px;font-weight:600;">${h.icon} ${window.escapeHtml ? window.escapeHtml(h.name) : h.name}</td>
      `;
      week.forEach(d => {
        const k       = getDateStringLocal(d);
        const done    = isDone(h.id, k);
        const isToday = k === todayStr;
        html += `
          <td onclick="toggleHabit('${h.id}','${k}')"
              style="cursor:pointer;text-align:center;padding:10px 8px;${isToday ? "background:rgba(167,139,250,0.05);border-radius:8px;" : ""}">
            ${done ? "✅" : "<span style='color:#4b5563;'>○</span>"}
          </td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    grid.innerHTML = html;
  }

  // ── HABIT MANAGER MODAL ───────────────────────────────────────────────────

  function openHabitManager() {
    window.openModal(`
      <h2 style="margin-bottom:16px;">Manage Habits</h2>

      <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
        <input id="hn" placeholder="Habit name" class="form-input" style="flex:1; min-width:160px;" />
        <input id="hi" placeholder="Emoji" class="form-input" style="width:72px;" />
        <button class="form-submit" onclick="addHabit()">Add</button>
      </div>

      <div id="habitManagerList" style="max-height:380px; overflow-y:auto; display:grid; gap:8px;">
        ${(window.habits || []).map(h => buildHabitRow(h)).join("")}
      </div>
    `);
  }

  // Build one habit row (view + edit modes)
  function buildHabitRow(h) {
    const esc = s => String(s || "").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    return `
      <div id="habitRow_${h.id}" style="padding:12px 14px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);">

        <!-- VIEW MODE -->
        <div id="habitView_${h.id}" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div style="font-weight:700; flex:1; font-size:0.95rem;">${esc(h.icon)} ${esc(h.name)}</div>
          <div style="display:flex; gap:6px;">
            <button onclick="startEditHabit('${h.id}')" style="
              padding:5px 12px; border-radius:8px;
              border:1px solid rgba(99,102,241,0.4); background:rgba(99,102,241,0.1);
              color:#a78bfa; font-size:0.82rem; font-weight:700; cursor:pointer;">✏️ Edit</button>
            <button onclick="deleteHabit('${h.id}')" style="
              padding:5px 12px; border-radius:8px;
              border:1px solid rgba(239,68,68,0.3); background:rgba(239,68,68,0.08);
              color:#ef4444; font-size:0.82rem; font-weight:700; cursor:pointer;">Delete</button>
          </div>
        </div>

        <!-- EDIT MODE (hidden) -->
        <div id="habitEdit_${h.id}" style="display:none;">
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <input id="editIcon_${h.id}" value="${esc(h.icon)}" placeholder="Emoji"
              class="form-input" style="width:72px;" />
            <input id="editName_${h.id}" value="${esc(h.name)}" placeholder="Habit name"
              class="form-input" style="flex:1; min-width:140px;"
              onkeydown="if(event.key==='Enter') saveEditHabit('${h.id}')" />
            <button onclick="saveEditHabit('${h.id}')" style="
              padding:7px 16px; border-radius:8px;
              background:linear-gradient(135deg,rgba(99,102,241,0.9),rgba(236,72,153,0.8));
              border:none; color:white; font-weight:800; cursor:pointer;">Save</button>
            <button onclick="cancelEditHabit('${h.id}')" style="
              padding:7px 12px; border-radius:8px;
              border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.05);
              color:#9ca3af; font-weight:700; cursor:pointer;">Cancel</button>
          </div>
        </div>

      </div>
    `;
  }

  window.startEditHabit = function(id) {
    document.getElementById(`habitView_${id}`).style.display = "none";
    document.getElementById(`habitEdit_${id}`).style.display = "block";
    document.getElementById(`editName_${id}`)?.select();
  };

  window.cancelEditHabit = function(id) {
    document.getElementById(`habitView_${id}`).style.display = "flex";
    document.getElementById(`habitEdit_${id}`).style.display = "none";
  };

  window.saveEditHabit = function(id) {
    const newName = (document.getElementById(`editName_${id}`)?.value || "").trim();
    const newIcon = (document.getElementById(`editIcon_${id}`)?.value || "").trim() || "✨";

    if (!newName) { alert("Habit name can't be empty."); return; }

    const habit = (window.habits || []).find(h => h.id === id);
    if (!habit) return;

    habit.name = newName;
    habit.icon = newIcon;
    saveHabits();
    renderHabits();

    // Swap the row in place so modal stays open
    const row = document.getElementById(`habitRow_${id}`);
    if (row) {
      const tmp = document.createElement("div");
      tmp.innerHTML = buildHabitRow(habit);
      row.replaceWith(tmp.firstElementChild);
    }
  };

  window.addHabit = function() {
    const name = (document.getElementById("hn")?.value || "").trim();
    const icon = (document.getElementById("hi")?.value || "").trim() || "✨";
    if (!name) { alert("Habit name required"); return; }

    window.habits.push({ id: "h_" + Date.now(), name, icon });
    saveHabits();
    renderHabits();

    // Refresh list in open modal
    const list = document.getElementById("habitManagerList");
    if (list) list.innerHTML = (window.habits || []).map(h => buildHabitRow(h)).join("");

    const hn = document.getElementById("hn");
    const hi = document.getElementById("hi");
    if (hn) { hn.value = ""; hn.focus(); }
    if (hi) hi.value = "";
  };

  function deleteHabit(id) {
    if (!confirm("Delete this habit?")) return;

    window.habits = window.habits.filter(h => h.id !== id);
    Object.keys(window.habitCompletions || {}).forEach(day => {
      delete window.habitCompletions[day][id];
    });

    saveHabits();
    saveCompletions();
    renderHabits();

    const list = document.getElementById("habitManagerList");
    if (list) list.innerHTML = (window.habits || []).map(h => buildHabitRow(h)).join("");
  }

  // ── INIT ──────────────────────────────────────────────────────────────────

  function initHabitsData() {
    if (habitsInitialized) return;
    habitsInitialized = true;

    try {
      const raw = localStorage.getItem("habits");
      if (raw === null) {
        window.habits = [
          { id: "wake", name: "Wake Up At 7 AM",  icon: "⏰" },
          { id: "sun",  name: "Morning Sunlight",  icon: "☀️" },
          { id: "skin", name: "Skincare",           icon: "🧴" }
        ];
        saveHabits();
      } else {
        const parsed = JSON.parse(raw);
        window.habits = Array.isArray(parsed) ? parsed : [];
      }
    } catch { window.habits = []; }

    try {
      const saved = JSON.parse(localStorage.getItem("habitCompletions") || "{}");
      window.habitCompletions = saved && typeof saved === "object" ? saved : {};
    } catch { window.habitCompletions = {}; }

    migrateUTCKeysIfNeeded();
  }

  window.initHabitsData         = initHabitsData;
  window.renderHabits           = renderHabits;
  window.toggleHabit            = toggleHabit;
  window.openHabitManager       = openHabitManager;
  window.addHabit               = window.addHabit;   // already set above
  window.deleteHabit            = deleteHabit;
  window.getDayCompletion       = getDayCompletion;
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
