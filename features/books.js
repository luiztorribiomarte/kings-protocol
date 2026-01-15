// ============================================
// BOOKS MODULE - Reading tracker & library
// ============================================

let booksData = {
    currentlyReading: [],
    toRead: [],
    completed: []
};

// ============================================
// INITIALIZATION
// ============================================

function initBooksData() {
    const saved = localStorage.getItem('booksData');
    if (saved) {
        booksData = JSON.parse(saved);
    }
}

function saveBooksData() {
    localStorage.setItem('booksData', JSON.stringify(booksData));
}

// ============================================
// BOOKS PAGE RENDERING
// ============================================

function renderBooksPage() {
    const container = document.getElementById('booksPage');
    if (!container) return;
    
    container.innerHTML = `
        <div class="habit-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                <div class="section-title">📚 Reading List</div>
                <button onclick="addBook()" style="background: linear-gradient(135deg, #ffffff, #9CA3AF); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2, 0.4);">➕ Add Book</button>
            </div>

            <!-- Reading Stats -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px;">
                <div class="stat-card">
                    <div class="stat-value">${booksData.currentlyReading.length}</div>
                    <div class="stat-label">Currently Reading</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${booksData.toRead.length}</div>
                    <div class="stat-label">Want to Read</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${booksData.completed.length}</div>
                    <div class="stat-label">Completed</div>
                </div>
            </div>

            <!-- Currently Reading - Card View -->
            ${renderCurrentlyReadingSection()}

            <!-- To Read - List View -->
            ${renderListSection('Want to Read', 'toRead', '📚', booksData.toRead)}

            <!-- Completed - List View -->
            ${renderCompletedSection()}
        </div>
    `;
}

function renderCurrentlyReadingSection() {
    const books = booksData.currentlyReading;
    
    return `
        <div style="margin-bottom: 40px;">
            <h3 style="font-size: 24px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #ffffff, #9CA3AF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">📖 Currently Reading</h3>
            
            ${books.length === 0 ? `
                <div style="text-align: center; padding: 60px 20px; background: rgba(255, 255, 255, 0.05); border-radius: 16px; border: 2px dashed rgba(255, 255, 255, 0.2, 0.3);">
                    <div style="font-size: 48px; margin-bottom: 15px;">📖</div>
                    <div style="font-size: 16px; font-weight: 600; color: #9CA3AF;">No books here yet</div>
                </div>
            ` : `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
                    ${books.map((book, index) => renderReadingCard(book, index)).join('')}
                </div>
            `}
        </div>
    `;
}

function renderReadingCard(book, index) {
    const progressPercent = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
    
    return `
        <div class="goal-card" onclick="openBookModal('currentlyReading', ${index})" style="cursor: pointer; transition: transform 0.2s; position: relative;">
            ${book.coverUrl ? `
                <div style="height: 200px; background: url('${book.coverUrl}') center/cover; border-radius: 16px 16px 0 0;"></div>
            ` : `
                <div class="goal-cover" style="height: 200px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.2, 0.2), rgba(107, 107, 107, 0.2));">
                    <div style="font-size: 72px;">📖</div>
                </div>
            `}
            <div class="goal-content">
                <div class="goal-title" style="font-size: 18px; margin-bottom: 5px;">${book.title}</div>
                <div style="font-size: 14px; color: #9CA3AF; margin-bottom: 12px;">by ${book.author}</div>
                
                <div style="font-size: 13px; color: #9CA3AF; margin-bottom: 8px;">
                    Page ${book.currentPage} of ${book.totalPages}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%;"></div>
                </div>
                <div class="progress-text">${progressPercent}% complete</div>
            </div>
            
            <button onclick="event.stopPropagation(); deleteBook('currentlyReading', ${index})" style="position: absolute; top: 10px; right: 10px; background: rgba(239, 68, 68, 0.9); color: white; border: none; border-radius: 50%; width: 32px; height: 32px; font-size: 16px; cursor: pointer; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">✕</button>
        </div>
    `;
}

function renderListSection(title, section, icon, books) {
    return `
        <div style="margin-bottom: 40px;">
            <h3 style="font-size: 24px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #ffffff, #9CA3AF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${icon} ${title}</h3>
            
            <div style="background: linear-gradient(135deg, rgba(31, 41, 55, 0.1), rgba(75, 85, 99, 0.1)); border: 2px solid rgba(31, 41, 55, 0.4); border-radius: 16px; padding: 25px;">
                ${books.length === 0 ? `
                    <div style="text-align: center; padding: 40px 20px;">
                        <div style="font-size: 48px; margin-bottom: 15px;">${icon}</div>
                        <div style="font-size: 16px; font-weight: 600; color: #9CA3AF;">No books here yet</div>
                    </div>
                ` : `
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${books.map((book, index) => `
                            <div onclick="openBookModal('${section}', ${index})" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: rgba(255, 255, 255, 0.1); border-radius: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
                                <div style="flex: 1;">
                                    <div style="font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 4px;">${book.title}</div>
                                    <div style="font-size: 14px; color: #9CA3AF;">by ${book.author}</div>
                                </div>
                                <button onclick="event.stopPropagation(); deleteBook('${section}', ${index})" style="background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 2px solid #EF4444; border-radius: 8px; padding: 6px 12px; font-size: 13px; font-weight: 600; cursor: pointer;">Delete</button>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
}

function renderCompletedSection() {
    const books = booksData.completed;
    
    return `
        <div style="margin-bottom: 40px;">
            <h3 style="font-size: 24px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #ffffff, #9CA3AF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">✅ Completed</h3>
            
            <div style="background: linear-gradient(135deg, rgba(31, 41, 55, 0.1), rgba(75, 85, 99, 0.1)); border: 2px solid rgba(31, 41, 55, 0.4); border-radius: 16px; padding: 25px;">
                ${books.length === 0 ? `
                    <div style="text-align: center; padding: 40px 20px;">
                        <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
                        <div style="font-size: 16px; font-weight: 600; color: #9CA3AF;">No completed books yet</div>
                    </div>
                ` : `
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${books.map((book, index) => `
                            <div onclick="openCompletedBookModal(${index})" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: rgba(255, 255, 255, 0.1); border-radius: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
                                <div style="flex: 1;">
                                    <div style="font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 4px;">${book.title}</div>
                                    <div style="font-size: 14px; color: #9CA3AF; margin-bottom: 8px;">by ${book.author}</div>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        ${renderStars(book.rating, false)}
                                        <span style="font-size: 24px;">${getRatingEmoji(book.rating)}</span>
                                    </div>
                                </div>
                                <button onclick="event.stopPropagation(); deleteBook('completed', ${index})" style="background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 2px solid #EF4444; border-radius: 8px; padding: 6px 12px; font-size: 13px; font-weight: 600; cursor: pointer;">Delete</button>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
}

function getRatingEmoji(rating) {
    const emojis = {
        0: '😐',
        1: '😕',
        2: '😊',
        3: '😃',
        4: '🤩',
        5: '🔥'
    };
    return emojis[rating] || '😐';
}

function renderBookSection(title, section, icon, books) {
function renderStars(rating, interactive = false) {
    let html = '<div style="display: flex; gap: 4px; justify-content: center;">';
    
    for (let i = 1; i <= 5; i++) {
        const filled = i <= rating;
        const starStyle = filled 
            ? 'color: #FBBF24; filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.6));'
            : 'color: rgba(255, 255, 255, 0.3);';
        
        if (interactive) {
            html += `<span onclick="setRating(${i})" style="${starStyle} font-size: 32px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">★</span>`;
        } else {
            html += `<span style="${starStyle} font-size: 24px;">★</span>`;
        }
    }
    
    html += '</div>';
    return html;
}

// ============================================
// BOOK MANAGEMENT
// ============================================

function addBook() {
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #ffffff, #9CA3AF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">➕ Add New Book</h2>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #9CA3AF;">Book Title</label>
            <input type="text" id="bookTitle" placeholder="e.g., Atomic Habits" style="width: 100%; padding: 15px; border: 2px solid rgba(255, 255, 255, 0.2, 0.4); border-radius: 12px; font-size: 16px; background: rgba(255, 255, 255, 0.1); color: white;" autofocus>
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #9CA3AF;">Author</label>
            <input type="text" id="bookAuthor" placeholder="e.g., James Clear" style="width: 100%; padding: 15px; border: 2px solid rgba(255, 255, 255, 0.2, 0.4); border-radius: 12px; font-size: 16px; background: rgba(255, 255, 255, 0.1); color: white;">
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #9CA3AF;">Cover Image URL <span style="font-weight: 400; color: #9CA3AF;">(optional)</span></label>
            <input type="text" id="bookCoverUrl" placeholder="https://example.com/book-cover.jpg" style="width: 100%; padding: 15px; border: 2px solid rgba(255, 255, 255, 0.2, 0.4); border-radius: 12px; font-size: 16px; background: rgba(255, 255, 255, 0.1); color: white;">
            <div style="font-size: 12px; color: #9CA3AF; margin-top: 8px;">💡 Right-click book cover → Copy Image Address</div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #9CA3AF;">Total Pages <span style="font-weight: 400; color: #9CA3AF;">(optional)</span></label>
            <input type="number" id="bookPages" placeholder="320" style="width: 100%; padding: 15px; border: 2px solid rgba(255, 255, 255, 0.2, 0.4); border-radius: 12px; font-size: 16px; background: rgba(255, 255, 255, 0.1); color: white;">
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #9CA3AF;">Status</label>
            <select id="bookStatus" style="width: 100%; padding: 15px; border: 2px solid rgba(255, 255, 255, 0.2, 0.4); border-radius: 12px; font-size: 16px; background: rgba(255, 255, 255, 0.1); color: white; cursor: pointer;">
                <option value="toRead">Want to Read</option>
                <option value="currentlyReading">Currently Reading</option>
                <option value="completed">Completed</option>
            </select>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: flex-end;">
            <button onclick="closeModal()" style="background: rgba(255, 255, 255, 0.1); color: white; border: 2px solid rgba(255, 255, 255, 0.3); padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer;">Cancel</button>
            <button onclick="saveNewBook()" style="background: linear-gradient(135deg, #ffffff, #9CA3AF); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(255, 255, 255, 0.2, 0.4);">Add Book</button>
        </div>
    `;
}

function saveNewBook() {
    const title = document.getElementById('bookTitle')?.value.trim();
    const author = document.getElementById('bookAuthor')?.value.trim();
    const coverUrl = document.getElementById('bookCoverUrl')?.value.trim();
    const pages = parseInt(document.getElementById('bookPages')?.value) || 0;
    const status = document.getElementById('bookStatus')?.value;
    
    if (!title) {
        alert('Please enter a book title');
        return;
    }
    
    if (!author) {
        alert('Please enter an author');
        return;
    }
    
    const newBook = {
        id: Date.now(),
        title: title,
        author: author,
        coverUrl: coverUrl || null,
        totalPages: pages,
        currentPage: 0,
        rating: 0,
        notes: '',
        addedDate: new Date().toISOString(),
        completedDate: null
    };
    
    booksData[status].push(newBook);
    saveBooksData();
    renderBooksPage();
    closeModal();
}

function openCompletedBookModal(index) {
    const book = booksData.completed[index];
    if (!book) return;
    
    const modalContent = createModal();
    
    window.currentBookSection = 'completed';
    window.currentBookIndex = index;
    window.currentBookRating = book.rating;
    
    const ratingEmoji = getRatingEmoji(book.rating);
    
    modalContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 10px; background: linear-gradient(135deg, #ffffff, #9CA3AF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">📖 ${book.title}</h2>
            <div style="font-size: 18px; color: #9CA3AF; margin-bottom: 20px;">by ${book.author}</div>
            
            <!-- Big Rating Display -->
            <div style="font-size: 80px; margin-bottom: 15px;">${ratingEmoji}</div>
            
            <div id="starRating" style="margin-bottom: 15px;">
                ${renderStars(book.rating, true)}
            </div>
            
            <div style="font-size: 14px; color: #9CA3AF;">
                ${book.completedDate ? `✓ Finished ${new Date(book.completedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : 'Completed'}
            </div>
        </div>
        
        ${book.notes ? `
            <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 10px; color: #9CA3AF;">📝 Your Notes</h4>
                <div style="font-size: 15px; color: #E5E7EB; line-height: 1.6;">${book.notes}</div>
            </div>
        ` : ''}
        
        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px;">
            <button onclick="closeModal(); openBookModal('completed', ${index})" style="background: linear-gradient(135deg, #ffffff, #9CA3AF); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(255, 255, 255, 0.2, 0.4);">✏️ Edit Book</button>
            <button onclick="closeModal()" style="background: rgba(255, 255, 255, 0.1); color: white; border: 2px solid rgba(255, 255, 255, 0.3); padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer;">Close</button>
        </div>
    `;
}

function openBookModal(section, index) {
    const book = booksData[section][index];
    if (!book) return;
    
    const modalContent = createModal();
    
    window.currentBookSection = section;
    window.currentBookIndex = index;
    window.currentBookRating = book.rating;
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #ffffff, #9CA3AF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">📖 ${book.title}</h2>
        
        <div style="font-size: 18px; color: #9CA3AF; margin-bottom: 30px;">by ${book.author}</div>
        
        ${section === 'currentlyReading' ? `
            <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #9CA3AF;">Current Page</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="number" id="currentPage" value="${book.currentPage}" min="0" max="${book.totalPages}" style="flex: 1; padding: 12px; border: 2px solid rgba(255, 255, 255, 0.2, 0.4); border-radius: 8px; font-size: 16px; background: rgba(255, 255, 255, 0.1); color: white; font-weight: 700;">
                    <span style="color: #9CA3AF;">of ${book.totalPages}</span>
                </div>
                <div style="margin-top: 15px;">
                    <div class="progress-bar" style="height: 12px;">
                        <div class="progress-fill" style="width: ${book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0}%;"></div>
                    </div>
                </div>
            </div>
        ` : ''}
        
        ${section === 'completed' ? `
            <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 15px; color: #9CA3AF; text-align: center;">Your Rating</label>
                <div id="starRating">
                    ${renderStars(book.rating, true)}
                </div>
            </div>
        ` : ''}
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #9CA3AF;">Notes</label>
            <textarea id="bookNotes" placeholder="Key takeaways, favorite quotes, thoughts..." style="width: 100%; min-height: 120px; padding: 15px; border: 2px solid rgba(255, 255, 255, 0.2, 0.4); border-radius: 12px; font-size: 15px; background: rgba(255, 255, 255, 0.1); color: white; resize: vertical;">${book.notes}</textarea>
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #9CA3AF;">Move to</label>
            <select id="moveToSection" style="width: 100%; padding: 12px; border: 2px solid rgba(255, 255, 255, 0.2, 0.4); border-radius: 12px; font-size: 14px; background: rgba(255, 255, 255, 0.1); color: white; cursor: pointer;">
                <option value="toRead" ${section === 'toRead' ? 'selected' : ''}>Want to Read</option>
                <option value="currentlyReading" ${section === 'currentlyReading' ? 'selected' : ''}>Currently Reading</option>
                <option value="completed" ${section === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: flex-end;">
            <button onclick="closeModal()" style="background: rgba(255, 255, 255, 0.1); color: white; border: 2px solid rgba(255, 255, 255, 0.3); padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer;">Cancel</button>
            <button onclick="saveBookUpdates()" style="background: linear-gradient(135deg, #ffffff, #9CA3AF); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(255, 255, 255, 0.2, 0.4);">Save Changes</button>
        </div>
    `;
}

function setRating(stars) {
    window.currentBookRating = stars;
    const container = document.getElementById('starRating');
    if (container) {
        container.innerHTML = renderStars(stars, true);
    }
}

function saveBookUpdates() {
    const section = window.currentBookSection;
    const index = window.currentBookIndex;
    const book = booksData[section][index];
    
    if (!book) return;
    
    // Update book data
    const currentPageInput = document.getElementById('currentPage');
    if (currentPageInput) {
        book.currentPage = parseInt(currentPageInput.value) || 0;
    }
    
    book.notes = document.getElementById('bookNotes')?.value || '';
    book.rating = window.currentBookRating || book.rating;
    
    // Check if moving to different section
    const newSection = document.getElementById('moveToSection')?.value;
    
    if (newSection !== section) {
        // Remove from current section
        booksData[section].splice(index, 1);
        
        // If moving to completed, set completion date
        if (newSection === 'completed') {
            book.completedDate = new Date().toISOString();
            book.currentPage = book.totalPages; // Mark as finished
        }
        
        // Add to new section
        booksData[newSection].push(book);
    }
    
    saveBooksData();
    renderBooksPage();
    closeModal();
}

function deleteBook(section, index) {
    if (!confirm('Delete this book? This cannot be undone.')) {
        return;
    }
    
    booksData[section].splice(index, 1);
    saveBooksData();
    renderBooksPage();
}
