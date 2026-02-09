// ============================================
// WEEKLY REVIEW MODULE - Automated Summary & Comparison (SYNCED + FULLY INTEGRATED)
// Includes: Habits + Mood/Energy + Tasks + Planner + Workouts + Books
// Uses LOCAL YYYY-MM-DD keys everywhere (no UTC drift)
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

// ---------- SAFE MODULE BRIDGES ----------
function safeGetDayCompletion(dateStr) {
  try {
    if (typeof getDayCompletion === "function") return getDayCompletion(dateStr);
  } catch {}
  return { percent: 0, done: 0, total: 0 };
}

function safeGetPlannerCompletion(dateStr) {
  try {
    if (typeof getPlannerCompletionForDay === "function") return getPlannerCompletionForDay(dateStr);
  } catch {}
  return { percent: 0, done: 0, total: 0 };
}

// ---------- WORKOUTS (KINGS PROTOCOL v2) ----------
function loadKPWorkouts() {
  try {
    const raw = JSON.parse(localStorage.getItem("kp_workouts_v2") || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function getWorkoutStatsForDay(dateStr) {
  // Counts sets + volume on that date (YYYY-MM-DD)
  const workouts = loadKPWorkouts();
  let sets = 0;
  let volume = 0;

  workouts.forEach(w => {
    (w?.exercises || []).forEach(ex => {
      (ex?.sets || []).forEach(s => {
        const d = String(s?.date || "").split("T")[0];
        if (d === dateStr) {
          const wt = Number(s?.weight || 0);
          const rp = Number(s?.reps || 0);
          if (wt > 0 && rp > 0) {
            sets += 1;
            volume += wt * rp;
          }
        }
      });
    });
  });

  return { sets, volume };
}

function getWorkoutCompletionForDay(dateStr) {
  // Convert sets into a % using a reasonable daily target
  // Target: 12 sets/day = 100% (caps at 100)
  const targetSets = 12;
  const s = getWorkoutStatsForDay(dateStr).sets;
  const percent = targetSets ? Math.min(100, Math.round((s / targetSets) * 100)) : 0;
  return { percent, sets: s, target: targetSets };
}

// ---------- BOOKS (best-effort, supports multiple storage styles) ----------
function loadReadingDataAnyShape() {
  // We try a few common keys without breaking anything.
  // You can later standardize to one key; this is safe fallback.
  const keys = ["booksLog", "readingLog", "readingSessions", "bookSessions", "books", "kp_books_v1"];
  for (const k of keys) {
    try {
      const raw = JSON.parse(localStorage.getItem(k) || "null");
      if (raw) return { key: k, data: raw };
    } catch {}
  }
  return { key: "", data: null };
}

function getReadingMinutesForDay(dateStr) {
  // Attempts to interpret data formats:
  // A) object keyed by YYYY-MM-DD: { "2026-02-09": { minutes: 20 } }
  // B) array of sessions: [{ date:"YYYY-MM-DD", minutes: 20 }]
  // C) array of books with logs: [{ logs:[{date, minutes}]}]
  const { data } = loadReadingDataAnyShape();
  if (!data) return 0;

  // A) direct map
  if (!Array.isArray(data) && typeof data === "object") {
    const v = data[dateStr];
    if (typeof v === "number") return Math.max(0, Math.round(v));
    if (v && typeof v === "object") {
      if (typeof v.minutes === "number") return Math.max(0, Math.round(v.minutes));
      if (typeof v.time === "number") return Math.max(0, Math.round(v.time));
    }
  }

  // B) sessions array
  if (Array.isArray(data)) {
    // if it’s a plain sessions list
    const direct = data.filter(x => String(x?.date || "").split("T")[0] === dateStr);
    if (direct.length) {
      return Math.max(
        0,
        Math.round(direct.reduce((s, x) => s + Number(x?.minutes || x?.time || 0), 0))
      );
    }

    // C) books list with logs
    let minutes = 0;
    data.forEach(book => {
      const logs = book?.logs || book?.sessions || book?.history;
      if (!Array.isArray(logs)) return;
      logs.forEach(l => {
        const d = String(l?.date || "").split("T")[0];
        if (d === dateStr) minutes += Number(l?.minutes || l?.time || 0);
      });
    });
    return Math.max(0, Math.round(minutes));
  }

  return 0;
}

function getReadingCompletionForDay(dateStr) {
  // Target: 20 minutes/day = 100%
  const targetMin = 20;
  const mins = getReadingMinutesForDay(dateStr);
  const percent = targetMin ? Math.min(100, Math.round((mins / targetMin) * 100)) : 0;
  return { percent, minutes: mins, target: targetMin };
}

// ---------- CORE SCORE ----------
function calculateWeekScore(weekDates) {
  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
  const todoHistory = JSON.parse(localStorage.getItem("todoHistory") || "{}");

  const scores = weekDates.map(date => {
    // Habits
    const habitPct = safeGetDayCompletion(date).percent;

    // Mood / Energy
    const energy = moodData[date]?.energy || 0;
    const energyPct = (energy / 10) * 100;

    // Tasks (history only)
    const taskPct = todoHistory[date]?.percent || 0;

    // Planner
    const plannerPct = safeGetPlannerCompletion(date).percent;

    // Workouts
    const workoutPct = getWorkoutCompletionForDay(date).percent;

    // Books
    const readPct = getReadingCompletionForDay(date).percent;

    // Weighted score (balanced, king protocol)
    return (
      habitPct * 0.25 +
      energyPct * 0.15 +
      taskPct * 0.15 +
      plannerPct * 0.20 +
      workoutPct * 0.15 +
      readPct * 0.10
    );
  });

  const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  return Math.round(avg);
}

// ---------- WINS ----------
function getWeekWins(weekDates) {
  const wins = [];

  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
  const todoHistory = JSON.parse(localStorage.getItem("todoHistory") || "{}");

  // Habits
  const strongHabitDays = weekDates.filter(d => safeGetDayCompletion(d).percent >= 80).length;
  if (strongHabitDays >= 4) wins.push(`${strongHabitDays} days at 80%+ habits`);

  // Energy
  const highEnergyDays = weekDates.filter(d => (moodData[d]?.energy || 0) >= 7).length;
  if (highEnergyDays >= 4) wins.push(`${highEnergyDays} high-energy days`);

  // Tasks
  const avgTasks = Math.round(weekDates.reduce((s, d) => s + (todoHistory[d]?.percent || 0), 0) / 7);
  if (avgTasks >= 70) wins.push(`${avgTasks}% task completion`);

  // Planner
  const strongPlannerDays = weekDates.filter(d => safeGetPlannerCompletion(d).percent >= 70).length;
  if (strongPlannerDays >= 4) wins.push(`${strongPlannerDays} strong planner days`);

  // Workouts
  const trainingDays = weekDates.filter(d => getWorkoutStatsForDay(d).sets > 0).length;
  if (trainingDays >= 3) wins.push(`${trainingDays} training days logged`);

  const totalSets = weekDates.reduce((s, d) => s + getWorkoutStatsForDay(d).sets, 0);
  if (totalSets >= 40) wins.push(`${totalSets} total sets logged`);

  // Books
  const readingDays = weekDates.filter(d => getReadingMinutesForDay(d) > 0).length;
  if (readingDays >= 4) wins.push(`${readingDays} reading days`);

  const totalMin = weekDates.reduce((s, d) => s + getReadingMinutesForDay(d), 0);
  if (totalMin >= 120) wins.push(`${totalMin} total reading minutes`);

  // Streak (habits system)
  const streak = typeof calculateCurrentStreak === "function" ? calculateCurrentStreak() : 0;
  if (streak >= 7) wins.push(`${streak}-day streak active`);

  return wins.length ? wins : ["Keep building momentum"];
}

// ---------- CHALLENGES ----------
function getWeekChallenges(weekDates) {
  const challenges = [];

  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");

  // Low habits
  const lowHabitDays = weekDates.filter(d => safeGetDayCompletion(d).percent < 50).length;
  if (lowHabitDays >= 2) challenges.push(`${lowHabitDays} low habit days`);

  // Low energy
  const lowEnergyDays = weekDates.filter(d => (moodData[d]?.energy || 0) <= 4).length;
  if (lowEnergyDays >= 2) challenges.push(`${lowEnergyDays} low-energy days`);

  // Planner gaps
  const lowPlannerDays = weekDates.filter(d => safeGetPlannerCompletion(d).percent < 40).length;
  if (lowPlannerDays >= 2) challenges.push(`${lowPlannerDays} low-planner days`);

  // Workouts gaps
  const trainingDays = weekDates.filter(d => getWorkoutStatsForDay(d).sets > 0).length;
  if (trainingDays <= 1) challenges.push(`Training days low (${trainingDays}/7)`);

  // Books gaps
  const readingDays = weekDates.filter(d => getReadingMinutesForDay(d) > 0).length;
  if (readingDays <= 2) challenges.push(`Reading days low (${readingDays}/7)`);

  // Weak habit (worst performer)
  const habits = JSON.parse(localStorage.getItem("habits") || "[]");
  const completions = JSON.parse(localStorage.getItem("habitCompletions") || "{}");

  if (habits.length) {
    const weak = habits
      .map(h => {
        const done = weekDates.filter(d => completions[d]?.[h.id]).length;
        return { name: h.name, done };
      })
      .filter(h => h.done < 4)
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

  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
  const week = getWeekDates(0);
  const avgEnergy = week.reduce((s, d) => s + (moodData[d]?.energy || 0), 0) / 7;

  if (avgEnergy < 6) focus.push("Prioritize sleep & recovery");

  const trainingDays = week.filter(d => getWorkoutStatsForDay(d).sets > 0).length;
  if (trainingDays < 3) focus.push("Train at least 3 days (log sets)");

  const readingMin = week.reduce((s, d) => s + getReadingMinutesForDay(d), 0);
  if (readingMin < 120) focus.push("Read 20 minutes daily");

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

      <div style="padding:18px;border-radius:14px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);text-align:center;">
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
          ${Math.abs(thisScore - lastScore)} pts
        </div>
      </div>
    </div>

    <div style="margin-bottom:20px;">
      <div style="font-weight:800;margin-bottom:8px;">🏆 Wins</div>
      <div style="padding:14px;border-radius:12px;border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.08);">
        ${wins.map(w => `<div style="margin-bottom:6px;">✓ ${w}</div>`).join("")}
      </div>
    </div>

    <div style="margin-bottom:20px;">
      <div style="font-weight:800;margin-bottom:8px;">⚠️ Improve</div>
      <div style="padding:14px;border-radius:12px;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.08);">
        ${challenges.map(c => `<div style="margin-bottom:6px;">› ${c}</div>`).join("")}
      </div>
    </div>

    <div>
      <div style="font-weight:800;margin-bottom:8px;">🎯 Focus</div>
      <div style="padding:14px;border-radius:12px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.08);">
        ${focus.map(f => `<div style="margin-bottom:6px;">→ ${f}</div>`).join("")}
      </div>
    </div>
  `;

  openModal(html);
}

console.log("Weekly Review module loaded (full integrated)");
