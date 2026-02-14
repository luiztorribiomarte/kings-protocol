// ============================================
// LIFE ENGINE 7.5 — LOCAL-DAY SYNC + LEGACY UTC FALLBACK
// Fixes: life score / DNA / trend reading 0 due to UTC date keys
// Safe upgrade: no removals, only more robust date + storage reads
// ============================================

(function() {
  "use strict";

  // ---------- Helpers ----------
  function safeNum(n) {
    return typeof n === "number" && !isNaN(n) ? n : 0;
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // Local YYYY-MM-DD (no UTC drift)
  function toLocalISODate(date = new Date()) {
    const y = date.getFullYear();
    const m = pad2(date.getMonth() + 1);
    const d = pad2(date.getDate());
    return `${y}-${m}-${d}`;
  }

  function parseLocalISODate(dayKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dayKey || ""))) return new Date();
    const [y, m, d] = String(dayKey).split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  function shiftDayKey(dayKey, deltaDays) {
    const dt = parseLocalISODate(dayKey);
    dt.setDate(dt.getDate() + deltaDays);
    return toLocalISODate(dt);
  }

  function todayKey() {
    return toLocalISODate(new Date());
  }

  function getLastDays(n) {
    const days = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      days.push(toLocalISODate(d));
    }
    return days;
  }

  // Legacy-safe read: try exact day, then -1, then +1
  // (covers older saves that used UTC day keys near midnight)
  function readDay(obj, dayKey) {
    if (!obj || typeof obj !== "object") return undefined;
    if (obj[dayKey] != null) return obj[dayKey];
    const prev = shiftDayKey(dayKey, -1);
    if (obj[prev] != null) return obj[prev];
    const next = shiftDayKey(dayKey, 1);
    if (obj[next] != null) return obj[next];
    return undefined;
  }

  function getAllDaysFromStorage() {
    const habitData = safeParse(localStorage.getItem("habitCompletions"), {});
    const moodData = safeParse(localStorage.getItem("moodData"), {});
    const todoHistory = safeParse(localStorage.getItem("todoHistory"), {});

    const keys = new Set([
      ...Object.keys(habitData || {}),
      ...Object.keys(moodData || {}),
      ...Object.keys(todoHistory || {})
    ]);

    const out = [...keys].filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    return out.length ? out : getLastDays(7);
  }

  function prettyLabel(dateStr) {
    try {
      const dt = parseLocalISODate(dateStr);
      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  }

  function safeParse(raw, fallback) {
    try {
      const v = JSON.parse(raw || "");
      return v && typeof v === "object" ? v : fallback;
    } catch {
      return fallback;
    }
  }

  // ---------- Core Metrics ----------
  function getHabitPercent(dateKey = todayKey()) {
    try {
      // Prefer the habits module if available
      if (typeof window.getDayCompletion === "function") {
        const result = window.getDayCompletion(dateKey);
        if (result && typeof result.percent === "number") return safeNum(result.percent);

        // Legacy fallback: if getDayCompletion doesn’t find data due to key drift,
        // try adjacent day keys
        const rPrev = window.getDayCompletion(shiftDayKey(dateKey, -1));
        if (rPrev && typeof rPrev.percent === "number" && rPrev.percent > 0) return safeNum(rPrev.percent);

        const rNext = window.getDayCompletion(shiftDayKey(dateKey, 1));
        if (rNext && typeof rNext.percent === "number" && rNext.percent > 0) return safeNum(rNext.percent);
      }
    } catch {}
    return 0;
  }

  function getEnergyPercent(dateKey = todayKey()) {
    try {
      const moodData = safeParse(localStorage.getItem("moodData"), {});
      const day = readDay(moodData, dateKey) || {};
      const energy = day.energy ?? 0;
      return Math.round((safeNum(energy) / 10) * 100);
    } catch {}
    return 0;
  }

  function getTaskPercentForDay(dateKey = todayKey()) {
    try {
      const hist = safeParse(localStorage.getItem("todoHistory"), {});
      const day = readDay(hist, dateKey);
      if (day && day.percent != null) return safeNum(day.percent);
    } catch {}

    // fallback for today (live todos)
    if (dateKey === todayKey()) {
      try {
        const todos = safeParse(localStorage.getItem("todos"), []);
        if (!Array.isArray(todos) || !todos.length) return 0;
        const done = todos.filter(t => t && t.done).length;
        return Math.round((done / todos.length) * 100);
      } catch {}
    }

    return 0;
  }

  function getStreakBonus() {
    let streak = 0;
    const days = getLastDays(30).slice().reverse();

    for (const d of days) {
      const pct = getHabitPercent(d);
      if (pct >= 80) streak++;
      else break;
    }

    return Math.min(streak * 2, 15);
  }

  // ---------- Life Score ----------
  function calculateLifeScore() {
    const habitPct = getHabitPercent();
    const energyPct = getEnergyPercent();
    const taskPct = getTaskPercentForDay();
    const streakBonus = getStreakBonus();

    const score =
      habitPct * 0.5 +
      energyPct * 0.25 +
      taskPct * 0.25 +
      streakBonus;

    return {
      score: Math.min(100, Math.round(score)),
      breakdown: {
        habits: Math.round(habitPct),
        energy: Math.round(energyPct),
        tasks: Math.round(taskPct),
        streakBonus: Math.round(streakBonus)
      }
    };
  }

  // ---------- DNA ----------
  function calculateDNA() {
    const days = getLastDays(14);
    const habitVals = days.map(d => getHabitPercent(d));
    const avgHabit = Math.round(habitVals.reduce((a, b) => a + b, 0) / (habitVals.length || 1));

    const variance = Math.round(
      habitVals.reduce((a, b) => a + Math.abs(b - avgHabit), 0) / (habitVals.length || 1)
    );

    const discipline = Math.min(100, avgHabit + getStreakBonus());
    const consistency = Math.max(0, 100 - variance);

    // execution should be based on each day’s tasks, not only today
    const taskVals = days.map(d => getTaskPercentForDay(d));
    const avgTasks = Math.round(taskVals.reduce((a, b) => a + b, 0) / (taskVals.length || 1));

    const execution = Math.round((avgHabit + avgTasks) / 2);
    const avg14 = avgHabit;

    return { discipline, consistency, execution, avg14 };
  }

  // ---------- UI ----------
  function renderLifeScore() {
    const el = document.getElementById("dailyStatus");
    if (!el) return;

    const data = calculateLifeScore();
    const score = data.score;

    let label = "Slipping";
    let color = "#EF4444";

    if (score >= 80) {
      label = "Dominating";
      color = "#22C55E";
    } else if (score >= 60) {
      label = "Solid";
      color = "#A78BFA";
    } else if (score >= 40) {
      label = "Recovering";
      color = "#F59E0B";
    }

    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    el.innerHTML = `
      <div style="margin-top:14px;padding:18px;border-radius:18px;border:1px solid rgba(255,255,255,0.14);background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));display:flex;gap:18px;align-items:center;flex-wrap:wrap;">
        <div style="position:relative;width:130px;height:130px;">
          <svg width="130" height="130">
            <circle cx="65" cy="65" r="${radius}" stroke="rgba(255,255,255,0.12)" stroke-width="10" fill="none"/>
            <circle cx="65" cy="65" r="${radius}" stroke="${color}" stroke-width="10" fill="none"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"
              stroke-linecap="round"
              transform="rotate(-90 65 65)"/>
          </svg>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
            <div style="font-size:1.6rem;font-weight:900;color:${color};">${score}</div>
            <div style="font-size:0.75rem;color:#9CA3AF;">Life Score</div>
          </div>
        </div>

        <div style="flex:1;min-width:200px;">
          <div style="font-size:1.1rem;font-weight:900;color:${color};">${label}</div>
          <div style="margin-top:10px;font-size:0.9rem;color:#E5E7EB;line-height:1.6;">
            Habits: ${data.breakdown.habits}%<br>
            Energy: ${data.breakdown.energy}%<br>
            Tasks: ${data.breakdown.tasks}%<br>
            Streak Bonus: +${data.breakdown.streakBonus}
          </div>
        </div>

        <div id="dnaPanel" style="flex:1;min-width:220px;"></div>
      </div>
    `;

    renderDNAPanel();
  }

  function renderDNAPanel() {
    const el = document.getElementById("dnaPanel");
    if (!el) return;

    const dna = calculateDNA();

    el.innerHTML = `
      <div style="padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);">
        <div style="font-weight:900;margin-bottom:8px;">Productivity DNA</div>
        <div style="font-size:0.9rem;color:#E5E7EB;line-height:1.7;">
          Discipline: ${dna.discipline}<br>
          Consistency: ${dna.consistency}<br>
          Execution: ${dna.execution}<br>
          14-Day Avg: ${dna.avg14}%
        </div>
      </div>
    `;
  }

  // ---------- Performance Trend ----------
  let dashboardTrendChart = null;

  function renderDashboardTrendChart() {
    const canvas = document.getElementById("trendChart");
    const select = document.getElementById("trendRange");
    if (!canvas || typeof Chart === "undefined") return;

    const range = select ? select.value : "7";
    const days = range === "all" ? getAllDaysFromStorage() : getLastDays(range === "30" ? 30 : 7);

    const labels = days.map(prettyLabel);
    const habits = days.map(d => getHabitPercent(d));
    const energy = days.map(d => getEnergyPercent(d));
    const tasks = days.map(d => getTaskPercentForDay(d));

    if (dashboardTrendChart) {
      try { dashboardTrendChart.destroy(); } catch {}
    }

    dashboardTrendChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Habits %", data: habits, borderColor: "#6366F1", tension: 0.3 },
          { label: "Energy %", data: energy, borderColor: "#EC4899", tension: 0.3 },
          { label: "Tasks %", data: tasks, borderColor: "#F59E0B", tension: 0.3 }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { min: 0, max: 100 }
        }
      }
    });
  }

  // ---------- Reactive Sync ----------
  function refreshAll() {
    renderLifeScore();
    renderDashboardTrendChart();
  }

  ["storage","todosUpdated","habitsUpdated","moodUpdated","plannerUpdated"].forEach(evt => {
    window.addEventListener(evt, refreshAll);
  });

  // also refresh on visibility change (helps after returning to tab)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshAll();
  });

  // ---------- Boot ----------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refreshAll);
  } else {
    refreshAll();
  }

  window.renderLifeScore = renderLifeScore;
  window.renderDNAProfile = renderDNAPanel;
  window.renderDashboardTrendChart = renderDashboardTrendChart;

  console.log("Life Engine 7.5 loaded (local-day + legacy fallback)");
})();
