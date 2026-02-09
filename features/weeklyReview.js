// ============================================
// WEEKLY REVIEW MODULE - Automated Summary & Comparison (SYNCED + FIXED)
// File: features/weeklyReview.js
//
// Fixes / upgrades:
// ✅ Uses LOCAL date keys (YYYY-MM-DD) everywhere (no UTC drift)
// ✅ Pulls Habits + Mood + Tasks + Weekly Planner into one synced score
// ✅ Safe calls (won’t crash if a module isn’t loaded)
// ✅ Exports window.openWeeklyReview so buttons / dashboard can call it
// ✅ Safe openModal fallback (won’t hard-crash if modal system missing)
// ============================================

// ---------- DATE HELPERS (LOCAL SAFE) ----------
function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekDates(offset = 0) {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(today.getDate() - day - offset * 7);

  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    week.push(getLocalDateKey(d));
  }
  return week;
}

// ---------- SAFE HELPERS ----------
function safeGetDayCompletion(dateStr) {
  try {
    if (typeof window.getDayCompletion === "function") {
      return window.getDayCompletion(dateStr);
    }
  } catch {}
  return { percent: 0, done: 0, total: 0 };
}

function safeGetPlannerCompletion(dateStr) {
  try {
    if (typeof window.getPlannerCompletionForDay === "function") {
      return window.getPlannerCompletionForDay(dateStr);
    }
  } catch {}
  return { percent: 0, done: 0, total: 0 };
}

function safeOpenModal(html) {
  try {
    if (typeof window.openModal === "function") return window.openModal(html);
  } catch {}
  // fallback
  alert("Modal system not found.");
}

// ---------- CORE SCORE ----------
function calculateWeekScore(weekDates) {
  const moodData = (() => {
    try {
      return JSON.parse(localStorage.getItem("moodData") || "{}");
    } catch {
      return {};
    }
  })();

  const todoHistory = (() => {
    try {
      return JSON.parse(localStorage.getItem("todoHistory") || "{}");
    } catch {
      return {};
    }
  })();

  const scores = weekDates.map((date) => {
    // Habits
    const habitPct = safeGetDayCompletion(date).percent || 0;

    // Mood (Energy 1–10 -> 0–100)
    const energy = Number(moodData?.[date]?.energy || 0);
    const energyPct = Math.max(0, Math.min(100, (energy / 10) * 100));

    // Tasks
    const taskPct = Number(todoHistory?.[date]?.percent || 0);

    // Planner
    const plannerPct = safeGetPlannerCompletion(date).percent || 0;

    // Weighted score (total = 100%)
    return (
      habitPct * 0.35 +
      energyPct * 0.2 +
      taskPct * 0.2 +
      plannerPct * 0.25
    );
  });

  const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  return Math.round(avg);
}

// ---------- WINS ----------
function getWeekWins(weekDates) {
  const wins = [];

  const moodData = (() => {
    try {
      return JSON.parse(localStorage.getItem("moodData") || "{}");
    } catch {
      return {};
    }
  })();

  const todoHistory = (() => {
    try {
      return JSON.parse(localStorage.getItem("todoHistory") || "{}");
    } catch {
      return {};
    }
  })();

  // Strong habit days
  const strongDays = weekDates.filter((d) => safeGetDayCompletion(d).percent >= 80).length;
  if (strongDays >= 4) wins.push(`${strongDays} days at 80%+ habits`);

  // High energy days
  const highEnergy = weekDates.filter((d) => (Number(moodData?.[d]?.energy || 0) >= 7)).length;
  if (highEnergy >= 4) wins.push(`${highEnergy} high-energy days`);

  // Tasks avg
  const avgTasks = Math.round(
    weekDates.reduce((s, d) => s + Number(todoHistory?.[d]?.percent || 0), 0) / 7
  );
  if (avgTasks >= 70) wins.push(`${avgTasks}% task completion`);

  // Planner strong days
  const plannerStrong = weekDates.filter((d) => safeGetPlannerCompletion(d).percent >= 70).length;
  if (plannerStrong >= 4) wins.push(`${plannerStrong} strong planner days`);

  // Habit streak (if your habits module exposes it)
  const streak =
    typeof window.calculateCurrentStreak === "function"
      ? window.calculateCurrentStreak()
      : 0;

  if (streak >= 7) wins.push(`${streak}-day streak active`);

  return wins.length ? wins : ["Keep building momentum"];
}

// ---------- CHALLENGES ----------
function getWeekChallenges(weekDates) {
  const challenges = [];

  const moodData = (() => {
    try {
      return JSON.parse(localStorage.getItem("moodData") || "{}");
    } catch {
      return {};
    }
  })();

  // Low habits
  const lowHabitDays = weekDates.filter((d) => safeGetDayCompletion(d).percent < 50).length;
  if (lowHabitDays >= 2) challenges.push(`${lowHabitDays} low habit days`);

  // Low energy
  const lowEnergy = weekDates.filter((d) => (Number(moodData?.[d]?.energy || 0) <= 4)).length;
  if (lowEnergy >= 2) challenges.push(`${lowEnergy} low-energy days`);

  // Planner gaps
  const lowPlanner = weekDates.filter((d) => safeGetPlannerCompletion(d).percent < 40).length;
  if (lowPlanner >= 2) challenges.push(`${lowPlanner} low-planner days`);

  // Weakest habit (if habits exist)
  const habits = (() => {
    try {
      return JSON.parse(localStorage.getItem("habits") || "[]");
    } catch {
      return [];
    }
  })();

  const completions = (() => {
    try {
      return JSON.parse(localStorage.getItem("habitCompletions") || "{}");
    } catch {
      return {};
    }
  })();

  if (Array.isArray(habits) && habits.length) {
    const weak = habits
      .map((h) => {
        const done = weekDates.filter((d) => !!completions?.[d]?.[h.id]).length;
        return { name: h.name, done };
      })
      .filter((h) => h.done < 4)
      .sort((a, b) => a.done - b.done)[0];

    if (weak) challenges.push(`${weak.name}: ${weak.done}/7 days`);
  }

  return challenges.length ? challenges : ["No major challenges"];
}

// ---------- FOCUS ----------
function generateWeeklyFocus(thisScore, lastScore) {
  const focus = [];

  if (thisScore < lastScore) focus.push("Rebuild consistency first");
  if (thisScore < 70) focus.push("Lock in top 3 habits daily");

  const moodData = (() => {
    try {
      return JSON.parse(localStorage.getItem("moodData") || "{}");
    } catch {
      return {};
    }
  })();

  const week = getWeekDates(0);
  const avgEnergy = week.reduce((s, d) => s + Number(moodData?.[d]?.energy || 0), 0) / 7;

  if (avgEnergy < 6) focus.push("Prioritize sleep & recovery");
  if (!focus.length) focus.push("Push for 7/7 elite days");

  return focus;
}

// ---------- MOMENTUM ----------
function getMomentumIndicator(thisScore, lastScore) {
  const diff = thisScore - lastScore;

  if (diff > 10) return { icon: "🚀", text: "Accelerating", color: "#22C55E" };
  if (diff > 0) return { icon: "📈", text: "Building", color: "#A78BFA" };
  if (diff > -10) return { icon: "➡️", text: "Stable", color: "#9CA3AF" };

  return { icon: "📉", text: "Declining", color: "#EF4444" };
}

function formatDiffText(thisScore, lastScore) {
  const diff = thisScore - lastScore;
  const abs = Math.abs(diff);
  if (diff > 0) return `${abs} pts up`;
  if (diff < 0) return `${abs} pts down`;
  return `${abs} pts flat`;
}

// ---------- UI ----------
function openWeeklyReview() {
  const thisWeek = getWeekDates(0);
  const lastWeek = getWeekDates(1);

  const thisScore = calculateWeekScore(thisWeek);
  const lastScore = calculateWeekScore(lastWeek);

  const wins = getWeekWins(thisWeek);
  const challenges = getWeekChallenges(thisWeek);
  const focus = generateWeeklyFocus(thisScore, lastScore);
  const momentum = getMomentumIndicator(thisScore, lastScore);

  const html = `
    <h2>📋 Weekly Review</h2>

    <div style="color:#9CA3AF;margin-bottom:20px;">
      ${thisWeek[0]} → ${thisWeek[6]}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
      <div style="padding:18px;border-radius:14px;border:1px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.06);text-align:center;">
        <div style="font-size:2.4rem;font-weight:900;color:#A78BFA;">${thisScore}</div>
        <div style="color:#9CA3AF;">This Week</div>
      </div>

      <div style="padding:18px;border-radius:14px;border-radius:14px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);text-align:center;">
        <div style="font-size:2.4rem;font-weight:900;color:#6B7280;">${lastScore}</div>
        <div style="color:#9CA3AF;">Last Week</div>
      </div>
    </div>

    <div style="padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.05);display:flex;gap:12px;justify-content:center;margin-bottom:20px;">
      <div style="font-size:2rem;">${momentum.icon}</div>
      <div>
        <div style="font-weight:900;color:${momentum.color};font-size:1.1rem;">
          ${momentum.text}
        </div>
        <div style="color:#9CA3AF;font-size:0.9rem;">
          ${formatDiffText(thisScore, lastScore)}
        </div>
      </div>
    </div>

    <div style="margin-bottom:20px;">
      <div style="font-weight:800;margin-bottom:8px;">🏆 Wins</div>
      <div style="padding:14px;border-radius:12px;border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.08);">
        ${wins.map(w => `<div>✓ ${w}</div>`).join("")}
      </div>
    </div>

    <div style="margin-bottom:20px;">
      <div style="font-weight:800;margin-bottom:8px;">⚠️ Improve</div>
      <div style="padding:14px;border-radius:12px;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.08);">
        ${challenges.map(c => `<div>› ${c}</div>`).join("")}
      </div>
    </div>

    <div>
      <div style="font-weight:800;margin-bottom:8px;">🎯 Focus</div>
      <div style="padding:14px;border-radius:12px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.08);">
        ${focus.map(f => `<div>→ ${f}</div>`).join("")}
      </div>
    </div>
  `;

  safeOpenModal(html);
}

// Export
window.openWeeklyReview = openWeeklyReview;

console.log("Weekly Review module loaded (synced + local dates)");
