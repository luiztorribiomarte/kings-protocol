// =====================================================
// VISION BOARD MODULE v2 (SAFE UPGRADE)
// - Backward compatible with old data
// - Adds categories, progress %, metrics panel
// - Does NOT touch other modules
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "visionBoardItems";
  const CONTAINER_ID = "visionBoardContainer";

  const DEFAULT_CATEGORIES = ["Money", "Health", "Skills", "Lifestyle", "Mindset"];

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

    // backward compatibility upgrade
    return items.map(item => ({
      title: item.title || "",
      image: item.image || "",
      category: item.category || "General",
      progress: typeof item.progress === "number" ? item.progress : 0,
      createdAt: item.createdAt || new Date().toISOString()
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

  function renderMetrics(items) {
    const total = items.length;
    const avgProgress = total
      ? Math.round(items.reduce((a, b) => a + b.progress, 0) / total)
      : 0;

    const categoryCount = {};
    items.forEach(i => {
      categoryCount[i.category] = (categoryCount[i.category] || 0) + 1;
    });

    let dominantCategory = "None";
    let max = 0;
    for (const k in categoryCount) {
      if (categoryCount[k] > max) {
        max = categoryCount[k];
        dominantCategory = k;
      }
    }

    return `
      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
        gap:12px;
        margin-bottom:14px;
      ">
        <div style="padding:12px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);">
          <div style="color:#9CA3AF;font-size:0.85rem;">Total Visions</div>
          <div style="font-size:1.6rem;font-weight:900;color:white;">${total}</div>
        </div>

        <div style="padding:12px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);">
          <div style="color:#9CA3AF;font-size:0.85rem;">Avg Progress</div>
          <div style="font-size:1.6rem;font-weight:900;color:#10B981;">${avgProgress}%</div>
        </div>

        <div style="padding:12px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);">
          <div style="color:#9CA3AF;font-size:0.85rem;">Dominant Focus</div>
          <div style="font-size:1.3rem;font-weight:900;color:#A78BFA;">${dominantCategory}</div>
        </div>
      </div>
    `;
  }

  function renderVisionBoard() {
    const container = ensureContainer();
    if (!container) return;

    const items = getItems();

    container.innerHTML = `
      <div class="section-title">🖼 Vision Board</div>

      ${renderMetrics(items)}

      <div style="
        margin-top:10px;
        padding:14px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.05);
      ">
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <input id="visionTitleInput" placeholder="Vision title"
            style="flex:1;min-width:160px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px 10px;color:white;outline:none;" />

          <input id="visionImageInput" placeholder="Image URL"
            style="flex:1;min-width:200px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px 10px;color:white;outline:none;" />

          <select id="visionCategoryInput"
            style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:8px 10px;color:white;">
            <option value="General">General</option>
            ${DEFAULT_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("")}
          </select>

          <button onclick="addVisionItem()" style="
            padding:9px 14px;border-radius:10px;
            background:linear-gradient(135deg,#6366f1,#ec4899);
            color:white;border:none;cursor:pointer;font-weight:800;
          ">Add</button>
        </div>
      </div>

      <div style="
        margin-top:14px;
        display:grid;
        grid-template-columns:repeat(auto-fill,minmax(200px,1fr));
        gap:12px;
      ">
        ${
          items.length
            ? items.map((item, i) => `
              <div draggable="true" data-index="${i}" class="vision-card" style="
                position:relative;padding:12px;border-radius:14px;
                border:1px solid rgba(255,255,255,0.14);
                background:rgba(0,0,0,0.25);cursor:grab;
              ">
                ${
                  item.image
                    ? `<img src="${escapeHtml(item.image)}" style="width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:8px;" />`
                    : ""
                }

                <div style="font-weight:900;color:white;margin-bottom:4px;">
                  ${escapeHtml(item.title)}
                </div>

                <div style="font-size:0.8rem;color:#9CA3AF;margin-bottom:6px;">
                  ${escapeHtml(item.category)}
                </div>

                <div style="font-size:0.8rem;color:#9CA3AF;">Progress</div>
                <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;">
                  <div style="height:100%;width:${item.progress}%;background:linear-gradient(135deg,#22c55e,#3b82f6);"></div>
                </div>
                <div style="font-size:0.75rem;color:#9CA3AF;margin-top:4px;">${item.progress}%</div>

                <input type="range" min="0" max="100" value="${item.progress}"
                  onchange="updateVisionProgress(${i}, this.value)"
                  style="width:100%;margin-top:6px;" />

                <button onclick="deleteVisionItem(${i})" style="
                  position:absolute;top:8px;right:8px;background:none;border:none;
                  color:#EF4444;font-weight:900;cursor:pointer;
                ">✕</button>
              </div>
            `).join("")
            : `<div style="color:#9CA3AF;">No visions yet.</div>`
        }
      </div>
    `;

    enableDragAndDrop();
  }

  window.addVisionItem = function () {
    const titleEl = document.getElementById("visionTitleInput");
    const imageEl = document.getElementById("visionImageInput");
    const catEl = document.getElementById("visionCategoryInput");

    if (!titleEl) return;

    const title = titleEl.value.trim();
    const image = imageEl ? imageEl.value.trim() : "";
    const category = catEl ? catEl.value : "General";

    if (!title) return;

    const items = getItems();
    items.push({
      title,
      image,
      category,
      progress: 0,
      createdAt: new Date().toISOString()
    });

    saveItems(items);

    titleEl.value = "";
    if (imageEl) imageEl.value = "";

    renderVisionBoard();
  };

  window.updateVisionProgress = function (index, value) {
    const items = getItems();
    if (!items[index]) return;
    items[index].progress = Number(value);
    saveItems(items);
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
      card.addEventListener("dragstart", () => {
        draggedIndex = Number(card.dataset.index);
        card.style.opacity = "0.4";
      });

      card.addEventListener("dragend", () => {
        draggedIndex = null;
        card.style.opacity = "1";
      });

      card.addEventListener("dragover", e => e.preventDefault());

      card.addEventListener("drop", () => {
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
