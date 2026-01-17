// ============================================
// CONTENT TRACKER MODULE (ALIVE + FEEDBACK)
// ============================================

let contentData = {
    subscribers: 0,
    videosThisMonth: 0,
    hoursLogged: 0,
    videoIdeas: [],
    notes: ''
};

// ---------- INIT ----------
function initContentData() {
    const saved = localStorage.getItem('contentData');
    if (saved) {
        try {
            contentData = JSON.parse(saved);
        } catch {
            contentData = { subscribers: 0, videosThisMonth: 0, hoursLogged: 0, videoIdeas: [], notes: '' };
        }
    }
}

function saveContentData() {
    localStorage.setItem('contentData', JSON.stringify(contentData));
}

// ---------- FEEDBACK ----------
function showContentFeedback(msg, type = 'neutral') {
    const el = document.getElementById('contentFeedback');
    if (!el) return;

    el.textContent = msg;
    el.style.opacity = '1';
    el.style.color =
        type === 'success' ? '#22c55e' :
        type === 'warn' ? '#fbbf24' :
        '#9CA3AF';

    clearTimeout(el._t);
    el._t = setTimeout(() => {
        el.style.opacity = '0';
    }, 2000);
}

// ---------- RENDER ----------
function renderContentTracker() {
    const container = document.getElementById('contentContainer');
    if (!container) return;

    let html = `
        <div class="section-title" style="margin-bottom:20px;">🎬 Content Tracker</div>

        <div id="contentFeedback" style="
            margin-bottom:14px;
            font-weight:700;
            opacity:0;
            transition:opacity .3s ease;
        "></div>

        <div class="content-stats">
    `;

    // Subscribers
    html += `
        <div class="content-stat-card">
            <div style="color:#9CA3AF;">YouTube Subscribers</div>
            <div id="subsDisplay" style="font-size:2.5em;font-weight:900;color:white;">
                ${contentData.subscribers.toLocaleString()}
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;">
                <input id="subsInput" type="number" placeholder="New count"
                    style="flex:1;padding:8px;background:rgba(255,255,255,0.05);
                    border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:white;">
                <button onclick="updateSubscribers()">Update</button>
            </div>
        </div>
    `;

    // Videos
    html += `
        <div class="content-stat-card">
            <div style="color:#9CA3AF;">Videos This Month</div>
            <div style="font-size:2.5em;font-weight:900;color:white;">
                ${contentData.videosThisMonth}
            </div>
            <div style="display:flex;gap:8px;">
                <button onclick="changeVideosCount(-1)">−</button>
                <button onclick="changeVideosCount(1)">+</button>
            </div>
        </div>
    `;

    // Hours
    html += `
        <div class="content-stat-card">
            <div style="color:#9CA3AF;">Hours Logged</div>
            <div style="font-size:2.5em;font-weight:900;color:white;">
                ${contentData.hoursLogged}
            </div>
            <div style="display:flex;gap:8px;">
                <button onclick="changeHoursLogged(-1)">−</button>
                <button onclick="changeHoursLogged(1)">+</button>
            </div>
        </div>
    </div>
    `;

    // Ideas
    html += `
        <div class="ideas-list" style="margin-top:30px;">
            <div class="section-title" style="display:flex;justify-content:space-between;">
                <span>💡 Video Ideas</span>
                <button onclick="addVideoIdea()">➕ Add Idea</button>
            </div>
    `;

    if (contentData.videoIdeas.length === 0) {
        html += `<div style="color:#6B7280;padding:20px;text-align:center;">
            No ideas yet — capture momentum.
        </div>`;
    } else {
        contentData.videoIdeas.forEach((idea, i) => {
            html += `
                <div class="idea-item" id="idea-${idea.id}">
                    <div style="display:flex;justify-content:space-between;">
                        <strong>${idea.title}</strong>
                        <button onclick="deleteVideoIdea(${i})">Delete</button>
                    </div>
                    ${idea.description ? `<div style="color:#9CA3AF;">${idea.description}</div>` : ''}
                </div>
            `;
        });
    }

    html += `
        </div>

        <div class="ideas-list" style="margin-top:30px;">
            <div class="section-title">📝 Content Notes</div>
            <textarea id="contentNotes"
                style="width:100%;min-height:180px;padding:14px;
                background:rgba(255,255,255,0.05);
                border:1px solid rgba(255,255,255,0.15);
                border-radius:10px;color:white;"
                onchange="saveContentNotes()"
            >${contentData.notes}</textarea>
        </div>
    `;

    container.innerHTML = html;
}

// ---------- ACTIONS ----------
function updateSubscribers() {
    const input = document.getElementById('subsInput');
    const val = parseInt(input.value);

    if (!val || val < 0) return;

    const prev = contentData.subscribers;
    contentData.subscribers = val;
    saveContentData();
    renderContentTracker();

    showContentFeedback(
        val > prev ? 'Subscriber count increased.' : 'Subscriber count updated.',
        'success'
    );
}

function changeVideosCount(delta) {
    contentData.videosThisMonth = Math.max(0, contentData.videosThisMonth + delta);
    saveContentData();
    renderContentTracker();
    showContentFeedback(
        delta > 0 ? '+1 video logged. Momentum maintained.' : 'Video removed.',
        delta > 0 ? 'success' : 'warn'
    );
}

function changeHoursLogged(delta) {
    contentData.hoursLogged = Math.max(0, contentData.hoursLogged + delta);
    saveContentData();
    renderContentTracker();
    showContentFeedback(
        delta > 0 ? '+1 hour logged. Stay consistent.' : 'Hour removed.',
        delta > 0 ? 'success' : 'warn'
    );
}

function addVideoIdea() {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2>Add Video Idea</h2>
        <input id="ideaTitle" class="form-input" placeholder="Title">
        <textarea id="ideaDesc" class="form-input" placeholder="Notes (optional)"></textarea>
        <div class="form-actions">
            <button onclick="saveVideoIdea()">Save</button>
            <button onclick="closeModal()">Cancel</button>
        </div>
    `;
    document.getElementById('modal').style.display = 'flex';
}

function saveVideoIdea() {
    const title = document.getElementById('ideaTitle').value.trim();
    const description = document.getElementById('ideaDesc').value.trim();
    if (!title) return;

    const idea = {
        id: Date.now(),
        title,
        description
    };

    contentData.videoIdeas.unshift(idea);
    saveContentData();
    closeModal();
    renderContentTracker();

    showContentFeedback('Idea captured.', 'success');
}

function deleteVideoIdea(index) {
    contentData.videoIdeas.splice(index, 1);
    saveContentData();
    renderContentTracker();
    showContentFeedback('Idea removed.', 'warn');
}

function saveContentNotes() {
    contentData.notes = document.getElementById('contentNotes').value;
    saveContentData();
}
