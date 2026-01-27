// =====================================================
// YOUTUBE API VAULT + LIVE STATS (TOP PRIORITY MODULE)
// - API key + Channel ID input UI
// - Stored locally (safe for GitHub)
// - Live YouTube stats
// - Renders at TOP of Content page
// - Mount-safe (never wiped by other modules)
// =====================================================

(function () {
  "use strict";

  const API_KEY_STORAGE = "ytApiKey";
  const CHANNEL_ID_STORAGE = "ytChannelId";
  const MOUNT_ID = "youtubeVaultMount";

  function getContentContainer() {
    return document.getElementById("contentContainer");
  }

  function ensureMount() {
    const container = getContentContainer();
    if (!container) return null;

    let mount = document.getElementById(MOUNT_ID);
    if (mount) return mount;

    mount = document.createElement("div");
    mount.id = MOUNT_ID;

    // ✅ VERY TOP of content page
    container.prepend(mount);

    return mount;
  }

  function getApiKey() {
    return localStorage.getItem(API_KEY_STORAGE) || "";
  }

  function getChannelId() {
    return localStorage.getItem(CHANNEL_ID_STORAGE) || "";
  }

  function setApiKey(key) {
    localStorage.setItem(API_KEY_STORAGE, key);
  }

  function setChannelId(id) {
    localStorage.setItem(CHANNEL_ID_STORAGE, id);
  }

  function clearKeys() {
    localStorage.removeItem(API_KEY_STORAGE);
    localStorage.removeItem(CHANNEL_ID_STORAGE);
  }

  async function fetchStats() {
    const apiKey = getApiKey();
    const channelId = getChannelId();

    if (!apiKey || !channelId) return null;

    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      const stats = data.items?.[0]?.statistics;
      if (!stats) return null;

      return {
        subs: stats.subscriberCount,
        views: stats.viewCount,
        videos: stats.videoCount
      };
    } catch (e) {
      console.error("YouTube API error:", e);
      return null;
    }
  }

  function format(num) {
    return Number(num).toLocaleString();
  }

  async function renderYouTubeVault() {
    const page = document.getElementById("contentPage");
    if (!page || !page.classList.contains("active")) return;

    const mount = ensureMount();
    if (!mount) return;

    const apiKey = getApiKey();
    const channelId = getChannelId();

    mount.innerHTML = `
      <div class="habit-section">
        <div class="section-title">🔐 API Vault (YouTube)</div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label style="color:#9CA3AF; font-size:0.85rem;">YouTube API Key</label>
            <input id="ytApiInput" class="form-input" placeholder="Paste API key..." value="${apiKey}">
          </div>

          <div>
            <label style="color:#9CA3AF; font-size:0.85rem;">Channel ID</label>
            <input id="ytChannelInput" class="form-input" placeholder="Paste Channel ID..." value="${channelId}">
          </div>
        </div>

        <div style="display:flex; gap:10px;">
          <button class="form-submit" id="saveYtKeyBtn">Save / Update</button>
          <button class="form-cancel" id="removeYtKeyBtn">Remove</button>
        </div>

        <div style="margin-top:10px; color:#9CA3AF; font-size:0.85rem;">
          Status: <span id="ytStatus">${apiKey && channelId ? "Key saved ✅" : "Not connected ❌"}</span>
        </div>
      </div>

      <div class="habit-section">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="section-title">📡 YouTube Live Stats</div>
          <button class="form-submit" id="refreshYTStats">Refresh</button>
        </div>

        <div class="content-stats" style="margin-top:12px;">
          <div class="content-stat-card">
            <div>Subscribers</div>
            <div id="ytSubs" style="font-size:1.7rem;font-weight:900;">...</div>
          </div>
          <div class="content-stat-card">
            <div>Total Views</div>
            <div id="ytViews" style="font-size:1.7rem;font-weight:900;">...</div>
          </div>
          <div class="content-stat-card">
            <div>Videos</div>
            <div id="ytVideos" style="font-size:1.7rem;font-weight:900;">...</div>
          </div>
        </div>
      </div>
    `;

    // Save button
    const saveBtn = mount.querySelector("#saveYtKeyBtn");
    saveBtn.onclick = () => {
      const key = mount.querySelector("#ytApiInput").value.trim();
      const id = mount.querySelector("#ytChannelInput").value.trim();

      if (key && id) {
        setApiKey(key);
        setChannelId(id);
        renderYouTubeVault();
      }
    };

    // Remove button (NO POPUPS)
    const removeBtn = mount.querySelector("#removeYtKeyBtn");
    removeBtn.onclick = () => {
      clearKeys();
      renderYouTubeVault();
    };

    // Load stats
    const stats = await fetchStats();
    if (stats) {
      mount.querySelector("#ytSubs").textContent = format(stats.subs);
      mount.querySelector("#ytViews").textContent = format(stats.views);
      mount.querySelector("#ytVideos").textContent = format(stats.videos);
    } else {
      mount.querySelector("#ytSubs").textContent = "—";
      mount.querySelector("#ytViews").textContent = "—";
      mount.querySelector("#ytVideos").textContent = "—";
    }

    const refreshBtn = mount.querySelector("#refreshYTStats");
    refreshBtn.onclick = renderYouTubeVault;
  }

  function hook() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(renderYouTubeVault, 120);
    });
  }

  function boot() {
    hook();
    setTimeout(renderYouTubeVault, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
