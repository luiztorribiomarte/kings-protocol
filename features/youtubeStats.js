// =====================================================
// YOUTUBE LIVE STATS MODULE (MOUNT SAFE)
// - Shows live subscribers, views, videos
// - Uses API key stored in localStorage (API Vault)
// - Renders into its OWN mount so nothing wipes it
// =====================================================

(function () {
  "use strict";

  const API_KEY_STORAGE = "ytApiKey";
  const CHANNEL_ID_STORAGE = "ytChannelId";
  const MOUNT_ID = "youtubeStatsMount";

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

    // Put YouTube stats ABOVE upgrades but BELOW content hub
    container.appendChild(mount);

    return mount;
  }

  function getApiKey() {
    return localStorage.getItem(API_KEY_STORAGE);
  }

  function getChannelId() {
    return localStorage.getItem(CHANNEL_ID_STORAGE);
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

  async function renderYouTubeStats() {
    const page = document.getElementById("contentPage");
    if (!page || !page.classList.contains("active")) return;

    const mount = ensureMount();
    if (!mount) return;

    const apiKey = getApiKey();
    const channelId = getChannelId();

    if (!apiKey || !channelId) {
      mount.innerHTML = `
        <div class="habit-section">
          <div class="section-title">📡 YouTube Live Stats</div>
          <div style="color:#9CA3AF;">
            Connect your API key and Channel ID in the API Vault above.
          </div>
        </div>
      `;
      return;
    }

    mount.innerHTML = `
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

    const stats = await fetchStats();
    if (stats) {
      mount.querySelector("#ytSubs").textContent = format(stats.subs);
      mount.querySelector("#ytViews").textContent = format(stats.views);
      mount.querySelector("#ytVideos").textContent = format(stats.videos);
    } else {
      mount.querySelector("#ytSubs").textContent = "Error";
      mount.querySelector("#ytViews").textContent = "Error";
      mount.querySelector("#ytVideos").textContent = "Error";
    }

    const btn = mount.querySelector("#refreshYTStats");
    if (btn) btn.onclick = renderYouTubeStats;
  }

  function hook() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(renderYouTubeStats, 120);
    });
  }

  function boot() {
    hook();
    setTimeout(renderYouTubeStats, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
