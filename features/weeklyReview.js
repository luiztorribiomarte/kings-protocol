// ============================================
// WEEKLY REVIEW MODULE - Automated Summary & Comparison
// ============================================

function getWeekDates(offset = 0) {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday
  
  // Get Sunday of the target week
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - currentDay - (offset * 7));
  
  const week = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    week.push(day.toISOString().split("T")[0]);
  }
  
  return week;
}

function calculateWeekScore(weekDates) {
  const scores = weekDates.map(date => {
    const habitPct = typeof getDayCompletion === "function" 
      ? getDayCompletion(date).percent 
      : 0;
    
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const energy = moodData[date]?.energy || 0;
    const energyPct = (energy / 10) * 100;
    
    const todoHistory = JSON.parse(localStorage.getItem("todoHistory") || "{}");
    const taskPct = todoHistory[date]?.percent || 0;
    
    return (habitPct * 0.5) + (energyPct * 0.25) + (taskPct * 0.25);
  });
  
  return Math.round(scores.reduce((a,b) => a+b, 0) / scores.length);
}

function getWeekWins(weekDates) {
  const wins = [];
  
  // Perfect days
  const perfectDays = weekDates.filter(date => {
    const pct = typeof getDayCompletion === "function" 
      ? getDayCompletion(date).percent 
      : 0;
    return pct >= 80;
  }).length;
  
  if (perfectDays >= 5) wins.push(`${perfectDays} days at 80%+ completion`);
  
  // High energy days
  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
  const highEnergyDays = weekDates.filter(date => 
    (moodData[date]?.energy || 0) >= 7
  ).length;
  
  if (highEnergyDays >= 4) wins.push(`${highEnergyDays} high-energy days`);
  
  // Task completion
  const todoHistory = JSON.parse(localStorage.getItem("todoHistory") || "{}");
  const avgTasks = Math.round(
    weekDates.reduce((sum, date) => sum + (todoHistory[date]?.percent || 0), 0) / 7
  );
  
  if (avgTasks >= 70) wins.push(`${avgTasks}% average task completion`);
  
  // Streak detection
  const currentStreak = typeof calculateCurrentStreak === "function" 
    ? calculateCurrentStreak() 
    : 0;
  
  if (currentStreak >= 7) wins.push(`${currentStreak}-day streak active`);
  
  return wins.length ? wins : ["Keep building momentum"];
}

function getWeekChallenges(weekDates) {
  const challenges = [];
  
  // Low completion days
  const lowDays = weekDates.filter(date => {
    const pct = typeof getDayCompletion === "function" 
      ? getDayCompletion(date).percent 
      : 0;
    return pct < 50;
  }).length;
  
  if (lowDays >= 2) challenges.push(`${lowDays} days below 50% completion`);
  
  // Low energy
  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
  const lowEnergyDays = weekDates.filter(date => 
    (moodData[date]?.energy || 0) <= 4
  ).length;
  
  if (lowEnergyDays >= 2) challenges.push(`${lowEnergyDays} low-energy days`);
  
  // Missed habits
  const habits = JSON.parse(localStorage.getItem("habits") || "[]");
  const habitCompletions = JSON.parse(localStorage.getItem("habitCompletions") || "{}");
  
  if (habits.length > 0) {
    const habitMisses = habits.map(habit => {
      const completed = weekDates.filter(date => 
        habitCompletions[date]?.[habit.id]
      ).length;
      return { habit: habit.name, completed, total: 7 };
    }).filter(h => h.completed < 4);
    
    if (habitMisses.length > 0) {
      const worst = habitMisses.sort((a,b) => a.completed - b.completed)[0];
      challenges.push(`${worst.habit}: only ${worst.completed}/7 days`);
    }
  }
  
  return challenges.length ? challenges : ["No major challenges"];
}

function generateWeeklyFocus(thisWeekScore, lastWeekScore) {
  const suggestions = [];
  
  if (thisWeekScore < lastWeekScore) {
    suggestions.push("Regain momentum - focus on consistency over perfection");
  }
  
  if (thisWeekScore < 70) {
    suggestions.push("Prioritize your top 3 habits daily");
  }
  
  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
  const weekDates = getWeekDates(0);
  const avgEnergy = weekDates.reduce((sum, date) => 
    sum + (moodData[date]?.energy || 0), 0
  ) / 7;
  
  if (avgEnergy < 6) {
    suggestions.push("Focus on sleep, nutrition, and recovery");
  }
  
  if (suggestions.length === 0) {
    suggestions.push("Maintain your momentum and aim for 7/7 perfect days");
  }
  
  return suggestions;
}

function getMomentumIndicator(thisWeekScore, lastWeekScore) {
  const diff = thisWeekScore - lastWeekScore;
  
  if (diff > 10) return { icon: "🚀", text: "Accelerating", color: "#22C55E" };
  if (diff > 0) return { icon: "📈", text: "Building", color: "#A78BFA" };
  if (diff > -10) return { icon: "➡️", text: "Stable", color: "#9CA3AF" };
  return { icon: "📉", text: "Declining", color: "#EF4444" };
}

// ---------- UI ----------
function openWeeklyReview() {
  const thisWeek = getWeekDates(0);
  const lastWeek = getWeekDates(1);
  
  const thisWeekScore = calculateWeekScore(thisWeek);
  const lastWeekScore = calculateWeekScore(lastWeek);
  
  const wins = getWeekWins(thisWeek);
  const challenges = getWeekChallenges(thisWeek);
  const focus = generateWeeklyFocus(thisWeekScore, lastWeekScore);
  const momentum = getMomentumIndicator(thisWeekScore, lastWeekScore);
  
  const html = `
    <h2>📋 Weekly Review</h2>
    <div style="color:#9CA3AF; margin-bottom:20px;">
      ${new Date(thisWeek[0]).toLocaleDateString()} - ${new Date(thisWeek[6]).toLocaleDateString()}
    </div>
    
    <!-- Score Comparison -->
    <div style="
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap:14px;
      margin-bottom:20px;
    ">
      <div style="
        padding:18px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.16);
        background:linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
        text-align:center;
      ">
        <div style="font-size:2.5rem; font-weight:900; color:#A78BFA;">${thisWeekScore}</div>
        <div style="color:#9CA3AF; font-size:0.9rem;">This Week</div>
      </div>
      <div style="
        padding:18px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.16);
        background:rgba(255,255,255,0.03);
        text-align:center;
      ">
        <div style="font-size:2.5rem; font-weight:900; color:#6B7280;">${lastWeekScore}</div>
        <div style="color:#9CA3AF; font-size:0.9rem;">Last Week</div>
      </div>
    </div>
    
    <!-- Momentum -->
    <div style="
      padding:14px;
      margin-bottom:20px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,0.16);
      background:rgba(255,255,255,0.05);
      display:flex;
      align-items:center;
      gap:12px;
      justify-content:center;
    ">
      <div style="font-size:2rem;">${momentum.icon}</div>
      <div>
        <div style="font-weight:800; font-size:1.1rem; color:${momentum.color};">
          ${momentum.text}
        </div>
        <div style="color:#9CA3AF; font-size:0.9rem;">
          ${Math.abs(thisWeekScore - lastWeekScore)} points ${thisWeekScore > lastWeekScore ? 'up' : thisWeekScore < lastWeekScore ? 'down' : 'flat'}
        </div>
      </div>
    </div>
    
    <!-- Wins -->
    <div style="margin-bottom:20px;">
      <div style="font-weight:800; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
        <span style="font-size:1.3rem;">🏆</span> Wins This Week
      </div>
      <div style="
        padding:14px;
        border-radius:12px;
        border:1px solid rgba(34,197,94,0.3);
        background:rgba(34,197,94,0.08);
      ">
        ${wins.map(win => `
          <div style="margin-bottom:6px; display:flex; align-items:center; gap:8px;">
            <div style="color:#22C55E;">✓</div>
            <div>${win}</div>
          </div>
        `).join("")}
      </div>
    </div>
    
    <!-- Challenges -->
    <div style="margin-bottom:20px;">
      <div style="font-weight:800; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
        <span style="font-size:1.3rem;">⚠️</span> Areas to Improve
      </div>
      <div style="
        padding:14px;
        border-radius:12px;
        border:1px solid rgba(245,158,11,0.3);
        background:rgba(245,158,11,0.08);
      ">
        ${challenges.map(challenge => `
          <div style="margin-bottom:6px; display:flex; align-items:center; gap:8px;">
            <div style="color:#F59E0B;">›</div>
            <div>${challenge}</div>
          </div>
        `).join("")}
      </div>
    </div>
    
    <!-- Focus for Next Week -->
    <div>
      <div style="font-weight:800; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
        <span style="font-size:1.3rem;">🎯</span> Focus for Next Week
      </div>
      <div style="
        padding:14px;
        border-radius:12px;
        border:1px solid rgba(99,102,241,0.3);
        background:rgba(99,102,241,0.08);
      ">
        ${focus.map(item => `
          <div style="margin-bottom:6px; display:flex; align-items:center; gap:8px;">
            <div style="color:#6366F1;">→</div>
            <div>${item}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
  
  openModal(html);
}

console.log("Weekly Review module loaded");
