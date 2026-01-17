// ============================================
// GOALS MODULE (standalone, no habits)
// ============================================

let goals = [];

/* ---------- Init ---------- */
function initGoalsData() {
  const saved = localStorage.getItem("goals");
  if (saved) {
    try {
      goals = JSON.parse(saved) || [];
    } catch {
      goals = [];
    }
  }
}

/* ---------- Save ---------- */
function saveGoals() {
  localStorage.setItem("goals", JSON.stringify(goals));
}

/* ---------- Render ---------- */
function renderGoals() {
  const container = document.getElementById("goalsGrid");
  if (!container) return;

  if (!goals.length) {
    container.innerHTML = `
      <div style="
        text-align:center;
        color:#9CA3AF;
        padding:40px;
        font-size:1.05em;
      ">
        No goals yet. Click <strong>+ Add New Goal</strong> to get started.
      </div>
    `;
    return;
  }

  container.innerHTML = goals
    .map(
      (goal) => `
      <div class="goal-card" style="
        background:rgba(255,255,255,0.05);
        border:1px solid rgba(255,255,255,0.12);
        border-radius:14px;
        padding:18px;
        margin-bottom:16px;
      ">
        <div style="display:flex; justify-content:space-between; align-items:start;">
          <div>
            <div style="color:white; font-weight:700; font-size:1.1em;">
              ${escapeHtml(goal.title)}
            </div>
            ${
              goal.description
                ? `<div style="color:#9CA3AF; margin-top:6px;">${escapeHtml(
                    goal.description
                  )}</div>`
                : ""
            }
          </div>

          <button
            onclick="deleteGoal('${goal.id}')"
            style="
              background:rgba(255,80,80,0.15);
              border:1px solid rgba(255,80,80,0.35);
              color:#ffb4b4;
              padding:6px 12px;
              border-radius:8px;
              cursor:pointer;
            "
          >
            Delete
          </button>
        </div>
      </div>
    `
    )
    .join("");
}

/* ---------- Add Goal ---------- */
function openAddGoal() {
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");
  if (!modal || !modalBody) return;

  modalBody.innerHTML = `
    <h2 style="color:white; margin-bottom:16px;">Add New Goal</h2>

    <div class="form-group">
      <label>Goal Title *</label>
      <input id="goalTitle" class="form-input" placeholder="e.g. Build discipline" />
    </div>

    <div class="form-group">
      <label>Description (optional)</label>
      <textarea id="goalDescription" class="form-input" rows="4"
        placeholder="Why this goal matters..."></textarea>
    </div>

    <div class="form-actions">
      <button onclick="saveNewGoal()" class="form-submit">Add Goal</button>
      <button onclick="closeModal()" class="form-cancel">Cancel</button>
    </div>
  `;

  modal.style.display = "flex";
}

function saveNewGoal() {
  const titleEl = document.getElementById("goalTitle");
  const descEl = document.getElementById("goalDescription");

  if (!titleEl || !titleEl.value.trim()) {
    alert("Please enter a goal title");
    return;
  }

  goals.push({
    id: `goal_${Date.now()}`,
    title: titleEl.value.trim(),
    description: descEl ? descEl.value.trim() : "",
    createdAt: new Date().toISOString()
  });

  saveGoals();
  closeModal();
  renderGoals();
}

/* ---------- Delete ---------- */
function deleteGoal(goalId) {
  if (!confirm("Delete this goal?")) return;

  goals = goals.filter((g) => g.id !== goalId);
  saveGoals();
  renderGoals();
}

/* ---------- Helpers ---------- */
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- Boot ---------- */
(function bootGoals() {
  initGoalsData();
  if (document.getElementById("goalsGrid")) {
    renderGoals();
  }
})();
