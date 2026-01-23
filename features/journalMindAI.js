// ===============================
// JOURNAL MIND PATTERNS AI MODULE
// (SAFE ADD-ON — DOES NOT TOUCH app.js)
// ===============================

(function () {
  function getJournalEntriesSafe() {
    try {
      const entries = JSON.parse(localStorage.getItem("journalEntries") || "[]");
      return Array.isArray(entries) ? entries : [];
    } catch {
      return [];
    }
  }

  function analyzeText(text) {
    const lower = text.toLowerCase();

    const emotions = {
      anger: ["angry", "mad", "furious", "rage"],
      fear: ["afraid", "scared", "fear", "anxious", "panic"],
      sadness: ["sad", "depressed", "lonely", "hurt", "cry"],
      joy: ["happy", "excited", "grateful", "love", "peace"],
      shame: ["ashamed", "guilt", "embarrassed"],
      desire: ["want", "dream", "wish", "crave"]
    };

    const themes = {
      control: ["control", "power", "dominant"],
      rejection: ["rejected", "ignored", "abandoned"],
      validation: ["approval", "validation", "attention"],
      growth: ["improve", "better", "discipline", "progress"],
      identity: ["who am i", "identity", "self"],
      freedom: ["free", "escape", "break"]
    };

    const emotionScore = {};
    const themeScore = {};

    for (const [key, words] of Object.entries(emotions)) {
      emotionScore[key] = words.reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0);
    }

    for (const [key, words] of Object.entries(themes)) {
      themeScore[key] = words.reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0);
    }

    const topEmotion = Object.entries(emotionScore).sort((a, b) => b[1] - a[1])[0][0];
    const topTheme = Object.entries(themeScore).sort((a, b) => b[1] - a[1])[0][0];

    return { topEmotion, topTheme };
  }

  function generateMindProfile(entries) {
    if (!entries.length) {
      return {
        emotion: "Not enough data yet",
        theme: "Start journaling to unlock insights",
        pattern: "No pattern detected",
        directive: "Write consistently for 3–5 days"
      };
    }

    const combinedText = entries.map(e => e.text).join(" ");
    const { topEmotion, topTheme } = analyzeText(combinedText);

    const patterns = {
      anger: "Suppressed frustration building over time",
      fear: "Avoidance of uncertainty and risk",
      sadness: "Emotional withdrawal pattern",
      joy: "Positive reinforcement loop",
      shame: "Self-judgment cycle",
      desire: "Unfulfilled ambition loop"
    };

    const directives = {
      control: "Practice letting go of one small thing daily",
      rejection: "Strengthen self-validation habits",
      validation: "Detach identity from external approval",
      growth: "Double down on disciplined routines",
      identity: "Clarify personal values in writing",
      freedom: "Design one intentional act of independence"
    };

    return {
      emotion: topEmotion,
      theme: topTheme,
      pattern: patterns[topEmotion] || "Mixed emotional state",
      directive: directives[topTheme] || "Observe your reactions consciously"
    };
  }

  function renderMindAI() {
    const journalPage = document.getElementById("journalPage");
    if (!journalPage) return;

    let card = document.getElementById("mindAICard");
    if (!card) {
      card = document.createElement("div");
      card.id = "mindAICard";
      card.className = "habit-section";
      journalPage.appendChild(card);
    }

    const entries = getJournalEntriesSafe();
    const profile = generateMindProfile(entries);

    card.innerHTML = `
      <div class="section-title">🧬 Mind Patterns</div>
      <div style="margin-top:10px; line-height:1.6; color:#E5E7EB;">
        <div><strong>Dominant Emotion:</strong> ${profile.emotion}</div>
        <div><strong>Core Theme:</strong> ${profile.theme}</div>
        <div style="margin-top:6px;"><strong>Psychological Pattern:</strong> ${profile.pattern}</div>
        <div style="margin-top:8px; color:#FACC15;"><strong>Directive:</strong> ${profile.directive}</div>
      </div>
    `;
  }

  // Auto-run when journal page is shown
  document.addEventListener("DOMContentLoaded", () => {
    renderMindAI();
  });

  // Re-render when journal updates
  window.renderMindAI = renderMindAI;
})();
