// ===============================
// SAFE GLOBAL STATE
// ===============================
window.shadowQuestions = window.shadowQuestions || [
  // Balanced (psychological + warrior/discipline)
  { id: "sq_001", cat: "fear", tone: "deep", q: "What emotion did I avoid today — and what was I protecting?" },
  { id: "sq_002", cat: "trigger", tone: "deep", q: "What triggered me recently, and what does that reveal about my wound?" },
  { id: "sq_003", cat: "truth", tone: "deep", q: "What truth am I afraid to admit to myself?" },
  { id: "sq_004", cat: "pattern", tone: "deep", q: "What pattern keeps repeating in my life — and what payoff do I get from it?" },
  { id: "sq_005", cat: "desire", tone: "deep", q: "What do I secretly want but suppress — and why?" },
  { id: "sq_006", cat: "power", tone: "deep", q: "When was the last time I felt powerless — and what belief did that create?" },
  { id: "sq_007", cat: "belief", tone: "deep", q: "What belief is holding me back — and where did I learn it?" },
  { id: "sq_008", cat: "resent", tone: "deep", q: "Who do I resent — and what does that say about what I need?" },
  { id: "sq_009", cat: "shadow", tone: "deep", q: "What part of myself do I reject — and what would happen if I accepted it?" },
  { id: "sq_010", cat: "courage", tone: "warrior", q: "If fear vanished for 24 hours, what would I do immediately?" },
  { id: "sq_011", cat: "discipline", tone: "warrior", q: "Where am I negotiating with myself instead of committing?" },
  { id: "sq_012", cat: "identity", tone: "warrior", q: "What identity am I clinging to that no longer serves my future?" },
  { id: "sq_013", cat: "avoidance", tone: "warrior", q: "What am I procrastinating — and what pain am I avoiding?" },
  { id: "sq_014", cat: "standards", tone: "warrior", q: "What standard am I allowing that I would never accept from the man I want to become?" },
  { id: "sq_015", cat: "control", tone: "deep", q: "What am I trying to control — and what would letting go actually look like?" }
];

// ===============================
// SMALL UTILS (safe + reusable)
// ===============================
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isoDayKey(date = new Date()) {
  return new Date(date).toISOString().split("T")[0];
}

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
let todos = loadJSON("todos", []);

function saveTodos() {
  saveJSON("todos", todos);
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
  if (!todos[index]) return;
  todos[index].done = !todos[index].done;
  saveTodos();
  renderTodos();
  renderLifeScore();
}

function deleteTodo(index) {
  if (index < 0 || index >= todos.length) return;
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
            onclick="toggleTodo(${i})">${escapeHtml(todo.text)}</span>
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
    const today = isoDayKey();
    try {
      habitPercent = getDayCompletion(today).percent || 0;
    } catch {
      habitPercent = 0;
    }
  }

  const habitScore = Math.round((habitPercent / 100) * 50);

  let energyScore = 0;
  try {
    const moodData = loadJSON("moodData", {});
    const todayKey = isoDayKey();
    energyScore = Math.round(((moodData[todayKey]?.energy || 5) / 10) * 25);
  } catch {}

  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.done).length;
  const todoScore = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 20);

  let streakBonus = 0;
  try {
    streakBonus = Math.min(5, parseInt(localStorage.getItem("currentStreak") || "0"));
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
// JOURNAL + SHADOW WORK (QUICK + SESSION)
// ===============================
let shadowSessionState = {
  active: false,
  idx: 0,
  prompts: [],
  answers: []
};

function getShadowPool() {
  const pool = Array.isArray(window.shadowQuestions) ? window.shadowQuestions : [];
  return pool.filter(x => x && x.id && x.q);
}

function pickNonRepeatingQuestions(count = 3) {
  const pool = getShadowPool();
  if (!pool.length) return [];

  const used = loadJSON("shadowUsedIds", []);
  const unused = pool.filter(p => !used.includes(p.id));

  const source = unused.length >= count ? unused : pool; // if exhausted, allow reuse

  // shuffle
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);

  // update used ids (keep it from growing forever)
  const newUsed = [...used, ...picked.map(p => p.id)];
  const trimmed = newUsed.slice(-120);
  saveJSON("shadowUsedIds", trimmed);

  return picked;
}

function getRandomShadowQuestion() {
  const pool = getShadowPool();
  if (!pool.length) return { id: "sq_fallback", q: "What did I avoid today — and why?" };
  return pool[Math.floor(Math.random() * pool.length)];
}

function startShadowSession() {
  const prompts = pickNonRepeatingQuestions(3);
  shadowSessionState = {
    active: true,
    idx: 0,
    prompts,
    answers: new Array(prompts.length).fill("")
  };
  renderJournal();
}

function endShadowSession(cancel = false) {
  shadowSessionState.active = false;
  shadowSessionState.idx = 0;
  shadowSessionState.prompts = [];
  shadowSessionState.answers = [];
  if (!cancel) {
    // nothing
  }
  renderJournal();
}

function goSessionNext() {
  if (!shadowSessionState.active) return;

  const ta = document.getElementById("shadowSessionAnswer");
  const current = shadowSessionState.idx;
  if (ta) shadowSessionState.answers[current] = ta.value || "";

  if (shadowSessionState.idx < shadowSessionState.prompts.length - 1) {
    shadowSessionState.idx += 1;
    renderJournal();
  }
}

function goSessionBack() {
  if (!shadowSessionState.active) return;

  const ta = document.getElementById("shadowSessionAnswer");
  const current = shadowSessionState.idx;
  if (ta) shadowSessionState.answers[current] = ta.value || "";

  if (shadowSessionState.idx > 0) {
    shadowSessionState.idx -= 1;
    renderJournal();
  }
}

function finishShadowSession() {
  if (!shadowSessionState.active) return;

  const ta = document.getElementById("shadowSessionAnswer");
  const current = shadowSessionState.idx;
  if (ta) shadowSessionState.answers[current] = ta.value || "";

  const prompts = shadowSessionState.prompts;
  const answers = shadowSessionState.answers;

  // basic validation: allow empty, but warn
  const filledCount = answers.filter(a => String(a || "").trim().length > 0).length;
  if (filledCount === 0) {
    alert("Write at least something before finishing.");
    return;
  }

  const sessions = loadJSON("shadowSessions", []);
  sessions.push({
    id: `ss_${Date.now()}`,
    date: new Date().toISOString(),
    prompts: prompts.map(p => ({ id: p.id, cat: p.cat || "", tone: p.tone || "", q: p.q })),
    answers: answers.map(a => String(a || "").trim())
  });
  saveJSON("shadowSessions", sessions);

  alert("Shadow session saved.");
  endShadowSession(false);
}

function saveJournalEntry() {
  const textEl = document.getElementById("journalInput");
  const qEl = document.getElementById("journalQuestionText");

  const text = (textEl ? textEl.value : "").trim();
  if (!text) return;

  const question = (qEl ? qEl.textContent : "").trim();

  const entries = loadJSON("journalEntries", []);
  entries.push({
    id: `je_${Date.now()}`,
    date: new Date().toISOString(),
    question,
    text
  });
  saveJSON("journalEntries", entries);

  alert("Journal saved.");
  renderJournal();
}

function renderJournalHistory() {
  const entries = loadJSON("journalEntries", []).slice(-5).reverse();
  const sessions = loadJSON("shadowSessions", []).slice(-3).reverse();

  const entriesHtml = entries.length
    ? entries.map(e => {
        const d = new Date(e.date);
        return `
          <div style="padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); margin-top:10px;">
            <div style="display:flex; justify-content:space-between; gap:10px;">
              <div style="color:#E5E7EB; font-weight:800;">Quick Entry</div>
              <div style="color:#9CA3AF; font-weight:700;">${d.toLocaleDateString()}</div>
            </div>
            ${e.question ? `<div style="margin-top:6px; color:#9CA3AF;">${escapeHtml(e.question)}</div>` : ""}
            <div style="margin-top:8px; color:#E5E7EB; white-space:pre-wrap;">${escapeHtml(e.text)}</div>
          </div>
        `;
      }).join("")
    : `<div style="color:#9CA3AF; margin-top:10px;">No quick entries yet.</div>`;

  const sessionsHtml = sessions.length
    ? sessions.map(s => {
        const d = new Date(s.date);
        const filled = (s.answers || []).filter(a => String(a || "").trim().length).length;
        return `
          <div style="padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); margin-top:10px;">
            <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
              <div style="color:#E5E7EB; font-weight:900;">Shadow Session</div>
              <div style="color:#9CA3AF; font-weight:700;">${d.toLocaleDateString()}</div>
            </div>
            <div style="margin-top:6px; color:#9CA3AF;">${filled}/${(s.answers || []).length} answers filled</div>
          </div>
        `;
      }).join("")
    : `<div style="color:#9CA3AF; margin-top:10px;">No shadow sessions yet.</div>`;

  return `
    <div style="margin-top:16px;">
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <div style="flex:1; min-width:260px;">
          <div style="color:white; font-weight:900;">Recent Quick Entries</div>
          ${entriesHtml}
        </div>
        <div style="flex:1; min-width:260px;">
          <div style="color:white; font-weight:900;">Recent Shadow Sessions</div>
          ${sessionsHtml}
        </div>
      </div>
    </div>
  `;
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

  // Session Mode UI
  if (shadowSessionState.active) {
    const total = shadowSessionState.prompts.length;
    const idx = shadowSessionState.idx;
    const prompt = shadowSessionState.prompts[idx] || { q: "—" };
    const progressPct = total ? Math.round(((idx + 1) / total) * 100) : 0;
    const currentAnswer = shadowSessionState.answers[idx] || "";

    container.innerHTML = `
      <div class="section-title">🧠 Shadow Work Session</div>

      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <div style="color:#E5E7EB; font-weight:900;">Question ${idx + 1} of ${total}</div>
        <button onclick="endShadowSession(true)" style="padding:8px 12px; border-radius:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16); color:#E5E7EB; cursor:pointer;">
          Cancel
        </button>
      </div>

      <div style="margin-top:10px; height:10px; border-radius:999px; background:rgba(255,255,255,0.08); overflow:hidden;">
        <div style="height:100%; width:${progressPct}%; border-radius:999px; background:linear-gradient(135deg,#6366f1,#ec4899);"></div>
      </div>

      <div style="margin-top:14px; color:#9CA3AF; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; font-size:0.75rem;">
        ${escapeHtml(prompt.cat || "session")} • ${escapeHtml(prompt.tone || "balanced")}
      </div>

      <div style="margin-top:8px; color:#E5E7EB; font-weight:900; font-size:1.05rem; line-height:1.35;">
        ${escapeHtml(prompt.q)}
      </div>

      <textarea id="shadowSessionAnswer" placeholder="Write your answer..."
        style="margin-top:12px; width:100%; height:140px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:10px; color:white;">${escapeHtml(currentAnswer)}</textarea>

      <div style="display:flex; gap:10px; margin-top:12px;">
        <button onclick="goSessionBack()"
          style="flex:1; padding:10px 14px; border-radius:12px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16); color:#E5E7EB; cursor:pointer;"
          ${idx === 0 ? "disabled" : ""}>
          Back
        </button>

        ${
          idx < total - 1
            ? `<button onclick="goSessionNext()" style="flex:1; padding:10px 14px; border-radius:12px; background:linear-gradient(135deg,#6366f1,#ec4899); color:white; border:none; cursor:pointer;">Next</button>`
            : `<button onclick="finishShadowSession()" style="flex:1; padding:10px 14px; border-radius:12px; background:linear-gradient(135deg,#22c55e,#16a34a); color:white; border:none; cursor:pointer;">Finish & Save</button>`
        }
      </div>

      ${renderJournalHistory()}
    `;
    return;
  }

  // Quick Mode UI (your current style) + start session button
  const qObj = getRandomShadowQuestion();

  container.innerHTML = `
    <div class="section-title">📝 Journal</div>

    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:12px;">
      <button onclick="startShadowSession()" style="padding:10px 14px; border-radius:12px; background:linear-gradient(135deg,#6366f1,#ec4899); color:white; border:none; cursor:pointer;">
        Start Shadow Session (3 Qs)
      </button>

      <button onclick="renderJournal()" style="padding:10px 14px; border-radius:12px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16); color:#E5E7EB; cursor:pointer;">
        New Prompt
      </button>

      <div style="color:#9CA3AF; font-weight:700;">
        Quick Shadow Prompt (single entry)
      </div>
    </div>

    <div id="journalQuestionText" style="margin-bottom:10px; color:#E5E7EB; font-weight:800;">
      ${escapeHtml(qObj.q)}
    </div>

    <textarea id="journalInput" placeholder="Write your thoughts..."
      style="width:100%; height:140px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:10px; color:white;"></textarea>

    <button onclick="saveJournalEntry()" style="margin-top:10px; padding:10px 14px; border-radius:12px; background:linear-gradient(135deg,#6366f1,#ec4899); color:white; border:none; cursor:pointer;">
      Save Entry
    </button>

    ${renderJournalHistory()}
  `;
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
