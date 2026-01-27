// =====================================================
// CONTENT HUB CORE + CREATOR COMMAND CENTER + API VAULT
// SAFE UPGRADE MODULE
// - Adds real Content Hub (ideas + pipeline)
// - Keeps overlay intelligence
// - Adds API Vault (YouTube API key)
// - Does NOT break other features
// =====================================================

(function () {
  "use strict";

  // ===============================
  // CONFIG + STORAGE
  // ===============================
  const STORAGE_KEY = "contentHubItems";
  const YT_KEY_STORAGE = "kp_youtube_api_key";
  const PANEL_ID = "creatorCommandCenter";
  const VAULT_ID = "creatorApiVaultPanel";

  const STAGES = ["idea", "research", "script", "editing", "posted"];

  function getContainer() {
    return document.getElementById("contentContainer");
  }

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

  // ===============================
  // API VAULT (LOCAL)
  // ===============================
  function getYouTubeKey() {
    return (localStorage.getItem(YT_KEY_STORAGE) || "").trim();
  }

  function setYouTubeKey(key) {
    localStorage.setItem(YT_KEY_STORAGE, (key || "").trim());
  }

  function clearYouTubeKey() {
    localStorage.removeItem(YT_KEY_STORAGE);
  }

  function openVaultModal() {
    const existing = getYouTubeKey();

    const html = `
      <div class="section-title">🔐 API Vault</div>
      <div style="color:#9CA3AF; margin-bottom:14px;">
        Paste your YouTube API key. It will be stored only on this device.
      </div>

      <div class="form-group">
        <label>YouTube API Key</label>
        <input id="kpYouTubeKeyInput" class="form-input" type="password" placeholder="Paste key..." />
        <div style="margin-top:8px; color:#9CA3AF; font-size:0.85rem;">
          ${existing ? "A key is already saved. Pasting a new one will replace it." : "No key saved yet."}
        </div>
      </div>

      <div class="form-actions">
        <button class="form-submit" onclick="window.__kpSaveYouTubeKey()">Save</button>
        <button class="form-cancel" onclick="closeModal()">Cancel</button>
      </div>
    `;

    window.__kpSaveYouTubeKey = function () {
      const inp = document.getElementById("kpYouTubeKeyInput");
      const key = (inp?.value || "").trim();
      if (!key) return;
      setYouTubeKey(key);
      closeModal();
      renderContentHub();
    };

    openModal(html);
    setTimeout(() => {
      const inp = document.getElementById("kpYouTubeKeyInput");
      if (inp) inp.focus();
    }, 50);
  }

  function renderApiVault(container) {
    const existing = document.getElementById(VAULT_ID);
    if (existing) existing.remove();

    const hasKey = !!getYouTubeKey();

    const panel = document.createElement("div");
    panel.id = VAULT_ID;

    panel.innerHTML = `
      <div class="habit-section">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <div>
            <div class="section-title">🔐 API Vault</div>
            <div style="color:#9CA3AF; font-size:0.9rem;">
              YouTube API key stored locally on this device.
            </div>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="form-submit" id="kpVaultBtn">${hasKey ? "Update Key" : "Add Key"}</button>
            <button class="form-cancel" id="kpVaultRemoveBtn" ${hasKey ? "" : "disabled"} style="${hasKey ? "" : "opacity:.5;"}">
              Remove
            </button>
          </div>
        </div>
        <div style="margin-top:12px; color:#d1d5db;">
          Status:
          <span style="font-weight:900; color:${hasKey ? "#22c55e" : "#f87171"};">
            ${hasKey ? "Key saved" : "No key yet"}
          </span>
        </div>
      </div>
    `;

    container.appendChild(panel);

    panel.querySelector("#kpVaultBtn").onclick = openVaultModal;
    panel.querySelector("#kpVaultRemoveBtn").onclick = () => {
      clearYouTubeKey();
      renderContentHub();
    };
  }

  // ===============================
  // CONTENT HUB CORE
  // ===============================
  function addItem(title, notes) {
    const items = loadItems();
    items.unshift({
      id: Date.now(),
      title: title || "Untitled",
      notes: notes || "",
      stage: "idea",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    saveItems(items);
    renderContentHub();
  }

  function updateItem(id, data) {
    const items = loadItems();
    const item = items.find(i => i.id === id);
    if (!item) return;
    Object.assign(item, data);
    item.updatedAt = Date.now();
    saveItems(items);
    renderContentHub();
  }

  function deleteItem(id) {
    const items = loadItems().filter(i => i.id !== id);
    saveItems(items);
    renderContentHub();
  }

  function openAddModal() {
    openModal(`
      <div class="section-title">➕ Add Content Idea</div>

      <div class="form-group">
        <label>Title</label>
        <input id="newIdeaTitle" class="form-input" placeholder="Idea title..." />
      </div>

      <div class="form-group">
        <label>Notes</label>
        <textarea id="newIdeaNotes" class="form-input" rows="4" placeholder="Details..."></textarea>
      </div>

      <div class="form-actions">
        <button class="form-submit" onclick="window.__kpAddIdea()">Add</button>
        <button class="form-cancel" onclick="closeModal()">Cancel</button>
      </div>
    `);

    window.__kpAddIdea = function () {
      const title = document.getElementById("newIdeaTitle").value.trim();
      const notes = document.getElementById("newIdeaNotes").value.trim();
      if (!title) return;
      addItem(title, notes);
      closeModal();
    };
  }

  function openEditModal(item) {
    openModal(`
      <div class="section-title">✏️ Edit Idea</div>

      <div class="form-group">
        <label>Title</label>
        <input id="editIdeaTitle" class="form-input" value="${item.title}" />
      </div>

      <div class="form-group">
        <label>Notes</label>
        <textarea id="editIdeaNotes" class="form-input" rows="4">${item.notes || ""}</textarea>
      </div>

      <div class="form-group">
        <label>Stage</label>
        <select id="editIdeaStage" class="form-input">
          ${STAGES.map(s => `<option value="${s}" ${s === item.stage ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>

      <div class="form-actions">
        <button class="form-submit" onclick="window.__kpSaveEdit(${item.id})">Save</button>
        <button class="form-cancel" onclick="closeModal()">Cancel</button>
      </div>
    `);

    window.__kpSaveEdit = function (id) {
      const title = document.getElementById("editIdeaTitle").value.trim();
      const notes = document.getElementById("editIdeaNotes").value.trim();
      const stage = document.getElementById("editIdeaStage").value;
      updateItem(id, { title, notes, stage });
      closeModal();
    };
  }

  function renderPipeline(container, items) {
    const wrapper = document.createElement("div");
    wrapper.className = "habit-section";

    wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div class="section-title">🎬 Content Pipeline</div>
        <button class="form-submit" onclick="window.__kpOpenAddIdea()">Add Idea</button>
      </div>
      <div style="display:grid; grid-template-columns:repeat(${STAGES.length},1fr); gap:12px;">
        ${STAGES.map(stage => `
          <div style="border:1px solid rgba(255,255,255,0.15); border-radius:14px; padding:10px;">
            <div style="font-weight:900; margin-bottom:8px; text-transform:capitalize;">${stage}</div>
            <div>
              ${items.filter(i => i.stage === stage).map(i => `
                <div class="idea-item" style="cursor:pointer;" onclick="window.__kpEditIdea(${i.id})">
                  <div style="font-weight:800;">${i.title}</div>
                  <div style="color:#9CA3AF; font-size:0.85rem;">${i.notes?.slice(0,60) || ""}</div>
                </div>
              `).join("") || `<div style="color:#9CA3AF;">Empty</div>`}
            </div>
          </div>
        `).join("")}
      </div>
    `;

    container.appendChild(wrapper);

    window.__kpOpenAddIdea = openAddModal;
    window.__kpEditIdea = function (id) {
      const item = loadItems().find(i => i.id === id);
      if (item) openEditModal(item);
    };
  }

  // ===============================
  // CREATOR COMMAND CENTER (OVERLAY)
  // ===============================
  function calculateCreatorScore(items) {
    if (!items.length) return 0;
    const posted = items.filter(i => i.stage === "posted").length;
    return Math.round((posted / items.length) * 100);
  }

  function detectBottleneck(items) {
    let maxStage = "idea";
    let maxCount = 0;
    STAGES.forEach(s => {
      const count = items.filter(i => i.stage === s).length;
      if (count > maxCount) {
        maxCount = count;
        maxStage = s;
      }
    });
    return maxStage.toUpperCase();
  }

  function scoreIdea(item) {
    let score = 0;
    if (item.stage === "posted") score += 30;
    if (item.stage === "editing") score += 20;
    if (item.stage === "script") score += 15;
    if (item.notes && item.notes.length > 100) score += 15;
    if (item.title.length > 20) score += 10;
    return Math.min(100, score);
  }

  function renderCommandCenter(container, items) {
    const creatorScore = calculateCreatorScore(items);
    const bottleneck = detectBottleneck(items);

    const ranked = items
      .map(i => ({ ...i, score: scoreIdea(i) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "habit-section";

    panel.innerHTML = `
      <div class="section-title">⚔️ Creator Tactical Command Center</div>

      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:12px;">
        <div><div style="color:#9CA3AF;">Ideas</div><div style="font-size:1.3rem; font-weight:900;">${items.length}</div></div>
        <div><div style="color:#9CA3AF;">Posted</div><div style="font-size:1.3rem; font-weight:900;">${items.filter(i => i.stage === "posted").length}</div></div>
        <div><div style="color:#9CA3AF;">Creator Score</div><div style="font-size:1.3rem; font-weight:900; color:#a78bfa;">${creatorScore}%</div></div>
        <div><div style="color:#9CA3AF;">Bottleneck</div><div style="font-size:1.1rem; font-weight:900; color:#facc15;">${bottleneck}</div></div>
      </div>

      <div>
        <div style="font-weight:900; margin-bottom:6px;">🔥 High-Impact Ideas</div>
        ${
          ranked.length
            ? ranked.map(i => `
              <div class="idea-item" style="display:flex; justify-content:space-between;">
                <span>${i.title}</span>
                <span style="color:#22c55e; font-weight:900;">${i.score}</span>
              </div>
            `).join("")
            : `<div style="color:#9CA3AF;">No ideas yet.</div>`
        }
      </div>
    `;

    container.appendChild(panel);
  }

  // ===============================
  // MAIN RENDER
  // ===============================
  function renderContentHub() {
    const container = getContainer();
    if (!container) return;

    container.innerHTML = "";

    const items = loadItems();

    renderApiVault(container);
    renderCommandCenter(container, items);
    renderPipeline(container, items);
  }

  // ===============================
  // HOOK INTO NAVIGATION
  // ===============================
  function hookNavigation() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(renderContentHub, 80);
    });
  }

  function boot() {
    hookNavigation();
    setTimeout(renderContentHub, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
