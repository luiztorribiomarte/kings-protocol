// ============================================
// HABITS MODULE (Weekly Grid + Click Toggle + Row Glow)
// Fixes added:
// 1) Today's Progress turns GREEN when >= 80%
// 2) Updates stat cards automatically:
//    - Days at 80%+ (this week)
//    - Weekly Completion (avg this week)
//    - Current Streak (consecutive 80%+ days)
//    - Best Streak (saved)
// 3) Remembers previous days via localStorage (already)
// 4) Updates on every click toggle + on render
// ============================================

let habitData = {};   // { "YYYY-MM-DD": { "<habitId>": true/false } }
let habitsList = [];  // supports array of strings OR array of {id,name,emoji}

// ---------- Helpers ----------
function getLocalDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDayKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getWeekKeys(days = 7) {
  // NOTE: This matches your grid: last 7 days ending today
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(getLocalDayKey(d));
  }
  return out;
}

function normalizeHabitsList(list) {
  if (!Array.isArray(list)) return [];

  return list.map((h) => {
    if (typeof h === "string") {
      const id = h.toLowerCase().replace(/\s+/g, "_").replace(/[^\w_]/g, "");
      return { id, label: h };
    }
    if (h && typeof h === "object") {
      const id =
        h.id ||
        (h.name || h.label || "habit")
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^\w_]/g, "");
      const label = h.emoji
        ? `${h.emoji} ${h.name || h.label || ""}`.trim()
        : (h.name || h.label || id);
      return { id, label };
    }
    return { id: "habit", label: "Habit" };
  });
}

function ensureDay(dayKey) {
  if (!habitData[dayKey] || typeof habitData[dayKey] !== "object") {
    habitData[dayKey] = {};
  }
}

function saveHabitData() {
  localStorage.setItem("habitData", JSON.stringify(habitData));
}

function saveHabitsList() {
  localStorage.setItem("habitsList", JSON.stringify(habitsList));
}

// ---------- Init ----------
function initHabitData() {
  const saved = localStorage.getItem("habitData");
  if (saved) {
    try {
      habitData = JSON.parse(saved) || {};
    } catch {
      habitData = {};
    }
  } else {
    habitData = {};
  }
}

function initHabitsList() {
  const saved = localStorage.getItem("habitsList");
  if (saved) {
    try {
      habitsList = JSON.parse(saved) || [];
    } catch {
      habitsList = [];
    }
  }

  if (!Array.isArray(habitsList) || habitsList.length === 0) {
    habitsList = [
      { id: "wake_7am", name: "Wake Up At 7 AM", emoji: "⏰" },
      { id: "morning_sun", name: "Morning Sunlight", emoji: "☀️" },
      { id: "skincare", name: "Skincare", emoji: "🧴" },
      { id: "meditation", name: "Meditation", emoji: "🧘" },
      { id: "journal_reflect", name: "Journal/Reflect", emoji: "📝" },
      { id: "workout", name: "Work Out", emoji: "💪" },
      { id: "read_10", name: "Read 10 Pages", emoji: "📚" },
      { id: "youtube_2hrs", name: "YouTube Work (2hrs)", emoji: "🎬" },
      { id: "no_porn", name: "No Porn", emoji: "🚫" },
      { id: "no_weed", name: "No Weed", emoji: "🌿" },
      { id: "mobility", name: "Nightly Mobility", emoji: "🧘" }
    ];
    saveHabitsList();
  }
}

// ---------- Completion ----------
function getDayCompletion(dayKey) {
  const normalized = normalizeHabitsList(habitsList);
  const total = normalized.length;

  ensureDay(dayKey);
  const done = normalized.filter(h => !!habitData[dayKey][h.id]).length;

  const percent = total ? Math.round((done / total) * 100) : 0;
  return { done, total, percent };
}

// ---------- Streak helpers (80%+ days) ----------
function getCurrentStreakFromToday() {
  const threshold = 80;
  let streak = 0;

  // Walk backwards day by day until we find a day < threshold or no data
  const d = new Date();
  for (let i = 0; i < 3650; i++) { // safety cap ~10 years
    const key = getLocalDayKey(d);
    const stats = getDayCompletion(key);

    // If there are no habits configured, streak is 0
    if (!stats.total) break;

    if (stats.percent >= threshold) {
      streak++;
      d.setDate(d.getDate() - 1);
      continue;
    }

    // stop streak as soon as one day breaks it
    break;
  }

  return streak;
}

function getBestStreak() {
  const v = parseInt(localStorage.getItem("bestStreak") || "0", 10);
  return Number.isFinite(v) ? v : 0;
}

function setBestStreak(n) {
  localStorage.setItem("bestStreak", String(n));
}

// ---------- Weekly stats (based on the SAME 7-day window shown) ----------
function getWeekStats() {
  const threshold = 80;
  const weekKeys = getWeekKeys(7);

  // Ensure days exist so grid always has values
  weekKeys.forEach(k => ensureDay(k));

  const daily = weekKeys.map(k => ({ key: k, ...getDayCompletion(k) }));
  const daysAt80 = daily.filter(d => d.percent >= threshold).length;

  // Weekly completion: average of the 7 day percents
  const avg = daily.length
    ? Math.round(daily.reduce((sum, d) => sum + d.percent, 0) / daily.length)
    : 0;

  return { weekKeys, daily, daysAt80, weeklyCompletion: avg };
}

// ---------- Update header cards + streak UI ----------
function updateHabitHeaderStats() {
  const todayKey = getLocalDayKey(new Date());
  const today = getDayCompletion(todayKey);

  // Update today's progress color (in grid) is handled in renderHabitGrid
  // Here we update the stat cards on top

  const { daysAt80, weeklyCompletion } = getWeekStats();

  const daysAt80El = document.getElementById("daysAt80");
  const weeklyCompletionEl = document.getElementById("weeklyCompletion");
  const currentStreakEl = document.getElementById("currentStreak");

  if (daysAt80El) daysAt80El.textContent = `${daysAt80}/7`;
  if (weeklyCompletionEl) weeklyCompletionEl.textContent = `${weeklyCompletion}%`;

  // Streak
  const streak = getCurrentStreakFromToday();
  if (currentStreakEl) currentStreakEl.textContent = String(streak);

  // If you also use the big streak box:
  const streakNumberEl = document.getElementById("streakNumber");
  if (streakNumberEl) streakNumberEl.textContent = String(streak);

  // Best streak
  const bestEl = document.getElementById("bestStreak");
  const best = getBestStreak();
  const newBest = Math.max(best, streak);
  if (newBest !== best) setBestStreak(newBest);
  if (bestEl) bestEl.textContent = String(newBest);

  // Optional: if you have “milestones” UI
  if (typeof renderMilestones === "function") {
    try { renderMilestones(streak); } catch {}
  }

  // Keep today completion available to other modules if needed
  return today;
}

// ---------- Toggle ----------
function toggleHabit(habitId, dayKey) {
  ensureDay(dayKey);

  const current = !!habitData[dayKey][habitId];
  habitData[dayKey][habitId] = !current;

  saveHabitData();

  // Re-render + update stats every click
  if (typeof renderHabitGrid === "function") renderHabitGrid();
  updateHabitHeaderStats();

  // If something else depends on streak display, keep it
  if (typeof updateStreakDisplay === "function") {
    try { updateStreakDisplay(); } catch {}
  }

  // If Daily Brief exists, refresh it (optional, safe)
  if (typeof updateDailyBrief === "function") {
    try { updateDailyBrief(); } catch {}
  }
}

// ---------- Render ----------
function renderHabitGrid() {
  const grid = document.getElementById("habitGrid");
  if (!grid) return;

  const weekKeys = getWeekKeys(7);
  const weekDates = weekKeys.map(k => parseDayKey(k));
  const todayKey = getLocalDayKey(new Date());

  const normalizedHabits = normalizeHabitsList(habitsList);

  // ensure week data exists so cells never appear "missing"
  weekKeys.forEach(k => ensureDay(k));

  let html = `
    <div class="habit-grid-table" style="width:100%; overflow:auto;">
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding:14px 12px; font-weight:800; color:white;">Habit</th>
            ${weekDates.map((d, idx) => {
              const isToday = weekKeys[idx] === todayKey;
              const dow = d.toLocaleDateString("en-US", { weekday: "short" });
              const dayNum = d.getDate();
              return `
                <th style="text-align:center; padding:10px 8px; font-weight:800; color:white; white-space:nowrap;">
                  <div style="opacity:.9; font-size:.9rem;">${dow}</div>
                  <div style="opacity:${isToday ? "1" : ".85"}; font-size:1rem;">${dayNum}</div>
                </th>
              `;
            }).join("")}
          </tr>
        </thead>
        <tbody>
  `;

  normalizedHabits.forEach(h => {
    // ✅ Row completion glow: habit done for ALL 7 days
    const rowComplete = weekKeys.every(dayKey => !!habitData[dayKey][h.id]);

    html += `
      <tr class="habit-row ${rowComplete ? "row-complete" : ""}">
        <td style="padding:12px; color:white; font-weight:650; white-space:nowrap;">
          ${h.label}
        </td>

        ${weekKeys.map(dayKey => {
          const done = !!habitData[dayKey][h.id];

          // keep your current look (dot vs check)
          const symbol = done ? "✅" : "●";
          const symbolColor = done ? "#22c55e" : "rgba(255,255,255,0.55)";

          // classes for hover glow + today highlight
          const cls = [
            "habit-cell",
            done ? "completed" : "",
            dayKey === todayKey ? "today" : ""
          ].filter(Boolean).join(" ");

          return `
            <td
              class="${cls}"
              onclick="toggleHabit('${h.id}','${dayKey}')"
              style="text-align:center; padding:12px 8px; cursor:pointer; user-select:none;"
              title="Click to toggle"
            >
              <span style="
                display:inline-block;
                font-size:${done ? "1.05rem" : "0.85rem"};
                color:${symbolColor};
                line-height:1;
                filter:${done ? "drop-shadow(0 6px 10px rgba(0,0,0,.35))" : "none"};
              ">${symbol}</span>
            </td>
          `;
        }).join("")}
      </tr>
    `;
  });

  html += `</tbody></table></div>`;

  // Today's Progress under grid (NOW color changes)
  const stats = getDayCompletion(todayKey);
  const good = stats.percent >= 80;
  const pctColor = good ? "#22c55e" : "#ff4d4d";

  html += `
    <div style="margin-top:14px; text-align:center; color:#9ca3af;">
      Today's Progress: <span style="color:${pctColor}; font-weight:900;">${stats.percent}%</span> (Need 80% for streak)
    </div>
  `;

  grid.innerHTML = html;

  // Update the top stat cards after rendering
  updateHabitHeaderStats();
}

// ---------- Manage Habits (fallback) ----------
function openManageHabits() {
  if (typeof openModal !== "function") {
    alert("Modal system not found.");
    return;
  }

  const normalized = normalizeHabitsList(habitsList);

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div style="font-size:1.2rem; font-weight:900; color:white;">⚙️ Manage Habits</div>
    </div>

    <div style="color:#9ca3af; margin-bottom:12px;">
      (Optional) Edit later. Your grid is fixed + styled.
    </div>

    <div style="display:flex; flex-direction:column; gap:8px;">
      ${normalized.map(h => `
        <div style="padding:10px 12px; border-radius:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:white;">
          ${h.label}
        </div>
      `).join("")}
    </div>
  `;

  openModal(html);
}
