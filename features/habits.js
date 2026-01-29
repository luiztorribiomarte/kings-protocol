// ============================================
// HABITS MODULE — WITH DRAG & DROP REORDERING
// ============================================

window.habits = window.habits || [];
window.habitCompletions = window.habitCompletions || {};

let habits = window.habits;
let habitCompletions = window.habitCompletions;

// ---------- INIT ----------
function initHabitsData() {
  const savedHabits = localStorage.getItem("habits");
  if (savedHabits) {
    try { habits = JSON.parse(savedHabits) || []; }
    catch { habits = []; }
  }

  const savedCompletions = localStorage.getItem("habitCompletions");
  if (savedCompletions) {
    try { habitCompletions = JSON.parse(savedCompletions) || {}; }
    catch { habitCompletions = {}; }
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

function getLastDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(getDateString(d));
  }
  return days;
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

function getHabitStreak(habitId) {
  let streak = 0;
  let date = new Date();
  
  while (true) {
    const dateStr = getDateString(date);
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

function toggleHabit(habitId, dateStr) {
  if (!habitCompletions[dateStr]) habitCompletions[dateStr] = {};
  habitCompletions[dateStr][habitId] = !habitCompletions[dateStr][habitId];

  saveHabitCompletions();
  renderHabits();

  if (typeof renderLifeScore === "function") renderLifeScore();
  if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
  if (typeof renderDNAProfile === "function") renderDNAProfile();
  if (typeof renderDashboardTrendChart === "function") renderDashboardTrendChart();
}

// ---------- BRIDGE (FIXED FOR PROPER COMPLETION TRACKING) ----------
function getDayCompletion(dateStr = getDateString()) {
  if (!habits.length) return { percent: 0, done: 0, total: 0 };

  let done = 0;
  habits.forEach(h => { if (isComplete(h.id, dateStr)) done++; });

  const total = habits.length;
  const percent = Math.round((done / total) * 100);

  return { percent, done, total };
}

function getDayCompletionPercent(dateStr) {
  return getDayCompletion(dateStr).percent;
}

// ---------- DRAG & DROP ----------
let draggedHabitIndex = null;

function handleDragStart(e, index) {
  draggedHabitIndex = index;
  e.target.style.opacity = '0.4';
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.target.style.opacity = '1';
  draggedHabitIndex = null;
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  e.target.closest('tr')?.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.target.closest('tr')?.classList.remove('drag-over');
}

function handleDrop(e, dropIndex) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  e.target.closest('tr')?.classList.remove('drag-over');
  
  if (draggedHabitIndex !== null && draggedHabitIndex !== dropIndex) {
    const draggedItem = habits[draggedHabitIndex];
    habits.splice(draggedHabitIndex, 1);
    habits.splice(dropIndex, 0, draggedItem);
    saveHabits();
    renderHabits();
  }
  
  return false;
}

// ---------- UI ----------
function renderHabits() {
  const grid = document.getElementById("habitGrid");
  if (!grid) return;

  const weekDates = getWeekDates(new Date());
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let html = `
    <style>
      .drag-over {
        border-top: 2px solid #6366F1 !important;
      }
      .habit-row {
        cursor: move;
      }
      .habit-row:hover {
        background: rgba(255,255,255,0.03);
      }
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
          ${weekDates.map((d,i)=>`
            <th style="text-align:center; padding:14px; border-bottom:1px solid rgba(255,255,255,0.08);">
              ${dayNames[i]}<br>${d.getDate()}
            </th>
          `).join("")}
        </tr>
      </thead>
      <tbody>
        ${habits.map((h, habitIndex)=>{
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
            <td style="padding:14px; text-align:center; color:#9CA3AF; cursor:move;">
              ☰
            </td>
            <td onclick="openHabitChart('${h.id}')" style="cursor:pointer; padding:14px; font-weight:600;">
              ${h.icon} ${escapeHtml(h.name)}
              ${streakEmoji ? `<span style="margin-left:8px; font-size:0.9rem;" title="${streak} day streak">${streakEmoji}</span>` : ''}
            </td>
            ${weekDates.map(d=>{
              const dateStr = getDateString(d);
              const done = isComplete(h.id,dateStr);
              return `
                <td onclick="toggleHabit('${h.id}','${dateStr}')" style="text-align:center; cursor:pointer; padding:14px;">
                  ${done ? "✅" : "○"}
                </td>
              `;
            }).join("")}
          </tr>
        `;
        }).join("")}
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

  const daysAt80 = dayPercents.filter(p => p >= 80).length;
  const weeklyAvg = dayPercents.reduce((a,b)=>a+b,0)/(dayPercents.length||1);
  const weeklyPercent = Math.round(weeklyAvg);
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
    if (pct >= 80) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  return streak;
}

// ---------- HABIT MANAGER (ADD / DELETE) ----------
function openHabitManager() {
  openModal(`
    <h2>Manage Habits</h2>

    <div style="display:flex; gap:8px; margin-bottom:12px;">
      <input id="newHabitName" placeholder="Habit name" class="form-input" />
      <input id="newHabitIcon" placeholder="Emoji (optional)" class="form-input" style="width:80px;" />
      <button class="form-submit" onclick="addHabit()">Add</button>
    </div>

    <div style="max-height:300px; overflow:auto;">
      ${habits.map(h => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid rgba(255,255,255,0.1);">
          <div>${h.icon} ${escapeHtml(h.name)}</div>
          <button onclick="deleteHabit('${h.id}')" style="color:#EF4444; background:none; border:none; cursor:pointer;">Delete</button>
        </div>
      `).join("")}
    </div>
  `);
}

function addHabit() {
  const name = document.getElementById("newHabitName").value.trim();
  const icon = document.getElementById("newHabitIcon").value.trim() || "✨";
  if (!name) return alert("Habit name required");

  habits.push({
    id: "h_" + Date.now(),
    name,
    icon
  });

  saveHabits();
  closeModal();
  renderHabits();
  
  // Refresh dashboard components
  if (typeof renderLifeScore === "function") renderLifeScore();
  if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
  if (typeof renderDNAProfile === "function") renderDNAProfile();
  if (typeof renderDashboardTrendChart === "function") renderDashboardTrendChart();
}

function deleteHabit(id) {
  if (!confirm("Delete this habit?")) return;
  habits = habits.filter(h => h.id !== id);
  saveHabits();
  closeModal();
  renderHabits();
  
  // Refresh dashboard components
  if (typeof renderLifeScore === "function") renderLifeScore();
  if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
  if (typeof renderDNAProfile === "function") renderDNAProfile();
  if (typeof renderDashboardTrendChart === "function") renderDashboardTrendChart();
}

// ---------- HABIT CHART ----------
function openHabitChart(habitId) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;

  openModal(`
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div style="font-weight:800;">${habit.icon} ${escapeHtml(habit.name)}</div>
      <select id="habitChartRange" style="padding:6px 10px; border-radius:10px; background:rgba(255,255,255,0.08); color:white;">
        <option value="7">7 days</option>
        <option value="30">30 days</option>
        <option value="all">All time</option>
      </select>
    </div>
    <canvas id="habitChartCanvas" height="200" style="margin-top:14px;"></canvas>
  `);

  document.getElementById("habitChartRange").onchange = () => renderHabitChart(habitId);
  renderHabitChart(habitId);
}

let habitChartInstance = null;

function renderHabitChart(habitId) {
  const canvas = document.getElementById("habitChartCanvas");
  if (!canvas || typeof Chart === "undefined") return;

  const range = document.getElementById("habitChartRange").value;
  let days = [];

  if (range === "all") {
    days = Object.keys(habitCompletions).sort();
  } else {
    days = getLastDays(parseInt(range));
  }

  const labels = days.map(d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  const data = days.map(d => isComplete(habitId, d) ? 100 : 0);

  if (habitChartInstance) habitChartInstance.destroy();

  habitChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Completion %",
        data,
        tension: 0.3,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { min: 0, max: 100 }
      }
    }
  });
}

// ---------- HELPERS ----------
function escapeHtml(str) {
  return String(str||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

// ---------- BOOT ----------
(function bootHabits() {
  try {
    initHabitsData();
    renderHabits();
  } catch (e) {
    console.error("Habits failed:", e);
  }
})();

// ---------- CORE REGISTRATION ----------
if (window.App) {
  App.features.habits = {
    init: initHabitsData,
    render: renderHabits
  };

  App.on("dashboard", () => renderHabits());
}

console.log("Habits system with drag & drop loaded");
