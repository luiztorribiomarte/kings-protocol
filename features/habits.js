// ============================================
// HABITS GLOBAL STATE (IMPORTANT FIX)
// ============================================

window.habits = window.habits || [];
window.habitCompletions = window.habitCompletions || {};

let habits = window.habits;
let habitCompletions = window.habitCompletions;


function initHabitsData() {
  // Habits list
  const savedHabits = localStorage.getItem("habits");
  if (savedHabits) {
    try {
      habits = JSON.parse(savedHabits) || [];
    } catch {
      habits = [];
    }
  }

  // Completions map
  const savedCompletions = localStorage.getItem("habitCompletions");
  if (savedCompletions) {
    try {
      habitCompletions = JSON.parse(savedCompletions) || {};
    } catch {
      habitCompletions = {};
    }
  }

  // Seed defaults if empty
  if (!Array.isArray(habits) || habits.length === 0) {
    habits = [
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

function saveHabits() {
  localStorage.setItem("habits", JSON.stringify(habits));
}

function saveHabitCompletions() {
  localStorage.setItem("habitCompletions", JSON.stringify(habitCompletions));
}

function getDateString(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function getWeekDates(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun ... 6 Sat
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
  return !!(habitCompletions[dateStr] && habitCompletions[dateStr][habitId]);
}

function toggleHabit(habitId, dateStr) {
  if (!habitCompletions[dateStr]) habitCompletions[dateStr] = {};
  habitCompletions[dateStr][habitId] = !habitCompletions[dateStr][habitId];
  saveHabitCompletions();
  renderHabits();
  updateStats();
}

function renderHabits() {
  const grid = document.getElementById("habitGrid");
  if (!grid) return;

  const weekDates = getWeekDates(new Date());
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let html = `
    <table class="habit-table" style="width:100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="text-align:left; padding:14px 14px; color:#E5E7EB; font-size:1.05em; border-bottom:1px solid rgba(255,255,255,0.08);">Habit</th>
          ${weekDates
            .map((d, i) => {
              const dd = d.getDate();
              return `
                <th style="text-align:center; padding:14px 10px; color:#E5E7EB; border-bottom:1px solid rgba(255,255,255,0.08);">
                  <div style="line-height:1.1">${dayNames[i]}</div>
                  <div style="opacity:0.9">${dd}</div>
                </th>
              `;
            })
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${habits
          .map((h) => {
            return `
              <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <td
                  class="habit-name-cell"
                  onclick="openHabitChart('${h.id}')"
                  style="
                    cursor:pointer;
                    padding:14px 14px;
                    color:#F3F4F6;
                    font-weight:600;
                    user-select:none;
                  "
                  title="Click to view chart"
                >
                  <span style="margin-right:10px;">${h.icon || "✅"}</span>${escapeHtml(h.name)}
                </td>
                ${weekDates
                  .map((d) => {
                    const dateStr = getDateString(d);
                    const done = isComplete(h.id, dateStr);
                    return `
                      <td
                        onclick="toggleHabit('${h.id}','${dateStr}')"
                        style="
                          text-align:center;
                          padding:14px 10px;
                          cursor:pointer;
                          user-select:none;
                        "
                        title="${done ? "Completed" : "Not completed"}"
                      >
                        ${
                          done
                            ? `<span style="
                                display:inline-flex;
                                align-items:center;
                                justify-content:center;
                                width:20px;height:20px;
                                border-radius:5px;
                                background:rgba(34,197,94,0.95);
                                color:#0B1220;
                                font-weight:900;
                              ">✓</span>`
                            : `<span style="
                                display:inline-block;
                                width:10px;height:10px;
                                border-radius:50%;
                                background:rgba(255,255,255,0.25);
                              "></span>`
                        }
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

  // If you have a progress footer elsewhere, update it
  updateStats();
}

/* -----------------------------
   Stats (fixes the console error)
------------------------------ */
function updateStats() {
  // Safe-guard: don’t crash if elements aren’t on the page
  const daysAt80El = document.getElementById("daysAt80");
  const weeklyCompletionEl = document.getElementById("weeklyCompletion");
  const currentStreakEl = document.getElementById("currentStreak");

  const weekDates = getWeekDates(new Date());

  // For each day, % habits done
  const dayPercents = weekDates.map((d) => {
    const dateStr = getDateString(d);
    if (!habits.length) return 0;
    const doneCount = habits.reduce((sum, h) => sum + (isComplete(h.id, dateStr) ? 1 : 0), 0);
    return doneCount / habits.length;
  });

  const daysAt80 = dayPercents.filter((p) => p >= 0.8).length;
  const weeklyAvg = dayPercents.reduce((a, b) => a + b, 0) / (dayPercents.length || 1);
  const weeklyPercent = Math.round(weeklyAvg * 100);

  const streak = calculateCurrentStreak();

  if (daysAt80El) daysAt80El.textContent = `${daysAt80}/7`;
  if (weeklyCompletionEl) weeklyCompletionEl.textContent = `${weeklyPercent}%`;
  if (currentStreakEl) currentStreakEl.textContent = `${streak}`;

  // Optional: keep your streak UI in sync if those ids exist
  const streakNumber = document.getElementById("streakNumber");
  if (streakNumber) streakNumber.textContent = `${streak}`;
}

function calculateCurrentStreak() {
  // A “streak day” counts if the day is >= 80% complete
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cursor = new Date(today);

  while (true) {
    const dateStr = getDateString(cursor);
    const pct = getDayCompletionPercent(dateStr);
    if (pct >= 0.8) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function getDayCompletionPercent(dateStr) {
  if (!habits.length) return 0;
  const doneCount = habits.reduce((sum, h) => sum + (isComplete(h.id, dateStr) ? 1 : 0), 0);
  return doneCount / habits.length;
}

/* -----------------------------
   Manage Habits (keeps your button working)
------------------------------ */
function openManageHabits() {
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");
  if (!modal || !modalBody) return;

  modalBody.innerHTML = `
    <h2 style="color:white; margin-bottom:14px;">Manage Habits</h2>

    <div style="display:flex; gap:10px; margin-bottom:14px;">
      <input id="newHabitName" class="form-input" placeholder="New habit name" style="flex:1;" />
      <input id="newHabitIcon" class="form-input" placeholder="Icon (optional)" style="width:140px;" />
      <button onclick="addHabitFromModal()" class="form-submit" style="white-space:nowrap;">Add</button>
    </div>

    <div style="max-height:320px; overflow:auto; border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:10px;">
      ${habits
        .map(
          (h) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="color:#E5E7EB; font-weight:600;">
              <span style="margin-right:10px;">${h.icon || "✅"}</span>${escapeHtml(h.name)}
            </div>
            <button onclick="deleteHabit('${h.id}')" class="book-delete-btn" style="padding:8px 12px;">Delete</button>
          </div>
        `
        )
        .join("")}
    </div>

    <div class="form-actions" style="margin-top:16px;">
      <button onclick="closeModal()" class="form-cancel">Close</button>
    </div>
  `;

  modal.style.display = "flex";
}

function addHabitFromModal() {
  const nameEl = document.getElementById("newHabitName");
  const iconEl = document.getElementById("newHabitIcon");
  if (!nameEl) return;

  const name = (nameEl.value || "").trim();
  const icon = iconEl ? (iconEl.value || "").trim() : "";

  if (!name) {
    alert("Enter a habit name");
    return;
  }

  const id = `h_${Date.now().toString(36)}`;
  habits.push({ id, name, icon: icon || "✅" });
  saveHabits();

  // Re-render + keep modal open
  openManageHabits();
  renderHabits();
  updateStats();
}

function deleteHabit(habitId) {
  if (!confirm("Delete this habit?")) return;
  habits = habits.filter((h) => h.id !== habitId);
  saveHabits();

  // Clean completions
  Object.keys(habitCompletions).forEach((dateStr) => {
    if (habitCompletions[dateStr] && habitCompletions[dateStr][habitId]) {
      delete habitCompletions[dateStr][habitId];
      if (Object.keys(habitCompletions[dateStr]).length === 0) delete habitCompletions[dateStr];
    }
  });
  saveHabitCompletions();

  openManageHabits();
  renderHabits();
  updateStats();
}

/* -----------------------------
   Habit Chart (click habit name to open)
------------------------------ */
let habitChartInstance = null;

function openHabitChart(habitId) {
  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return;

  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");
  if (!modal || !modalBody) return;

  modalBody.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div>
        <div style="color:white; font-size:1.2em; font-weight:700;">
          ${habit.icon || "✅"} ${escapeHtml(habit.name)}
        </div>
        <div style="color:#9CA3AF; font-size:0.9em; margin-top:4px;">
          Line graph of completions (1 = done, 0 = not done)
        </div>
      </div>

      <div style="min-width:180px;">
        <label style="color:#9CA3AF; font-size:0.85em; display:block; margin-bottom:6px;">Range</label>
        <select id="habitChartRange" style="width:100%; padding:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); border-radius:10px; color:white;">
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>
    </div>

    <div style="margin-top:16px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.10); border-radius:14px; padding:14px;">
      <canvas id="habitChartCanvas" height="140"></canvas>
    </div>
  `;

  modal.style.display = "flex";

  // Hook range changes
  const rangeEl = document.getElementById("habitChartRange");
  if (rangeEl) {
    rangeEl.addEventListener("change", () => renderHabitChart(habitId));
  }

  renderHabitChart(habitId);
}

function renderHabitChart(habitId) {
  const rangeEl = document.getElementById("habitChartRange");
  const canvas = document.getElementById("habitChartCanvas");
  if (!canvas || typeof Chart === "undefined") return;

  const range = rangeEl ? rangeEl.value : "7";

  const series = buildHabitSeries(habitId, range);

  // Destroy old chart to prevent overlay bugs
  if (habitChartInstance) {
    habitChartInstance.destroy();
    habitChartInstance = null;
  }

  const ctx = canvas.getContext("2d");
  habitChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: series.labels,
      datasets: [
        {
          label: "Completed",
          data: series.values,
          tension: 0.35,
          fill: false,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => (ctx.parsed.y === 1 ? "Done" : "Not done")
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 1,
          ticks: {
            stepSize: 1,
            callback: (v) => (v === 1 ? "Done" : "Missed")
          },
          grid: { color: "rgba(255,255,255,0.08)" }
        },
        x: {
          grid: { color: "rgba(255,255,255,0.06)" }
        }
      }
    }
  });
}

function buildHabitSeries(habitId, range) {
  // Collect all dates that exist in completions (for all-time)
  const allDates = Object.keys(habitCompletions).sort();

  let datesToUse = [];

  if (range === "all") {
    datesToUse = allDates.length ? allDates : generateRecentDates(30).map(getDateString);
  } else {
    const n = parseInt(range, 10) || 7;
    datesToUse = generateRecentDates(n).map(getDateString);
  }

  const labels = datesToUse.map((ds) => {
    const d = new Date(ds + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const values = datesToUse.map((ds) => (isComplete(habitId, ds) ? 1 : 0));

  return { labels, values };
}

function generateRecentDates(days) {
  const out = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(x);
  }
  return out;
}

/* -----------------------------
   Helpers
------------------------------ */
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* -----------------------------
   Auto-init (safe)
------------------------------ */
(function bootHabits() {
  initHabitsData();

  // Render if we're already on a page that includes habitGrid
  if (document.getElementById("habitGrid")) {
    renderHabits();
  }
})();
