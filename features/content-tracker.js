// ============================================
// CONTENT TRACKER MODULE
// ============================================

let contentData = {
    subscribers: 0,
    videosThisMonth: 0,
    hoursLogged: 0,
    videoIdeas: [],
    notes: ''
};

// Ensure all required fields exist (prevents crashes)
function normalizeContentData(data) {
    return {
        subscribers: Number(data?.subscribers) || 0,
        videosThisMonth: Number(data?.videosThisMonth) || 0,
        hoursLogged: Number(data?.hoursLogged) || 0,
        videoIdeas: Array.isArray(data?.videoIdeas) ? data.videoIdeas : [],
        notes: typeof data?.notes === 'string' ? data.notes : ''
    };
}

// Initialize content data
function initContentData() {
    const saved = localStorage.getItem('contentData');
    if (saved) {
        try {
            contentData = normalizeContentData(JSON.parse(saved));
        } catch {
            contentData = normalizeContentData({});
        }
    } else {
        contentData = normalizeContentData({});
    }

    saveContentData(); // ensure storage is clean
}

// Save content data
function saveContentData() {
    localStorage.setItem('contentData', JSON.stringify(contentData));
}

// Render content tracker
function renderContentTracker() {
    const container = document.getElementById('contentContainer');
    if (!container) return;

    let html = `<div class="section-title" style="margin-bottom: 20px;">🎬 Content Tracker</div>`;

    html += `<div class="content-stats">`;

    html += `
        <div class="content-stat-card">
            <div style="color:#9CA3AF;">YouTube Subscribers</div>
            <div style="font-size:2.5em;font-weight:900;color:white;">
                ${contentData.subscribers.toLocaleString()}
            </div>
            <input type="number" id="subsInput" placeholder="Update count">
            <button onclick="updateSubscribers()">Update</button>
        </div>

        <div class="content-stat-card">
            <div style="color:#9CA3AF;">Videos This Month</div>
            <div style="font-size:2.5em;font-weight:900;color:white;">
                ${contentData.videosThisMonth}
            </div>
            <button onclick="changeVideosCount(-1)">−</button>
            <button onclick="changeVideosCount(1)">+</button>
        </div>

        <div class="content-stat-card">
            <div style="color:#9CA3AF;">Hours Logged</div>
            <div style="font-size:2.5em;font-weight:900;color:white;">
                ${contentData.hoursLogged}
            </div>
            <button onclick="changeHoursLogged(-1)">−</button>
            <button onclick="changeHoursLogged(1)">+</button>
        </div>
    </div>`;

    html += `
        <div style="margin-top:30px;">
            <div class="section-title">💡 Video Ideas</div>
            <button onclick="addVideoIdea()">➕ Add Idea</button>
    `;

    if (contentData.videoIdeas.length === 0) {
        html += `<div style="opacity:.6;margin-top:10px;">No ideas yet.</div>`;
    } else {
        contentData.videoIdeas.forEach((idea, i) => {
            html += `
                <div class="idea-item">
                    <strong>${idea.title}</strong>
                    <button onclick="deleteVideoIdea(${i})">Delete</button>
                    <div style="opacity:.7;">${idea.description || ''}</div>
                </div>
            `;
        });
    }

    html += `
        </div>

        <div style="margin-top:30px;">
            <div class="section-title">📝 Content Notes</div>
            <textarea id="contentNotes" onchange="saveContentNotes()"
                style="width:100%;min-height:180px;">${contentData.notes}</textarea>
        </div>
    `;

    container.innerHTML = html;
}

// ===== Actions =====

function updateSubscribers() {
    const v = Number(document.getElementById('subsInput').value);
    if (!v && v !== 0) return;
    contentData.subscribers = v;
    saveContentData();
    renderContentTracker();
}

function changeVideosCount(d) {
    contentData.videosThisMonth = Math.max(0, contentData.videosThisMonth + d);
    saveContentData();
    renderContentTracker();
}

function changeHoursLogged(d) {
    contentData.hoursLogged = Math.max(0, contentData.hoursLogged + d);
    saveContentData();
    renderContentTracker();
}

function addVideoIdea() {
    const title = prompt('Video idea title?');
    if (!title) return;
    contentData.videoIdeas.push({ title });
    saveContentData();
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
