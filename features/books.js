// =====================================================
// BOOKS INTELLIGENCE SYSTEM (KP EDITION)
// - Want to Read → Currently Reading → Read
// - Progress tracking (pages + daily logs)
// - Move between sections with buttons
// - Delete + Edit
// - Reading progress line chart
// - Mount-safe (never wipes other modules)
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "booksData";
  const HISTORY_KEY = "booksProgressHistory";
  const MOUNT_ID = "booksMount";

  let chart = null;

  function getContainer() {
    return document.getElementById("booksContainer");
  }

  function ensureMount() {
    const container = getContainer();
    if (!container) return null;

    let mount = document.getElementById(MOUNT_ID);
    if (mount) return mount;

    mount = document.createElement("div");
    mount.id = MOUNT_ID;
    container.prepend(mount);
    return mount;
  }

  function loadBooks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveBooks(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveHistory(data) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
  }

  function uuid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function todayKey() {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d.getTime();
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;");
  }

  // ==========================
  // CORE ACTIONS
  // ==========================

  window.Books = window.Books || {};

  Books.addBook = function(title, author, pages, status) {
    if (!title.trim()) return;

    const books = loadBooks();
    books.push({
      id: uuid(),
      title: title.trim(),
      author: author.trim(),
      totalPages: Number(pages) || 0,
      currentPage: 0,
      status: status || "want",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    saveBooks(books);
    renderBooks();
  };

  Books.moveBook = function(id, status) {
    const books = loadBooks();
    const book = books.find(b => b.id === id);
    if (!book) return;

    book.status = status;
    book.updatedAt = Date.now();

    saveBooks(books);
    renderBooks();
  };

  Books.deleteBook = function(id) {
    const books = loadBooks().filter(b => b.id !== id);
    saveBooks(books);
    renderBooks();
  };

  Books.updateProgress = function(id, newPage) {
    const books = loadBooks();
    const book = books.find(b => b.id === id);
    if (!book) return;

    book.currentPage = Math.min(Number(newPage), book.totalPages);
    book.updatedAt = Date.now();

    saveBooks(books);

    const history = loadHistory();
    history.push({
      bookId: id,
      day: todayKey(),
      page: book.currentPage
    });
    saveHistory(history);

    renderBooks();
  };

  // ==========================
  // RENDER UI
  // ==========================

  function renderBooks() {
    const mount = ensureMount();
    if (!mount) return;

    const books = loadBooks();

    const current = books.filter(b => b.status === "current");
    const want = books.filter(b => b.status === "want");
    const read = books.filter(b => b.status === "read");

    mount.innerHTML = `
      <div class="habit-section">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="section-title">📖 Currently Reading</div>
          <button class="form-submit" id="addBookBtn">Add Book</button>
        </div>
        ${current.length ? current.map(renderBookCard).join("") : `<div style="color:#9CA3AF;">No books currently being read.</div>`}
      </div>

      <div class="habit-section">
        <div class="section-title">📚 Want to Read</div>
        ${want.length ? want.map(renderBookCard).join("") : `<div style="color:#9CA3AF;">No books in wishlist.</div>`}
      </div>

      <div class="habit-section">
        <div class="section-title">✅ Books Read</div>
        ${read.length ? read.map(renderBookCard).join("") : `<div style="color:#9CA3AF;">No completed books yet.</div>`}
      </div>

      <div class="habit-section">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="section-title">📈 Reading Progress</div>
          <select id="bookSelect" class="form-input" style="width:auto;">
            ${current.map(b => `<option value="${b.id}">${escapeHtml(b.title)}</option>`).join("")}
          </select>
        </div>
        <canvas id="booksChart" height="140"></canvas>
      </div>
    `;

    bindEvents();
    renderChart();
  }

  function renderBookCard(book) {
    const progress = book.totalPages ? Math.round((book.currentPage / book.totalPages) * 100) : 0;

    let buttons = "";
    if (book.status === "want") {
      buttons += `<button class="form-submit" data-action="move" data-id="${book.id}" data-status="current">Start Reading</button>`;
    }
    if (book.status === "current") {
      buttons += `<button class="form-submit" data-action="move" data-id="${book.id}" data-status="read">Mark Read</button>`;
      buttons += `<button class="form-cancel" data-action="progress" data-id="${book.id}">Update Progress</button>`;
    }

    buttons += `<button class="form-cancel" data-action="delete" data-id="${book.id}" style="color:#ef4444;">Delete</button>`;

    return `
      <div class="idea-item" style="margin-top:10px;">
        <div style="display:flex; justify-content:space-between; gap:10px;">
          <div>
            <div style="font-weight:800;">${escapeHtml(book.title)}</div>
            <div style="color:#9CA3AF;">${escapeHtml(book.author || "")}</div>
            ${book.totalPages ? `<div style="color:#a78bfa;">${book.currentPage}/${book.totalPages} pages (${progress}%)</div>` : ""}
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${buttons}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================
  // EVENTS
  // ==========================

  function bindEvents() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    const addBtn = mount.querySelector("#addBookBtn");
    if (addBtn) addBtn.onclick = openAddBookModal;

    mount.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === "move") Books.moveBook(id, btn.dataset.status);
        if (action === "delete") Books.deleteBook(id);
        if (action === "progress") openProgressModal(id);
      };
    });
  }

  // ==========================
  // MODALS
  // ==========================

  function openAddBookModal() {
    if (typeof openModal !== "function") return alert("Modal system missing.");

    openModal(`
      <div class="section-title">Add Book</div>

      <div class="form-group">
        <label>Title</label>
        <input id="bookTitle" class="form-input">
      </div>

      <div class="form-group">
        <label>Author (optional)</label>
        <input id="bookAuthor" class="form-input">
      </div>

      <div class="form-group">
        <label>Total Pages</label>
        <input id="bookPages" type="number" class="form-input">
      </div>

      <div class="form-group">
        <label>Status</label>
        <select id="bookStatus" class="form-input">
          <option value="want">Want to Read</option>
          <option value="current">Currently Reading</option>
        </select>
      </div>

      <div class="form-actions">
        <button class="form-submit" id="saveBook">Save</button>
        <button class="form-cancel" onclick="closeModal()">Cancel</button>
      </div>
    `);

    document.getElementById("saveBook").onclick = () => {
      Books.addBook(
        document.getElementById("bookTitle").value,
        document.getElementById("bookAuthor").value,
        document.getElementById("bookPages").value,
        document.getElementById("bookStatus").value
      );
      closeModal();
    };
  }

  function openProgressModal(id) {
    const books = loadBooks();
    const book = books.find(b => b.id === id);
    if (!book) return;

    openModal(`
      <div class="section-title">Update Progress</div>
      <div class="form-group">
        <label>Current Page</label>
        <input id="progressPage" type="number" class="form-input" value="${book.currentPage}">
      </div>
      <div class="form-actions">
        <button class="form-submit" id="updateProgress">Update</button>
        <button class="form-cancel" onclick="closeModal()">Cancel</button>
      </div>
    `);

    document.getElementById("updateProgress").onclick = () => {
      Books.updateProgress(id, document.getElementById("progressPage").value);
      closeModal();
    };
  }

  // ==========================
  // CHART
  // ==========================

  function renderChart() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    const select = mount.querySelector("#bookSelect");
    const canvas = mount.querySelector("#booksChart");
    if (!select || !canvas) return;

    const bookId = select.value;
    const history = loadHistory().filter(h => h.bookId === bookId);

    const labels = history.map(h => new Date(h.day).toLocaleDateString(undefined,{month:"short",day:"numeric"}));
    const data = history.map(h => h.page);

    if (chart) chart.destroy();

    chart = new Chart(canvas, {
      type:"line",
      data:{
        labels,
        datasets:[{
          label:"Pages Read",
          data,
          tension:0.35
        }]
      },
      options:{
        responsive:true,
        scales:{ y:{ beginAtZero:true } }
      }
    });

    select.onchange = renderChart;
  }

  // ==========================
  // NAV HOOK
  // ==========================

  function hook() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(renderBooks, 100);
    });
  }

  function boot() {
    hook();
    setTimeout(renderBooks, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
