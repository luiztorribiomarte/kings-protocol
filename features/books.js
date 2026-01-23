// =====================================================
// BOOKS MODULE (SAFE ADD-ON)
// - Does NOT modify app.js
// - Works independently
// - Persists in localStorage
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "booksLibrary";
  const CONTAINER_ID = "booksContainer";

  function safeParse(raw, fallback) {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : fallback;
    } catch {
      return fallback;
    }
  }

  function getBooks() {
    return safeParse(localStorage.getItem(STORAGE_KEY) || "[]", []);
  }

  function saveBooks(books) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function ensureContainer() {
    const page = document.getElementById("booksPage");
    if (!page) return null;

    let container = document.getElementById(CONTAINER_ID);
    if (container) return container;

    container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.className = "habit-section";

    page.innerHTML = "";
    page.appendChild(container);

    return container;
  }

  function percent(current, total) {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.round((current / total) * 100));
  }

  function renderBooks() {
    const container = ensureContainer();
    if (!container) return;

    const books = getBooks();

    container.innerHTML = `
      <div class="section-title">📚 Books & Knowledge</div>

      <div style="
        margin-top:10px;
        padding:14px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.05);
      ">
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <input id="bookTitleInput" placeholder="Book title"
            style="
              flex:2; min-width:200px;
              background:rgba(255,255,255,0.05);
              border:1px solid rgba(255,255,255,0.15);
              border-radius:10px;
              padding:8px 10px;
              color:white;
              outline:none;
            " />

          <input id="bookAuthorInput" placeholder="Author"
            style="
              flex:1; min-width:140px;
              background:rgba(255,255,255,0.05);
              border:1px solid rgba(255,255,255,0.15);
              border-radius:10px;
              padding:8px 10px;
              color:white;
              outline:none;
            " />

          <input id="bookPagesInput" type="number" placeholder="Total pages"
            style="
              width:130px;
              background:rgba(255,255,255,0.05);
              border:1px solid rgba(255,255,255,0.15);
              border-radius:10px;
              padding:8px 10px;
              color:white;
              outline:none;
            " />

          <button onclick="addBook()" style="
            padding:9px 14px;
            border-radius:10px;
            background:linear-gradient(135deg,#6366f1,#ec4899);
            color:white;
            border:none;
            cursor:pointer;
            font-weight:900;
          ">Add Book</button>
        </div>
      </div>

      <div style="margin-top:14px; display:flex; flex-direction:column; gap:12px;">
        ${
          books.length
            ? books
                .slice()
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                .map(book => renderBookCard(book))
                .join("")
            : `<div style="color:#9CA3AF;">No books yet. Add your first one above.</div>`
        }
      </div>
    `;
  }

  function renderBookCard(book) {
    const title = escapeHtml(book.title);
    const author = escapeHtml(book.author || "");
    const totalPages = book.totalPages || 0;
    const currentPage = book.currentPage || 0;
    const notes = escapeHtml(book.notes || "");

    const p = percent(currentPage, totalPages);

    return `
      <div style="
        padding:14px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(0,0,0,0.18);
      ">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div>
            <div style="color:#E5E7EB; font-weight:950; font-size:1.05rem;">
              ${title}
            </div>
            ${
              author
                ? `<div style="color:#9CA3AF; font-weight:800; font-size:0.9rem;">by ${author}</div>`
                : ""
            }
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button onclick="openBookEdit('${book.id}')" style="
              padding:8px 12px;
              border-radius:10px;
              background:rgba(255,255,255,0.08);
              border:1px solid rgba(255,255,255,0.16);
              color:white;
              cursor:pointer;
              font-weight:900;
            ">Edit</button>

            <button onclick="deleteBook('${book.id}')" style="
              padding:8px 12px;
              border-radius:10px;
              background:none;
              border:1px solid rgba(239,68,68,0.35);
              color:#FCA5A5;
              cursor:pointer;
              font-weight:950;
            ">Delete</button>
          </div>
        </div>

        <div style="margin-top:10px;">
          <div style="display:flex; justify-content:space-between; font-weight:900; color:#E5E7EB;">
            <span>Progress</span>
            <span>${currentPage}/${totalPages || "?"} pages (${p}%)</span>
          </div>

          <div style="margin-top:6px; height:10px; border-radius:999px; background:rgba(255,255,255,0.08); overflow:hidden;">
            <div style="
              height:100%;
              width:${p}%;
              border-radius:999px;
              background:linear-gradient(90deg, rgba(99,102,241,0.95), rgba(236,72,153,0.95));
            "></div>
          </div>

          <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
            <input id="pageInput-${book.id}" type="number" placeholder="Current page"
              style="
                width:140px;
                background:rgba(255,255,255,0.05);
                border:1px solid rgba(255,255,255,0.15);
                border-radius:10px;
                padding:6px 8px;
                color:white;
                outline:none;
              " />

            <button onclick="updateBookProgress('${book.id}')" style="
              padding:6px 12px;
              border-radius:10px;
              background:rgba(255,255,255,0.08);
              border:1px solid rgba(255,255,255,0.16);
              color:white;
              cursor:pointer;
              font-weight:900;
            ">Update</button>
          </div>
        </div>

        ${
          notes
            ? `<div style="margin-top:10px; color:#E5E7EB; line-height:1.45; white-space:pre-wrap;">${notes}</div>`
            : `<div style="margin-top:10px; color:#9CA3AF;">No notes yet.</div>`
        }
      </div>
    `;
  }

  // ---------------- PUBLIC API ----------------

  window.addBook = function () {
    const titleEl = document.getElementById("bookTitleInput");
    const authorEl = document.getElementById("bookAuthorInput");
    const pagesEl = document.getElementById("bookPagesInput");

    if (!titleEl) return;

    const title = titleEl.value.trim();
    const author = authorEl ? authorEl.value.trim() : "";
    const totalPages = parseInt(pagesEl?.value || "0", 10) || 0;

    if (!title) return;

    const books = getBooks();
    const now = Date.now();

    books.push({
      id: uid(),
      title,
      author,
      totalPages,
      currentPage: 0,
      notes: "",
      createdAt: now,
      updatedAt: now
    });

    saveBooks(books);

    titleEl.value = "";
    if (authorEl) authorEl.value = "";
    if (pagesEl) pagesEl.value = "";

    renderBooks();
  };

  window.deleteBook = function (id) {
    const books = getBooks().filter(b => b.id !== id);
    saveBooks(books);
    renderBooks();
  };

  window.updateBookProgress = function (id) {
    const input = document.getElementById(`pageInput-${id}`);
    if (!input) return;

    const value = parseInt(input.value || "0", 10);
    if (!Number.isFinite(value)) return;

    const books = getBooks();
    const now = Date.now();

    const updated = books.map(b =>
      b.id === id
        ? { ...b, currentPage: Math.max(0, value), updatedAt: now }
        : b
    );

    saveBooks(updated);
    renderBooks();
  };

  window.openBookEdit = function (id) {
    if (typeof openModal !== "function") return;

    const books = getBooks();
    const book = books.find(b => b.id === id);
    if (!book) return;

    const title = escapeHtml(book.title);
    const author = escapeHtml(book.author || "");
    const totalPages = book.totalPages || 0;
    const notes = escapeHtml(book.notes || "");

    openModal(`
      <div style="
        width:min(720px, 92vw);
        max-height:82vh;
        overflow:auto;
        padding:16px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(10,10,12,0.95);
      ">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
          <div style="color:#E5E7EB; font-weight:950; font-size:1.1rem;">Edit Book</div>
          <button onclick="closeModal(event)" style="
            background:none; border:none; color:#E5E7EB; cursor:pointer; font-weight:950; font-size:1.2rem;
          ">✕</button>
        </div>

        <div style="margin-top:12px; color:#9CA3AF; font-weight:900;">Title</div>
        <input id="bookEditTitle" value="${title}" style="
          width:100%;
          margin-top:6px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:12px;
          padding:10px 12px;
          color:white;
          outline:none;
        "/>

        <div style="margin-top:12px; color:#9CA3AF; font-weight:900;">Author</div>
        <input id="bookEditAuthor" value="${author}" style="
          width:100%;
          margin-top:6px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:12px;
          padding:10px 12px;
          color:white;
          outline:none;
        "/>

        <div style="margin-top:12px; color:#9CA3AF; font-weight:900;">Total Pages</div>
        <input id="bookEditPages" type="number" value="${totalPages}" style="
          width:100%;
          margin-top:6px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:12px;
          padding:10px 12px;
          color:white;
          outline:none;
        "/>

        <div style="margin-top:12px; color:#9CA3AF; font-weight:900;">Notes / Highlights</div>
        <textarea id="bookEditNotes" style="
          width:100%;
          height:160px;
          margin-top:6px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.15);
          border-radius:12px;
          padding:10px 12px;
          color:white;
          outline:none;
        ">${notes}</textarea>

        <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
          <button onclick="saveBookEdit('${escapeHtml(book.id)}')" style="
            padding:9px 14px;
            border-radius:10px;
            background:linear-gradient(135deg,#6366f1,#ec4899);
            color:white;
            border:none;
            cursor:pointer;
            font-weight:950;
          ">Save</button>

          <button onclick="closeModal(event)" style="
            padding:9px 14px;
            border-radius:10px;
            background:rgba(255,255,255,0.08);
            border:1px solid rgba(255,255,255,0.16);
            color:white;
            cursor:pointer;
            font-weight:900;
          ">Cancel</button>
        </div>
      </div>
    `);
  };

  window.saveBookEdit = function (id) {
    const titleEl = document.getElementById("bookEditTitle");
    const authorEl = document.getElementById("bookEditAuthor");
    const pagesEl = document.getElementById("bookEditPages");
    const notesEl = document.getElementById("bookEditNotes");

    if (!titleEl) return;

    const title = titleEl.value.trim();
    const author = authorEl ? authorEl.value.trim() : "";
    const totalPages = parseInt(pagesEl?.value || "0", 10) || 0;
    const notes = notesEl ? notesEl.value.trim() : "";

    if (!title) return;

    const books = getBooks();
    const now = Date.now();

    const updated = books.map(b =>
      b.id === id
        ? { ...b, title, author, totalPages, notes, updatedAt: now }
        : b
    );

    saveBooks(updated);

    if (typeof closeModal === "function") closeModal();
    renderBooks();
  };

  // ---------------- HOOK PAGE ACTIVATION ----------------

  function hookNavigation() {
    document.addEventListener("click", e => {
      const tab = e.target && e.target.closest ? e.target.closest(".nav-tab") : null;
      if (!tab) return;
      setTimeout(renderBooks, 50);
    });
  }

  function observeActivation() {
    const page = document.getElementById("booksPage");
    if (!page || typeof MutationObserver === "undefined") return;

    const obs = new MutationObserver(() => {
      if (page.classList.contains("active")) {
        renderBooks();
      }
    });

    obs.observe(page, { attributes: true, attributeFilter: ["class"] });
  }

  function boot() {
    hookNavigation();
    observeActivation();
    setTimeout(renderBooks, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
