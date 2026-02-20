// =====================================================
// BOOKS INTELLIGENCE SYSTEM (KP ELITE)
// - Want to Read → Currently Reading → Read
// - Progress tracking (pages + daily logs)
// - Daily reading streaks
// - Monthly analytics
// - Insight engine (pattern detection)
// - Gamification (XP, levels, achievements)
// - Knowledge extraction (notes + highlights)
// - Mount-safe (never wipes other modules)
// =====================================================

(function () {
  "use strict";

  const STORAGE_KEY = "booksData";
  const HISTORY_KEY = "booksProgressHistory";
  const GAME_KEY = "booksGamification";
  const MOUNT_ID = "booksMount";

  let chart = null;
  let monthlyChart = null;

  // --------------------------------------------------
  // MODAL HELPERS — use global modal if available,
  // otherwise fall back to a simple inline modal so
  // "Modal system missing" never fires.
  // --------------------------------------------------
  function openModal(html) {
    // Prefer the global modal wired up in index.html
    if (typeof window.openModal === "function" && window.openModal !== openModal) {
      window.openModal(html);
      return;
    }

    // Fallback: use the #modal element directly
    const modalEl = document.getElementById("modal");
    const bodyEl  = document.getElementById("modalBody");
    if (modalEl && bodyEl) {
      bodyEl.innerHTML = html;
      modalEl.style.display = "flex";
      return;
    }

    // Last resort: simple overlay
    let overlay = document.getElementById("_booksModalOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "_booksModalOverlay";
      overlay.style.cssText = `
        position:fixed; inset:0; z-index:9999;
        background:rgba(0,0,0,0.75);
        display:flex; align-items:center; justify-content:center;
      `;
      overlay.onclick = e => { if (e.target === overlay) closeModal(); };
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div style="
        background:#1a1a2e; border-radius:16px; padding:28px;
        max-width:600px; width:90%; max-height:80vh; overflow-y:auto;
        border:1px solid rgba(255,255,255,0.15); color:white; position:relative;
      ">
        <span onclick="(function(){document.getElementById('_booksModalOverlay').style.display='none'})()"
          style="position:absolute; top:14px; right:18px; cursor:pointer; font-size:1.4rem; color:#9CA3AF;">✕</span>
        ${html}
      </div>
    `;
    overlay.style.display = "flex";
  }

  function closeModal() {
    // Try global first
    if (typeof window.closeModal === "function" && window.closeModal !== closeModal) {
      window.closeModal();
      return;
    }
    // Fallback elements
    const modalEl = document.getElementById("modal");
    if (modalEl) { modalEl.style.display = "none"; return; }
    const overlay = document.getElementById("_booksModalOverlay");
    if (overlay) overlay.style.display = "none";
  }

  // --------------------------------------------------

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

  function loadGame() {
    try {
      return JSON.parse(localStorage.getItem(GAME_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveGame(data) {
    localStorage.setItem(GAME_KEY, JSON.stringify(data));
  }

  function uuid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function dayKeyFromDate(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  }

  function todayKey() {
    return dayKeyFromDate(new Date());
  }

  function monthKeyFromDay(dayMs) {
    const d = new Date(dayMs);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function clamp(n, min, max) {
    n = Number(n);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  // =====================================================
  // GAMIFICATION
  // =====================================================

  function ensureGameDefaults() {
    const game = loadGame();
    if (!game.xp) game.xp = 0;
    if (!Array.isArray(game.achievements)) game.achievements = [];
    if (!Array.isArray(game.milestones)) game.milestones = [];
    saveGame(game);
    return game;
  }

  function levelFromXP(xp) {
    return Math.floor((xp || 0) / 500) + 1;
  }

  function unlockAchievement(game, key) {
    if (!game.achievements.includes(key)) {
      game.achievements.push(key);
      saveGame(game);
    }
  }

  function computeAchievements(game, stats) {
    const pages = stats.totalPagesReadAllTime || 0;
    const books = stats.totalBooksRead || 0;
    const streak = stats.currentStreak || 0;
    const best = stats.bestStreak || 0;

    if (pages >= 50) unlockAchievement(game, "first-50");
    if (pages >= 250) unlockAchievement(game, "pages-250");
    if (pages >= 1000) unlockAchievement(game, "pages-1000");
    if (books >= 1) unlockAchievement(game, "first-book");
    if (books >= 5) unlockAchievement(game, "books-5");
    if (books >= 10) unlockAchievement(game, "books-10");
    if (streak >= 3) unlockAchievement(game, "streak-3");
    if (streak >= 7) unlockAchievement(game, "streak-7");
    if (best >= 14) unlockAchievement(game, "streak-14");
  }

  function achievementLabel(key) {
    const map = {
      "first-50": "Read 50 pages",
      "pages-250": "Read 250 pages",
      "pages-1000": "Read 1,000 pages",
      "first-book": "Finish 1 book",
      "books-5": "Finish 5 books",
      "books-10": "Finish 10 books",
      "streak-3": "3-day streak",
      "streak-7": "7-day streak",
      "streak-14": "14-day best streak"
    };
    return map[key] || key;
  }

  // =====================================================
  // INSIGHTS ENGINE
  // =====================================================

  function weekdayName(dayMs) {
    return new Date(dayMs).toLocaleDateString(undefined, { weekday: "short" });
  }

  function computeInsights(historyDailyTotals) {
    if (!historyDailyTotals.length) {
      return ["No reading data yet. Log pages for a few days and insights will appear."];
    }

    const byWeekday = {};
    historyDailyTotals.forEach(x => {
      const wd = weekdayName(x.day);
      byWeekday[wd] = byWeekday[wd] || { total: 0, days: 0 };
      byWeekday[wd].total += x.pages;
      byWeekday[wd].days += 1;
    });

    let bestDay = null;
    let bestAvg = 0;
    Object.keys(byWeekday).forEach(k => {
      const avg = byWeekday[k].total / byWeekday[k].days;
      if (avg > bestAvg) { bestAvg = avg; bestDay = k; }
    });

    const daysRead = historyDailyTotals.filter(x => x.pages > 0).length;
    const spanDays = Math.max(1, Math.round(
      (historyDailyTotals[historyDailyTotals.length - 1].day - historyDailyTotals[0].day) / 86400000
    ) + 1);
    const consistency = Math.round((daysRead / spanDays) * 100);

    const last14 = historyDailyTotals.slice(-14);
    const last7 = last14.slice(-7).reduce((a, b) => a + b.pages, 0);
    const prev7 = last14.slice(0, Math.max(0, last14.length - 7)).reduce((a, b) => a + b.pages, 0);
    const momentum = last7 > prev7 ? "up" : last7 < prev7 ? "down" : "flat";

    const insights = [];

    if (bestDay) insights.push(`Your strongest reading day is ${bestDay} (avg ${bestAvg.toFixed(1)} pages).`);
    insights.push(`Consistency: you read on about ${consistency}% of days in your tracked range.`);

    if (historyDailyTotals.length >= 14) {
      if (momentum === "up") insights.push("Momentum is rising: last 7 days beat the previous 7.");
      if (momentum === "down") insights.push("Momentum dipped: last 7 days are below the previous 7.");
      if (momentum === "flat") insights.push("Momentum is steady: last 7 days match the previous 7.");
    } else {
      insights.push("Track at least 14 days for momentum insights.");
    }

    const avgPerReadDay = Math.round(
      historyDailyTotals.reduce((a, b) => a + b.pages, 0) / Math.max(1, daysRead)
    );
    if (avgPerReadDay < 10) insights.push("Try a 10-page minimum daily rule for a week.");
    else if (avgPerReadDay < 25) insights.push("You're in a good zone. Push 5 extra pages on your best weekday.");
    else insights.push("High output. Consider tracking notes/highlights to compound learning.");

    return insights.slice(0, 5);
  }

  // =====================================================
  // STATS / ANALYTICS
  // =====================================================

  function buildDailyTotals(history) {
    const map = {};
    history.forEach(h => {
      const d = Number(h.day);
      const delta = Number(h.delta || 0);
      map[d] = (map[d] || 0) + Math.max(0, delta);
    });

    const days = Object.keys(map).map(Number).sort((a, b) => a - b);
    return days.map(day => ({ day, pages: map[day] }));
  }

  function computeStreak(dailyTotals) {
    const today = todayKey();
    const map = {};
    dailyTotals.forEach(x => { map[x.day] = x.pages; });

    let streak = 0;
    let cursor = today;
    while (map[cursor] > 0) {
      streak += 1;
      cursor -= 86400000;
    }

    let best = 0;
    let run = 0;
    const sorted = dailyTotals.slice().sort((a, b) => a.day - b.day);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].pages > 0) run += 1;
      else run = 0;
      if (run > best) best = run;
    }

    return { current: streak, best };
  }

  function computeMonthlyAnalytics(history) {
    const monthMap = {};
    const dayMapThisMonth = {};

    history.forEach(h => {
      const day = Number(h.day);
      const month = monthKeyFromDay(day);
      const delta = Math.max(0, Number(h.delta || 0));
      monthMap[month] = (monthMap[month] || 0) + delta;
    });

    const nowMonth = monthKeyFromDay(todayKey());
    history.forEach(h => {
      const day = Number(h.day);
      const month = monthKeyFromDay(day);
      if (month !== nowMonth) return;
      const delta = Math.max(0, Number(h.delta || 0));
      dayMapThisMonth[day] = (dayMapThisMonth[day] || 0) + delta;
    });

    const daysRead = Object.keys(dayMapThisMonth).filter(d => dayMapThisMonth[d] > 0).length;
    const pagesThisMonth = monthMap[nowMonth] || 0;
    const avg = daysRead ? (pagesThisMonth / daysRead) : 0;

    const monthTotals = Object.keys(monthMap).sort().map(m => ({ month: m, pages: monthMap[m] }));

    return {
      monthTotals,
      thisMonth: { month: nowMonth, pages: pagesThisMonth, daysRead, avg }
    };
  }

  function totalPagesReadAllTime(history) {
    return history.reduce((sum, h) => sum + Math.max(0, Number(h.delta || 0)), 0);
  }

  function totalBooksRead(books) {
    return books.filter(b => b.status === "read").length;
  }

  // =====================================================
  // GLOBAL API
  // =====================================================

  window.Books = window.Books || {};

  Books.addBook = function (title, author, pages, status) {
    if (!String(title || "").trim()) return;

    const books = loadBooks();
    books.push({
      id: uuid(),
      title: String(title).trim(),
      author: String(author || "").trim(),
      totalPages: Number(pages) || 0,
      currentPage: 0,
      status: status || "want",
      notes: [],
      highlights: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    saveBooks(books);
    renderBooks();
  };

  Books.moveBook = function (id, status) {
    const books = loadBooks();
    const book = books.find(b => b.id === id);
    if (!book) return;

    book.status = status;
    book.updatedAt = Date.now();

    saveBooks(books);
    renderBooks();
  };

  Books.deleteBook = function (id) {
    const books = loadBooks().filter(b => b.id !== id);
    saveBooks(books);
    renderBooks();
  };

  Books.updateProgress = function (id, newPage, dailyPagesOptional) {
    const books = loadBooks();
    const book = books.find(b => b.id === id);
    if (!book) return;

    const history = loadHistory();
    const t = todayKey();

    const current = clamp(newPage, 0, book.totalPages || 999999);

    const prevEntry = history
      .filter(h => h.bookId === id)
      .sort((a, b) => a.day - b.day)
      .slice(-1)[0];

    const prevPage = prevEntry ? Number(prevEntry.page || 0) : Number(book.currentPage || 0);

    let delta = 0;
    if (dailyPagesOptional !== undefined && dailyPagesOptional !== null && String(dailyPagesOptional).trim() !== "") {
      delta = Math.max(0, Number(dailyPagesOptional) || 0);
    } else {
      delta = Math.max(0, current - prevPage);
    }

    const todayEntry = history.find(h => h.bookId === id && Number(h.day) === t);

    if (todayEntry) {
      todayEntry.page = current;
      todayEntry.delta = delta;
    } else {
      history.push({ bookId: id, day: t, page: current, delta });
    }

    saveHistory(history);

    book.currentPage = current;
    book.updatedAt = Date.now();

    if (book.totalPages && book.currentPage >= book.totalPages) {
      book.status = "read";
    }

    saveBooks(books);

    const game = ensureGameDefaults();
    game.xp += delta;
    saveGame(game);

    renderBooks();
  };

  Books.addKnowledge = function (id, type, text) {
    const books = loadBooks();
    const book = books.find(b => b.id === id);
    if (!book) return;

    const entry = { id: uuid(), text: String(text || "").trim(), createdAt: Date.now() };
    if (!entry.text) return;

    if (type === "note") book.notes = Array.isArray(book.notes) ? book.notes : [];
    if (type === "highlight") book.highlights = Array.isArray(book.highlights) ? book.highlights : [];

    if (type === "note") book.notes.push(entry);
    if (type === "highlight") book.highlights.push(entry);

    book.updatedAt = Date.now();
    saveBooks(books);
    renderBooks();
  };

  Books.viewKnowledge = function (id) {
    const book = loadBooks().find(b => b.id === id);
    if (!book) return;

    const notes = (book.notes || []).slice().reverse();
    const highlights = (book.highlights || []).slice().reverse();

    openModal(`
      <div class="section-title">Knowledge: ${escapeHtml(book.title)}</div>

      <div style="margin-bottom:14px;">
        <div style="font-weight:800; margin-bottom:6px;">Notes (${notes.length})</div>
        ${notes.length ? notes.map(n => `
          <div class="idea-item" style="margin-bottom:8px;">
            <div style="color:#9CA3AF; font-size:0.8rem;">${new Date(n.createdAt).toLocaleString()}</div>
            <div>${escapeHtml(n.text)}</div>
          </div>
        `).join("") : `<div style="color:#9CA3AF;">No notes yet.</div>`}
      </div>

      <div>
        <div style="font-weight:800; margin-bottom:6px;">Highlights (${highlights.length})</div>
        ${highlights.length ? highlights.map(h => `
          <div class="idea-item" style="margin-bottom:8px;">
            <div style="color:#9CA3AF; font-size:0.8rem;">${new Date(h.createdAt).toLocaleString()}</div>
            <div>${escapeHtml(h.text)}</div>
          </div>
        `).join("") : `<div style="color:#9CA3AF;">No highlights yet.</div>`}
      </div>
    `);
  };

  // =====================================================
  // UI RENDER
  // =====================================================

  function renderBooks() {
    const mount = ensureMount();
    if (!mount) return;

    const books = loadBooks();
    const history = loadHistory();

    const current = books.filter(b => b.status === "current");
    const want = books.filter(b => b.status === "want");
    const read = books.filter(b => b.status === "read");

    const dailyTotals = buildDailyTotals(history);
    const streak = computeStreak(dailyTotals);
    const monthly = computeMonthlyAnalytics(history);

    const pagesAll = totalPagesReadAllTime(history);
    const booksReadCount = totalBooksRead(books);

    const game = ensureGameDefaults();
    const lvl = levelFromXP(game.xp);

    computeAchievements(game, {
      totalPagesReadAllTime: pagesAll,
      totalBooksRead: booksReadCount,
      currentStreak: streak.current,
      bestStreak: streak.best,
      monthPages: monthly.thisMonth.pages,
      daysReadThisMonth: monthly.thisMonth.daysRead
    });

    const insights = computeInsights(dailyTotals);

    mount.innerHTML = `
      <div class="habit-section">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
          <div>
            <div class="section-title">📚 Reading Dashboard</div>
            <div style="color:#9CA3AF;">
              Streak: <span style="color:#22c55e; font-weight:900;">${streak.current} day(s)</span>
              (Best: ${streak.best})
            </div>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <div class="content-stat-card" style="padding:12px 14px; min-width:160px;">
              <div style="color:#9CA3AF;">XP</div>
              <div style="font-size:1.2rem; font-weight:900;">${Number(game.xp).toLocaleString()}</div>
            </div>
            <div class="content-stat-card" style="padding:12px 14px; min-width:160px;">
              <div style="color:#9CA3AF;">Level</div>
              <div style="font-size:1.2rem; font-weight:900;">${lvl}</div>
            </div>
          </div>
        </div>

        <div class="content-stats" style="margin-top:14px;">
          <div class="content-stat-card">
            <div>Pages Read (All Time)</div>
            <div style="font-size:1.6rem; font-weight:900;">${Number(pagesAll).toLocaleString()}</div>
          </div>
          <div class="content-stat-card">
            <div>Books Finished</div>
            <div style="font-size:1.6rem; font-weight:900;">${booksReadCount}</div>
          </div>
          <div class="content-stat-card">
            <div>This Month</div>
            <div style="font-size:1.6rem; font-weight:900;">${monthly.thisMonth.pages} pages</div>
            <div style="color:#9CA3AF; font-size:0.85rem;">
              ${monthly.thisMonth.daysRead} day(s) • avg ${monthly.thisMonth.avg.toFixed(1)}/day
            </div>
          </div>
          <div class="content-stat-card">
            <div>Achievements</div>
            <div style="font-size:1.1rem; font-weight:900;">${game.achievements.length}</div>
            <button class="form-cancel" id="viewAchievementsBtn" style="margin-top:10px;">View</button>
          </div>
        </div>
      </div>

      <div class="habit-section">
        <div class="section-title">🧠 Insights</div>
        ${insights.map(x => `<div style="margin-bottom:8px;">• ${escapeHtml(x)}</div>`).join("")}
      </div>

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
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div class="section-title">📈 Book Progress</div>
          <select id="bookSelect" class="form-input" style="width:auto; min-width:220px;">
            ${current.map(b => `<option value="${b.id}">${escapeHtml(b.title)}</option>`).join("")}
            ${(!current.length && want.length) ? want.map(b => `<option value="${b.id}">${escapeHtml(b.title)}</option>`).join("") : ""}
            ${(!current.length && !want.length && read.length) ? read.map(b => `<option value="${b.id}">${escapeHtml(b.title)}</option>`).join("") : ""}
          </select>
        </div>
        <canvas id="booksChart" height="140"></canvas>
      </div>

      <div class="habit-section">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="section-title">📅 Monthly Pages Read</div>
        </div>
        <canvas id="booksMonthlyChart" height="140"></canvas>
      </div>
    `;

    bindEvents();
    renderProgressChart();
    renderMonthlyChart();
  }

  function renderBookCard(book) {
    const progress = book.totalPages ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
    const notesCount = (book.notes || []).length;
    const highlightsCount = (book.highlights || []).length;

    let buttons = "";

    if (book.status === "want") {
      buttons += `<button class="form-submit" data-action="move" data-id="${book.id}" data-status="current">Start Reading</button>`;
    }

    if (book.status === "current") {
      buttons += `<button class="form-submit" data-action="move" data-id="${book.id}" data-status="read">Mark Read</button>`;
      buttons += `<button class="form-cancel" data-action="progress" data-id="${book.id}">Update Progress</button>`;
    }

    buttons += `<button class="form-cancel" data-action="knowledge" data-id="${book.id}">Knowledge</button>`;
    buttons += `<button class="form-cancel" data-action="addNote" data-id="${book.id}">Add Note</button>`;
    buttons += `<button class="form-cancel" data-action="addHighlight" data-id="${book.id}">Add Highlight</button>`;
    buttons += `<button class="form-cancel" data-action="delete" data-id="${book.id}" style="color:#ef4444;">Delete</button>`;

    return `
      <div class="idea-item" style="margin-top:10px;">
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div style="min-width:260px;">
            <div style="font-weight:800;">${escapeHtml(book.title)}</div>
            <div style="color:#9CA3AF;">${escapeHtml(book.author || "")}</div>

            ${book.totalPages ? `
              <div style="color:#a78bfa; margin-top:6px;">
                ${book.currentPage}/${book.totalPages} pages (${progress}%)
              </div>
              <div style="margin-top:8px; height:6px; border-radius:6px; background:rgba(255,255,255,0.18); overflow:hidden;">
                <div style="height:100%; width:${progress}%; background:linear-gradient(135deg,#6366f1,#ec4899);"></div>
              </div>
            ` : `<div style="color:#9CA3AF; margin-top:6px;">Set total pages to track progress.</div>`}

            <div style="color:#9CA3AF; font-size:0.85rem; margin-top:8px;">
              Notes: ${notesCount} • Highlights: ${highlightsCount}
            </div>
          </div>

          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:flex-start;">
            ${buttons}
          </div>
        </div>
      </div>
    `;
  }

  // =====================================================
  // EVENTS + MODALS
  // =====================================================

  function bindEvents() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    const addBtn = mount.querySelector("#addBookBtn");
    if (addBtn) addBtn.onclick = openAddBookModal;

    const viewAch = mount.querySelector("#viewAchievementsBtn");
    if (viewAch) viewAch.onclick = openAchievementsModal;

    mount.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === "move") Books.moveBook(id, btn.dataset.status);
        if (action === "delete") Books.deleteBook(id);
        if (action === "progress") openProgressModal(id);
        if (action === "knowledge") Books.viewKnowledge(id);
        if (action === "addNote") openKnowledgeModal(id, "note");
        if (action === "addHighlight") openKnowledgeModal(id, "highlight");
      };
    });
  }

  function openAddBookModal() {
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
        <button class="form-cancel" id="cancelBook">Cancel</button>
      </div>
    `);

    setTimeout(() => {
      const saveBtn = document.getElementById("saveBook");
      const cancelBtn = document.getElementById("cancelBook");

      if (saveBtn) saveBtn.onclick = () => {
        Books.addBook(
          document.getElementById("bookTitle")?.value,
          document.getElementById("bookAuthor")?.value,
          document.getElementById("bookPages")?.value,
          document.getElementById("bookStatus")?.value
        );
        closeModal();
      };

      if (cancelBtn) cancelBtn.onclick = closeModal;
    }, 50);
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

      <div class="form-group">
        <label>Pages read today (optional)</label>
        <input id="pagesToday" type="number" class="form-input" placeholder="Example: 20">
        <div style="color:#9CA3AF; font-size:0.85rem; margin-top:6px;">
          If you fill this, it will log today's pages read even if your current page doesn't jump much.
        </div>
      </div>

      <div class="form-actions">
        <button class="form-submit" id="updateProgress">Update</button>
        <button class="form-cancel" id="cancelProgress">Cancel</button>
      </div>
    `);

    setTimeout(() => {
      const updateBtn = document.getElementById("updateProgress");
      const cancelBtn = document.getElementById("cancelProgress");

      if (updateBtn) updateBtn.onclick = () => {
        Books.updateProgress(
          id,
          document.getElementById("progressPage")?.value,
          document.getElementById("pagesToday")?.value
        );
        closeModal();
      };

      if (cancelBtn) cancelBtn.onclick = closeModal;
    }, 50);
  }

  function openKnowledgeModal(id, type) {
    const book = loadBooks().find(b => b.id === id);
    if (!book) return;

    const title = type === "note" ? "Add Note" : "Add Highlight";

    openModal(`
      <div class="section-title">${title}</div>
      <div style="color:#9CA3AF; margin-bottom:10px;">${escapeHtml(book.title)}</div>

      <div class="form-group">
        <label>${type === "note" ? "Note" : "Highlight"}</label>
        <textarea id="knowledgeText" class="form-input" rows="6" placeholder="Paste your notes/highlights here..."></textarea>
      </div>

      <div class="form-actions">
        <button class="form-submit" id="saveKnowledge">Save</button>
        <button class="form-cancel" id="cancelKnowledge">Cancel</button>
      </div>
    `);

    setTimeout(() => {
      const saveBtn = document.getElementById("saveKnowledge");
      const cancelBtn = document.getElementById("cancelKnowledge");

      if (saveBtn) saveBtn.onclick = () => {
        Books.addKnowledge(id, type, document.getElementById("knowledgeText")?.value);
        closeModal();
      };

      if (cancelBtn) cancelBtn.onclick = closeModal;
    }, 50);
  }

  function openAchievementsModal() {
    const game = ensureGameDefaults();
    const list = (game.achievements || []).slice().reverse();

    openModal(`
      <div class="section-title">Achievements</div>
      ${list.length ? list.map(a => `
        <div class="idea-item" style="margin-bottom:10px;">
          <div style="font-weight:900;">${escapeHtml(achievementLabel(a))}</div>
          <div style="color:#9CA3AF; font-size:0.85rem;">${escapeHtml(a)}</div>
        </div>
      `).join("") : `<div style="color:#9CA3AF;">No achievements unlocked yet.</div>`}
    `);
  }

  // =====================================================
  // CHARTS
  // =====================================================

  function renderProgressChart() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    const select = mount.querySelector("#bookSelect");
    const canvas = mount.querySelector("#booksChart");
    if (!select || !canvas) return;

    const books = loadBooks();
    const history = loadHistory();

    const bookId = select.value;
    const book = books.find(b => b.id === bookId);

    const series = history
      .filter(h => h.bookId === bookId)
      .sort((a, b) => a.day - b.day);

    const labels = series.map(h => new Date(h.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    const data = series.map(h => Number(h.page || 0));

    if (chart) chart.destroy();

    chart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: book ? `${book.title} (page)` : "Progress",
          data,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
      }
    });

    select.onchange = renderBooks;
  }

  function renderMonthlyChart() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;

    const canvas = mount.querySelector("#booksMonthlyChart");
    if (!canvas) return;

    const history = loadHistory();
    const monthly = computeMonthlyAnalytics(history);

    const last = monthly.monthTotals.slice(-8);
    const labels = last.map(x => x.month);
    const data = last.map(x => x.pages);

    if (monthlyChart) monthlyChart.destroy();

    monthlyChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Pages per month",
          data,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // =====================================================
  // NAV HOOK
  // =====================================================

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
