// =====================================================
// CREATOR COMMAND CENTER (SAFE OVERLAY MODULE)
// - Does NOT modify existing Content Hub
// - Injects tactical layer above UI
// - Adds local API Vault (YouTube API key) stored in localStorage
// =====================================================

(function () {
  "use strict";

  const PANEL_ID = "creatorCommandCenter";
  const VAULT_ID = "creatorApiVaultPanel";
  const YT_KEY_STORAGE = "kp_youtube_api_key";

  // -----------------------------------------------------
  // SAFE HELPERS
  // -----------------------------------------------------
  function getContainer() {
    // Supports both legacy + current HTML ids
    return (
      document.getElementById("contentHubContainer") ||
      document.getElementById("contentContainer")
    );
  }

  function getItemsSafe() {
    try {
      return JSON.parse(localStorage.getItem("contentHubItems") || "[]");
    } catch {
      return [];
    }
  }

  function calculateCreatorScore(items) {
    if (!items.length) return 0;
    const posted = items.filter(i => i.stage === "posted").length;
    return Math.round((posted / items.length) * 100);
  }

  function detectBottleneck(items) {
    const stages = ["idea", "research", "script", "editing", "posted"];
    let maxStage = "idea";
    let maxCount = 0;

    stages.forEach(s => {
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
    if (item.title && item.title.length > 20) score += 10;
    return Math.min(100, score);
  }

  // -----------------------------------------------------
  // API VAULT (LOCAL ONLY)
  // -----------------------------------------------------
  function getYouTubeKey() {
    return (localStorage.getItem(YT_KEY_STORAGE) || "").trim();
  }

  function setYouTubeKey(key) {
    localStorage.setItem(YT_KEY_STORAGE, (key || "").trim());
    // Let other modules react if you later wire them
    if (window.App && typeof App.emit === "function") {
      App.emit("youtubeKey:changed");
    }
  }

  function clearYouTubeKey() {
    localStorage.removeItem(YT_KEY_STORAGE);
    if (window.App && typeof App.emit === "function") {
      App.emit("youtubeKey:changed");
    }
  }

  // Uses your existing modal system if present; falls back safely.
  function openVaultModal() {
    const existing = getYouTubeKey();
    const hasModal = typeof window.openModal === "function";

    const html = `
      <div class="section-title">🔐 API Vault</div>
      <div style="color:#9CA3AF; margin-bottom:14px;">
        Paste your YouTube API key here. It will be stored only on this device (localStorage),
        and will NOT be committed to GitHub.
      </div>

      <div class="form-group">
        <label>YouTube API Key</label>
        <input id="kpYouTubeKeyInput" class="form-input" type="password" placeholder="Paste key..." value="" />
        ${
          existing
            ? `<div style="margin-top:8px; color:#9CA3AF; font-size:0.85rem;">
                 A key is already saved. Pasting a new one will replace it.
               </div>`
            : `<div style="margin-top:8px; color:#9CA3AF; font-size:0.85rem;">
                 No key saved yet.
               </div>`
        }
      </div>

      <div class="form-actions">
        <button class="form-submit" onclick="window.__kpSaveYouTubeKey()">Save</button>
        <button class="form-cancel" onclick="window.closeModal ? closeModal() : (document.getElementById('modal') && (document.getElementById('modal').style.display='none'))">Cancel</button>
      </div>

      <div style="margin-top:12px; color:#9CA3AF; font-size:0.85rem;">
        Note: In a frontend-only app, keys can be viewed by someone with access to this browser/devtools.
        This vault keeps it out of your codebase and off GitHub.
      </div>
    `;

    // Expose a safe global handler (so inline onclick can call it)
    window.__kpSaveYouTubeKey = function () {
      const inp = document.getElementById("kpYouTubeKeyInput");
      const key = (inp?.value || "").trim();
      if (!key) return;

      setYouTubeKey(key);

      if (typeof window.closeModal === "function") window.closeModal();
      injectApiVault(); // refresh vault UI
    };

    if (hasModal) {
      window.openModal(html);
      setTimeout(() => {
        const inp = document.getElementById("kpYouTubeKeyInput");
        if (inp) inp.focus();
      }, 50);
    } else {
      // fallback: basic prompt
      const k = prompt("Paste your YouTube API key (stored locally):", "");
      if (k && k.trim()) {
        setYouTubeKey(k.trim());
        injectApiVault();
      }
    }
  }

  // -----------------------------------------------------
  // INJECT API VAULT PANEL
  // -----------------------------------------------------
  function injectApiVault() {
    const container = getContainer();
    if (!container) return;

    // Avoid duplicate
    const existingPanel = document.getElementById(VAULT_ID);
    if (existingPanel) existingPanel.remove();

    const hasKey = !!getYouTubeKey();

    const panel = document.createElement("div");
    panel.id = VAULT_ID;

    panel.innerHTML = `
      <div style="
        margin-bottom:16px;
        padding:16px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.18);
        background:linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03));
        backdrop-filter: blur(6px);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <div>
            <div style="font-weight:950; font-size:1.05rem; margin-bottom:6px;">
              🔐 API Vault
            </div>
            <div style="color:#9CA3AF; font-size:0.9rem;">
              YouTube key stored locally on this device.
            </div>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="form-submit" type="button" id="kpVaultBtn">
              ${hasKey ? "Update Key" : "Add Key"}
            </button>
            <button class="form-cancel" type="button" id="kpVaultRemoveBtn" ${hasKey ? "" : "disabled"} style="${hasKey ? "" : "opacity:.5; cursor:not-allowed;"}">
              Remove
            </button>
          </div>
        </div>

        <div style="margin-top:12px; color:#d1d5db;">
          Status:
          <span style="font-weight:900; color:${hasKey ? "#22c55e" : "#f87171"};">
            ${hasKey ? "Key saved" : "No key yet"}
          </span>
          ${hasKey ? `<span style="color:#9CA3AF;">(hidden)</span>` : ""}
        </div>
      </div>
    `;

    // Prepend vault panel at the top of content page
    container.prepend(panel);

    // Wire buttons
    const btn = panel.querySelector("#kpVaultBtn");
    const rm = panel.querySelector("#kpVaultRemoveBtn");

    if (btn) btn.addEventListener("click", openVaultModal);
    if (rm) rm.addEventListener("click", () => {
      if (!hasKey) return;
      clearYouTubeKey();
      injectApiVault();
    });
  }

  // -----------------------------------------------------
  // INJECT COMMAND CENTER
  // -----------------------------------------------------
  function injectCommandCenter() {
    const container = getContainer();
    if (!container) return;

    if (document.getElementById(PANEL_ID)) return;

    const items = getItemsSafe();
    const creatorScore = calculateCreatorScore(items);
    const bottleneck = detectBottleneck(items);

    const ranked = items
      .map(i => ({ ...i, score: scoreIdea(i) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    panel.innerHTML = `
      <div style="
        margin-bottom:16px;
        padding:16px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.18);
        background:linear-gradient(180deg,rgba(99,102,241,0.08),rgba(236,72,153,0.05));
        backdrop-filter: blur(6px);
      ">
        <div style="font-weight:950; font-size:1.1rem; margin-bottom:10px;">
          ⚔️ Creator Tactical Command Center
        </div>

        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px;">
          <div>
            <div style="color:#9CA3AF;">Ideas</div>
            <div style="font-size:1.3rem; font-weight:900;">${items.length}</div>
          </div>
          <div>
            <div style="color:#9CA3AF;">Posted</div>
            <div style="font-size:1.3rem; font-weight:900;">
              ${items.filter(i => i.stage === "posted").length}
            </div>
          </div>
          <div>
            <div style="color:#9CA3AF;">Creator Score</div>
            <div style="font-size:1.3rem; font-weight:900; color:#a78bfa;">
              ${creatorScore}%
            </div>
          </div>
          <div>
            <div style="color:#9CA3AF;">Bottleneck</div>
            <div style="font-size:1.1rem; font-weight:900; color:#facc15;">
              ${bottleneck}
            </div>
          </div>
        </div>

        <div style="margin-top:12px;">
          <div style="font-weight:900; margin-bottom:6px;">🔥 High-Impact Ideas</div>
          ${
            ranked.length
              ? ranked.map(i => `
                <div style="
                  padding:8px 10px;
                  border-radius:10px;
                  border:1px solid rgba(255,255,255,0.14);
                  background:rgba(0,0,0,0.25);
                  margin-bottom:6px;
                  display:flex;
                  justify-content:space-between;
                  gap:10px;
                ">
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;">${i.title || "Untitled"}</span>
                  <span style="color:#22c55e; font-weight:900;">${i.score}</span>
                </div>
              `).join("")
              : `<div style="color:#9CA3AF;">No ideas yet.</div>`
          }
        </div>
      </div>
    `;

    container.prepend(panel);
  }

  // -----------------------------------------------------
  // HOOK + BOOT
  // -----------------------------------------------------
  function injectAll() {
    // Always inject vault first so it’s top-most
    injectApiVault();
    injectCommandCenter();
  }

  function hook() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(injectAll, 80);
    });
  }

  function boot() {
    hook();
    setTimeout(injectAll, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
