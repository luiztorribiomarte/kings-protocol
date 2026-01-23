// =====================================================
// CONTENT HUB MODULE (SAFE ADD-ON)
// - Does NOT modify app.js
// - Works independently
// - Persists in localStorage
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "contentHubItems";
  const CONTAINER_ID = "contentHubContainer";

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

    container.innerHTML = `
      <div class="section-title">🎬 Content Hub</div>

      <div style="
        margin-top:10px;
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

  function renderCard(item) {
    const title = escapeHtml(item.title);
    const notes = escapeHtml(item.notes || "");
    const updated = prettyTime(item.updatedAt);

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

  // ---- Public API (called by HTML onclick) ----

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
    if (typeof openModal !== "function") {
      // If the app modal system isn't available, fail safely.
      return;
    }

    const items = getItems();
    const item = items.find(x => x.id === id);
    if (!item) return;

    const title = escapeHtml(item.title);
    const notes = escapeHtml(item.notes || "");

    openModal(`
      <div style="
        width:min(720px, 92vw);
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
    if (!titleEl || !notesEl) return;

    const title = titleEl.value.trim();
    const notes = notesEl.value.trim();

    if (!title) return;

    const items = getItems();
    const now = Date.now();

    const next = items.map(x =>
      x.id === id
        ? { ...x, title, notes, updatedAt: now }
        : x
    );

    saveItems(next);

    if (typeof closeModal === "function") closeModal();
    renderContentHub();
  };

  // ---- Hook navigation / activation ----

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
