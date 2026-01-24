/* ===============================
   JOURNAL INTELLIGENCE ENGINE (SAFE VERSION)
   Zero impact on dashboard & navigation
   =============================== */

(function () {
  "use strict";

  const STORAGE_KEYS = ["journalEntries"];

  function safeParse(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  }

  function getEntries() {
    let entries = [];
    for (const key of STORAGE_KEYS) {
      const data = safeParse(key);
      if (Array.isArray(data) && data.length) {
        entries = data.map(e => ({
          text: e.text || "",
          date: e.date || ""
        }));
        break;
      }
    }
    return entries;
  }

  const emotions = {
    anxiety: ["anxious", "worry", "fear", "panic"],
    anger: ["angry", "mad", "hate"],
    sadness: ["sad", "depressed", "lonely"],
    confidence: ["confident", "strong", "disciplined"],
    gratitude: ["grateful", "thankful"]
  };

  function analyze(text) {
    text = text.toLowerCase();
    let scores = {};
    for (let key in emotions) {
      scores[key] = emotions[key].filter(w => text.includes(w)).length;
    }
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
  }

  function renderJournalIntelligence() {
    const page = document.getElementById("journalPage");
    if (!page || !page.classList.contains("active")) return;

    let panel = document.getElementById("journalIntelligencePanel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "journalIntelligencePanel";
      panel.className = "habit-section";
      panel.style.marginTop = "12px";
      page.appendChild(panel);
    }

    const entries = getEntries();
    const combinedText = entries.map(e => e.text).join(" ");
    const dominantEmotion = analyze(combinedText);

    panel.innerHTML = `
      <div class="section-title">🧠 Journal Intelligence</div>
      <div style="color:#9CA3AF; margin-top:6px;">
        Total entries: ${entries.length}
      </div>
      <div style="margin-top:8px; font-weight:800; color:#E5E7EB;">
        Dominant emotional pattern: ${dominantEmotion.toUpperCase()}
      </div>
      <div style="margin-top:8px; color:#9CA3AF;">
        Insight: ${
          dominantEmotion === "anxiety" ? "You may be overthinking recurring situations." :
          dominantEmotion === "anger" ? "There may be unresolved boundaries or frustrations." :
          dominantEmotion === "sadness" ? "Your writing reflects emotional heaviness or loss." :
          dominantEmotion === "confidence" ? "Your mindset shows growth and self-belief." :
          dominantEmotion === "gratitude" ? "Your focus is shifting toward appreciation." :
          "Your emotional state is balanced."
        }
      </div>
    `;
  }

  // Run ONLY when journal page is opened
  const originalShowPage = window.showPage;
  if (typeof originalShowPage === "function") {
    window.showPage = function (page) {
      originalShowPage(page);
      if (page === "journal") {
        setTimeout(renderJournalIntelligence, 50);
      }
    };
  }

})();
