// ============================================
// CONTENT TRACKER MODULE (SMART + ALIVE)
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
            resetContentData();
        }
    }
}

function resetContentData() {
    contentData = {
        subscribers: 0,
        videosThisMonth: 0,
        hoursLogged: 0,
        videoIdeas: [],
        notes: ''
    };
}

function saveContentData() {
    localStorage.setItem('contentData', JSON.stringify(contentData));
}

// ---------- DATE HELPERS ----------
function getMonthProgress() {
    const now = new Date();
    const day = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return { day, daysInMonth };
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
    el._t = setTimeout(() => el.style.opacity = '0', 2200);
}

// ---------- SMART PACING ----------
function getPacingMessage() {
    const { day, daysInMonth } = getMonthProgress();

    if (day <= 2) {
        return 'New month — early actions set the tone.';
    }

    const pace = contentData.videosThisMonth / day;
    const projected = Math.round(pace * daysInMonth);

    if (contentData.videosThisMonth === 0) {
        return 'No content logged yet. One session starts momentum.';
    }

    if (projected >= 12) {
        return `Strong pace — on track for ~${projected} videos this month.`;
    }

    if (projected >= 8) {
        return `Decent pace — ~${projected} videos projected. Stay consistent.`;
    }

    return `Below pace — ~${projected} projected. A short session today fixes this.`;
}

// ---------- RENDER ----------
function renderContentTracker() {
    const container = document.getElementById('contentContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="section-title" style="margin-bottom:20px;">🎬 Content Tracker</div>

        <div class="content-stats">

            <div class="content-stat-card">
                <div style="color:#9CA3AF;">YouTube Subscribers</div>
                <div style="font-size:2.5em;font-weight:900;color:white;">
                    ${contentData.subscribers.toLocaleString()}
                </div>
                <div style="display:flex;gap:6px;">
                    <input id="subsInput" type="number" placeholder="New count"
                        style="flex:1;padding:8px;background:rgba(255,255,255,0.05);
                        border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:white;">
                    <button onclick="updateSubscribers()">Update</button>
                </div>
            </div>

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

        <!-- SMART PACING -->
        <div style="
            margin-top:12px;
            font-weight:700;
            color:#9CA3AF;
        ">
            ${getPacingMessage()}
        </div>

        <div id="contentFeedback" style="
            margin-top:8px;
            font-weight:800;
            opacity:0;
            transition:opacity .3s ease;
        "></div>

        <div class="ideas-list" style="margin-top:30px;">
            <div class="section-title" style="display:flex;justify-content:space-between;">
                <span>💡 Video Ideas</span>
                <button onclick="addVideoIdea()">➕ Add Idea</button>
            </div>

            ${contentData.videoIdeas.length === 0
                ? `<div style="color:#6B7280;padding:20px;text-align:center;">No ideas yet.</div>`
                : contentData.videoIdeas.map((idea, i) => `
                    <div class="idea-item">
                        <div style="display:flex;justify-content:space-between;">
                            <strong>${idea.title}</strong>
                            <button onclick="deleteVideoIdea(${i})">Delete</button>
                        </div>
                        ${idea.description ? `<div style="color:#9CA3AF;">${idea.description}</div>` : ''}
                    </div>
                `).join('')
            }
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
}

// ---------- ACTIONS ----------
function updateSubscribers() {
    const input = document.getElementById('subsInput');
    const val = parseInt(input.value);
    if (!val || val < 0) return;

    contentData.subscribers = val;
    saveContentData();
    renderContentTracker();
    showContentFeedback('Subscriber count updated.', 'success');
}

function changeVideosCount(delta) {
    contentData.videosThisMonth = Math.max(0, contentData.videosThisMonth + delta);
    saveContentData();
    renderContentTracker();
    showContentFeedback(delta > 0 ? '+1 video logged.' : 'Video removed.', delta > 0 ? 'success' : 'warn');
}

function changeHoursLogged(delta) {
    contentData.hoursLogged = Math.max(0, contentData.hoursLogged + delta);
    saveContentData();
    renderContentTracker();
    showContentFeedback(delta > 0 ? '+1 hour logged.' : 'Hour removed.', delta > 0 ? 'success' : 'warn');
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

    contentData.videoIdeas.unshift({ id: Date.now(), title, description });
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
