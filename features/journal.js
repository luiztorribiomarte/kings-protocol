// ============================================
// JOURNAL MODULE
// ============================================

let journalData = {};

// Initialize journal data
function initJournalData() {
    const saved = localStorage.getItem('journalData');
    if (saved) {
        journalData = JSON.parse(saved);
    }
}

// Save journal data
function saveJournalData() {
    localStorage.setItem('journalData', JSON.stringify(journalData));
}

// Get date string
function getJournalDateString(date) {
    const d = date || new Date();
    return d.toISOString().split('T')[0];
}

// Render journal page
function renderJournalPage() {
    const container = document.getElementById('journalContainer');
    if (!container) return;

    const today = getJournalDateString(new Date());
    const todayData = journalData[today] || {
        wins: ['', '', ''],
        gratitude: ['', '', ''],
        affirmations: ['', '', '', '', ''],
        entry: ''
    };

    let html = `
        <div style="margin-bottom: 20px;">
            <label style="color: #9CA3AF; display: block; margin-bottom: 10px;">View Entry:</label>
            <select id="journalDateSelector" onchange="loadJournalDate()" style="padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; width: 100%;">
                <option value="${today}">Today</option>
            </select>
        </div>
    `;

    // Daily Wins
    html += '<div class="journal-section">';
    html += '<div class="section-title">🏆 Daily Wins</div>';
    for (let i = 0; i < 3; i++) {
        html += `<input type="text" class="journal-input" placeholder="Win #${i + 1}" value="${todayData.wins[i]}" onchange="saveJournalField('wins', ${i}, this.value)">`;
    }
    html += '</div>';

    // Gratitude
    html += '<div class="journal-section">';
    html += '<div class="section-title">🙏 Gratitude</div>';
    for (let i = 0; i < 3; i++) {
        html += `<input type="text" class="journal-input" placeholder="Grateful for #${i + 1}" value="${todayData.gratitude[i]}" onchange="saveJournalField('gratitude', ${i}, this.value)">`;
    }
    html += '</div>';

    // Affirmations
    html += '<div class="journal-section">';
    html += '<div class="section-title">✨ I AM Affirmations</div>';
    for (let i = 0; i < 5; i++) {
        html += `<input type="text" class="journal-input" placeholder="I AM..." value="${todayData.affirmations[i]}" onchange="saveJournalField('affirmations', ${i}, this.value)">`;
    }
    html += '</div>';

    // Free Journal Entry
    html += '<div class="journal-section">';
    html += '<div class="section-title">📝 Journal Entry</div>';
    html += `<textarea class="journal-input journal-textarea" placeholder="Write your thoughts for today..." onchange="saveJournalField('entry', null, this.value)">${todayData.entry}</textarea>`;
    html += `<div style="text-align: right; color: #6B7280; font-size: 0.85em; margin-top: 5px;">Word count: <span id="wordCount">${countWords(todayData.entry)}</span></div>`;
    html += '</div>';

    // Journal Stats
    const stats = calculateJournalStats();
    html += '<div class="journal-section">';
    html += '<div class="section-title">📊 Journal Stats</div>';
    html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">';
    html += `
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 2em; color: white; font-weight: bold;">${stats.totalEntries}</div>
            <div style="color: #9CA3AF; font-size: 0.85em;">Total Entries</div>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 2em; color: white; font-weight: bold;">${stats.currentStreak}</div>
            <div style="color: #9CA3AF; font-size: 0.85em;">Day Streak</div>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 2em; color: white; font-weight: bold;">${stats.totalWords}</div>
            <div style="color: #9CA3AF; font-size: 0.85em;">Total Words</div>
        </div>
    `;
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;

    // Populate date selector with past entries
    populateDateSelector();

    // Add word count listener
    const textarea = container.querySelector('.journal-textarea');
    if (textarea) {
        textarea.addEventListener('input', function() {
            document.getElementById('wordCount').textContent = countWords(this.value);
        });
    }
}

// Save journal field
function saveJournalField(field, index, value) {
    const today = getJournalDateString(new Date());
    
    if (!journalData[today]) {
        journalData[today] = {
            wins: ['', '', ''],
            gratitude: ['', '', ''],
            affirmations: ['', '', '', '', ''],
            entry: ''
        };
    }

    if (index !== null) {
        journalData[today][field][index] = value;
    } else {
        journalData[today][field] = value;
    }

    saveJournalData();
}

// Count words
function countWords(text) {
    if (!text || text.trim() === '') return 0;
    return text.trim().split(/\s+/).length;
}

// Calculate journal stats
function calculateJournalStats() {
    const entries = Object.keys(journalData);
    let totalWords = 0;
    let currentStreak = 0;
    
    entries.forEach(dateStr => {
        const entry = journalData[dateStr];
        if (entry.entry) {
            totalWords += countWords(entry.entry);
        }
    });

    // Calculate streak
    const today = new Date();
    let checkDate = new Date(today);
    
    while (true) {
        const dateStr = getJournalDateString(checkDate);
        const entry = journalData[dateStr];
        
        if (entry && (entry.entry || entry.wins.some(w => w) || entry.gratitude.some(g => g) || entry.affirmations.some(a => a))) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return {
        totalEntries: entries.length,
        currentStreak,
        totalWords
    };
}

// Populate date selector
function populateDateSelector() {
    const selector = document.getElementById('journalDateSelector');
    if (!selector) return;

    const dates = Object.keys(journalData).sort().reverse();
    const today = getJournalDateString(new Date());
    
    // Clear existing options except today
    selector.innerHTML = `<option value="${today}">Today</option>`;
    
    // Add past 30 days
    for (let i = 1; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = getJournalDateString(date);
        
        if (dates.includes(dateStr)) {
            const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            selector.innerHTML += `<option value="${dateStr}">${dateLabel}</option>`;
        }
    }
}

// Load journal date
function loadJournalDate() {
    const selector = document.getElementById('journalDateSelector');
    const selectedDate = selector.value;
    const today = getJournalDateString(new Date());
    
    const dateData = journalData[selectedDate] || {
        wins: ['', '', ''],
        gratitude: ['', '', ''],
        affirmations: ['', '', '', '', ''],
        entry: ''
    };

    const isToday = selectedDate === today;

    // Update wins
    const winInputs = document.querySelectorAll('.journal-section:nth-of-type(2) .journal-input');
    winInputs.forEach((input, i) => {
        input.value = dateData.wins[i] || '';
        input.disabled = !isToday;
    });

    // Update gratitude
    const gratitudeInputs = document.querySelectorAll('.journal-section:nth-of-type(3) .journal-input');
    gratitudeInputs.forEach((input, i) => {
        input.value = dateData.gratitude[i] || '';
        input.disabled = !isToday;
    });

    // Update affirmations
    const affirmationInputs = document.querySelectorAll('.journal-section:nth-of-type(4) .journal-input');
    affirmationInputs.forEach((input, i) => {
        input.value = dateData.affirmations[i] || '';
        input.disabled = !isToday;
    });

    // Update entry
    const entryTextarea = document.querySelector('.journal-textarea');
    if (entryTextarea) {
        entryTextarea.value = dateData.entry || '';
        entryTextarea.disabled = !isToday;
        document.getElementById('wordCount').textContent = countWords(dateData.entry);
    }

    if (!isToday) {
        // Show message that this is a past entry
        const container = document.getElementById('journalContainer');
        const existingNote = container.querySelector('.past-entry-note');
        if (!existingNote) {
            const note = document.createElement('div');
            note.className = 'past-entry-note';
            note.style.cssText = 'background: rgba(251, 191, 36, 0.2); border: 1px solid rgba(251, 191, 36, 0.4); padding: 12px; border-radius: 8px; margin-top: 15px; color: #FCD34D; text-align: center;';
            note.textContent = '📖 Viewing past entry (read-only)';
            container.insertBefore(note, container.firstChild.nextSibling);
        }
    } else {
        // Remove past entry note if exists
        const note = document.querySelector('.past-entry-note');
        if (note) note.remove();
    }
}
