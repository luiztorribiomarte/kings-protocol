// =====================================================
// VISION BOARD MODULE v3 — GOD MODE UPGRADE
// SAFE: affects ONLY vision board
// Backward compatible + cleaner architecture + new features
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "visionBoardItems";
  const CONTAINER_ID = "visionBoardContainer";

  const DEFAULT_CATEGORIES = ["General", "Money", "Health", "Skills", "Lifestyle", "Mindset"];

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
    return items.map(item => ({
      id: item.id || crypto.randomUUID(),
      title: item.title || "",
      image: item.image || "",
      category: item.category || "General",
      progress: typeof item.progress === "number" ? item.progress : 0,
      priority: item.priority || "normal", // low | normal | high
      achieved: !!item.achieved,
      createdAt: item.createdAt || new Date().toISOString()
    }));
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function esc(str) {
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

  // ---------------- METRICS ----------------

  function renderMetrics(items) {
    const total = items.length;
    const completed = items.filter(i => i.achieved).length;
    const avgProgress = total
      ? Math.round(items.reduce((a, b) => a + b.progress, 0) / total)
      : 0;

    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:14px;">
        <div style="padding:12px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);">
          <div style="color:#9CA3AF;font-size:0.85rem;">Total Visions</div>
          <div style="font-size:1.6rem;font-weight:900;color:white;">${total}</div>
        </div>

        <div style="padding:12px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);">
          <div style="color:#9CA3AF;font-size:0.85rem;">Completed</div>
          <div style="font-size:1.6rem;font-weight:900;color:#22c55e;">${completed}</div>
        </div>

        <div style="padding:12px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);">
          <div style="color:#9CA3AF;font-size:0.85rem;">Avg Progress</div>
          <div style="font-size:1.6rem;font-weight:900;color:#3b82f6;">${avgProgress}%</div>
        </div>
      </div>
    `;
  }

  // ---------------- STATE ----------------

  let activeCategory = "all";
  let searchQuery = "";

  function filteredItems(items) {
    return items.filter(item => {
      const matchCategory =
        activeCategory === "all" || item.category === activeCategory;
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }

  // ---------------- RENDER ----------------

  function renderVisionBoard() {
    const container = ensureContainer();
    if (!container) return;

    const items = getItems();
    const visibleItems = filteredItems(items);

    container.innerHTML = `
      <div class="section-title">Vision Board</div>

      ${renderMetrics(items)}

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
        <input id="visionSearchInput" placeholder="Search visions..."
          style="flex:1;min-width:180px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px 10px;color:white;" />

        <select id="visionFilterCategory"
          style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px 10px;color:white;">
          <option value="all">All Categories</option>
          ${DEFAULT_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("")}
        </select>
      </div>

      <div style="padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.05);">
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <input id="visionTitleInput" placeholder="Vision title"
            style="flex:1;min-width:160px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px 10px;color:white;" />

          <input id="visionImageInput" placeholder="Image URL"
            style="flex:1;min-width:200px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px 10px;color:white;" />

          <select id="visionCategoryInput"
            style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px 10px;color:white;">
            ${DEFAULT_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("")}
          </select>

          <select id="visionPriorityInput"
            style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px 10px;color:white;">
            <option value="low">Low</option>
            <option value="normal" selected>Normal</option>
            <option value="high">High</option>
          </select>

          <button onclick="addVisionItem()" style="padding:9px 14px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#ec4899);color:white;border:none;font-weight:800;">
            Add
          </button>
        </div>
      </div>

      <div style="margin-top:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
        ${
          visibleItems.length
            ? visibleItems.map(item => renderCard(item)).join("")
            : `<div style="color:#9CA3AF;">No visions found.</div>`
        }
      </div>
    `;

    hookInputs();
    enableDragAndDrop();
  }

  function renderCard(item) {
    const priorityColor =
      item.priority === "high" ? "#ef4444" :
      item.priority === "low" ? "#10b981" :
      "#a78bfa";

    return `
      <div draggable="true" data-id="${item.id}" class="vision-card"
        style="position:relative;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,0.14);background:rgba(0,0,0,0.25);">

        ${item.image ? `<img src="${esc(item.image)}" style="width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:8px;" />` : ""}

        <div style="font-weight:900;color:white;">${esc(item.title)}</div>
        <div style="font-size:0.8rem;color:#9CA3AF;">${esc(item.category)}</div>

        <div style="font-size:0.75rem;margin-top:4px;color:${priorityColor};font-weight:800;">
          Priority: ${item.priority.toUpperCase()}
        </div>

        <div style="margin-top:6px;font-size:0.8rem;color:#9CA3AF;">Progress</div>
        <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;">
          <div style="height:100%;width:${item.progress}%;background:linear-gradient(135deg,#22c55e,#3b82f6);"></div>
        </div>
        <div style="font-size:0.75rem;color:#9CA3AF;margin-top:4px;">${item.progress}%</div>

        <input type="range" min="0" max="100" value="${item.progress}"
          onchange="updateVisionProgress('${item.id}', this.value)"
          style="width:100%;margin-top:6px;" />

        <div style="display:flex;gap:6px;margin-top:8px;">
          <button onclick="toggleVisionAchieved('${item.id}')"
            style="flex:1;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:white;">
            ${item.achieved ? "Undo" : "Achieved"}
          </button>

          <button onclick="deleteVisionItem('${item.id}')"
            style="padding:6px 10px;border-radius:8px;border:none;background:#ef4444;color:white;">
            ✕
          </button>
        </div>
      </div>
    `;
  }

  // ---------------- ACTIONS ----------------

  window.addVisionItem = function () {
    const title = document.getElementById("visionTitleInput").value.trim();
    if (!title) return;

    const image = document.getElementById("visionImageInput").value.trim();
    const category = document.getElementById("visionCategoryInput").value;
    const priority = document.getElementById("visionPriorityInput").value;

    const items = getItems();
    items.push({
      id: crypto.randomUUID(),
      title,
      image,
      category,
      priority,
      progress: 0,
      achieved: false,
      createdAt: new Date().toISOString()
    });

    saveItems(items);
    renderVisionBoard();
  };

  window.updateVisionProgress = function (id, value) {
    const items = getItems();
    const item = items.find(i => i.id === id);
    if (!item) return;

    item.progress = Number(value);
    if (item.progress === 100) item.achieved = true;

    saveItems(items);
    renderVisionBoard();
  };

  window.toggleVisionAchieved = function (id) {
    const items = getItems();
    const item = items.find(i => i.id === id);
    if (!item) return;

    item.achieved = !item.achieved;
    if (item.achieved) item.progress = 100;

    saveItems(items);
    renderVisionBoard();
  };

  window.deleteVisionItem = function (id) {
    let items = getItems();
    items = items.filter(i => i.id !== id);
    saveItems(items);
    renderVisionBoard();
  };

  // ---------------- FILTERS ----------------

  function hookInputs() {
    const search = document.getElementById("visionSearchInput");
    const cat = document.getElementById("visionFilterCategory");

    if (search) {
      search.value = searchQuery;
      search.oninput = e => {
        searchQuery = e.target.value;
        renderVisionBoard();
      };
    }

    if (cat) {
      cat.value = activeCategory;
      cat.onchange = e => {
        activeCategory = e.target.value;
        renderVisionBoard();
      };
    }
  }

  // ---------------- DRAG & DROP ----------------

  function enableDragAndDrop() {
    const cards = document.querySelectorAll(".vision-card");
    let draggedId = null;

    cards.forEach(card => {
      card.addEventListener("dragstart", () => {
        draggedId = card.dataset.id;
        card.style.opacity = "0.4";
      });

      card.addEventListener("dragend", () => {
        draggedId = null;
        card.style.opacity = "1";
      });

      card.addEventListener("dragover", e => e.preventDefault());

      card.addEventListener("drop", () => {
        const targetId = card.dataset.id;
        if (!draggedId || draggedId === targetId) return;

        const items = getItems();
        const from = items.findIndex(i => i.id === draggedId);
        const to = items.findIndex(i => i.id === targetId);

        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);

        saveItems(items);
        renderVisionBoard();
      });
    });
  }

  // ---------------- BOOT ----------------

  function boot() {
    renderVisionBoard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
