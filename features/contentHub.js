// =====================================================
// CONTENT HUB — CREATOR COMMAND CENTER 2.0
// - Tactical intelligence layer added
// - No existing features removed
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "contentHubItems";
  const ANALYTICS_KEY = "ytAnalyticsHistory";
  const CONTAINER_ID = "contentHubContainer";

  const YT_API_KEY = localStorage.getItem("YT_API_KEY") || "";
  const CHANNEL_ID = "UCKUFonoh8azQwjXnh2ViqHQ";

  const STAGES = [
    { key: "idea", label: "Idea" },
    { key: "research", label: "Research" },
    { key: "script", label: "Script" },
    { key: "editing", label: "Editing" },
    { key: "posted", label: "Posted" }
  ];

  function safeParse(raw, fallback) {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : fallback;
    } catch {
      return fallback;
    }
  }

  function getItems() {
    return safeParse(localStorage.getItem(STORAGE_KEY) || "[]", []);
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function getAnalyticsHistory() {
    return safeParse(localStorage.getItem(ANALYTICS_KEY) || "[]", []);
  }

  function saveAnalyticsHistory(data) {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function ensureContainer() {
    const page = document.getElementById("contentPage");
    if (!page) return null;

    let container = document.getElementById(CONTAINER_ID);
    if (container) return container;

    container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.className = "habit-section";

    page.innerHTML = "";
    page.appendChild(container);

    return container;
  }

  // =========================
  // YOUTUBE ANALYTICS ENGINE
  // =========================

  async function fetchYouTubeStats() {
    if (!YT_API_KEY) return null;

    try {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${CHANNEL_ID}&key=${YT_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.items || !data.items.length) return null;

      const stats = data.items[0].statistics;

      return {
        subs: Number(stats.subscriberCount),
        views: Number(stats.viewCount),
        videos: Number(stats.videoCount),
        time: Date.now()
      };
    } catch {
      return null;
    }
  }

  async function updateAnalytics() {
    const stats = await fetchYouTubeStats();
    if (!stats) return;

    const history = getAnalyticsHistory();
    const today = new Date().toISOString().split("T")[0];

    if (!history.find(h => h.date === today)) {
      history.push({
        date: today,
        subs: stats.subs,
        views: stats.views,
        videos: stats.videos
      });
      saveAnalyticsHistory(history);
    }

    window.__ytStats = stats;
  }

  // =========================
  // INTELLIGENCE ENGINE
  // =========================

  function calculateViralityScore(item) {
    let score = 0;

    if (item.stage === "posted") score += 30;
    if (item.stage === "editing") score += 20;
    if (item.stage === "script") score += 15;
    if (item.stage === "research") score += 10;
    if (item.stage === "idea") score += 5;

    if (item.notes && item.notes.length > 120) score += 15;
    if (item.title.length > 25) score += 10;

    const ageDays = (Date.now() - item.createdAt) / 86400000;
    if (ageDays < 2) score += 10;

    return Math.min(100, score);
  }

  function detectBottleneck(items) {
    const counts = STAGES.map(s => ({
      stage: s.key,
      count: items.filter(i => i.stage === s.key).length
    }));

    const max = counts.reduce((a, b) => (b.count > a.count ? b : a));
    return max.stage;
  }

  function calculateCreatorScore(items) {
    const posted = items.filter(i => i.stage === "posted").length;
    const active = items.length;
    if (!active) return 0;

    const efficiency = Math.round((posted / active) * 100);
    return Math.min(100, efficiency);
  }

  // =========================
  // LINE CHART
  // =========================

  function renderChart(range = "7d") {
    const history = getAnalyticsHistory();
    if (!history.length) return "";

    let data = history;
    if (range === "7d") data = history.slice(-7);
    if (range === "30d") data = history.slice(-30);

    const max = Math.max(
      ...data.map(d => d.subs),
      ...data.map(d => d.views),
      ...data.map(d => d.videos)
    );

    function line(arr) {
      return arr
        .map((v, i) => {
          const x = (i / (arr.length - 1 || 1)) * 100;
          const y = 100 - (v / max) * 100;
          return `${x},${y}`;
        })
        .join(" ");
    }

    return `
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%; height:160px;">
        <polyline points="${line(data.map(d => d.subs))}" fill="none" stroke="#22c55e" stroke-width="1.5"/>
        <polyline points="${line(data.map(d => d.views))}" fill="none" stroke="#6366f1" stroke-width="1.5"/>
        <polyline points="${line(data.map(d => d.videos))}" fill="none" stroke="#ec4899" stroke-width="1.5"/>
      </svg>
    `;
  }

  // =========================
  // MAIN RENDER
  // =========================

  async function renderContentHub() {
    const container = ensureContainer();
    if (!container) return;

    await updateAnalytics();

    const stats = window.__ytStats || { subs: 0, views: 0, videos: 0 };
    const items = getItems();

    const bottleneck = detectBottleneck(items);
    const creatorScore = calculateCreatorScore(items);

    const ranked = items
      .map(i => ({ ...i, score: calculateViralityScore(i) }))
      .sort((a, b) => b.score - a.score);

    container.innerHTML = `
      <div class="section-title">⚔️ Creator Command Center</div>

      <!-- KPI PANEL -->
      <div style="margin-top:12px; padding:16px; border-radius:16px; border:1px solid rgba(255,255,255,0.14); background:rgba(255,255,255,0.05);">
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px;">
          <div><div style="color:#9CA3AF;">Subscribers</div><div style="font-size:1.4rem; font-weight:900;">${stats.subs}</div></div>
          <div><div style="color:#9CA3AF;">Views</div><div style="font-size:1.4rem; font-weight:900;">${stats.views}</div></div>
          <div><div style="color:#9CA3AF;">Videos</div><div style="font-size:1.4rem; font-weight:900;">${stats.videos}</div></div>
          <div><div style="color:#9CA3AF;">Creator Score</div><div style="font-size:1.4rem; font-weight:900; color:#a78bfa;">${creatorScore}%</div></div>
        </div>

        <div style="margin-top:10px; font-weight:900; color:#facc15;">
          Bottleneck: ${bottleneck.toUpperCase()}
        </div>

        <div style="margin-top:10px;">
          ${renderChart(window.__chartRange || "7d")}
        </div>
      </div>

      <!-- TOP IDEAS -->
      <div style="margin-top:16px;">
        <div style="font-weight:900; margin-bottom:8px;">🔥 High-Impact Ideas</div>
        ${
          ranked.slice(0, 5).map(i => `
            <div style="padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,0.14); background:rgba(0,0,0,0.18); margin-bottom:6px;">
              <div style="display:flex; justify-content:space-between;">
                <span>${escapeHtml(i.title)}</span>
                <span style="color:#22c55e; font-weight:900;">${i.score}</span>
              </div>
            </div>
          `).join("") || `<div style="color:#9CA3AF;">No ideas yet.</div>`
        }
      </div>

      <!-- ORIGINAL CONTENT SYSTEM -->
      <div style="margin-top:18px;">
        ${renderOriginalUI(items)}
      </div>
    `;
  }

  function renderOriginalUI(items) {
    return `
      <div style="margin-top:12px;">
        ${
          items.length
            ? items.map(item => `
              <div style="padding:14px; border-radius:14px; border:1px solid rgba(255,255,255,0.14); background:rgba(0,0,0,0.18); margin-bottom:10px;">
                <div style="font-weight:900;">${escapeHtml(item.title)}</div>
                <div style="color:#9CA3AF; margin-top:6px;">${escapeHtml(item.notes || "No notes")}</div>
              </div>
            `).join("")
            : `<div style="color:#9CA3AF;">No content yet.</div>`
        }
      </div>
    `;
  }

  function hookNavigation() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(renderContentHub, 50);
    });
  }

  function observeActivation() {
    const page = document.getElementById("contentPage");
    if (!page) return;

    const obs = new MutationObserver(() => {
      if (page.classList.contains("active")) renderContentHub();
    });

    obs.observe(page, { attributes: true });
  }

  function boot() {
    hookNavigation();
    observeActivation();
    setTimeout(renderContentHub, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
