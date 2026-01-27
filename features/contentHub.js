// =====================================================
// CONTENT HUB CORE (SIMPLIFIED CREATOR SYSTEM - FIXED)
// Ideas → Posted
// Add, Edit, Post, Delete ideas
// Works with dynamic UI + KP Core + overlays
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

  function getContainer() {
    return document.getElementById("contentContainer");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ===============================
  // GLOBAL ACTIONS (IMPORTANT FIX)
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
      if (!confirm("Delete this idea?")) return;
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
    const ideas = items.filter(i => i.stage !== "posted");
    const posted = items.filter(i => i.stage === "posted");

    container.innerHTML = `
      <div id="contentHubContainer">

        <div class="habit-section">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="section-title">💡 Ideas</div>
            <button class="form-submit" onclick="openAddIdeaModal()">Add Idea</button>
          </div>

          <div class="ideas-list">
            ${
              ideas.length
                ? ideas.map(renderIdeaCard).join("")
                : `<div style="color:#9CA3AF;">No ideas yet.</div>`
            }
          </div>
        </div>

        <div class="habit-section">
          <div class="section-title">✅ Posted</div>

          <div class="ideas-list">
            ${
              posted.length
                ? posted.map(renderIdeaCard).join("")
                : `<div style="color:#9CA3AF;">No posted content yet.</div>`
            }
          </div>
        </div>

      </div>
    `;
  }

  function renderIdeaCard(item) {
    const stageLabel = item.stage === "posted" ? "POSTED" : "IDEA";

    return `
      <div class="idea-item" style="margin-top:10px; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.25);">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div>
            <div style="font-weight:800;">${escapeHtml(item.title)}</div>
            <div style="color:#9CA3AF; font-size:0.85rem;">${stageLabel}</div>
          </div>

          <div style="display:flex; gap:6px;">
            ${
              item.stage !== "posted"
                ? `<button class="form-submit" onclick="ContentHub.postIdea('${item.id}')">Post</button>`
                : ""
            }
            <button class="form-cancel" onclick="ContentHub.editIdea('${item.id}')">Edit</button>
            <button class="form-cancel" style="color:#ef4444;" onclick="ContentHub.deleteIdea('${item.id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  // ===============================
  // MODALS
  // ===============================
  window.openAddIdeaModal = function () {
    openModal(`
      <div class="section-title">Add Idea</div>

      <div class="form-group">
        <label>Title</label>
        <input id="ideaTitleInput" class="form-input" placeholder="Idea title..." />
      </div>

      <div class="form-group">
        <label>Notes (optional)</label>
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
      if (!title) return alert("Title required.");
      ContentHub.addIdea(title, notes);
      closeModal();
    };
  };

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
      setTimeout(renderContentHub, 50);
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
