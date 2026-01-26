// ============================================
// GOALS MODULE — DRAGGABLE CATEGORY BOARD (UPGRADED A–E)
// A) Goal ↔ Habit Linking
// B) Goal Momentum Score
// C) Goal Timeline / History (Chart)
// D) Goal Priority System
// E) Goal Advisor (rule-based intelligence, safe)
// ============================================

let goals = [];
let categories = [];
let activeCategory = null;
let dragCategoryId = null;

// chart instance for goal history modal
let goalHistoryChartInstance = null;

// ---------- Helpers (GOALS-SAFE, avoids overriding other modules) ----------
function goalsEscapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function goalsTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function goalsSafeNum(n) {
  return typeof n === "number" && !isNaN(n) ? n : 0;
}

function goalsClamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

function goalsGetHabitsListSafe() {
  // habits.js uses window.habits
  try {
    const list = window.habits;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function goalsGetHabitNameById(id) {
  const hl = goalsGetHabitsListSafe();
  const h = hl.find(x => x.id === id);
  return h ? (h.icon ? `${h.icon} ${h.name}` : h.name) : id;
}

function goalsGetDayHabitPercent(dateKey = goalsTodayKey()) {
  // uses habits.js bridge getDayCompletion() if available
  try {
    if (typeof getDayCompletion === "function") {
      const d = getDayCompletion(dateKey);
      return goalsSafeNum(d?.percent ?? 0);
    }
  } catch {}
  return 0;
}

function goalsGetLastNDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().split("T")[0]);
  }
  return out;
}

function goalsGetCatById(id) {
  return categories.find(c => c.id === id);
}

// ---------- Schema Upgrade (backward compatible) ----------
function goalsUpgradeSchema() {
  goals.forEach(g => {
    if (!g.category) g.category = "money";

    // D) Priority
    if (!g.priority) g.priority = "important"; // critical | important | optional

    // status
    if (!g.status) g.status = "active"; // active | completed | hold | failed

    // progress
    if (typeof g.progress !== "number") g.progress = 0;
    g.progress = goalsClamp(g.progress, 0, 100);

    // A) habit linking
    if (!g.habitLinks || typeof g.habitLinks !== "object") {
      g.habitLinks = { habits: [] }; // array of habit IDs
    }
    if (!Array.isArray(g.habitLinks.habits)) g.habitLinks.habits = [];

    // C) progress history
    if (!Array.isArray(g.progressHistory)) {
      // seed history from current progress (only one point)
      g.progressHistory = [{ date: goalsTodayKey(), value: g.progress }];
    } else if (g.progressHistory.length === 0) {
      g.progressHistory.push({ date: goalsTodayKey(), value: g.progress });
    }

    // B) momentum cache (optional)
    if (typeof g.momentum !== "number") g.momentum = 0;
  });
}

// ---------- Init ----------
function initGoalsData() {
  try {
    goals = JSON.parse(localStorage.getItem("goals")) || [];
  } catch {
    goals = [];
  }

  try {
    categories = JSON.parse(localStorage.getItem("goalCategories")) || [];
  } catch {
    categories = [];
  }

  if (!categories.length) {
    categories = [
      { id: "money", name: "Money", image: "", order: 0 },
      { id: "social", name: "Social Media", image: "", order: 1 },
      { id: "learning", name: "Learning", image: "", order: 2 },
      { id: "health", name: "Health", image: "", order: 3 },
      { id: "finance", name: "Finance", image: "", order: 4 }
    ];
    saveCategories();
  }

  goalsUpgradeSchema();
  saveGoals(); // persist upgraded schema safely
}

// ---------- Save ----------
function saveGoals() {
  localStorage.setItem("goals", JSON.stringify(goals));
}

function saveCategories() {
  localStorage.setItem("goalCategories", JSON.stringify(categories));
}

// ---------- Render Entry ----------
function renderGoals() {
  const container = document.getElementById("goalsGrid");
  if (!container) return;

  if (!activeCategory) {
    renderCategoryGrid(container);
  } else {
    renderGoalsInCategory(container, activeCategory);
  }
}

// ---------- Category Intelligence ----------
function getCategoryStats(categoryId) {
  const catGoals = goals.filter(g => g.category === categoryId);

  const total = catGoals.length;
  const active = catGoals.filter(g => g.status === "active").length;
  const completed = catGoals.filter(g => g.status === "completed").length;

  const avgProgress = total
    ? Math.round(catGoals.reduce((a, g) => a + (g.progress || 0), 0) / total)
    : 0;

  // momentum: avg of goal momentum (0–100)
  const avgMomentum = total
    ? Math.round(catGoals.reduce((a, g) => a + (goalsSafeNum(getGoalMomentum(g.id))), 0) / total)
    : 0;

  return { total, active, completed, avgProgress, avgMomentum };
}

// ---------- Category Grid ----------
function renderCategoryGrid(container) {
  const ordered = [...categories].sort((a, b) => a.order - b.order);

  container.innerHTML = `
    <div class="goals-grid">
      ${ordered.map(cat => {
        const stats = getCategoryStats(cat.id);

        return `
          <div class="category-tile"
               draggable="true"
               ondragstart="onDragStart('${cat.id}')"
               ondragover="onDragOver(event)"
               ondrop="onDrop('${cat.id}')"
               onclick="openCategory('${cat.id}')">

            ${cat.image ? `<img src="${cat.image}" class="category-bg">` : ``}

            <button class="category-menu-btn"
              onclick="event.stopPropagation(); openCategoryMenu('${cat.id}')">
              ⋯
            </button>

            <div class="category-content">
              <div class="category-title">${cat.name}</div>
              <div class="category-meta">${stats.total} goals • ${stats.completed} done</div>

              <div class="category-progress">
                <div class="category-progress-bar" style="width:${stats.avgProgress}%"></div>
              </div>

              <div style="margin-top:6px; font-size:0.8rem; color:#9CA3AF;">
                ${stats.avgProgress}% progress • Momentum ${stats.avgMomentum}
              </div>
            </div>
          </div>
        `;
      }).join("")}

      <div class="category-tile add-category-tile" onclick="openAddCategory()">
        <div class="add-plus">＋</div>
        <div>Add Category</div>
      </div>
    </div>
  `;
}

// ---------- Drag & Drop ----------
function onDragStart(id) {
  dragCategoryId = id;
}

function onDragOver(e) {
  e.preventDefault();
}

function onDrop(targetId) {
  if (dragCategoryId === targetId) return;

  const a = categories.find(c => c.id === dragCategoryId);
  const b = categories.find(c => c.id === targetId);
  if (!a || !b) return;

  const temp = a.order;
  a.order = b.order;
  b.order = temp;

  saveCategories();
  renderGoals();
}

// ---------- Category Menu ----------
function openCategoryMenu(categoryId) {
  const cat = categories.find(c => c.id === categoryId);

  openModal(`
    <h2>Category Image</h2>

    <div class="form-group">
      <label>Image URL</label>
      <input
        id="categoryImageUrl"
        class="form-input"
        placeholder="https://example.com/image.jpg"
        value="${cat?.image || ""}"
      />
    </div>

    <div class="form-actions">
      <button class="form-submit" onclick="saveCategoryImageUrl('${categoryId}')">
        Save
      </button>
      <button class="form-cancel" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

function saveCategoryImageUrl(categoryId) {
  const input = document.getElementById("categoryImageUrl");
  if (!input) return;

  const url = input.value.trim();
  const cat = categories.find(c => c.id === categoryId);
  if (cat) {
    cat.image = url;
    saveCategories();
    closeModal();
    renderGoals();
  }
}

// ---------- Category View ----------
function openCategory(categoryId) {
  activeCategory = categoryId;
  renderGoals();
}

function goBackToCategories() {
  activeCategory = null;
  renderGoals();
}

// ---------- Filters + Sorting ----------
function goalsGetFilterState() {
  const status = document.getElementById("goalFilterStatus")?.value || "all";
  const priority = document.getElementById("goalFilterPriority")?.value || "all";
  const sort = document.getElementById("goalSort")?.value || "createdDesc";
  return { status, priority, sort };
}

function goalsApplyFilters(list) {
  const { status, priority, sort } = goalsGetFilterState();

  let filtered = [...list];

  if (status !== "all") filtered = filtered.filter(g => g.status === status);
  if (priority !== "all") filtered = filtered.filter(g => g.priority === priority);

  // sorting
  if (sort === "createdDesc") {
    filtered.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  } else if (sort === "createdAsc") {
    filtered.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  } else if (sort === "progressDesc") {
    filtered.sort((a, b) => (b.progress || 0) - (a.progress || 0));
  } else if (sort === "momentumDesc") {
    filtered.sort((a, b) => (getGoalMomentum(b.id) || 0) - (getGoalMomentum(a.id) || 0));
  } else if (sort === "priority") {
    const rank = { critical: 3, important: 2, optional: 1 };
    filtered.sort((a, b) => (rank[b.priority] || 0) - (rank[a.priority] || 0));
  }

  return filtered;
}

// ---------- Goal Momentum (B) ----------
function getGoalMomentum(goalId) {
  const g = goals.find(x => x.id === goalId);
  if (!g) return 0;

  const hist = Array.isArray(g.progressHistory) ? g.progressHistory : [];
  if (hist.length < 2) return 0;

  // use last 7 entries (or fewer)
  const last = hist.slice(-7);

  // momentum = avg daily change (scaled to 0–100-ish)
  let deltas = [];
  for (let i = 1; i < last.length; i++) {
    const prev = goalsSafeNum(last[i - 1].value);
    const curr = goalsSafeNum(last[i].value);
    deltas.push(curr - prev);
  }

  const avgDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;

  // normalize: +5% per entry ≈ strong momentum
  // clamp 0–100
  const score = goalsClamp(Math.round((avgDelta / 5) * 50 + 50), 0, 100);

  return score;
}

function momentumLabel(score) {
  if (score >= 70) return { label: "Accelerating", color: "#22C55E" };
  if (score >= 50) return { label: "Stable", color: "#A78BFA" };
  if (score >= 35) return { label: "Slowing", color: "#F59E0B" };
  return { label: "Stalling", color: "#EF4444" };
}

function statusBadge(status) {
  const map = {
    active: { text: "Active", bg: "rgba(99,102,241,0.18)", bd: "rgba(99,102,241,0.35)", fg: "#c7d2fe" },
    completed: { text: "Completed", bg: "rgba(34,197,94,0.16)", bd: "rgba(34,197,94,0.35)", fg: "#bbf7d0" },
    hold: { text: "On Hold", bg: "rgba(245,158,11,0.14)", bd: "rgba(245,158,11,0.35)", fg: "#fde68a" },
    failed: { text: "Failed", bg: "rgba(239,68,68,0.14)", bd: "rgba(239,68,68,0.35)", fg: "#fecaca" }
  };
  return map[status] || map.active;
}

function priorityBadge(priority) {
  const map = {
    critical: { text: "Critical", bg: "rgba(239,68,68,0.14)", bd: "rgba(239,68,68,0.35)", fg: "#fecaca" },
    important: { text: "Important", bg: "rgba(99,102,241,0.16)", bd: "rgba(99,102,241,0.35)", fg: "#c7d2fe" },
    optional: { text: "Optional", bg: "rgba(156,163,175,0.12)", bd: "rgba(156,163,175,0.25)", fg: "#e5e7eb" }
  };
  return map[priority] || map.important;
}

// ---------- Goal Advisor (E) ----------
function getGoalAdvisor(goal) {
  // Rule-based, safe, no dependencies.
  // Uses: status, progress, momentum, habit completion, habit links.
  const notes = [];

  const momentum = getGoalMomentum(goal.id);
  const m = momentumLabel(momentum);

  if (goal.status === "completed") {
    notes.push("This goal is completed. Lock it in and set a new target.");
  } else if (goal.status === "failed") {
    notes.push("This goal is marked failed. Decide: restart with a smaller target, or replace it.");
  } else if (goal.status === "hold") {
    notes.push("This goal is on hold. If it matters, schedule a re-activation date.");
  }

  if (goal.status === "active") {
    if (goal.progress >= 80) notes.push("You’re close. Finish strong with one decisive push this week.");
    else if (goal.progress <= 10) notes.push("Progress is low. Shrink the next step to something you can do today.");
  }

  if (m.label === "Stalling") {
    notes.push("Momentum is stalling. Your next action needs to be smaller and more specific.");
  } else if (m.label === "Slowing") {
    notes.push("Momentum is slowing. Add one focused session or task this week.");
  } else if (m.label === "Accelerating") {
    notes.push("Momentum is strong. Protect the streak and avoid switching goals mid-push.");
  }

  // habit-linked advice
  const linked = Array.isArray(goal.habitLinks?.habits) ? goal.habitLinks.habits : [];
  if (linked.length === 0) {
    notes.push("No habits linked. Link 1–3 habits so this goal has daily support.");
  } else {
    const habitPct = goalsGetDayHabitPercent();
    if (habitPct < 50) {
      notes.push("Your habit completion is low today. Hit the linked habits first—then push goal work.");
    } else if (habitPct >= 80) {
      notes.push("Your habits are strong today. Great day to move this goal forward.");
    }
  }

  // priority sanity
  if (goal.priority === "critical" && goal.status !== "active") {
    notes.push("This is marked CRITICAL but not active. Either activate it or downgrade the priority.");
  }

  // keep it concise
  const unique = [...new Set(notes)].slice(0, 5);

  return {
    headline: `Advisor • ${m.label}`,
    color: m.color,
    notes: unique.length ? unique : ["Log more progress points to unlock sharper insights."]
  };
}

// ---------- Habit Linking UI (A) ----------
function openLinkHabits(goalId) {
  const g = goals.find(x => x.id === goalId);
  if (!g) return;

  const habits = goalsGetHabitsListSafe();
  const linked = new Set(Array.isArray(g.habitLinks?.habits) ? g.habitLinks.habits : []);

  const html = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div>
        <div style="font-weight:900; color:white; font-size:1.15rem;">Link Habits</div>
        <div style="color:#9CA3AF; font-size:0.9rem;">Choose habits that directly support this goal</div>
      </div>
      <button class="form-cancel" onclick="closeModal()">Close</button>
    </div>

    <div style="margin-top:12px; color:#9CA3AF; font-size:0.9rem;">
      Goal: <span style="color:white; font-weight:800;">${goalsEscapeHtml(g.title)}</span>
    </div>

    <div style="margin-top:14px; display:grid; gap:10px;">
      ${
        habits.length
          ? habits.map(h => `
              <label style="
                display:flex; align-items:center; justify-content:space-between;
                gap:10px; padding:12px; border-radius:12px;
                border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05);
                cursor:pointer;
              ">
                <span style="color:white; font-weight:700;">${goalsEscapeHtml(h.icon || "")} ${goalsEscapeHtml(h.name || h.id)}</span>
                <input type="checkbox" ${linked.has(h.id) ? "checked" : ""} onchange="toggleGoalHabitLink('${goalId}','${h.id}', this.checked)" />
              </label>
            `).join("")
          : `<div style="color:#9CA3AF; padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.10);">
              No habits found. Add habits first in your Habits panel.
            </div>`
      }
    </div>

    <div style="margin-top:14px; display:flex; gap:10px;">
      <button class="form-submit" onclick="closeModal()">Done</button>
      <button class="form-cancel" onclick="clearGoalHabitLinks('${goalId}')">Clear</button>
    </div>
  `;

  openModal(html);
}

function toggleGoalHabitLink(goalId, habitId, checked) {
  const g = goals.find(x => x.id === goalId);
  if (!g) return;

  const list = Array.isArray(g.habitLinks?.habits) ? g.habitLinks.habits : [];
  const set = new Set(list);

  if (checked) set.add(habitId);
  else set.delete(habitId);

  g.habitLinks.habits = Array.from(set);
  saveGoals();
}

function clearGoalHabitLinks(goalId) {
  const g = goals.find(x => x.id === goalId);
  if (!g) return;
  g.habitLinks.habits = [];
  saveGoals();
  closeModal();
  renderGoals();
}

// ---------- Goal Timeline / History (C) ----------
function openGoalTimeline(goalId) {
  const g = goals.find(x => x.id === goalId);
  if (!g) return;

  const hist = Array.isArray(g.progressHistory) ? g.progressHistory : [];
  const labels = hist.map(p => p.date);
  const values = hist.map(p => goalsClamp(p.value, 0, 100));

  const momentum = getGoalMomentum(goalId);
  const m = momentumLabel(momentum);

  openModal(`
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div>
        <div style="font-weight:900; color:white; font-size:1.15rem;">Goal Timeline</div>
        <div style="color:#9CA3AF; font-size:0.9rem;">${goalsEscapeHtml(g.title)}</div>
      </div>
      <button class="form-cancel" onclick="closeModal()">Close</button>
    </div>

    <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
      <div style="padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:white;">
        Progress: <span style="font-weight:900;">${g.progress}%</span>
      </div>
      <div style="padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:white;">
        Momentum: <span style="font-weight:900; color:${m.color};">${m.label}</span>
      </div>
      <div style="padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:white;">
        Priority: <span style="font-weight:900;">${goalsEscapeHtml(g.priority)}</span>
      </div>
    </div>

    <div style="margin-top:14px; height:320px;">
      <canvas id="goalHistoryCanvas" height="320"></canvas>
    </div>

    <div style="margin-top:12px; color:#9CA3AF; font-size:0.9rem;">
      Tip: moving the progress slider records history automatically (1 point per day).
    </div>
  `);

  setTimeout(() => {
    const canvas = document.getElementById("goalHistoryCanvas");
    if (!canvas) return;
    if (typeof Chart === "undefined") return;

    if (goalHistoryChartInstance) {
      try { goalHistoryChartInstance.destroy(); } catch {}
      goalHistoryChartInstance = null;
    }

    goalHistoryChartInstance = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Progress %",
            data: values,
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "rgba(255,255,255,0.8)" } } },
        scales: {
          x: { ticks: { color: "rgba(255,255,255,0.65)" }, grid: { color: "rgba(255,255,255,0.08)" } },
          y: { min: 0, max: 100, ticks: { color: "rgba(255,255,255,0.65)" }, grid: { color: "rgba(255,255,255,0.08)" } }
        }
      }
    });
  }, 0);
}

// ---------- Goal Editor (D + A + E access) ----------
function openEditGoal(goalId) {
  const g = goals.find(x => x.id === goalId);
  if (!g) return;

  const linked = Array.isArray(g.habitLinks?.habits) ? g.habitLinks.habits : [];
  const advisor = getGoalAdvisor(g);
  const pBadge = priorityBadge(g.priority);
  const sBadge = statusBadge(g.status);
  const momentum = getGoalMomentum(goalId);
  const m = momentumLabel(momentum);

  openModal(`
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div>
        <div style="font-weight:900; color:white; font-size:1.15rem;">Edit Goal</div>
        <div style="color:#9CA3AF; font-size:0.9rem;">${goalsEscapeHtml(g.title)}</div>
      </div>
      <button class="form-cancel" onclick="closeModal()">Close</button>
    </div>

    <div style="margin-top:14px; display:grid; gap:12px;">
      <div class="form-group">
        <label>Title</label>
        <input id="editGoalTitle" class="form-input" value="${goalsEscapeHtml(g.title)}" />
      </div>

      <div class="form-group">
        <label>Description</label>
        <textarea id="editGoalDesc" class="form-input">${goalsEscapeHtml(g.description || "")}</textarea>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <div style="flex:1; min-width:200px;" class="form-group">
          <label>Status</label>
          <select id="editGoalStatus" class="form-input">
            ${["active","completed","hold","failed"].map(s => `<option value="${s}" ${g.status===s?"selected":""}>${s}</option>`).join("")}
          </select>
        </div>

        <div style="flex:1; min-width:200px;" class="form-group">
          <label>Priority</label>
          <select id="editGoalPriority" class="form-input">
            ${["critical","important","optional"].map(p => `<option value="${p}" ${g.priority===p?"selected":""}>${p}</option>`).join("")}
          </select>
        </div>
      </div>

      <div style="padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05);">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="color:white; font-weight:900;">Progress: ${g.progress}%</div>
          <div style="color:${m.color}; font-weight:900;">${m.label}</div>
        </div>
        <input type="range" min="0" max="100" value="${g.progress}"
          oninput="updateGoalProgress('${g.id}', this.value, true)" style="width:100%; margin-top:8px;">
        <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
          <div style="padding:8px 10px; border-radius:999px; background:${sBadge.bg}; border:1px solid ${sBadge.bd}; color:${sBadge.fg}; font-weight:800;">
            ${sBadge.text}
          </div>
          <div style="padding:8px 10px; border-radius:999px; background:${pBadge.bg}; border:1px solid ${pBadge.bd}; color:${pBadge.fg}; font-weight:800;">
            ${pBadge.text}
          </div>
          <div style="padding:8px 10px; border-radius:999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); color:#E5E7EB; font-weight:800;">
            Linked habits: ${linked.length}
          </div>
        </div>

        <div style="margin-top:10px; display:flex; gap:10px;">
          <button class="form-submit" onclick="openLinkHabits('${g.id}')">Link Habits</button>
          <button class="form-submit" onclick="openGoalTimeline('${g.id}')">Timeline</button>
        </div>
      </div>

      <div style="padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,0.14); background: linear-gradient(135deg, rgba(99,102,241,0.18), rgba(236,72,153,0.10));">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="font-weight:900; color:white;">${advisor.headline}</div>
          <div style="font-weight:900; color:${advisor.color};">auto</div>
        </div>
        <div style="margin-top:10px; display:grid; gap:8px;">
          ${advisor.notes.map(n => `<div style="color:rgba(255,255,255,0.85);">• ${goalsEscapeHtml(n)}</div>`).join("")}
        </div>
      </div>

      <div style="display:flex; gap:10px;">
        <button class="form-submit" onclick="saveGoalEdits('${g.id}')">Save</button>
        <button class="form-cancel" onclick="closeModal()">Cancel</button>
        <button onclick="deleteGoal('${g.id}')" style="margin-left:auto; padding:10px 12px; border-radius:12px; cursor:pointer; background:rgba(239,68,68,0.18); border:1px solid rgba(239,68,68,0.35); color:#fecaca; font-weight:900;">
          Delete
        </button>
      </div>
    </div>
  `);
}

function saveGoalEdits(goalId) {
  const g = goals.find(x => x.id === goalId);
  if (!g) return;

  const title = document.getElementById("editGoalTitle")?.value?.trim() || "";
  const desc = document.getElementById("editGoalDesc")?.value?.trim() || "";
  const status = document.getElementById("editGoalStatus")?.value || "active";
  const priority = document.getElementById("editGoalPriority")?.value || "important";

  if (!title) return alert("Title required");

  g.title = title;
  g.description = desc;
  g.status = status;
  g.priority = priority;

  saveGoals();
  closeModal();
  renderGoals();
}

// ---------- Render Goals In Category ----------
function renderGoalsInCategory(container, categoryId) {
  const cat = goalsGetCatById(categoryId);
  const all = goals.filter(g => g.category === categoryId);
  const stats = getCategoryStats(categoryId);

  const filtered = goalsApplyFilters(all);

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; gap:10px; flex-wrap:wrap;">
      <button onclick="goBackToCategories()">← Back</button>

      <div style="font-weight:900; color:white;">
        ${goalsEscapeHtml(cat?.name || "Category")}
        <span style="color:#9CA3AF; font-weight:700; margin-left:10px;">
          ${stats.total} goals • ${stats.completed} done • ${stats.avgProgress}% progress • Momentum ${stats.avgMomentum}
        </span>
      </div>

      <button onclick="openAddGoal('${categoryId}')">+ Add Goal</button>
    </div>

    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
      <select id="goalFilterStatus" class="form-input" style="max-width:200px;" onchange="renderGoals()">
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
        <option value="hold">On Hold</option>
        <option value="failed">Failed</option>
      </select>

      <select id="goalFilterPriority" class="form-input" style="max-width:200px;" onchange="renderGoals()">
        <option value="all">All Priority</option>
        <option value="critical">Critical</option>
        <option value="important">Important</option>
        <option value="optional">Optional</option>
      </select>

      <select id="goalSort" class="form-input" style="max-width:220px;" onchange="renderGoals()">
        <option value="createdDesc">Sort: Newest</option>
        <option value="createdAsc">Sort: Oldest</option>
        <option value="progressDesc">Sort: Progress</option>
        <option value="momentumDesc">Sort: Momentum</option>
        <option value="priority">Sort: Priority</option>
      </select>
    </div>

    ${
      filtered.length === 0
        ? `<div style="color:#9CA3AF; padding:34px; text-align:center; border:1px solid rgba(255,255,255,0.10); border-radius:14px; background:rgba(255,255,255,0.03);">
             No goals match your filters.
           </div>`
        : filtered.map(goal => {
            const s = statusBadge(goal.status);
            const p = priorityBadge(goal.priority);
            const momentum = getGoalMomentum(goal.id);
            const m = momentumLabel(momentum);

            const linked = Array.isArray(goal.habitLinks?.habits) ? goal.habitLinks.habits : [];
            const linkedPreview = linked.slice(0, 2).map(goalsGetHabitNameById).join(", ");
            const linkedMore = linked.length > 2 ? ` +${linked.length - 2}` : "";

            return `
              <div class="goal-card" style="padding:14px; border-radius:16px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.03); margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
                  <div style="flex:1;">
                    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                      <div style="font-weight:900; color:white;">${goalsEscapeHtml(goal.title)}</div>

                      <div style="padding:6px 10px; border-radius:999px; background:${s.bg}; border:1px solid ${s.bd}; color:${s.fg}; font-weight:900; font-size:0.8rem;">
                        ${s.text}
                      </div>

                      <div style="padding:6px 10px; border-radius:999px; background:${p.bg}; border:1px solid ${p.bd}; color:${p.fg}; font-weight:900; font-size:0.8rem;">
                        ${p.text}
                      </div>

                      <div style="padding:6px 10px; border-radius:999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); color:${m.color}; font-weight:900; font-size:0.8rem;">
                        ${m.label}
                      </div>
                    </div>

                    ${
                      goal.description
                        ? `<div style="color:#9CA3AF; margin-top:8px; line-height:1.35;">
                            ${goalsEscapeHtml(goal.description)}
                          </div>`
                        : ""
                    }

                    <div style="margin-top:10px;">
                      <div style="display:flex; justify-content:space-between; color:#9CA3AF; font-size:0.82rem;">
                        <span>Progress</span>
                        <span style="color:white; font-weight:900;">${goal.progress}%</span>
                      </div>
                      <div style="height:10px; border-radius:999px; background:rgba(255,255,255,0.08); overflow:hidden; border:1px solid rgba(255,255,255,0.10); margin-top:6px;">
                        <div style="height:100%; width:${goal.progress}%; background:linear-gradient(135deg, rgba(99,102,241,0.95), rgba(236,72,153,0.95));"></div>
                      </div>
                      <input type="range" min="0" max="100" value="${goal.progress}"
                        oninput="updateGoalProgress('${goal.id}', this.value, false)"
                        style="width:100%; margin-top:8px;">
                    </div>

                    <div style="margin-top:10px; color:#9CA3AF; font-size:0.85rem;">
                      Habits: ${linked.length ? `${goalsEscapeHtml(linkedPreview)}${linkedMore}` : "none linked"}
                    </div>
                  </div>

                  <div style="display:flex; flex-direction:column; gap:8px; min-width:140px;">
                    <button class="form-submit" onclick="openEditGoal('${goal.id}')">Edit</button>
                    <button class="form-submit" onclick="openLinkHabits('${goal.id}')">Link Habits</button>
                    <button class="form-submit" onclick="openGoalTimeline('${goal.id}')">Timeline</button>
                    <button onclick="deleteGoal('${goal.id}')" style="padding:10px 12px; border-radius:12px; cursor:pointer; background:rgba(239,68,68,0.18); border:1px solid rgba(239,68,68,0.35); color:#fecaca; font-weight:900;">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join("")
    }
  `;
}

// ---------- Add Category ----------
function openAddCategory() {
  openModal(`
    <h2>Add Category</h2>
    <div class="form-group">
      <label>Name</label>
      <input id="newCategoryName" class="form-input" />
    </div>
    <div class="form-actions">
      <button class="form-submit" onclick="saveNewCategory()">Add</button>
      <button class="form-cancel" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

function saveNewCategory() {
  const input = document.getElementById("newCategoryName");
  if (!input || !input.value.trim()) return;

  categories.push({
    id: "cat_" + Date.now(),
    name: input.value.trim(),
    image: "",
    order: categories.length
  });

  saveCategories();
  closeModal();
  renderGoals();
}

// ---------- Add Goal ----------
function openAddGoal(categoryId) {
  openModal(`
    <h2>Add Goal</h2>

    <div class="form-group">
      <label>Title</label>
      <input id="goalTitle" class="form-input" />
    </div>

    <div class="form-group">
      <label>Description</label>
      <textarea id="goalDescription" class="form-input"></textarea>
    </div>

    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <div style="flex:1; min-width:200px;" class="form-group">
        <label>Priority</label>
        <select id="goalPriority" class="form-input">
          <option value="critical">critical</option>
          <option value="important" selected>important</option>
          <option value="optional">optional</option>
        </select>
      </div>

      <div style="flex:1; min-width:200px;" class="form-group">
        <label>Status</label>
        <select id="goalStatus" class="form-input">
          <option value="active" selected>active</option>
          <option value="completed">completed</option>
          <option value="hold">hold</option>
          <option value="failed">failed</option>
        </select>
      </div>
    </div>

    <div class="form-actions">
      <button class="form-submit" onclick="saveNewGoal('${categoryId}')">Add</button>
      <button class="form-cancel" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

function saveNewGoal(categoryId) {
  const title = document.getElementById("goalTitle")?.value?.trim() || "";
  const desc = document.getElementById("goalDescription")?.value?.trim() || "";
  const priority = document.getElementById("goalPriority")?.value || "important";
  const status = document.getElementById("goalStatus")?.value || "active";

  if (!title) return alert("Title required");

  const g = {
    id: "goal_" + Date.now(),
    title,
    description: desc,
    category: categoryId,
    createdAt: new Date().toISOString(),
    status,
    priority,
    progress: 0,
    habitLinks: { habits: [] },
    progressHistory: [{ date: goalsTodayKey(), value: 0 }],
    momentum: 0
  };

  goals.push(g);
  saveGoals();
  closeModal();
  renderGoals();
}

// ---------- Progress + History Recording (C + B) ----------
function updateGoalProgress(id, value, shouldRerender = false) {
  const g = goals.find(x => x.id === id);
  if (!g) return;

  const v = goalsClamp(Number(value), 0, 100);
  g.progress = v;

  // record only 1 point per day (latest wins)
  const today = goalsTodayKey();
  if (!Array.isArray(g.progressHistory)) g.progressHistory = [];
  const last = g.progressHistory[g.progressHistory.length - 1];

  if (last && last.date === today) {
    last.value = v;
  } else {
    g.progressHistory.push({ date: today, value: v });
  }

  // update momentum cache
  g.momentum = getGoalMomentum(g.id);

  saveGoals();

  // keep UI fast: only re-render if requested (edit modal uses true, slider uses false)
  if (shouldRerender) renderGoals();
}

// ---------- Delete ----------
function deleteGoal(id) {
  if (!confirm("Delete this goal?")) return;
  goals = goals.filter(g => g.id !== id);
  saveGoals();
  renderGoals();
}

// ---------- Boot ----------
(function bootGoals() {
  try {
    initGoalsData();
    renderGoals();
  } catch (e) {
    console.error("Goals boot failed:", e);
  }
})();

// CORE REGISTRATION (keeps your existing architecture)
try {
  if (window.App) {
    App.features.goals = {
      init: initGoalsData,
      render: renderGoals
    };

    App.on("goals", () => {
      renderGoals();
    });
  }
} catch (e) {
  console.error("Goals App registration failed:", e);
}
