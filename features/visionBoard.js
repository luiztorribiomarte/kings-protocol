// =====================================================
// KINGS PROTOCOL — VISION BOARD ENGINE (ELITE MODE)
// Single-file system
// - Sections: Active / Future / Achieved
// - Visions -> milestones (auto progress)
// - Manual or milestone-based progress
// - Intelligence panel + streak
// - Filters + search
// - Drag reorder
// - Inline edits (no popups)
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "kp_visions_v3";
  const CONTAINER_ID = "kpVisionBoardContainer";

  const DEFAULT_CATEGORIES = ["Money", "Health", "Skills", "Lifestyle", "Mindset"];

  // --------------------
  // Helpers
  // --------------------
  function safeParse(raw, fallback) {
    try {
      const v = JSON.parse(raw);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function uuid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function todayKey() {
    return new Date().toISOString().split("T")[0];
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function loadVisions() {
    const raw = safeParse(localStorage.getItem(STORAGE_KEY) || "[]", []);
    return raw.map(v => ({
      id: v.id || uuid(),
      title: v.title || "",
      image: v.image || "",
      category: v.category || "General",
      status: v.status || "future", // future | active | achieved
      progress: typeof v.progress === "number" ? v.progress : 0,
      milestones: Array.isArray(v.milestones)
        ? v.milestones.map(m => ({
            id: m.id || uuid(),
            text: m.text || "",
            done: !!m.done
          }))
        : [],
      updatedAt: v.updatedAt || Date.now(),
      createdAt: v.createdAt || Date.now()
    }));
  }

  function saveVisions(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // --------------------
  // Progress logic
  // --------------------
  function computeProgress(vision) {
    if (!vision.milestones.length) return vision.progress || 0;
    const done = vision.milestones.filter(m => m.done).length;
    return Math.round((done / vision.milestones.length) * 100);
  }

  function getVisionDays(visons) {
    const days = new Set();
    visons.forEach(v => {
      if (v.updatedAt) {
        const d = new Date(v.updatedAt).toISOString().split("T")[0];
        days.add(d);
      }
    });
    return [...days];
  }

  function getVisionStreak(visons, max = 120) {
    const days = new Set(getVisionDays(visons));
    let streak = 0;
    for (let i = 0; i < max; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      if (days.has(key)) streak++;
      else break;
    }
    return streak;
  }

  // --------------------
  // UI mount
  // --------------------
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

  // --------------------
  // Intelligence panel
  // --------------------
  function renderMetrics(visons) {
    const total = visons.length;
    const avg = total
      ? Math.round(visons.reduce((a, v) => a + computeProgress(v), 0) / total)
      : 0;

    const byCategory = {};
    visons.forEach(v => {
      byCategory[v.category] = (byCategory[v.category] || 0) + 1;
    });

    let dominant = "None";
    let max = 0;
    for (const k in byCategory) {
      if (byCategory[k] > max) {
        max = byCategory[k];
        dominant = k;
      }
    }

    const achieved = visons.filter(v => v.status === "achieved").length;
    const completionRate = total ? Math.round((achieved / total) * 100) : 0;
    const streak = getVisionStreak(visons);

    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:14px;">
        <div class="idea-item">
          <div style="color:#9ca3af;font-size:0.85rem;">Total Visions</div>
          <div style="font-size:1.6rem;font-weight:900;">${total}</div>
        </div>

        <div class="idea-item">
          <div style="color:#9ca3af;font-size:0.85rem;">Avg Progress</div>
          <div style="font-size:1.6rem;font-weight:900;color:#10b981;">${avg}%</div>
        </div>

        <div class="idea-item">
          <div style="color:#9ca3af;font-size:0.85rem;">Completion Rate</div>
          <div style="font-size:1.6rem;font-weight:900;color:#22c55e;">${completionRate}%</div>
        </div>

        <div class="idea-item">
          <div style="color:#9ca3af;font-size:0.85rem;">Dominant Focus</div>
          <div style="font-size:1.2rem;font-weight:900;color:#a78bfa;">${dominant}</div>
        </div>

        <div class="idea-item">
          <div style="color:#9ca3af;font-size:0.85rem;">Vision Streak</div>
          <div style="font-size:1.6rem;font-weight:900;color:#facc15;">${streak}</div>
        </div>
      </div>
    `;
  }

  // --------------------
  // Render board
  // --------------------
  function renderBoard() {
    const container = ensureContainer();
    if (!container) return;

    const visions = loadVisions();

    const active = visions.filter(v => v.status === "active");
    const future = visions.filter(v => v.status === "future");
    const achieved = visions.filter(v => v.status === "achieved");

    container.innerHTML = `
      <div class="section-title">Vision Board</div>

      ${renderMetrics(visions)}

      ${renderAddForm()}

      ${renderSection("Active Visions", active, "active")}
      ${renderSection("Future Visions", future, "future")}
      ${renderSection("Achieved Visions", achieved, "achieved")}
    `;

    enableDrag();
  }

  function renderAddForm() {
    return `
      <div style="margin-top:10px;padding:14px;border-radius:14px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.05);">
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <input id="visionTitleInput" placeholder="Vision title" class="form-input" style="flex:1;min-width:160px;" />
          <input id="visionImageInput" placeholder="Image URL" class="form-input" style="flex:1;min-width:200px;" />

          <select id="visionCategoryInput" class="form-input">
            <option value="General">General</option>
            ${DEFAULT_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("")}
          </select>

          <button class="form-submit" onclick="addVision()">Add Vision</button>
        </div>
      </div>
    `;
  }

  function renderSection(title, list, status) {
    return `
      <div class="habit-section" style="margin-top:16px;padding:16px;">
        <div class="section-title">${title}</div>

        <div style="margin-top:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
          ${
            list.length
              ? list.map(v => renderCard(v)).join("")
              : `<div style="color:#9ca3af;">No visions here.</div>`
          }
        </div>
      </div>
    `;
  }

  function renderCard(v) {
    const progress = computeProgress(v);

    return `
      <div draggable="true" data-id="${v.id}" class="vision-card idea-item" style="position:relative;">
        ${
          v.image
            ? `<img src="${escapeHtml(v.image)}" style="width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:8px;" />`
            : ""
        }

        <input
          value="${escapeHtml(v.title)}"
          onchange="renameVision('${v.id}', this.value)"
          style="width:100%;background:none;border:none;color:white;font-weight:900;font-size:1rem;outline:none;"
        />

        <div style="font-size:0.8rem;color:#9ca3af;margin-bottom:6px;">
          ${escapeHtml(v.category)}
        </div>

        <div style="font-size:0.8rem;color:#9ca3af;">Progress</div>
        <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;">
          <div style="height:100%;width:${progress}%;background:linear-gradient(135deg,#22c55e,#3b82f6);"></div>
        </div>
        <div style="font-size:0.75rem;color:#9ca3af;margin-top:4px;">${progress}%</div>

        <input type="range" min="0" max="100" value="${v.progress}"
          onchange="setVisionProgress('${v.id}', this.value)"
          style="width:100%;margin-top:6px;" />

        <div style="margin-top:8px;">
          ${renderMilestones(v)}
        </div>

        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
          <button class="form-submit" onclick="moveVision('${v.id}','active')">Active</button>
          <button class="form-submit" onclick="moveVision('${v.id}','future')">Future</button>
          <button class="form-submit" onclick="moveVision('${v.id}','achieved')">Achieved</button>
          <button class="form-cancel" onclick="deleteVision('${v.id}')" style="color:#ef4444;">Delete</button>
        </div>
      </div>
    `;
  }

  function renderMilestones(v) {
    return `
      <div style="font-size:0.85rem;color:#9ca3af;margin-bottom:4px;">Milestones</div>
      ${
        v.milestones.length
          ? v.milestones.map(m => `
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;">
              <input type="checkbox" ${m.done ? "checked" : ""} onchange="toggleMilestone('${v.id}','${m.id}')" />
              <input value="${escapeHtml(m.text)}"
                onchange="editMilestone('${v.id}','${m.id}', this.value)"
                style="flex:1;background:none;border:none;color:white;outline:none;font-size:0.85rem;" />
              <button onclick="deleteMilestone('${v.id}','${m.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer;">✕</button>
            </div>
          `).join("")
          : `<div style="color:#9ca3af;font-size:0.8rem;">No milestones yet.</div>`
      }

      <button onclick="addMilestone('${v.id}')" style="margin-top:4px;font-size:0.8rem;color:#a78bfa;background:none;border:none;cursor:pointer;">
        + add milestone
      </button>
    `;
  }

  // --------------------
  // Actions
  // --------------------
  window.addVision = function () {
    const title = document.getElementById("visionTitleInput")?.value.trim();
    const image = document.getElementById("visionImageInput")?.value.trim() || "";
    const category = document.getElementById("visionCategoryInput")?.value || "General";

    if (!title) return;

    const visions = loadVisions();
    visions.push({
      id: uuid(),
      title,
      image,
      category,
      status: "future",
      progress: 0,
      milestones: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    saveVisions(visions);
    renderBoard();
  };

  window.renameVision = function (id, name) {
    const visions = loadVisions();
    const v = visions.find(x => x.id === id);
    if (!v) return;
    v.title = name.trim();
    v.updatedAt = Date.now();
    saveVisions(visions);
  };

  window.setVisionProgress = function (id, value) {
    const visions = loadVisions();
    const v = visions.find(x => x.id === id);
    if (!v) return;
    v.progress = Number(value);
    v.updatedAt = Date.now();
    saveVisions(visions);
    renderBoard();
  };

  window.moveVision = function (id, status) {
    const visions = loadVisions();
    const v = visions.find(x => x.id === id);
    if (!v) return;
    v.status = status;
    v.updatedAt = Date.now();
    saveVisions(visions);
    renderBoard();
  };

  window.deleteVision = function (id) {
    let visions = loadVisions();
    visions = visions.filter(v => v.id !== id);
    saveVisions(visions);
    renderBoard();
  };

  window.addMilestone = function (visionId) {
    const visions = loadVisions();
    const v = visions.find(x => x.id === visionId);
    if (!v) return;

    v.milestones.push({ id: uuid(), text: "New milestone", done: false });
    v.updatedAt = Date.now();
    saveVisions(visions);
    renderBoard();
  };

  window.toggleMilestone = function (visionId, milestoneId) {
    const visions = loadVisions();
    const v = visions.find(x => x.id === visionId);
    if (!v) return;

    const m = v.milestones.find(x => x.id === milestoneId);
    if (!m) return;

    m.done = !m.done;
    v.updatedAt = Date.now();
    saveVisions(visions);
    renderBoard();
  };

  window.editMilestone = function (visionId, milestoneId, text) {
    const visions = loadVisions();
    const v = visions.find(x => x.id === visionId);
    if (!v) return;

    const m = v.milestones.find(x => x.id === milestoneId);
    if (!m) return;

    m.text = text;
    v.updatedAt = Date.now();
    saveVisions(visions);
  };

  window.deleteMilestone = function (visionId, milestoneId) {
    const visions = loadVisions();
    const v = visions.find(x => x.id === visionId);
    if (!v) return;

    v.milestones = v.milestones.filter(m => m.id !== milestoneId);
    v.updatedAt = Date.now();
    saveVisions(visions);
    renderBoard();
  };

  // --------------------
  // Drag reorder
  // --------------------
  function enableDrag() {
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

        const visions = loadVisions();
        const from = visions.findIndex(v => v.id === draggedId);
        const to = visions.findIndex(v => v.id === targetId);
        if (from === -1 || to === -1) return;

        const [moved] = visions.splice(from, 1);
        visions.splice(to, 0, moved);

        saveVisions(visions);
        renderBoard();
      });
    });
  }

  // --------------------
  // Boot
  // --------------------
  function hookNavigation() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(renderBoard, 60);
    });
  }

  function observeActivation() {
    const page = document.getElementById("visionBoardPage");
    if (!page || typeof MutationObserver === "undefined") return;

    const obs = new MutationObserver(() => {
      if (page.classList.contains("active")) renderBoard();
    });

    obs.observe(page, { attributes: true, attributeFilter: ["class"] });
  }

  function boot() {
    hookNavigation();
    observeActivation();
    setTimeout(renderBoard, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
