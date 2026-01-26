// ============================================
// HABITS MODULE — SAFE + CORE COMPATIBLE
// DOES NOT REMOVE EXISTING FEATURES
// ============================================

window.habits = window.habits || [];
window.habitCompletions = window.habitCompletions || {};

let habits = window.habits;
let habitCompletions = window.habitCompletions;

// ---------- INIT ----------
function initHabitsData() {
  const savedHabits = localStorage.getItem("habits");
  if (savedHabits) {
    try {
      habits = JSON.parse(savedHabits) || [];
    } catch {
      habits = [];
    }
  }

  const savedCompletions = localStorage.getItem("habitCompletions");
  if (savedCompletions) {
    try {
      habitCompletions = JSON.parse(savedCompletions) || {};
    } catch {
      habitCompletions = {};
    }
  }

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

  window.habits = habits;
  window.habitCompletions = habitCompletions;
}

// ---------- SAVE ----------
function saveHabits() {
  localStorage.setItem("habits", JSON.stringify(habits));
}

function saveHabitCompletions() {
  localStorage.setItem("habitCompletions", JSON.stringify(habitCompletions));
}

// ---------- DATE HELPERS ----------
function getDateString(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function getWeekDates(date = new Date()) {
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

// ---------- CORE LOGIC ----------
function isComplete(habitId, dateStr) {
  return !!(habitCompletions[dateStr] && habitCompletions[dateStr][habitId]);
}

function toggleHabit(habitId, dateStr) {
  if (!habitCompletions[dateStr]) habitCompletions[dateStr] = {};
  habitCompletions[dateStr][habitId] = !habitCompletions[dateStr][habitId];

  saveHabitCompletions();
  renderHabits();

  if (typeof renderLifeScore === "function") renderLifeScore();
  if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
  if (typeof renderDNAProfile === "function") renderDNAProfile();
}

// ---------- BRIDGE FUNCTION ----------
function getDayCompletion(dateStr = getDateString()) {
  if (!habits.length) {
    return { percent: 0, done: 0, total: 0 };
  }

  let done = 0;
  habits.forEach(h => {
    if (isComplete(h.id, dateStr)) done++;
  });

  const total = habits.length;
  const percent = Math.round((done / total) * 100);

  return { percent, done, total };
}

function getDayCompletionPercent(dateStr) {
  const data = getDayCompletion(dateStr);
  return data.percent / 100;
}

// ---------- UI ----------
function renderHabits() {
  const grid = document.getElementById("habitGrid");
  if (!grid) return;

  const weekDates = getWeekDates(new Date());
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let html = `
    <table class="habit-table" style="width:100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="text-align:left; padding:14px; border-bottom:1px solid rgba(255,255,255,0.08);">Habit</th>
          ${weekDates.map((d,i)=>`
            <th style="text-align:center; padding:14px; border-bottom:1px solid rgba(255,255,255,0.08);">
              ${dayNames[i]}<br>${d.getDate()}
            </th>
          `).join("")}
        </tr>
      </thead>
      <tbody>
        ${habits.map(h=>`
          <tr>
            <td onclick="openHabitChart('${h.id}')" style="cursor:pointer; padding:14px;">
              ${h.icon} ${escapeHtml(h.name)}
            </td>
            ${weekDates.map(d=>{
              const dateStr = getDateString(d);
              const done = isComplete(h.id,dateStr);
              return `
                <td onclick="toggleHabit('${h.id}','${dateStr}')" style="text-align:center; cursor:pointer;">
                  ${done ? "✅" : "○"}
                </td>
              `;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  grid.innerHTML = html;
  updateStats();
}

// ---------- STATS ----------
function updateStats() {
  const daysAt80El = document.getElementById("daysAt80");
  const weeklyCompletionEl = document.getElementById("weeklyCompletion");
  const currentStreakEl = document.getElementById("currentStreak");

  const weekDates = getWeekDates(new Date());
  const dayPercents = weekDates.map(d => getDayCompletionPercent(getDateString(d)));

  const daysAt80 = dayPercents.filter(p => p >= 0.8).length;
  const weeklyAvg = dayPercents.reduce((a,b)=>a+b,0)/(dayPercents.length||1);
  const weeklyPercent = Math.round(weeklyAvg*100);
  const streak = calculateCurrentStreak();

  if (daysAt80El) daysAt80El.textContent = `${daysAt80}/7`;
  if (weeklyCompletionEl) weeklyCompletionEl.textContent = `${weeklyPercent}%`;
  if (currentStreakEl) currentStreakEl.textContent = streak;
}

function calculateCurrentStreak() {
  let streak = 0;
  let cursor = new Date();

  while (true) {
    const dateStr = getDateString(cursor);
    const pct = getDayCompletionPercent(dateStr);
    if (pct >= 0.8) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  return streak;
}

// ---------- HELPERS ----------
function escapeHtml(str) {
  return String(str||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

// ---------- GUARANTEED BOOT ----------
(function bootHabits() {
  try {
    initHabitsData();
    renderHabits();
  } catch (e) {
    console.error("Habits failed to load:", e);
  }
})();

// ---------- CORE REGISTRATION ----------
if (window.App) {
  App.features.habits = {
    init: initHabitsData,
    render: renderHabits
  };

  App.on("dashboard", () => {
    renderHabits();
  });
}

console.log("Habits module loaded");
