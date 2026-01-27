// =====================================================
// YOUTUBE INTELLIGENCE ENGINE (ELITE UPGRADE)
// - API Vault
// - Live stats
// - Auto refresh
// - Subscriber history
// - Growth analytics
// - Growth chart
// - Milestone detection
// - Prediction engine
// - Mount-safe, top-priority module
// =====================================================

(function () {
  "use strict";

  const API_KEY_STORAGE = "ytApiKey";
  const CHANNEL_ID_STORAGE = "ytChannelId";

  const SUB_HISTORY_KEY = "ytSubHistory";
  const MILESTONE_KEY = "ytMilestones";

  const MOUNT_ID = "youtubeVaultMount";
  const AUTO_REFRESH_MS = 60000; // 60s

  let chart = null;
  let refreshTimer = null;

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

    // TOP of Content page
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

  function loadSubHistory() {
    try {
      return JSON.parse(localStorage.getItem(SUB_HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveSubHistory(data) {
    localStorage.setItem(SUB_HISTORY_KEY, JSON.stringify(data));
  }

  function loadMilestones() {
    try {
      return JSON.parse(localStorage.getItem(MILESTONE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveMilestones(data) {
    localStorage.setItem(MILESTONE_KEY, JSON.stringify(data));
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
        subs: Number(stats.subscriberCount),
        views: Number(stats.viewCount),
        videos: Number(stats.videoCount)
      };
    } catch (e) {
      console.error("YT API error:", e);
      return null;
    }
  }

  function format(n) {
    return Number(n || 0).toLocaleString();
  }

  function todayKey() {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d.getTime();
  }

  function trackHistory(subs) {
    const hist = loadSubHistory();
    const t = todayKey();
    const existing = hist.find(h => h.day === t);

    if (existing) {
      existing.subs = subs;
    } else {
      hist.push({ day: t, subs });
    }

    hist.sort((a,b) => a.day - b.day);
    saveSubHistory(hist);
    return hist;
  }

  function detectMilestones(subs) {
    const milestones = [10,50,100,500,1000,10000,100000];
    const reached = loadMilestones();

    milestones.forEach(m => {
      if (subs >= m && !reached.includes(m)) {
        reached.push(m);
      }
    });

    saveMilestones(reached);
    return reached;
  }

  function computeGrowth(hist) {
    if (hist.length < 2) return { today:0, week:0, month:0, velocity:0 };

    const latest = hist[hist.length-1];
    const prev = hist[hist.length-2];

    const today = latest.subs - prev.subs;

    const weekAgo = hist.find(h => h.day >= latest.day - 6*86400000) || hist[0];
    const monthAgo = hist.find(h => h.day >= latest.day - 29*86400000) || hist[0];

    const week = latest.subs - weekAgo.subs;
    const month = latest.subs - monthAgo.subs;

    const velocity = hist.length > 1 ? (latest.subs - hist[0].subs) / hist.length : 0;

    return { today, week, month, velocity };
  }

  function predict(subs, velocity) {
    return {
      d7: Math.round(subs + velocity*7),
      d30: Math.round(subs + velocity*30)
    };
  }

  function buildSeries(hist, range) {
    let data = hist;

    if (range === "7") data = hist.slice(-7);
    if (range === "30") data = hist.slice(-30);

    return {
      labels: data.map(d => new Date(d.day).toLocaleDateString(undefined,{month:"short",day:"numeric"})),
      values: data.map(d => d.subs)
    };
  }

  function renderChart(canvas, hist, range) {
    if (chart) chart.destroy();

    const s = buildSeries(hist, range);

    chart = new Chart(canvas, {
      type:"line",
      data:{
        labels:s.labels,
        datasets:[{
          label:"Subscribers",
          data:s.values,
          tension:0.35
        }]
      },
      options:{
        responsive:true,
        scales:{ y:{ beginAtZero:false } }
      }
    });
  }

  async function render() {
    const page = document.getElementById("contentPage");
    if (!page || !page.classList.contains("active")) return;

    const mount = ensureMount();
    if (!mount) return;

    const apiKey = getApiKey();
    const channelId = getChannelId();

    mount.innerHTML = `
      <div class="habit-section">
        <div class="section-title">🔐 API Vault (YouTube)</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
          <div>
            <label style="color:#9CA3AF;font-size:0.85rem;">API Key</label>
            <input id="ytApiInput" class="form-input" value="${apiKey}">
          </div>
          <div>
            <label style="color:#9CA3AF;font-size:0.85rem;">Channel ID</label>
            <input id="ytChannelInput" class="form-input" value="${channelId}">
          </div>
        </div>

        <div style="display:flex;gap:10px;">
          <button class="form-submit" id="saveYt">Save / Update</button>
          <button class="form-cancel" id="removeYt">Remove</button>
        </div>
      </div>

      <div class="habit-section">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="section-title">📡 Live YouTube Intelligence</div>
          <button class="form-submit" id="refreshYT">Refresh</button>
        </div>

        <div class="content-stats" style="margin-top:12px;">
          <div class="content-stat-card"><div>Subscribers</div><div id="subs" style="font-size:1.7rem;font-weight:900;">—</div></div>
          <div class="content-stat-card"><div>Views</div><div id="views" style="font-size:1.7rem;font-weight:900;">—</div></div>
          <div class="content-stat-card"><div>Videos</div><div id="videos" style="font-size:1.7rem;font-weight:900;">—</div></div>
        </div>

        <div class="content-stats" style="margin-top:12px;">
          <div class="content-stat-card"><div>Today</div><div id="gToday">0</div></div>
          <div class="content-stat-card"><div>7 Day</div><div id="gWeek">0</div></div>
          <div class="content-stat-card"><div>30 Day</div><div id="gMonth">0</div></div>
          <div class="content-stat-card"><div>Velocity</div><div id="gVel">0/day</div></div>
        </div>

        <div class="content-stats" style="margin-top:12px;">
          <div class="content-stat-card"><div>7d Forecast</div><div id="p7">—</div></div>
          <div class="content-stat-card"><div>30d Forecast</div><div id="p30">—</div></div>
        </div>
      </div>

      <div class="habit-section">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="section-title">📈 Subscriber Growth</div>
          <select id="range" class="form-input" style="width:auto;">
            <option value="7">7 Days</option>
            <option value="30">30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <canvas id="ytChart" height="140"></canvas>
      </div>
    `;

    mount.querySelector("#saveYt").onclick = ()=>{
      setApiKey(mount.querySelector("#ytApiInput").value.trim());
      setChannelId(mount.querySelector("#ytChannelInput").value.trim());
      render();
    };

    mount.querySelector("#removeYt").onclick = ()=>{
      clearKeys();
      render();
    };

    mount.querySelector("#refreshYT").onclick = render;

    const stats = await fetchStats();
    if (!stats) return;

    const hist = trackHistory(stats.subs);
    detectMilestones(stats.subs);

    const growth = computeGrowth(hist);
    const pred = predict(stats.subs, growth.velocity);

    mount.querySelector("#subs").textContent = format(stats.subs);
    mount.querySelector("#views").textContent = format(stats.views);
    mount.querySelector("#videos").textContent = format(stats.videos);

    mount.querySelector("#gToday").textContent = growth.today;
    mount.querySelector("#gWeek").textContent = growth.week;
    mount.querySelector("#gMonth").textContent = growth.month;
    mount.querySelector("#gVel").textContent = growth.velocity.toFixed(2)+"/day";

    mount.querySelector("#p7").textContent = format(pred.d7);
    mount.querySelector("#p30").textContent = format(pred.d30);

    const canvas = mount.querySelector("#ytChart");
    const sel = mount.querySelector("#range");
    renderChart(canvas, hist, sel.value);
    sel.onchange = ()=>renderChart(canvas, hist, sel.value);

    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(render, AUTO_REFRESH_MS);
  }

  function hook(){
    document.addEventListener("click", e=>{
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(render,120);
    });
  }

  function boot(){
    hook();
    setTimeout(render,150);
  }

  if (document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot);
  } else {
    boot();
  }

})();
