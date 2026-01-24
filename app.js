
// ===============================
// SAFE GLOBAL STATE
// ===============================
window.shadowQuestions = window.shadowQuestions || [
  "What emotion did I avoid today?",
  "What triggered me recently and why?",
  "What am I afraid to admit to myself?",
  "What patterns keep repeating in my life?",
  "What do I secretly want but suppress?",
  "When was the last time I felt powerless?",
  "What belief is holding me back?",
  "Who do I resent and why?",
  "What part of myself do I reject?",
  "What would I do if I had zero fear?"
];

// ===============================
// GLOBAL MODAL SYSTEM
// ===============================
function openModal(html) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modalBody");
  if (!modal || !body) return;
  body.innerHTML = html;
  modal.style.display = "flex";
}

function closeModal(event) {
  const modal = document.getElementById("modal");
  if (!modal) return;
  if (!event || event.target === modal) {
    modal.style.display = "none";
    const body = document.getElementById("modalBody");
    if (body) body.innerHTML = "";
  }
}

// ===============================
// PAGE NAVIGATION
// ===============================
function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(b => b.classList.remove("active"));

  const map = {
    dashboard: 1,
    goalsHabits: 2,
    workout: 3,
    journal: 4,
    visionBoard: 5,
    content: 6,
    books: 7,
    settings: 8
  };

  const pageId = page + "Page";
  const el = document.getElementById(pageId);
  if (el) el.classList.add("active");

  const tab = document.querySelector(`.nav-tab:nth-child(${map[page]})`);
  if (tab) tab.classList.add("active");

  if (page === "dashboard") {
    // Dashboard modules
    try { if (typeof renderMoodTracker === "function") renderMoodTracker(); } catch {}
    try { if (typeof renderHabits === "function") renderHabits(); } catch {}
    try { if (typeof renderTodos === "function") renderTodos(); } catch {}
    try { if (typeof renderLifeScore === "function") renderLifeScore(); } catch {}
    try { if (typeof renderInsights === "function") renderInsights(); } catch {}
    try { if (typeof renderWeeklyGraph === "function") renderWeeklyGraph(); } catch {}
    try { if (typeof renderDNAProfile === "function") renderDNAProfile(); } catch {}
  }

  if (page === "journal") {
    try { if (typeof renderJournal === "function") renderJournal(); } catch {}
  }
}

// ===============================
// TIME + DATE
// ===============================
function updateTime() {
  const now = new Date();
  const timeEl = document.getElementById("currentTime");
  const dateEl = document.getElementById("currentDate");

  if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
  }
}

setInterval(updateTime, 1000);
updateTime();

// ===============================
// TODO SYSTEM
// ===============================
let todos = JSON.parse(localStorage.getItem("todos")) || [];

function saveTodos() {
  localStorage.setItem("todos", JSON.stringify(todos));
}

function addTodo() {
  const input = document.getElementById("todoInput");
  if (!input || !input.value.trim()) return;

  todos.push({ text: input.value.trim(), done: false });
  input.value = "";
  saveTodos();

  renderTodos();
  renderLifeScore();

  // keep analytics in sync
  try { renderInsights(); } catch {}
  try { renderWeeklyGraph(); } catch {}
  try { renderDNAProfile(); } catch {}
}

function toggleTodo(index) {
  todos[index].done = !todos[index].done;
  saveTodos();

  renderTodos();
  renderLifeScore();

  try { renderInsights(); } catch {}
  try { renderWeeklyGraph(); } catch {}
  try { renderDNAProfile(); } catch {}
}

function deleteTodo(index) {
  todos.splice(index, 1);
  saveTodos();

  renderTodos();
  renderLifeScore();

  try { renderInsights(); } catch {}
  try { renderWeeklyGraph(); } catch {}
  try { renderDNAProfile(); } catch {}
}

function renderTodos() {
  const list = document.getElementById("todoList");
  if (!list) return;

  list.innerHTML = "";
  if (!todos.length) {
    list.innerHTML = `<div style="color:#9CA3AF;">No tasks yet.</div>`;
    return;
  }

  todos.forEach((todo, i) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.marginBottom = "6px";

    row.innerHTML = `
      <span style="cursor:pointer; ${todo.done ? "text-decoration:line-through; color:#6B7280;" : ""}"
            onclick="toggleTodo(${i})">${todo.text}</span>
      <button onclick="deleteTodo(${i})" style="background:none; border:none; color:#EF4444; cursor:pointer;">✕</button>
    `;
    list.appendChild(row);
  });
}

// ===============================
// LIFE SCORE ENGINE
// ===============================
function animateNumber(el, start, end, duration = 800) {
  let startTime = null;
  function step(ts) {
    if (!startTime) startTime = ts;
    const progress = Math.min((ts - startTime) / duration, 1);
    el.textContent = Math.floor(start + (end - start) * progress);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderLifeScore() {
  const dashboard = document.getElementById("dashboardPage");
  if (!dashboard) return;

  let card = document.getElementById("lifeScoreCard");
  if (!card) {
    card = document.createElement("div");
    card.id = "lifeScoreCard";
    card.className = "habit-section";
    dashboard.prepend(card);
  }

  // Habits
  let habitPercent = 0;
  try {
    if (typeof getDayCompletion === "function") {
      const today = new Date().toISOString().split("T")[0];
      habitPercent = getDayCompletion(today)?.percent || 0;
    }
  } catch {}

  const habitScore = Math.round((habitPercent / 100) * 50);

  // Mood/Energy
  let energyScore = 0;
  try {
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const todayKey = new Date().toISOString().split("T")[0];
    energyScore = Math.round(((moodData[todayKey]?.energy || 5) / 10) * 25);
  } catch {}

  // Todos
  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.done).length;
  const todoScore = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 20);

  // Streak
  let streakBonus = 0;
  try {
    streakBonus = Math.min(5, parseInt(localStorage.getItem("currentStreak") || "0", 10) || 0);
  } catch {}

  const totalScore = habitScore + energyScore + todoScore + streakBonus;

  let status = "Slipping", color = "red";
  if (totalScore >= 80) { status = "Dominating"; color = "green"; }
  else if (totalScore >= 60) { status = "Solid"; color = "yellow"; }
  else if (totalScore >= 40) { status = "Recovering"; color = "yellow"; }

  const angle = Math.round((totalScore / 100) * 360);

  card.innerHTML = `
    <div class="section-title">👑 Life Score</div>
    <div class="life-score-wrap">
      <div class="life-ring"
        style="background: conic-gradient(
          ${color === "green" ? "#22c55e" : color === "yellow" ? "#eab308" : "#ef4444"} ${angle}deg,
          rgba(255,255,255,0.08) ${angle}deg
        );">
        <span id="lifeScoreNumber">0</span>
      </div>
      <div>
        <div style="font-size:1.1rem; font-weight:800;">Status: ${status}</div>
        <div class="life-score-details">
          Habits: ${habitScore}/50<br>
          Energy: ${energyScore}/25<br>
          Tasks: ${todoScore}/20<br>
          Streak: +${streakBonus}
        </div>
      </div>
    </div>
  `;

  const numEl = document.getElementById("lifeScoreNumber");
  if (numEl) animateNumber(numEl, 0, totalScore);
}

// ===============================
// ANALYTICS (INSIGHTS + WEEKLY GRAPH + DNA)
// ===============================
function getLastNDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().split("T")[0]);
  }
  return out;
}

function avg(arr) {
  return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function stdDev(arr) {
  const clean = arr.filter(v => Number.isFinite(v));
  if (clean.length <= 1) return 0;
  const m = avg(clean);
  const variance = avg(clean.map(v => (v - m) ** 2));
  return Math.sqrt(variance);
}

function renderInsights() {
  const dashboard = document.getElementById("dashboardPage");
  if (!dashboard) return;

  let card = document.getElementById("insightCard");
  if (!card) {
    card = document.createElement("div");
    card.id = "insightCard";
    card.className = "habit-section";
    // place under Life Score
    dashboard.insertBefore(card, dashboard.children[1] || null);
  }

  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");

  const last7 = getLastNDays(7);
  const prev7 = getLastNDays(14).slice(0, 7);

  const habitPercents = (days) =>
    days.map(d => {
      try {
        if (typeof getDayCompletion === "function") return getDayCompletion(d)?.percent || 0;
      } catch {}
      return 0;
    });

  const energyValues = (days) =>
    days.map(d => (moodData[d]?.energy || 0));

  const habitChange = avg(habitPercents(last7)) - avg(habitPercents(prev7));
  const energyChange = avg(energyValues(last7)) - avg(energyValues(prev7));

  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.done).length;
  const todoEfficiency = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 100);

  let trend = "Stable";
  if (habitChange > 5 || energyChange > 0.5) trend = "Improving";
  if (habitChange < -5 || energyChange < -0.5) trend = "Declining";

  card.innerHTML = `
    <div class="section-title">📊 Data Insights (7-Day Analysis)</div>
    <div style="color:#E5E7EB; line-height:1.6;">
      Habits: ${habitChange >= 0 ? "+" : ""}${habitChange.toFixed(1)}% vs last week<br>
      Energy: ${energyChange >= 0 ? "+" : ""}${energyChange.toFixed(2)} avg change<br>
      Task efficiency: ${todoEfficiency}%<br>
      Trend: <strong style="color:white;">${trend}</strong>
    </div>
  `;
}

let weeklyChart = null;

function renderWeeklyGraph() {
  const dashboard = document.getElementById("dashboardPage");
  if (!dashboard) return;

  let card = document.getElementById("weeklyGraphCard");
  if (!card) {
    card = document.createElement("div");
    card.id = "weeklyGraphCard";
    card.className = "habit-section";
    dashboard.insertBefore(card, dashboard.children[2] || null);
  }

  card.innerHTML = `
    <div class="section-title">📈 Weekly Performance</div>
    <canvas id="weeklyChartCanvas" height="140"></canvas>
  `;

  const canvas = document.getElementById("weeklyChartCanvas");
  if (!canvas) return;

  if (typeof Chart === "undefined") {
    // Chart.js not loaded; fail silently
    return;
  }

  const days = getLastNDays(7);
  const labels = days.map(d => new Date(d).toLocaleDateString("en-US", { weekday: "short" }));

  const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");

  const habitData = days.map(d => {
    try {
      if (typeof getDayCompletion === "function") return getDayCompletion(d)?.percent || 0;
    } catch {}
    return 0;
  });

  const energyData = days.map(d => (moodData[d]?.energy || 0) * 10); // 0–100 scale
  const todoData = days.map(() => {
    const total = todos.length;
    const done = todos.filter(t => t.done).length;
    return total === 0 ? 0 : Math.round((done / total) * 100);
  });

  const lifeScoreData = habitData.map((h, i) => {
    const e = energyData[i] / 4;   // -> 0–25
    const t = todoData[i] / 5;     // -> 0–20
    return Math.min(100, Math.round(h * 0.5 + e + t)); // 50% habits + energy + tasks
  });

  if (weeklyChart) {
    try { weeklyChart.destroy(); } catch {}
    weeklyChart = null;
  }

  weeklyChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Habits %", data: habitData, borderWidth: 2, tension: 0.3 },
        { label: "Energy", data: energyData, borderWidth: 2, tension: 0.3 },
        { label: "Tasks %", data: todoData, borderWidth: 2, tension: 0.3 },
        { label: "Life Score", data: lifeScoreData, borderWidth: 3, tension: 0.35 }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#E5E7EB" } }
      },
      scales: {
        x: { ticks: { color: "#9CA3AF" } },
        y: { min: 0, max: 100, ticks: { color: "#9CA3AF" } }
      }
    }
  });
}

function getCurrentStreakSafe() {
  try {
    const s = parseInt(localStorage.getItem("currentStreak") || "0", 10);
    return Number.isFinite(s) ? s : 0;
  } catch {
    return 0;
  }
}

function getHabitPercentForDay(dayKey) {
  try {
    if (typeof getDayCompletion === "function") {
      const data = getDayCompletion(dayKey);
      return data?.percent ? data.percent : 0;
    }
  } catch {}
  return 0;
}

function getEnergyForDay(dayKey) {
  try {
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const e = moodData?.[dayKey]?.energy;
    return Number.isFinite(e) ? e : 0;
  } catch {
    return 0;
  }
}

function getTaskEfficiencyPercent() {
  const total = todos.length;
  const done = todos.filter(t => t.done).length;
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function buildBar(label, value, hint) {
  const v = clamp(Math.round(value), 0, 100);
  return `
    <div style="margin-top:12px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
        <div style="color:#E5E7EB; font-weight:800;">${label}</div>
        <div style="color:#9CA3AF; font-weight:800;">${v}</div>
      </div>
      <div style="margin-top:8px; height:10px; border-radius:999px; background:rgba(255,255,255,0.08); overflow:hidden;">
        <div style="height:100%; width:${v}%; border-radius:999px; background:linear-gradient(90deg, rgba(99,102,241,0.95), rgba(236,72,153,0.95));"></div>
      </div>
      ${hint ? `<div style="margin-top:8px; color:#9CA3AF; font-size:0.9rem; line-height:1.35;">${hint}</div>` : ""}
    </div>
  `;
}

function getDNASummary(discipline, consistency, execution, volatility) {
  let type = "Balanced Builder";
  let line = "You’re steady—now push for a higher floor.";

  if (discipline >= 75 && consistency >= 70 && volatility <= 35) {
    type = "Iron Operator";
    line = "You don’t rely on motivation. You execute.";
  } else if (execution >= 75 && discipline < 60) {
    type = "Burst Finisher";
    line = "You can finish tasks, but habits aren’t locked in yet.";
  } else if (discipline >= 70 && execution < 55) {
    type = "Routine Soldier";
    line = "Habits are strong, but task output is the bottleneck.";
  } else if (volatility >= 65) {
    type = "Chaos Reactor";
    line = "Your days swing hard. Build consistency to unlock progress.";
  } else if (consistency >= 75 && discipline < 55) {
    type = "Steady Starter";
    line = "You’re consistent—now raise the intensity.";
  }

  const metrics = [
    { k: "Discipline", v: discipline },
    { k: "Consistency", v: consistency },
    { k: "Execution", v: execution },
    { k: "Volatility", v: 100 - volatility } // inverted (higher is better)
  ].sort((a, b) => a.v - b.v);

  const weakest = metrics[0]?.k || "Execution";

  let directive = "Next move: tighten your system.";
  if (weakest === "Discipline") directive = "Next move: make 1 habit non-negotiable daily.";
  if (weakest === "Consistency") directive = "Next move: stop the swings—aim for repeatable 70% days.";
  if (weakest === "Execution") directive = "Next move: cap tasks at 3 and finish them.";
  if (weakest === "Volatility") directive = "Next move: stabilize sleep + start times for 7 days.";

  return { type, line, directive };
}

function renderDNAProfile() {
  const dashboard = document.getElementById("dashboardPage");
  if (!dashboard) return;

  let card = document.getElementById("dnaCard");
  if (!card) {
    card = document.createElement("div");
    card.id = "dnaCard";
    card.className = "habit-section";
    dashboard.insertBefore(card, dashboard.children[3] || null);
  }

  const days = getLastNDays(14);
  const habitPercents = days.map(getHabitPercentForDay);
  const energies = days.map(getEnergyForDay); // 0–10

  const habitAvg = avg(habitPercents);
  const habitStd = stdDev(habitPercents);
  const energyAvg = avg(energies);
  const energyStd = stdDev(energies);

  const taskEfficiency = getTaskEfficiencyPercent();
  const streak = getCurrentStreakSafe();

  const streakScore = clamp(streak * 5, 0, 100);
  const discipline = clamp(habitAvg * 0.7 + streakScore * 0.3, 0, 100);

  const habitConsistency = clamp(100 - habitStd * 1.4, 0, 100);
  const energyConsistency = clamp(100 - energyStd * 12, 0, 100);
  const consistency = clamp(habitConsistency * 0.65 + energyConsistency * 0.35, 0, 100);

  const execution = clamp(taskEfficiency * 0.55 + habitAvg * 0.45, 0, 100);

  const volatility = clamp(habitStd * 1.2 + energyStd * 10, 0, 100);

  const summary = getDNASummary(discipline, consistency, execution, volatility);

  const disciplineHint = `Last 14 days: avg habits ${habitAvg.toFixed(1)}% + streak score ${streakScore}.`;
  const consistencyHint = `Swings: habits σ ${habitStd.toFixed(1)}, energy σ ${energyStd.toFixed(2)}. Lower is better.`;
  const executionHint = `Tasks are ${taskEfficiency}% complete right now. This score blends tasks + habits.`;
  const volatilityHint = volatility >= 60
    ? `Big swings detected. Your output is inconsistent day to day.`
    : `Your swings are controlled. Keep your baseline stable.`;

  card.innerHTML = `
    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap;">
      <div>
        <div class="section-title">🧬 Productivity DNA</div>
        <div style="color:#E5E7EB; font-weight:900; font-size:1.05rem;">${summary.type}</div>
        <div style="margin-top:6px; color:#9CA3AF; line-height:1.4;">
          ${summary.line}<br>
          <span style="color:#E5E7EB; font-weight:800;">${summary.directive}</span>
        </div>
      </div>

      <div style="min-width:200px; text-align:right;">
        <div style="color:#9CA3AF; font-weight:800;">Window</div>
        <div style="color:#E5E7EB; font-weight:900;">Last 14 days</div>
        <div style="margin-top:8px; color:#9CA3AF; font-weight:800;">Streak</div>
        <div style="color:#E5E7EB; font-weight:900;">${streak} days</div>
      </div>
    </div>

    ${buildBar("Discipline", discipline, disciplineHint)}
    ${buildBar("Consistency", consistency, consistencyHint)}
    ${buildBar("Execution", execution, executionHint)}
    ${buildBar("Volatility", 100 - volatility, volatilityHint)}
  `;
}

// ===============================
// JOURNAL + SHADOW WORK ENGINE
// (Shadow work + normal journal history)
// ===============================
function getRandomShadowQuestion() {
  return window.shadowQuestions[Math.floor(Math.random() * window.shadowQuestions.length)];
}

function getJournalEntries() {
  try {
    const entries = JSON.parse(localStorage.getItem("journalEntries") || "[]");
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

function saveJournalEntries(entries) {
  localStorage.setItem("journalEntries", JSON.stringify(entries));
}

function formatJournalDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function refreshShadowQuestion() {
  const qEl = document.getElementById("shadowQuestionText");
  if (!qEl) return;
  qEl.textContent = getRandomShadowQuestion();
}

function renderJournal() {
  const page = document.getElementById("journalPage");
  if (!page) return;

  let container = document.getElementById("journalContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "journalContainer";
    container.className = "habit-section";
    page.innerHTML = ""; // keep journal page clean
    page.appendChild(container);
  }

  const question = getRandomShadowQuestion();
  const entries = getJournalEntries().slice().reverse(); // newest first

  container.innerHTML = `
    <div class="section-title">📓 Journal</div>

    <div style="
      margin-top:10px;
      padding:14px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,0.14);
      background:rgba(255,255,255,0.05);
    ">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div style="color:#E5E7EB; font-weight:900;">🧠 Shadow Work Prompt</div>
        <button onclick="refreshShadowQuestion()" style="
          padding:8px 12px; border-radius:10px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.16);
          color:white; cursor:pointer;
        ">New question</button>
      </div>

      <div id="shadowQuestionText" style="margin-top:10px; color:#E5E7EB; font-weight:700;">
        ${question}
      </div>

      <textarea id="journalInput" placeholder="Write your thoughts..."
        style="
          width:100%; height:130px; margin-top:12px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:12px; padding:10px; color:white;
          outline:none;
        "></textarea>

      <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
        <button onclick="saveJournalEntry()" style="
          padding:9px 14px; border-radius:10px;
          background:linear-gradient(135deg,#6366f1,#ec4899);
          color:white; border:none; cursor:pointer;
        ">Save Entry</button>

        <button onclick="clearJournalInput()" style="
          padding:9px 14px; border-radius:10px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.16);
          color:white; cursor:pointer;
        ">Clear</button>
      </div>
    </div>

    <div style="
      margin-top:14px;
      padding:14px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,0.14);
      background:rgba(255,255,255,0.05);
    ">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div style="color:#E5E7EB; font-weight:900;">🗂 Journal History</div>
        <div style="color:#9CA3AF; font-weight:800; font-size:0.9rem;">${entries.length} entries</div>
      </div>

      <div id="journalEntriesList" style="margin-top:12px; display:flex; flex-direction:column; gap:10px;">
        ${entries.length ? entries.map((e, idx) => {
          const safeText = (e?.text || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const date = formatJournalDate(e?.date || "");
          // because we reversed entries, the original index is (entries.length - 1 - idx)
          const originalIndex = (entries.length - 1 - idx);
          return `
            <div style="
              padding:12px;
              border-radius:12px;
              border:1px solid rgba(255,255,255,0.12);
              background:rgba(0,0,0,0.15);
            ">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div style="color:#9CA3AF; font-weight:800; font-size:0.85rem;">${date}</div>
                <button onclick="deleteJournalEntry(${originalIndex})" style="
                  background:none; border:none; color:#EF4444;
                  cursor:pointer; font-weight:900;
                ">Delete</button>
              </div>
              <div style="margin-top:8px; color:#E5E7EB; line-height:1.45; white-space:pre-wrap;">${safeText}</div>
            </div>
          `;
        }).join("") : `
          <div style="color:#9CA3AF;">No journal entries yet. Save your first one above.</div>
        `}
      </div>
    </div>
  `;
}

function clearJournalInput() {
  const input = document.getElementById("journalInput");
  if (input) input.value = "";
}

function saveJournalEntry() {
  const input = document.getElementById("journalInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const question = document.getElementById("shadowQuestionText")?.textContent?.trim() || "";

  const entries = getJournalEntries();
  entries.push({
    date: new Date().toISOString(),
    prompt: question,
    text
  });

  saveJournalEntries(entries);

  input.value = "";
  renderJournal();
}

function deleteJournalEntry(index) {
  const entries = getJournalEntries();
  if (index < 0 || index >= entries.length) return;
  entries.splice(index, 1);
  saveJournalEntries(entries);
  renderJournal();
}

// ===============================
// APP BOOT SYSTEM (ONLY ONE)
// - IMPORTANT: init modules BEFORE calling showPage()
//   so dashboard renders reliably (mood/habits won’t disappear)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  try { if (typeof initHabits === "function") initHabits(); } catch {}
  try { if (typeof initGoalsData === "function") initGoalsData(); } catch {}
  try { if (typeof initWorkoutData === "function") initWorkoutData(); } catch {}
  try { if (typeof initMoodData === "function") initMoodData(); } catch {}

  // Now render the initial page
  showPage("dashboard");

  // Keep these in sync after initial load too
  try { renderTodos(); } catch {}
  try { renderLifeScore(); } catch {}
  try { renderInsights(); } catch {}
  try { renderWeeklyGraph(); } catch {}
  try { renderDNAProfile(); } catch {}
});
// ===============================
// 🔒 HABIT SYNC ENGINE (SAFE PATCH)
// This does NOT change your habit system.
// It only standardizes how analytics read habit data.
// ===============================

window.__getHabitsSafe = function () {
  try {
    const raw = JSON.parse(localStorage.getItem("habitsData") || "{}");
    return typeof raw === "object" && raw ? raw : {};
  } catch {
    return {};
  }
};

window.__getHabitListSafe = function () {
  try {
    const raw = JSON.parse(localStorage.getItem("habitsList") || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

// unified habit completion reader (used by analytics)
window.getDayCompletion = function (dateKey) {
  const habits = window.__getHabitsSafe();
  const habitList = window.__getHabitListSafe();

  if (!habitList.length) {
    return { percent: 0, completed: 0, total: 0 };
  }

  const day = habits[dateKey] || {};
  let completed = 0;

  habitList.forEach(h => {
    if (day[h] === true) completed++;
  });

  const total = habitList.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { percent, completed, total };
};

// ===============================
// 🔄 FORCE DASHBOARD MODULES TO RESYNC
// ===============================
window.__syncDashboardHabits = function () {
  try { renderLifeScore(); } catch {}
  try { renderInsights(); } catch {}
  try { renderWeeklyGraph(); } catch {}
  try { renderDNAProfile(); } catch {}
};

// whenever habits change, resync analytics
const originalRenderHabits = window.renderHabits;
if (typeof originalRenderHabits === "function") {
  window.renderHabits = function () {
    originalRenderHabits();
    window.__syncDashboardHabits();
  };
}

// also resync on page load
document.addEventListener("DOMContentLoaded", () => {
  window.__syncDashboardHabits();
});
