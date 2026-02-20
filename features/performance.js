/* features/performance.js
   KINGS PROTOCOL — PERFORMANCE ENGINE

   Fixes:
   - getMoodScore now correctly reads energy (number) from moodData, not the emoji mood field
   - Habits: reads from window.getDayCompletion with proper fallback
   - Chart dataset label fixed (was showing "undefined")
   - Workout detection kept intact
   - Reading detection kept intact
*/

(function () {
  "use strict";

  const WEIGHTS = {
    mood: 0.20,
    habits: 0.25,
    tasks: 0.20,
    workout: 0.20,
    reading: 0.15
  };

  const READING_GOAL_MINUTES = 20;

  function byId(id) {
    return document.getElementById(id);
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toLocalISODate(d = new Date()) {
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }

  function clamp(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.min(max, Math.max(min, x));
  }

  function safeParse(r, f) {
    try { return JSON.parse(r) ?? f; } catch { return f; }
  }

  // -----------------------------
  // MOOD — reads the energy field (1–10 number), not the emoji
  // -----------------------------
  function getMoodScore(dayKey) {
    // Prefer live in-memory moodData if available
    const m = (window.moodData && typeof window.moodData === "object")
      ? window.moodData
      : safeParse(localStorage.getItem("moodData"), {});

    const v = m?.[dayKey];
    if (!v) return null;

    // v is an object like { energy: 7, mood: "🙂" }
    if (typeof v === "object" && typeof v.energy === "number") {
      return clamp(v.energy, 1, 10);
    }

    // Legacy: v was stored directly as a number
    if (typeof v === "number") {
      return clamp(v, 1, 10);
    }

    return null;
  }

  // -----------------------------
  // HABITS — reads from getDayCompletion API (set by habits.js)
  // -----------------------------
  function getHabitsPercent(dayKey) {
    try {
      if (typeof window.getDayCompletion === "function") {
        const r = window.getDayCompletion(dayKey);
        if (r && typeof r.percent === "number") {
          return clamp(r.percent, 0, 100);
        }
      }
    } catch {}

    // Fallback: read raw storage directly
    try {
      const habits = safeParse(localStorage.getItem("habits"), []);
      const completions = safeParse(localStorage.getItem("habitCompletions"), {});
      if (!Array.isArray(habits) || !habits.length) return 0;
      const done = habits.filter(h => completions?.[dayKey]?.[h.id]).length;
      return Math.round((done / habits.length) * 100);
    } catch {}

    return 0;
  }

  // -----------------------------
  // TASKS
  // -----------------------------
  function getTasksPercent(dayKey) {
    let t = 0, p = 0;

    try {
      const h = window.todoHistory || safeParse(localStorage.getItem("todoHistory"), {});
      if (h?.[dayKey]?.percent) t = h[dayKey].percent;
    } catch {}

    try {
      if (window.getPlannerCompletionForDay) {
        p = window.getPlannerCompletionForDay(dayKey)?.percent || 0;
      }
    } catch {}

    // Also check weekly planner data (core.js format)
    try {
      const plannerRaw = safeParse(localStorage.getItem("weeklyPlannerData"), {});
      // Find the week that contains dayKey
      for (const weekKey of Object.keys(plannerRaw)) {
        const dayData = plannerRaw[weekKey]?.days?.[dayKey];
        if (dayData && Array.isArray(dayData.tasks) && dayData.tasks.length) {
          const done = dayData.tasks.filter(x => x && x.done).length;
          const pct = Math.round((done / dayData.tasks.length) * 100);
          p = Math.max(p, pct);
        }
      }
    } catch {}

    return Math.max(t, p);
  }

  // -----------------------------
  // WORKOUT
  // -----------------------------
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

  // -----------------------------
  // READING
  // -----------------------------
  function getReadingMinutes(dayKey) {
    const r = safeParse(localStorage.getItem("booksLog"), {});
    if (typeof r?.[dayKey] === "number") return r[dayKey];

    // Also check booksProgressHistory: sum pages read that day as a proxy (20 pages ≈ 20 min)
    try {
      const history = safeParse(localStorage.getItem("booksProgressHistory"), []);
      const t = Number(dayKey.replace(/-/g, ""));
      const dayMs = new Date(dayKey + "T00:00:00").getTime();
      let pages = 0;
      history.forEach(h => {
        if (Number(h.day) === dayMs) pages += Math.max(0, Number(h.delta || 0));
      });
      if (pages > 0) return pages; // treat pages as minutes for scoring
    } catch {}

    return 0;
  }

  // -----------------------------
  // SCORE
  // -----------------------------
  function computeDay(dayKey) {
    const moodRaw = getMoodScore(dayKey);
    // Convert 1–10 energy to 0–100 score. If no data, use 50 as neutral.
    const mood = moodRaw === null ? 50 : clamp(moodRaw * 10, 0, 100);

    const habits = getHabitsPercent(dayKey);
    const tasks = getTasksPercent(dayKey);
    const workout = workoutDone(dayKey) ? 100 : 0;
    const readMin = getReadingMinutes(dayKey);
    const reading = clamp((readMin / READING_GOAL_MINUTES) * 100, 0, 100);

    const score =
      mood * WEIGHTS.mood +
      habits * WEIGHTS.habits +
      tasks * WEIGHTS.tasks +
      workout * WEIGHTS.workout +
      reading * WEIGHTS.reading;

    return {
      date: dayKey,
      mood,
      habits,
      tasks,
      workout,
      reading,
      score: Math.round(score)
    };
  }

  // -----------------------------
  // SERIES
  // -----------------------------
  function buildSeries(n) {
    const out = [];
    const today = new Date();

    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      out.push(toLocalISODate(d));
    }

    const rows = out.map(k => computeDay(k));

    return {
      keys: out,
      labels: out.map(k => k.slice(5)),
      rows,
      scores: rows.map(r => r.score)
    };
  }

  function streak(rows) {
    let s = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].score >= 80) s++;
      else break;
    }
    return s;
  }

  // -----------------------------
  // UI
  // -----------------------------
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
      <div class="stat-card">
        <div id="kpToday" class="stat-value">--%</div>
        <div class="stat-label">Today</div>
      </div>

      <div class="stat-card">
        <div id="kpAvg" class="stat-value">--%</div>
        <div class="stat-label">7-day avg</div>
      </div>

      <div class="stat-card">
        <div id="kpStreak" class="stat-value">--</div>
        <div class="stat-label">Streak</div>
      </div>
    </div>

    <div style="height:260px;margin-top:10px;">
      <canvas id="kpChart"></canvas>
    </div>

    <div id="kpDNA" style="margin-top:10px;"></div>
    `;

    dash.appendChild(box);
  }

  function draw() {
    ensureUI();

    const s = buildSeries(7);
    const avg = Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length);
    const st = streak(s.rows);

    const todayEl = byId("kpToday");
    const avgEl = byId("kpAvg");
    const streakEl = byId("kpStreak");

    if (todayEl) todayEl.textContent = s.rows.at(-1).score + "%";
    if (avgEl) avgEl.textContent = avg + "%";
    if (streakEl) streakEl.textContent = st;

    if (chart) { chart.destroy(); chart = null; }

    const canvas = byId("kpChart");
    if (window.Chart && canvas) {
      chart = new Chart(canvas, {
        type: "line",
        data: {
          labels: s.labels,
          datasets: [{
            label: "Daily Score",
            data: s.scores,
            borderWidth: 3,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, max: 100 }
          }
        }
      });
    }

    const r = s.rows.at(-1);

    const weak = [
      ["habits", r.habits],
      ["tasks", r.tasks],
      ["mood", r.mood],
      ["workout", r.workout],
      ["reading", r.reading]
    ].sort((a, b) => a[1] - b[1])[0];

    const dnaEl = byId("kpDNA");
    if (dnaEl) {
      dnaEl.innerHTML = `
        <div class="stat-card">
          <div class="stat-label">Productivity DNA</div>
          <div style="margin-top:6px">
            mood ${r.mood}% • habits ${r.habits}% • tasks ${r.tasks}% • workout ${r.workout ? "yes" : "no"} • reading ${r.reading}%
          </div>
          <div style="margin-top:6px;font-weight:800">
            Next lever: ${weak[0]}
          </div>
        </div>
      `;
    }
  }

  // -----------------------------
  // PUBLIC
  // -----------------------------
  window.renderLifeScore = draw;
  window.renderWeeklyGraph = draw;
  window.renderDNAProfile = draw;
  window.renderDashboardTrendChart = draw;

  function boot() {
    // Small delay so habits.js has time to initialize first
    setTimeout(draw, 300);

    window.addEventListener("habitsUpdated", draw);
    window.addEventListener("moodUpdated", draw);
    window.addEventListener("storage", draw);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) draw();
    });

    setInterval(draw, 8000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
