// ============================================
// READING LIST MODULE (Upgraded)
// Adds:
// - Reading Dashboard (top card)
// - Pages/day goal + "days left" estimate
// - Log pages today (streak + daily pages tracking)
// - Keeps your existing queue/reading/finished + modals
// ============================================

// ---------- Storage Keys ----------
const READING_LIST_KEY = "readingList";
const READING_TRACK_KEY = "readingTracking"; 
// readingTracking = {
//   pagesPerDayGoal: number,
//   daily: { "YYYY-MM-DD": { pages: number } },
//   streakBest: number
// }

// ---------- Utils ----------
function getDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

// ---------- Initialize reading list ----------
function initReadingListData() {
  if (!localStorage.getItem(READING_LIST_KEY)) {
    localStorage.setItem(
      READING_LIST_KEY,
      JSON.stringify({
        toRead: [],
        reading: [],
        finished: []
      })
    );
  }

  // tracking defaults
  if (!localStorage.getItem(READING_TRACK_KEY)) {
    localStorage.setItem(
      READING_TRACK_KEY,
      JSON.stringify({
        pagesPerDayGoal: 10,
        daily: {},
        streakBest: 0
      })
    );
  }
}

// ---------- Get / Save reading list ----------
function getReadingList() {
  try {
    return JSON.parse(localStorage.getItem(READING_LIST_KEY)) || {
      toRead: [],
      reading: [],
      finished: []
    };
  } catch {
    return { toRead: [], reading: [], finished: [] };
  }
}

function saveReadingList(data) {
  localStorage.setItem(READING_LIST_KEY, JSON.stringify(data));
}

// ---------- Tracking get/save ----------
function getReadingTracking() {
  try {
    return JSON.parse(localStorage.getItem(READING_TRACK_KEY)) || {
      pagesPerDayGoal: 10,
      daily: {},
      streakBest: 0
    };
  } catch {
    return { pagesPerDayGoal: 10, daily: {}, streakBest: 0 };
  }
}

function saveReadingTracking(tr) {
  localStorage.setItem(READING_TRACK_KEY, JSON.stringify(tr));
}

// ---------- Core helpers ----------
function calculateAverageRating(finishedBooks) {
  if (!finishedBooks || finishedBooks.length === 0) return "0.0";
  const total = finishedBooks.reduce((sum, book) => sum + (book.rating || 0), 0);
  return (total / finishedBooks.length).toFixed(1);
}

function renderStars(rating) {
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += i <= rating ? '<span class="star filled">★</span>' : '<span class="star">☆</span>';
  }
  return stars;
}

function getTopCurrentBook(data) {
  // pick the most recently started current book, else first
  if (!data.reading || data.reading.length === 0) return null;
  const sorted = [...data.reading].sort((a, b) => {
    const da = a.dateStarted ? new Date(a.dateStarted).getTime() : 0;
    const db = b.dateStarted ? new Date(b.dateStarted).getTime() : 0;
    return db - da;
  });
  return sorted[0];
}

// ---------- Reading streak / daily pages ----------
function getReadingStreak() {
  const tr = getReadingTracking();
  const daily = tr.daily || {};

  let streak = 0;
  const d = new Date();

  for (let i = 0; i < 3650; i++) {
    const key = getDayKey(d);
    const pages = daily[key]?.pages || 0;
    if (pages > 0) {
      streak++;
      d.setDate(d.getDate() - 1);
      continue;
    }
    break;
  }

  const best = Math.max(tr.streakBest || 0, streak);
  if (best !== tr.streakBest) {
    tr.streakBest = best;
    saveReadingTracking(tr);
  }

  return { streak, best };
}

function getPagesToday() {
  const tr = getReadingTracking();
  const key = getDayKey(new Date());
  return tr.daily?.[key]?.pages || 0;
}

// ---------- Render the reading list page ----------
function renderReadingList() {
  const container = document.getElementById("booksContainer");
  if (!container) return;

  const data = getReadingList();
  const tr = getReadingTracking();

  const top = getTopCurrentBook(data);
  const pagesToday = getPagesToday();
  const { streak, best } = getReadingStreak();

  // Estimate days left if we have pages + progress
  let estDays = null;
  let pagesLeft = null;
  if (top && top.pages) {
    const progress = clamp(top.progress || 0, 0, 100);
    const pagesReadEst = Math.round((progress / 100) * top.pages);
    pagesLeft = Math.max(0, top.pages - pagesReadEst);
    const goal = clamp(tr.pagesPerDayGoal || 10, 1, 500);
    estDays = goal ? Math.ceil(pagesLeft / goal) : null;
  }

  const dashboardCard = `
    <div style="
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.14);
      background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.08));
      padding: 16px;
      margin-bottom: 18px;
    ">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
        <div style="min-width:260px;">
          <div style="font-weight: 900; color: white; font-size: 1.1rem;">📚 Reading Dashboard</div>
          <div style="color:#9CA3AF; margin-top:6px;">
            ${top ? `Currently reading: <span style="color:white; font-weight:900;">${top.title}</span> by ${top.author}` : `No active book yet. Start one from “Want to Read”.`}
          </div>

          <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
            <div style="padding:10px 12px; border-radius:14px; background: rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.10);">
              <div style="font-weight:900; color:white; font-size:1.2rem;">${pagesToday}</div>
              <div style="color:#9CA3AF; font-size:0.85em;">Pages Today</div>
            </div>

            <div style="padding:10px 12px; border-radius:14px; background: rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.10);">
              <div style="font-weight:900; color:white; font-size:1.2rem;">${streak}</div>
              <div style="color:#9CA3AF; font-size:0.85em;">Streak</div>
            </div>

            <div style="padding:10px 12px; border-radius:14px; background: rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.10);">
              <div style="font-weight:900; color:white; font-size:1.2rem;">${best}</div>
              <div style="color:#9CA3AF; font-size:0.85em;">Best</div>
            </div>

            <div style="padding:10px 12px; border-radius:14px; background: rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.10);">
              <div style="font-weight:900; color:white; font-size:1.2rem;">${clamp(tr.pagesPerDayGoal || 10, 1, 500)}</div>
              <div style="color:#9CA3AF; font-size:0.85em;">Pages/Day Goal</div>
            </div>
          </div>
        </div>

        <div style="flex:1; min-width:260px; max-width:420px;">
          ${top ? `
            <div style="padding:12px; border-radius:14px; background: rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.10);">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <div style="font-weight:900; color:white;">Today’s Reading</div>
                <button onclick="openLogPagesModal('${top.id}')" class="book-action-btn" style="margin:0;">Log Pages</button>
              </div>

              <div style="margin-top:10px; color:#9CA3AF;">
                ${top.pages ? `
                  <div style="margin-bottom:6px;">
                    Pages left: <span style="color:white; font-weight:900;">${pagesLeft}</span>
                    ${estDays != null ? ` • Est: <span style="color:white; font-weight:900;">${estDays}</span> days` : ""}
                  </div>
                ` : `<div style="margin-bottom:6px;">Add total pages to get estimates.</div>`}

                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                  <div style="flex:1; min-width:180px;">
                    <div class="progress-bar">
                      <div class="progress-fill" style="width: ${clamp(top.progress || 0, 0, 100)}%"></div>
                    </div>
                    <div style="margin-top:6px; font-weight:900; color:white;">
                      ${clamp(top.progress || 0, 0, 100)}% complete
                    </div>
                  </div>

                  <button onclick="openGoalModal()" class="book-delete-btn" style="margin:0;">Set Goal</button>
                </div>

                <div style="margin-top:10px; opacity:0.85;">
                  Nudge: ${pagesToday === 0 ? "Read 10 pages now. Quick win." : "You already showed up—keep it alive."}
                </div>
              </div>
            </div>
          ` : `
            <div style="padding:12px; border-radius:14px; background: rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.10); color:#9CA3AF;">
              Start a book from your queue to unlock streaks + daily logging.
              <div style="margin-top:10px;">
                <button onclick="openAddBook()" class="add-book-btn" style="width:100%;">➕ Add Book</button>
              </div>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="reading-list-container">
      ${dashboardCard}

      <!-- Stats Overview -->
      <div class="reading-stats">
        <div class="reading-stat-card">
          <div class="stat-number">${data.toRead.length}</div>
          <div class="stat-label">To Read</div>
        </div>
        <div class="reading-stat-card">
          <div class="stat-number">${data.reading.length}</div>
          <div class="stat-label">Reading Now</div>
        </div>
        <div class="reading-stat-card">
          <div class="stat-number">${data.finished.length}</div>
          <div class="stat-label">Finished</div>
        </div>
        <div class="reading-stat-card">
          <div class="stat-number">${calculateAverageRating(data.finished)}</div>
          <div class="stat-label">Avg Rating</div>
        </div>
      </div>

      <!-- Add Book Button -->
      <button onclick="openAddBook()" class="add-book-btn">
        ➕ Add Book
      </button>

      <!-- Want to Read -->
      <div class="books-section">
        <div class="section-title">📚 Want to Read</div>
        <div class="books-grid">
          ${
            data.toRead.length === 0
              ? '<div class="empty-state">No books in queue. Add some books you want to read!</div>'
              : data.toRead.map((book) => renderBookCard(book, "toRead")).join("")
          }
        </div>
      </div>

      <!-- Currently Reading -->
      <div class="books-section">
        <div class="section-title">📖 Currently Reading</div>
        <div class="books-grid">
          ${
            data.reading.length === 0
              ? '<div class="empty-state">Start reading a book from your queue!</div>'
              : data.reading.map((book) => renderBookCard(book, "reading")).join("")
          }
        </div>
      </div>

      <!-- Finished -->
      <div class="books-section">
        <div class="section-title">✅ Finished</div>
        <div class="books-grid">
          ${
            data.finished.length === 0
              ? '<div class="empty-state">No books finished yet. Keep reading!</div>'
              : data.finished.map((book) => renderBookCard(book, "finished")).join("")
          }
        </div>
      </div>
    </div>
  `;
}

// ---------- Render individual book card ----------
function renderBookCard(book, status) {
  const progressBar =
    status === "reading"
      ? `
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${book.progress || 0}%"></div>
          </div>
          <div class="progress-text">${book.progress || 0}% complete</div>
        </div>
      `
      : "";

  const rating =
    status === "finished" && book.rating
      ? `
        <div class="book-rating">
          ${renderStars(book.rating)}
        </div>
      `
      : "";

  const notes = book.notes
    ? `
      <div class="book-notes">${book.notes.substring(0, 100)}${
        book.notes.length > 100 ? "..." : ""
      }</div>
    `
    : "";

  const actionButtons =
    status === "toRead"
      ? `
        <button onclick="moveToReading('${book.id}')" class="book-action-btn">Start Reading</button>
        <button onclick="deleteBook('${book.id}', 'toRead')" class="book-delete-btn">Delete</button>
      `
      : status === "reading"
      ? `
        <button onclick="openLogPagesModal('${book.id}')" class="book-action-btn">Log Pages</button>
        <button onclick="updateProgress('${book.id}')" class="book-action-btn">Update %</button>
        <button onclick="markAsFinished('${book.id}')" class="book-action-btn">Mark Finished</button>
        <button onclick="moveToQueue('${book.id}')" class="book-delete-btn">Move to Queue</button>
      `
      : `
        <button onclick="viewBookDetails('${book.id}')" class="book-action-btn">View Details</button>
        <button onclick="deleteBook('${book.id}', 'finished')" class="book-delete-btn">Delete</button>
      `;

  return `
    <div class="book-card">
      <div class="book-info">
        <div class="book-title">${book.title}</div>
        <div class="book-author">by ${book.author}</div>
        ${book.pages ? `<div class="book-pages">${book.pages} pages</div>` : ""}
        ${progressBar}
        ${rating}
        ${notes}
      </div>
      <div class="book-actions">
        ${actionButtons}
      </div>
    </div>
  `;
}

// ---------- Goal modal ----------
function openGoalModal() {
  const tr = getReadingTracking();
  const currentGoal = clamp(tr.pagesPerDayGoal || 10, 1, 500);

  const modalBody = document.getElementById("modalBody");
  modalBody.innerHTML = `
    <h2>Set Reading Goal</h2>
    <div class="form-group">
      <label>Pages per day</label>
      <input type="number" id="pagesPerDayGoal" class="form-input" min="1" max="500" value="${currentGoal}">
      <div style="color:#9CA3AF; margin-top:10px;">This is used for your streak + “days left” estimate.</div>
    </div>
    <div class="form-actions">
      <button onclick="saveGoal()" class="form-submit">Save</button>
      <button onclick="closeModal()" class="form-cancel">Cancel</button>
    </div>
  `;
  document.getElementById("modal").style.display = "block";
}

function saveGoal() {
  const v = parseInt(document.getElementById("pagesPerDayGoal").value, 10);
  if (!Number.isFinite(v) || v <= 0 || v > 500) {
    alert("Enter a valid goal (1–500 pages/day).");
    return;
  }
  const tr = getReadingTracking();
  tr.pagesPerDayGoal = v;
  saveReadingTracking(tr);
  closeModal();
  renderReadingList();
}

// ---------- Log Pages modal (new) ----------
function openLogPagesModal(bookId) {
  const data = getReadingList();
  const book = data.reading.find((b) => b.id === bookId);
  if (!book) return;

  const tr = getReadingTracking();
  const todayKey = getDayKey(new Date());
  const already = tr.daily?.[todayKey]?.pages || 0;

  const modalBody = document.getElementById("modalBody");
  modalBody.innerHTML = `
    <h2>Log Pages</h2>
    <div class="form-group">
      <label>${book.title}</label>
      <p style="color: #9CA3AF; margin: 10px 0;">by ${book.author}</p>
    </div>

    <div class="form-group">
      <label>Pages read today</label>
      <input type="number" id="pagesReadToday" class="form-input" min="0" max="2000" value="${already}">
      <div style="color:#9CA3AF; margin-top:10px;">This updates your streak and can help keep you consistent.</div>
    </div>

    <div class="form-actions">
      <button onclick="savePagesLog('${bookId}')" class="form-submit">Save</button>
      <button onclick="closeModal()" class="form-cancel">Cancel</button>
    </div>
  `;
  document.getElementById("modal").style.display = "block";
}

function savePagesLog(bookId) {
  const pages = parseInt(document.getElementById("pagesReadToday").value, 10);
  if (!Number.isFinite(pages) || pages < 0 || pages > 2000) {
    alert("Enter valid pages (0–2000).");
    return;
  }

  const tr = getReadingTracking();
  const todayKey = getDayKey(new Date());
  if (!tr.daily) tr.daily = {};
  tr.daily[todayKey] = { pages };
  saveReadingTracking(tr);

  closeModal();
  renderReadingList();
}

// ---------- Existing Add Book modal (unchanged, kept) ----------
function openAddBook() {
  const modalBody = document.getElementById("modalBody");
  modalBody.innerHTML = `
    <h2>Add New Book</h2>
    <div class="form-group">
      <label>Book Title *</label>
      <input type="text" id="bookTitle" class="form-input" placeholder="Enter book title">
    </div>
    <div class="form-group">
      <label>Author *</label>
      <input type="text" id="bookAuthor" class="form-input" placeholder="Enter author name">
    </div>
    <div class="form-group">
      <label>Number of Pages (Optional)</label>
      <input type="number" id="bookPages" class="form-input" placeholder="e.g., 350">
    </div>
    <div class="form-group">
      <label>Status</label>
      <select id="bookStatus" class="form-input">
        <option value="toRead">Want to Read</option>
        <option value="reading">Currently Reading</option>
        <option value="finished">Already Finished</option>
      </select>
    </div>
    <div id="progressField" style="display: none;">
      <div class="form-group">
        <label>Progress (%)</label>
        <input type="number" id="bookProgress" class="form-input" min="0" max="100" placeholder="0-100">
      </div>
    </div>
    <div id="ratingField" style="display: none;">
      <div class="form-group">
        <label>Rating (Optional)</label>
        <div class="star-rating" id="starRating">
          ${[1, 2, 3, 4, 5].map(i => `<span class="star-select" onclick="selectRating(${i})">☆</span>`).join("")}
        </div>
        <input type="hidden" id="bookRating" value="0">
      </div>
      <div class="form-group">
        <label>Notes/Review (Optional)</label>
        <textarea id="bookNotes" class="form-input" rows="4" placeholder="Your thoughts about this book..."></textarea>
      </div>
    </div>
    <div class="form-actions">
      <button onclick="saveNewBook()" class="form-submit">Add Book</button>
      <button onclick="closeModal()" class="form-cancel">Cancel</button>
    </div>
  `;

  document.getElementById("bookStatus").addEventListener("change", function () {
    const status = this.value;
    document.getElementById("progressField").style.display = status === "reading" ? "block" : "none";
    document.getElementById("ratingField").style.display = status === "finished" ? "block" : "none";
  });

  document.getElementById("modal").style.display = "block";
}

// Select star rating (existing)
let selectedRating = 0;
function selectRating(rating) {
  selectedRating = rating;
  document.getElementById("bookRating").value = rating;
  const stars = document.querySelectorAll(".star-select");
  stars.forEach((star, index) => {
    star.textContent = index < rating ? "★" : "☆";
    star.style.color = index < rating ? "#ffffff" : "#6B7280";
  });
}

// Save new book (existing)
function saveNewBook() {
  const title = document.getElementById("bookTitle").value.trim();
  const author = document.getElementById("bookAuthor").value.trim();
  const pages = document.getElementById("bookPages").value;
  const status = document.getElementById("bookStatus").value;
  const progress = document.getElementById("bookProgress").value || 0;
  const rating = document.getElementById("bookRating").value || 0;
  const notes = document.getElementById("bookNotes").value.trim();

  if (!title || !author) {
    alert("Please enter both title and author");
    return;
  }

  const book = {
    id: Date.now().toString(),
    title,
    author,
    pages: pages ? parseInt(pages, 10) : null,
    progress: status === "reading" ? parseInt(progress, 10) : null,
    rating: status === "finished" ? parseInt(rating, 10) : null,
    notes: status === "finished" ? notes : null,
    dateAdded: new Date().toISOString()
  };

  const data = getReadingList();
  data[status].push(book);
  saveReadingList(data);

  closeModal();
  renderReadingList();
}

// ---------- Move book to reading ----------
function moveToReading(bookId) {
  const data = getReadingList();
  const bookIndex = data.toRead.findIndex((b) => b.id === bookId);
  if (bookIndex !== -1) {
    const book = data.toRead.splice(bookIndex, 1)[0];
    book.progress = 0;
    book.dateStarted = new Date().toISOString();
    data.reading.push(book);
    saveReadingList(data);
    renderReadingList();
  }
}

// ---------- Move book back to queue ----------
function moveToQueue(bookId) {
  const data = getReadingList();
  const bookIndex = data.reading.findIndex((b) => b.id === bookId);
  if (bookIndex !== -1) {
    const book = data.reading.splice(bookIndex, 1)[0];
    delete book.progress;
    delete book.dateStarted;
    data.toRead.push(book);
    saveReadingList(data);
    renderReadingList();
  }
}

// ---------- Update reading progress (existing) ----------
function updateProgress(bookId) {
  const data = getReadingList();
  const book = data.reading.find((b) => b.id === bookId);
  if (!book) return;

  const modalBody = document.getElementById("modalBody");
  modalBody.innerHTML = `
    <h2>Update Progress</h2>
    <div class="form-group">
      <label>${book.title}</label>
      <p style="color: #9CA3AF; margin: 10px 0;">by ${book.author}</p>
    </div>
    <div class="form-group">
      <label>Progress (%)</label>
      <input type="number" id="updateProgressValue" class="form-input" min="0" max="100" value="${book.progress || 0}">
      <div class="progress-container" style="margin-top: 10px;">
        <div class="progress-bar">
          <div class="progress-fill" id="previewProgress" style="width: ${book.progress || 0}%"></div>
        </div>
      </div>
    </div>
    <div class="form-actions">
      <button onclick="saveProgress('${bookId}')" class="form-submit">Update</button>
      <button onclick="closeModal()" class="form-cancel">Cancel</button>
    </div>
  `;

  document.getElementById("updateProgressValue").addEventListener("input", function () {
    document.getElementById("previewProgress").style.width = this.value + "%";
  });

  document.getElementById("modal").style.display = "block";
}

function saveProgress(bookId) {
  const newProgress = parseInt(document.getElementById("updateProgressValue").value, 10);
  if (Number.isNaN(newProgress) || newProgress < 0 || newProgress > 100) {
    alert("Please enter a valid progress (0-100)");
    return;
  }

  const data = getReadingList();
  const book = data.reading.find((b) => b.id === bookId);
  if (book) {
    book.progress = newProgress;
    saveReadingList(data);
    closeModal();
    renderReadingList();
  }
}

// ---------- Mark book as finished (existing) ----------
function markAsFinished(bookId) {
  const data = getReadingList();
  const bookIndex = data.reading.findIndex((b) => b.id === bookId);
  if (bookIndex !== -1) {
    const book = data.reading.splice(bookIndex, 1)[0];
    delete book.progress;
    book.dateFinished = new Date().toISOString();
    openRatingModal(book, data);
  }
}

// ---------- Rating modal (existing) ----------
function openRatingModal(book, data) {
  const modalBody = document.getElementById("modalBody");
  modalBody.innerHTML = `
    <h2>Finished Reading!</h2>
    <div class="form-group">
      <label>${book.title}</label>
      <p style="color: #9CA3AF; margin: 10px 0;">by ${book.author}</p>
    </div>
    <div class="form-group">
      <label>Rate this book</label>
      <div class="star-rating" id="finishRating" style="font-size: 2em; text-align: center; margin: 20px 0;">
        ${[1,2,3,4,5].map(i => `<span class="star-select" onclick="selectFinishRating(${i})" style="cursor: pointer; margin: 0 5px;">☆</span>`).join("")}
      </div>
      <input type="hidden" id="finishBookRating" value="0">
    </div>
    <div class="form-group">
      <label>Notes/Review (Optional)</label>
      <textarea id="finishBookNotes" class="form-input" rows="5" placeholder="What did you think about this book?"></textarea>
    </div>
    <div class="form-actions">
      <button onclick="saveFinishedBook('${book.id}')" class="form-submit">Save</button>
      <button onclick="skipRating('${book.id}')" class="form-cancel">Skip Rating</button>
    </div>
  `;

  window.tempFinishedBook = { book, data };
  document.getElementById("modal").style.display = "block";
}

function selectFinishRating(rating) {
  document.getElementById("finishBookRating").value = rating;
  const stars = document.querySelectorAll("#finishRating .star-select");
  stars.forEach((star, index) => {
    star.textContent = index < rating ? "★" : "☆";
    star.style.color = index < rating ? "#ffffff" : "#6B7280";
  });
}

function saveFinishedBook(bookId) {
  const rating = parseInt(document.getElementById("finishBookRating").value, 10);
  const notes = document.getElementById("finishBookNotes").value.trim();

  if (rating === 0) {
    alert("Please select a rating");
    return;
  }

  const { book, data } = window.tempFinishedBook;
  book.rating = rating;
  book.notes = notes || null;
  data.finished.push(book);
  saveReadingList(data);

  delete window.tempFinishedBook;
  closeModal();
  renderReadingList();
}

function skipRating(bookId) {
  const { book, data } = window.tempFinishedBook;
  book.rating = 0;
  data.finished.push(book);
  saveReadingList(data);

  delete window.tempFinishedBook;
  closeModal();
  renderReadingList();
}

// ---------- View / Edit details (existing) ----------
function viewBookDetails(bookId) {
  const data = getReadingList();
  const book = data.finished.find((b) => b.id === bookId);
  if (!book) return;

  const modalBody = document.getElementById("modalBody");
  modalBody.innerHTML = `
    <h2>${book.title}</h2>
    <div style="color: #9CA3AF; margin-bottom: 20px;">by ${book.author}</div>
    ${book.pages ? `<div style="margin-bottom: 15px;"><strong>Pages:</strong> ${book.pages}</div>` : ""}
    ${book.rating ? `
      <div style="margin-bottom: 15px;">
        <strong>Your Rating:</strong><br>
        <div style="font-size: 1.5em; margin-top: 5px;">${renderStars(book.rating)}</div>
      </div>
    ` : ""}
    ${book.dateFinished ? `
      <div style="margin-bottom: 15px;">
        <strong>Finished:</strong> ${new Date(book.dateFinished).toLocaleDateString()}
      </div>
    ` : ""}
    ${book.notes ? `
      <div style="margin-top: 20px;">
        <strong>Your Notes:</strong>
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-top: 10px; white-space: pre-wrap;">
          ${book.notes}
        </div>
      </div>
    ` : ""}
    <div class="form-actions" style="margin-top: 30px;">
      <button onclick="editBookDetails('${bookId}')" class="form-submit">Edit</button>
      <button onclick="closeModal()" class="form-cancel">Close</button>
    </div>
  `;

  document.getElementById("modal").style.display = "block";
}

function editBookDetails(bookId) {
  const data = getReadingList();
  const book = data.finished.find((b) => b.id === bookId);
  if (!book) return;

  const modalBody = document.getElementById("modalBody");
  modalBody.innerHTML = `
    <h2>Edit Book</h2>
    <div class="form-group">
      <label>Rating</label>
      <div class="star-rating" id="editRating" style="font-size: 2em; text-align: center; margin: 20px 0;">
        ${[1,2,3,4,5].map(i => `
          <span class="star-select" onclick="selectEditRating(${i})" style="cursor: pointer; margin: 0 5px; color: ${i <= (book.rating || 0) ? "#ffffff" : "#6B7280"};">
            ${i <= (book.rating || 0) ? "★" : "☆"}
          </span>
        `).join("")}
      </div>
      <input type="hidden" id="editBookRating" value="${book.rating || 0}">
    </div>
    <div class="form-group">
      <label>Notes/Review</label>
      <textarea id="editBookNotes" class="form-input" rows="5">${book.notes || ""}</textarea>
    </div>
    <div class="form-actions">
      <button onclick="saveEditedBook('${bookId}')" class="form-submit">Save Changes</button>
      <button onclick="closeModal()" class="form-cancel">Cancel</button>
    </div>
  `;
  document.getElementById("modal").style.display = "block";
}

function selectEditRating(rating) {
  document.getElementById("editBookRating").value = rating;
  const stars = document.querySelectorAll("#editRating .star-select");
  stars.forEach((star, index) => {
    star.textContent = index < rating ? "★" : "☆";
    star.style.color = index < rating ? "#ffffff" : "#6B7280";
  });
}

function saveEditedBook(bookId) {
  const rating = parseInt(document.getElementById("editBookRating").value, 10);
  const notes = document.getElementById("editBookNotes").value.trim();

  const data = getReadingList();
  const book = data.finished.find((b) => b.id === bookId);
  if (book) {
    book.rating = rating || 0;
    book.notes = notes || null;
    saveReadingList(data);
    closeModal();
    renderReadingList();
  }
}

// ---------- Delete book ----------
function deleteBook(bookId, status) {
  if (!confirm("Are you sure you want to delete this book?")) return;

  const data = getReadingList();
  const bookIndex = data[status].findIndex((b) => b.id === bookId);
  if (bookIndex !== -1) {
    data[status].splice(bookIndex, 1);
    saveReadingList(data);
    renderReadingList();
  }
}
