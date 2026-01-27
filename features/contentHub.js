// =====================================================
// CONTENT HUB MODULE 3.0 — YOUTUBE + CREATOR INTELLIGENCE
// SAFE UPGRADE — DOES NOT REMOVE EXISTING FEATURES
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

  function clamp(n, a, b) {
    n = Number(n);
    if (!Number.isFinite(n)) return a;
    return Math.max(a, Math.min(b, n));
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
        date: todayKey(),
        fetchedAt: Date.now()
      };
    } catch {
      return null;
    }
  }

  function saveStatsHistory(newStats, { force = false } = {}) {
    if (!newStats) return;

    let history = safeParse(localStorage.getItem(YT_STATS_KEY) || "[]", []);
    const today = todayKey();

    const exists = history.find(h => h.date === today);
    if (!exists || force) {
      // Replace today if force=true
      history = history.filter(h => h.date !== today);
      history.push(newStats);
      history.sort((a, b) => String(a.date).localeCompare(String(b.date)));
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

  function getHistoryRange(history, mode) {
    if (!history.length) return [];
    if (mode === "all") return history.slice();
    const n = mode === "30" ? 30 : 7;
    return history.slice(-n);
  }

  function calcSubsKPIs(history) {
    if (!history.length) {
      return { deltaLast: 0, delta7: 0, avgPerDay7: 0 };
    }

    const last = history[history.length - 1];
    const prev = history.length >= 2 ? history[history.length - 2] : null;

    const deltaLast = prev ? (last.subs - prev.subs) : 0;

    const last7 = getHistoryRange(history, "7");
    const first7 = last7.length >= 2 ? last7[0] : null;
    const delta7 = first7 ? (last7[last7.length - 1].subs - first7.subs) : 0;

    const days = Math.max(1, last7.length - 1);
    const avgPerDay7 = Math.round((delta7 / days) * 10) / 10;

    return { deltaLast, delta7, avgPerDay7 };
  }

  // ------------------ Content Intelligence ------------------

  function stageCounts(items) {
    const counts = {};
    STAGES.forEach(s => (counts[s.key] = 0));
    items.forEach(i => {
      if (counts[i.stage] !== undefined) counts[i.stage]++;
    });
    return counts;
  }

  function backlogWarning(counts) {
    // Simple signal: lots of ideas, low scripts/editing
    const ideas = counts.idea || 0;
    const scripts = counts.script || 0;
    const editing = counts.editing || 0;

    if (ideas >= 10 && scripts <= 2) return "Backlog pressure: too many ideas, not enough scripts.";
    if (scripts >= 5 && editing === 0) return "Execution gap: scripts piling up, editing not moving.";
    if (editing >= 5) return "Editing heavy: consider batching exports and posting.";
    return "";
  }

  // ------------------ UI Rendering ------------------

  function renderYouTubePanel(stats) {
    const history = getStatsHistory();
    const status = history.length ? getGrowthStatus(history) : "Not fetched yet";
    const kpis = calcSubsKPIs(history);

    const lastFetched = stats?.fetchedAt
      ? new Date(stats.fetchedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "";

    const deltaColor = (n) => (n > 0 ? "#86efac" : n < 0 ? "#fca5a5" : "#9CA3AF");

    return `
      <div style="
        margin-top:10px;
        padding:16px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.05);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <div style="display:flex; gap:12px; align-items:center; min-width:260px;">
            ${stats?.avatar ? `<img src="${stats.avatar}" style="width:48px;height:48px;border-radius:50%;">` : ""}
            <div>
              <div style="font-weight:900;color:white;">YouTube Channel</div>
              <div style="color:#9CA3AF;font-size:0.9rem;">${escapeHtml(stats?.name || "Not connected")}</div>
              <div style="font-size:0.85rem;margin-top:2px;color:#E5E7EB;">${status}</div>
              ${lastFetched ? `<div style="font-size:0.8rem;color:#9CA3AF;margin-top:2px;">Last fetch: ${escapeHtml(lastFetched)}</div>` : ""}
            </div>
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button onclick="setYouTubeApiKey()" style="padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);color:white;font-weight:800;">Set API Key</button>
            <button onclick="refreshYouTubeStats()" style="padding:8px 12px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#ec4899);color:white;border:none;font-weight:900;">Refresh</button>
            <button onclick="forceSnapshot()" style="padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);color:white;font-weight:900;">Snapshot</button>
            <button onclick="showSubsChart()" style="padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);color:white;font-weight:800;">Subs Chart</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px;">
          <div class="stat-card">
            <div style="color:#9CA3AF;font-weight:800;">Subscribers</div>
            <div style="font-size:1.6rem;font-weight:950;color:white;">${stats?.subs ?? 0}</div>
            <div style="margin-top:4px;font-weight:900;color:${deltaColor(kpis.deltaLast)};">
              ${kpis.deltaLast > 0 ? "+" : ""}${kpis.deltaLast} since last
            </div>
          </div>

          <div class="stat-card">
            <div style="color:#9CA3AF;font-weight:800;">Views</div>
            <div style="font-size:1.6rem;font-weight:950;color:white;">${stats?.views ?? 0}</div>
            <div style="margin-top:4px;color:#9CA3AF;font-weight:900;">channel lifetime</div>
          </div>

          <div class="stat-card">
            <div style="color:#9CA3AF;font-weight:800;">Videos</div>
            <div style="font-size:1.6rem;font-weight:950;color:white;">${stats?.videos ?? 0}</div>
            <div style="margin-top:4px;color:#9CA3AF;font-weight:900;">channel lifetime</div>
          </div>
        </div>

        <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:12px;">
          <div style="flex:1; min-width:220px; padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.15);">
            <div style="color:#9CA3AF; font-weight:900;">Last 7 days</div>
            <div style="margin-top:6px; color:white; font-weight:950; font-size:1.15rem;">
              ${kpis.delta7 > 0 ? "+" : ""}${kpis.delta7} subs
              <span style="color:#9CA3AF; font-weight:900; font-size:0.95rem;">(${kpis.avgPerDay7}/day)</span>
            </div>
          </div>

          <div style="flex:1; min-width:220px; padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.15);">
            <div style="color:#9CA3AF; font-weight:900;">Data points</div>
            <div style="margin-top:6px; color:white; font-weight:950; font-size:1.15rem;">
              ${history.length} saved days
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderContentIntelligence(items) {
    const counts = stageCounts(items);
    const warn = backlogWarning(counts);

    const chip = (label, value) => `
      <div style="padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.15);">
        <div style="color:#9CA3AF;font-weight:900;font-size:0.85rem;">${escapeHtml(label)}</div>
        <div style="margin-top:4px;color:white;font-weight:950;font-size:1.1rem;">${value}</div>
      </div>
    `;

    return `
      <div style="
        margin-top:12px;
        padding:14px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.04);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div style="color:white; font-weight:950;">Creator Intelligence</div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button onclick="exportContentItems()" style="padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);color:white;font-weight:900;">Export</button>
            <button onclick="importContentItems()" style="padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);color:white;font-weight:900;">Import</button>
          </div>
        </div>

        <div style="margin-top:12px; display:grid; grid-template-columns:repeat(5,1fr); gap:10px;">
          ${chip("Ideas", counts.idea || 0)}
          ${chip("Research", counts.research || 0)}
          ${chip("Scripts", counts.script || 0)}
          ${chip("Editing", counts.editing || 0)}
          ${chip("Posted", counts.posted || 0)}
        </div>

        ${
          warn
            ? `<div style="margin-top:12px; padding:10px 12px; border-radius:14px; border:1px solid rgba(245,158,11,0.30); background:rgba(245,158,11,0.10); color:#FCD34D; font-weight:900;">
                ${escapeHtml(warn)}
              </div>`
            : ""
        }
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
      ${renderContentIntelligence(items)}

      <div style="margin-top:12px;">
        <input id="contentTitleInput" placeholder="New idea title..."
          style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:10px;color:white;outline:none;" />

        <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;">
          <select id="contentStageInput" style="flex:1;min-width:160px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px;color:white;outline:none;">
            ${STAGES.map(s => `<option value="${s.key}">${escapeHtml(s.label)}</option>`).join("")}
          </select>

          <button onclick="addContentItem()" style="padding:8px 14px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#ec4899);color:white;font-weight:900;border:none;cursor:pointer;">
            Add
          </button>
        </div>

        <textarea id="contentNotesInput" placeholder="Notes..."
          style="width:100%;margin-top:8px;height:70px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:10px;color:white;outline:none;"></textarea>
      </div>

      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
        ${renderFilters(filterKey)}
      </div>

      <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px;">
        ${
          filtered.length
            ? filtered
                .slice()
                .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
                .map(item => renderCard(item))
                .join("")
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
          cursor:pointer;
        ">${escapeHtml(label)}</button>
      `;
    };
    return [
      pill("all", "All"),
      ...STAGES.map(s => pill(s.key, s.label))
    ].join("");
  }

  function renderCard(item) {
    const notes = escapeHtml(item.notes || "");
    return `
      <div style="padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,0.14);background:rgba(0,0,0,0.18);">
        <div style="font-weight:950;color:white;">${escapeHtml(item.title)}</div>
        <div style="color:${notes ? "#9CA3AF" : "#6B7280"};margin-top:6px;white-space:pre-wrap;">
          ${notes || "No notes"}
        </div>

        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <select onchange="setContentStage('${item.id}', this.value)" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:white;padding:6px 8px;outline:none;">
            ${STAGES.map(s => `<option value="${s.key}" ${s.key === item.stage ? "selected" : ""}>${escapeHtml(s.label)}</option>`).join("")}
          </select>

          <button onclick="deleteContentItem('${item.id}')" style="color:#FCA5A5;border:1px solid rgba(239,68,68,0.35);background:none;border-radius:8px;padding:6px 10px;font-weight:900;cursor:pointer;">
            Delete
          </button>
        </div>
      </div>
    `;
  }

  // ------------------ Chart Modal (Canvas) ------------------

  function drawLineChart(canvas, labels, values) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const pad = 40;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;

    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = Math.max(1, maxV - minV);

    const xFor = (i) => pad + (i / Math.max(1, values.length - 1)) * innerW;
    const yFor = (v) => pad + (1 - (v - minV) / range) * innerH;

    // grid
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad + (i / 4) * innerH;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(pad + innerW, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // line
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = xFor(i);
      const y = yFor(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // points
    ctx.fillStyle = "#ffffff";
    values.forEach((v, i) => {
      const x = xFor(i);
      const y = yFor(v);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // min/max labels
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(String(maxV), 8, pad + 4);
    ctx.fillText(String(minV), 8, pad + innerH);

    // x labels (few)
    const step = Math.ceil(labels.length / 5);
    for (let i = 0; i < labels.length; i += step) {
      const x = xFor(i);
      ctx.fillText(labels[i].slice(5), x - 10, pad + innerH + 20);
    }
  }

  function openChartModal(title, rangeMode) {
    const history = getStatsHistory();
    const range = getHistoryRange(history, rangeMode);
    if (!range.length) return alert("No subscriber history yet.");

    const labels = range.map(h => h.date);
    const values = range.map(h => Number(h.subs || 0));

    if (typeof openModal !== "function") {
      // Fallback: basic alert
      return alert(range.map(h => `${h.date}: ${h.subs}`).join("\n"));
    }

    const activeBtnStyle = (m) =>
      m === rangeMode
        ? "background:rgba(255,255,255,0.12); color:white;"
        : "background:rgba(255,255,255,0.06); color:#9CA3AF;";

    openModal(`
      <div style="width:min(900px, 94vw);">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div style="color:white; font-weight:950; font-size:1.1rem;">${escapeHtml(title)}</div>
          <button onclick="closeModal(event)" style="background:none;border:none;color:#E5E7EB;cursor:pointer;font-weight:950;font-size:1.2rem;">✕</button>
        </div>

        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
          <button onclick="showSubsChart('7')" style="padding:8px 12px;border-radius:999px;border:1px solid rgba(255,255,255,0.14); ${activeBtnStyle("7")} font-weight:900; cursor:pointer;">7 days</button>
          <button onclick="showSubsChart('30')" style="padding:8px 12px;border-radius:999px;border:1px solid rgba(255,255,255,0.14); ${activeBtnStyle("30")} font-weight:900; cursor:pointer;">30 days</button>
          <button onclick="showSubsChart('all')" style="padding:8px 12px;border-radius:999px;border:1px solid rgba(255,255,255,0.14); ${activeBtnStyle("all")} font-weight:900; cursor:pointer;">All time</button>
        </div>

        <div style="margin-top:12px; padding:12px; border-radius:16px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.2);">
          <canvas id="subsChartCanvas" width="860" height="320" style="width:100%; height:auto; display:block; border-radius:12px;"></canvas>
        </div>

        <div style="margin-top:12px; color:#9CA3AF; font-weight:900; font-size:0.9rem;">
          Points: ${range.length} • Latest: ${values[values.length - 1]}
        </div>
      </div>
    `);

    setTimeout(() => {
      const canvas = document.getElementById("subsChartCanvas");
      if (!canvas) return;

      // Resize for crispness (handle small screens)
      const cssWidth = canvas.getBoundingClientRect().width;
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(cssWidth * scale);
      canvas.height = Math.floor(320 * scale);
      canvas.style.height = "320px";

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(scale, scale);

      // Re-draw using CSS px coordinates (use a proxy canvas size)
      // Create a temp canvas with CSS coords drawing
      const temp = document.createElement("canvas");
      temp.width = Math.floor(cssWidth);
      temp.height = 320;
      drawLineChart(temp, labels, values);

      // Copy to scaled canvas
      const ctx2 = canvas.getContext("2d");
      if (!ctx2) return;
      ctx2.setTransform(1, 0, 0, 1, 0, 0);
      ctx2.clearRect(0, 0, canvas.width, canvas.height);
      ctx2.drawImage(temp, 0, 0, canvas.width, canvas.height);
    }, 30);
  }

  // ------------------ Public API ------------------

  window.setYouTubeApiKey = function () {
    const key = prompt("Paste your YouTube API Key:");
    if (key) {
      setApiKey(key.trim());
      alert("API key saved locally in your browser (not in GitHub).");
    }
  };

  window.refreshYouTubeStats = async function () {
    const stats = await fetchYouTubeStats();
    if (!stats) return alert("Failed to fetch YouTube data. Check API key + restrictions.");
    window.__ytStats = stats;
    saveStatsHistory(stats);
    renderContentHub();
  };

  window.forceSnapshot = async function () {
    const stats = await fetchYouTubeStats();
    if (!stats) return alert("Snapshot failed. Check API key.");
    window.__ytStats = stats;
    saveStatsHistory(stats, { force: true });
    renderContentHub();
  };

  window.showSubsChart = function (mode = "7") {
    mode = (mode === "30" || mode === "all") ? mode : "7";
    openChartModal("Subscriber History", mode);
  };

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
    if (!title) return;

    const items = getItems();
    const now = Date.now();

    items.push({
      id: uid(),
      title,
      stage: stageEl.value || "idea",
      notes: notesEl ? (notesEl.value || "") : "",
      createdAt: now,
      updatedAt: now
    });

    saveItems(items);

    titleEl.value = "";
    if (notesEl) notesEl.value = "";

    renderContentHub();
  };

  window.deleteContentItem = function (id) {
    saveItems(getItems().filter(x => x.id !== id));
    renderContentHub();
  };

  window.setContentStage = function (id, stage) {
    const now = Date.now();
    const items = getItems().map(x =>
      x.id === id ? { ...x, stage, updatedAt: now } : x
    );
    saveItems(items);
    renderContentHub();
  };

  window.exportContentItems = function () {
    const items = getItems();
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "contentHubItems-backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  window.importContentItems = function () {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) return alert("Invalid file format.");

        // merge by id (avoid overwriting)
        const existing = getItems();
        const byId = new Map(existing.map(x => [x.id, x]));
        parsed.forEach(x => {
          if (x && x.id && !byId.has(x.id)) byId.set(x.id, x);
        });

        saveItems(Array.from(byId.values()));
        renderContentHub();
        alert("Import complete.");
      } catch {
        alert("Import failed.");
      }
    };
    input.click();
  };

  // ------------------ Boot ------------------

  function boot() {
    // try auto-fetch once per page load if API key exists
    const key = getApiKey();
    renderContentHub();

    if (key) {
      setTimeout(async () => {
        const stats = await fetchYouTubeStats();
        if (stats) {
          window.__ytStats = stats;
          saveStatsHistory(stats);
          renderContentHub();
        }
      }, 250);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
