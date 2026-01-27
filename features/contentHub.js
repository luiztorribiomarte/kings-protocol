// =====================================================
// CONTENT HUB CORE (SIMPLIFIED CREATOR SYSTEM)
// Ideas → Posted
// - Add, Edit, Post, Delete ideas
// - Compatible with existing upgrades & overlays
// - Uses same localStorage key: contentHubItems
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

  // ===============================
  // RENDER UI
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
            <button class="form-submit" id="addIdeaBtn">Add Idea</button>
          </div>

          <div id="ideasList" class="ideas-list">
            ${
              ideas.length
                ? ideas.map(renderIdeaCard).join("")
                : `<div style="color:#9CA3AF;">No ideas yet.</div>`
            }
          </div>
        </div>

        <div class="habit-section">
          <div class="section-title">✅ Posted</div>

          <div id="postedList" class="ideas-list">
            ${
              posted.length
                ? posted.map(renderIdeaCard).join("")
                : `<div style="color:#9CA3AF;">No posted content yet.</div>`
            }
          </div>
        </div>

      </div>
    `;

    document.getElementById("addIdeaBtn").onclick = openAddIdeaModal;
  }

  function renderIdeaCard(item) {
    const stageLabel = item.stage === "posted" ? "POSTED" : "IDEA";

    return `
      <div class="idea-item" data-id="${item.id}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <div>
            <div style="font-weight:800;">${escapeHtml(item.title)}</div>
            <div style="color:#9CA3AF; font-size:0.85rem;">${stageLabel}</div>
          </div>

          <div style="display:flex; gap:6px;">
            ${
              item.stage !== "posted"
                ? `<button class="form-submit" data-action="post">Post</button>`
                : ""
            }
            <button class="form-cancel" data-action="edit">Edit</button>
            <button class="form-cancel" data-action="delete" style="color:#ef4444;">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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
        <label>Notes (optional)</label>
        <textarea id="ideaNotesInput" class="form-input" rows="4"></textarea>
      </div>

      <div class="form-actions">
        <button class="form-submit" id="saveIdeaBtn">Save</button>
        <button class="form-cancel" onclick="closeModal()">Cancel</button>
      </div>
    `);

    document.getElementById("saveIdeaBtn").onclick = saveNewIdea;
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

    document.getElementById("updateIdeaBtn").onclick = () => updateIdea(item.id);
  }

  // ===============================
  // ACTIONS
  // ===============================
  function saveNewIdea() {
    const title = document.getElementById("ideaTitleInput").value.trim();
    const notes = document.getElementById("ideaNotesInput").value.trim();

    if (!title) return alert("Title required.");

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
    closeModal();
    renderContentHub();
  }

  function updateIdea(id) {
    const title = document.getElementById("ideaTitleInput").value.trim();
    const notes = document.getElementById("ideaNotesInput").value.trim();

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

  function postIdea(id) {
    const items = loadItems();
    const item = items.find(i => i.id === id);
    if (!item) return;

    item.stage = "posted";
    item.updatedAt = Date.now();

    saveItems(items);
    renderContentHub();
  }

  function deleteIdea(id) {
    if (!confirm("Delete this idea?")) return;

    const items = loadItems().filter(i => i.id !== id);
    saveItems(items);
    renderContentHub();
  }

  // ===============================
  // EVENT DELEGATION (buttons)
  // ===============================
  document.addEventListener("click", e => {
    const card = e.target.closest(".idea-item");
    if (!card) return;

    const id = card.dataset.id;
    const action = e.target.dataset.action;
    if (!action) return;

    const items = loadItems();
    const item = items.find(i => i.id === id);
    if (!item) return;

    if (action === "edit") openEditIdeaModal(item);
    if (action === "post") postIdea(id);
    if (action === "delete") deleteIdea(id);
  });

  // ===============================
  // BOOT + NAV HOOK
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
