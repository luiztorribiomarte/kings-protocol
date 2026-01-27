// =====================================================
// CONTENT HUB CORE (STABLE CREATOR SYSTEM - MOUNT SAFE)
// Ideas → Posted
// - Add, Edit, Post, Delete ideas (NO POPUPS)
// - CRITICAL FIX: renders ONLY inside its own mount div
//   so it does NOT wipe other content modules/upgrades
// - Compatible with existing "contentHubItems" storage
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "contentHubItems";
  const HUB_MOUNT_ID = "contentHubMount";

  function loadItems() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function uuid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getContentContainer() {
    return document.getElementById("contentContainer");
  }

  // Ensures we have a safe mount point that only THIS module controls.
  function ensureMount() {
    const container = getContentContainer();
    if (!container) return null;

    let mount = document.getElementById(HUB_MOUNT_ID);
    if (mount) return mount;

    mount = document.createElement("div");
    mount.id = HUB_MOUNT_ID;

    // Put it at the top so upgrades can render below if they want
    container.prepend(mount);

    return mount;
  }

  // Normalize stages from any older versions
  function normStage(stage) {
    return String(stage || "idea").trim().toLowerCase();
  }

  // Anything not posted is treated as an IDEA (your new simplified system)
  function isPosted(item) {
    return normStage(item.stage) === "posted";
  }

  // ===============================
  // GLOBAL API (stable access)
  // ===============================
  window.ContentHub = window.ContentHub || {};

  window.ContentHub.addIdea = function (title, notes) {
    const t = String(title || "").trim();
    const n = String(notes || "").trim();
    if (!t) return;

    const items = loadItems();
    items.push({
      id: uuid(),
      title: t,
      notes: n,
      stage: "idea",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    saveItems(items);
    renderContentHub();
  };

  window.ContentHub.postIdea = function (id) {
    const items = loadItems();
    const item = items.find(i => String(i.id) === String(id));
    if (!item) return;

    item.stage = "posted";
    item.updatedAt = Date.now();

    saveItems(items);
    renderContentHub();
  };

  window.ContentHub.deleteIdea = function (id) {
    const before = loadItems();
    const after = before.filter(i => String(i.id) !== String(id));
    saveItems(after);
    renderContentHub();
  };

  window.ContentHub.editIdea = function (id) {
    const items = loadItems();
    const item = items.find(i => String(i.id) === String(id));
    if (!item) return;
    openEditIdeaModal(item);
  };

  window.ContentHub.updateIdea = function (id, title, notes) {
    const t = String(title || "").trim();
    const n = String(notes || "").trim();

    const items = loadItems();
    const item = items.find(i => String(i.id) === String(id));
    if (!item) return;

    item.title = t || item.title;
    item.notes = n;
    item.updatedAt = Date.now();

    saveItems(items);

    // closeModal exists in your main JS; guard anyway
    if (typeof closeModal === "function") closeModal();

    renderContentHub();
  };

  // ===============================
  // RENDER
  // ===============================
  function renderContentHub() {
    const mount = ensureMount();
    if (!mount) return;

    try {
      const items = loadItems();

      const ideas = items.filter(i => !isPosted(i));
      const posted = items.filter(i => isPosted(i));

      mount.innerHTML = `
        <div id="contentHubContainer">

          <div class="habit-section">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="section-title">💡 Ideas</div>
              <button class="form-submit" id="addIdeaBtn">Add Idea</button>
            </div>

            <div style="margin-top:10px;">
              ${
                ideas.length
                  ? ideas.map(renderIdeaCard).join("")
                  : `<div style="color:#9CA3AF;">No ideas yet.</div>`
              }
            </div>
          </div>

          <div class="habit-section">
            <div class="section-title">✅ Posted</div>

            <div style="margin-top:10px;">
              ${
                posted.length
                  ? posted.map(renderIdeaCard).join("")
                  : `<div style="color:#9CA3AF;">No posted content yet.</div>`
              }
            </div>
          </div>

        </div>
      `;

      bindEvents();
    } catch (err) {
      console.error("[ContentHub] render error:", err);
      mount.innerHTML = `
        <div class="habit-section">
          <div class="section-title">Content</div>
          <div style="color:#EF4444;">Render failed. Check console for error.</div>
        </div>
      `;
    }
  }

  function renderIdeaCard(item) {
    const id = String(item.id || "");
    const title = escapeHtml(item.title);
    const label = isPosted(item) ? "POSTED" : "IDEA";

    return `
      <div class="idea-item" style="margin-top:10px; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.25);">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div>
            <div style="font-weight:800;">${title}</div>
            <div style="color:#9CA3AF; font-size:0.85rem;">${label}</div>
          </div>

          <div style="display:flex; gap:6px;">
            ${
              !isPosted(item)
                ? `<button class="form-submit" data-action="post" data-id="${id}">Post</button>`
                : ""
            }
            <button class="form-cancel" data-action="edit" data-id="${id}">Edit</button>
            <button class="form-cancel" style="color:#ef4444;" data-action="delete" data-id="${id}">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  // ===============================
  // EVENTS
  // ===============================
  function bindEvents() {
    const root = document.getElementById("contentHubContainer");
    if (!root) return;

    const addBtn = document.getElementById("addIdeaBtn");
    if (addBtn) addBtn.onclick = openAddIdeaModal;

    // Use direct binding each render (stable)
    root.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === "post") window.ContentHub.postIdea(id);
        if (action === "edit") window.ContentHub.editIdea(id);
        if (action === "delete") window.ContentHub.deleteIdea(id);
      };
    });
  }

  // ===============================
  // MODALS
  // ===============================
  function openAddIdeaModal() {
    if (typeof openModal !== "function") return alert("Modal system missing.");

    openModal(`
      <div class="section-title">Add Idea</div>

      <div class="form-group">
        <label>Title</label>
        <input id="ideaTitleInput" class="form-input" placeholder="Idea title..." />
      </div>

      <div class="form-group">
        <label>Notes</label>
        <textarea id="ideaNotesInput" class="form-input" rows="4"></textarea>
      </div>

      <div class="form-actions">
        <button class="form-submit" id="saveIdeaBtn">Save</button>
        <button class="form-cancel" onclick="closeModal()">Cancel</button>
      </div>
    `);

    const btn = document.getElementById("saveIdeaBtn");
    if (btn) {
      btn.onclick = () => {
        const title = document.getElementById("ideaTitleInput").value.trim();
        const notes = document.getElementById("ideaNotesInput").value.trim();
        window.ContentHub.addIdea(title, notes);
        if (typeof closeModal === "function") closeModal();
      };
    }
  }

  function openEditIdeaModal(item) {
    if (typeof openModal !== "function") return alert("Modal system missing.");

    openModal(`
      <div class="section-title">Edit Idea</div>

      <div class="form-group">
        <label>Title</label>
        <input id="ideaTitleInput" class="form-input" value="${escapeHtml(item.title)}" />
      </div>

      <div class="form-group">
        <label>Notes</label>
        <textarea id="ideaNotesInput" class="form-input" rows="4">${escapeHtml(item.notes || "")}</textarea>
      </div>

      <div class="form-actions">
        <button class="form-submit" id="updateIdeaBtn">Update</button>
        <button class="form-cancel" onclick="closeModal()">Cancel</button>
      </div>
    `);

    const btn = document.getElementById("updateIdeaBtn");
    if (btn) {
      btn.onclick = () => {
        const title = document.getElementById("ideaTitleInput").value.trim();
        const notes = document.getElementById("ideaNotesInput").value.trim();
        window.ContentHub.updateIdea(item.id, title, notes);
      };
    }
  }

  // ===============================
  // NAV HOOK (re-render on Content tab)
  // ===============================
  function hookNav() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(renderContentHub, 80);
    });
  }

  function boot() {
    hookNav();
    setTimeout(renderContentHub, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
