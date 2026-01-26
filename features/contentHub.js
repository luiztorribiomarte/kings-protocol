// =====================================================
// CONTENT HUB MODULE v2 — CREATOR OS UPGRADE
// - Backward compatible
// - Adds YouTube live stats + creator metrics
// - Does NOT modify app.js
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "contentHubItems";
  const CONTAINER_ID = "contentHubContainer";

  // 🔥 ADD YOUR YOUTUBE INFO HERE (later)
  const YOUTUBE_CONFIG = {
    apiKey: "AIzaSyB0DZGhMJ_X1P_nzczN4e-hc1xB5hOc7rw",        // <-- paste API key here later
    channelId: "UCKUFonoh8azQwjXnh2ViqHQ"      // <-- paste channel ID here later
  };

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
    const items = safeParse(localStorage.getItem(STORAGE_KEY) || "[]", []);

    // backward compatible upgrade
    return items.map(item => ({
      id: item.id,
      title: item.title || "",
      stage: item.stage || "idea",
      notes: item.notes || "",
      platform: item.platform || "YouTube",
      priority: item.priority || "normal",
      createdAt: item.createdAt || Date.now(),
      updatedAt: item.updatedAt || Date.now()
    }));
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

  // ============================
  // YOUTUBE LIVE STATS
  // ============================

  let youtubeCache = {
    subscribers: 0,
    views: 0,
    videos: 0,
    channelName: "",
    lastUpdated: null
  };

  async function fetchYouTubeStats() {
    const { apiKey, channelId } = YOUTUBE_CONFIG;
    if (!apiKey || !channelId) return;

    try {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.items && data.items.length) {
        const stats = data.items[0].statistics;
        const snippet = data.items[0].snippet;

        youtubeCache = {
          subscribers: Number(stats.subscriberCount),
          views: Number(stats.viewCount),
          videos: Number(stats.videoCount),
          channelName: snippet.title,
          lastUpdated: Date.now()
        };
      }
    } catch (err) {
      console.warn("YouTube API error:", err);
    }
  }

  function renderYouTubePanel() {
    const y = youtubeCache;
    const time = y.lastUpdated
      ? new Date(y.lastUpdated).toLocaleTimeString()
      : "Not connected";

    return `
      <div style="
        margin-top:10px;
        padding:16px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.14);
        background:linear-gradient(135deg, rgba(239,68,68,0.12), rgba(59,130,246,0.08));
      ">
        <div style="font-weight:900; font-size:1.1rem; color:white;">
          📺 YouTube Channel
        </div>

        <div style="margin-top:6px; color:#9CA3AF; font-weight:900;">
          ${escapeHtml(y.channelName || "Not connected")}
        </div>

        <div style="
          margin-top:12px;
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
          gap:12px;
        ">
          <div>
            <div style="color:#9CA3AF;font-size:0.85rem;">Subscribers</div>
            <div style="font-size:1.8rem;font-weight:950;color:#ef4444;">
              ${y.subscribers.toLocaleString()}
            </div>
          </div>

          <div>
            <div style="color:#9CA3AF;font-size:0.85rem;">Total Views</div>
            <div style="font-size:1.4rem;font-weight:900;color:white;">
              ${y.views.toLocaleString()}
            </div>
          </div>

          <div>
            <div style="color:#9CA3AF;font-size:0.85rem;">Videos</div>
            <div style="font-size:1.4rem;font-weight:900;color:white;">
              ${y.videos.toLocaleString()}
            </div>
          </div>
        </div>

        <div style="margin-top:8px;font-size:0.8rem;color:#9CA3AF;">
          Updated: ${time}
        </div>
      </div>
    `;
  }

  // ============================
  // CREATOR INTELLIGENCE
  // ============================

  function renderCreatorMetrics(items) {
    const total = items.length;
    const posted = items.filter(i => i.stage === "posted").length;
    const ideas = items.filter(i => i.stage === "idea").length;

    const conversion = total ? Math.round((posted / total) * 100) : 0;

    const stageCounts = {};
    STAGES.forEach(s => {
      stageCounts[s.key] = items.filter(i => i.stage === s.key).length;
    });

    return `
      <div style="
        margin-top:14px;
        padding:16px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.05);
      ">
        <div style="font-weight:900;color:white;">🧠 Creator Intelligence</div>

        <div style="
          margin-top:12px;
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
          gap:12px;
        ">
          <div>
            <div style="color:#9CA3AF;font-size:0.85rem;">Total Ideas</div>
            <div style="font-size:1.5rem;font-weight:900;color:white;">${total}</div>
          </div>

          <div>
            <div style="color:#9CA3AF;font-size:0.85rem;">Posted Videos</div>
            <div style="font-size:1.5rem;font-weight:900;color:#22c55e;">${posted}</div>
          </div>

          <div>
            <div style="color:#9CA3AF;font-size:0.85rem;">Idea → Posted</div>
            <div style="font-size:1.5rem;font-weight:900;color:#a78bfa;">${conversion}%</div>
          </div>
        </div>

        <div style="margin-top:10px;color:#9CA3AF;font-size:0.85rem;">
          Pipeline: ${STAGES.map(s => `${s.label}: ${stageCounts[s.key]}`).join(" • ")}
        </div>
      </div>
    `;
  }

  // ============================
  // UI RENDER
  // ============================

  function renderContentHub() {
    const container = ensureContainer();
    if (!container) return;

    const items = getItems();
    const filterKey = (window.__contentHubFilterKey || "all");

    const filtered =
      filterKey === "all"
        ? items
        : items.filter(x => x.stage === filterKey);

    container.innerHTML = `
      <div class="section-title">🎬 Content Hub</div>

      ${renderYouTubePanel()}
      ${renderCreatorMetrics(items)}

      ${renderInputPanel()}
      ${renderFilters(filterKey, filtered.length, items.length)}
      ${renderItems(filtered)}
    `;
  }

  function renderInputPanel() {
    return `
      <div style="
        margin-top:14px;
        padding:14px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.05);
      ">
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <input id="contentTitleInput" placeholder="New idea title"
            style="flex:2;min-width:220px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px 10px;color:white;" />

          <select id="contentStageInput"
            style="flex:1;min-width:140px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px 10px;color:white;">
            ${STAGES.map(s => `<option value="${s.key}">${s.label}</option>`).join("")}
          </select>

          <button onclick="addContentItem()" style="
            padding:9px 14px;border-radius:10px;
            background:linear-gradient(135deg,#6366f1,#ec4899);
            color:white;border:none;font-weight:900;cursor:pointer;
          ">Add</button>
        </div>

        <textarea id="contentNotesInput" placeholder="Notes..."
          style="width:100%;height:90px;margin-top:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:10px;color:white;"></textarea>
      </div>
    `;
  }

  function renderFilters(activeKey, shown, total) {
    const pill = (key, label) => `
      <button onclick="setContentFilter('${key}')" style="
        padding:8px 12px;border-radius:999px;
        border:1px solid rgba(255,255,255,0.14);
        background:${key === activeKey ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)"};
        color:${key === activeKey ? "#E5E7EB" : "#9CA3AF"};
        font-weight:900;cursor:pointer;
      ">${label}</button>
    `;

    return `
      <div style="margin-top:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${pill("all", "All")}
          ${STAGES.map(s => pill(s.key, s.label)).join("")}
        </div>
        <div style="color:#9CA3AF;font-weight:900;font-size:0.9rem;">
          ${shown} shown / ${total} total
        </div>
      </div>
    `;
  }

  function renderItems(filtered) {
    return `
      <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px;">
        ${
          filtered.length
            ? filtered
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map(renderCard)
                .join("")
            : `<div style="color:#9CA3AF;">No items here yet.</div>`
        }
      </div>
    `;
  }

  function renderCard(item) {
    return `
      <div style="padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,0.14);background:rgba(0,0,0,0.18);">
        <div style="font-weight:950;color:white;">${escapeHtml(item.title)}</div>
        <div style="margin-top:6px;color:#9CA3AF;font-size:0.85rem;">Stage: ${item.stage}</div>
        <div style="margin-top:6px;color:#E5E7EB;white-space:pre-wrap;">
          ${escapeHtml(item.notes || "No notes")}
        </div>

        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
          <select onchange="setContentStage('${item.id}', this.value)"
            style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:6px 8px;color:white;">
            ${STAGES.map(s => `<option value="${s.key}" ${s.key === item.stage ? "selected" : ""}>${s.label}</option>`).join("")}
          </select>

          <button onclick="openContentEdit('${item.id}')" style="padding:6px 10px;border-radius:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);color:white;font-weight:900;">Edit</button>
          <button onclick="deleteContentItem('${item.id}')" style="padding:6px 10px;border-radius:10px;border:1px solid rgba(239,68,68,0.35);color:#FCA5A5;font-weight:900;">Delete</button>
        </div>
      </div>
    `;
  }

  // ============================
  // ACTIONS (UNCHANGED CORE)
  // ============================

  window.setContentFilter = function (key) {
    window.__contentHubFilterKey = key;
    renderContentHub();
  };

  window.addContentItem = function () {
    const titleEl = document.getElementById("contentTitleInput");
    const stageEl = document.getElementById("contentStageInput");
    const notesEl = document.getElementById("contentNotesInput");

    const title = titleEl.value.trim();
    const stage = stageEl.value;
    const notes = notesEl.value.trim();

    if (!title) return;

    const items = getItems();
    const now = Date.now();

    items.push({
      id: uid(),
      title,
      stage,
      notes,
      createdAt: now,
      updatedAt: now
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
      x.id === id ? { ...x, stage, updatedAt: Date.now() } : x
    );
    saveItems(items);
    renderContentHub();
  };

  window.openContentEdit = function (id) {
    if (typeof openModal !== "function") return;

    const item = getItems().find(x => x.id === id);
    if (!item) return;

    openModal(`
      <div style="padding:16px;border-radius:16px;background:rgba(10,10,12,0.95);border:1px solid rgba(255,255,255,0.14);">
        <div style="font-weight:900;color:white;">Edit Content</div>
        <input id="contentEditTitle" value="${escapeHtml(item.title)}" style="width:100%;margin-top:10px;padding:10px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:white;" />
        <textarea id="contentEditNotes" style="width:100%;height:160px;margin-top:10px;padding:10px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:white;">${escapeHtml(item.notes)}</textarea>
        <div style="margin-top:10px;display:flex;gap:10px;">
          <button onclick="saveContentEdit('${item.id}')" style="padding:8px 14px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#ec4899);color:white;font-weight:900;">Save</button>
          <button onclick="closeModal()" style="padding:8px 14px;border-radius:10px;background:rgba(255,255,255,0.08);color:white;">Cancel</button>
        </div>
      </div>
    `);
  };

  window.saveContentEdit = function (id) {
    const title = document.getElementById("contentEditTitle").value.trim();
    const notes = document.getElementById("contentEditNotes").value.trim();

    const items = getItems().map(x =>
      x.id === id ? { ...x, title, notes, updatedAt: Date.now() } : x
    );

    saveItems(items);
    closeModal();
    renderContentHub();
  };

  // ============================
  // BOOT + YOUTUBE AUTO REFRESH
  // ============================

  async function boot() {
    await fetchYouTubeStats();
    renderContentHub();

    // refresh YouTube stats every 60s
    setInterval(async () => {
      await fetchYouTubeStats();
      renderContentHub();
    }, 60000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
