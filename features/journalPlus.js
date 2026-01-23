// ===============================
// JOURNAL PLUS SYSTEM (MODULAR)
// DOES NOT TOUCH app.js
// ===============================

window.journalPlus = window.journalPlus || {};

// ===============================
// JOURNAL MODES
// ===============================
journalPlus.modes = [
  { id: "shadow", label: "Shadow Work 🧠" },
  { id: "free", label: "Free Journal ✍" },
  { id: "gratitude", label: "Gratitude 🌿" }
];

journalPlus.currentMode = "shadow";

// ===============================
// STORAGE HELPERS
// ===============================
journalPlus.getEntries = function (mode) {
  try {
    const data = JSON.parse(localStorage.getItem("journalPlus_" + mode) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

journalPlus.saveEntries = function (mode, entries) {
  localStorage.setItem("journalPlus_" + mode, JSON.stringify(entries));
};

// ===============================
// EMOTION DETECTION (KEYWORD ENGINE)
// ===============================
journalPlus.emotionKeywords = {
  anger: ["angry", "mad", "rage", "hate", "furious"],
  fear: ["afraid", "scared", "fear", "anxious", "nervous"],
  sadness: ["sad", "empty", "depressed", "down", "lonely"],
  motivation: ["motivated", "driven", "focused", "excited"],
  confidence: ["confident", "strong", "powerful", "proud"],
  confusion: ["confused", "lost", "uncertain"],
  ambition: ["goal", "dream", "success", "win"]
};

journalPlus.detectEmotions = function (text) {
  const lower = text.toLowerCase();
  const tags = [];

  for (const emotion in journalPlus.emotionKeywords) {
    for (const word of journalPlus.emotionKeywords[emotion]) {
      if (lower.includes(word)) {
        tags.push(emotion);
        break;
      }
    }
  }

  return tags.length ? tags : ["neutral"];
};

// ===============================
// DOM RENDER
// ===============================
journalPlus.render = function () {
  const page = document.getElementById("journalPage");
  if (!page) return;

  let container = document.getElementById("journalPlusContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "journalPlusContainer";
    container.className = "habit-section";
    page.innerHTML = "";
    page.appendChild(container);
  }

  const modeTabs = journalPlus.modes.map(m => `
    <button onclick="journalPlus.switchMode('${m.id}')"
      style="
        padding:8px 12px;
        border-radius:10px;
        border:1px solid rgba(255,255,255,0.15);
        background:${journalPlus.currentMode === m.id ? 'linear-gradient(135deg,#6366f1,#ec4899)' : 'rgba(255,255,255,0.05)'};
        color:white;
        cursor:pointer;
        font-weight:700;
      ">
      ${m.label}
    </button>
  `).join("");

  const entries = journalPlus.getEntries(journalPlus.currentMode).slice().reverse();

  container.innerHTML = `
    <div class="section-title">🧠 Journal System</div>

    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
      ${modeTabs}
    </div>

    <textarea id="journalPlusInput"
      placeholder="Write here..."
      style="
        width:100%;
        height:120px;
        background:rgba(255,255,255,0.05);
        border:1px solid rgba(255,255,255,0.15);
        border-radius:12px;
        padding:10px;
        color:white;
      "></textarea>

    <button onclick="journalPlus.saveEntry()"
      style="
        margin-top:10px;
        padding:9px 14px;
        border-radius:10px;
        background:linear-gradient(135deg,#6366f1,#ec4899);
        color:white;
        border:none;
        cursor:pointer;
        font-weight:800;
      ">
      Save Entry
    </button>

    <div style="margin-top:14px; font-weight:900; color:#E5E7EB;">
      History (${entries.length})
    </div>

    <div style="margin-top:10px; display:flex; flex-direction:column; gap:10px;">
      ${entries.map(e => `
        <div style="
          padding:12px;
          border-radius:12px;
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(0,0,0,0.15);
        ">
          <div style="color:#9CA3AF; font-size:0.85rem;">
            ${new Date(e.date).toLocaleString()}
          </div>
          <div style="margin-top:6px; color:#E5E7EB; white-space:pre-wrap;">
            ${e.text}
          </div>
          <div style="margin-top:6px; color:#FACC15; font-size:0.85rem;">
            Tags: ${e.tags.join(", ")}
          </div>
        </div>
      `).join("") || `<div style="color:#9CA3AF;">No entries yet.</div>`}
    </div>

    <div id="mindPatternPanel" style="
      margin-top:16px;
      padding:12px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,0.15);
      background:rgba(255,255,255,0.04);
      font-weight:800;
      color:#E5E7EB;
    ">
      ${journalPlus.getMindPattern()}
    </div>
  `;
};

// ===============================
// MODE SWITCH
// ===============================
journalPlus.switchMode = function (mode) {
  journalPlus.currentMode = mode;
  journalPlus.render();
};

// ===============================
// SAVE ENTRY
// ===============================
journalPlus.saveEntry = function () {
  const input = document.getElementById("journalPlusInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const tags = journalPlus.detectEmotions(text);
  const entries = journalPlus.getEntries(journalPlus.currentMode);

  entries.push({
    date: new Date().toISOString(),
    text,
    tags
  });

  journalPlus.saveEntries(journalPlus.currentMode, entries);
  input.value = "";
  journalPlus.render();
};

// ===============================
// MIND PATTERN ENGINE
// ===============================
journalPlus.getMindPattern = function () {
  const allModes = journalPlus.modes.map(m => m.id);
  const tagCount = {};

  allModes.forEach(mode => {
    const entries = journalPlus.getEntries(mode);
    entries.forEach(e => {
      e.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });
  });

  let dominant = "neutral";
  let max = 0;

  for (const tag in tagCount) {
    if (tagCount[tag] > max) {
      max = tagCount[tag];
      dominant = tag;
    }
  }

  return `Dominant mental pattern: ${dominant.toUpperCase()}`;
};

// ===============================
// AUTO HOOK INTO YOUR APP
// ===============================
(function attachJournalPlus() {
  const originalShowPage = window.showPage;

  if (typeof originalShowPage === "function") {
    window.showPage = function (page) {
      originalShowPage(page);
      if (page === "journal") {
        journalPlus.render();
      }
    };
  }
})();
