// ============================================
// CONTENT TRACKER MODULE (SAFE FIXED VERSION)
// ============================================

let contentData = {
    subscribers: 0,
    videosThisMonth: 0,
    hoursLogged: 0,
    activity: {}, // YYYY-MM-DD → { videos, hours }
    videoIdeas: [],
    notes: ''
};

// ---------- Helpers ----------
function getContentDayKey(date = new Date()) {
    return date.toISOString().split('T')[0];
}

// ---------- Init ----------
function initContentData() {
    const saved = localStorage.getItem('contentData');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            contentData = {
                ...contentData,
                ...parsed,
                activity: parsed.activity || {}
            };
        } catch {
            // keep defaults
        }
    }
}

// ---------- Save ----------
function saveContentData() {
    localStorage.setItem('contentData', JSON.stringify(contentData));
}

// ---------- Activity Logging ----------
function logContentActivity(type, amount = 1) {
    const today = getContentDayKey();

    if (!contentData.activity[today]) {
        contentData.activity[today] = { videos: 0, hours: 0 };
    }

    contentData.activity[today][type] += amount;
}

// ---------- Render ----------
function renderContentTracker() {
    const container = document.getElementById('contentContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="section-title">🎬 Content Tracker</div>

        <div class="content-stats">
            <div class="content-stat-card">
                <div class="stat-label">Subscribers</div>
                <div class="stat-number">${contentData.subscribers}</div>
                <input id="subsInput" type="number" placeholder="Update" />
                <button onclick="updateSubscribers()">Update</button>
            </div>

            <div class="content-stat-card">
                <div class="stat-label">Videos This Month</div>
                <div class="stat-number">${contentData.videosThisMonth}</div>
                <button onclick="changeVideosCount(-1)">-</button>
                <button onclick="changeVideosCount(1)">+</button>
            </div>

            <div class="content-stat-card">
                <div class="stat-label">Hours Logged</div>
                <div class="stat-number">${contentData.hoursLogged}</div>
                <button onclick="changeHoursLogged(-1)">-</button>
                <button onclick="changeHoursLogged(1)">+</button>
            </div>
        </div>

        <div style="margin-top:30px;">
            <div class="section-title">📆 Content Activity (Last 14 Days)</div>
            <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:10px; margin-top:12px;">
                ${renderContentHistory()}
            </div>
        </div>

        <div style="margin-top:40px;">
            <div class="section-title">💡 Video Ideas</div>
            <button onclick="addVideoIdea()">➕ Add Idea</button>
            ${renderVideoIdeas()}
        </div>

        <div style="margin-top:40px;">
            <div class="section-title">📝 Content Notes</div>
            <textarea id="contentNotes" onchange="saveContentNotes()">${contentData.notes || ''}</textarea>
        </div>
    `;
}

// ---------- History Grid (SAFE) ----------
function renderContentHistory() {
    let out = '';

    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = getContentDayKey(d);
        const activity = contentData.activity[key] || { videos: 0, hours: 0 };
        const active = activity.videos > 0 || activity.hours > 0;

        out += `
            <div style="
                padding:12px;
                border-radius:10px;
                text-align:center;
                background:${active ? 'rgba(34,197,94,.2)' : 'rgba(255,255,255,.05)'};
                border:1px solid ${active ? '#22c55e' : 'rgba(255,255,255,.15)'};
                color:white;
                font-size:.85rem;
            ">
                <div>${d.getDate()}</div>
                ${active ? '🔥' : '•'}
            </div>
        `;
    }

    return out;
}

// ---------- Actions ----------
function updateSubscribers() {
    const val = parseInt(document.getElementById('subsInput').value);
    if (!isNaN(val)) {
        contentData.subscribers = val;
        saveContentData();
        renderContentTracker();
    }
}

function changeVideosCount(delta) {
    contentData.videosThisMonth = Math.max(0, contentData.videosThisMonth + delta);
    if (delta > 0) logContentActivity('videos', delta);
    saveContentData();
    renderContentTracker();
}

function changeHoursLogged(delta) {
    contentData.hoursLogged = Math.max(0, contentData.hoursLogged + delta);
    if (delta > 0) logContentActivity('hours', delta);
    saveContentData();
    renderContentTracker();
}

// ---------- Ideas ----------
function addVideoIdea() {
    const title = prompt('Video idea:');
    if (!title) return;
    contentData.videoIdeas.push({ title });
    saveContentData();
    renderContentTracker();
}

function renderVideoIdeas() {
    if (!contentData.videoIdeas.length) {
        return `<p style="opacity:.6;">No ideas yet</p>`;
    }
    return contentData.videoIdeas
        .map(i => `<div>• ${i.title}</div>`)
        .join('');
}

// ---------- Notes ----------
function saveContentNotes() {
    contentData.notes = document.getElementById('contentNotes').value;
    saveContentData();
}
