// ============================================
// READING LIST MODULE
// ============================================

// Initialize reading list data
function initReadingListData() {
    if (!localStorage.getItem('readingList')) {
        localStorage.setItem('readingList', JSON.stringify({
            toRead: [],
            reading: [],
            finished: []
        }));
    }
}

// Get reading list data
function getReadingList() {
    return JSON.parse(localStorage.getItem('readingList')) || {
        toRead: [],
        reading: [],
        finished: []
    };
}

// Save reading list data
function saveReadingList(data) {
    localStorage.setItem('readingList', JSON.stringify(data));
}

// Render the reading list page
function renderReadingList() {
    const container = document.getElementById('booksContainer');
    if (!container) return;

    const data = getReadingList();

    container.innerHTML = `
        <div class="reading-list-container">
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

            <!-- Want to Read Section -->
            <div class="books-section">
                <div class="section-title">📚 Want to Read</div>
                <div class="books-grid">
                    ${data.toRead.length === 0 ? 
                        '<div class="empty-state">No books in queue. Add some books you want to read!</div>' :
                        data.toRead.map(book => renderBookCard(book, 'toRead')).join('')
                    }
                </div>
            </div>

            <!-- Currently Reading Section -->
            <div class="books-section">
                <div class="section-title">📖 Currently Reading</div>
                <div class="books-grid">
                    ${data.reading.length === 0 ?
                        '<div class="empty-state">Start reading a book from your queue!</div>' :
                        data.reading.map(book => renderBookCard(book, 'reading')).join('')
                    }
                </div>
            </div>

            <!-- Finished Section -->
            <div class="books-section">
                <div class="section-title">✅ Finished</div>
                <div class="books-grid">
                    ${data.finished.length === 0 ?
                        '<div class="empty-state">No books finished yet. Keep reading!</div>' :
                        data.finished.map(book => renderBookCard(book, 'finished')).join('')
                    }
                </div>
            </div>
        </div>
    `;
}

// Render individual book card
function renderBookCard(book, status) {
    const progressBar = status === 'reading' ? `
        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${book.progress || 0}%"></div>
            </div>
            <div class="progress-text">${book.progress || 0}% complete</div>
        </div>
    ` : '';

    const rating = status === 'finished' && book.rating ? `
        <div class="book-rating">
            ${renderStars(book.rating)}
        </div>
    ` : '';

    const notes = book.notes ? `
        <div class="book-notes">${book.notes.substring(0, 100)}${book.notes.length > 100 ? '...' : ''}</div>
    ` : '';

    const actionButtons = status === 'toRead' ? `
        <button onclick="moveToReading('${book.id}')" class="book-action-btn">Start Reading</button>
        <button onclick="deleteBook('${book.id}', 'toRead')" class="book-delete-btn">Delete</button>
    ` : status === 'reading' ? `
        <button onclick="updateProgress('${book.id}')" class="book-action-btn">Update Progress</button>
        <button onclick="markAsFinished('${book.id}')" class="book-action-btn">Mark Finished</button>
        <button onclick="moveToQueue('${book.id}')" class="book-delete-btn">Move to Queue</button>
    ` : `
        <button onclick="viewBookDetails('${book.id}')" class="book-action-btn">View Details</button>
        <button onclick="deleteBook('${book.id}', 'finished')" class="book-delete-btn">Delete</button>
    `;

    return `
        <div class="book-card">
            <div class="book-info">
                <div class="book-title">${book.title}</div>
                <div class="book-author">by ${book.author}</div>
                ${book.pages ? `<div class="book-pages">${book.pages} pages</div>` : ''}
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

// Render star rating
function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<span class="star filled">★</span>';
        } else {
            stars += '<span class="star">☆</span>';
        }
    }
    return stars;
}

// Calculate average rating
function calculateAverageRating(finishedBooks) {
    if (finishedBooks.length === 0) return '0.0';
    const total = finishedBooks.reduce((sum, book) => sum + (book.rating || 0), 0);
    return (total / finishedBooks.length).toFixed(1);
}

// Open add book modal
function openAddBook() {
    const modalBody = document.getElementById('modalBody');
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
                    ${[1, 2, 3, 4, 5].map(i => `<span class="star-select" onclick="selectRating(${i})">☆</span>`).join('')}
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

    // Add event listener for status change
    document.getElementById('bookStatus').addEventListener('change', function() {
        const status = this.value;
        document.getElementById('progressField').style.display = status === 'reading' ? 'block' : 'none';
        document.getElementById('ratingField').style.display = status === 'finished' ? 'block' : 'none';
    });

    document.getElementById('modal').style.display = 'block';
}

// Select star rating
let selectedRating = 0;
function selectRating(rating) {
    selectedRating = rating;
    document.getElementById('bookRating').value = rating;
    const stars = document.querySelectorAll('.star-select');
    stars.forEach((star, index) => {
        star.textContent = index < rating ? '★' : '☆';
        star.style.color = index < rating ? '#ffffff' : '#6B7280';
    });
}

// Save new book
function saveNewBook() {
    const title = document.getElementById('bookTitle').value.trim();
    const author = document.getElementById('bookAuthor').value.trim();
    const pages = document.getElementById('bookPages').value;
    const status = document.getElementById('bookStatus').value;
    const progress = document.getElementById('bookProgress').value || 0;
    const rating = document.getElementById('bookRating').value || 0;
    const notes = document.getElementById('bookNotes').value.trim();

    if (!title || !author) {
        alert('Please enter both title and author');
        return;
    }

    const book = {
        id: Date.now().toString(),
        title,
        author,
        pages: pages ? parseInt(pages) : null,
        progress: status === 'reading' ? parseInt(progress) : null,
        rating: status === 'finished' ? parseInt(rating) : null,
        notes: status === 'finished' ? notes : null,
        dateAdded: new Date().toISOString()
    };

    const data = getReadingList();
    data[status].push(book);
    saveReadingList(data);

    closeModal();
    renderReadingList();
}

// Move book to reading
function moveToReading(bookId) {
    const data = getReadingList();
    const bookIndex = data.toRead.findIndex(b => b.id === bookId);
    if (bookIndex !== -1) {
        const book = data.toRead.splice(bookIndex, 1)[0];
        book.progress = 0;
        book.dateStarted = new Date().toISOString();
        data.reading.push(book);
        saveReadingList(data);
        renderReadingList();
    }
}

// Move book back to queue
function moveToQueue(bookId) {
    const data = getReadingList();
    const bookIndex = data.reading.findIndex(b => b.id === bookId);
    if (bookIndex !== -1) {
        const book = data.reading.splice(bookIndex, 1)[0];
        delete book.progress;
        delete book.dateStarted;
        data.toRead.push(book);
        saveReadingList(data);
        renderReadingList();
    }
}

// Update reading progress
function updateProgress(bookId) {
    const data = getReadingList();
    const book = data.reading.find(b => b.id === bookId);
    if (!book) return;

    const modalBody = document.getElementById('modalBody');
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

    // Update preview as user types
    document.getElementById('updateProgressValue').addEventListener('input', function() {
        document.getElementById('previewProgress').style.width = this.value + '%';
    });

    document.getElementById('modal').style.display = 'block';
}

// Save progress update
function saveProgress(bookId) {
    const newProgress = parseInt(document.getElementById('updateProgressValue').value);
    if (isNaN(newProgress) || newProgress < 0 || newProgress > 100) {
        alert('Please enter a valid progress (0-100)');
        return;
    }

    const data = getReadingList();
    const book = data.reading.find(b => b.id === bookId);
    if (book) {
        book.progress = newProgress;
        saveReadingList(data);
        closeModal();
        renderReadingList();
    }
}

// Mark book as finished
function markAsFinished(bookId) {
    const data = getReadingList();
    const bookIndex = data.reading.findIndex(b => b.id === bookId);
    if (bookIndex !== -1) {
        const book = data.reading.splice(bookIndex, 1)[0];
        delete book.progress;
        book.dateFinished = new Date().toISOString();

        // Open rating modal
        openRatingModal(book, data);
    }
}

// Open rating modal
function openRatingModal(book, data) {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2>Finished Reading!</h2>
        <div class="form-group">
            <label>${book.title}</label>
            <p style="color: #9CA3AF; margin: 10px 0;">by ${book.author}</p>
        </div>
        <div class="form-group">
            <label>Rate this book</label>
            <div class="star-rating" id="finishRating" style="font-size: 2em; text-align: center; margin: 20px 0;">
                ${[1, 2, 3, 4, 5].map(i => `<span class="star-select" onclick="selectFinishRating(${i})" style="cursor: pointer; margin: 0 5px;">☆</span>`).join('')}
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

    // Store book temporarily
    window.tempFinishedBook = { book, data };

    document.getElementById('modal').style.display = 'block';
}

// Select finish rating
function selectFinishRating(rating) {
    document.getElementById('finishBookRating').value = rating;
    const stars = document.querySelectorAll('#finishRating .star-select');
    stars.forEach((star, index) => {
        star.textContent = index < rating ? '★' : '☆';
        star.style.color = index < rating ? '#ffffff' : '#6B7280';
    });
}

// Save finished book with rating
function saveFinishedBook(bookId) {
    const rating = parseInt(document.getElementById('finishBookRating').value);
    const notes = document.getElementById('finishBookNotes').value.trim();

    if (rating === 0) {
        alert('Please select a rating');
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

// Skip rating
function skipRating(bookId) {
    const { book, data } = window.tempFinishedBook;
    book.rating = 0;
    data.finished.push(book);
    saveReadingList(data);

    delete window.tempFinishedBook;
    closeModal();
    renderReadingList();
}

// View book details
function viewBookDetails(bookId) {
    const data = getReadingList();
    const book = data.finished.find(b => b.id === bookId);
    if (!book) return;

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2>${book.title}</h2>
        <div style="color: #9CA3AF; margin-bottom: 20px;">by ${book.author}</div>
        
        ${book.pages ? `<div style="margin-bottom: 15px;"><strong>Pages:</strong> ${book.pages}</div>` : ''}
        
        ${book.rating ? `
            <div style="margin-bottom: 15px;">
                <strong>Your Rating:</strong><br>
                <div style="font-size: 1.5em; margin-top: 5px;">${renderStars(book.rating)}</div>
            </div>
        ` : ''}
        
        ${book.dateFinished ? `
            <div style="margin-bottom: 15px;">
                <strong>Finished:</strong> ${new Date(book.dateFinished).toLocaleDateString()}
            </div>
        ` : ''}
        
        ${book.notes ? `
            <div style="margin-top: 20px;">
                <strong>Your Notes:</strong>
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-top: 10px; white-space: pre-wrap;">
                    ${book.notes}
                </div>
            </div>
        ` : ''}
        
        <div class="form-actions" style="margin-top: 30px;">
            <button onclick="editBookDetails('${bookId}')" class="form-submit">Edit</button>
            <button onclick="closeModal()" class="form-cancel">Close</button>
        </div>
    `;

    document.getElementById('modal').style.display = 'block';
}

// Edit book details
function editBookDetails(bookId) {
    const data = getReadingList();
    const book = data.finished.find(b => b.id === bookId);
    if (!book) return;

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2>Edit Book</h2>
        <div class="form-group">
            <label>Rating</label>
            <div class="star-rating" id="editRating" style="font-size: 2em; text-align: center; margin: 20px 0;">
                ${[1, 2, 3, 4, 5].map(i => `
                    <span class="star-select" onclick="selectEditRating(${i})" style="cursor: pointer; margin: 0 5px; color: ${i <= (book.rating || 0) ? '#ffffff' : '#6B7280'};">
                        ${i <= (book.rating || 0) ? '★' : '☆'}
                    </span>
                `).join('')}
            </div>
            <input type="hidden" id="editBookRating" value="${book.rating || 0}">
        </div>
        <div class="form-group">
            <label>Notes/Review</label>
            <textarea id="editBookNotes" class="form-input" rows="5">${book.notes || ''}</textarea>
        </div>
        <div class="form-actions">
            <button onclick="saveEditedBook('${bookId}')" class="form-submit">Save Changes</button>
            <button onclick="closeModal()" class="form-cancel">Cancel</button>
        </div>
    `;

    document.getElementById('modal').style.display = 'block';
}

// Select edit rating
function selectEditRating(rating) {
    document.getElementById('editBookRating').value = rating;
    const stars = document.querySelectorAll('#editRating .star-select');
    stars.forEach((star, index) => {
        star.textContent = index < rating ? '★' : '☆';
        star.style.color = index < rating ? '#ffffff' : '#6B7280';
    });
}

// Save edited book
function saveEditedBook(bookId) {
    const rating = parseInt(document.getElementById('editBookRating').value);
    const notes = document.getElementById('editBookNotes').value.trim();

    const data = getReadingList();
    const book = data.finished.find(b => b.id === bookId);
    if (book) {
        book.rating = rating || 0;
        book.notes = notes || null;
        saveReadingList(data);
        closeModal();
        renderReadingList();
    }
}

// Delete book
function deleteBook(bookId, status) {
    if (!confirm('Are you sure you want to delete this book?')) return;

    const data = getReadingList();
    const bookIndex = data[status].findIndex(b => b.id === bookId);
    if (bookIndex !== -1) {
        data[status].splice(bookIndex, 1);
        saveReadingList(data);
        renderReadingList();
    }
}
