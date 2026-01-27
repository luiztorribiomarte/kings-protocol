// =====================================================
// CONTENT UPGRADES OVERLAY (MOUNT SAFE)
// - CRITICAL FIX: renders into its OWN mount div
//   so ContentHub re-renders never wipe it
// =====================================================

(function () {
  "use strict";

  const ITEMS_KEY = "contentHubItems";

  const UPGRADES_MOUNT_ID = "contentUpgradesMount";
  const PIPELINE_CHART_ID = "contentPipelineChart";
  let pipelineChart = null;

  function getContentContainer() {
    return document.getElementById("contentContainer");
  }

  function ensureUpgradesMount() {
    const container = getContentContainer();
    if (!container) return null;

    let mount = document.getElementById(UPGRADES_MOUNT_ID);
    if (mount) return mount;

    mount = document.createElement("div");
    mount.id = UPGRADES_MOUNT_ID;

    // Put upgrades AFTER hub
    container.appendChild(mount);

    return mount;
  }

  function getItemsSafe() {
    try {
      const raw = JSON.parse(localStorage.getItem(ITEMS_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function normStage(stage) {
    return String(stage || "idea").trim().toLowerCase();
  }

  function isPosted(item) {
    return normStage(item.stage) === "posted";
  }

  function computeMetrics() {
    const items = getItemsSafe();
    const total = items.length;
    const posted = items.filter(isPosted).length;
    const idea = total - posted;
    const ideaToPost = total ? Math.round((posted / total) * 100) : 0;

    // execution rate is same as idea→post in this simplified system
    const executionRate = ideaToPost;

    return { total, idea, posted, ideaToPost, executionRate };
  }

  function buildDailySeries(rangeDays) {
    const items = getItemsSafe();
    const end = startOfDay(Date.now());
    let start;

    if (rangeDays === "all") {
      start = items.reduce(
        (m, it) => Math.min(m, startOfDay(it.createdAt || it.updatedAt || end)),
        end
      );
    } else {
      const d = Number(rangeDays);
      start = startOfDay(end - (d - 1) * 86400000);
    }

    const days = [];
    for (let t = start; t <= end; t += 86400000) days.push(t);

    const ideas = new Array(days.length).fill(0);
    const posted = new Array(days.length).fill(0);

    const idxOf = t => Math.floor((startOfDay(t) - start) / 86400000);

    items.forEach(it => {
      const created = it.createdAt || it.updatedAt || Date.now();
      const updated = it.updatedAt || created;

      const i1 = idxOf(created);
      if (i1 >= 0 && i1 < ideas.length) ideas[i1]++;

      if (isPosted(it)) {
        const i2 = idxOf(updated);
        if (i2 >= 0 && i2 < posted.length) posted[i2]++;
      }
    });

    return { labels: days.map(dayLabel), ideas, posted };
  }

  function renderPipelineChart(canvas, range) {
    const s = buildDailySeries(range);
    if (pipelineChart) pipelineChart.destroy();

    pipelineChart = new Chart(canvas, {
      type: "line",
      data: {
        labels: s.labels,
        datasets: [
          { label: "Ideas", data: s.ideas, tension: 0.35 },
          { label: "Posted", data: s.posted, tension: 0.35 }
        ]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  function startOfDay(ms) {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function dayLabel(ms) {
    const d = new Date(ms);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function renderUpgrades() {
    const page = document.getElementById("contentPage");
    if (!page || !page.classList.contains("active")) return;

    const mount = ensureUpgradesMount();
    if (!mount) return;

    const m = computeMetrics();

    mount.innerHTML = `
      <div class="habit-section">
        <div class="section-title">🧠 Creator Performance Dashboard</div>

        <div class="content-stats">
          <div class="content-stat-card">
            <div>Execution Rate</div>
            <div style="font-size:1.6rem;font-weight:900">${m.executionRate}%</div>
          </div>
          <div class="content-stat-card">
            <div>Idea → Post</div>
            <div style="font-size:1.6rem;font-weight:900">${m.ideaToPost}%</div>
          </div>
          <div class="content-stat-card">
            <div>Total Ideas</div>
            <div style="font-size:1.6rem;font-weight:900">${m.total}</div>
          </div>
          <div class="content-stat-card">
            <div>Posted</div>
            <div style="font-size:1.6rem;font-weight:900">${m.posted}</div>
          </div>
        </div>
      </div>

      <div class="habit-section">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="section-title">📊 Content Pipeline</div>
          <select id="kpRange" class="form-input" style="width:auto">
            <option value="7">7 Days</option>
            <option value="30">30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>

        <canvas id="${PIPELINE_CHART_ID}" height="140"></canvas>
      </div>
    `;

    const canvas = mount.querySelector(`#${PIPELINE_CHART_ID}`);
    const sel = mount.querySelector("#kpRange");
    renderPipelineChart(canvas, sel.value);
    sel.onchange = () => renderPipelineChart(canvas, sel.value);
  }

  function hook() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(renderUpgrades, 120);
    });
  }

  function boot() {
    hook();
    setTimeout(renderUpgrades, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
