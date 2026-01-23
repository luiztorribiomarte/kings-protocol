// ============================================
// JOURNAL MODULE (Structured Journal + Shadow Work Engine)
// ============================================

let journalEntries = JSON.parse(localStorage.getItem("journalEntries")) || [];
let shadowEntries = JSON.parse(localStorage.getItem("shadowEntries")) || [];

// --------------------
// SHADOW WORK QUESTIONS
// --------------------
const shadowQuestions = [
  "What pattern keeps repeating in your life?",
  "What are you afraid to admit about yourself?",
  "Who do you secretly envy, and why?",
  "What belief about yourself might be holding you back?",
  "What part of your personality do you hide from others?",
  "When was the last time you felt truly insecure?",
  "What would your life look like if fear disappeared?",
  "What lie do you tell yourself most often?",
  "What childhood experience still affects your decisions?",
  "If no one judged you, what would you do differently?",
  "What emotion do you avoid feeling?",
  "What do you fear losing the most?",
  "What version of yourself are you afraid to become?",
  "When do you feel most powerless?",
  "What are you pretending not to care about?"
];

let currentShadowQuestion = "";

// --------------------
// UTILITIES
// --------------------
function saveJournalData() {
  localStorage.setItem("journalEntries", JSON.stringify(journalEntries));
  localStorage.setItem("shadowEntries", JSON.stringify(shadowEntries));
}

function getNow() {
  return new Date().toLocaleString();
}

function getRandomShadowQuestion() {
  return shadowQuestions[Math.floor(Math.random() * shadowQuestions.length)];
}

// --------------------
// RENDER JOURNAL PAGE
// --------------------
function renderJournal() {
  const container = document.getElementById("journalContainer");
  if (!container) return;

  if (!currentShadowQuestion) currentShadowQuestion = getRandomShadowQuestion();

  container.innerHTML = `
    <div class="habit-section">
      <div class="section-title">📝 Structured Journal</div>

      <input id="journalTitle" class="form-input" placeholder="Title..." />
      <textarea id="journalWins" class="form-input" rows="2" placeholder="Wins today..."></textarea>
      <textarea id="journalStruggles" class="form-input" rows="2" placeholder="Struggles today..."></textarea>
      <textarea id="journalLessons" class="form-input" rows="2" placeholder="Lessons / insights..."></textarea>
      <textarea id="journalGratitude" class="form-input" rows="2" placeholder="Gratitude..."></textarea>
      <textarea id="journalThoughts" class="form-input" rows="3" placeholder="Free thoughts..."></textarea>

      <button class="form-submit" onclick="addJournalEntry()">Save Entry</button>
    </div>

    <div class="habit-section">
      <div class="section-title">🧠 Shadow Work Session</div>

      <div style="margin-bottom:10px; font-weight:700; color:white;">
        Question:
      </div>

      <div id="shadowQuestionBox" style="
        padding:14px;
        border-radius:12px;
        background:rgba(255,255,255,0.08);
        border:1px solid rgba(255,255,255,0.15);
        margin-bottom:10px;
        font-weight:600;
      ">
        ${currentShadowQuestion}
      </div>

      <textarea id="shadowAnswer" class="form-input" rows="3" placeholder="Your answer..."></textarea>

      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="form-submit" onclick="newShadowQuestion()">New Question</button>
        <button class="form-submit" onclick="saveShadowEntry()">Save Answer</button>
      </div>
    </div>

    <div class="habit-section">
      <div class="section-title">📚 Journal History</div>
      <div id="journalHistory"></div>
    </div>

    <div class="habit-section">
      <div class="section-title">🧩 Shadow Work History</div>
      <div id="shadowHistory"></div>
    </div>
  `;

  renderJournalHistory();
  renderShadowHistory();
}

// --------------------
// JOURNAL ACTIONS
// --------------------
function addJournalEntry() {
  const entry = {
    title: document.getElementById("journalTitle").value,
    wins: document.getElementById("journalWins").value,
    struggles: document.getElementById("journalStruggles").value,
    lessons: document.getElementById("journalLessons").value,
    gratitude: document.getElementById("journalGratitude").value,
    thoughts: document.getElementById("journalThoughts").value,
    date: getNow()
  };

  if (!entry.title && !entry.thoughts) return;

  journalEntries.unshift(entry);
  saveJournalData();
  renderJournal();
}

function newShadowQuestion() {
  currentShadowQuestion = getRandomShadowQuestion();
  renderJournal();
}

function saveShadowEntry() {
  const answer = document.getElementById("shadowAnswer").value;
  if (!answer.trim()) return;

  shadowEntries.unshift({
    question: currentShadowQuestion,
    answer,
    date: getNow()
  });

  saveJournalData();
  renderJournal();
}

// --------------------
// HISTORY RENDERING
// --------------------
function renderJournalHistory() {
  const container = document.getElementById("journalHistory");
  if (!container) return;

  if (!journalEntries.length) {
    container.innerHTML = `<div style="color:#9CA3AF;">No journal entries yet.</div>`;
    return;
  }

  container.innerHTML = journalEntries.map((e, i) => `
    <div style="
      margin-bottom:12px;
      padding:12px;
      border-radius:12px;
      background:rgba(255,255,255,0.05);
      border:1px solid rgba(255,255,255,0.12);
    ">
      <div style="font-weight:800;">${e.title || "Untitled"}</div>
      <div style="font-size:0.8rem; color:#9CA3AF;">${e.date}</div>

      <div style="margin-top:6px; font-size:0.9rem;">
        ${e.thoughts || ""}
      </div>

      <button onclick="deleteJournalEntry(${i})"
        style="margin-top:6px; background:none; border:none; color:#EF4444; cursor:pointer;">
        Delete
      </button>
    </div>
  `).join("");
}

function renderShadowHistory() {
  const container = document.getElementById("shadowHistory");
  if (!container) return;

  if (!shadowEntries.length) {
    container.innerHTML = `<div style="color:#9CA3AF;">No shadow work answers yet.</div>`;
    return;
  }

  container.innerHTML = shadowEntries.map((e, i) => `
    <div style="
      margin-bottom:12px;
      padding:12px;
      border-radius:12px;
      background:rgba(255,255,255,0.05);
      border:1px solid rgba(255,255,255,0.12);
    ">
      <div style="font-weight:700;">Q: ${e.question}</div>
      <div style="margin-top:6px;">A: ${e.answer}</div>
      <div style="font-size:0.8rem; color:#9CA3AF; margin-top:4px;">${e.date}</div>

      <button onclick="deleteShadowEntry(${i})"
        style="margin-top:6px; background:none; border:none; color:#EF4444; cursor:pointer;">
        Delete
      </button>
    </div>
  `).join("");
}

// --------------------
// DELETE FUNCTIONS
// --------------------
function deleteJournalEntry(index) {
  journalEntries.splice(index, 1);
  saveJournalData();
  renderJournal();
}

function deleteShadowEntry(index) {
  shadowEntries.splice(index, 1);
  saveJournalData();
  renderJournal();
}
