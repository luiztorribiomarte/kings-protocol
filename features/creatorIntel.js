// =====================================================
// CREATOR INTELLIGENCE ENGINE (COMMAND CENTER LAYER)
// SAFE OVERLAY — DOES NOT MODIFY CONTENT HUB
// =====================================================

(function () {
  "use strict";

  const PANEL_ID = "creatorIntelPanel";
  const STORAGE_KEY = "contentHubItems";

  const STAGES = ["idea", "research", "script", "editing", "posted"];

  // ---------- Safe Data Access ----------
  function getItemsSafe() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function countByStage(items) {
    const map = {};
    STAGES.forEach(s => (map[s] = 0));
    items.forEach(i => {
      if (map[i.stage] !== undefined) map[i.stage]++;
    });
    return map;
  }

  // ---------- Core Metrics ----------
  function creatorScore(items) {
    if (!items.length) return 0;
    const posted = items.filter(i => i.stage === "posted").length;
    return Math.round((posted / items.length) * 100);
  }

  function velocityScore(items) {
    if (!items.length) return 0;

    const now = Date.now();
    const last7 = items.filter(i => i.updatedAt && now - i.updatedAt < 7 * 86400000);
    return Math.min(100, Math.round((last7.length / Math.max(items.length, 1)) * 100));
  }

  function pipelineBalance(stageCounts) {
    const values = Object.values(stageCounts);
    const avg = values.reduce((a, b) => a + b, 0) / values.length || 0;
    const variance = values.reduce((a, b) => a + Math.abs(b - avg), 0) / values.length;
    return Math.max(0, Math.round(100 - variance * 10));
  }

  function detectBottleneck(stageCounts) {
    let maxStage = "idea";
    let max = 0;
    for (const s in stageCounts) {
      if (stageCounts[s] > max) {
        max = stageCounts[s];
        maxStage = s;
      }
    }
    return maxStage;
  }

  function readinessScore(items, stageCounts) {
    const c = creatorScore(items);
    const v = velocityScore(items);
    const b = pipelineBalance(stageCounts);
    return Math.round((c + v + b) / 3);
  }

  // ---------- Idea Scoring ----------
  function scoreIdea(item) {
    let score = 0;
    if (item.stage === "posted") score += 40;
    else if (item.stage === "editing") score += 30;
    else if (item.stage === "script") score += 20;
    else if (item.stage === "research") score += 10;

    if (item.title && item.title.length > 20) score += 10;
    if (item.notes && item.notes.length > 100) score += 10;

    return Math.min(100, score);
  }

  // ---------- Tactical Alerts ----------
  function generateAlerts(items, stageCounts) {
    const alerts = [];

    if (!items.length) {
      alerts.push("No content ideas yet.");
      return alerts;
    }

    if (stageCounts.posted === 0) alerts.push("No posted content yet.");
    if (stageCounts.idea > stageCounts.posted * 3) alerts.push("Too many ideas, low execution.");
    if (velocityScore(items) < 20) alerts.push("Low momentum this week.");

    const bottleneck = detectBottleneck(stageCounts);
    if (bottleneck !== "posted") {
      alerts.push(`Pipeline bottleneck at: ${bottleneck.toUpperCase()}`);
    }

    return alerts;
  }

  // ---------- UI Rendering ----------
  function injectPanel() {
    const container = document.getElementById("contentHubContainer");
    if (!container) return;

    if (document.getElementById(PANEL_ID)) return;

    const items = getItemsSafe();
    const stageCounts = countByStage(items);

    const score = creatorScore(items);
    const velocity = velocityScore(items);
    const balance = pipelineBalance(stageCounts);
    const readiness = readinessScore(items, stageCounts);
    const bottleneck = detectBottleneck(stageCounts);
    const alerts = generateAlerts(items, stageCounts);

    const ranked = items
      .map(i => ({ ...i, score: scoreIdea(i) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    panel.innerHTML = `
      <div style="
        margin-bottom:18px;
        padding:18px;
        border-radius:18px;
        border:1px solid rgba(255,255,255,0.2);
        background:linear-gradient(180deg,rgba(99,102,241,0.12),rgba(236,72,153,0.06));
        backdrop-filter: blur(6px);
      ">
        <div style="font-weight:950; font-size:1.15rem; margin-bottom:12px;">
          ⚔️ Creator Tactical Command Center
        </div>

        <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:12px;">
          <div>
            <div style="color:#9CA3AF;">Ideas</div>
            <div style="font-size:1.35rem; font-weight:900;">${items.length}</div>
          </div>
          <div>
            <div style="color:#9CA3AF;">Posted</div>
            <div style="font-size:1.35rem; font-weight:900;">${stageCounts.posted}</div>
          </div>
          <div>
            <div style="color:#9CA3AF;">Creator Score</div>
            <div style="font-size:1.35rem; font-weight:900; color:#a78bfa;">${score}%</div>
          </div>
          <div>
            <div style="color:#9CA3AF;">Velocity</div>
            <div style="font-size:1.35rem; font-weight:900; color:#22c55e;">${velocity}%</div>
          </div>
          <div>
            <div style="color:#9CA3AF;">Readiness</div>
            <div style="font-size:1.35rem; font-weight:900; color:#facc15;">${readiness}%</div>
          </div>
        </div>

        <div style="margin-top:12px; font-weight:900;">
          Pipeline Bottleneck: 
          <span style="color:#fb7185;">${bottleneck.toUpperCase()}</span>
        </div>

        <div style="margin-top:12px;">
          <div style="font-weight:900; margin-bottom:6px;">⚠ Tactical Alerts</div>
          ${
            alerts.length
              ? alerts.map(a => `
                <div style="
                  padding:6px 10px;
                  border-radius:10px;
                  border:1px solid rgba(255,255,255,0.14);
                  background:rgba(0,0,0,0.25);
                  margin-bottom:6px;
                  font-size:0.9rem;
                ">${a}</div>
              `).join("")
              : `<div style="color:#22c55e;">No critical issues detected.</div>`
          }
        </div>

        <div style="margin-top:14px;">
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
                  font-size:0.95rem;
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

  // ---------- Hooks ----------
  function hook() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(injectPanel, 80);
    });
  }

  function boot() {
    hook();
    setTimeout(injectPanel, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
