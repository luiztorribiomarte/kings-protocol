/* features/performance.js — KINGS PROTOCOL PERFORMANCE ENGINE */

(function () {
  "use strict";

  const WEIGHTS = {
    mood:    0.20,
    habits:  0.25,
    tasks:   0.20,
    workout: 0.20,
    reading: 0.15
  };

  function byId(id) { return document.getElementById(id); }
  function pad2(n)  { return String(n).padStart(2, "0"); }
  function toLocalISODate(d = new Date()) {
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }
  function clamp(n, min, max) {
    const x = Number(n);
    return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : min;
  }
  function safeParse(r, f) {
    try { return JSON.parse(r) ?? f; } catch { return f; }
  }

  // ── MOOD ──────────────────────────────────────────────────────────────────
  function getMoodScore(dayKey) {
    const m = (window.moodData && typeof window.moodData === "object")
      ? window.moodData
      : safeParse(localStorage.getItem("moodData"), {});
    const v = m?.[dayKey];
    if (!v) return null;
    if (typeof v === "object" && typeof v.energy === "number") return clamp(v.energy, 1, 10);
    if (typeof v === "number") return clamp(v, 1, 10);
    return null;
  }

  // ── HABITS ────────────────────────────────────────────────────────────────
  function getHabitsPercent(dayKey) {
    try {
      const habits      = safeParse(localStorage.getItem("habits"), []);
      const completions = safeParse(localStorage.getItem("habitCompletions"), {});
      if (!Array.isArray(habits) || !habits.length) {
        if (typeof window.getDayCompletion === "function") {
          const r = window.getDayCompletion(dayKey);
          if (r && typeof r.percent === "number") return clamp(r.percent, 0, 100);
        }
        return 0;
      }
      const done = habits.filter(h => completions?.[dayKey]?.[h.id]).length;
      return Math.round((done / habits.length) * 100);
    } catch { return 0; }
  }

  // ── TASKS ─────────────────────────────────────────────────────────────────
  function getTasksPercent(dayKey) {
    let best = 0;
    try {
      const plannerRaw = safeParse(localStorage.getItem("weeklyPlannerData"), {});
      for (const weekKey of Object.keys(plannerRaw)) {
        const dayData = plannerRaw[weekKey]?.days?.[dayKey];
        if (dayData && Array.isArray(dayData.tasks) && dayData.tasks.length) {
          const done = dayData.tasks.filter(x => x && x.done).length;
          const pct  = Math.round((done / dayData.tasks.length) * 100);
          if (pct > best) best = pct;
        }
      }
    } catch {}
    try {
      const h = safeParse(localStorage.getItem("todoHistory"), {});
      if (typeof h?.[dayKey]?.percent === "number" && h[dayKey].percent > best)
        best = h[dayKey].percent;
    } catch {}
    return best;
  }

  // ── WORKOUT ───────────────────────────────────────────────────────────────
  function workoutDone(dayKey) {
    const list = safeParse(localStorage.getItem("kp_workouts_v2"), []);
    if (!Array.isArray(list)) return false;
    for (const w of list) {
      if (w.status !== "completed") continue;
      for (const ex of w.exercises || []) {
        for (const s of ex.sets || []) {
          if (String(s?.date || "").split("T")[0] === dayKey) return true;
        }
      }
    }
    return false;
  }

  // ── READING — binary habit check ──────────────────────────────────────────
  // Finds any habit whose name contains "read" and checks if it's done that day.
  function readingDone(dayKey) {
    try {
      const habits      = safeParse(localStorage.getItem("habits"), []);
      const completions = safeParse(localStorage.getItem("habitCompletions"), {});
      const readHabit   = habits.find(h => h.name.toLowerCase().includes("read"));
      if (!readHabit) return false;
      return !!(completions?.[dayKey]?.[readHabit.id]);
    } catch { return false; }
  }

  // ── SCORE ─────────────────────────────────────────────────────────────────
  function computeDay(dayKey) {
    const moodRaw = getMoodScore(dayKey);
    const mood    = moodRaw === null ? 50 : clamp(moodRaw * 10, 0, 100);
    const habits  = getHabitsPercent(dayKey);
    const tasks   = getTasksPercent(dayKey);
    const workout = workoutDone(dayKey) ? 100 : 0;
    const reading = readingDone(dayKey) ? 100 : 0;  // binary: done = 100, not done = 0

    const score =
      mood    * WEIGHTS.mood    +
      habits  * WEIGHTS.habits  +
      tasks   * WEIGHTS.tasks   +
      workout * WEIGHTS.workout +
      reading * WEIGHTS.reading;

    return { date: dayKey, mood, habits, tasks, workout, reading, score: Math.round(score) };
  }

  // ── SERIES ────────────────────────────────────────────────────────────────
  function buildSeries(n) {
    const today = new Date();
    const keys  = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      keys.push(toLocalISODate(d));
    }
    const rows = keys.map(k => computeDay(k));
    return { keys, labels: keys.map(k => k.slice(5)), rows, scores: rows.map(r => r.score) };
  }

  function streak(rows) {
    let s = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].score >= 80) s++;
      else break;
    }
    return s;
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  let chart = null;

  function ensureUI() {
    if (byId("kpPerformanceSection")) return;
    const dash = byId("dashboardPage");
    if (!dash) return;

    const box = document.createElement("div");
    box.className = "habit-section";
    box.id = "kpPerformanceSection";
    box.innerHTML = `
      <div class="section-title">📈 Performance Engine</div>
      <div class="stats-grid" style="margin-top:10px;">
        <div class="stat-card"><div id="kpToday"  class="stat-value">--%</div><div class="stat-label">Today</div></div>
        <div class="stat-card"><div id="kpAvg"    class="stat-value">--%</div><div class="stat-label">7-day avg</div></div>
        <div class="stat-card"><div id="kpStreak" class="stat-value">--</div> <div class="stat-label">Streak</div></div>
      </div>
      <div style="height:260px;margin-top:10px;"><canvas id="kpChart"></canvas></div>
      <div id="kpDNA" style="margin-top:10px;"></div>
    `;
    dash.appendChild(box);
  }

  function draw() {
    ensureUI();

    const s   = buildSeries(7);
    const avg = Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length);
    const st  = streak(s.rows);

    const todayEl  = byId("kpToday");
    const avgEl    = byId("kpAvg");
    const streakEl = byId("kpStreak");
    if (todayEl)  todayEl.textContent  = s.rows.at(-1).score + "%";
    if (avgEl)    avgEl.textContent    = avg + "%";
    if (streakEl) streakEl.textContent = st;

    if (chart) { chart.destroy(); chart = null; }
    const canvas = byId("kpChart");
    if (window.Chart && canvas) {
      chart = new Chart(canvas, {
        type: "line",
        data: {
          labels: s.labels,
          datasets: [{ label: "Daily Score", data: s.scores, borderWidth: 3, tension: 0.3 }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
      });
    }

    const r    = s.rows.at(-1);
    const weak = [
      ["habits",  r.habits],
      ["tasks",   r.tasks],
      ["mood",    r.mood],
      ["workout", r.workout],
      ["reading", r.reading]
    ].sort((a, b) => a[1] - b[1])[0];

    const dnaEl = byId("kpDNA");
    if (dnaEl) {
      dnaEl.innerHTML = `
        <div class="stat-card">
          <div class="stat-label">Productivity DNA</div>
          <div style="margin-top:6px;">
            mood ${r.mood}% &nbsp;•&nbsp; habits ${r.habits}% &nbsp;•&nbsp;
            tasks ${r.tasks}% &nbsp;•&nbsp; workout ${r.workout ? "yes" : "no"}
            &nbsp;•&nbsp; reading ${r.reading ? "yes" : "no"}
          </div>
          <div style="margin-top:6px; font-weight:800;">Next lever: ${weak[0]}</div>
        </div>
      `;
    }
  }

  // ── PUBLIC ────────────────────────────────────────────────────────────────
  window.renderLifeScore           = draw;
  window.renderWeeklyGraph         = draw;
  window.renderDNAProfile          = draw;
  window.renderDashboardTrendChart = draw;

  function boot() {
    setTimeout(draw, 300);
    window.addEventListener("habitsUpdated", draw);
    window.addEventListener("moodUpdated",   draw);
    window.addEventListener("storage",       draw);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) draw(); });
    setInterval(draw, 8000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
