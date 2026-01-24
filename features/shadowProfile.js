/* ==========================================================
   SHADOW PROFILE ENGINE (Warrior / King Mindset)
   File: features/shadowProfile.js

   Goals:
   - Do NOT modify app.js
   - Safely "hook" into renderJournal / saveJournalEntry / deleteJournalEntry
   - Read journalEntries from localStorage
   - Build an evolving warrior-style Shadow Profile
   - Inject UI into the Journal page only
   ========================================================== */

(function () {
  "use strict";

  // -------------------------------
  // Helpers
  // -------------------------------
  function safeJsonParse(raw, fallback) {
    try {
      const v = JSON.parse(raw);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function uniq(arr) {
    return Array.from(new Set(arr));
  }

  function normalizeText(s) {
    return (s || "")
      .toLowerCase()
      .replace(/[^\w\s']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function countMatches(text, keywords) {
    if (!text) return 0;
    let count = 0;
    for (const k of keywords) {
      // word-boundary-ish: handles multi-word phrases too
      const pattern = new RegExp(`(^|\\s)${escapeRegExp(k)}(\\s|$)`, "g");
      const matches = text.match(pattern);
      if (matches) count += matches.length;
    }
    return count;
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function scoreTo100(raw, scale) {
    // raw can grow; compress it into 0-100 with a soft cap
    const v = (raw / Math.max(1, scale)) * 100;
    return clamp(Math.round(v), 0, 100);
  }

  function getEntries() {
    const entries = safeJsonParse(localStorage.getItem("journalEntries") || "[]", []);
    return Array.isArray(entries) ? entries : [];
  }

  function lastNDaysEntries(entries, nDays) {
    const cutoff = Date.now() - nDays * 24 * 60 * 60 * 1000;
    return entries.filter(e => {
      const t = new Date(e?.date || e?.createdAt || 0).getTime();
      return Number.isFinite(t) && t >= cutoff;
    });
  }

  // -------------------------------
  // Warrior Lexicon (tunable)
  // -------------------------------
  const LEX = {
    // core states
    anger: [
      "angry", "anger", "mad", "furious", "rage", "resent", "resentment",
      "irritated", "pissed", "frustrated", "frustration", "hate"
    ],
    fear: [
      "fear", "scared", "anxious", "anxiety", "worry", "worried", "panic",
      "nervous", "afraid", "dread", "overthink", "overthinking"
    ],
    shame: [
      "shame", "ashamed", "embarrassed", "humiliated", "guilt", "guilty",
      "unworthy", "not enough", "inferior"
    ],
    sadness: [
      "sad", "down", "depressed", "lonely", "grief", "heartbroken",
      "hopeless", "empty", "tired"
    ],

    // identity / mission
    identity: [
      "identity", "who am i", "who i am", "myself", "self image", "self-image",
      "confidence", "respect", "legacy", "purpose", "mission", "calling"
    ],

    // relationships / women / attachment patterns
    relationships: [
      "woman", "women", "girl", "girls", "relationship", "dating", "girlfriend",
      "wife", "love", "attract", "attraction", "partner", "emotionally",
      "validation", "attention"
    ],

    // discipline / execution / power
    discipline: [
      "discipline", "consistent", "consistency", "routine", "habit", "habits",
      "execute", "execution", "work", "grind", "focus", "locked in", "lock in",
      "commit", "committed", "non negotiable", "non-negotiable"
    ],

    // self-worth / standards / boundaries
    standards: [
      "deserve", "standards", "boundary", "boundaries", "respect myself",
      "self worth", "self-worth", "value", "values", "deal breaker",
      "settle", "settling"
    ],

    // healing / growth / reframes
    growth: [
      "learn", "growth", "improve", "improvement", "heal", "healing",
      "level up", "level-up", "upgrade", "better", "progress", "transform"
    ],

    // language that signals coping styles
    copingAvoidance: [
      "avoid", "avoidance", "ignore", "numb", "numbing", "escape", "escapism",
      "distraction", "scroll", "porn", "weed", "drink", "alcohol"
    ],
    copingRationalize: [
      "it is what it is", "doesn't matter", "whatever", "i guess", "maybe",
      "probably", "just", "fine", "no big deal"
    ],

    // power language (positive)
    power: [
      "power", "strong", "strength", "dominant", "control", "leader", "king",
      "warrior", "discipline", "self mastery", "self-mastery", "execute"
    ]
  };

  // -------------------------------
  // Profile builder
  // -------------------------------
  function analyze(entries) {
    // Use both long-term + recent window
    const all = entries;
    const recent = lastNDaysEntries(entries, 14);

    const allText = normalizeText(all.map(e => e?.text || "").join(" "));
    const recentText = normalizeText(recent.map(e => e?.text || "").join(" "));

    const countsAll = {
      anger: countMatches(allText, LEX.anger),
      fear: countMatches(allText, LEX.fear),
      shame: countMatches(allText, LEX.shame),
      sadness: countMatches(allText, LEX.sadness),
      identity: countMatches(allText, LEX.identity),
      relationships: countMatches(allText, LEX.relationships),
      discipline: countMatches(allText, LEX.discipline),
      standards: countMatches(allText, LEX.standards),
      growth: countMatches(allText, LEX.growth),
      avoidance: countMatches(allText, LEX.copingAvoidance),
      rationalize: countMatches(allText, LEX.copingRationalize),
      power: countMatches(allText, LEX.power)
    };

    const countsRecent = {
      anger: countMatches(recentText, LEX.anger),
      fear: countMatches(recentText, LEX.fear),
      shame: countMatches(recentText, LEX.shame),
      sadness: countMatches(recentText, LEX.sadness),
      identity: countMatches(recentText, LEX.identity),
      relationships: countMatches(recentText, LEX.relationships),
      discipline: countMatches(recentText, LEX.discipline),
      standards: countMatches(recentText, LEX.standards),
      growth: countMatches(recentText, LEX.growth),
      avoidance: countMatches(recentText, LEX.copingAvoidance),
      rationalize: countMatches(recentText, LEX.copingRationalize),
      power: countMatches(recentText, LEX.power)
    };

    // Determine dominant pressure (what’s driving the shadow)
    const pressurePool = [
      { k: "identity", v: countsRecent.identity + countsAll.identity * 0.3 },
      { k: "relationships", v: countsRecent.relationships + countsAll.relationships * 0.3 },
      { k: "discipline", v: countsRecent.discipline + countsAll.discipline * 0.3 },
      { k: "standards", v: countsRecent.standards + countsAll.standards * 0.3 }
    ].sort((a, b) => b.v - a.v);

    const dominantPressure = pressurePool[0]?.k || "identity";

    // Emotional baseline (recent weighted)
    const emotionPool = [
      { k: "anger", v: countsRecent.anger * 1.5 + countsAll.anger * 0.2 },
      { k: "fear", v: countsRecent.fear * 1.5 + countsAll.fear * 0.2 },
      { k: "shame", v: countsRecent.shame * 1.5 + countsAll.shame * 0.2 },
      { k: "sadness", v: countsRecent.sadness * 1.5 + countsAll.sadness * 0.2 }
    ].sort((a, b) => b.v - a.v);

    const dominantEmotion = emotionPool[0]?.k || "anger";

    // Warrior metrics (0-100)
    // These are heuristic; they don’t claim “medical truth”, they’re coaching signals.
    const dominance = scoreTo100(countsRecent.power + countsRecent.discipline + countsRecent.standards, 8);
    const selfRespect = scoreTo100(countsRecent.standards + countsRecent.identity, 7);
    const executionDrive = scoreTo100(countsRecent.discipline + countsRecent.growth, 7);
    const emotionalLoad = scoreTo100(countsRecent.anger + countsRecent.fear + countsRecent.shame + countsRecent.sadness, 10);
    const avoidanceRisk = scoreTo100(countsRecent.avoidance + countsRecent.rationalize, 6);

    // Archetype selection
    const archetype = pickArchetype({
      dominantPressure,
      dominantEmotion,
      dominance,
      selfRespect,
      executionDrive,
      emotionalLoad,
      avoidanceRisk
    });

    const orders = buildOrders({
      dominantPressure,
      dominantEmotion,
      dominance,
      selfRespect,
      executionDrive,
      emotionalLoad,
      avoidanceRisk,
      entryCount: entries.length
    });

    return {
      dominantPressure,
      dominantEmotion,
      metrics: { dominance, selfRespect, executionDrive, emotionalLoad, avoidanceRisk },
      archetype,
      orders,
      entryCount: entries.length
    };
  }

  function pickArchetype(s) {
    const { dominantPressure, dominantEmotion, dominance, selfRespect, executionDrive, emotionalLoad, avoidanceRisk } = s;

    // High load + avoidance
    if (emotionalLoad >= 70 && avoidanceRisk >= 55) return "The Caged King";

    // Relationship-heavy + shame/fear
    if (dominantPressure === "relationships" && (dominantEmotion === "shame" || dominantEmotion === "fear")) {
      return "The Approval Soldier";
    }

    // Identity-heavy + anger
    if (dominantPressure === "identity" && dominantEmotion === "anger") return "The Identity Warrior";

    // Strong execution but lower self-respect signals boundary work
    if (executionDrive >= 65 && selfRespect < 55) return "The Grinder With No Throne";

    // Strong across the board
    if (dominance >= 65 && selfRespect >= 60 && executionDrive >= 60 && emotionalLoad < 60) {
      return "The Ascending King";
    }

    // Default
    return "The Rising Operator";
  }

  function labelPressure(k) {
    const map = {
      identity: "Identity Upgrade",
      relationships: "Relationships / Standards",
      discipline: "Discipline / Execution",
      standards: "Self-Respect / Boundaries"
    };
    return map[k] || "Identity Upgrade";
  }

  function labelEmotion(k) {
    const map = {
      anger: "Anger",
      fear: "Fear",
      shame: "Shame",
      sadness: "Sadness"
    };
    return map[k] || "Anger";
  }

  function buildOrders(s) {
    const {
      dominantPressure, dominantEmotion,
      dominance, selfRespect, executionDrive,
      emotionalLoad, avoidanceRisk,
      entryCount
    } = s;

    // Commander’s one-liners (sharp + actionable)
    const pressureLine = `Primary battlefield: ${labelPressure(dominantPressure)}.`;
    const emotionLine = `Dominant fuel: ${labelEmotion(dominantEmotion)}.`;

    let threat = "Threat level: controlled.";
    if (emotionalLoad >= 70) threat = "Threat level: high emotional load.";
    else if (emotionalLoad >= 55) threat = "Threat level: pressure building.";

    let leak = "Leak: none detected.";
    if (avoidanceRisk >= 60) leak = "Leak: avoidance is draining your power.";
    else if (avoidanceRisk >= 45) leak = "Leak: low-grade avoidance creeping in.";

    // Orders (3 commands)
    const orders = [];

    // Order #1: based on weakest “power pillar”
    const pillars = [
      { k: "dominance", v: dominance, order: "Pick one hard thing today. Finish it. No negotiation." },
      { k: "selfRespect", v: selfRespect, order: "Write your standards. Enforce one boundary this week." },
      { k: "executionDrive", v: executionDrive, order: "Lock a simple routine: 3 tasks max, complete all 3." }
    ].sort((a, b) => a.v - b.v);

    orders.push(pillars[0]?.order || "Pick one hard thing today. Finish it.");

    // Order #2: based on dominant pressure
    if (dominantPressure === "relationships") {
      orders.push("Stop chasing. Choose. Standards first, feelings second.");
    } else if (dominantPressure === "identity") {
      orders.push("Write the new identity in 5 lines. Act as him once today.");
    } else if (dominantPressure === "discipline") {
      orders.push("Make the routine small. Make it daily. Win the week.");
    } else {
      orders.push("Choose one boundary. Enforce it without explaining.");
    }

    // Order #3: based on emotion
    if (dominantEmotion === "anger") {
      orders.push("Convert anger into action: lift, work, create. Don’t spiral.");
    } else if (dominantEmotion === "fear") {
      orders.push("Do the feared action for 10 minutes. Fear shrinks on contact.");
    } else if (dominantEmotion === "shame") {
      orders.push("Name what you’re hiding. Shame dies in the light.");
    } else {
      orders.push("Move your body. Call someone real. Don’t isolate.");
    }

    // Small credibility: if no entries yet
    let note = "";
    if (entryCount < 2) note = "Log 3 entries to sharpen the profile.";

    return {
      pressureLine,
      emotionLine,
      threat,
      leak,
      orders: uniq(orders).slice(0, 3),
      note
    };
  }

  // -------------------------------
  // UI Injection
  // -------------------------------
  function ensureProfileUI() {
    const journalContainer = document.getElementById("journalContainer");
    if (!journalContainer) return null;

    let block = document.getElementById("shadowProfileBlock");
    if (!block) {
      block = document.createElement("div");
      block.id = "shadowProfileBlock";
      block.style.marginTop = "14px";
      // Keep your existing aesthetic: subtle glass card
      block.innerHTML = `
        <div style="
          padding:14px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,0.14);
          background:rgba(255,255,255,0.05);
        ">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div style="color:#E5E7EB; font-weight:900; font-size:1.05rem;">🛡 Shadow Profile</div>
            <button id="rebuildShadowProfileBtn" style="
              padding:8px 12px; border-radius:10px;
              background:rgba(255,255,255,0.08);
              border:1px solid rgba(255,255,255,0.16);
              color:white; cursor:pointer;
              font-weight:800;
            ">Rebuild</button>
          </div>

          <div id="shadowProfileContent" style="margin-top:12px; color:#E5E7EB; line-height:1.55;"></div>

          <div style="margin-top:10px; color:#9CA3AF; font-size:0.9rem; line-height:1.35;">
            This is a coaching mirror built from your journal entries. It’s not medical advice.
          </div>
        </div>
      `;
      journalContainer.appendChild(block);

      const btn = block.querySelector("#rebuildShadowProfileBtn");
      if (btn) {
        btn.addEventListener("click", () => {
          try {
            renderShadowProfile();
          } catch {}
        });
      }
    }

    return block;
  }

  function renderShadowProfile() {
    const entries = getEntries();
    const result = analyze(entries);

    const block = ensureProfileUI();
    if (!block) return;

    const el = document.getElementById("shadowProfileContent");
    if (!el) return;

    const m = result.metrics;

    el.innerHTML = `
      <div style="display:flex; gap:16px; flex-wrap:wrap;">
        <div style="min-width:220px;">
          <div style="color:#9CA3AF; font-weight:800;">Archetype</div>
          <div style="color:#E5E7EB; font-weight:950; font-size:1.15rem;">${result.archetype}</div>

          <div style="margin-top:10px; color:#9CA3AF; font-weight:800;">Intel</div>
          <div style="color:#E5E7EB; font-weight:800;">${result.orders.pressureLine}</div>
          <div style="color:#E5E7EB; font-weight:800;">${result.orders.emotionLine}</div>
          <div style="margin-top:6px; color:#E5E7EB;">${result.orders.threat}</div>
          <div style="color:#E5E7EB;">${result.orders.leak}</div>
          ${result.orders.note ? `<div style="margin-top:8px; color:#9CA3AF; font-weight:800;">${result.orders.note}</div>` : ""}
        </div>

        <div style="flex:1; min-width:260px;">
          <div style="color:#9CA3AF; font-weight:900;">Power Metrics (0–100)</div>

          ${metricRow("Dominance", m.dominance)}
          ${metricRow("Self-Respect", m.selfRespect)}
          ${metricRow("Execution Drive", m.executionDrive)}
          ${metricRow("Emotional Load", m.emotionalLoad)}
          ${metricRow("Avoidance Risk", m.avoidanceRisk)}
        </div>
      </div>

      <div style="margin-top:14px;">
        <div style="color:#9CA3AF; font-weight:900;">Orders (Next Moves)</div>
        <div style="margin-top:8px; display:flex; flex-direction:column; gap:8px;">
          ${result.orders.orders.map(o => `
            <div style="
              padding:10px 12px;
              border-radius:12px;
              border:1px solid rgba(255,255,255,0.12);
              background:rgba(0,0,0,0.14);
              color:#E5E7EB;
              font-weight:800;
            ">${escapeHtml(o)}</div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function escapeHtml(s) {
    return (s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function metricRow(label, value) {
    const v = clamp(value, 0, 100);
    return `
      <div style="margin-top:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div style="color:#E5E7EB; font-weight:800;">${label}</div>
          <div style="color:#9CA3AF; font-weight:900;">${v}</div>
        </div>
        <div style="margin-top:6px; height:10px; border-radius:999px; background:rgba(255,255,255,0.08); overflow:hidden;">
          <div style="height:100%; width:${v}%; border-radius:999px; background:linear-gradient(90deg, rgba(99,102,241,0.95), rgba(236,72,153,0.95));"></div>
        </div>
      </div>
    `;
  }

  // -------------------------------
  // Hook into app.js safely
  // -------------------------------
  function hook() {
    // wrap renderJournal so we can inject after it renders
    if (typeof window.renderJournal === "function" && !window.renderJournal.__shadowProfileWrapped) {
      const original = window.renderJournal;
      const wrapped = function () {
        const res = original.apply(this, arguments);
        try {
          // Give the DOM a beat in case renderJournal writes big HTML
          setTimeout(() => {
            try { renderShadowProfile(); } catch {}
          }, 0);
        } catch {}
        return res;
      };
      wrapped.__shadowProfileWrapped = true;
      window.renderJournal = wrapped;
    }

    // wrap saveJournalEntry so profile updates immediately
    if (typeof window.saveJournalEntry === "function" && !window.saveJournalEntry.__shadowProfileWrapped) {
      const originalSave = window.saveJournalEntry;
      const wrappedSave = function () {
        const res = originalSave.apply(this, arguments);
        try {
          setTimeout(() => {
            try { renderShadowProfile(); } catch {}
          }, 0);
        } catch {}
        return res;
      };
      wrappedSave.__shadowProfileWrapped = true;
      window.saveJournalEntry = wrappedSave;
    }

    // wrap deleteJournalEntry so profile updates
    if (typeof window.deleteJournalEntry === "function" && !window.deleteJournalEntry.__shadowProfileWrapped) {
      const originalDel = window.deleteJournalEntry;
      const wrappedDel = function () {
        const res = originalDel.apply(this, arguments);
        try {
          setTimeout(() => {
            try { renderShadowProfile(); } catch {}
          }, 0);
        } catch {}
        return res;
      };
      wrappedDel.__shadowProfileWrapped = true;
      window.deleteJournalEntry = wrappedDel;
    }
  }

  // Hook when the page is ready (and also retry in case scripts load out of order)
  document.addEventListener("DOMContentLoaded", () => {
    hook();
    // If user starts on Journal, this will render once Journal calls renderJournal
    // If they navigate later, our wrapper ensures it injects then too.
  });

  // Small retry loop to catch cases where app.js loads after this file
  let tries = 0;
  const retry = setInterval(() => {
    tries++;
    hook();
    if (
      (typeof window.renderJournal === "function" && window.renderJournal.__shadowProfileWrapped) ||
      tries >= 40
    ) {
      clearInterval(retry);
    }
  }, 250);

})();
