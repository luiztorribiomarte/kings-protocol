// =====================================================
// REWARD ENGINE v1 — AGGRESSIVE RANK + UNLOCK SYSTEM
// File: features/rewardEngine.js
// SAFE: New module only. Does not modify existing modules.
// - Computes Life Score from existing storage (same logic as Life Engine)
// - Rank themes (Bronze/Silver/Gold/King/Legend) applied to <body>
// - Rank badge overlay + rank up / buffered demotion toasts
// - Elite panel on dashboard: locked until GOLD+
// - Buffered demotion: 3 bad days in a row below current tier minimum
// =====================================================

(function () {
  "use strict";

  // -----------------------------
  // Config
  // -----------------------------
  const STORAGE_KEY = "kp_reward_rank_state_v1";
  const BAD_STREAK_TO_DEMOTE = 3;

  // Thresholds (tune later if you want)
  const TIERS = [
    { key: "bronze", name: "BRONZE", min: 0 },
    { key: "silver", name: "SILVER", min: 60 },
    { key: "gold", name: "GOLD", min: 80 },
    { key: "king", name: "KING", min: 90 },
    { key: "legend", name: "LEGEND", min: 98 }
  ];

  // -----------------------------
  // Helpers
  // -----------------------------
  function byId(id) {
    return document.getElementById(id);
  }

  function safeParse(raw, fallback) {
    try {
      return JSON.parse(raw) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    return safeParse(localStorage.getItem(STORAGE_KEY), {
      tierKey: "bronze",
      lastEvaluatedDay: null,
      badStreak: 0,
      lastScore: 0
    });
  }

  function todayKey() {
    return new Date().toISOString().split("T")[0];
  }

  function getLastDays(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  }

  function safeNum(n) {
    return typeof n === "number" && !isNaN(n) ? n : 0;
  }

  // -----------------------------
  // Life score computation (mirrors Life Engine 7.4)
  // -----------------------------
  function getHabitPercent(dateKey = todayKey()) {
    try {
      if (typeof window.getDayCompletion === "function") {
        const result = window.getDayCompletion(dateKey);
        return safeNum(result.percent);
      }
    } catch {}
    return 0;
  }

  function getEnergyPercent(dateKey = todayKey()) {
    try {
      const moodData = safeParse(localStorage.getItem("moodData") || "{}", {});
      const energy = moodData?.[dateKey]?.energy ?? 0;
      return Math.round((energy / 10) * 100);
    } catch {}
    return 0;
  }

  function getTaskPercentForDay(dateKey = todayKey()) {
    // History first
    try {
      const hist = safeParse(localStorage.getItem("todoHistory") || "{}", {});
      if (hist?.[dateKey]?.percent != null) return hist[dateKey].percent;
    } catch {}

    // Today fallback
    if (dateKey === todayKey()) {
      try {
        const todos = safeParse(localStorage.getItem("todos") || "[]", []);
        if (!todos.length) return 0;
        const done = todos.filter(t => t && t.done).length;
        return Math.round((done / todos.length) * 100);
      } catch {}
    }
    return 0;
  }

  function getStreakBonus() {
    // same as Life Engine: streak from habits >= 80 over last 30
    let streak = 0;
    const days = getLastDays(30).slice().reverse();
    for (const d of days) {
      const pct = getHabitPercent(d);
      if (pct >= 80) streak++;
      else break;
    }
    return Math.min(streak * 2, 15);
  }

  function calculateLifeScoreForDay(dateKey = todayKey()) {
    const habitPct = getHabitPercent(dateKey);
    const energyPct = getEnergyPercent(dateKey);
    const taskPct = getTaskPercentForDay(dateKey);
    const streakBonus = getStreakBonus(); // streak based on trailing days (same as your engine)

    const score =
      habitPct * 0.5 +
      energyPct * 0.25 +
      taskPct * 0.25 +
      streakBonus;

    return Math.min(100, Math.round(score));
  }

  // -----------------------------
  // Tier logic
  // -----------------------------
  function tierIndexByKey(key) {
    return Math.max(0, TIERS.findIndex(t => t.key === key));
  }

  function getTierByKey(key) {
    return TIERS[tierIndexByKey(key)] || TIERS[0];
  }

  function tierForScore(score) {
    let idx = 0;
    for (let i = 0; i < TIERS.length; i++) {
      if (score >= TIERS[i].min) idx = i;
    }
    return TIERS[idx];
  }

  function nextTier(currentKey) {
    const idx = tierIndexByKey(currentKey);
    return TIERS[Math.min(TIERS.length - 1, idx + 1)];
  }

  function prevTier(currentKey) {
    const idx = tierIndexByKey(currentKey);
    return TIERS[Math.max(0, idx - 1)];
  }

  // -----------------------------
  // UI: Aggressive themes + badge + elite panel
  // -----------------------------
  function ensureStyles() {
    if (byId("kpRewardStylesV1")) return;

    const style = document.createElement("style");
    style.id = "kpRewardStylesV1";
    style.textContent = `
      /* Rank classes applied to body */
      body.kp-tier-bronze .container { box-shadow: 0 0 0 2px rgba(255,255,255,0.04); }
      body.kp-tier-silver .container { box-shadow: 0 0 0 2px rgba(59,130,246,0.22), 0 0 30px rgba(59,130,246,0.14); }
      body.kp-tier-gold .container { box-shadow: 0 0 0 2px rgba(245,158,11,0.30), 0 0 36px rgba(245,158,11,0.18); }
      body.kp-tier-king .container { box-shadow: 0 0 0 2px rgba(239,68,68,0.34), 0 0 44px rgba(239,68,68,0.20); }
      body.kp-tier-legend .container { box-shadow: 0 0 0 2px rgba(168,85,247,0.34), 0 0 52px rgba(168,85,247,0.22); }

      /* Badge */
      #kpRankBadgeV1{
        position: fixed;
        top: 14px;
        right: 14px;
        z-index: 99999;
        border-radius: 16px;
        padding: 10px 12px;
        border: 1px solid rgba(255,255,255,0.18);
        backdrop-filter: blur(10px);
        background: rgba(0,0,0,0.72);
        display: flex;
        gap: 10px;
        align-items: center;
        max-width: 320px;
        user-select: none;
      }
      #kpRankBadgeV1 .kp-title{ font-weight: 900; letter-spacing: 0.5px; font-size: 0.85rem; color: rgba(255,255,255,0.78); }
      #kpRankBadgeV1 .kp-tier{ font-weight: 1000; font-size: 1.05rem; color: #fff; }
      #kpRankBadgeV1 .kp-sub{ font-weight: 800; font-size: 0.78rem; color: rgba(229,231,235,0.70); margin-top: 2px; }
      #kpRankBadgeV1 .kp-chip{
        border-radius: 999px;
        padding: 6px 10px;
        font-weight: 1000;
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.08);
        color: white;
      }

      /* Tier chip colors (aggressive) */
      body.kp-tier-bronze #kpRankBadgeV1 .kp-chip{ border-color: rgba(148,163,184,0.30); background: rgba(148,163,184,0.10); }
      body.kp-tier-silver #kpRankBadgeV1 .kp-chip{ border-color: rgba(59,130,246,0.40); background: rgba(59,130,246,0.14); }
      body.kp-tier-gold #kpRankBadgeV1 .kp-chip{ border-color: rgba(245,158,11,0.45); background: rgba(245,158,11,0.16); }
      body.kp-tier-king #kpRankBadgeV1 .kp-chip{ border-color: rgba(239,68,68,0.50); background: rgba(239,68,68,0.16); }
      body.kp-tier-legend #kpRankBadgeV1 .kp-chip{ border-color: rgba(168,85,247,0.55); background: rgba(168,85,247,0.18); }

      /* Elite panel lock overlay */
      #kpElitePanelV1{
        margin-top: 14px;
        padding: 16px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.14);
        background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
        position: relative;
        overflow: hidden;
      }
      #kpElitePanelV1 .kp-elite-title{ font-weight: 1000; font-size: 1.05rem; }
      #kpElitePanelV1 .kp-elite-sub{ color: #9CA3AF; margin-top: 6px; font-weight: 800; }
      #kpElitePanelV1.kp-locked::after{
        content: "🔒 LOCKED — REACH GOLD";
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 1000;
        letter-spacing: 1px;
        background: rgba(0,0,0,0.72);
        border: 2px solid rgba(245,158,11,0.25);
      }
      #kpElitePanelV1 .kp-elite-grid{
        margin-top: 12px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      #kpElitePanelV1 .kp-elite-card{
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.04);
        border-radius: 14px;
        padding: 12px;
      }
      #kpElitePanelV1 .kp-elite-card .v{ font-weight: 1000; font-size: 1.35rem; margin-top: 6px; }
      #kpElitePanelV1 .kp-elite-card .l{ color: #9CA3AF; font-weight: 900; font-size: 0.82rem; }

      /* Aggressive toast styling (uses your existing toast host if present, else we add our own) */
      #kpRewardToastHostV1{
        position: fixed;
        left: 16px;
        bottom: 16px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 360px;
      }
      .kpRewardToastV1{
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(0,0,0,0.82);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 12px 12px;
        color: white;
        font-weight: 1000;
        letter-spacing: 0.6px;
      }
      .kpRewardToastV1 .sub{
        margin-top: 6px;
        color: rgba(229,231,235,0.72);
        font-weight: 800;
        letter-spacing: 0.2px;
        font-size: 0.85rem;
      }
    `;
    document.head.appendChild(style);
  }

  function applyTierClass(tierKey) {
    const body = document.body;
    if (!body) return;

    // remove previous
    TIERS.forEach(t => body.classList.remove(`kp-tier-${t.key}`));
    body.classList.add(`kp-tier-${tierKey}`);
  }

  function ensureRankBadge() {
    if (byId("kpRankBadgeV1")) return;

    const badge = document.createElement("div");
    badge.id = "kpRankBadgeV1";
    badge.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:2px; flex:1; min-width: 160px;">
        <div class="kp-title">DISCIPLINE RANK</div>
        <div class="kp-tier" id="kpRankBadgeTier">--</div>
        <div class="kp-sub" id="kpRankBadgeSub">Life Score: --</div>
      </div>
      <div class="kp-chip" id="kpRankBadgeChip">--</div>
    `;
    document.body.appendChild(badge);
  }

  function setRankBadge(tierName, score, state) {
    const tierEl = byId("kpRankBadgeTier");
    const subEl = byId("kpRankBadgeSub");
    const chipEl = byId("kpRankBadgeChip");
    if (!tierEl || !subEl || !chipEl) return;

    tierEl.textContent = tierName;
    subEl.textContent = `Life Score: ${score} • Bad streak: ${state.badStreak}/${BAD_STREAK_TO_DEMOTE}`;
    chipEl.textContent = tierName;
  }

  function ensureRewardToastHost() {
    if (byId("kpRewardToastHostV1")) return;
    const host = document.createElement("div");
    host.id = "kpRewardToastHostV1";
    document.body.appendChild(host);
  }

  function rewardToast(title, sub) {
    ensureRewardToastHost();
    const host = byId("kpRewardToastHostV1");
    if (!host) return;

    const el = document.createElement("div");
    el.className = "kpRewardToastV1";
    el.innerHTML = `
      <div>${title}</div>
      ${sub ? `<div class="sub">${sub}</div>` : ``}
    `;
    host.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 220ms ease";
      setTimeout(() => el.remove(), 320);
    }, 2200);
  }

  function ensureElitePanel(tierKey, score) {
    const dash = byId("dashboardPage");
    if (!dash) return;

    let panel = byId("kpElitePanelV1");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "kpElitePanelV1";

      // Insert AFTER the Life Score block (dailyStatus) if possible
      const anchor = byId("dailyStatus");
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(panel, anchor.nextSibling);
      } else {
        dash.appendChild(panel);
      }
    }

    const unlocked = tierIndexByKey(tierKey) >= tierIndexByKey("gold");
    panel.classList.toggle("kp-locked", !unlocked);

    const next = nextTier(tierKey);
    const min = getTierByKey(tierKey).min;

    // A few “elite stats” (safe metrics from existing data)
    const today = todayKey();
    const habit = getHabitPercent(today);
    const energy = getEnergyPercent(today);
    const tasks = getTaskPercentForDay(today);

    panel.innerHTML = `
      <div class="kp-elite-title">⚔️ Elite Panel</div>
      <div class="kp-elite-sub">
        Tier minimum: ${min}+ • Next: ${next.name} at ${next.min}+
      </div>

      <div class="kp-elite-grid">
        <div class="kp-elite-card">
          <div class="l">Habits (today)</div>
          <div class="v">${Math.round(habit)}%</div>
        </div>
        <div class="kp-elite-card">
          <div class="l">Energy (today)</div>
          <div class="v">${Math.round(energy)}%</div>
        </div>
        <div class="kp-elite-card">
          <div class="l">Tasks (today)</div>
          <div class="v">${Math.round(tasks)}%</div>
        </div>
      </div>

      <div style="margin-top:12px; color: rgba(229,231,235,0.72); font-weight: 800;">
        Current Life Score: ${score}
      </div>
    `;
  }

  // -----------------------------
  // Evaluate rank with buffered demotion
  // -----------------------------
  function evaluateRank() {
    ensureStyles();
    ensureRankBadge();

    const state = loadState();
    const day = todayKey();
    const score = calculateLifeScoreForDay(day);

    // Determine promotion tier for today's score
    const scoreTier = tierForScore(score);

    const currentTier = getTierByKey(state.tierKey);
    const currentIdx = tierIndexByKey(state.tierKey);
    const scoreIdx = tierIndexByKey(scoreTier.key);

    let tierKey = state.tierKey;
    let badStreak = state.badStreak;

    // Promotion: immediate
    if (scoreIdx > currentIdx) {
      tierKey = scoreTier.key;
      badStreak = 0;
      rewardToast(`🔥 RANK UP`, `YOU ARE ${getTierByKey(tierKey).name}`);
    } else {
      // Buffered demotion logic: if score below current tier minimum, count bad day
      const minNeeded = currentTier.min;
      const isBad = score < minNeeded;

      // Only increment once per day (avoid spam on multiple renders)
      if (state.lastEvaluatedDay !== day) {
        badStreak = isBad ? (badStreak + 1) : 0;

        // Demote only if bad streak hits threshold and tier > bronze
        if (badStreak >= BAD_STREAK_TO_DEMOTE && currentIdx > 0) {
          tierKey = prevTier(state.tierKey).key;
          badStreak = 0;
          rewardToast(`⚠️ DEMOTED`, `BACK TO ${getTierByKey(tierKey).name}. LOCK IN.`);
        }
      }
    }

    // Apply UI changes
    applyTierClass(tierKey);
    setRankBadge(getTierByKey(tierKey).name, score, { ...state, badStreak });
    ensureElitePanel(tierKey, score);

    // Save state
    saveState({
      tierKey,
      lastEvaluatedDay: day,
      badStreak,
      lastScore: score
    });
  }

  // -----------------------------
  // Reactive triggers
  // -----------------------------
  function boot() {
    evaluateRank();

    // Re-evaluate on the same events your Life Engine listens for
    ["storage", "todosUpdated", "habitsUpdated", "moodUpdated", "plannerUpdated"].forEach(evt => {
      window.addEventListener(evt, () => {
        // slight delay to let other renders finish
        setTimeout(evaluateRank, 25);
      });
    });

    // Also re-check when navigating pages
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(evaluateRank, 80);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Optional debug API
  window.KPReward = {
    evaluateRank,
    getScoreToday: () => calculateLifeScoreForDay(todayKey()),
    getState: () => loadState()
  };
})();
