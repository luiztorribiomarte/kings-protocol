// =====================================================
// VISION BOARD MODULE (SAFE ADD-ON)
// - Does NOT modify app.js
// - Works independently
// - Persists data in localStorage
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "visionBoardItems";
  const CONTAINER_ID = "visionBoardContainer";

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

  function ensureContainer() {
    const page = document.getElementById("visionBoardPage");
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

  function renderVisionBoard() {
    const container = ensureContainer();
    if (!container) return;

    const items = getItems();

    container.innerHTML = `
      <div class="section-title">🖼 Vision Board</div>

      <div style="
        margin-top:10px;
        padding:14px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.05);
      ">
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <input id="visionTitleInput" placeholder="Goal / Vision title"
            style="
              flex:1; min-width:180px;
              background:rgba(255,255,255,0.05);
              border:1px solid rgba(255,255,255,0.15);
              border-radius:10px;
              padding:8px 10px;
              color:white;
              outline:none;
            " />

          <input id="visionImageInput" placeholder="Image URL (optional)"
            style="
              flex:1; min-width:220px;
              background:rgba(255,255,255,0.05);
              border:1px solid rgba(255,255,255,0.15);
              border-radius:10px;
              padding:8px 10px;
              color:white;
              outline:none;
            " />

          <button onclick="addVisionItem()" style="
            padding:9px 14px;
            border-radius:10px;
            background:linear-gradient(135deg,#6366f1,#ec4899);
            color:white;
            border:none;
            cursor:pointer;
            font-weight:800;
          ">Add</button>
        </div>
      </div>

      <div style="
        margin-top:14px;
        display:grid;
        grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
        gap:12px;
      ">
        ${
          items.length
            ? items.map((item, i) => `
              <div draggable="true" data-index="${i}" class="vision-card" style="
                position:relative;
                padding:12px;
                border-radius:14px;
                border:1px solid rgba(255,255,255,0.14);
                background:rgba(0,0,0,0.2);
                cursor:grab;
              ">
                ${
                  item.image
                    ? `<img src="${escapeHtml(item.image)}" style="
                        width:100%;
                        height:120px;
                        object-fit:cover;
                        border-radius:10px;
                        margin-bottom:8px;
                      " />`
                    : ""
                }
                <div style="color:#E5E7EB; font-weight:900; line-height:1.3;">
                  ${escapeHtml(item.title)}
                </div>

                <button onclick="deleteVisionItem(${i})" style="
                  position:absolute;
                  top:8px;
                  right:8px;
                  background:none;
                  border:none;
                  color:#EF4444;
                  font-weight:900;
                  cursor:pointer;
                ">✕</button>
              </div>
            `).join("")
            : `<div style="color:#9CA3AF;">No visions yet. Add your first one above.</div>`
        }
      </div>
    `;

    enableDragAndDrop();
  }

  window.addVisionItem = function () {
    const titleEl = document.getElementById("visionTitleInput");
    const imageEl = document.getElementById("visionImageInput");

    if (!titleEl) return;

    const title = titleEl.value.trim();
    const image = imageEl ? imageEl.value.trim() : "";

    if (!title) return;

    const items = getItems();
    items.push({ title, image });
    saveItems(items);

    titleEl.value = "";
    if (imageEl) imageEl.value = "";

    renderVisionBoard();
  };

  window.deleteVisionItem = function (index) {
    const items = getItems();
    if (index < 0 || index >= items.length) return;
    items.splice(index, 1);
    saveItems(items);
    renderVisionBoard();
  };

  function enableDragAndDrop() {
    const cards = document.querySelectorAll(".vision-card");
    let draggedIndex = null;

    cards.forEach(card => {
      card.addEventListener("dragstart", e => {
        draggedIndex = Number(card.dataset.index);
        card.style.opacity = "0.4";
      });

      card.addEventListener("dragend", () => {
        draggedIndex = null;
        card.style.opacity = "1";
      });

      card.addEventListener("dragover", e => {
        e.preventDefault();
      });

      card.addEventListener("drop", e => {
        e.preventDefault();
        const targetIndex = Number(card.dataset.index);
        if (draggedIndex === null || targetIndex === draggedIndex) return;

        const items = getItems();
        const [moved] = items.splice(draggedIndex, 1);
        items.splice(targetIndex, 0, moved);

        saveItems(items);
        renderVisionBoard();
      });
    });
  }

  function hookNavigation() {
    document.addEventListener("click", e => {
      const tab = e.target && e.target.closest ? e.target.closest(".nav-tab") : null;
      if (!tab) return;
      setTimeout(renderVisionBoard, 50);
    });
  }

  function observeActivation() {
    const page = document.getElementById("visionBoardPage");
    if (!page || typeof MutationObserver === "undefined") return;

    const obs = new MutationObserver(() => {
      if (page.classList.contains("active")) {
        renderVisionBoard();
      }
    });

    obs.observe(page, { attributes: true, attributeFilter: ["class"] });
  }

  function boot() {
    hookNavigation();
    observeActivation();
    setTimeout(renderVisionBoard, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
