/* features/performance.js
   KINGS PROTOCOL — PERFORMANCE ENGINE (RESTORE + UPGRADE)

   RESTORES (so core.js stops breaking):
   - window.renderLifeScore()
   - window.renderWeeklyGraph()
   - window.renderDNAProfile()
   - window.renderDashboardTrendChart()

   UPGRADE:
   - Real score computed from: Mood + Habits + Tasks/Planner + Workout + Reading
   - Workout counts ONLY if a workout is marked "completed" (Option A)
   - Auto-updates on habitsUpdated + storage + page focus
   - Injects UI if missing (no HTML hunting)

   SAFE:
   - Does NOT modify other modules
   - Uses only read access to existing storage + exported functions
*/

(function () {
  "use strict";

  // -----------------------------
  // Config (tweakable)
  // -----------------------------
  const WEIGHTS = {
    mood: 0.20,
    habits: 0.25,
    tasks: 0.20,
    workout: 0.20,
    reading: 0.15
  };

  const READING_GOAL_MINUTES = 20; // 20 min = 100%

  // Ranges supported by trend widget
  const DEFAULT_RANGE = "7"; // "7" | "30" | "all"

  // -----------------------------
  // Helpers
  // -----------------------------
  function byId(id) {
    return document.getElementById(id);
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toLocalISODate(d = new Date()) {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const da = pad2(d.getDate());
    return `${y}-${m}-${da}`;
  }

  function parseISO(dayKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dayKey || ""))) return new Date();
    const [y, m, d] = String(dayKey).split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  function clamp(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.min(max, Math.max(min, x));
  }

  function safeParse(raw, fallback) {
    try {
      const v = JSON.parse(raw);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function fmtShort(dayKey) {
    try {
      return parseISO(dayKey).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return dayKey;
    }
  }

  function ensureChartJS() {
    return typeof window.Chart !== "undefined";
  }

  // -----------------------------
  // Data sources (robust)
  // -----------------------------

  // Mood: tries multiple shapes safely:
  // - localStorage "moodData" object keyed by YYYY-MM-DD -> number OR { mood: number } OR { energy: number }
  // - localStorage "moods" array [{date:'YYYY-MM-DD', mood:7}]
  function getMoodScore(dayKey) {
    // Prefer global moodData if module exposes it
    const candidates = [];

    // global
    if (typeof window.moodData === "object" && window.moodData) candidates.push(window.moodData);

    // storage keys
    candidates.push(safeParse(localStorage.getItem("moodData"), null));
    candidates.push(safeParse(localStorage.getItem("moods"), null));
    candidates.push(safeParse(localStorage.getItem("kp_mood_v1"), null));

    for (const c of candidates) {
      if (!c) continue;

      // object keyed by date
      if (!Array.isArray(c) && typeof c === "object") {
        const v = c[dayKey];
        if (typeof v === "number") return clamp(v, 0, 10);
        if (v && typeof v === "object") {
          if (typeof v.mood === "number") return clamp(v.mood, 0, 10);
          if (typeof v.energy === "number") return clamp(v.energy, 0, 10);
          if (typeof v.value === "number") return clamp(v.value, 0, 10);
        }
      }

      // array entries
      if (Array.isArray(c)) {
        const found = c.find(x => x && (x.date === dayKey || x.day === dayKey));
        if (found) {
          if (typeof found.mood === "number") return clamp(found.mood, 0, 10);
          if (typeof found.energy === "number") return clamp(found.energy, 0, 10);
          if (typeof found.value === "number") return clamp(found.value, 0, 10);
        }
      }
    }

    return null; // unknown / not logged
  }

  // Habits: uses your stable exported function
  function getHabitsPercent(dayKey) {
    try {
      if (typeof window.getDayCompletion === "function") {
        const r = window.getDayCompletion(dayKey);
        const pct = Number(r?.percent ?? 0);
        return clamp(pct, 0, 100);
      }
    } catch {}
    return 0;
  }

  // Tasks/Planner:
  // - todoHistory[dayKey].percent if exists
  // - planner completion via getPlannerCompletionForDay(dayKey)
  // Combine: take the higher of the two (because you might use one system more than the other)
  function getTasksPercent(dayKey) {
    let todoPct = 0;
    let plannerPct = 0;

    try {
      const th = window.todoHistory || safeParse(localStorage.getItem("todoHistory"), {});
      if (th && th[dayKey] && typeof th[dayKey].percent === "number") {
        todoPct = clamp(th[dayKey].percent, 0, 100);
      }
    } catch {}

    try {
      if (typeof window.getPlannerCompletionForDay === "function") {
        const r = window.getPlannerCompletionForDay(dayKey);
        plannerPct = clamp(Number(r?.percent ?? 0), 0, 100);
      }
    } catch {}

    return Math.max(todoPct, plannerPct);
  }

  // Workouts (Option A):
  // Count ONLY if there is at least 1 set on that date belonging to a workout whose status === "completed".
  // Storage: kp_workouts_v2 (from your workout.js)
  function workoutCompletedOnDay(dayKey) {
    const list = safeParse(localStorage.getItem("kp_workouts_v2"), []);
    if (!Array.isArray(list) || !list.length) return false;

    for (const w of list) {
      if (!w || w.status !== "completed") continue;
      const exs = Array.isArray(w.exercises) ? w.exercises : [];
      for (const ex of exs) {
        const sets = Array.isArray(ex?.sets) ? ex.sets : [];
        for (const s of sets) {
          const d = String(s?.date || "").split("T")[0];
          if (d === dayKey) return true;
        }
      }
    }
    return false;
  }

  // Reading minutes:
  // Attempts common keys without breaking if you don't track it yet.
  function getReadingMinutes(dayKey) {
    const candidates = [
      safeParse(localStorage.getItem("readingLog"), null),
      safeParse(localStorage.getItem("readingHistory"), null),
      safeParse(localStorage.getItem("booksHistory"), null),
      safeParse(localStorage.getItem("booksLog"), null)
    ];

    for (const c of candidates) {
      if (!c) continue;

      // { "YYYY-MM-DD": minutes }
      if (!Array.isArray(c) && typeof c === "object") {
        const v = c[dayKey];
        if (typeof v === "number") return clamp(v, 0, 600);
        if (v && typeof v === "object") {
          if (typeof v.minutes === "number") return clamp(v.minutes, 0, 600);
          if (typeof v.min === "number") return clamp(v.min, 0, 600);
        }
      }

      // [{date, minutes}]
      if (Array.isArray(c)) {
        const found = c.find(x => x && (x.date === dayKey || x.day === dayKey));
        if (found) {
          if (typeof found.minutes === "number") return clamp(found.minutes, 0, 600);
          if (typeof found.min === "number") return clamp(found.min, 0, 600);
        }
      }
    }

    return 0;
  }

  // -----------------------------
  // Score engine
  // -----------------------------
  function computeDayRecord(dayKey) {
    const mood = getMoodScore(dayKey);           // 0-10 or null
    const habits = getHabitsPercent(dayKey);     // 0-100
    const tasks = getTasksPercent(dayKey);       // 0-100
    const workout = workoutCompletedOnDay(dayKey) ? 100 : 0; // Option A
    const readingMin = getReadingMinutes(dayKey);
    const reading = clamp((readingMin / READING_GOAL_MINUTES) * 100, 0, 100);

    // If mood isn't logged, don't punish hard: treat as neutral 50
    const moodPct = mood === null ? 50 : clamp(mood * 10, 0, 100);

    const score =
      moodPct * WEIGHTS.mood +
      habits * WEIGHTS.habits +
      tasks * WEIGHTS.tasks +
      workout * WEIGHTS.workout +
      reading * WEIGHTS.reading;

    const rounded = Math.round(score);

    return {
      date: dayKey,
      mood: moodPct,
      habits,
      tasks,
      workout,
      reading,
      score: rounded
    };
  }

  function collectAllKnownDates() {
    const dates = new Set();

    // from todoHistory
    try {
      const th = window.todoHistory || safeParse(localStorage.getItem("todoHistory"), {});
      if (th && typeof th === "object") Object.keys(th).forEach(k => dates.add(k));
    } catch {}

    // from habit completions
    try {
      const hc = window.habitCompletions || safeParse(localStorage.getItem("habitCompletions"), {});
      if (hc && typeof hc === "object") Object.keys(hc).forEach(k => dates.add(k));
    } catch {}

    // from mood
    try {
      const md = window.moodData || safeParse(localStorage.getItem("moodData"), {});
      if (md && typeof md === "object" && !Array.isArray(md)) Object.keys(md).forEach(k => dates.add(k));
    } catch {}

    // from workouts sets
    try {
      const list = safeParse(localStorage.getItem("kp_workouts_v2"), []);
      if (Array.isArray(list)) {
        list.forEach(w => {
          (w?.exercises || []).forEach(ex => {
            (ex?.sets || []).forEach(s => {
              const d = String(s?.date || "").split("T")[0];
              if (/^\d{4}-\d{2}-\d{2}$/.test(d)) dates.add(d);
            });
          });
        });
      }
    } catch {}

    // Always include today
    dates.add(toLocalISODate(new Date()));

    return [...dates].filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort((a, b) => new Date(a) - new Date(b));
  }

  function buildSeries(range) {
    const today = new Date();
    let keys = [];

    if (range === "all") {
      keys = collectAllKnownDates();
      // if empty (shouldn't be), fallback to last 7
      if (!keys.length) return buildSeries("7");
    } else {
      const n = range === "30" ? 30 : 7;
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        keys.push(toLocalISODate(d));
      }
    }

    const rows = keys.map(k => computeDayRecord(k));
    return {
      keys,
      labels: keys.map(fmtShort),
      scores: rows.map(r => r.score),
      rows
    };
  }

  function computeStreakFromSeries(rows) {
    // streak = consecutive days from today backwards where score >= 80
    let streak = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      if ((rows[i]?.score ?? 0) >= 80) streak++;
      else break;
    }
    return streak;
  }

  // -----------------------------
  // UI injection (no HTML hunting)
  // -----------------------------
  function ensurePerformanceSection() {
    const dash = byId("dashboardPage");
    if (!dash) return null;

    let section = byId("kpPerformanceSection");
    if (section) return section;

    section = document.createElement("div");
    section.className = "habit-section";
    section.id = "kpPerformanceSection";

    section.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <div class="section-title">📈 Performance Engine</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <select id="kpPerfRange" class="form-input" style="width:auto;">
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="all">all time</option>
          </select>
        </div>
      </div>

      <div style="margin-top:10px; display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px;">
        <div style="border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); border-radius:14px; padding:12px;">
          <div style="color:#9ca3af; font-size:0.85rem; font-weight:800;">Today</div>
          <div id="kpLifeToday" style="font-size:1.8rem; font-weight:900; margin-top:6px;">--%</div>
          <div id="kpLifeDrivers" style="color:#9ca3af; font-size:0.85rem; margin-top:4px;">--</div>
        </div>

        <div style="border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); border-radius:14px; padding:12px;">
          <div style="color:#9ca3af; font-size:0.85rem; font-weight:800;">7-day average</div>
          <div id="kpLifeAvg" style="font-size:1.8rem; font-weight:900; margin-top:6px;">--%</div>
          <div style="color:#9ca3af; font-size:0.85rem; margin-top:4px;">performance score</div>
        </div>

        <div style="border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); border-radius:14px; padding:12px;">
          <div style="color:#9ca3af; font-size:0.85rem; font-weight:800;">Streak</div>
          <div id="kpLifeStreak" style="font-size:1.8rem; font-weight:900; margin-top:6px;">--</div>
          <div style="color:#9ca3af; font-size:0.85rem; margin-top:4px;">days at 80%+</div>
        </div>
      </div>

      <div style="margin-top:12px; width:100%; height:280px;">
        <canvas id="kpPerfTrendCanvas" height="280"></canvas>
      </div>

      <div id="kpDNABox" style="margin-top:12px;"></div>
    `;

    // Insert it right under Smart Insights (best spot)
    const insightsSection = dash.querySelector("#insightsWidget")?.closest(".habit-section");
    if (insightsSection && insightsSection.parentNode) {
      insightsSection.parentNode.insertBefore(section, insightsSection.nextSibling);
    } else {
      // fallback: append
      dash.appendChild(section);
    }

    return section;
  }

  // -----------------------------
  // Charts
  // -----------------------------
  let perfChart = null;

  function destroyChartSafe() {
    if (perfChart) {
      try { perfChart.destroy(); } catch {}
      perfChart = null;
    }
  }

  function renderTrendChart(range) {
    if (!ensureChartJS()) return;

    const section = ensurePerformanceSection();
    if (!section) return;

    const canvas = byId("kpPerfTrendCanvas");
    if (!canvas) return;

    const series = buildSeries(range);
    destroyChartSafe();

    perfChart = new window.Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [{
          label: "Performance",
          data: series.scores,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          spanGaps: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { color: "rgba(255,255,255,0.8)" } },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const idx = items?.[0]?.dataIndex ?? 0;
                const r = series.rows[idx];
                if (!r) return [];
                return [
                  `Mood: ${Math.round(r.mood)}%`,
                  `Habits: ${Math.round(r.habits)}%`,
                  `Tasks: ${Math.round(r.tasks)}%`,
                  `Workout (completed): ${r.workout ? "yes" : "no"}`,
                  `Reading: ${Math.round(r.reading)}%`
                ];
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: "rgba(255,255,255,0.65)" }, grid: { color: "rgba(255,255,255,0.08)" } },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { color: "rgba(255,255,255,0.65)" },
            grid: { color: "rgba(255,255,255,0.08)" }
          }
        }
      }
    });
  }

  // -----------------------------
  // Restored public renders (called by core.js)
  // -----------------------------
  function renderLifeScore() {
    const section = ensurePerformanceSection();
    if (!section) return;

    const todayKey = toLocalISODate(new Date());
    const today = computeDayRecord(todayKey);

    const series7 = buildSeries("7");
    const avg7 = Math.round(series7.scores.reduce((a, b) => a + b, 0) / (series7.scores.length || 1));
    const streak = computeStreakFromSeries(series7.rows);

    const topDrivers = [
      { k: "habits", label: "habits", v: today.habits },
      { k: "tasks", label: "tasks", v: today.tasks },
      { k: "mood", label: "mood", v: today.mood },
      { k: "reading", label: "reading", v: today.reading },
      { k: "workout", label: "workout", v: today.workout }
    ].sort((a, b) => b.v - a.v);

    const driversText = topDrivers.slice(0, 2).map(x => `${x.label} ${Math.round(x.v)}%`).join(" • ");

    const elToday = byId("kpLifeToday");
    const elAvg = byId("kpLifeAvg");
    const elStreak = byId("kpLifeStreak");
    const elDrivers = byId("kpLifeDrivers");

    if (elToday) elToday.textContent = `${today.score}%`;
    if (elAvg) elAvg.textContent = `${avg7}%`;
    if (elStreak) elStreak.textContent = String(streak);
    if (elDrivers) elDrivers.textContent = driversText || "--";

    // keep the stats cards alive too
    renderWeeklyGraph();
  }

  function renderWeeklyGraph() {
    // These IDs exist in your HTML stats grid
    const daysAt80El = byId("daysAt80");
    const weeklyCompletionEl = byId("weeklyCompletion");
    const currentStreakEl = byId("currentStreak");

    const series7 = buildSeries("7");
    const daysAt80 = series7.rows.filter(r => (r.score ?? 0) >= 80).length;
    const avg7 = Math.round(series7.scores.reduce((a, b) => a + b, 0) / (series7.scores.length || 1));
    const streak = computeStreakFromSeries(series7.rows);

    if (daysAt80El) daysAt80El.textContent = `${daysAt80}/7`;
    if (weeklyCompletionEl) weeklyCompletionEl.textContent = `${avg7}%`;
    if (currentStreakEl) currentStreakEl.textContent = String(streak);
  }

  function renderDNAProfile() {
    const box = byId("kpDNABox");
    if (!box) return;

    const todayKey = toLocalISODate(new Date());
    const r = computeDayRecord(todayKey);

    // simple, honest “DNA” = breakdown + what to fix next
    const weakest = [
      { label: "habits", v: r.habits },
      { label: "tasks", v: r.tasks },
      { label: "mood", v: r.mood },
      { label: "workout", v: r.workout },
      { label: "reading", v: r.reading }
    ].sort((a, b) => a.v - b.v)[0];

    box.innerHTML = `
      <div style="border:1px solid rgba(255,255,255,0.10); background:rgba(0,0,0,0.18); border-radius:14px; padding:12px;">
        <div style="color:white; font-weight:900;">Productivity DNA (real)</div>
        <div style="color:#9ca3af; margin-top:6px; font-size:0.92rem;">
          mood ${Math.round(r.mood)}% • habits ${Math.round(r.habits)}% • tasks ${Math.round(r.tasks)}% • workout ${r.workout ? "yes" : "no"} • reading ${Math.round(r.reading)}%
        </div>
        <div style="margin-top:10px; color:#e5e7eb; font-weight:900;">
          next lever: ${weakest?.label || "—"}
        </div>
        <div style="color:#9ca3af; margin-top:4px; font-size:0.9rem;">
          bring ${weakest?.label || "it"} up to raise today’s score fastest.
        </div>
      </div>
    `;
  }

  function renderDashboardTrendChart() {
    const section = ensurePerformanceSection();
    if (!section) return;

    const sel = byId("kpPerfRange");
    const range = sel ? sel.value : DEFAULT_RANGE;

    renderTrendChart(range);
    renderLifeScore();
    renderDNAProfile();

    // bind once
    if (sel && !sel.__bound) {
      sel.value = range || DEFAULT_RANGE;
      sel.onchange = () => {
        renderTrendChart(sel.value);
        renderLifeScore();
        renderDNAProfile();
      };
      sel.__bound = true;
    }
  }

  // -----------------------------
  // Auto-refresh hooks
  // -----------------------------
  function refreshAll() {
    renderDashboardTrendChart();
  }

  function dashboardActive() {
    const p = byId("dashboardPage");
    return !!(p && p.classList.contains("active"));
  }

  function hookEvents() {
    // your habits.js dispatches this
    window.addEventListener("habitsUpdated", () => {
      if (dashboardActive()) refreshAll();
    });

    // storage from other tabs
    window.addEventListener("storage", () => {
      if (dashboardActive()) refreshAll();
    });

    // when you come back to tab
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && dashboardActive()) refreshAll();
    });

    // safe periodic sanity refresh (lightweight)
    setInterval(() => {
      if (dashboardActive()) refreshAll();
    }, 8000);
  }

  // -----------------------------
  // Exports (RESTORE old API names)
  // -----------------------------
  window.renderLifeScore = renderLifeScore;
  window.renderWeeklyGraph = renderWeeklyGraph;
  window.renderDNAProfile = renderDNAProfile;
  window.renderDashboardTrendChart = renderDashboardTrendChart;

  // Boot
  function boot() {
    hookEvents();

    // If dashboard is already active, render now
    setTimeout(() => {
      if (dashboardActive()) refreshAll();
    }, 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  console.log("Performance engine loaded (restored trend/life/dna)");
})();
