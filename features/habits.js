// ============================================
// HABITS MODULE (Weekly Grid + Click Toggle + Row Glow)
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

// ---------- Toggle ----------
function toggleHabit(habitId, dayKey) {
  ensureDay(dayKey);

  const current = !!habitData[dayKey][habitId];
  habitData[dayKey][habitId] = !current;

  saveHabitData();

  if (typeof renderHabitGrid === "function") renderHabitGrid();
  if (typeof updateStreakDisplay === "function") updateStreakDisplay();
}

// ---------- Completion (used by mood correlation + charts) ----------
function getDayCompletion(dayKey) {
  const normalized = normalizeHabitsList(habitsList);
  const total = normalized.length;

  ensureDay(dayKey);
  const done = normalized.filter(h => !!habitData[dayKey][h.id]).length;

  const percent = total ? Math.round((done / total) * 100) : 0;
  return { done, total, percent };
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

  const stats = getDayCompletion(todayKey);
  html += `
    <div style="margin-top:14px; text-align:center; color:#9ca3af;">
      Today's Progress: <span style="color:#ff4d4d; font-weight:900;">${stats.percent}%</span> (Need 80% for streak)
    </div>
  `;

  grid.innerHTML = html;
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
