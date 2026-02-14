/* features/lifeEngine.js
   FULL HARD SYNC VERSION
   - Uses habits.js local date format ONLY
   - Fixes Life Score
   - Fixes Performance Trend
   - Survives habit add/remove
*/

(function () {
  "use strict";

  function getLocalDateKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }

  function getPastDates(days = 7) {
    const arr = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(getLocalDateKey(d));
    }
    return arr;
  }

  function getEnergyPercent(dateKey) {
    if (!window.moodData) return 0;

    const energy = window.moodData?.[dateKey]?.energy;
    if (!energy) return 0;

    return Math.round((energy / 10) * 100);
  }

  function getHabitsPercent(dateKey) {
    if (typeof window.getDayCompletion !== "function")
      return 0;

    const result = window.getDayCompletion(dateKey);
    return result?.percent || 0;
  }

  function calculateLifeScore(dateKey) {
    const habits = getHabitsPercent(dateKey);
    const energy = getEnergyPercent(dateKey);

    const score = Math.round(
      habits * 0.6 +
      energy * 0.4
    );

    return {
      habits,
      energy,
      score
    };
  }

  function renderLifeScore() {
    const el = document.getElementById("lifeScoreValue");
    if (!el) return;

    const today = getLocalDateKey();
    const data = calculateLifeScore(today);

    el.textContent = data.score;

    const habitsEl = document.getElementById("lifeHabitsPercent");
    const energyEl = document.getElementById("lifeEnergyPercent");

    if (habitsEl) habitsEl.textContent = data.habits + "%";
    if (energyEl) energyEl.textContent = data.energy + "%";
  }

  function renderDashboardTrendChart() {
    if (typeof window.renderPerformanceChart !== "function")
      return;

    const dates = getPastDates(7);

    const habits = [];
    const energy = [];

    dates.forEach((d) => {
      habits.push(getHabitsPercent(d));
      energy.push(getEnergyPercent(d));
    });

    window.renderPerformanceChart(dates, habits, energy);
  }

  function renderDNAProfile() {
    const el = document.getElementById("dnaDiscipline");
    if (!el) return;

    const dates = getPastDates(14);

    let total = 0;

    dates.forEach((d) => {
      total += getHabitsPercent(d);
    });

    const avg = Math.round(total / dates.length);

    document.getElementById("dnaConsistency").textContent = avg;
    document.getElementById("dnaExecution").textContent =
      Math.round(avg * 0.5);
    document.getElementById("dna14dayAvg").textContent =
      avg + "%";
  }

  window.renderLifeScore = renderLifeScore;
  window.renderDashboardTrendChart = renderDashboardTrendChart;
  window.renderDNAProfile = renderDNAProfile;

  console.log("Life Engine HARD SYNC loaded");
})();
