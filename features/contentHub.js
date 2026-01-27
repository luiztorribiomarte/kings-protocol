// =====================================================
// CONTENT HUB CORE (STABLE CREATOR SYSTEM)
// Ideas → Posted
// Add, Edit, Post, Delete ideas (NO POPUPS)
// Designed to survive KP Core + overlays + re-renders
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "contentHubItems";

  function loadItems() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
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

  function getContainer() {
    return document.getElementById("contentContainer");
  }

  // ===============================
  // CORE ACTIONS (GLOBAL + STABLE)
  // ===============================

  window.ContentHub = {
    addIdea(title, notes) {
      const items = loadItems();
      items.push({
        id: uuid(),
        title,
        notes,
        stage: "idea",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      saveItems(items);
      renderContentHub();
    },

    postIdea(id) {
      const items = loadItems();
      const item = items.find(i => i.id === id);
      if (!item) return;

      item.stage = "posted";
      item.updatedAt = Date.now();

      saveItems(items);
      renderContentHub();
    },

    deleteIdea(id) {
      const items = loadItems().filter(i => i.id !== id);
      saveItems(items);
      renderContentHub();
    },

    editIdea(id) {
      const items = loadItems();
      const item = items.find(i => i.id === id);
      if (!item) return;
      openEditIdeaModal(item);
    },

    updateIdea(id, title, notes) {
      const items = loadItems();
      const item = items.find(i => i.id === id);
      if (!item) return;

      item.title = title;
      item.notes = notes;
      item.updatedAt = Date.now();

      saveItems(items);
      closeModal();
      renderContentHub();
    }
  };

  // ===============================
  // UI RENDER
  // ===============================

  function renderContentHub() {
    const container = getContainer();
    if (!container) return;

    const items = loadItems();
    const ideas = items.filter(i => i.stage === "idea");
    const posted = items.filter(i => i.stage === "posted");

    container.innerHTML = `
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

    bindContentEvents();
  }

  function renderIdeaCard(item) {
    const label = item.stage === "posted" ? "POSTED" : "IDEA";

    return `
      <div style="margin-top:10px; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.25);">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div>
            <div style="font-weight:800;">${escapeHtml(item.title)}</div>
            <div style="color:#9CA3AF; font-size:0.85rem;">${label}</div>
          </div>

          <div style="display:flex; gap:6px;">
            ${
              item.stage === "idea"
                ? `<button class="form-submit" data-action="post" data-id="${item.id}">Post</button>`
                : ""
            }
            <button class="form-cancel" data-action="edit" data-id="${item.id}">Edit</button>
            <button class="form-cancel" style="color:#ef4444;" data-action="delete" data-id="${item.id}">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  // ===============================
  // EVENT BINDING (REAL FIX)
  // ===============================

  function bindContentEvents() {
    const root = document.getElementById("contentHubContainer");
    if (!root) return;

    // Add Idea button
    const addBtn = document.getElementById("addIdeaBtn");
    if (addBtn) {
      addBtn.onclick = openAddIdeaModal;
    }

    // Action buttons (Post / Edit / Delete)
    root.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === "post") ContentHub.postIdea(id);
        if (action === "edit") ContentHub.editIdea(id);
        if (action === "delete") ContentHub.deleteIdea(id);
      };
    });
  }

  // ===============================
  // MODALS
  // ===============================

  function openAddIdeaModal() {
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

    document.getElementById("saveIdeaBtn").onclick = () => {
      const title = document.getElementById("ideaTitleInput").value.trim();
      const notes = document.getElementById("ideaNotesInput").value.trim();
      if (!title) return;
      ContentHub.addIdea(title, notes);
      closeModal();
    };
  }

  function openEditIdeaModal(item) {
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

    document.getElementById("updateIdeaBtn").onclick = () => {
      const title = document.getElementById("ideaTitleInput").value.trim();
      const notes = document.getElementById("ideaNotesInput").value.trim();
      ContentHub.updateIdea(item.id, title, notes);
    };
  }

  // ===============================
  // NAV HOOK
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
    setTimeout(renderContentHub, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
