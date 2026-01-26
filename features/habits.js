// ============================================
// HABITS CORE SYSTEM — PARTIAL + WEIGHTED + STREAK INTELLIGENCE
// (FULL UPGRADE, BACKWARD COMPATIBLE)
// ============================================

let habitsList = [];
let habitData = {}; // { dateKey: { habitId: value(0-100) } }

// ---------- Utilities ----------
function getDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPastDays(n = 7) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d);
  }
  return out;
}

// ---------- Load / Save ----------
function loadHabits() {
  try {
    habitsList = JSON.parse(localStorage.getItem("habitsList")) || [];
  } catch {
    habitsList = [];
  }

  try {
    habitData = JSON.parse(localStorage.getItem("habitData")) || {};
  } catch {
    habitData = {};
  }

  // Backward compatibility upgrade
  habitsList = habitsList.map(h => {
    if (typeof h === "string") {
      return {
        id: "h_" + Math.random().toString(36).slice(2),
        name: h,
        weight: 1
      };
    }
    return {
      id: h.id || "h_" + Math.random().toString(36).slice(2),
      name: h.name || "Habit",
      weight: typeof h.weight === "number" ? h.weight : 1
    };
  });

  saveHabits();
}

function saveHabits() {
  localStorage.setItem("habitsList", JSON.stringify(habitsList));
  localStorage.setItem("habitData", JSON.stringify(habitData));
}

// ---------- Core Logic ----------
function setHabitValue(habitId, value) {
  const key = getDayKey();
  if (!habitData[key]) habitData[key] = {};

  habitData[key][habitId] = Math.max(0, Math.min(100, value));
  saveHabits();
  renderHabitGrid();
  if (typeof renderLifeScore === "function") renderLifeScore();
}

function toggleHabit(habitId) {
  const key = getDayKey();
  if (!habitData[key]) habitData[key] = {};

  const current = habitData[key][habitId] || 0;
  habitData[key][habitId] = current > 0 ? 0 : 100;

  saveHabits();
  renderHabitGrid();
  if (typeof renderLifeScore === "function") renderLifeScore();
}

// ---------- Metrics ----------
function getDayCompletion(dayKey = getDayKey()) {
  const day = habitData[dayKey] || {};
  if (!habitsList.length) return { percent: 0, done: 0, total: 0 };

  let totalWeight = 0;
  let score = 0;

  habitsList.forEach(h => {
    const v = day[h.id] ?? 0;
    totalWeight += h.weight;
    score += (v / 100) * h.weight;
  });

  const percent = totalWeight ? Math.round((score / totalWeight) * 100) : 0;

  const done = habitsList.filter(h => (day[h.id] ?? 0) >= 100).length;
  const total = habitsList.length;

  return { percent, done, total };
}

// ---------- Streak Intelligence ----------
function getHabitStreak() {
  let streak = 0;
  let strength = 0;

  const days = getPastDays(30).reverse();

  for (const d of days) {
    const key = getDayKey(d);
    const { percent } = getDayCompletion(key);

    if (percent >= 80) {
      streak++;
      strength += percent;
    } else {
      break;
    }
  }

  const avgStrength = streak ? Math.round(strength / streak) : 0;

  return {
    streak,
    strength: avgStrength
  };
}

// ---------- Render Habit Grid ----------
function renderHabitGrid() {
  const container = document.getElementById("habitGrid");
  if (!container) return;

  const days = getPastDays(7);
  const todayKey = getDayKey();

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <div style="font-weight:800;">Habits</div>
      <button onclick="openHabitManager()" style="padding:6px 10px; border-radius:8px;">⚙️ Manage</button>
    </div>

    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left;">Habit</th>
          ${days.map(d => {
            const k = getDayKey(d);
            return `<th>${d.toLocaleDateString("en-US", { weekday: "short" })}</th>`;
          }).join("")}
        </tr>
      </thead>
      <tbody>
        ${habitsList.map(h => `
          <tr>
            <td 
              onclick="openHabitChart('${h.id}')"
              style="cursor:pointer; font-weight:700;">
              ${h.name}
            </td>

            ${days.map(d => {
              const k = getDayKey(d);
              const v = habitData[k]?.[h.id] ?? 0;
              const isToday = k === todayKey;

              return `
                <td onclick="toggleHabit('${h.id}')"
                    style="
                      text-align:center;
                      cursor:pointer;
                      background:${v >= 100 ? 'rgba(34,197,94,0.3)' : v > 0 ? 'rgba(59,130,246,0.25)' : 'transparent'};
                      border:${isToday ? '2px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)'};
                    ">
                  ${v ? v + "%" : ""}
                </td>
              `;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

// ---------- Habit Manager ----------
function openHabitManager() {
  const html = `
    <h2>Manage Habits</h2>

    <div style="margin-bottom:12px;">
      <input id="newHabitName" placeholder="New habit name" style="padding:8px; width:70%;" />
      <button onclick="addHabit()">Add</button>
    </div>

    ${habitsList.map(h => `
      <div style="display:flex; justify-content:space-between; margin:6px 0;">
        <div>${h.name} (weight: ${h.weight})</div>
        <button onclick="deleteHabit('${h.id}')">❌</button>
      </div>
    `).join("")}
  `;

  openModal(html);
}

function addHabit() {
  const input = document.getElementById("newHabitName");
  if (!input.value.trim()) return;

  habitsList.push({
    id: "h_" + Date.now(),
    name: input.value.trim(),
    weight: 1
  });

  saveHabits();
  closeModal();
  renderHabitGrid();
}

function deleteHabit(id) {
  habitsList = habitsList.filter(h => h.id !== id);

  Object.keys(habitData).forEach(day => {
    delete habitData[day][id];
  });

  saveHabits();
  renderHabitGrid();
  openHabitManager();
}

// ---------- Habit Chart ----------
function openHabitChart(habitId) {
  const habit = habitsList.find(h => h.id === habitId);
  if (!habit) return;

  const days = getPastDays(30);
  const labels = days.map(d => d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  const values = days.map(d => habitData[getDayKey(d)]?.[habitId] ?? 0);

  openModal(`
    <h2>${habit.name} — History</h2>
    <canvas id="habitChartCanvas" height="300"></canvas>
  `);

  setTimeout(() => {
    const ctx = document.getElementById("habitChartCanvas").getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Completion %",
          data: values,
          tension: 0.35,
          borderWidth: 3
        }]
      },
      options: {
        scales: {
          y: { min: 0, max: 100 }
        }
      }
    });
  }, 0);
}

// ---------- Boot ----------
(function bootHabits() {
  loadHabits();
  renderHabitGrid();
})();
