// =====================================================
// CONTENT HUB MODULE 2.0 — YOUTUBE INTELLIGENCE ENGINE
// SAFE UPGRADE — DOES NOT BREAK EXISTING FEATURES
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "contentHubItems";
  const YT_STATS_KEY = "ytStatsHistory";
  const API_KEY_STORAGE = "ytApiKey";
  const CHANNEL_ID = "UCKUFonoh8azQwjXnh2ViqHQ";

  const CONTAINER_ID = "contentHubContainer";

  const STAGES = [
    { key: "idea", label: "Idea" },
    { key: "research", label: "Research" },
    { key: "script", label: "Script" },
    { key: "editing", label: "Editing" },
    { key: "posted", label: "Posted" }
  ];

  // ------------------ Utilities ------------------

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

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function getApiKey() {
    return localStorage.getItem(API_KEY_STORAGE) || "";
  }

  function setApiKey(key) {
    localStorage.setItem(API_KEY_STORAGE, key);
  }

  function todayKey() {
    return new Date().toISOString().split("T")[0];
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

  // ------------------ YouTube API ------------------

  async function fetchYouTubeStats() {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const url =
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${CHANNEL_ID}&key=${apiKey}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.items || !data.items.length) return null;

      const ch = data.items[0];
      const stats = ch.statistics;
      const snippet = ch.snippet;

      return {
        subs: Number(stats.subscriberCount || 0),
        views: Number(stats.viewCount || 0),
        videos: Number(stats.videoCount || 0),
        name: snippet.title,
        avatar: snippet.thumbnails?.default?.url || "",
        date: todayKey()
      };
    } catch {
      return null;
    }
  }

  function saveStatsHistory(newStats) {
    if (!newStats) return;

    let history = safeParse(localStorage.getItem(YT_STATS_KEY) || "[]", []);
    const today = todayKey();

    const exists = history.find(h => h.date === today);
    if (!exists) {
      history.push(newStats);
      localStorage.setItem(YT_STATS_KEY, JSON.stringify(history));
    }
  }

  function getStatsHistory() {
    return safeParse(localStorage.getItem(YT_STATS_KEY) || "[]", []);
  }

  function getGrowthStatus(history) {
    if (history.length < 2) return "Not enough data";

    const last = history[history.length - 1].subs;
    const prev = history[history.length - 2].subs;

    if (last > prev) return "Growing 📈";
    if (last < prev) return "Dropping ⚠️";
    return "Stagnant 😐";
  }

  // ------------------ UI Rendering ------------------

  function renderYouTubePanel(stats) {
    const history = getStatsHistory();
    const status = history.length ? getGrowthStatus(history) : "Not fetched yet";

    return `
      <div style="
        margin-top:10px;
        padding:16px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.05);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <div style="display:flex; gap:12px; align-items:center;">
            ${stats?.avatar ? `<img src="${stats.avatar}" style="width:48px;height:48px;border-radius:50%;">` : ""}
            <div>
              <div style="font-weight:900;color:white;">YouTube Channel</div>
              <div style="color:#9CA3AF;font-size:0.9rem;">${escapeHtml(stats?.name || "Not connected")}</div>
              <div style="font-size:0.85rem;margin-top:2px;">${status}</div>
            </div>
          </div>

          <div style="display:flex; gap:8px;">
            <button onclick="setYouTubeApiKey()" style="padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);color:white;font-weight:800;">Set API Key</button>
            <button onclick="refreshYouTubeStats()" style="padding:8px 12px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#ec4899);color:white;border:none;font-weight:900;">Refresh</button>
            <button onclick="showSubsChart()" style="padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);color:white;font-weight:800;">Subs Chart</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px;">
          <div class="stat-card">
            <div style="color:#9CA3AF;font-weight:800;">Subscribers</div>
            <div style="font-size:1.6rem;font-weight:950;color:white;">${stats?.subs ?? 0}</div>
          </div>
          <div class="stat-card">
            <div style="color:#9CA3AF;font-weight:800;">Views</div>
            <div style="font-size:1.6rem;font-weight:950;color:white;">${stats?.views ?? 0}</div>
          </div>
          <div class="stat-card">
            <div style="color:#9CA3AF;font-weight:800;">Videos</div>
            <div style="font-size:1.6rem;font-weight:950;color:white;">${stats?.videos ?? 0}</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderContentHub() {
    const container = ensureContainer();
    if (!container) return;

    const items = getItems();
    const filterKey = (window.__contentHubFilterKey || "all");

    const filtered =
      filterKey === "all"
        ? items
        : items.filter(x => x.stage === filterKey);

    const stats = window.__ytStats || null;

    container.innerHTML = `
      <div class="section-title">🎬 Content Hub</div>

      ${renderYouTubePanel(stats)}

      <div style="margin-top:12px;">
        <input id="contentTitleInput" placeholder="New idea title..."
          style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:10px;color:white;" />
        <div style="display:flex;gap:10px;margin-top:8px;">
          <select id="contentStageInput" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px;color:white;">
            ${STAGES.map(s => `<option value="${s.key}">${escapeHtml(s.label)}</option>`).join("")}
          </select>
          <button onclick="addContentItem()" style="padding:8px 14px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#ec4899);color:white;font-weight:900;border:none;">Add</button>
        </div>
        <textarea id="contentNotesInput" placeholder="Notes..."
          style="width:100%;margin-top:8px;height:70px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:10px;color:white;"></textarea>
      </div>

      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
        ${renderFilters(filterKey)}
      </div>

      <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px;">
        ${
          filtered.length
            ? filtered.map(item => renderCard(item)).join("")
            : `<div style="color:#9CA3AF;">No content yet.</div>`
        }
      </div>
    `;
  }

  function renderFilters(activeKey) {
    const pill = (key, label) => {
      const active = key === activeKey;
      return `
        <button onclick="setContentFilter('${key}')" style="
          padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.14);
          background:${active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)"};
          color:${active ? "#E5E7EB" : "#9CA3AF"};
          font-weight:900;
        ">${escapeHtml(label)}</button>
      `;
    };
    return [
      pill("all", "All"),
      ...STAGES.map(s => pill(s.key, s.label))
    ].join("");
  }

  function renderCard(item) {
    return `
      <div style="padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,0.14);background:rgba(0,0,0,0.18);">
        <div style="font-weight:950;color:white;">${escapeHtml(item.title)}</div>
        <div style="color:#9CA3AF;margin-top:4px;">${escapeHtml(item.notes || "No notes")}</div>
        <div style="margin-top:8px;display:flex;gap:8px;">
          <select onchange="setContentStage('${item.id}', this.value)" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:white;">
            ${STAGES.map(s => `<option value="${s.key}" ${s.key === item.stage ? "selected" : ""}>${escapeHtml(s.label)}</option>`).join("")}
          </select>
          <button onclick="deleteContentItem('${item.id}')" style="color:#FCA5A5;border:1px solid rgba(239,68,68,0.35);background:none;border-radius:8px;padding:6px 10px;font-weight:900;">Delete</button>
        </div>
      </div>
    `;
  }

  // ------------------ Public API ------------------

  window.setYouTubeApiKey = function () {
    const key = prompt("Paste your YouTube API Key:");
    if (key) {
      setApiKey(key.trim());
      alert("API key saved securely.");
    }
  };

  window.refreshYouTubeStats = async function () {
    const stats = await fetchYouTubeStats();
    if (!stats) return alert("Failed to fetch YouTube data. Check API key.");
    window.__ytStats = stats;
    saveStatsHistory(stats);
    renderContentHub();
  };

  window.showSubsChart = function () {
    const history = getStatsHistory();
    if (!history.length) return alert("No data yet.");

    const labels = history.map(h => h.date);
    const values = history.map(h => h.subs);

    if (typeof openModal !== "function") return;

    openModal(`
      <h2 style="color:white;">Subscriber History</h2>
      <div style="margin-top:12px;">
        ${history.map(h => `<div>${h.date}: ${h.subs}</div>`).join("")}
      </div>
    `);
  };

  window.setContentFilter = function (key) {
    window.__contentHubFilterKey = key;
    renderContentHub();
  };

  window.addContentItem = function () {
    const titleEl = document.getElementById("contentTitleInput");
    const stageEl = document.getElementById("contentStageInput");
    const notesEl = document.getElementById("contentNotesInput");

    const title = titleEl.value.trim();
    if (!title) return;

    const items = getItems();
    items.push({
      id: uid(),
      title,
      stage: stageEl.value,
      notes: notesEl.value,
      createdAt: Date.now()
    });

    saveItems(items);

    titleEl.value = "";
    notesEl.value = "";

    renderContentHub();
  };

  window.deleteContentItem = function (id) {
    saveItems(getItems().filter(x => x.id !== id));
    renderContentHub();
  };

  window.setContentStage = function (id, stage) {
    const items = getItems().map(x =>
      x.id === id ? { ...x, stage } : x
    );
    saveItems(items);
    renderContentHub();
  };

  function boot() {
    renderContentHub();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
