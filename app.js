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
    document.getElementById("modalBody").innerHTML = "";
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
    if (typeof renderMoodTracker === "function") renderMoodTracker();
    if (typeof renderHabits === "function") renderHabits();
    if (typeof renderTodos === "function") renderTodos();
    if (typeof renderLifeScore === "function") renderLifeScore();
    if (typeof renderInsights === "function") renderInsights();
    if (typeof renderWeeklyGraph === "function") renderWeeklyGraph();
    if (typeof renderDNAProfile === "function") renderDNAProfile();
  }

  if (page === "journal") {
    if (typeof renderJournal === "function") renderJournal();
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
  if (dateEl) dateEl.textContent = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
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
}

function toggleTodo(index) {
  todos[index].done = !todos[index].done;
  saveTodos();
  renderTodos();
  renderLifeScore();
}

function deleteTodo(index) {
  todos.splice(index, 1);
  saveTodos();
  renderTodos();
  renderLifeScore();
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

  let habitPercent = 0;
  if (typeof getDayCompletion === "function") {
    const today = new Date().toISOString().split("T")[0];
    habitPercent = getDayCompletion(today).percent || 0;
  }

  const habitScore = Math.round((habitPercent / 100) * 50);

  let energyScore = 0;
  try {
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const todayKey = new Date().toISOString().split("T")[0];
    energyScore = Math.round(((moodData[todayKey]?.energy || 5) / 10) * 25);
  } catch {}

  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.done).length;
  const todoScore = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 20);

  let streakBonus = Math.min(5, parseInt(localStorage.getItem("currentStreak") || "0"));

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
// JOURNAL + SHADOW WORK ENGINE ✅
// ===============================
function getRandomShadowQuestion() {
  return window.shadowQuestions[Math.floor(Math.random() * window.shadowQuestions.length)];
}

function renderJournal() {
  const page = document.getElementById("journalPage");
  if (!page) return;

  let container = document.getElementById("journalContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "journalContainer";
    container.className = "habit-section";
    page.appendChild(container);
  }

  const question = getRandomShadowQuestion();

  container.innerHTML = `
    <div class="section-title">🧠 Shadow Work Journal</div>
    <div style="margin-bottom:10px; color:#E5E7EB; font-weight:700;">
      ${question}
    </div>
    <textarea id="journalInput" placeholder="Write your thoughts..." 
      style="width:100%; height:120px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:10px; color:white;"></textarea>
    <button onclick="saveJournalEntry()" style="margin-top:10px; padding:8px 14px; border-radius:10px; background:linear-gradient(135deg,#6366f1,#ec4899); color:white; border:none; cursor:pointer;">
      Save Entry
    </button>
  `;
}

function saveJournalEntry() {
  const text = document.getElementById("journalInput").value.trim();
  if (!text) return;

  const entries = JSON.parse(localStorage.getItem("journalEntries") || "[]");
  entries.push({ date: new Date().toISOString(), text });
  localStorage.setItem("journalEntries", JSON.stringify(entries));

  alert("Journal saved.");
  renderJournal();
}

// ===============================
// APP BOOT SYSTEM (ONLY ONE)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  showPage("dashboard");

  if (typeof initHabits === "function") initHabits();
  if (typeof initGoalsData === "function") initGoalsData();
  if (typeof initWorkoutData === "function") initWorkoutData();
  if (typeof initMoodData === "function") initMoodData();

  renderTodos();
  renderLifeScore();
});
