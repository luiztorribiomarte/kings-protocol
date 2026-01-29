/* features/insights.js
   wrapped to avoid collisions
   adds date guards to prevent "Invalid time value"
*/

(function () {
  "use strict";

  function insightsGetDateString(date = new Date()) {
    return date.toISOString().split("T")[0];
  }

  function insightsGetLastDays(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(insightsGetDateString(d));
    }
    return days;
  }

  function safeGetDayCompletion(dateStr) {
    try {
      if (typeof window.getDayCompletion === "function") return window.getDayCompletion(dateStr);
    } catch (e) {
      console.error("Error getting day completion:", e);
    }
    return { percent: 0, done: 0, total: 0 };
  }

  function analyzeEnergyHabitCorrelation() {
    const days = insightsGetLastDays(30);
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");

    const highEnergyDays = [];
    const lowEnergyDays = [];

    days.forEach((day) => {
      const energy = moodData[day]?.energy ?? null;
      if (energy == null) return;

      const habitPct = safeGetDayCompletion(day).percent;
      if (energy >= 7) highEnergyDays.push(habitPct);
      if (energy <= 4) lowEnergyDays.push(habitPct);
    });

    if (highEnergyDays.length < 2) return null;

    const avgHigh = highEnergyDays.reduce((a, b) => a + b, 0) / highEnergyDays.length;
    const avgLow = lowEnergyDays.length ? lowEnergyDays.reduce((a, b) => a + b, 0) / lowEnergyDays.length : null;

    if (avgLow != null && Math.abs(avgHigh - avgLow) > 15) {
      return {
        icon: "⚡",
        title: "Energy-Performance Link",
        message: `You're ${Math.round(avgHigh - avgLow)}% more productive on high-energy days (${Math.round(avgHigh)}% vs ${Math.round(avgLow)}%)`,
        type: "insight"
      };
    }
    return null;
  }

  function analyzeDayOfWeekPatterns() {
    const days = insightsGetLastDays(60);
    const dayScores = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

    days.forEach((dateStr) => {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;

      const dayOfWeek = date.getDay();
      const pct = safeGetDayCompletion(dateStr).percent;
      dayScores[dayOfWeek].push(pct);
    });

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const averages = Object.keys(dayScores).map((day) => ({
      day: parseInt(day, 10),
      avg: dayScores[day].length ? dayScores[day].reduce((a, b) => a + b, 0) / dayScores[day].length : 0
    }));

    averages.sort((a, b) => a.avg - b.avg);

    const weakest = averages[0];
    const strongest = averages[averages.length - 1];

    if (weakest.avg < strongest.avg - 20 && weakest.avg < 70) {
      return {
        icon: "📉",
        title: "Weak Day Detected",
        message: `Your ${dayNames[weakest.day]}s average ${Math.round(weakest.avg)}% completion. Plan easier tasks or extra accountability.`,
        type: "warning"
      };
    }

    return null;
  }

  function findBestStreak() {
    const allDays = Object.keys(JSON.parse(localStorage.getItem("habitCompletions") || "{}")).sort();
    if (!allDays.length) return null;

    let maxStreak = 0;
    let currentStreak = 0;
    let bestStartDate = null;
    let tempStartDate = null;

    allDays.forEach((day) => {
      const pct = safeGetDayCompletion(day).percent;

      if (pct >= 80) {
        if (currentStreak === 0) tempStartDate = day;
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          bestStartDate = tempStartDate;
        }
      } else {
        currentStreak = 0;
      }
    });

    if (maxStreak >= 7 && bestStartDate) {
      const d = new Date(bestStartDate);
      const startLabel = isNaN(d.getTime()) ? bestStartDate : d.toLocaleDateString();

      return {
        icon: "🏆",
        title: "Best Streak",
        message: `Your longest streak: ${maxStreak} days (started ${startLabel})`,
        type: "achievement"
      };
    }

    return null;
  }

  function calculateYearProgress() {
    const allDays = Object.keys(JSON.parse(localStorage.getItem("habitCompletions") || "{}"));
    const thisYear = new Date().getFullYear();
    const daysThisYear = allDays.filter((d) => d.startsWith(String(thisYear)));

    const perfectDays = daysThisYear.filter((day) => safeGetDayCompletion(day).percent >= 80).length;

    const daysInYear = 365;
    const projection = daysThisYear.length ? Math.round((perfectDays / daysThisYear.length) * daysInYear) : 0;

    if (daysThisYear.length >= 30 && perfectDays >= 20) {
      return { icon: "📊", title: "Year Projection", message: `${perfectDays} strong days so far. On track for ${projection} this year!`, type: "insight" };
    }
    return null;
  }

  function detectSlippingPattern() {
    const recent = insightsGetLastDays(7);
    const scores = recent.map((day) => safeGetDayCompletion(day).percent);

    const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    const belowTarget = scores.filter((s) => s < 60).length;

    if (belowTarget >= 3 && avg < 65) {
      return { icon: "⚠️", title: "Recovery Needed", message: `You've dipped below 60% for ${belowTarget} days this week. Time to reset and refocus.`, type: "warning" };
    }
    return null;
  }

  function checkMomentumTrend() {
    const lastWeek = insightsGetLastDays(7);
    const weekBefore = insightsGetLastDays(14).slice(0, 7);

    const lastWeekAvg = lastWeek.reduce((sum, day) => sum + safeGetDayCompletion(day).percent, 0) / 7;
    const weekBeforeAvg = weekBefore.reduce((sum, day) => sum + safeGetDayCompletion(day).percent, 0) / 7;

    const diff = lastWeekAvg - weekBeforeAvg;

    if (Math.abs(diff) > 10) {
      return {
        icon: diff > 0 ? "📈" : "📉",
        title: "Momentum Shift",
        message: `You're trending ${diff > 0 ? "UP" : "DOWN"} ${Math.abs(Math.round(diff))}% vs last week`,
        type: diff > 0 ? "positive" : "warning"
      };
    }
    return null;
  }

  function detectPerfectDayRatio() {
    const days = insightsGetLastDays(30);
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const todoHistory = JSON.parse(localStorage.getItem("todoHistory") || "{}");

    const perfectDays = days.filter((day) => {
      const pct = safeGetDayCompletion(day).percent;
      const energy = moodData[day]?.energy || 0;

      const taskObj = todoHistory[day];
      const taskPct = typeof taskObj === "number" ? taskObj : taskObj?.percent || 0;

      return pct >= 80 && energy >= 7 && taskPct >= 80;
    }).length;

    const ratio = Math.round((perfectDays / days.length) * 100);

    if (perfectDays >= 5) {
      return { icon: "💎", title: "Perfect Day Ratio", message: `${perfectDays} perfect days in the last 30 (${ratio}% - habits + energy + tasks all strong)`, type: "achievement" };
    }
    return null;
  }

  function generateInsights() {
    return [
      analyzeEnergyHabitCorrelation(),
      analyzeDayOfWeekPatterns(),
      findBestStreak(),
      calculateYearProgress(),
      detectSlippingPattern(),
      checkMomentumTrend(),
      detectPerfectDayRatio()
    ].filter(Boolean);
  }

  window.renderInsightsWidget = function renderInsightsWidget() {
    const container = document.getElementById("insightsWidget");
    if (!container) return;

    const insights = generateInsights();

    if (!insights.length) {
      container.innerHTML = `<div style="color:#9CA3AF; text-align:center; padding:20px;">Keep logging data to unlock insights!</div>`;
      return;
    }

    const colors = {
      insight: "rgba(99,102,241,0.15)",
      warning: "rgba(245,158,11,0.15)",
      achievement: "rgba(34,197,94,0.15)",
      positive: "rgba(34,197,94,0.15)"
    };

    const borderColors = {
      insight: "rgba(99,102,241,0.3)",
      warning: "rgba(245,158,11,0.3)",
      achievement: "rgba(34,197,94,0.3)",
      positive: "rgba(34,197,94,0.3)"
    };

    container.innerHTML = insights
      .slice(0, 4)
      .map((insight) => {
        return `
          <div style="padding:14px; margin-bottom:10px; border-radius:12px; border:1px solid ${borderColors[insight.type]}; background:${colors[insight.type]};">
            <div style="display:flex; gap:10px; align-items:start;">
              <div style="font-size:1.5rem;">${insight.icon}</div>
              <div style="flex:1;">
                <div style="font-weight:800; margin-bottom:4px;">${insight.title}</div>
                <div style="color:#E5E7EB; font-size:0.95rem; line-height:1.4;">${insight.message}</div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  };

  window.openFullInsights = function openFullInsights() {
    const insights = generateInsights();
    const colors = {
      insight: "rgba(99,102,241,0.15)",
      warning: "rgba(245,158,11,0.15)",
      achievement: "rgba(34,197,94,0.15)",
      positive: "rgba(34,197,94,0.15)"
    };

    const borderColors = {
      insight: "rgba(99,102,241,0.3)",
      warning: "rgba(245,158,11,0.3)",
      achievement: "rgba(34,197,94,0.3)",
      positive: "rgba(34,197,94,0.3)"
    };

    const html = `
      <h2>🧠 Smart Insights</h2>
      <p style="color:#9CA3AF; margin-bottom:20px;">AI-powered analysis of your patterns and progress</p>
      ${
        insights.length === 0
          ? `<div style="color:#9CA3AF; text-align:center; padding:40px;">Keep tracking to unlock insights!</div>`
          : insights
              .map(
                (insight) => `
                <div style="padding:18px; margin-bottom:14px; border-radius:14px; border:1px solid ${borderColors[insight.type]}; background:${colors[insight.type]};">
                  <div style="display:flex; gap:12px; align-items:start;">
                    <div style="font-size:2rem;">${insight.icon}</div>
                    <div style="flex:1;">
                      <div style="font-weight:800; font-size:1.1rem; margin-bottom:6px;">${insight.title}</div>
                      <div style="color:#E5E7EB; line-height:1.5;">${insight.message}</div>
                    </div>
                  </div>
                </div>
              `
              )
              .join("")
      }
    `;

    window.openModal(html);
  };

  console.log("Insights Engine loaded");
})();
