/* ===============================
   JOURNAL INTELLIGENCE (C MODE)
   Psychological + Self-Mastery analytics
   Safe: no observers, no infinite renders, no app.js edits required
   =============================== */

(function () {
  "use strict";

  // ---------- Helpers ----------
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function safeParseJSON(val, fallback) {
    try { return JSON.parse(val); } catch { return fallback; }
  }

  function dayKeyFromISO(iso) {
    try { return new Date(iso).toISOString().split("T")[0]; } catch { return ""; }
  }

  function formatDateShort(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return iso || "";
    }
  }

  function getLastNDays(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push(d.toISOString().split("T")[0]);
    }
    return out;
  }

  // ---------- Read Data ----------
  function getJournalEntries() {
    // supports your current journalEntries schema (date, text, prompt)
    const raw = localStorage.getItem("journalEntries");
    const arr = safeParseJSON(raw || "[]", []);
    if (!Array.isArray(arr)) return [];

    return arr
      .map(e => ({
        date: e?.date || "",
        dayKey: e?.date ? dayKeyFromISO(e.date) : "",
        text: (e?.text || "").toString(),
        prompt: (e?.prompt || "").toString()
      }))
      .filter(e => e.text.trim().length > 0)
      .sort((a, b) => (a.date > b.date ? -1 : 1)); // newest first
  }

  function getMoodData() {
    const raw = localStorage.getItem("moodData");
    const obj = safeParseJSON(raw || "{}", {});
    return obj && typeof obj === "object" ? obj : {};
  }

  function getHabitPercentForDay(dayKey) {
    try {
      if (typeof window.getDayCompletion === "function") {
        const data = window.getDayCompletion(dayKey);
        return Number.isFinite(data?.percent) ? data.percent : 0;
      }
    } catch {}
    return 0;
  }

  function getEnergyForDay(dayKey, moodData) {
    try {
      const e = moodData?.[dayKey]?.energy;
      return Number.isFinite(e) ? e : 0; // 0-10
    } catch {
      return 0;
    }
  }

  // ---------- NLP-ish (heuristics) ----------
  const LEX = {
    anxiety: ["anxious", "worry", "worried", "fear", "panic", "overthink", "overthinking", "nervous", "stress", "stressed"],
    anger: ["angry", "mad", "rage", "furious", "resent", "resentful", "hate", "irritated", "annoyed"],
    sadness: ["sad", "depressed", "lonely", "empty", "hopeless", "tired", "exhausted", "burnt out", "burned out"],
    shame: ["ashamed", "shame", "embarrassed", "cringe", "pathetic", "weak", "unworthy"],
    confidence: ["confident", "strong", "disciplined", "focused", "locked in", "powerful", "proud", "consistent"],
    gratitude: ["grateful", "thankful", "blessed", "appreciate", "appreciation"],
    avoidance: ["avoided", "avoid", "procrastinated", "procrastinate", "escaped", "numb", "doomscroll", "scrolling"]
  };

  const BELIEF_PATTERNS = [
    { label: "Not enough", rx: /\b(i'?m|i am)\s+(not\s+)?(good|enough|worthy|smart|capable)\b/gi },
    { label: "Helpless", rx: /\b(i can'?t|i cannot|nothing works|no point)\b/gi },
    { label: "Always/Never", rx: /\b(always|never|everyone|nobody)\b/gi },
    { label: "Fear of judgment", rx: /\b(what (if )?they|people will|they will think)\b/gi },
    { label: "Control/Perfection", rx: /\b(perfect|perfection|must be|have to)\b/gi }
  ];

  function scoreCategories(text) {
    const t = text.toLowerCase();
    const scores = {};
    Object.keys(LEX).forEach(k => (scores[k] = 0));
    for (const k in LEX) {
      for (const w of LEX[k]) {
        // quick count of occurrences (lightweight)
        const parts = t.split(w);
        if (parts.length > 1) scores[k] += (parts.length - 1);
      }
    }
    return scores;
  }

  function dominantCategory(text) {
    const scores = scoreCategories(text);
    let best = "neutral";
    let bestV = 0;
    for (const k in scores) {
      if (scores[k] > bestV) {
        bestV = scores[k];
        best = k;
      }
    }
    return bestV === 0 ? "neutral" : best;
  }

  function extractBeliefCandidates(text) {
    const hits = [];
    for (const p of BELIEF_PATTERNS) {
      const m = text.match(p.rx);
      if (m && m.length) hits.push({ label: p.label, count: m.length });
    }
    hits.sort((a, b) => b.count - a.count);
    return hits.slice(0, 3);
  }

  function topThemes(entries) {
    const combined = entries.map(e => e.text).join(" ").toLowerCase();
    const scores = scoreCategories(combined);
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const top = sorted.filter(([, v]) => v > 0).slice(0, 4).map(([k]) => k);
    return top.length ? top : ["neutral"];
  }

  // ---------- Correlation (simple, safe) ----------
  function avg(arr) {
    const clean = arr.filter(v => Number.isFinite(v));
    return clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : 0;
  }

  function pearson(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 3) return 0;

    const xs = x.slice(0, n).map(v => (Number.isFinite(v) ? v : 0));
    const ys = y.slice(0, n).map(v => (Number.isFinite(v) ? v : 0));

    const mx = avg(xs), my = avg(ys);
    let num = 0, dx = 0, dy = 0;

    for (let i = 0; i < n; i++) {
      const a = xs[i] - mx;
      const b = ys[i] - my;
      num += a * b;
      dx += a * a;
      dy += b * b;
    }

    const den = Math.sqrt(dx * dy);
    if (!den) return 0;
    return num / den;
  }

  function corrLabel(r) {
    const ar = Math.abs(r);
    if (ar < 0.15) return "none";
    if (ar < 0.35) return "weak";
    if (ar < 0.6) return "moderate";
    return "strong";
  }

  // ---------- Prompt Engine (theme-based) ----------
  const PROMPTS_BY_THEME = {
    anxiety: [
      "What are you trying to control that you can’t?",
      "What would happen if you did nothing for 24 hours?",
      "What fear is pretending to be logic?"
    ],
    anger: [
      "What boundary was crossed that you didn’t defend?",
      "What are you demanding from others that you won’t give yourself?",
      "What truth are you refusing to say out loud?"
    ],
    sadness: [
      "What loss are you still carrying?",
      "What do you miss that you won’t admit?",
      "What would you ask for if you believed you deserved support?"
    ],
    shame: [
      "What part of you feels unacceptable—and who taught you that?",
      "What would you forgive yourself for if you were honest?",
      "What identity are you trying to protect with self-judgment?"
    ],
    avoidance: [
      "What task would change everything if finished today?",
      "What emotion are you escaping through distraction?",
      "What commitment scares you because it would reveal your limits?"
    ],
    confidence: [
      "What standard are you ready to raise this week?",
      "What would your strongest self do today, exactly?",
      "What rule do you live by that others don’t?"
    ],
    gratitude: [
      "What is working that you’ve been ignoring?",
      "Who helped you recently and why did it matter?",
      "What would you miss if it disappeared tomorrow?"
    ],
    neutral: [
      "What truth are you avoiding because it changes your identity?",
      "Where are you settling for comfort over growth?",
      "What do you keep repeating—and what payoff do you get?"
    ]
  };

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getSmartPrompt(themes) {
    const t = themes[0] || "neutral";
    return pick(PROMPTS_BY_THEME[t] || PROMPTS_BY_THEME.neutral);
  }

  // ---------- UI ----------
  function ensurePanel(page) {
    let panel = document.getElementById("journalIntelligencePanel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "journalIntelligencePanel";
      panel.className = "habit-section";
      panel.style.marginTop = "12px";
      page.appendChild(panel);
    }
    return panel;
  }

  function setActiveTab(tab) {
    const a = document.getElementById("jiTabMind");
    const b = document.getElementById("jiTabPerformance");
    const mind = document.getElementById("jiMind");
    const perf = document.getElementById("jiPerformance");

    if (!a || !b || !mind || !perf) return;

    if (tab === "mind") {
      a.classList.add("active");
      b.classList.remove("active");
      mind.style.display = "block";
      perf.style.display = "none";
      localStorage.setItem("jiActiveTab", "mind");
    } else {
      b.classList.add("active");
      a.classList.remove("active");
      perf.style.display = "block";
      mind.style.display = "none";
      localStorage.setItem("jiActiveTab", "performance");
    }
  }

  function render() {
    const page = document.getElementById("journalPage");
    if (!page || !page.classList.contains("active")) return;

    const panel = ensurePanel(page);

    const entries = getJournalEntries();
    const moodData = getMoodData();

    const last14Keys = getLastNDays(14);
    const last14Entries = entries.filter(e => e.dayKey && last14Keys.includes(e.dayKey));

    const combined14 = last14Entries.map(e => e.text).join(" ");
    const themes = topThemes(last14Entries.length ? last14Entries : entries);
    const dominant = dominantCategory(combined14 || entries.map(e => e.text).join(" "));

    const beliefs = extractBeliefCandidates((combined14 || "").toLowerCase());

    // Performance correlations (14 days)
    const energy14 = last14Keys.map(k => getEnergyForDay(k, moodData));
    const habits14 = last14Keys.map(k => getHabitPercentForDay(k));
    const wrote14 = last14Keys.map(k => (last14Entries.some(e => e.dayKey === k) ? 1 : 0));

    const rWriteEnergy = pearson(wrote14, energy14);
    const rWriteHabits = pearson(wrote14, habits14);

    const avgEnergy = avg(energy14);
    const avgHabits = avg(habits14);

    // Smart next prompt (theme-based)
    const smartPrompt = getSmartPrompt([dominant, ...themes].filter(Boolean));

    const active = localStorage.getItem("jiActiveTab") || "mind";

    panel.innerHTML = `
      <div class="section-title">🧠 Journal Intelligence</div>

      <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
        <button id="jiTabMind" class="nav-tab active" style="padding:10px 14px;">Mind Patterns</button>
        <button id="jiTabPerformance" class="nav-tab" style="padding:10px 14px;">Performance Patterns</button>
        <button id="jiRefresh" style="
          margin-left:auto;
          padding:10px 14px; border-radius:12px;
          background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.16);
          color:white; cursor:pointer;
        ">Refresh</button>
      </div>

      <div id="jiMind" style="margin-top:12px;">
        <div style="
          padding:14px; border-radius:14px;
          border:1px solid rgba(255,255,255,0.14);
          background:rgba(255,255,255,0.05);
        ">
          <div style="color:#E5E7EB; font-weight:900;">Current dominant pattern</div>
          <div style="margin-top:6px; color:#E5E7EB; font-weight:900; font-size:1.1rem;">
            ${String(dominant).toUpperCase()}
          </div>
          <div style="margin-top:8px; color:#9CA3AF;">
            Based on your last 14 days of writing.
          </div>

          <div style="margin-top:12px; color:#E5E7EB; font-weight:900;">Top themes</div>
          <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
            ${themes.map(t => `
              <span style="
                padding:6px 10px; border-radius:999px;
                border:1px solid rgba(255,255,255,0.14);
                background:rgba(0,0,0,0.18);
                color:#E5E7EB; font-weight:800; font-size:0.9rem;
              ">${t}</span>
            `).join("")}
          </div>

          <div style="margin-top:14px; color:#E5E7EB; font-weight:900;">Belief signals (candidates)</div>
          <div style="margin-top:8px; color:#9CA3AF; line-height:1.5;">
            ${beliefs.length
              ? beliefs.map(b => `• ${b.label} (${b.count})`).join("<br>")
              : "No strong belief patterns detected yet (keep writing)."
            }
          </div>
        </div>

        <div style="
          margin-top:12px;
          padding:14px; border-radius:14px;
          border:1px solid rgba(255,255,255,0.14);
          background:rgba(255,255,255,0.05);
        ">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div style="color:#E5E7EB; font-weight:900;">Next smart shadow prompt</div>
            <button id="jiNewPrompt" style="
              padding:8px 12px; border-radius:10px;
              background:rgba(255,255,255,0.08);
              border:1px solid rgba(255,255,255,0.16);
              color:white; cursor:pointer;
            ">New prompt</button>
          </div>

          <div id="jiPromptText" style="margin-top:10px; color:#E5E7EB; font-weight:800;">
            ${smartPrompt}
          </div>

          <div style="margin-top:10px; color:#9CA3AF;">
            Tip: copy/paste this into your journal entry if you want to stay on one theme.
          </div>
        </div>

        <div style="
          margin-top:12px;
          padding:14px; border-radius:14px;
          border:1px solid rgba(255,255,255,0.14);
          background:rgba(255,255,255,0.05);
        ">
          <div style="color:#E5E7EB; font-weight:900;">Micro-directive (1 move)</div>
          <div style="margin-top:8px; color:#9CA3AF; line-height:1.5;">
            ${
              dominant === "avoidance" ? "Pick 1 task. Set 25 minutes. No escape. Finish or fail honestly." :
              dominant === "anxiety" ? "Write the worst-case in 3 bullets. Then write the next smallest action." :
              dominant === "anger" ? "Name the boundary. Decide: enforce, leave, or accept—no silent resentment." :
              dominant === "sadness" ? "Do one replenishing action (walk, sunlight, shower). Then write what you miss." :
              dominant === "shame" ? "State the truth without punishment. Replace judgment with a plan." :
              dominant === "confidence" ? "Raise one standard today. Make it measurable." :
              dominant === "gratitude" ? "Message one person who helped you. Lock in the identity shift." :
              "Write one honest sentence you’ve been avoiding."
            }
          </div>
        </div>
      </div>

      <div id="jiPerformance" style="margin-top:12px; display:none;">
        <div style="
          padding:14px; border-radius:14px;
          border:1px solid rgba(255,255,255,0.14);
          background:rgba(255,255,255,0.05);
        ">
          <div style="color:#E5E7EB; font-weight:900;">14-day overview</div>
          <div style="margin-top:10px; color:#9CA3AF; line-height:1.6;">
            Average energy: ${avgEnergy.toFixed(2)} / 10<br>
            Average habits: ${avgHabits.toFixed(1)}%<br>
            Journal days: ${wrote14.reduce((a, b) => a + b, 0)} / 14
          </div>
        </div>

        <div style="
          margin-top:12px;
          padding:14px; border-radius:14px;
          border:1px solid rgba(255,255,255,0.14);
          background:rgba(255,255,255,0.05);
        ">
          <div style="color:#E5E7EB; font-weight:900;">Writing correlations (safe estimate)</div>
          <div style="margin-top:10px; color:#9CA3AF; line-height:1.6;">
            Writing ↔ Energy: ${corrLabel(rWriteEnergy)} (${rWriteEnergy.toFixed(2)})<br>
            Writing ↔ Habits: ${corrLabel(rWriteHabits)} (${rWriteHabits.toFixed(2)})
          </div>
          <div style="margin-top:10px; color:#9CA3AF;">
            These are not medical claims. It’s pattern feedback based on your own logs.
          </div>
        </div>

        <div style="
          margin-top:12px;
          padding:14px; border-radius:14px;
          border:1px solid rgba(255,255,255,0.14);
          background:rgba(255,255,255,0.05);
        ">
          <div style="color:#E5E7EB; font-weight:900;">Action loop (best next step)</div>
          <div style="margin-top:10px; color:#9CA3AF; line-height:1.6;">
            ${
              avgHabits < 50
                ? "Your habits are the bottleneck. Keep journaling, but tie each entry to 1 habit decision for tomorrow."
                : avgEnergy < 5
                  ? "Energy looks low. Your best leverage is sleep/wake stability and sunlight. Track it for 7 days."
                  : "You’re stable. Convert journal clarity into execution: pick 1 priority and finish it daily."
            }
          </div>
        </div>
      </div>
    `;

    // Wire events (fresh each render; no global hooks)
    const mindBtn = document.getElementById("jiTabMind");
    const perfBtn = document.getElementById("jiTabPerformance");
    const refreshBtn = document.getElementById("jiRefresh");
    const newPromptBtn = document.getElementById("jiNewPrompt");

    if (mindBtn) mindBtn.onclick = () => setActiveTab("mind");
    if (perfBtn) perfBtn.onclick = () => setActiveTab("performance");
    if (refreshBtn) refreshBtn.onclick = () => render();
    if (newPromptBtn) {
      newPromptBtn.onclick = () => {
        const p = document.getElementById("jiPromptText");
        if (!p) return;
        const currentThemes = topThemes(last14Entries.length ? last14Entries : entries);
        const dom = dominantCategory((last14Entries.map(e => e.text).join(" ")) || "");
        p.textContent = getSmartPrompt([dom, ...currentThemes].filter(Boolean));
      };
    }

    setActiveTab(active === "performance" ? "performance" : "mind");
  }

  // ---------- Run ONLY when journal opens ----------
  const originalShowPage = window.showPage;

  if (typeof originalShowPage === "function") {
    window.showPage = function (page) {
      originalShowPage(page);
      if (page === "journal") {
        // small delay so journal DOM finishes rendering first
        setTimeout(render, 50);
      }
    };
  }

})();
