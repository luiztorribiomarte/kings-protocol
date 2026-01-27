// =====================================================
// CONTENT HUB SYSTEM (SAFE CORE)
// - Preserves ALL existing features
// - Prevents DOM wipe
// - Compatible with Creator Intelligence Engine
// =====================================================

const CONTENT_STORAGE_KEY = "contentHubItems";
const CONTAINER_ID = "contentHubContainer";

// ---------- Data Layer ----------
function getContentItems() {
  try {
    return JSON.parse(localStorage.getItem(CONTENT_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveContentItems(items) {
  localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(items));
}

// ---------- UI Container ----------
function ensureContainer() {
  const page = document.getElementById("contentPage");
  if (!page) return null;

  let container = document.getElementById(CONTAINER_ID);
  if (container) return container;

  container = document.createElement("div");
  container.id = CONTAINER_ID;
  container.className = "habit-section";

  // ✅ SAFE: do NOT wipe page if container already exists
  if (!document.getElementById(CONTAINER_ID)) {
    page.innerHTML = "";
  }

  page.appendChild(container);
  return container;
}

// ---------- Render ----------
function renderContentHub(filterStage = "all") {
  const container = ensureContainer();
  if (!container) return;

  const items = getContentItems();

  const filtered =
    filterStage === "all"
      ? items
      : items.filter(i => i.stage === filterStage);

  container.innerHTML = `
    <div class="content-hub-ui">
      <div style="display:flex; gap:10px; margin-bottom:12px;">
        <button class="content-filter" data-stage="all">All</button>
        <button class="content-filter" data-stage="idea">Idea</button>
        <button class="content-filter" data-stage="research">Research</button>
        <button class="content-filter" data-stage="script">Script</button>
        <button class="content-filter" data-stage="editing">Editing</button>
        <button class="content-filter" data-stage="posted">Posted</button>
      </div>

      <div style="display:flex; gap:10px; margin-bottom:12px;">
        <input id="contentTitleInput" placeholder="New idea title..." style="flex:1;" />
        <select id="contentStageInput">
          <option value="idea">Idea</option>
          <option value="research">Research</option>
          <option value="script">Script</option>
          <option value="editing">Editing</option>
          <option value="posted">Posted</option>
        </select>
        <button id="addContentBtn">Add</button>
      </div>

      <textarea id="contentNotesInput" placeholder="Notes..." style="width:100%; margin-bottom:12px;"></textarea>

      <div id="contentList">
        ${
          filtered.length
            ? filtered.map(item => `
              <div class="content-item" style="
                padding:10px;
                border-radius:10px;
                border:1px solid rgba(255,255,255,0.15);
                margin-bottom:8px;
                background:rgba(0,0,0,0.25);
              ">
                <div style="font-weight:900;">${item.title}</div>
                <div style="font-size:0.85rem; color:#9CA3AF;">Stage: ${item.stage}</div>
                <div style="font-size:0.85rem; margin-top:4px;">${item.notes || ""}</div>
                <div style="margin-top:6px;">
                  <button class="delete-content" data-id="${item.id}">Delete</button>
                </div>
              </div>
            `).join("")
            : `<div style="color:#9CA3AF;">No content yet.</div>`
        }
      </div>
    </div>
  `;

  bindContentEvents();
}

// ---------- Events ----------
function bindContentEvents() {
  const addBtn = document.getElementById("addContentBtn");
  const titleInput = document.getElementById("contentTitleInput");
  const stageInput = document.getElementById("contentStageInput");
  const notesInput = document.getElementById("contentNotesInput");

  if (addBtn) {
    addBtn.onclick = () => {
      const title = titleInput.value.trim();
      const stage = stageInput.value;
      const notes = notesInput.value.trim();

      if (!title) return;

      const items = getContentItems();
      items.push({
        id: Date.now(),
        title,
        stage,
        notes,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      saveContentItems(items);
      titleInput.value = "";
      notesInput.value = "";

      renderContentHub();
    };
  }

  document.querySelectorAll(".delete-content").forEach(btn => {
    btn.onclick = () => {
      const id = Number(btn.dataset.id);
      const items = getContentItems().filter(i => i.id !== id);
      saveContentItems(items);
      renderContentHub();
    };
  });

  document.querySelectorAll(".content-filter").forEach(btn => {
    btn.onclick = () => {
      renderContentHub(btn.dataset.stage);
    };
  });
}

// ---------- Tab Hook ----------
document.addEventListener("click", e => {
  const tab = e.target.closest?.(".nav-tab");
  if (!tab) return;

  if (tab.dataset.page === "content") {
    setTimeout(renderContentHub, 50);
  }
});

// ---------- Boot ----------
setTimeout(renderContentHub, 100);
