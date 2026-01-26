// =====================================================
// CONTENT HUB MODULE (SAFE ADD-ON) — UPGRADED
// - Adds YouTube Channel Live Stats (API key + channelId)
// - Tracks subscriber history daily (localStorage)
// - Adds Subs chart: 7 / 30 / All Time (modal)
// - Adds optional YouTube link per content item (for Posted stage)
// - Does NOT modify app.js
// - Does NOT remove existing Content Hub features
// =====================================================

(function () {
  "use strict";

  // -----------------------------
  // ✅ YOUR YOUTUBE CONFIG
  // -----------------------------
  const YOUTUBE_CONFIG = {
    apiKey: "AIzaSyB0DZGhMJ_X1P_nzczN4e-hc1xB5hOc7rw",
    channelId: "UCKUFonoh8azQwjXnh2ViqHQ",
    pollMs: 5 * 60 * 1000 // 5 minutes
  };

  const STORAGE_KEY = "contentHubItems";
  const CONTAINER_ID = "contentHubContainer";

  // YouTube localStorage keys
  const YT_CACHE_KEY = "ytChannelCache_v1";
  const YT_SUB_HISTORY_KEY = "ytSubHistory_v1"; // [{date:"YYYY-MM-DD", subs:number}]
  const YT_LAST_FETCH_KEY = "ytLastFetch_v1";

  const STAGES = [
    { key: "idea", label: "Idea" },
    { key: "research", label: "Research" },
    { key: "script", label: "Script" },
    { key: "editing", label: "Editing" },
    { key: "posted", label: "Posted" }
  ];

  // -----------------------------
  // Utilities
  // -----------------------------
  function safeParse(raw, fallback) {
    try {
      const v = JSON.parse(raw);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function getItems() {
    const v = safeParse(localStorage.getItem(STORAGE_KEY) || "[]", []);
    return Array.isArray(v) ? v : [];
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

  function prettyTime(ms) {
    if (!ms) return "";
    try {
      return new Date(ms).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "";
    }
  }

  function todayKey() {
    return new Date().toISOString().split("T")[0];
  }

  function getLastNDays(n) {
    const out = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      out.push(d.toISOString().split("T")[0]);
    }
    return out;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  // -----------------------------
  // Stage badge
  // -----------------------------
  function stageBadge(stageKey) {
    const stage = STAGES.find(s => s.key === stageKey) || STAGES[0];
    const isPosted = stage.key === "posted";

    return `
      <span style="
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:6px 10px;
        border-radius:999px;
        border:1px solid rgba(255,255,255,0.14);
        background:${isPosted ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)"};
        color:${isPosted ? "#86efac" : "#E5E7EB"};
        font-weight:900;
        font-size:0.85rem;
        white-space:nowrap;
      ">
        ${escapeHtml(stage.label)}
      </span>
    `;
  }

  // =====================================================
  // YOUTUBE: fetch + cache + history
  // =====================================================
  function getYtCache() {
    return safeParse(localStorage.getItem(YT_CACHE_KEY) || "null", null);
  }

  function setYtCache(data) {
    localStorage.setItem(YT_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  }

  function getSubHistory() {
    const v = safeParse(localStorage.getItem(YT_SUB_HISTORY_KEY) || "[]", []);
    return Array.isArray(v) ? v : [];
  }

  function saveSubHistory(arr) {
    localStorage.setItem(YT_SUB_HISTORY_KEY, JSON.stringify(arr));
  }

  function upsertTodaySubCount(subs) {
    const key = todayKey();
    const hist = getSubHistory();
    const idx = hist.findIndex(x => x.date === key);
    if (idx >= 0) hist[idx] = { date: key, subs };
    else hist.push({ date: key, subs });

    // keep sorted
    hist.sort((a, b) => a.date.localeCompare(b.date));

    // optional: cap storage size
    if (hist.length > 730) hist.splice(0, hist.length - 730); // ~2 years

    saveSubHistory(hist);
  }

  async function fetchYouTubeChannel() {
    const { apiKey, channelId } = YOUTUBE_CONFIG;
    if (!apiKey || !channelId) throw new Error("Missing YouTube config.");

    const url =
      "https://www.googleapis.com/youtube/v3/channels" +
      `?part=snippet,statistics&id=${encodeURIComponent(channelId)}` +
      `&key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`YouTube API error: ${res.status} ${txt}`.slice(0, 240));
    }

    const json = await res.json();
    const item = json?.items?.[0];
    if (!item) throw new Error("Channel not found (check Channel ID).");

    const snippet = item.snippet || {};
    const stats = item.statistics || {};

    const data = {
      title: snippet.title || "YouTube Channel",
      thumbnail:
        snippet?.thumbnails?.medium?.url ||
        snippet?.thumbnails?.default?.url ||
        "",
      subs: Number(stats.subscriberCount || 0),
      views: Number(stats.viewCount || 0),
      videos: Number(stats.videoCount || 0),
      fetchedAt: Date.now()
    };

    setYtCache(data);
    localStorage.setItem(YT_LAST_FETCH_KEY, String(Date.now()));

    // Track subscriber history daily
    if (Number.isFinite(data.subs) && data.subs > 0) {
      upsertTodaySubCount(data.subs);
    }

    return data;
  }

  function shouldAutoFetch() {
    const last = Number(localStorage.getItem(YT_LAST_FETCH_KEY) || "0");
    return !last || (Date.now() - last) > YOUTUBE_CONFIG.pollMs;
  }

  function calcGrowthLabel() {
    const hist = getSubHistory();
    if (!hist.length) return { label: "Not enough data", color: "#9CA3AF", delta: 0 };

    // Compare today to 7 days ago if possible
    const today = todayKey();
    const days = getLastNDays(7);
    const startDay = days[0];

    const todayEntry = hist.slice().reverse().find(x => x.date <= today);
    const startEntry = hist.find(x => x.date >= startDay) || hist.find(x => x.date === startDay);

    const todaySubs = todayEntry?.subs ?? 0;
    const startSubs = startEntry?.subs ?? 0;
    const delta = todaySubs - startSubs;

    if (delta >= 50) return { label: "Exploding", color: "#22C55E", delta };
    if (delta >= 10) return { label: "Growing", color: "#A78BFA", delta };
    if (delta >= 1) return { label: "Slow growth", color: "#F59E0B", delta };
    if (delta === 0) return { label: "Stagnant", color: "#9CA3AF", delta };
    return { label: "Dropping", color: "#EF4444", delta };
  }

  // Chart instance holder for modal
  let ytSubsChart = null;

  function getHistoryByRange(range) {
    const hist = getSubHistory();

    if (range === "all") return hist;

    const n = range === "30" ? 30 : 7;
    const days = getLastNDays(n);
    const set = new Set(days);

    // return only entries in those days; also fill missing with nulls for smooth chart
    const map = new Map(hist.map(x => [x.date, x.subs]));
    return days.map(d => ({ date: d, subs: map.has(d) ? map.get(d) : null }));
  }

  function openYouTubeSubsModal(range) {
    if (typeof openModal !== "function") return;

    openModal(`
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <div>
          <div style="color:white; font-size:1.15rem; font-weight:950;">📈 Subscriber Trend</div>
          <div style="color:#9CA3AF; font-size:0.9rem;">Saved daily from your channel stats</div>
        </div>

        <select id="ytSubsRange" style="padding:10px; border-radius:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16); color:white;">
          <option value="7" ${range === "7" ? "selected" : ""}>Last 7 Days</option>
          <option value="30" ${range === "30" ? "selected" : ""}>Last 30 Days</option>
          <option value="all" ${range === "all" ? "selected" : ""}>All Time</option>
        </select>
      </div>

      <div style="margin-top:14px;">
        <canvas id="ytSubsCanvas" height="150"></canvas>
      </div>

      <div style="margin-top:10px; color:#9CA3AF; font-size:0.9rem;">
        Note: YouTube updates subscriber counts periodically, not per-second.
      </div>
    `);

    const sel = document.getElementById("ytSubsRange");
    if (sel) sel.onchange = () => openYouTubeSubsModal(sel.value);

    setTimeout(() => renderYouTubeSubsChart(range), 0);
  }

  function renderYouTubeSubsChart(range) {
    const canvas = document.getElementById("ytSubsCanvas");
    if (!canvas || typeof Chart === "undefined") return;

    const data = getHistoryByRange(range);
    const labels = data.map(x => {
      try {
        const d = new Date(x.date);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } catch {
        return x.date;
      }
    });

    const subs = data.map(x => (x.subs == null ? null : Number(x.subs)));

    if (ytSubsChart) {
      try { ytSubsChart.destroy(); } catch {}
      ytSubsChart = null;
    }

    ytSubsChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Subscribers",
            data: subs,
            tension: 0.35,
            spanGaps: true,
            borderWidth: 3,
            pointRadius: 3,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: "rgba(255,255,255,0.8)" } }
        },
        scales: {
          x: { ticks: { color: "rgba(255,255,255,0.65)" }, grid: { color: "rgba(255,255,255,0.08)" } },
          y: { ticks: { color: "rgba(255,255,255,0.65)" }, grid: { color: "rgba(255,255,255,0.08)" } }
        }
      }
    });
  }

  // =====================================================
  // Render YouTube panel (top of content page)
  // =====================================================
  function renderYouTubePanel(channelData, errorMsg) {
    const growth = calcGrowthLabel();
    const cache = channelData || getYtCache();

    const title = cache?.title || "YouTube Channel";
    const subs = Number(cache?.subs || 0);
    const views = Number(cache?.views || 0);
    const videos = Number(cache?.videos || 0);
    const thumb = cache?.thumbnail || "";
    const fetched = cache?.fetchedAt ? prettyTime(cache.fetchedAt) : "";

    const deltaTxt = (Number.isFinite(growth.delta) && growth.delta !== 0)
      ? `${growth.delta > 0 ? "+" : ""}${growth.delta} (7d)`
      : "—";

    return `
      <div style="
        margin-top:10px;
        padding:14px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.14);
        background:linear-gradient(135deg, rgba(99,102,241,0.14), rgba(236,72,153,0.08));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
      ">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center;">
          <div style="display:flex; gap:12px; align-items:center;">
            ${
              thumb
                ? `<img src="${escapeHtml(thumb)}" style="width:54px; height:54px; border-radius:14px; object-fit:cover; border:1px solid rgba(255,255,255,0.18);" />`
                : `<div style="width:54px; height:54px; border-radius:14px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18);"></div>`
            }
            <div>
              <div style="color:white; font-weight:950; font-size:1.05rem;">${escapeHtml(title)}</div>
              <div style="color:${growth.color}; font-weight:950; margin-top:4px;">
                ${growth.label} <span style="color:rgba(255,255,255,0.65); font-weight:900;">(${deltaTxt})</span>
              </div>
              ${
                fetched
                  ? `<div style="color:rgba(255,255,255,0.55); font-size:0.82rem; margin-top:4px;">Updated ${escapeHtml(fetched)}</div>`
                  : `<div style="color:rgba(255,255,255,0.55); font-size:0.82rem; margin-top:4px;">Not fetched yet</div>`
              }
            </div>
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <button onclick="refreshYouTubeStats()" style="
              padding:8px 12px;
              border-radius:12px;
              background:rgba(255,255,255,0.10);
              border:1px solid rgba(255,255,255,0.18);
              color:white;
              cursor:pointer;
              font-weight:950;
            ">Refresh</button>

            <button onclick="openYouTubeSubsModal('7')" style="
              padding:8px 12px;
              border-radius:12px;
              background:rgba(255,255,255,0.10);
              border:1px solid rgba(255,255,255,0.18);
              color:white;
              cursor:pointer;
              font-weight:950;
            ">Subs Chart</button>
          </div>
        </div>

        ${
          errorMsg
            ? `<div style="margin-top:10px; color:#FCA5A5; font-weight:900;">${escapeHtml(errorMsg)}</div>`
            : ""
        }

        <div style="margin-top:12px; display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">
          <div style="padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.18);">
            <div style="color:#9CA3AF; font-weight:900;">Subscribers</div>
            <div style="color:white; font-weight:950; font-size:1.6rem; margin-top:4px;">${subs.toLocaleString()}</div>
          </div>
          <div style="padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.18);">
            <div style="color:#9CA3AF; font-weight:900;">Views</div>
            <div style="color:white; font-weight:950; font-size:1.6rem; margin-top:4px;">${views.toLocaleString()}</div>
          </div>
          <div style="padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.18);">
            <div style="color:#9CA3AF; font-weight:900;">Videos</div>
            <div style="color:white; font-weight:950; font-size:1.6rem; margin-top:4px;">${videos.toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;
  }

  // =====================================================
  // Main Content Hub render
  // =====================================================
  function renderContentHub() {
    const container = ensureContainer();
    if (!container) return;

    const items = getItems();

    // Current filter
    const filterKey = (window.__contentHubFilterKey || "all");

    const filtered =
      filterKey === "all"
        ? items
        : items.filter(x => x.stage === filterKey);

    // YouTube (cached panel first)
    const ytPanelHtml = renderYouTubePanel(null, "");

    container.innerHTML = `
      <div class="section-title">🎬 Content Hub</div>

      ${ytPanelHtml}

      <div style="
        margin-top:12px;
        padding:14px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.05);
      ">
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <input id="contentTitleInput" placeholder="New idea title (example: Hannibal’s Brutal Trick)"
            style="
              flex:2; min-width:220px;
              background:rgba(255,255,255,0.05);
              border:1px solid rgba(255,255,255,0.15);
              border-radius:10px;
              padding:8px 10px;
              color:white;
              outline:none;
            " />

          <select id="contentStageInput"
            style="
              flex:1; min-width:160px;
              background:rgba(255,255,255,0.05);
              border:1px solid rgba(255,255,255,0.15);
              border-radius:10px;
              padding:8px 10px;
              color:white;
              outline:none;
            ">
            ${STAGES.map(s => `<option value="${s.key}">${escapeHtml(s.label)}</option>`).join("")}
          </select>

          <button onclick="addContentItem()" style="
            padding:9px 14px;
            border-radius:10px;
            background:linear-gradient(135deg,#6366f1,#ec4899);
            color:white;
            border:none;
            cursor:pointer;
            font-weight:900;
          ">Add</button>
        </div>

        <textarea id="contentNotesInput" placeholder="Optional notes (hook ideas, sources, angles)..."
          style="
            width:100%;
            height:90px;
            margin-top:10px;
            background:rgba(255,255,255,0.05);
            border:1px solid rgba(255,255,255,0.15);
            border-radius:12px;
            padding:10px;
            color:white;
            outline:none;
          "></textarea>
      </div>

      <div style="
        margin-top:12px;
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        align-items:center;
        justify-content:space-between;
      ">
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${renderFilters(filterKey)}
        </div>

        <div style="color:#9CA3AF; font-weight:900; font-size:0.9rem;">
          ${filtered.length} shown / ${items.length} total
        </div>
      </div>

      <div style="margin-top:12px; display:flex; flex-direction:column; gap:10px;">
        ${
          filtered.length
            ? filtered
                .slice()
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                .map(item => renderCard(item))
                .join("")
            : `<div style="color:#9CA3AF;">No items in this stage yet.</div>`
        }
      </div>
    `;

    // Auto-fetch YouTube stats if needed (non-blocking)
    if (shouldAutoFetch()) {
      refreshYouTubeStats(true);
    }
  }

  function renderFilters(activeKey) {
    const pill = (key, label) => {
      const active = key === activeKey;
      return `
        <button onclick="setContentFilter('${key}')" style="
          padding:8px 12px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,0.14);
          background:${active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)"};
          color:${active ? "#E5E7EB" : "#9CA3AF"};
          cursor:pointer;
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
    const title = escapeHtml(item.title);
    const notes = escapeHtml(item.notes || "");
    const updated = prettyTime(item.updatedAt);

    const ytUrl = (item.youtubeUrl || "").trim();
    const ytLink = ytUrl
      ? `<a href="${escapeHtml(ytUrl)}" target="_blank" rel="noopener" style="color:#93C5FD; font-weight:950; text-decoration:none;">Open YouTube</a>`
      : "";

    const showYtChip = item.stage === "posted";

    return `
      <div style="
        padding:14px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(0,0,0,0.18);
      ">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:flex-start;">
          <div style="min-width:220px;">
            <div style="color:#E5E7EB; font-weight:950; font-size:1.05rem; line-height:1.3;">
              ${title}
            </div>
            <div style="margin-top:6px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              ${stageBadge(item.stage)}
              ${updated ? `<span style="color:#9CA3AF; font-weight:900; font-size:0.85rem;">Updated ${escapeHtml(updated)}</span>` : ""}
              ${showYtChip ? `<span style="color:#9CA3AF; font-weight:900; font-size:0.85rem;">${ytLink || "No video link yet"}</span>` : ""}
            </div>
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <select onchange="setContentStage('${item.id}', this.value)" style="
              background:rgba(255,255,255,0.05);
              border:1px solid rgba(255,255,255,0.15);
              border-radius:10px;
              padding:8px 10px;
              color:white;
              outline:none;
              cursor:pointer;
              min-width:140px;
            ">
              ${STAGES.map(s => `<option value="${s.key}" ${s.key === item.stage ? "selected" : ""}>${escapeHtml(s.label)}</option>`).join("")}
            </select>

            <button onclick="openContentEdit('${item.id}')" style="
              padding:8px 12px;
              border-radius:10px;
              background:rgba(255,255,255,0.08);
              border:1px solid rgba(255,255,255,0.16);
              color:white;
              cursor:pointer;
              font-weight:900;
            ">Edit</button>

            <button onclick="deleteContentItem('${item.id}')" style="
              padding:8px 12px;
              border-radius:10px;
              background:none;
              border:1px solid rgba(239,68,68,0.35);
              color:#FCA5A5;
              cursor:pointer;
              font-weight:950;
            ">Delete</button>
          </div>
        </div>

        ${
          notes
            ? `<div style="margin-top:10px; color:#E5E7EB; line-height:1.45; white-space:pre-wrap;">${notes}</div>`
            : `<div style="margin-top:10px; color:#9CA3AF;">No notes yet.</div>`
        }
      </div>
    `;
  }

  // =====================================================
  // Public API (onclick)
  // =====================================================

  window.setContentFilter = function (key) {
    window.__contentHubFilterKey = key;
    renderContentHub();
  };

  window.addContentItem = function () {
    const titleEl = document.getElementById("contentTitleInput");
    const stageEl = document.getElementById("contentStageInput");
    const notesEl = document.getElementById("contentNotesInput");

    if (!titleEl || !stageEl) return;

    const title = titleEl.value.trim();
    const stage = stageEl.value || "idea";
    const notes = notesEl ? notesEl.value.trim() : "";

    if (!title) return;

    const items = getItems();
    const now = Date.now();

    items.push({
      id: uid(),
      title,
      stage,
      notes,
      youtubeUrl: "",
      createdAt: now,
      updatedAt: now
    });

    saveItems(items);

    titleEl.value = "";
    if (notesEl) notesEl.value = "";

    renderContentHub();
  };

  window.deleteContentItem = function (id) {
    const items = getItems();
    const next = items.filter(x => x.id !== id);
    saveItems(next);
    renderContentHub();
  };

  window.setContentStage = function (id, stage) {
    const items = getItems();
    const now = Date.now();
    const next = items.map(x => (x.id === id ? { ...x, stage, updatedAt: now } : x));
    saveItems(next);
    renderContentHub();
  };

  window.openContentEdit = function (id) {
    if (typeof openModal !== "function") return;

    const items = getItems();
    const item = items.find(x => x.id === id);
    if (!item) return;

    const title = escapeHtml(item.title);
    const notes = escapeHtml(item.notes || "");
    const yt = escapeHtml(item.youtubeUrl || "");

    openModal(`
      <div style="
        width:min(740px, 92vw);
        max-height:82vh;
        overflow:auto;
        padding:16px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(10,10,12,0.95);
      ">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
          <div style="color:#E5E7EB; font-weight:950; font-size:1.1rem;">Edit Content Item</div>
          <button onclick="closeModal(event)" style="
            background:none; border:none; color:#E5E7EB; cursor:pointer; font-weight:950; font-size:1.2rem;
          ">✕</button>
        </div>

        <div style="margin-top:12px; color:#9CA3AF; font-weight:900;">Title</div>
        <input id="contentEditTitle" value="${title}" style="
          width:100%;
          margin-top:6px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:12px;
          padding:10px 12px;
          color:white;
          outline:none;
        "/>

        <div style="margin-top:12px; color:#9CA3AF; font-weight:900;">Notes</div>
        <textarea id="contentEditNotes" style="
          width:100%;
          height:180px;
          margin-top:6px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:12px;
          padding:10px 12px;
          color:white;
          outline:none;
        ">${notes}</textarea>

        <div style="margin-top:12px; color:#9CA3AF; font-weight:900;">YouTube Link (optional)</div>
        <input id="contentEditYouTubeUrl" value="${yt}" placeholder="https://www.youtube.com/watch?v=..."
          style="
            width:100%;
            margin-top:6px;
            background:rgba(255,255,255,0.05);
            border:1px solid rgba(255,255,255,0.15);
            border-radius:12px;
            padding:10px 12px;
            color:white;
            outline:none;
          "
        />

        <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
          <button onclick="saveContentEdit('${escapeHtml(item.id)}')" style="
            padding:9px 14px;
            border-radius:10px;
            background:linear-gradient(135deg,#6366f1,#ec4899);
            color:white;
            border:none;
            cursor:pointer;
            font-weight:950;
          ">Save</button>

          <button onclick="closeModal(event)" style="
            padding:9px 14px;
            border-radius:10px;
            background:rgba(255,255,255,0.08);
            border:1px solid rgba(255,255,255,0.16);
            color:white;
            cursor:pointer;
            font-weight:900;
          ">Cancel</button>
        </div>
      </div>
    `);
  };

  window.saveContentEdit = function (id) {
    const titleEl = document.getElementById("contentEditTitle");
    const notesEl = document.getElementById("contentEditNotes");
    const ytEl = document.getElementById("contentEditYouTubeUrl");
    if (!titleEl || !notesEl) return;

    const title = titleEl.value.trim();
    const notes = notesEl.value.trim();
    const youtubeUrl = ytEl ? ytEl.value.trim() : "";

    if (!title) return;

    const items = getItems();
    const now = Date.now();

    const next = items.map(x =>
      x.id === id
        ? { ...x, title, notes, youtubeUrl, updatedAt: now }
        : x
    );

    saveItems(next);

    if (typeof closeModal === "function") closeModal();
    renderContentHub();
  };

  // YouTube buttons (onclick)
  window.refreshYouTubeStats = async function (silent) {
    try {
      const data = await fetchYouTubeChannel();

      // Re-render just the YouTube panel area by re-rendering page
      // (simple + safe; keeps your existing content hub intact)
      renderContentHub();

      // If silent, do nothing else
      if (!silent) {
        // optional little toast behavior could go here later
      }
    } catch (e) {
      // Re-render with error message shown in panel
      const container = ensureContainer();
      if (!container) return;

      // Replace only the panel safely (by re-rendering whole view with error)
      // Easiest safe approach: render, then patch in an error message
      renderContentHub();

      // Patch error into first panel (best-effort)
      const panelHost = container.querySelector("div");
      // safer: just re-render whole with error by overriding cached panel
      // We'll do simplest: show alert if not silent
      if (!silent) alert(String(e?.message || e));
      console.error(e);
    }
  };

  window.openYouTubeSubsModal = function (range) {
    openYouTubeSubsModal(range || "7");
  };

  // =====================================================
  // Hook navigation / activation
  // =====================================================
  function hookNavigation() {
    document.addEventListener("click", e => {
      const tab = e.target && e.target.closest ? e.target.closest(".nav-tab") : null;
      if (!tab) return;
      setTimeout(renderContentHub, 50);
    });
  }

  function observeActivation() {
    const page = document.getElementById("contentPage");
    if (!page || typeof MutationObserver === "undefined") return;

    const obs = new MutationObserver(() => {
      if (page.classList.contains("active")) {
        renderContentHub();
      }
    });

    obs.observe(page, { attributes: true, attributeFilter: ["class"] });
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
