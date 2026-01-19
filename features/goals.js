// ============================================
// GOALS MODULE — CATEGORY-BASED (EXTENDED)
// ============================================

let goals = [];
let categories = [];
let activeCategory = null;

/* ---------- Init ---------- */
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

  // Default categories (only added once)
  if (!categories.length) {
    categories = [
      { id: "money", name: "Money" },
      { id: "social", name: "Social Media" },
      { id: "learning", name: "Learning" },
      { id: "health", name: "Health" },
      { id: "finance", name: "Finance" }
    ];
    saveCategories();
  }

  // Backfill old goals
  goals.forEach(g => {
    if (!g.category) g.category = "uncategorized";
  });
}

/* ---------- Save ---------- */
function saveGoals() {
  localStorage.setItem("goals", JSON.stringify(goals));
}

function saveCategories() {
  localStorage.setItem("goalCategories", JSON.stringify(categories));
}

/* ---------- Render Entry ---------- */
function renderGoals() {
  const container = document.getElementById("goalsGrid");
  if (!container) return;

  if (!activeCategory) {
    renderCategoryGrid(container);
  } else {
    renderGoalsInCategory(container, activeCategory);
  }
}

/* ---------- Category Grid ---------- */
function renderCategoryGrid(container) {
  container.innerHTML = `
    <div class="goals-grid">
      ${categories.map(cat => {
        const count = goals.filter(g => g.category === cat.id).length;
        return `
          <div class="goal-card" onclick="openCategory('${cat.id}')">
            <div style="font-weight:800;">${cat.name}</div>
            <div style="color:#9CA3AF; margin-top:6px;">${count} goals</div>
          </div>
        `;
      }).join("")}

      <div class="goal-card" onclick="openAddCategory()" style="text-align:center;">
        <div style="font-size:1.5em;">＋</div>
        <div style="margin-top:6px;">Add Category</div>
      </div>
    </div>
  `;
}

/* ---------- Category View ---------- */
function openCategory(categoryId) {
  activeCategory = categoryId;
  renderGoals();
}

function renderGoalsInCategory(container, categoryId) {
  const cat = categories.find(c => c.id === categoryId);
  const filtered = goals.filter(g => g.category === categoryId);

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <button onclick="goBackToCategories()">← Back</button>
      <div style="font-weight:800;">${cat.name}</div>
      <button onclick="openAddGoal('${categoryId}')">+ Add Goal</button>
    </div>

    ${
      filtered.length === 0
        ? `<div style="color:#9CA3AF; padding:40px; text-align:center;">No goals in this category yet.</div>`
        : filtered.map(goal => `
            <div class="goal-card">
              <div style="display:flex; justify-content:space-between;">
                <div>
                  <div style="font-weight:700;">${escapeHtml(goal.title)}</div>
                  ${goal.description ? `<div style="color:#9CA3AF; margin-top:6px;">${escapeHtml(goal.description)}</div>` : ""}
                </div>
                <button onclick="deleteGoal('${goal.id}')">Delete</button>
              </div>
            </div>
          `).join("")
    }
  `;
}

function goBackToCategories() {
  activeCategory = null;
  renderGoals();
}

/* ---------- Add Category ---------- */
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
    name: input.value.trim()
  });

  saveCategories();
  closeModal();
  renderGoals();
}

/* ---------- Add Goal ---------- */
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
    <div class="form-actions">
      <button class="form-submit" onclick="saveNewGoal('${categoryId}')">Add</button>
      <button class="form-cancel" onclick="closeModal()">Cancel</button>
    </div>
  `);
}

function saveNewGoal(categoryId) {
  const title = document.getElementById("goalTitle").value.trim();
  const desc = document.getElementById("goalDescription").value.trim();
  if (!title) return alert("Title required");

  goals.push({
    id: "goal_" + Date.now(),
    title,
    description: desc,
    category: categoryId,
    createdAt: new Date().toISOString()
  });

  saveGoals();
  closeModal();
  renderGoals();
}

/* ---------- Delete ---------- */
function deleteGoal(id) {
  if (!confirm("Delete this goal?")) return;
  goals = goals.filter(g => g.id !== id);
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
  renderGoals();
})();
