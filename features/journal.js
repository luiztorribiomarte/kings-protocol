// ============================================
// JOURNAL MODULE - Daily journaling & reflections
// ============================================

let journalData = {};

// ============================================
// INITIALIZATION
// ============================================

function initJournalData() {
    const saved = localStorage.getItem('journalData');
    if (saved) {
        journalData = JSON.parse(saved);
    }
}

function saveJournalData() {
    localStorage.setItem('journalData', JSON.stringify(journalData));
}

// ============================================
// JOURNAL RENDERING
// ============================================

function renderJournalPage() {
    const container = document.getElementById('journalContainer');
    if (!container) return;
    
    const today = new Date().toISOString().split('T')[0];
    const todayData = journalData[today] || {
        wins: ['', '', ''],
        gratitude: ['', '', ''],
        affirmations: ['', '', '', '', ''],
        entry: ''
    };
    
    container.innerHTML = `
        <!-- Date Selector -->
        <div style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h2 style="font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #ffffff, #9CA3AF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Today's Journal</h2>
                <div style="font-size: 14px; color: #9CA3AF; margin-top: 5px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
            <select id="journalDateSelector" onchange="loadJournalDate(this.value)" style="padding: 12px 20px; border: 2px solid rgba(58, 58, 58, 0.4); border-radius: 12px; background: rgba(255, 255, 255, 0.1); color: white; font-size: 14px; font-weight: 600; cursor: pointer;">
                <option value="${today}">Today</option>
                ${getPastDates().map(date => `<option value="${date}">${formatDate(date)}</option>`).join('')}
            </select>
        </div>

        <!-- Daily Wins -->
        <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(156, 163, 175, 0.1)); border: 2px solid rgba(255, 255, 255, 0.4); border-radius: 16px; padding: 25px; margin-bottom: 25px;">
            <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 15px; color: #ffffff;">🏆 Daily Wins</h3>
            <p style="font-size: 14px; color: #9CA3AF; margin-bottom: 20px;">What did you accomplish today?</p>
            ${todayData.wins.map((win, i) => `
                <input type="text" 
                       id="win${i}" 
                       value="${win}" 
                       onchange="saveJournalField('wins', ${i}, this.value)"
                       placeholder="Win #${i + 1}"
                       style="width: 100%; padding: 15px; margin-bottom: 12px; border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 12px; font-size: 15px; background: rgba(255, 255, 255, 0.95); color: #1a1a1a;">
            `).join('')}
        </div>

        <!-- Gratitude -->
        <div style="background: linear-gradient(135deg, rgba(26, 26, 26, 0.1), rgba(38, 38, 38, 0.1)); border: 2px solid rgba(26, 26, 26, 0.4); border-radius: 16px; padding: 25px; margin-bottom: 25px;">
            <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 15px; color: #ffffff;">🙏 Gratitude</h3>
            <p style="font-size: 14px; color: #9CA3AF; margin-bottom: 20px;">What are you thankful for today?</p>
            ${todayData.gratitude.map((item, i) => `
                <input type="text" 
                       id="gratitude${i}" 
                       value="${item}" 
                       onchange="saveJournalField('gratitude', ${i}, this.value)"
                       placeholder="I'm grateful for..."
                       style="width: 100%; padding: 15px; margin-bottom: 12px; border: 2px solid rgba(26, 26, 26, 0.3); border-radius: 12px; font-size: 15px; background: rgba(255, 255, 255, 0.95); color: #1a1a1a;">
            `).join('')}
        </div>

        <!-- Affirmations -->
        <div style="background: linear-gradient(135deg, rgba(58, 58, 58, 0.1), rgba(107, 107, 107, 0.1)); border: 2px solid rgba(58, 58, 58, 0.4); border-radius: 16px; padding: 25px; margin-bottom: 25px;">
            <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 15px; background: linear-gradient(135deg, #ffffff, #9CA3AF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">💎 I AM Affirmations</h3>
            <p style="font-size: 14px; color: #9CA3AF; margin-bottom: 20px;">Declare who you are becoming</p>
            ${todayData.affirmations.map((affirmation, i) => `
                <input type="text" 
                       id="affirmation${i}" 
                       value="${affirmation}" 
                       onchange="saveJournalField('affirmations', ${i}, this.value)"
                       placeholder="I AM ${['successful', 'confident', 'disciplined', 'focused', 'unstoppable'][i]}"
                       style="width: 100%; padding: 15px; margin-bottom: 12px; border: 2px solid rgba(58, 58, 58, 0.3); border-radius: 12px; font-size: 15px; background: rgba(255, 255, 255, 0.95); color: #1a1a1a;">
            `).join('')}
        </div>

        <!-- Daily Entry -->
        <div style="background: linear-gradient(135deg, rgba(38, 38, 38, 0.1), rgba(147, 197, 253, 0.1)); border: 2px solid rgba(38, 38, 38, 0.4); border-radius: 16px; padding: 25px;">
            <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 15px; color: #8B8B8B;">📖 Daily Journal Entry</h3>
            <p style="font-size: 14px; color: #9CA3AF; margin-bottom: 20px;">How was your day? Thoughts, reflections, feelings...</p>
            <textarea 
                id="journalEntry" 
                onchange="saveJournalField('entry', null, this.value)"
                placeholder="Dear Journal,

Today was..."
                style="width: 100%; min-height: 250px; padding: 20px; border: 2px solid rgba(38, 38, 38, 0.3); border-radius: 12px; font-size: 15px; background: rgba(255, 255, 255, 0.95); color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; resize: vertical;"
            >${todayData.entry}</textarea>
            
            <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 12px; color: #9CA3AF;">
                    <span id="wordCount">0 words</span> • Auto-saves as you type
                </div>
                <button onclick="clearTodayJournal()" style="background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 2px solid #EF4444; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">Clear Today</button>
            </div>
        </div>

        <!-- Journal Stats -->
        <div style="margin-top: 30px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
            <div style="background: rgba(58, 58, 58, 0.2); border: 2px solid rgba(58, 58, 58, 0.4); border-radius: 12px; padding: 20px; text-align: center;">
                <div style="font-size: 32px; font-weight: 900; color: #ffffff;">${Object.keys(journalData).length}</div>
                <div style="font-size: 12px; color: #9CA3AF; margin-top: 5px;">Total Entries</div>
            </div>
            <div style="background: rgba(26, 26, 26, 0.2); border: 2px solid rgba(26, 26, 26, 0.4); border-radius: 12px; padding: 20px; text-align: center;">
                <div style="font-size: 32px; font-weight: 900; color: #ffffff;">${calculateStreak()}</div>
                <div style="font-size: 12px; color: #9CA3AF; margin-top: 5px;">Day Streak</div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.4); border-radius: 12px; padding: 20px; text-align: center;">
                <div style="font-size: 32px; font-weight: 900; color: #ffffff;">${getTotalWords()}</div>
                <div style="font-size: 12px; color: #9CA3AF; margin-top: 5px;">Total Words</div>
            </div>
        </div>
    `;
    
    updateWordCount();
}

// ============================================
// JOURNAL ACTIONS
// ============================================

function saveJournalField(field, index, value) {
    const today = new Date().toISOString().split('T')[0];
    
    if (!journalData[today]) {
        journalData[today] = {
            wins: ['', '', ''],
            gratitude: ['', '', ''],
            affirmations: ['', '', '', '', ''],
            entry: ''
        };
    }
    
    if (field === 'entry') {
        journalData[today].entry = value;
    } else {
        journalData[today][field][index] = value;
    }
    
    saveJournalData();
    updateWordCount();
    
    // Update stats
    renderJournalPage();
}

function loadJournalDate(dateString) {
    const data = journalData[dateString] || {
        wins: ['', '', ''],
        gratitude: ['', '', ''],
        affirmations: ['', '', '', '', ''],
        entry: ''
    };
    
    // Update all fields
    data.wins.forEach((win, i) => {
        const el = document.getElementById(`win${i}`);
        if (el) el.value = win;
    });
    
    data.gratitude.forEach((item, i) => {
        const el = document.getElementById(`gratitude${i}`);
        if (el) el.value = item;
    });
    
    data.affirmations.forEach((affirmation, i) => {
        const el = document.getElementById(`affirmation${i}`);
        if (el) el.value = affirmation;
    });
    
    const entryEl = document.getElementById('journalEntry');
    if (entryEl) entryEl.value = data.entry;
    
    updateWordCount();
}

function clearTodayJournal() {
    if (!confirm('Clear all entries for today? This cannot be undone.')) {
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    delete journalData[today];
    saveJournalData();
    renderJournalPage();
}

function updateWordCount() {
    const entry = document.getElementById('journalEntry')?.value || '';
    const words = entry.trim() ? entry.trim().split(/\s+/).length : 0;
    const wordCountEl = document.getElementById('wordCount');
    if (wordCountEl) {
        wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPastDates() {
    const dates = [];
    for (let i = 1; i <= 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        dates.push(dateKey);
    }
    return dates;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateStreak() {
    let streak = 0;
    const dates = Object.keys(journalData).sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < 365; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        
        if (journalData[dateKey] && journalData[dateKey].entry) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

function getTotalWords() {
    let total = 0;
    Object.values(journalData).forEach(day => {
        if (day.entry) {
            const words = day.entry.trim().split(/\s+/).length;
            total += words;
        }
    });
    return total;
}
