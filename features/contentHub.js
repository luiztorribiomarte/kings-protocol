// =====================================================
// CONTENT HUB CORE + CREATOR COMMAND CENTER + API VAULT
// + YOUTUBE LIVE STATS DASHBOARD (UPGRADE)
// =====================================================

(function () {
  "use strict";

  // ===============================
  // CONFIG + STORAGE
  // ===============================
  const STORAGE_KEY = "contentHubItems";
  const YT_KEY_STORAGE = "kp_youtube_api_key";
  const YT_CHANNEL_STORAGE = "kp_youtube_channel_id";

  const PANEL_ID = "creatorCommandCenter";
  const VAULT_ID = "creatorApiVaultPanel";
  const YT_PANEL_ID = "youtubeStatsPanel";

  const STAGES = ["idea", "research", "script", "editing", "posted"];

  function getContainer() {
    return document.getElementById("contentContainer");
  }

  function loadItems() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  // ===============================
  // API VAULT
  // ===============================
  function getYouTubeKey() {
    return (localStorage.getItem(YT_KEY_STORAGE) || "").trim();
  }

  function setYouTubeKey(key) {
    localStorage.setItem(YT_KEY_STORAGE, (key || "").trim());
  }

  function clearYouTubeKey() {
    localStorage.removeItem(YT_KEY_STORAGE);
  }

  function getChannelId() {
    return (localStorage.getItem(YT_CHANNEL_STORAGE) || "").trim();
  }

  function setChannelId(id) {
    localStorage.setItem(YT_CHANNEL_STORAGE, (id || "").trim());
  }

  function clearChannelId() {
    localStorage.removeItem(YT_CHANNEL_STORAGE);
  }

  function openVaultModal() {
    const html = `
      <div class="section-title">🔐 YouTube Connection</div>

      <div class="form-group">
        <label>YouTube API Key</label>
        <input id="kpYouTubeKeyInput" class="form-input" placeholder="Paste API key..." />
      </div>

      <div class="form-group">
        <label>YouTube Channel ID</label>
        <input id="kpChannelIdInput" class="form-input" placeholder="Paste Channel ID..." />
        <div style="color:#9CA3AF; font-size:0.85rem; margin-top:6px;">
          Example: UCxxxxxxxxxxxxxxxxxxxx
        </div>
      </div>

      <div class="form-actions">
        <button class="form-submit" onclick="window.__kpSaveYT()">Save</button>
        <button class="form-cancel" onclick="closeModal()">Cancel</button>
      </div>
    `;

    window.__kpSaveYT = function () {
      const key = document.getElementById("kpYouTubeKeyInput").value.trim();
      const id = document.getElementById("kpChannelIdInput").value.trim();

      if (key) setYouTubeKey(key);
      if (id) setChannelId(id);

      closeModal();
      renderContentHub();
    };

    openModal(html);
  }

  function renderApiVault(container) {
    const existing = document.getElementById(VAULT_ID);
    if (existing) existing.remove();

    const hasKey = !!getYouTubeKey();
    const hasChannel = !!getChannelId();

    const panel = document.createElement("div");
    panel.id = VAULT_ID;
    panel.className = "habit-section";

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <div>
          <div class="section-title">🔐 API Vault</div>
          <div style="color:#9CA3AF; font-size:0.9rem;">
            YouTube API connection stored locally.
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="form-submit" id="kpVaultBtn">
            ${hasKey && hasChannel ? "Update Connection" : "Connect YouTube"}
          </button>
          <button class="form-cancel" id="kpVaultRemoveBtn" ${hasKey || hasChannel ? "" : "disabled"} style="${hasKey || hasChannel ? "" : "opacity:.5;"}">
            Remove
          </button>
        </div>
      </div>

      <div style="margin-top:12px;">
        <div>Status:
          <span style="font-weight:900; color:${hasKey && hasChannel ? "#22c55e" : "#f87171"};">
            ${hasKey && hasChannel ? "Connected" : "Not connected"}
          </span>
        </div>
      </div>
    `;

    container.appendChild(panel);

    panel.querySelector("#kpVaultBtn").onclick = openVaultModal;
    panel.querySelector("#kpVaultRemoveBtn").onclick = () => {
      clearYouTubeKey();
      clearChannelId();
      renderContentHub();
    };
  }

  // ===============================
  // YOUTUBE LIVE STATS
  // ===============================
  async function fetchYouTubeStats() {
    const apiKey = getYouTubeKey();
    const channelId = getChannelId();
    if (!apiKey || !channelId) return null;

    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.items || !data.items.length) return null;

      const ch = data.items[0];
      return {
        name: ch.snippet.title,
        subs: ch.statistics.subscriberCount,
        views: ch.statistics.viewCount,
        videos: ch.statistics.videoCount,
        updated: new Date().toLocaleTimeString()
      };
    } catch (e) {
      console.error("YouTube API error:", e);
      return null;
    }
  }

  async function renderYouTubePanel(container) {
    const existing = document.getElementById(YT_PANEL_ID);
    if (existing) existing.remove();

    const apiKey = getYouTubeKey();
    const channelId = getChannelId();

    if (!apiKey || !channelId) return;

    const panel = document.createElement("div");
    panel.id = YT_PANEL_ID;
    panel.className = "habit-section";

    panel.innerHTML = `<div class="section-title">📺 YouTube Live Stats</div>
    <div style="color:#9CA3AF;">Loading live data...</div>`;

    container.appendChild(panel);

    const stats = await fetchYouTubeStats();

    if (!stats) {
      panel.innerHTML = `
        <div class="section-title">📺 YouTube Live Stats</div>
        <div style="color:#f87171;">Unable to load data. Check API key or Channel ID.</div>
      `;
      return;
    }

    panel.innerHTML = `
      <div class="section-title">📺 YouTube Live Stats</div>

      <div class="content-stats">
        <div class="content-stat-card">
          <div style="color:#9CA3AF;">Channel</div>
          <div style="font-size:1.2rem; font-weight:900;">${stats.name}</div>
        </div>
        <div class="content-stat-card">
          <div style="color:#9CA3AF;">Subscribers</div>
          <div style="font-size:1.8rem; font-weight:900;">${Number(stats.subs).toLocaleString()}</div>
        </div>
        <div class="content-stat-card">
          <div style="color:#9CA3AF;">Total Views</div>
          <div style="font-size:1.8rem; font-weight:900;">${Number(stats.views).toLocaleString()}</div>
        </div>
        <div class="content-stat-card">
          <div style="color:#9CA3AF;">Videos</div>
          <div style="font-size:1.8rem; font-weight:900;">${Number(stats.videos).toLocaleString()}</div>
        </div>
      </div>

      <div style="margin-top:10px; color:#9CA3AF; font-size:0.85rem;">
        Last updated: ${stats.updated}
      </div>

      <button class="form-submit" style="margin-top:12px;" onclick="window.__kpRefreshYT()">
        Refresh
      </button>
    `;

    window.__kpRefreshYT = () => renderContentHub();
  }

  // ===============================
  // CONTENT PIPELINE (unchanged core)
  // ===============================
  function addItem(title, notes) {
    const items = loadItems();
    items.unshift({
      id: Date.now(),
      title,
      notes,
      stage: "idea",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    saveItems(items);
    renderContentHub();
  }

  function renderPipeline(container, items) {
    const wrapper = document.createElement("div");
    wrapper.className = "habit-section";

    wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div class="section-title">🎬 Content Pipeline</div>
        <button class="form-submit" onclick="window.__kpAddIdea()">Add Idea</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(${STAGES.length},1fr); gap:12px;">
        ${STAGES.map(stage => `
          <div style="border:1px solid rgba(255,255,255,0.15); border-radius:14px; padding:10px;">
            <div style="font-weight:900; margin-bottom:8px;">${stage.toUpperCase()}</div>
            ${items.filter(i => i.stage === stage).map(i => `
              <div class="idea-item">
                <div style="font-weight:800;">${i.title}</div>
                <div style="color:#9CA3AF; font-size:0.85rem;">${i.notes || ""}</div>
              </div>
            `).join("") || `<div style="color:#9CA3AF;">Empty</div>`}
          </div>
        `).join("")}
      </div>
    `;

    container.appendChild(wrapper);

    window.__kpAddIdea = function () {
      openModal(`
        <div class="section-title">➕ Add Idea</div>
        <div class="form-group">
          <label>Title</label>
          <input id="newIdeaTitle" class="form-input" />
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="newIdeaNotes" class="form-input"></textarea>
        </div>
        <div class="form-actions">
          <button class="form-submit" onclick="window.__kpSaveIdea()">Add</button>
          <button class="form-cancel" onclick="closeModal()">Cancel</button>
        </div>
      `);

      window.__kpSaveIdea = function () {
        const title = document.getElementById("newIdeaTitle").value.trim();
        const notes = document.getElementById("newIdeaNotes").value.trim();
        if (!title) return;
        addItem(title, notes);
        closeModal();
      };
    };
  }

  // ===============================
  // COMMAND CENTER (unchanged logic)
  // ===============================
  function renderCommandCenter(container, items) {
    const posted = items.filter(i => i.stage === "posted").length;
    const score = items.length ? Math.round((posted / items.length) * 100) : 0;

    const panel = document.createElement("div");
    panel.className = "habit-section";

    panel.innerHTML = `
      <div class="section-title">⚔️ Creator Tactical Command Center</div>
      <div class="content-stats">
        <div class="content-stat-card">
          <div style="color:#9CA3AF;">Ideas</div>
          <div style="font-size:1.6rem; font-weight:900;">${items.length}</div>
        </div>
        <div class="content-stat-card">
          <div style="color:#9CA3AF;">Posted</div>
          <div style="font-size:1.6rem; font-weight:900;">${posted}</div>
        </div>
        <div class="content-stat-card">
          <div style="color:#9CA3AF;">Creator Score</div>
          <div style="font-size:1.6rem; font-weight:900; color:#a78bfa;">${score}%</div>
        </div>
      </div>
    `;

    container.appendChild(panel);
  }

  // ===============================
  // MAIN RENDER
  // ===============================
  async function renderContentHub() {
    const container = getContainer();
    if (!container) return;

    container.innerHTML = "";

    const items = loadItems();

    renderApiVault(container);
    await renderYouTubePanel(container);
    renderCommandCenter(container, items);
    renderPipeline(container, items);
  }

  function hookNavigation() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(renderContentHub, 80);
    });
  }

  function boot() {
    hookNavigation();
    setTimeout(renderContentHub, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
