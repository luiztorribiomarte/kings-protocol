// =====================================================
// CREATOR COMMAND CENTER (SAFE OVERLAY MODULE)
// - Does NOT modify existing Content Hub
// - Injects tactical layer above UI
// =====================================================

(function () {
  "use strict";

  const PANEL_ID = "creatorCommandCenter";

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
    if (item.title.length > 20) score += 10;
    return Math.min(100, score);
  }

  function injectCommandCenter() {
    const container = document.getElementById("contentHubContainer");
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
                ">
                  <span>${i.title}</span>
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

  function hook() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(injectCommandCenter, 80);
    });
  }

  function boot() {
    hook();
    setTimeout(injectCommandCenter, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
