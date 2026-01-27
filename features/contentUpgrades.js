// =====================================================
// CONTENT UPGRADES OVERLAY (SAFE - NON-BLOCKING)
// - FIXED: does NOT block Content Hub buttons anymore
// - Injects upgrades BELOW core pipeline, not above it
// =====================================================

(function () {
  "use strict";

  const ITEMS_KEY = "contentHubItems";
  const YT_KEY_STORAGE = "kp_youtube_api_key";
  const YT_CHANNEL_STORAGE = "kp_youtube_channel_id";

  const WRAP_ID = "contentUpgradesWrap";
  const PIPELINE_CHART_ID = "contentPipelineChart";
  const SUBS_CHART_ID = "ytSubsChart";

  const SUBS_HISTORY_KEY = "kp_yt_sub_history";
  const LAST_FETCH_KEY = "kp_yt_last_fetch_ms";
  const LAST_STATS_KEY = "kp_yt_last_stats";

  let pipelineChart = null;
  let subsChart = null;

  function getContentContainer() {
    return document.getElementById("contentContainer");
  }

  function getItemsSafe() {
    try {
      return JSON.parse(localStorage.getItem(ITEMS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function getYTKey() {
    return (localStorage.getItem(YT_KEY_STORAGE) || "").trim();
  }

  function getChannelId() {
    return (localStorage.getItem(YT_CHANNEL_STORAGE) || "").trim();
  }

  function readSubsHistory() {
    try {
      return JSON.parse(localStorage.getItem(SUBS_HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function writeSubsHistory(arr) {
    localStorage.setItem(SUBS_HISTORY_KEY, JSON.stringify(arr));
  }

  function nowMs() {
    return Date.now();
  }

  function startOfDay(ms) {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function dayLabel(ms) {
    const d = new Date(ms);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function formatNum(n) {
    return Number(n || 0).toLocaleString();
  }

  function msToDays(ms) {
    return ms / (1000 * 60 * 60 * 24);
  }

  // ✅ IMPORTANT FIX:
  // Insert upgrades AFTER your core Content Hub UI, not before it.
  function ensureWrap(container) {
    let wrap = document.getElementById(WRAP_ID);
    if (wrap) return wrap;

    wrap = document.createElement("div");
    wrap.id = WRAP_ID;

    // Make sure upgrades NEVER block clicks
    wrap.style.pointerEvents = "auto";

    // Append at the very bottom (SAFE)
    container.appendChild(wrap);

    return wrap;
  }

  // =====================================================
  // YOUTUBE FETCH
  // =====================================================
  async function fetchYouTubeChannelStats() {
    const apiKey = getYTKey();
    const channelId = getChannelId();
    if (!apiKey || !channelId) return { ok: false };

    const lastFetch = Number(localStorage.getItem(LAST_FETCH_KEY) || "0");
    if (nowMs() - lastFetch < 20000) {
      try {
        const cached = JSON.parse(localStorage.getItem(LAST_STATS_KEY) || "null");
        if (cached) return { ok: true, data: cached, cached: true };
      } catch {}
    }

    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`;

    try {
      const res = await fetch(url);
      const json = await res.json();
      if (!json.items || !json.items.length) return { ok: false };

      const s = json.items[0].statistics;
      const data = {
        subs: Number(s.subscriberCount || 0),
        views: Number(s.viewCount || 0),
        videos: Number(s.videoCount || 0),
        fetchedAt: nowMs()
      };

      localStorage.setItem(LAST_FETCH_KEY, String(nowMs()));
      localStorage.setItem(LAST_STATS_KEY, JSON.stringify(data));

      const hist = readSubsHistory();
      const today = startOfDay(nowMs());
      const idx = hist.findIndex(p => startOfDay(p.t) === today);
      if (idx >= 0) hist[idx] = { t: today, subs: data.subs };
      else hist.push({ t: today, subs: data.subs });

      hist.sort((a, b) => a.t - b.t);
      writeSubsHistory(hist);

      return { ok: true, data };
    } catch {
      return { ok: false };
    }
  }

  // =====================================================
  // PIPELINE TREND CHART
  // =====================================================
  function buildDailySeries(rangeDays) {
    const items = getItemsSafe();
    const end = startOfDay(nowMs());
    let start;

    if (rangeDays === "all") {
      start = items.reduce((m, it) => Math.min(m, startOfDay(it.createdAt || end)), end);
    } else {
      const d = Number(rangeDays);
      start = startOfDay(end - (d - 1) * 86400000);
    }

    const days = [];
    for (let t = start; t <= end; t += 86400000) days.push(t);

    const ideas = new Array(days.length).fill(0);
    const scripts = new Array(days.length).fill(0);
    const posted = new Array(days.length).fill(0);

    const idxOf = t => Math.floor((startOfDay(t) - start) / 86400000);

    items.forEach(it => {
      const c = it.createdAt || it.updatedAt || nowMs();
      const u = it.updatedAt || c;
      const stage = (it.stage || "idea").toLowerCase();

      const i1 = idxOf(c);
      if (i1 >= 0 && i1 < ideas.length) ideas[i1]++;

      const i2 = idxOf(u);
      if (i2 >= 0 && i2 < ideas.length) {
        if (stage === "script") scripts[i2]++;
        if (stage === "posted") posted[i2]++;
      }
    });

    return { labels: days.map(dayLabel), ideas, scripts, posted };
  }

  function renderPipelineChart(canvas, range) {
    const s = buildDailySeries(range);

    if (pipelineChart) pipelineChart.destroy();

    pipelineChart = new Chart(canvas, {
      type: "line",
      data: {
        labels: s.labels,
        datasets: [
          { label: "Ideas", data: s.ideas, tension: 0.35 },
          { label: "Scripts", data: s.scripts, tension: 0.35 },
          { label: "Posted", data: s.posted, tension: 0.35 }
        ]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // =====================================================
  // PERFORMANCE METRICS
  // =====================================================
  function computeMetrics() {
    const items = getItemsSafe();
    const count = s => items.filter(i => (i.stage || "idea") === s).length;

    const idea = count("idea");
    const script = count("script");
    const posted = count("posted");

    const executionRate = script ? Math.round((posted / script) * 100) : 0;
    const ideaToPost = items.length ? Math.round((posted / items.length) * 100) : 0;

    return { idea, script, posted, executionRate, ideaToPost };
  }

  // =====================================================
  // MAIN RENDER
  // =====================================================
  function renderUpgrades() {
    const container = getContentContainer();
    if (!container) return;

    const page = document.getElementById("contentPage");
    if (!page || !page.classList.contains("active")) return;

    const wrap = ensureWrap(container);
    wrap.innerHTML = "";

    const metrics = computeMetrics();

    // DASHBOARD
    const dash = document.createElement("div");
    dash.className = "habit-section";
    dash.innerHTML = `
      <div class="section-title">🧠 Creator Performance Dashboard</div>
      <div class="content-stats">
        <div class="content-stat-card">
          <div>Execution Rate</div>
          <div style="font-size:1.6rem;font-weight:900">${metrics.executionRate}%</div>
        </div>
        <div class="content-stat-card">
          <div>Idea → Post</div>
          <div style="font-size:1.6rem;font-weight:900">${metrics.ideaToPost}%</div>
        </div>
        <div class="content-stat-card">
          <div>Total Ideas</div>
          <div style="font-size:1.6rem;font-weight:900">${metrics.idea}</div>
        </div>
        <div class="content-stat-card">
          <div>Posted</div>
          <div style="font-size:1.6rem;font-weight:900">${metrics.posted}</div>
        </div>
      </div>
    `;
    wrap.appendChild(dash);

    // PIPELINE CHART
    const chartBlock = document.createElement("div");
    chartBlock.className = "habit-section";
    chartBlock.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="section-title">📊 Content Pipeline</div>
        <select id="kpRange" class="form-input" style="width:auto">
          <option value="7">7 Days</option>
          <option value="30">30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>
      <canvas id="${PIPELINE_CHART_ID}" height="140"></canvas>
    `;
    wrap.appendChild(chartBlock);

    const canvas = chartBlock.querySelector(`#${PIPELINE_CHART_ID}`);
    const sel = chartBlock.querySelector("#kpRange");
    renderPipelineChart(canvas, sel.value);
    sel.onchange = () => renderPipelineChart(canvas, sel.value);

    // YOUTUBE SECTION
    const ytBlock = document.createElement("div");
    ytBlock.className = "habit-section";
    ytBlock.innerHTML = `
      <div class="section-title">📈 Live YouTube Data</div>
      <div id="ytStatus" style="color:#9CA3AF;margin-bottom:10px;">Loading...</div>
      <div class="content-stats" id="ytStats"></div>
      <canvas id="${SUBS_CHART_ID}" height="140"></canvas>
    `;
    wrap.appendChild(ytBlock);

    async function renderYT() {
      const status = ytBlock.querySelector("#ytStatus");
      const stats = ytBlock.querySelector("#ytStats");
      const canvas = ytBlock.querySelector(`#${SUBS_CHART_ID}`);

      const res = await fetchYouTubeChannelStats();
      if (!res.ok) {
        status.textContent = "YouTube not connected or API key invalid.";
        stats.innerHTML = "";
        return;
      }

      const d = res.data;
      status.textContent = "Live channel data loaded.";

      stats.innerHTML = `
        <div class="content-stat-card"><div>Subscribers</div><div style="font-size:1.6rem;font-weight:900">${formatNum(d.subs)}</div></div>
        <div class="content-stat-card"><div>Views</div><div style="font-size:1.6rem;font-weight:900">${formatNum(d.views)}</div></div>
        <div class="content-stat-card"><div>Videos</div><div style="font-size:1.6rem;font-weight:900">${formatNum(d.videos)}</div></div>
      `;

      const hist = readSubsHistory();
      if (subsChart) subsChart.destroy();

      subsChart = new Chart(canvas, {
        type: "line",
        data: {
          labels: hist.map(p => dayLabel(p.t)),
          datasets: [{ label: "Subscribers", data: hist.map(p => p.subs), tension: 0.35 }]
        },
        options: { responsive: true }
      });
    }

    renderYT();
  }

  // =====================================================
  // HOOK INTO NAVIGATION
  // =====================================================
  function hook() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(renderUpgrades, 100);
    });
  }

  function boot() {
    hook();
    setTimeout(renderUpgrades, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
