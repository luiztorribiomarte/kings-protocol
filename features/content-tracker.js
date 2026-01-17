// ============================================
// CONTENT TRACKER MODULE
// ============================================

let contentData = {
    subscribers: 0,
    videosThisMonth: 0,
    hoursLogged: 0,
    videoIdeas: [],
    notes: '',
    streak: {
        current: 0,
        lastActiveDate: null
    }
};

// Initialize content data
function initContentData() {
    const saved = localStorage.getItem('contentData');
    if (saved) {
        contentData = JSON.parse(saved);
    }
    updateContentStreak(false);
}

// Save content data
function saveContentData() {
    localStorage.setItem('contentData', JSON.stringify(contentData));
}

// Helpers
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

function isYesterday(dateStr) {
    const d = new Date(dateStr);
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return d.toDateString() === y.toDateString();
}

// Streak logic
function updateContentStreak(actedToday = true) {
    const today = getTodayDateString();

    if (!contentData.streak) {
        contentData.streak = { current: 0, lastActiveDate: null };
    }

    const last = contentData.streak.lastActiveDate;

    if (!last) {
        if (actedToday) {
            contentData.streak.current = 1;
            contentData.streak.lastActiveDate = today;
        }
    } else if (last === today) {
        // already counted today
    } else if (isYesterday(last)) {
        if (actedToday) {
            contentData.streak.current += 1;
            contentData.streak.lastActiveDate = today;
        }
    } else {
        if (actedToday) {
            contentData.streak.current = 1;
            contentData.streak.lastActiveDate = today;
        } else {
            contentData.streak.current = 0;
        }
    }

    saveContentData();
}

// Render content tracker
function renderContentTracker() {
    const container = document.getElementById('contentContainer');
    if (!container) return;

    const streak = contentData.streak?.current || 0;

    let html = `
        <div class="content-streak-card">
            ${streak > 0
                ? `🔥 Content Streak: <strong>${streak} day${streak > 1 ? 's' : ''}</strong>`
                : `Log content today to start your streak`}
        </div>

        <div class="section-title" style="margin: 20px 0;">🎬 Content Tracker</div>
    `;

    // Stats Cards
    html += '<div class="content-stats">';

    html += `
        <div class="content-stat-card">
            <div>YouTube Subscribers</div>
            <div class="stat-big">${contentData.subscribers}</div>
            <input id="subsInput" type="number" placeholder="Update count">
            <button onclick="updateSubscribers()">Update</button>
        </div>

        <div class="content-stat-card">
            <div>Videos This Month</div>
            <div class="stat-big">${contentData.videosThisMonth}</div>
            <button onclick="changeVideosCount(-1)">−</button>
            <button onclick="changeVideosCount(1)">+</button>
        </div>

        <div class="content-stat-card">
            <div>Hours Logged</div>
            <div class="stat-big">${contentData.hoursLogged}</div>
            <button onclick="changeHoursLogged(-1)">−</button>
            <button onclick="changeHoursLogged(1)">+</button>
        </div>
    `;

    html += '</div>';

    // Video Ideas
    html += `
        <div class="ideas-list">
            <div class="section-title">💡 Video Ideas</div>
            <button onclick="addVideoIdea()">➕ Add Idea</button>
            ${contentData.videoIdeas.length === 0
                ? `<p class="muted">No ideas yet.</p>`
                : contentData.videoIdeas.map((idea, i) => `
                    <div class="idea-item">
                        <strong>${idea.title}</strong>
                        <button onclick="deleteVideoIdea(${i})">Delete</button>
                    </div>
                `).join('')}
        </div>

        <div class="ideas-list">
            <div class="section-title">📝 Content Notes</div>
            <textarea id="contentNotes" onchange="saveContentNotes()">${contentData.notes || ''}</textarea>
        </div>
    `;

    container.innerHTML = html;
}

// Mutations (all trigger streak)
function updateSubscribers() {
    const v = parseInt(document.getElementById('subsInput').value);
    if (isNaN(v)) return;
    contentData.subscribers = v;
    updateContentStreak(true);
    renderContentTracker();
}

function changeVideosCount(d) {
    contentData.videosThisMonth = Math.max(0, contentData.videosThisMonth + d);
    updateContentStreak(true);
    renderContentTracker();
}

function changeHoursLogged(d) {
    contentData.hoursLogged = Math.max(0, contentData.hoursLogged + d);
    updateContentStreak(true);
    renderContentTracker();
}

function addVideoIdea() {
    const title = prompt('Video idea title');
    if (!title) return;
    contentData.videoIdeas.push({ title });
    updateContentStreak(true);
    renderContentTracker();
}

function deleteVideoIdea(i) {
    contentData.videoIdeas.splice(i, 1);
    saveContentData();
    renderContentTracker();
}

function saveContentNotes() {
    contentData.notes = document.getElementById('contentNotes').value;
    saveContentData();
}
