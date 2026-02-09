// ============================================
// WEEKLY WAR REPORT — COLD MILITARY INTELLIGENCE
// File: features/warReport.js
// Read-only. No mutations. No dependencies changed.
// ============================================

(function () {
  "use strict";

  const PANEL_ID = "weeklyWarReport";
  const STORAGE_KEY = "weeklyWarReportCache";

  // ---------- Helpers ----------
  function todayKey() {
    return new Date().toISOString().split("T")[0];
  }

  function getLastDays(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push(d.toISOString().split("T")[0]);
    }
    return out;
  }

  function avg(arr) {
    if (!arr.length) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }

  function pct(n) {
    return Math.round(Number(n) || 0);
  }

  function getHabitPercent(day) {
    try {
      if (typeof window.getDayCompletion === "function") {
        return pct(window.getDayCompletion(day)?.percent || 0);
      }
    } catch {}
    return 0;
  }

  function getEnergyPercent(day) {
    try {
      const mood = JSON.parse(localStorage.getItem("moodData") || "{}");
      const e = mood?.[day]?.energy || 0;
      return Math.round((e / 10) * 100);
    } catch {}
    return 0;
  }

  function getTaskPercent(day) {
    try {
      const hist = JSON.parse(localStorage.getItem("todoHistory") || "{}");
      if (hist?.[day]?.percent != null) return pct(hist[day].percent);
    } catch {}
    return 0;
  }

  // ---------- Analysis ----------
  function analyzeWeek() {
    const days = getLastDays(7);

    const habitVals = days.map(getHabitPercent);
    const energyVals = days.map(getEnergyPercent);
    const taskVals = days.map(getTaskPercent);

    const habitAvg = avg(habitVals);
    const energyAvg = avg(energyVals);
    const taskAvg = avg(taskVals);

    const weak = [];
    const strong = [];

    if (habitAvg >= 80) strong.push("Habits held operational standard");
    else weak.push("Habit compliance below standard");

    if (energyAvg >= 70) strong.push("Energy levels sustained");
    else weak.push("Energy levels degraded");

    if (taskAvg >= 70) strong.push("Task execution acceptable");
    else weak.push("Task execution inconsistent");

    return {
      habitAvg,
      energyAvg,
      taskAvg,
      strong,
      weak
    };
  }

  // ---------- Render ----------
  function render() {
    const dash = document.getElementById("dashboardPage");
    if (!dash) return;

    let panel = document.getElementById(PANEL_ID);
    if (panel) panel.remove();

    const report = analyzeWeek();

    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "habit-section";

    panel.innerHTML = `
      <div class="section-title">🪖 Weekly War Report</div>

      <div style="font-size:0.9rem;color:#9CA3AF;margin-bottom:10px;">
        Last 7 days. No emotion. No excuses.
      </div>

      <div style="margin-bottom:10px;">
        <div><strong>Habits:</strong> ${report.habitAvg}%</div>
        <div><strong>Energy:</strong> ${report.energyAvg}%</div>
        <div><strong>Tasks:</strong> ${report.taskAvg}%</div>
      </div>

      <div style="margin-bottom:10px;">
        <div style="font-weight:800;margin-bottom:4px;">What held:</div>
        ${
          report.strong.length
            ? report.strong.map(s => `<div style="color:#22C55E;">• ${s}</div>`).join("")
            : `<div style="color:#9CA3AF;">• Nothing notable</div>`
        }
      </div>

      <div>
        <div style="font-weight:800;margin-bottom:4px;">What failed:</div>
        ${
          report.weak.length
            ? report.weak.map(w => `<div style="color:#EF4444;">• ${w}</div>`).join("")
            : `<div style="color:#9CA3AF;">• No failures detected</div>`
        }
      </div>
    `;

    // Insert near top of dashboard (after schedule)
    const sections = dash.querySelectorAll(".habit-section");
    if (sections.length >= 1) {
      sections[0].after(panel);
    } else {
      dash.prepend(panel);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      date: todayKey(),
      report
    }));
  }

  // ---------- Boot ----------
  function boot() {
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
