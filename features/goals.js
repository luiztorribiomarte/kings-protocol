// ============================================
// GOALS MODULE — DRAGGABLE CATEGORY BOARD
// ============================================

let goals = [];
let categories = [];
let activeCategory = null;
let dragCategoryId = null;

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

  goals.forEach(g => {
    if (!g.category) g.category = "money";
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
  const ordered = [...categories].sort((a, b) => a.order - b.order);

  container.innerHTML = `
    <div class="goals-grid">
      ${ordered.map(cat => {
        const catGoals = goals.filter(g => g.category === cat.id);
        const percent = catGoals.length ? Math.min(100, catGoals.length * 20) : 0;

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
              <div class="category-meta">${catGoals.length} goals</div>

              <div class="category-progress">
                <div class="category-progress-bar" style="width:${percent}%"></div>
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

/* ---------- Drag & Drop ---------- */
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

/* ---------- Category Menu (IMAGE VIA URL) ---------- */
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
        ? `<div style="color:#9CA3AF; padding:40px; text-align:center;">
             No goals in this category yet.
           </div>`
        : filtered.map(goal => `
            <div class="goal-card">
              <div style="display:flex; justify-content:space-between;">
                <div>
                  <div style="font-weight:700;">${escapeHtml(goal.title)}</div>
                  ${goal.description
                    ? `<div style="color:#9CA3AF; margin-top:6px;">
                         ${escapeHtml(goal.description)}
                       </div>`
                    : ""}
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
    name: input.value.trim(),
    image: "",
    order: categories.length
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
