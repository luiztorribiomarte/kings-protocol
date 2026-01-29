// ============================================
// INSIGHTS ENGINE - Pattern Analysis & Intelligence
// ============================================

function getDateString(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function getLastDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(getDateString(d));
  }
  return days;
}

// ---------- CORE INSIGHT GENERATORS ----------

function analyzeEnergyHabitCorrelation() {
  const days = getLastDays(30);
  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
  
  let highEnergyDays = [];
  let lowEnergyDays = [];
  
  days.forEach(day => {
    const energy = moodData[day]?.energy || null;
    if (energy === null) return;
    
    const habitPct = typeof getDayCompletion === "function" 
      ? getDayCompletion(day).percent 
      : 0;
    
    if (energy >= 7) highEnergyDays.push(habitPct);
    if (energy <= 4) lowEnergyDays.push(habitPct);
  });
  
  if (highEnergyDays.length < 2) return null;
  
  const avgHigh = highEnergyDays.reduce((a,b) => a+b, 0) / highEnergyDays.length;
  const avgLow = lowEnergyDays.length ? lowEnergyDays.reduce((a,b) => a+b, 0) / lowEnergyDays.length : null;
  
  if (avgLow && Math.abs(avgHigh - avgLow) > 15) {
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
  const days = getLastDays(60);
  const dayScores = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  
  days.forEach(dateStr => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const pct = typeof getDayCompletion === "function" 
      ? getDayCompletion(dateStr).percent 
      : 0;
    dayScores[dayOfWeek].push(pct);
  });
  
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const averages = Object.keys(dayScores).map(day => ({
    day: parseInt(day),
    avg: dayScores[day].length ? dayScores[day].reduce((a,b)=>a+b,0) / dayScores[day].length : 0
  }));
  
  averages.sort((a,b) => a.avg - b.avg);
  
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
  
  allDays.forEach((day, i) => {
    const pct = typeof getDayCompletion === "function" 
      ? getDayCompletion(day).percent 
      : 0;
    
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
  
  if (maxStreak >= 7) {
    return {
      icon: "🏆",
      title: "Best Streak",
      message: `Your longest streak: ${maxStreak} days (started ${new Date(bestStartDate).toLocaleDateString()})`,
      type: "achievement"
    };
  }
  
  return null;
}

function calculateYearProgress() {
  const allDays = Object.keys(JSON.parse(localStorage.getItem("habitCompletions") || "{}"));
  const thisYear = new Date().getFullYear();
  const daysThisYear = allDays.filter(d => d.startsWith(thisYear.toString()));
  
  const perfectDays = daysThisYear.filter(day => {
    const pct = typeof getDayCompletion === "function" 
      ? getDayCompletion(day).percent 
      : 0;
    return pct >= 80;
  }).length;
  
  const daysInYear = 365;
  const projection = Math.round((perfectDays / daysThisYear.length) * daysInYear);
  
  if (daysThisYear.length >= 30 && perfectDays >= 20) {
    return {
      icon: "📊",
      title: "Year Projection",
      message: `${perfectDays} strong days so far. On track for ${projection} this year!`,
      type: "insight"
    };
  }
  
  return null;
}

function detectSlippingPattern() {
  const recent = getLastDays(7);
  const scores = recent.map(day => 
    typeof getDayCompletion === "function" 
      ? getDayCompletion(day).percent 
      : 0
  );
  
  const avg = scores.reduce((a,b)=>a+b,0) / scores.length;
  const belowTarget = scores.filter(s => s < 60).length;
  
  if (belowTarget >= 3 && avg < 65) {
    return {
      icon: "⚠️",
      title: "Recovery Needed",
      message: `You've dipped below 60% for ${belowTarget} days this week. Time to reset and refocus.`,
      type: "warning"
    };
  }
  
  return null;
}

function checkMomentumTrend() {
  const lastWeek = getLastDays(7);
  const weekBefore = getLastDays(14).slice(0, 7);
  
  const lastWeekAvg = lastWeek.reduce((sum, day) => {
    const pct = typeof getDayCompletion === "function" 
      ? getDayCompletion(day).percent 
      : 0;
    return sum + pct;
  }, 0) / 7;
  
  const weekBeforeAvg = weekBefore.reduce((sum, day) => {
    const pct = typeof getDayCompletion === "function" 
      ? getDayCompletion(day).percent 
      : 0;
    return sum + pct;
  }, 0) / 7;
  
  const diff = lastWeekAvg - weekBeforeAvg;
  
  if (Math.abs(diff) > 10) {
    return {
      icon: diff > 0 ? "📈" : "📉",
      title: "Momentum Shift",
      message: `You're trending ${diff > 0 ? 'UP' : 'DOWN'} ${Math.abs(Math.round(diff))}% vs last week`,
      type: diff > 0 ? "positive" : "warning"
    };
  }
  
  return null;
}

function detectPerfectDayRatio() {
  const days = getLastDays(30);
  const perfectDays = days.filter(day => {
    const pct = typeof getDayCompletion === "function" 
      ? getDayCompletion(day).percent 
      : 0;
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const energy = moodData[day]?.energy || 0;
    const todos = JSON.parse(localStorage.getItem("todoHistory") || "{}");
    const taskPct = todos[day]?.percent || 0;
    
    return pct >= 80 && energy >= 7 && taskPct >= 80;
  }).length;
  
  const ratio = Math.round((perfectDays / days.length) * 100);
  
  if (perfectDays >= 5) {
    return {
      icon: "💎",
      title: "Perfect Day Ratio",
      message: `${perfectDays} perfect days in the last 30 (${ratio}% - habits + energy + tasks all strong)`,
      type: "achievement"
    };
  }
  
  return null;
}

// ---------- MAIN INSIGHTS GENERATOR ----------
function generateInsights() {
  const insights = [
    analyzeEnergyHabitCorrelation(),
    analyzeDayOfWeekPatterns(),
    findBestStreak(),
    calculateYearProgress(),
    detectSlippingPattern(),
    checkMomentumTrend(),
    detectPerfectDayRatio()
  ].filter(Boolean);
  
  return insights;
}

// ---------- UI RENDERING ----------
function renderInsightsWidget() {
  const container = document.getElementById("insightsWidget");
  if (!container) return;
  
  const insights = generateInsights();
  
  if (!insights.length) {
    container.innerHTML = `
      <div style="color:#9CA3AF; text-align:center; padding:20px;">
        Keep logging data to unlock insights!
      </div>
    `;
    return;
  }
  
  const html = insights.slice(0, 4).map(insight => {
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
    
    return `
      <div style="
        padding:14px;
        margin-bottom:10px;
        border-radius:12px;
        border:1px solid ${borderColors[insight.type]};
        background:${colors[insight.type]};
      ">
        <div style="display:flex; gap:10px; align-items:start;">
          <div style="font-size:1.5rem;">${insight.icon}</div>
          <div style="flex:1;">
            <div style="font-weight:800; margin-bottom:4px;">${insight.title}</div>
            <div style="color:#E5E7EB; font-size:0.95rem; line-height:1.4;">${insight.message}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");
  
  container.innerHTML = html;
}

function openFullInsights() {
  const insights = generateInsights();
  
  const html = `
    <h2>🧠 Smart Insights</h2>
    <p style="color:#9CA3AF; margin-bottom:20px;">AI-powered analysis of your patterns and progress</p>
    
    ${insights.length === 0 
      ? `<div style="color:#9CA3AF; text-align:center; padding:40px;">Keep tracking to unlock insights!</div>`
      : insights.map(insight => {
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
        
        return `
          <div style="
            padding:18px;
            margin-bottom:14px;
            border-radius:14px;
            border:1px solid ${borderColors[insight.type]};
            background:${colors[insight.type]};
          ">
            <div style="display:flex; gap:12px; align-items:start;">
              <div style="font-size:2rem;">${insight.icon}</div>
              <div style="flex:1;">
                <div style="font-weight:800; font-size:1.1rem; margin-bottom:6px;">${insight.title}</div>
                <div style="color:#E5E7EB; line-height:1.5;">${insight.message}</div>
              </div>
            </div>
          </div>
        `;
      }).join("")
    }
  `;
  
  openModal(html);
}

console.log("Insights Engine loaded");
