/* features/books.js — KINGS PROTOCOL
   Redesigned. Four sections:
   1. Now Reading  — hero card, inline quick-log, streak
   2. Up Next      — compact queue, one-tap to start
   3. Library      — finished books with rating + takeaway
   4. Notes Vault  — all notes in one feed
*/

(function () {
  "use strict";

  const App         = window.App;
  const STORE_BOOKS = "kpBooks_v2";
  const STORE_LOGS  = "kpBookLogs_v2";

  // ── STORAGE ───────────────────────────────────────────────────────────────

  function safeParse(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  }
  function saveItem(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  function getBooks()   { return safeParse(STORE_BOOKS, []); }
  function getLogs()    { return safeParse(STORE_LOGS,  []); }
  function saveBooks(b) { saveItem(STORE_BOOKS, b); }
  function saveLogs(l)  { saveItem(STORE_LOGS,  l); }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  function pad(n) { return String(n).padStart(2,"0"); }
  function todayKey(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function esc(s) {
    return String(s||"")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  // ── STREAK + STATS ────────────────────────────────────────────────────────

  function getReadingStreak() {
    const days = new Set(getLogs().map(l => l.date));
    let streak = 0;
    const d = new Date();
    while (days.has(todayKey(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function getTotalPages()  { return getLogs().reduce((s,l) => s + (l.pages||0), 0); }
  function getPagesToday()  {
    const t = todayKey();
    return getLogs().filter(l => l.date === t).reduce((s,l) => s + (l.pages||0), 0);
  }

  // ── TAB STATE ─────────────────────────────────────────────────────────────

  let activeTab = "reading";

  // ── MAIN RENDER ───────────────────────────────────────────────────────────

  function renderBooks() {
    const container = document.getElementById("booksContainer");
    if (!container) return;

    const books    = getBooks();
    const reading  = books.filter(b => b.status === "reading");
    const queue    = books.filter(b => b.status === "queue");
    const finished = books.filter(b => b.status === "finished");
    const streak   = getReadingStreak();
    const total    = getTotalPages();
    const today    = getPagesToday();

    const TABS = [
      { id:"reading", label:"📖 Reading"  },
      { id:"queue",   label:"📚 Up Next"  },
      { id:"library", label:"✅ Library"  },
      { id:"notes",   label:"🗒 Notes"    },
    ];

    container.innerHTML = `<div style="padding:4px 0;">

      <!-- HEADER -->
      <div style="margin-bottom:20px;">
        <h2 style="font-size:1.5rem; font-weight:900; margin-bottom:6px;
          background:linear-gradient(135deg,#e5e7eb,#a78bfa);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
          Reading
        </h2>
        <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:center;">
          <span style="font-size:0.82rem; color:${streak > 0 ? "#f59e0b" : "#6b7280"};">
            ${streak > 0 ? `🔥 ${streak}-day streak` : "Start a streak — read today"}
          </span>
          <span style="font-size:0.82rem; color:#6b7280;">${total.toLocaleString()} pages total</span>
          ${today > 0 ? `<span style="font-size:0.82rem; font-weight:800; color:#86efac;">+${today} today</span>` : ""}
        </div>
      </div>

      <!-- TABS + ADD -->
      <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:4px;
        scrollbar-width:none; margin-bottom:20px; align-items:center;">
        ${TABS.map(t => `
          <button onclick="bkSetTab('${t.id}')" style="
            padding:9px 15px; border-radius:20px; cursor:pointer;
            white-space:nowrap; font-weight:800; font-size:0.82rem; transition:all 0.15s;
            border:1px solid ${activeTab===t.id ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.1)"};
            background:${activeTab===t.id
              ? "linear-gradient(135deg,rgba(99,102,241,0.85),rgba(167,139,250,0.75))"
              : "rgba(255,255,255,0.04)"};
            color:${activeTab===t.id ? "white" : "#9ca3af"};">
            ${t.label}
          </button>
        `).join("")}
        <button onclick="bkOpenAddModal()" style="
          padding:9px 15px; border-radius:20px; cursor:pointer; margin-left:auto;
          white-space:nowrap; font-weight:800; font-size:0.82rem;
          border:1px solid rgba(167,139,250,0.4); background:rgba(167,139,250,0.1);
          color:#a78bfa;">
          + Add Book
        </button>
      </div>

      <!-- CONTENT -->
      <div id="bkContent">
        ${activeTab === "reading"  ? renderReadingTab(reading)  : ""}
        ${activeTab === "queue"    ? renderQueueTab(queue)       : ""}
        ${activeTab === "library"  ? renderLibraryTab(finished)  : ""}
        ${activeTab === "notes"    ? renderNotesTab(books)       : ""}
      </div>

    </div>`;
  }

  // ── TAB 1: NOW READING ────────────────────────────────────────────────────

  function renderReadingTab(reading) {
    if (!reading.length) {
      return `
        <div style="padding:40px 20px; text-align:center; border-radius:20px;
          border:1px dashed rgba(167,139,250,0.2); background:rgba(167,139,250,0.03);">
          <div style="font-size:2rem; margin-bottom:12px;">📖</div>
          <div style="font-weight:800; color:#e5e7eb; margin-bottom:6px;">Nothing in progress</div>
          <div style="font-size:0.85rem; color:#6b7280; margin-bottom:16px;">
            Add a book and start. Even 10 pages a day stacks up fast.
          </div>
          <button onclick="bkOpenAddModal('reading')" style="padding:10px 22px; border-radius:20px;
            background:linear-gradient(135deg,rgba(99,102,241,0.85),rgba(167,139,250,0.75));
            border:none; color:white; font-weight:800; cursor:pointer; font-size:0.9rem;">
            Start a Book
          </button>
        </div>
      `;
    }

    return reading.map(book => {
      const pct       = book.totalPages ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100)) : 0;
      const pLeft     = book.totalPages ? book.totalPages - book.currentPage : null;
      const todayLogs = getLogs().filter(l => l.bookId === book.id && l.date === todayKey());
      const todayPgs  = todayLogs.reduce((s,l) => s + (l.pages||0), 0);

      return `
        <div style="border-radius:20px; overflow:hidden; margin-bottom:16px;
          border:1px solid rgba(167,139,250,0.2);
          background:linear-gradient(160deg,rgba(99,102,241,0.07),rgba(167,139,250,0.04));">

          <!-- Book header -->
          <div style="padding:20px 20px 16px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
              <div style="flex:1;">
                <div style="font-weight:900; font-size:1.1rem; color:#e5e7eb; line-height:1.3;">${esc(book.title)}</div>
                ${book.author ? `<div style="font-size:0.82rem; color:#6b7280; margin-top:3px;">${esc(book.author)}</div>` : ""}
              </div>
              ${todayPgs > 0 ? `
                <span style="font-size:0.72rem; padding:3px 10px; border-radius:20px; flex-shrink:0;
                  background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.3); color:#86efac; font-weight:800;">
                  +${todayPgs} today ✓
                </span>` : ""}
            </div>

            ${book.totalPages ? `
              <div style="margin-top:16px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:7px;">
                  <span style="font-size:0.78rem; color:#9ca3af;">
                    Page ${book.currentPage} of ${book.totalPages}
                    ${pLeft !== null ? ` · ${pLeft} left` : ""}
                  </span>
                  <span style="font-size:0.78rem; font-weight:900; color:#a78bfa;">${pct}%</span>
                </div>
                <div style="height:7px; border-radius:7px; background:rgba(255,255,255,0.07); overflow:hidden;">
                  <div style="height:100%; width:${pct}%;
                    background:linear-gradient(90deg,#6366f1,#a78bfa);
                    border-radius:7px; transition:width 0.5s;"></div>
                </div>
              </div>
            ` : ""}
          </div>

          <!-- Quick log -->
          <div style="padding:12px 20px 16px; border-top:1px solid rgba(255,255,255,0.06);
            background:rgba(0,0,0,0.12);">
            <div style="font-size:0.7rem; font-weight:900; letter-spacing:0.08em; color:#6b7280; margin-bottom:8px;">
              LOG TODAY'S SESSION
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <input id="bkPgs_${book.id}" type="number" min="1" max="999" placeholder="Pages read"
                onkeydown="if(event.key==='Enter') bkQuickLog('${book.id}')"
                style="flex:1; min-width:120px; padding:10px 12px; border-radius:10px;
                  border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.06);
                  color:white; outline:none; font-size:0.95rem;" />
              <input id="bkPg_${book.id}" type="number" min="0" placeholder="Now on page"
                value="${book.currentPage || ""}"
                style="width:110px; padding:10px 12px; border-radius:10px;
                  border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.06);
                  color:white; outline:none; font-size:0.95rem;" />
              <button onclick="bkQuickLog('${book.id}')" style="padding:10px 18px; border-radius:10px;
                border:none; cursor:pointer; font-weight:900; color:white; font-size:0.9rem;
                background:linear-gradient(135deg,rgba(99,102,241,0.9),rgba(167,139,250,0.8));">
                Log
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div style="padding:10px 20px 14px; display:flex; gap:8px; flex-wrap:wrap;">
            <button onclick="bkOpenNoteModal('${book.id}')" style="padding:7px 14px; border-radius:20px;
              font-size:0.78rem; font-weight:700; cursor:pointer;
              border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#9ca3af;">
              ✏️ Add Note
            </button>
            <button onclick="bkOpenFinishModal('${book.id}')" style="padding:7px 14px; border-radius:20px;
              font-size:0.78rem; font-weight:700; cursor:pointer;
              border:1px solid rgba(34,197,94,0.3); background:rgba(34,197,94,0.07); color:#86efac;">
              ✅ Mark Finished
            </button>
            <button onclick="bkDelete('${book.id}')" style="padding:7px 14px; border-radius:20px;
              font-size:0.78rem; font-weight:700; cursor:pointer;
              border:1px solid rgba(239,68,68,0.2); background:rgba(239,68,68,0.04); color:#ef4444;">
              Remove
            </button>
          </div>

        </div>
      `;
    }).join("");
  }

  // ── TAB 2: UP NEXT ────────────────────────────────────────────────────────

  function renderQueueTab(queue) {
    if (!queue.length) {
      return `
        <div style="padding:32px 20px; text-align:center; border-radius:16px;
          border:1px dashed rgba(255,255,255,0.08); background:rgba(255,255,255,0.02);">
          <div style="font-size:1.8rem; margin-bottom:10px;">📚</div>
          <div style="font-weight:800; color:#e5e7eb; margin-bottom:6px;">Queue is empty</div>
          <div style="font-size:0.85rem; color:#6b7280;">Add books you plan to read next.</div>
        </div>
      `;
    }
    return `<div style="display:grid; gap:8px;">` +
      queue.map((book, i) => `
        <div style="display:flex; align-items:center; gap:12px; padding:14px 16px;
          border-radius:14px; border:1px solid rgba(255,255,255,0.07);
          background:rgba(255,255,255,0.03);">
          <div style="width:30px; height:30px; border-radius:9px; flex-shrink:0;
            background:rgba(167,139,250,0.1); border:1px solid rgba(167,139,250,0.2);
            display:flex; align-items:center; justify-content:center;
            font-size:0.8rem; font-weight:900; color:#a78bfa;">${i+1}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:800; font-size:0.9rem; color:#e5e7eb;">${esc(book.title)}</div>
            ${book.author ? `<div style="font-size:0.77rem; color:#6b7280; margin-top:2px;">${esc(book.author)}</div>` : ""}
            ${book.totalPages ? `<div style="font-size:0.72rem; color:#4b5563; margin-top:2px;">${book.totalPages.toLocaleString()} pages</div>` : ""}
          </div>
          <div style="display:flex; gap:6px; flex-shrink:0;">
            <button onclick="bkStartReading('${book.id}')" style="padding:7px 12px; border-radius:20px;
              font-size:0.78rem; font-weight:800; cursor:pointer;
              border:1px solid rgba(167,139,250,0.35); background:rgba(167,139,250,0.1); color:#a78bfa;">
              Start
            </button>
            <button onclick="bkDelete('${book.id}')" style="width:28px; height:28px; border-radius:50%;
              border:1px solid rgba(239,68,68,0.2); background:rgba(239,68,68,0.05);
              color:#ef4444; cursor:pointer; font-size:0.78rem;
              display:flex; align-items:center; justify-content:center; flex-shrink:0;">✕</button>
          </div>
        </div>
      `).join("") + `</div>`;
  }

  // ── TAB 3: LIBRARY ────────────────────────────────────────────────────────

  function renderLibraryTab(finished) {
    if (!finished.length) {
      return `
        <div style="padding:32px 20px; text-align:center; border-radius:16px;
          border:1px dashed rgba(255,255,255,0.08); background:rgba(255,255,255,0.02);">
          <div style="font-size:1.8rem; margin-bottom:10px;">🏆</div>
          <div style="font-weight:800; color:#e5e7eb; margin-bottom:6px;">No finished books yet</div>
          <div style="font-size:0.85rem; color:#6b7280;">Finish your first book — it lives here forever.</div>
        </div>
      `;
    }
    return `
      <div style="margin-bottom:12px; font-size:0.82rem; color:#6b7280;">
        ${finished.length} book${finished.length!==1?"s":""} completed
      </div>
      <div style="display:grid; gap:8px;">
        ${[...finished].reverse().map(book => {
          const stars = book.rating ? "★".repeat(book.rating) + "☆".repeat(5-book.rating) : null;
          const nc = (book.notes||[]).length;
          return `
            <div style="padding:14px 16px; border-radius:14px;
              border:1px solid rgba(34,197,94,0.15); background:rgba(34,197,94,0.04);">
              <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:flex-start;">
                <div style="flex:1;">
                  <div style="font-weight:800; font-size:0.92rem; color:#e5e7eb;">${esc(book.title)}</div>
                  ${book.author ? `<div style="font-size:0.77rem; color:#6b7280; margin-top:2px;">${esc(book.author)}</div>` : ""}
                  ${stars ? `<div style="font-size:0.88rem; color:#f59e0b; margin-top:6px; letter-spacing:1px;">${stars}</div>` : ""}
                  ${book.takeaway ? `
                    <div style="font-size:0.82rem; color:#9ca3af; margin-top:8px;
                      padding:8px 12px; border-radius:8px; background:rgba(255,255,255,0.04);
                      border-left:2px solid rgba(167,139,250,0.4); font-style:italic; line-height:1.5;">
                      "${esc(book.takeaway)}"
                    </div>` : ""}
                </div>
                <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end; flex-shrink:0;">
                  ${nc > 0 ? `<span style="font-size:0.7rem; color:#6b7280;">${nc} note${nc!==1?"s":""}</span>` : ""}
                  <button onclick="bkOpenFinishModal('${book.id}')" style="padding:5px 12px; border-radius:20px;
                    font-size:0.75rem; font-weight:700; cursor:pointer;
                    border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#9ca3af;">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  // ── TAB 4: NOTES VAULT ────────────────────────────────────────────────────

  function renderNotesTab(books) {
    const allNotes = [];
    books.forEach(book => {
      (book.notes || []).forEach(n => {
        allNotes.push({ ...n, bookTitle: book.title, bookId: book.id });
      });
    });
    allNotes.sort((a, b) => b.createdAt - a.createdAt);

    if (!allNotes.length) {
      return `
        <div style="padding:32px 20px; text-align:center; border-radius:16px;
          border:1px dashed rgba(255,255,255,0.08); background:rgba(255,255,255,0.02);">
          <div style="font-size:1.8rem; margin-bottom:10px;">🗒</div>
          <div style="font-weight:800; color:#e5e7eb; margin-bottom:6px;">Notes vault is empty</div>
          <div style="font-size:0.85rem; color:#6b7280;">
            Add notes while reading. Ideas compound here.
          </div>
        </div>
      `;
    }

    // Group by book
    const byBook = {};
    allNotes.forEach(n => {
      if (!byBook[n.bookId]) byBook[n.bookId] = { title: n.bookTitle, notes: [] };
      byBook[n.bookId].notes.push(n);
    });

    return `
      <div style="margin-bottom:12px; font-size:0.82rem; color:#6b7280;">
        ${allNotes.length} note${allNotes.length!==1?"s":""} · ${Object.keys(byBook).length} book${Object.keys(byBook).length!==1?"s":""}
      </div>
      ${Object.values(byBook).map(group => `
        <div style="margin-bottom:18px;">
          <div style="font-size:0.7rem; font-weight:900; letter-spacing:0.09em; color:#a78bfa;
            text-transform:uppercase; margin-bottom:8px; padding-left:2px;">
            ${esc(group.title)}
          </div>
          <div style="display:grid; gap:6px;">
            ${group.notes.map(n => `
              <div style="padding:12px 14px; border-radius:12px;
                border:1px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.03);
                border-left:3px solid rgba(167,139,250,0.4);">
                <div style="display:flex; align-items:flex-start; gap:10px;">
                  <div style="flex:1;">
                    <div style="font-size:0.87rem; color:#e5e7eb; line-height:1.55;">${esc(n.text)}</div>
                    <div style="font-size:0.72rem; color:#4b5563; margin-top:6px;">
                      ${new Date(n.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                    </div>
                  </div>
                  <button onclick="bkDeleteNote('${n.bookId}','${n.id}')" style="
                    width:26px; height:26px; border-radius:50%; flex-shrink:0; margin-top:2px;
                    border:1px solid rgba(239,68,68,0.2); background:rgba(239,68,68,0.05);
                    color:#ef4444; cursor:pointer; font-size:0.78rem;
                    display:flex; align-items:center; justify-content:center;">✕</button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")}
    `;
  }

  // ── ACTIONS ───────────────────────────────────────────────────────────────

  window.bkSetTab = function(tab) { activeTab = tab; renderBooks(); };

  window.bkQuickLog = function(bookId) {
    const pInput  = document.getElementById(`bkPgs_${bookId}`);
    const pgInput = document.getElementById(`bkPg_${bookId}`);
    const pages   = parseInt(pInput?.value);
    const newPage = parseInt(pgInput?.value);

    if (!pages || pages < 1) { pInput?.focus(); return; }

    // Update book
    const books = getBooks();
    const book  = books.find(b => b.id === bookId);
    if (!book) return;

    // If "now on page" is filled, use it directly.
    // If not, auto-advance: currentPage + pages read today.
    if (!isNaN(newPage) && newPage >= 0) {
      book.currentPage = newPage;
    } else {
      book.currentPage = (book.currentPage || 0) + pages;
    }

    // Cap at totalPages
    if (book.totalPages && book.currentPage > book.totalPages) {
      book.currentPage = book.totalPages;
    }
    if (book.totalPages && book.currentPage >= book.totalPages) book.status = "finished";

    saveBooks(books);

    // Save log
    const logs = getLogs();
    logs.push({ id: uid(), bookId, date: todayKey(), pages, page: newPage || book.currentPage });
    saveLogs(logs);

    renderBooks();
  };

  window.bkStartReading = function(bookId) {
    const books = getBooks();
    const book  = books.find(b => b.id === bookId);
    if (!book) return;
    book.status = "reading";
    saveBooks(books);
    activeTab = "reading";
    renderBooks();
  };

  window.bkDelete = function(bookId) {
    if (!confirm("Remove this book?")) return;
    saveBooks(getBooks().filter(b => b.id !== bookId));
    renderBooks();
  };

  window.bkDeleteNote = function(bookId, noteId) {
    if (!confirm("Delete this note?")) return;
    const books = getBooks();
    const book  = books.find(b => b.id === bookId);
    if (!book) return;
    book.notes = (book.notes || []).filter(n => n.id !== noteId);
    saveBooks(books);
    renderBooks();
  };

  // ── MODALS ────────────────────────────────────────────────────────────────

  window.bkOpenAddModal = function(defaultStatus = "queue") {
    window.openModal(`
      <h2 style="margin-bottom:16px;">Add Book</h2>
      <div style="display:grid; gap:12px;">
        <div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Title *</div>
          <input id="bkAddTitle" class="form-input" style="width:100%;" placeholder="Book title"
            onkeydown="if(event.key==='Enter') bkSaveAdd()" />
        </div>
        <div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Author</div>
          <input id="bkAddAuthor" class="form-input" style="width:100%;" placeholder="Author name" />
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Total Pages</div>
            <input id="bkAddPages" type="number" class="form-input" style="width:100%;" placeholder="e.g. 320" />
          </div>
          <div>
            <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Add to</div>
            <select id="bkAddStatus" class="form-input" style="width:100%;">
              <option value="queue"   ${defaultStatus==="queue"   ?"selected":""}>Up Next</option>
              <option value="reading" ${defaultStatus==="reading" ?"selected":""}>Currently Reading</option>
            </select>
          </div>
        </div>
        <button onclick="bkSaveAdd()" class="form-submit" style="margin-top:4px;">Add Book</button>
      </div>
    `);
  };

  window.bkSaveAdd = function() {
    const title  = (document.getElementById("bkAddTitle")?.value  || "").trim();
    const author = (document.getElementById("bkAddAuthor")?.value || "").trim();
    const pages  = parseInt(document.getElementById("bkAddPages")?.value);
    const status = document.getElementById("bkAddStatus")?.value || "queue";
    if (!title) return alert("Title is required.");
    const books = getBooks();
    books.push({
      id: uid(), title, author, status,
      totalPages: isNaN(pages) ? 0 : pages,
      currentPage: 0,
      notes: [], rating: 0, takeaway: "",
      createdAt: Date.now(),
    });
    saveBooks(books);
    window.closeModal?.();
    if (status === "reading") activeTab = "reading";
    else activeTab = "queue";
    renderBooks();
  };

  window.bkOpenNoteModal = function(bookId) {
    const book = getBooks().find(b => b.id === bookId);
    if (!book) return;
    window.openModal(`
      <h2 style="margin-bottom:4px;">Add Note</h2>
      <div style="font-size:0.82rem; color:#6b7280; margin-bottom:14px;">${esc(book.title)}</div>
      <textarea id="bkNoteText" class="form-input"
        style="width:100%; min-height:120px; resize:vertical;"
        placeholder="Thought, quote, or insight..."></textarea>
      <button onclick="bkSaveNote('${bookId}')" class="form-submit"
        style="margin-top:12px; width:100%;">Save Note</button>
    `);
  };

  window.bkSaveNote = function(bookId) {
    const text = (document.getElementById("bkNoteText")?.value || "").trim();
    if (!text) return alert("Write something first.");
    const books = getBooks();
    const book  = books.find(b => b.id === bookId);
    if (!book) return;
    book.notes = book.notes || [];
    book.notes.push({ id: uid(), text, createdAt: Date.now() });
    saveBooks(books);
    window.closeModal?.();
    renderBooks();
  };

  window.bkOpenFinishModal = function(bookId) {
    const book = getBooks().find(b => b.id === bookId);
    if (!book) return;
    const editing = book.status === "finished";
    window.openModal(`
      <h2 style="margin-bottom:4px;">${editing ? "Edit Entry" : "Finished!"} 🎉</h2>
      <div style="font-size:0.82rem; color:#6b7280; margin-bottom:16px;">${esc(book.title)}</div>
      <div style="display:grid; gap:12px;">
        <div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Rating (1–5 stars)</div>
          <select id="bkFinRating" class="form-input" style="width:100%;">
            <option value="0">No rating</option>
            ${[1,2,3,4,5].map(n =>
              `<option value="${n}" ${book.rating===n?"selected":""}>${"★".repeat(n)} ${n}/5</option>`
            ).join("")}
          </select>
        </div>
        <div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">One-line takeaway</div>
          <input id="bkFinTakeaway" class="form-input" style="width:100%;"
            placeholder="The one thing you'll remember"
            value="${esc(book.takeaway||"")}" />
        </div>
        <button onclick="bkSaveFinish('${bookId}')" class="form-submit" style="margin-top:4px;">
          ${editing ? "Save Changes" : "Mark as Finished"}
        </button>
      </div>
    `);
  };

  window.bkSaveFinish = function(bookId) {
    const rating   = parseInt(document.getElementById("bkFinRating")?.value   || "0");
    const takeaway = (document.getElementById("bkFinTakeaway")?.value || "").trim();
    const books = getBooks();
    const book  = books.find(b => b.id === bookId);
    if (!book) return;
    book.status   = "finished";
    book.rating   = isNaN(rating) ? 0 : rating;
    book.takeaway = takeaway;
    saveBooks(books);
    window.closeModal?.();
    activeTab = "library";
    renderBooks();
  };

  // ── WIRE UP ───────────────────────────────────────────────────────────────

  window.renderBooks = renderBooks;

  if (App) {
    App.features.books = { render: renderBooks };
    App.on("books", renderBooks);
  }

  document.addEventListener("click", e => {
    if (e.target.closest?.(".nav-tab")) setTimeout(renderBooks, 80);
  });

})();
