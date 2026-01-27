// =====================================================
// CONTENT UPGRADES OVERLAY (SAFE)
// - Adds the upgrades you listed earlier without breaking core
// - Content Pipeline Line Chart (7/30/All)
// - Creator Performance Dashboard
// - Command Center 2.0: Growth Forecast + Subscriber History Chart
// - Content Intelligence Ranking System (extended)
// =====================================================

(function () {
  "use strict";

  const ITEMS_KEY = "contentHubItems";
  const YT_KEY_STORAGE = "kp_youtube_api_key";
  const YT_CHANNEL_STORAGE = "kp_youtube_channel_id";

  const WRAP_ID = "contentUpgradesWrap";
  const PIPELINE_CHART_ID = "contentPipelineChart";
  const SUBS_CHART_ID = "ytSubsChart";

  const SUBS_HISTORY_KEY = "kp_yt_sub_history"; // [{t:number, subs:number}]
  const LAST_FETCH_KEY = "kp_yt_last_fetch_ms";
  const LAST_STATS_KEY = "kp_yt_last_stats"; // cached display

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
      const arr = JSON.parse(localStorage.getItem(SUBS_HISTORY_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function writeSubsHistory(arr) {
    localStorage.setItem(SUBS_HISTORY_KEY, JSON.stringify(arr));
  }

  function formatNum(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "0";
    return x.toLocaleString();
  }

  function msToDays(ms) {
    return ms / (1000 * 60 * 60 * 24);
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

  function nowMs() {
    return Date.now();
  }

  function ensureWrap(container) {
    let wrap = document.getElementById(WRAP_ID);
    if (wrap) return wrap;

    wrap = document.createElement("div");
    wrap.id = WRAP_ID;

    // Put upgrades near the top, but under whatever your core already injected
    // We insert after the first 2 blocks if they exist, otherwise at top.
    const children = Array.from(container.children);
    if (children.length >= 2) {
      children[1].after(wrap);
    } else {
      container.prepend(wrap);
    }

    return wrap;
  }

  // -----------------------------------------------------
  // YOUTUBE FETCH (safe + cached)
  // -----------------------------------------------------
  async function fetchYouTubeChannelStats() {
    const apiKey = getYTKey();
    const channelId = getChannelId();
    if (!apiKey || !channelId) return { ok: false, reason: "not_connected" };

    // throttle to avoid spam
    const lastFetch = Number(localStorage.getItem(LAST_FETCH_KEY) || "0");
    if (nowMs() - lastFetch < 20 * 1000) {
      // return cached if exists
      try {
        const cached = JSON.parse(localStorage.getItem(LAST_STATS_KEY) || "null");
        if (cached) return { ok: true, data: cached, cached: true };
      } catch {}
    }

    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`;

    try {
      const res = await fetch(url);
      const json = await res.json();

      if (!json.items || !json.items.length) {
        return { ok: false, reason: "no_items", raw: json };
      }

      const ch = json.items[0];
      const data = {
        name: ch?.snippet?.title || "Channel",
        subs: Number(ch?.statistics?.subscriberCount || 0),
        views: Number(ch?.statistics?.viewCount || 0),
        videos: Number(ch?.statistics?.videoCount || 0),
        fetchedAt: nowMs()
      };

      localStorage.setItem(LAST_FETCH_KEY, String(nowMs()));
      localStorage.setItem(LAST_STATS_KEY, JSON.stringify(data));

      // update history (1 point per day)
      const hist = readSubsHistory();
      const today = startOfDay(nowMs());
      const existingIdx = hist.findIndex(p => startOfDay(p.t) === today);
      if (existingIdx >= 0) {
        hist[existingIdx] = { t: today, subs: data.subs };
      } else {
        hist.push({ t: today, subs: data.subs });
      }
      hist.sort((a, b) => a.t - b.t);
      writeSubsHistory(hist);

      return { ok: true, data, cached: false };
    } catch (e) {
      console.error("YouTube fetch error:", e);
      return { ok: false, reason: "fetch_error", err: String(e) };
    }
  }

  // -----------------------------------------------------
  // PIPELINE TREND CHART (Ideas / Scripts / Posted)
  // We approximate stage entry by updatedAt (since stage history isn't stored)
  // -----------------------------------------------------
  function buildDailySeries(rangeDays) {
    const items = getItemsSafe();
    const end = startOfDay(nowMs());
    let start = end;

    if (rangeDays === "all") {
      const min = items.reduce((m, it) => Math.min(m, startOfDay(it.createdAt || end)), end);
      start = min;
    } else {
      const d = Number(rangeDays);
      start = end - (d - 1) * 24 * 60 * 60 * 1000;
      start = startOfDay(start);
    }

    const days = [];
    for (let t = start; t <= end; t += 24 * 60 * 60 * 1000) {
      days.push(t);
    }

    const ideaCounts = new Array(days.length).fill(0);
    const scriptCounts = new Array(days.length).fill(0);
    const postedCounts = new Array(days.length).fill(0);

    const idxOf = (t) => Math.floor((startOfDay(t) - start) / (24 * 60 * 60 * 1000));

    items.forEach(it => {
      const c = it.createdAt || it.updatedAt || nowMs();
      const u = it.updatedAt || it.createdAt || nowMs();
      const stage = (it.stage || "idea").toLowerCase();

      const i1 = idxOf(c);
      if (i1 >= 0 && i1 < ideaCounts.length) ideaCounts[i1] += 1;

      // We treat "entered stage" date as updatedAt for current stage
      const i2 = idxOf(u);
      if (i2 >= 0 && i2 < ideaCounts.length) {
        if (stage === "script") scriptCounts[i2] += 1;
        if (stage === "posted") postedCounts[i2] += 1;
      }
    });

    return {
      labels: days.map(dayLabel),
      ideaCounts,
      scriptCounts,
      postedCounts
    };
  }

  function renderPipelineChart(el, rangeDays) {
    const series = buildDailySeries(rangeDays);

    if (pipelineChart) {
      pipelineChart.destroy();
      pipelineChart = null;
    }

    const ctx = el.getContext("2d");
    pipelineChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [
          { label: "Ideas", data: series.ideaCounts, tension: 0.35 },
          { label: "Scripts", data: series.scriptCounts, tension: 0.35 },
          { label: "Posted", data: series.postedCounts, tension: 0.35 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  // -----------------------------------------------------
  // PERFORMANCE DASHBOARD METRICS
  // -----------------------------------------------------
  function computePerformanceMetrics() {
    const items = getItemsSafe();

    const countBy = (stage) => items.filter(i => (i.stage || "idea") === stage).length;

    const idea = countBy("idea");
    const research = countBy("research");
    const script = countBy("script");
    const editing = countBy("editing");
    const posted = countBy("posted");

    const execDen = script + editing + posted;
    const executionRate = execDen ? Math.round((posted / execDen) * 100) : 0;

    const ideaToPost = items.length ? Math.round((posted / items.length) * 100) : 0;

    // avg time in current stage = now - updatedAt
    const perStageAges = { idea: [], research: [], script: [], editing: [], posted: [] };
    const now = nowMs();

    items.forEach(i => {
      const stage = (i.stage || "idea");
      const u = i.updatedAt || i.createdAt || now;
      const ageDays = msToDays(now - u);
      if (perStageAges[stage]) perStageAges[stage].push(ageDays);
    });

    const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    const avgStageDays = {
      idea: avg(perStageAges.idea),
      research: avg(perStageAges.research),
      script: avg(perStageAges.script),
      editing: avg(perStageAges.editing),
      posted: avg(perStageAges.posted)
    };

    const postedLast7 = items.filter(i => i.stage === "posted" && (now - (i.updatedAt || i.createdAt || now)) <= 7 * 86400000).length;
    const postedLast30 = items.filter(i => i.stage === "posted" && (now - (i.updatedAt || i.createdAt || now)) <= 30 * 86400000).length;

    const weeklyOutput = postedLast7;
    const monthlyOutput = postedLast30;

    return {
      counts: { idea, research, script, editing, posted, total: items.length },
      executionRate,
      ideaToPost,
      avgStageDays,
      weeklyOutput,
      monthlyOutput
    };
  }

  // -----------------------------------------------------
  // SUBSCRIBER HISTORY CHART + FORECAST
  // -----------------------------------------------------
  function renderSubsChart(el, range) {
    const hist = readSubsHistory();
    if (subsChart) {
      subsChart.destroy();
      subsChart = null;
    }

    let data = hist.slice();
    if (range !== "all") {
      const d = Number(range);
      const cutoff = startOfDay(nowMs() - (d - 1) * 86400000);
      data = data.filter(p => p.t >= cutoff);
    }

    const ctx = el.getContext("2d");
    subsChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map(p => dayLabel(p.t)),
        datasets: [
          { label: "Subscribers", data: data.map(p => p.subs), tension: 0.35 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          y: { beginAtZero: false }
        }
      }
    });
  }

  function forecastSubs(daysForward) {
    const hist = readSubsHistory();
    if (hist.length < 2) return null;

    // simple linear regression on last up to 14 points
    const slice = hist.slice(-14);
    const xs = slice.map((p, idx) => idx);
    const ys = slice.map(p => p.subs);

    const n = xs.length;
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
    const sumXX = xs.reduce((acc, x) => acc + x * x, 0);

    const denom = (n * sumXX - sumX * sumX);
    if (denom === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denom; // subs per day index
    const intercept = (sumY - slope * sumX) / n;

    const lastIdx = xs[xs.length - 1];
    const targetIdx = lastIdx + daysForward;
    const pred = slope * targetIdx + intercept;

    return Math.max(0, Math.round(pred));
  }

  // -----------------------------------------------------
  // RANKING SYSTEM (extended)
  // -----------------------------------------------------
  function scoreIdea(item) {
    let score = 0;
    const stage = (item.stage || "idea");
    if (stage === "posted") score += 30;
    if (stage === "editing") score += 20;
    if (stage === "script") score += 15;
    if (item.notes && item.notes.length > 100) score += 15;
    if (item.title && item.title.length > 20) score += 10;

    // Freshness boost (recent updates)
    const u = item.updatedAt || item.createdAt || nowMs();
    const ageDays = msToDays(nowMs() - u);
    if (ageDays <= 2) score += 10;
    else if (ageDays <= 7) score += 6;

    return Math.min(100, score);
  }

  // -----------------------------------------------------
  // UI RENDER
  // -----------------------------------------------------
  function renderUpgrades() {
    const container = getContentContainer();
    if (!container) return;

    // Only render while Content page is active (simple check)
    const contentPage = document.getElementById("contentPage");
    if (!contentPage || !contentPage.classList.contains("active")) return;

    const wrap = ensureWrap(container);
    wrap.innerHTML = "";

    // 1) Performance Dashboard
    const perf = computePerformanceMetrics();

    const perfBlock = document.createElement("div");
    perfBlock.className = "habit-section";
    perfBlock.innerHTML = `
      <div class="section-title">🧭 Creator Performance Dashboard</div>

      <div class="content-stats">
        <div class="content-stat-card">
          <div style="color:#9CA3AF;">Execution Rate</div>
          <div style="font-size:1.8rem; font-weight:900;">${perf.executionRate}%</div>
          <div style="color:#9CA3AF; font-size:0.85rem;">(scripts/editing → posted)</div>
        </div>

        <div class="content-stat-card">
          <div style="color:#9CA3AF;">Idea-to-Post</div>
          <div style="font-size:1.8rem; font-weight:900;">${perf.ideaToPost}%</div>
          <div style="color:#9CA3AF; font-size:0.85rem;">(posted vs total)</div>
        </div>

        <div class="content-stat-card">
          <div style="color:#9CA3AF;">Weekly Output</div>
          <div style="font-size:1.8rem; font-weight:900;">${perf.weeklyOutput}</div>
          <div style="color:#9CA3AF; font-size:0.85rem;">posted last 7 days</div>
        </div>

        <div class="content-stat-card">
          <div style="color:#9CA3AF;">Monthly Output</div>
          <div style="font-size:1.8rem; font-weight:900;">${perf.monthlyOutput}</div>
          <div style="color:#9CA3AF; font-size:0.85rem;">posted last 30 days</div>
        </div>
      </div>

      <div style="margin-top:12px; color:#9CA3AF; font-size:0.9rem;">
        Avg time in current stage (days): 
        Idea ${perf.avgStageDays.idea.toFixed(1)} • Research ${perf.avgStageDays.research.toFixed(1)} • Script ${perf.avgStageDays.script.toFixed(1)} • Editing ${perf.avgStageDays.editing.toFixed(1)}
      </div>
    `;
    wrap.appendChild(perfBlock);

    // 2) Content Pipeline Trend Chart
    const chartBlock = document.createElement("div");
    chartBlock.className = "habit-section";
    chartBlock.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <div class="section-title">📊 Content Pipeline Trend</div>

        <select id="kpPipelineRange" class="form-input" style="width:auto; padding:6px 10px;">
          <option value="7">7 Days</option>
          <option value="30">30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div style="color:#9CA3AF; font-size:0.9rem; margin-bottom:10px;">
        Tracks Ideas created, and stage entries (Scripts/Posted) based on last update time.
      </div>

      <canvas id="${PIPELINE_CHART_ID}" height="140"></canvas>
    `;
    wrap.appendChild(chartBlock);

    // render pipeline chart
    const pipelineCanvas = chartBlock.querySelector(`#${PIPELINE_CHART_ID}`);
    const rangeSel = chartBlock.querySelector("#kpPipelineRange");
    renderPipelineChart(pipelineCanvas, rangeSel.value);
    rangeSel.addEventListener("change", () => renderPipelineChart(pipelineCanvas, rangeSel.value));

    // 3) Command Center 2.0: Growth Forecast + Subs Chart
    const ytKey = getYTKey();
    const ytChannel = getChannelId();

    const ytBlock = document.createElement("div");
    ytBlock.className = "habit-section";
    ytBlock.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <div class="section-title">📈 Command Center 2.0</div>
        <button class="form-submit" id="kpRefreshYTStatsBtn">Refresh Growth Data</button>
      </div>

      <div id="kpYTStatusLine" style="color:#9CA3AF; margin-bottom:12px;">
        ${ytKey && ytChannel ? "YouTube connected. Pulling growth intelligence..." : "Connect YouTube in API Vault to enable growth analytics."}
      </div>

      <div class="content-stats" id="kpForecastCards" style="margin-bottom:12px;"></div>

      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:10px;">
        <div style="color:#9CA3AF;">Subscriber History</div>
        <select id="kpSubsRange" class="form-input" style="width:auto; padding:6px 10px;">
          <option value="30">30 Days</option>
          <option value="7">7 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <canvas id="${SUBS_CHART_ID}" height="140"></canvas>
    `;
    wrap.appendChild(ytBlock);

    async function renderYTSection(forceFetch) {
      const status = ytBlock.querySelector("#kpYTStatusLine");
      const cards = ytBlock.querySelector("#kpForecastCards");
      const subsCanvas = ytBlock.querySelector(`#${SUBS_CHART_ID}`);

      if (!ytKey || !ytChannel) {
        cards.innerHTML = "";
        if (subsChart) { subsChart.destroy(); subsChart = null; }
        if (status) status.textContent = "Connect YouTube in API Vault to enable growth analytics.";
        return;
      }

      if (status) status.textContent = "Loading live YouTube growth intelligence...";

      // fetch unless we only want cached quickly
      const res = await fetchYouTubeChannelStats();
      if (!res.ok) {
        if (status) status.textContent = "Unable to load YouTube stats. Check API key and Channel ID.";
      } else {
        const d = res.data;
        const f7 = forecastSubs(7);
        const f30 = forecastSubs(30);

        const velocity = (() => {
          const hist = readSubsHistory();
          if (hist.length < 2) return "UNKNOWN";
          const a = hist[hist.length - 2];
          const b = hist[hist.length - 1];
          const diff = (b.subs - a.subs);
          if (diff >= 10) return "HIGH";
          if (diff >= 1) return "MEDIUM";
          if (diff === 0) return "FLAT";
          return "DOWN";
        })();

        cards.innerHTML = `
          <div class="content-stat-card">
            <div style="color:#9CA3AF;">Current Subs</div>
            <div style="font-size:1.8rem; font-weight:900;">${formatNum(d.subs)}</div>
          </div>

          <div class="content-stat-card">
            <div style="color:#9CA3AF;">Forecast +7d</div>
            <div style="font-size:1.8rem; font-weight:900;">${f7 ? formatNum(f7) : "Need history"}</div>
          </div>

          <div class="content-stat-card">
            <div style="color:#9CA3AF;">Forecast +30d</div>
            <div style="font-size:1.8rem; font-weight:900;">${f30 ? formatNum(f30) : "Need history"}</div>
          </div>

          <div class="content-stat-card">
            <div style="color:#9CA3AF;">Growth Velocity</div>
            <div style="font-size:1.8rem; font-weight:900;">${velocity}</div>
          </div>
        `;

        if (status) status.textContent = `Last updated: ${new Date(d.fetchedAt).toLocaleTimeString()} (history stored daily)`;
      }

      const rangeSel = ytBlock.querySelector("#kpSubsRange");
      renderSubsChart(subsCanvas, rangeSel.value);
      rangeSel.onchange = () => renderSubsChart(subsCanvas, rangeSel.value);
    }

    const refreshBtn = ytBlock.querySelector("#kpRefreshYTStatsBtn");
    refreshBtn.addEventListener("click", () => {
      // clear throttle so it fetches fresh
      localStorage.removeItem(LAST_FETCH_KEY);
      renderYTSection(true);
    });

    // initial render
    renderYTSection(false);

    // 4) Content Intelligence Ranking System (Top Ideas This Month)
    const items = getItemsSafe();
    const monthCutoff = nowMs() - 30 * 86400000;

    const ranked = items
      .map(i => ({ ...i, __score: scoreIdea(i) }))
      .filter(i => (i.updatedAt || i.createdAt || nowMs()) >= monthCutoff)
      .sort((a, b) => b.__score - a.__score)
      .slice(0, 5);

    const rankBlock = document.createElement("div");
    rankBlock.className = "habit-section";
    rankBlock.innerHTML = `
      <div class="section-title">👑 Content Intelligence Ranking</div>
      <div style="color:#9CA3AF; margin-bottom:10px;">Top ideas (last 30 days)</div>
      ${
        ranked.length
          ? ranked.map(i => `
            <div class="idea-item" style="display:flex; justify-content:space-between; gap:10px;">
              <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;">${i.title || "Untitled"}</div>
              <div style="font-weight:900; color:#22c55e;">${i.__score}</div>
            </div>
          `).join("")
          : `<div style="color:#9CA3AF;">No ranked ideas yet.</div>`
      }
    `;
    wrap.appendChild(rankBlock);
  }

  // -----------------------------------------------------
  // HOOK INTO NAV + BOOT
  // -----------------------------------------------------
  function hook() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(renderUpgrades, 120);
    });
  }

  function boot() {
    hook();
    setTimeout(renderUpgrades, 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
