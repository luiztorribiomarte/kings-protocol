// ============================================
// LIFE ENGINE 8.0 — LOCAL DATE UNIFIED CORE
// FULL FIX — habits + mood + tasks sync
// ============================================

(function() {
  "use strict";

  /* =========================
     DATE (MATCH HABITS.JS)
  ========================= */

  function getDateStringLocal(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }

  function todayKey() {
    return getDateStringLocal(new Date());
  }

  function getLastDays(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(getDateStringLocal(d));
    }
    return days;
  }

  function getAllDaysFromStorage() {
    const habitData = JSON.parse(localStorage.getItem("habitCompletions") || "{}");
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const todoHistory = JSON.parse(localStorage.getItem("todoHistory") || "{}");

    const keys = new Set([
      ...Object.keys(habitData || {}),
      ...Object.keys(moodData || {}),
      ...Object.keys(todoHistory || {})
    ]);

    const valid = [...keys].filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    return valid.length ? valid : getLastDays(7);
  }

  function prettyLabel(dateStr) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
  }

  function safeNum(n) {
    return typeof n === "number" && !isNaN(n) ? n : 0;
  }

  /* =========================
     CORE METRICS
  ========================= */

  function getHabitPercent(dateKey = todayKey()) {
    try {
      if (typeof window.getDayCompletion === "function") {
        const result = window.getDayCompletion(dateKey);
        return safeNum(result.percent);
      }
    } catch {}
    return 0;
  }

  function getEnergyPercent(dateKey = todayKey()) {
    try {
      const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
      const energy = moodData?.[dateKey]?.energy ?? 0;
      return Math.round((energy / 10) * 100);
    } catch {}
    return 0;
  }

  function getTaskPercentForDay(dateKey = todayKey()) {
    try {
      const hist = JSON.parse(localStorage.getItem("todoHistory") || "{}");
      if (hist?.[dateKey]?.percent != null) return hist[dateKey].percent;
    } catch {}

    if (dateKey === todayKey()) {
      try {
        const todos = JSON.parse(localStorage.getItem("todos") || "[]");
        if (!todos.length) return 0;
        const done = todos.filter(t => t.done).length;
        return Math.round((done / todos.length) * 100);
      } catch {}
    }

    return 0;
  }

  function getStreakBonus() {
    let streak = 0;
    const days = getLastDays(30).slice().reverse();

    for (const d of days) {
      if (getHabitPercent(d) >= 80) streak++;
      else break;
    }

    return Math.min(streak * 2, 15);
  }

  /* =========================
     LIFE SCORE
  ========================= */

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

  /* =========================
     DNA
  ========================= */

  function calculateDNA() {
    const days = getLastDays(14);
    const habitVals = days.map(d => getHabitPercent(d));
    const avgHabit = Math.round(
      habitVals.reduce((a, b) => a + b, 0) / (habitVals.length || 1)
    );

    const variance = Math.round(
      habitVals.reduce((a, b) => a + Math.abs(b - avgHabit), 0) /
      (habitVals.length || 1)
    );

    const discipline = Math.min(100, avgHabit + getStreakBonus());
    const consistency = Math.max(0, 100 - variance);
    const execution = Math.round((avgHabit + getTaskPercentForDay()) / 2);
    const avg14 = avgHabit;

    return { discipline, consistency, execution, avg14 };
  }

  /* =========================
     UI RENDER
  ========================= */

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

    el.innerHTML = `
      <div style="margin-top:14px;padding:18px;border-radius:18px;border:1px solid rgba(255,255,255,0.14);background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));display:flex;gap:18px;align-items:center;flex-wrap:wrap;">
        <div style="font-size:2rem;font-weight:900;color:${color};">${score}</div>
        <div>
          <div style="font-weight:900;color:${color};">${label}</div>
          <div style="margin-top:6px;font-size:0.9rem;">
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
        <div style="font-size:0.9rem;line-height:1.7;">
          Discipline: ${dna.discipline}<br>
          Consistency: ${dna.consistency}<br>
          Execution: ${dna.execution}<br>
          14-Day Avg: ${dna.avg14}%
        </div>
      </div>
    `;
  }

  /* =========================
     PERFORMANCE TREND
  ========================= */

  let dashboardTrendChart = null;

  function renderDashboardTrendChart() {
    const canvas = document.getElementById("trendChart");
    const select = document.getElementById("trendRange");
    if (!canvas || typeof Chart === "undefined") return;

    const range = select ? select.value : "7";
    const days = range === "all"
      ? getAllDaysFromStorage()
      : getLastDays(range === "30" ? 30 : 7);

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
        scales: { y: { min: 0, max: 100 } }
      }
    });
  }

  /* =========================
     BOOT
  ========================= */

  function refreshAll() {
    renderLifeScore();
    renderDashboardTrendChart();
  }

  document.addEventListener("DOMContentLoaded", refreshAll);

  window.renderLifeScore = renderLifeScore;
  window.renderDNAProfile = renderDNAPanel;
  window.renderDashboardTrendChart = renderDashboardTrendChart;

  console.log("Life Engine 8.0 loaded (local date unified)");
})();
