/* ===============================
   JOURNAL INTELLIGENCE ENGINE
   Safe module (no app.js edits required)
   - Works with different journal UIs
   - Reads entries from localStorage (supports multiple keys)
   - Injects an "Intelligence" panel into the Journal page
   =============================== */

(() => {
  "use strict";

  // ----------------------------
  // Config
  // ----------------------------
  const STORAGE_KEYS = [
    "journalEntries",          // your earlier key
    "journalSystemEntries",    // common alt
    "journal_entries"          // fallback alt
  ];

  const ANALYTICS_KEY = "journalIntelligenceCache_v1";

  // Lightweight lexicons (expand anytime)
  const EMOTION_LEXICON = {
    anger: ["angry", "mad", "rage", "furious", "irritated", "pissed", "resent", "hate"],
    anxiety: ["anxious", "nervous", "worry", "worried", "panic", "uneasy", "overthink", "overthinking", "fear"],
    sadness: ["sad", "depressed", "down", "hopeless", "empty", "cry", "lonely", "grief"],
    shame: ["shame", "embarrassed", "guilt", "guilty", "regret", "unworthy", "disgust"],
    confidence: ["confident", "strong", "capable", "ready", "disciplined", "focused", "locked in", "proud"],
    gratitude: ["grateful", "thankful", "blessed", "appreciate", "gratitude"],
    love: ["love", "care", "connected", "warm", "forgive", "forgiveness"],
    motivation: ["motivated", "driven", "ambitious", "hungry", "determined", "energized"]
  };

  const THEME_LEXICON = {
    control: ["control", "controlling", "dominant", "power", "manage", "tight", "micro"],
    fear: ["fear", "scared", "terrified", "afraid", "avoid", "avoidance"],
    worth: ["worth", "value", "deserve", "unworthy", "good enough", "prove"],
    rejection: ["reject", "rejection", "left", "abandoned", "ignored", "excluded"],
    perfectionism: ["perfect", "perfection", "flaw", "mistake", "not enough", "should've", "should have"],
    comparison: ["compare", "jealous", "envy", "behind", "better than", "worse than"],
    discipline: ["discipline", "routine", "habit", "consistency", "streak", "commit"],
    identity: ["identity", "who i am", "self", "person", "man", "become", "version of me"],
    boundaries: ["boundary", "boundaries", "no", "people please", "people-pleasing", "permission"],
    resentment: ["resent", "resentment", "bitter", "unfair", "owed", "should"]
  };

  // ----------------------------
  // Utilities
  // ----------------------------
  function safeJSONParse(str, fallback) {
    try {
      const v = JSON.parse(str);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function getAllEntries() {
    for (const key of STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      const parsed = safeJSONParse(raw || "[]", []);
      if (Array.isArray(parsed) && parsed.length) return { key, entries: normalizeEntries(parsed) };
    }
    // If none have entries, still return empty using default key
    const fallbackRaw = localStorage.getItem(STORAGE_KEYS[0]);
    const fallbackParsed = safeJSONParse(fallbackRaw || "[]", []);
    return { key: STORAGE_KEYS[0], entries: normalizeEntries(Array.isArray(fallbackParsed) ? fallbackParsed : []) };
  }

  function normalizeEntries(entries) {
    // Accept shapes:
    // {date, text}
    // {date, prompt, text}
    // {createdAt, content}
    // {timestamp, body}
    return entries
      .map(e => {
        const date =
          e?.date ||
          e?.createdAt ||
          e?.timestamp ||
          e?.time ||
          null;

        const text =
          e?.text ||
          e?.content ||
          e?.body ||
          e?.entry ||
          "";

        const prompt = e?.prompt || e?.question || e?.shadowPrompt || "";

        return {
          date: date ? new Date(date).toISOString() : null,
          text: String(text || "").trim(),
          prompt: String(prompt || "").trim()
        };
      })
      .filter(e => e.text.length);
  }

  function lastNDaysEntries(entries, n) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (n - 1));
    cutoff.setHours(0, 0, 0, 0);
    return entries.filter(e => {
      if (!e.date) return false;
      return new Date(e.date) >= cutoff;
    });
  }

  function tokenize(text) {
    return (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  function scoreLexicon(text, lexicon) {
    const t = (text || "").toLowerCase();
    const scores = {};
    for (const [label, words] of Object.entries(lexicon)) {
      let s = 0;
      for (const w of words) {
        // phrase support too
        if (w.includes(" ")) {
          if (t.includes(w)) s += 2;
        } else {
          // word boundary-ish
          const re = new RegExp(`\\b${escapeRegExp(w)}\\b`, "g");
          const matches = t.match(re);
          if (matches) s += matches.length;
        }
      }
      scores[label] = s;
    }
    return scores;
  }

  function topLabel(scores) {
    let best = { k: "neutral", v: 0 };
    for (const [k, v] of Object.entries(scores)) {
      if (v > best.v) best = { k, v };
    }
    return best;
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return iso;
    }
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // ----------------------------
  // Mood correlation (optional)
  // ----------------------------
  function getMoodDataMap() {
    // your mood system uses moodData keyed by YYYY-MM-DD
    const moodData = safeJSONParse(localStorage.getItem("moodData") || "{}", {});
    return (moodData && typeof moodData === "object") ? moodData : {};
  }

  function dateKeyFromISO(iso) {
    try {
      return new Date(iso).toISOString().split("T")[0];
    } catch {
      return null;
    }
  }

  function computeMoodCorrelation(entries) {
    const mood = getMoodDataMap();
    const pairs = [];

    for (const e of entries) {
      if (!e.date) continue;
      const key = dateKeyFromISO(e.date);
      const energy = mood?.[key]?.energy;
      if (!Number.isFinite(energy)) continue;

      const emotionScores = scoreLexicon(e.text, EMOTION_LEXICON);
      const emotionTop = topLabel(emotionScores);

      // Convert emotion profile to a rough "valence" score
      // (negative emotions lower, positive higher)
      let valence = 0;
      valence -= (emotionScores.anger || 0) * 1.2;
      valence -= (emotionScores.anxiety || 0) * 1.0;
      valence -= (emotionScores.sadness || 0) * 1.2;
      valence -= (emotionScores.shame || 0) * 1.4;
      valence += (emotionScores.confidence || 0) * 1.2;
      valence += (emotionScores.gratitude || 0) * 1.0;
      valence += (emotionScores.love || 0) * 0.9;
      valence += (emotionScores.motivation || 0) * 1.0;

      pairs.push({
        energy: Number(energy),
        valence,
        topEmotion: emotionTop.k
      });
    }

    if (pairs.length < 4) {
      return { ok: false, message: "Not enough overlapping mood + journal days yet." };
    }

    // Pearson correlation energy vs valence
    const xs = pairs.map(p => p.energy);
    const ys = pairs.map(p => p.valence);

    const r = pearson(xs, ys);
    const strength =
      Math.abs(r) >= 0.6 ? "strong" :
      Math.abs(r) >= 0.3 ? "moderate" :
      "weak";

    const direction = r > 0 ? "positive" : r < 0 ? "negative" : "none";

    const emotionCounts = {};
    pairs.forEach(p => {
      emotionCounts[p.topEmotion] = (emotionCounts[p.topEmotion] || 0) + 1;
    });

    const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";

    return {
      ok: true,
      r: Number.isFinite(r) ? r : 0,
      strength,
      direction,
      sample: pairs.length,
      topEmotion
    };
  }

  function pearson(xs, ys) {
    const n = Math.min(xs.length, ys.length);
    if (n < 2) return 0;

    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let denX = 0;
    let denY = 0;

    for (let i = 0; i < n; i++) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
  }

  // ----------------------------
  // Intelligence computation
  // ----------------------------
  function computeIntelligence(entries) {
    const allText = entries.map(e => e.text).join("\n");
    const last7 = lastNDaysEntries(entries, 7);

    const emotionScoresAll = scoreLexicon(allText, EMOTION_LEXICON);
    const themeScoresAll = scoreLexicon(allText, THEME_LEXICON);

    const topEmotionAll = topLabel(emotionScoresAll);
    const topThemeAll = topLabel(themeScoresAll);

    const emotionScores7 = scoreLexicon(last7.map(e => e.text).join("\n"), EMOTION_LEXICON);
    const themeScores7 = scoreLexicon(last7.map(e => e.text).join("\n"), THEME_LEXICON);

    const topEmotion7 = topLabel(emotionScores7);
    const topTheme7 = topLabel(themeScores7);

    const depthScore = computeDepthScore(entries);

    const nextAction = pickNextAction(topTheme7.k, topEmotion7.k, depthScore);

    const moodCorr = computeMoodCorrelation(last7);

    return {
      totalEntries: entries.length,
      last7Count: last7.length,
      topEmotionAll,
      topThemeAll,
      topEmotion7,
      topTheme7,
      depthScore,
      nextAction,
      moodCorr
    };
  }

  function computeDepthScore(entries) {
    // Depth = length + self-reflection markers + vulnerability markers
    const last10 = entries.slice(-10);
    if (!last10.length) return 0;

    const markers = [
      "i feel", "i felt", "i realize", "i realised", "i noticed", "i keep",
      "pattern", "trigger", "childhood", "fear", "shame", "resent", "avoid",
      "truth", "honest", "admit", "responsible", "accountable", "forgive"
    ];

    let points = 0;
    for (const e of last10) {
      const t = (e.text || "").toLowerCase();
      const len = t.length;

      points += clamp(len / 80, 0, 6); // reward writing more (max 6 per entry)
      for (const m of markers) {
        if (t.includes(m)) points += 1.2;
      }
      if (t.includes("?")) points += 0.6;
    }

    // Normalize to 0–100
    const rawMax = last10.length * 18; // rough cap
    return clamp(Math.round((points / rawMax) * 100), 0, 100);
  }

  function pickNextAction(theme, emotion, depthScore) {
    // Short, actionable directives
    if (depthScore < 25) {
      return "Write 6 lines starting with: “The truth is…”";
    }

    if (theme === "control") return "Name 1 thing you can’t control, and what you’ll do anyway.";
    if (theme === "fear") return "List the fear. Then list the cost of avoiding it.";
    if (theme === "worth") return "Write one sentence: “I don’t have to earn ___ to deserve ___.”";
    if (theme === "rejection") return "Write who you’re trying to impress, and what you’re afraid happens if you stop.";
    if (theme === "perfectionism") return "Write the smallest imperfect action you’ll take today.";
    if (theme === "comparison") return "Write 3 wins you’re ignoring, and why you downplay them.";
    if (theme === "discipline") return "Pick 1 non-negotiable habit for 7 days. No extras.";
    if (theme === "identity") return "Write: “The person I’m becoming does ___ even when ___.”";
    if (theme === "boundaries") return "Write one “no” you owe someone (including yourself).";
    if (theme === "resentment") return "Write what you think you’re owed, and the hidden expectation behind it.";

    if (emotion === "anxiety") return "Write 3 worst-case fears, then 3 realistic outcomes.";
    if (emotion === "shame") return "Write what you’d tell a friend with the same story.";
    if (emotion === "anger") return "Write what boundary was crossed, and what boundary you need.";
    if (emotion === "sadness") return "Write what you lost, and what you still have.";
    if (emotion === "confidence") return "Write the system that created this confidence (so you can repeat it).";

    return "Write the pattern you’re repeating, then the first step to break it.";
  }

  // ----------------------------
  // UI injection (Journal page)
  // ----------------------------
  function ensureIntelligencePanel(journalPage) {
    let panel = document.getElementById("journalIntelligencePanel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "journalIntelligencePanel";
    panel.className = "habit-section";
    panel.style.marginTop = "14px";

    // Try to place under the journal system container if present
    const journalContainer =
      document.getElementById("journalContainer") ||
      journalPage.querySelector("[data-journal-container]") ||
      journalPage;

    journalContainer.appendChild(panel);
    return panel;
  }

  function renderIntelligence() {
    const journalPage = document.getElementById("journalPage");
    if (!journalPage) return;

    // Only render when journal page is active OR visible
    const isActive = journalPage.classList.contains("active");
    if (!isActive) return;

    const panel = ensureIntelligencePanel(journalPage);

    const { entries } = getAllEntries();
    const intel = computeIntelligence(entries);

    // Cache (optional)
    try {
      localStorage.setItem(ANALYTICS_KEY, JSON.stringify({
        updatedAt: new Date().toISOString(),
        intel
      }));
    } catch {}

    const moodBlock = intel.moodCorr.ok
      ? `
        <div style="margin-top:10px; color:#E5E7EB; line-height:1.6;">
          Mood ↔ Journal correlation: ${intel.moodCorr.strength} ${intel.moodCorr.direction}
          (r=${intel.moodCorr.r.toFixed(2)}, n=${intel.moodCorr.sample})<br>
          Most common emotion on overlapping days: ${sanitize(intel.moodCorr.topEmotion)}
        </div>
      `
      : `
        <div style="margin-top:10px; color:#9CA3AF; line-height:1.6;">
          Mood ↔ Journal correlation: ${sanitize(intel.moodCorr.message)}
        </div>
      `;

    panel.innerHTML = `
      <div class="section-title">🧠 Journal Intelligence</div>

      <div style="color:#9CA3AF; font-weight:800; margin-top:6px;">
        Entries: ${intel.totalEntries} total • ${intel.last7Count} in last 7 days
      </div>

      <div style="margin-top:12px; display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
        ${statCard("Dominant emotion (7d)", intel.topEmotion7.k, intel.topEmotion7.v)}
        ${statCard("Dominant theme (7d)", intel.topTheme7.k, intel.topTheme7.v)}
        ${statCard("Dominant emotion (all)", intel.topEmotionAll.k, intel.topEmotionAll.v)}
        ${statCard("Dominant theme (all)", intel.topThemeAll.k, intel.topThemeAll.v)}
      </div>

      <div style="
        margin-top:12px;
        padding:14px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.05);
      ">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
          <div style="color:#E5E7EB; font-weight:900;">Depth score</div>
          <div style="color:#E5E7EB; font-weight:900;">${intel.depthScore}/100</div>
        </div>
        <div style="margin-top:10px; height:10px; border-radius:999px; background:rgba(255,255,255,0.08); overflow:hidden;">
          <div style="height:100%; width:${clamp(intel.depthScore,0,100)}%; border-radius:999px; background:linear-gradient(90deg, rgba(99,102,241,0.95), rgba(236,72,153,0.95));"></div>
        </div>

        <div style="margin-top:12px; color:#E5E7EB; font-weight:900;">Next move</div>
        <div style="margin-top:6px; color:#9CA3AF; line-height:1.5;">${sanitize(intel.nextAction)}</div>

        ${moodBlock}

        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <button id="jiRefreshBtn" style="
            padding:9px 14px; border-radius:10px;
            background:rgba(255,255,255,0.08);
            border:1px solid rgba(255,255,255,0.16);
            color:white; cursor:pointer;
          ">Refresh</button>

          <button id="jiWeeklyBtn" style="
            padding:9px 14px; border-radius:10px;
            background:linear-gradient(135deg,#6366f1,#ec4899);
            border:none; color:white; cursor:pointer;
          ">Weekly report</button>
        </div>

        <div id="jiWeeklyReport" style="margin-top:12px; display:none;"></div>
      </div>
    `;

    const refreshBtn = document.getElementById("jiRefreshBtn");
    if (refreshBtn) refreshBtn.onclick = () => renderIntelligence();

    const weeklyBtn = document.getElementById("jiWeeklyBtn");
    if (weeklyBtn) weeklyBtn.onclick = () => toggleWeeklyReport(intel, entries);
  }

  function statCard(title, label, score) {
    const safeLabel = sanitize(label || "neutral");
    const safeScore = Number.isFinite(score) ? score : 0;
    return `
      <div style="
        padding:12px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.05);
      ">
        <div style="color:#9CA3AF; font-weight:800; font-size:0.9rem;">${sanitize(title)}</div>
        <div style="margin-top:6px; color:#E5E7EB; font-weight:900; font-size:1.05rem;">${safeLabel}</div>
        <div style="margin-top:4px; color:#9CA3AF; font-weight:800; font-size:0.85rem;">signal: ${safeScore}</div>
      </div>
    `;
  }

  function toggleWeeklyReport(intel, entries) {
    const box = document.getElementById("jiWeeklyReport");
    if (!box) return;

    const open = box.style.display !== "none";
    if (open) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }

    const last7 = lastNDaysEntries(entries, 7);
    const highlights = buildWeeklyHighlights(last7);

    box.style.display = "block";
    box.innerHTML = `
      <div style="
        margin-top:10px;
        padding:12px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,0.12);
        background:rgba(0,0,0,0.15);
      ">
        <div style="color:#E5E7EB; font-weight:900;">Weekly report (last 7 days)</div>

        <div style="margin-top:10px; color:#9CA3AF; line-height:1.6;">
          Dominant emotion: ${sanitize(intel.topEmotion7.k)}<br>
          Dominant theme: ${sanitize(intel.topTheme7.k)}<br>
          Depth score: ${intel.depthScore}/100
        </div>

        <div style="margin-top:12px; color:#E5E7EB; font-weight:900;">Key highlights</div>
        <div style="margin-top:6px; color:#9CA3AF; line-height:1.6;">
          ${highlights.length ? highlights.map(h => `• ${sanitize(h)}`).join("<br>") : "• Not enough entries yet. Write 2–3 short entries this week."}
        </div>

        <div style="margin-top:12px; color:#E5E7EB; font-weight:900;">One directive</div>
        <div style="margin-top:6px; color:#9CA3AF; line-height:1.6;">
          ${sanitize(intel.nextAction)}
        </div>
      </div>
    `;
  }

  function buildWeeklyHighlights(entries) {
    if (!entries.length) return [];

    // Find 2–4 “strong signals” from the week
    const highlights = [];

    // Most frequent emotion + theme per entry
    const emotionCounts = {};
    const themeCounts = {};

    for (const e of entries) {
      const emoTop = topLabel(scoreLexicon(e.text, EMOTION_LEXICON)).k;
      const themeTop = topLabel(scoreLexicon(e.text, THEME_LEXICON)).k;

      emotionCounts[emoTop] = (emotionCounts[emoTop] || 0) + 1;
      themeCounts[themeTop] = (themeCounts[themeTop] || 0) + 1;
    }

    const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
    const topTheme = Object.entries(themeCounts).sort((a, b) => b[1] - a[1])[0];

    if (topEmotion && topEmotion[0] !== "neutral") {
      highlights.push(`Emotion pattern: ${topEmotion[0]} showed up ${topEmotion[1]} time(s).`);
    }
    if (topTheme && topTheme[0] !== "neutral") {
      highlights.push(`Theme pattern: ${topTheme[0]} showed up ${topTheme[1]} time(s).`);
    }

    // Pull a “most intense” entry by lexicon signal
    let best = { idx: -1, score: -1 };
    entries.forEach((e, i) => {
      const es = scoreLexicon(e.text, EMOTION_LEXICON);
      const ts = scoreLexicon(e.text, THEME_LEXICON);
      const intensity =
        (es.anger || 0) + (es.anxiety || 0) + (es.sadness || 0) + (es.shame || 0) +
        (ts.fear || 0) + (ts.control || 0) + (ts.rejection || 0) + (ts.resentment || 0);

      if (intensity > best.score) best = { idx: i, score: intensity };
    });

    if (best.idx >= 0 && best.score > 0) {
      const e = entries[best.idx];
      highlights.push(`Most emotionally loaded entry: ${fmtDate(e.date || new Date().toISOString())}.`);
    }

    // If user wrote multiple days
    const uniqueDays = new Set(entries.map(e => dateKeyFromISO(e.date || ""))).size;
    highlights.push(`Consistency: you wrote on ${uniqueDays} day(s) this week.`);

    return highlights.slice(0, 5);
  }

  function sanitize(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ----------------------------
  // Hook into saveJournalEntry (if present)
  // ----------------------------
  function wrapSaveFunction() {
    // If app defines saveJournalEntry globally, wrap it once
    if (typeof window.saveJournalEntry !== "function") return;
    if (window.saveJournalEntry.__journalIntelWrapped) return;

    const original = window.saveJournalEntry;
    function wrapped() {
      const result = original.apply(this, arguments);
      // After saving, re-render intelligence safely
      setTimeout(() => {
        try { renderIntelligence(); } catch {}
      }, 50);
      return result;
    }
    wrapped.__journalIntelWrapped = true;
    window.saveJournalEntry = wrapped;
  }

  // ----------------------------
  // Observe journal page changes
  // ----------------------------
  function startObserver() {
    const journalPage = document.getElementById("journalPage");
    if (!journalPage) return;

    // Render once if already active
    try { renderIntelligence(); } catch {}

    const obs = new MutationObserver(() => {
      // Journal UI changes often rebuild DOM; keep our panel alive
      try { wrapSaveFunction(); } catch {}
      try { renderIntelligence(); } catch {}
    });

    obs.observe(journalPage, { childList: true, subtree: true });
  }

  // ----------------------------
  // Boot
  // ----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    // Wrap save function early
    try { wrapSaveFunction(); } catch {}

    // Observe journal page once it exists
    const tryStart = () => {
      const jp = document.getElementById("journalPage");
      if (!jp) return false;
      startObserver();
      return true;
    };

    if (tryStart()) return;

    // If journalPage loads later, retry briefly
    let attempts = 0;
    const t = setInterval(() => {
      attempts++;
      if (tryStart() || attempts > 40) clearInterval(t);
    }, 100);
  });

  // Expose manual trigger (optional)
  window.renderJournalIntelligence = () => {
    try { wrapSaveFunction(); } catch {}
    try { renderIntelligence(); } catch {}
  };
})();
