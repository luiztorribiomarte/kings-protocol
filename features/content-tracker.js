// ============================================
// CONTENT TRACKER MODULE
// ============================================

let contentData = {
    subscribers: 0,
    videosThisMonth: 0,
    hoursLogged: 0,
    videoIdeas: [],
    notes: '',
    monthlyGoal: 12,
    streak: {
        current: 0,
        lastActiveDate: null
    }
};

function initContentData() {
    const saved = localStorage.getItem('contentData');
    if (saved) contentData = JSON.parse(saved);
    updateContentStreak(false);
}

function saveContentData() {
    localStorage.setItem('contentData', JSON.stringify(contentData));
}

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function isYesterday(d) {
    const x = new Date(d);
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return x.toDateString() === y.toDateString();
}

function updateContentStreak(acted) {
    const today = getToday();
    const last = contentData.streak.lastActiveDate;

    if (!last && acted) {
        contentData.streak.current = 1;
        contentData.streak.lastActiveDate = today;
    } else if (last === today) {
        return;
    } else if (last && isYesterday(last) && acted) {
        contentData.streak.current++;
        contentData.streak.lastActiveDate = today;
    } else if (acted) {
        contentData.streak.current = 1;
        contentData.streak.lastActiveDate = today;
    }

    saveContentData();
}

function renderContentTracker() {
    const c = document.getElementById('contentContainer');
    if (!c) return;

    const streak = contentData.streak.current || 0;
    const goalPct = Math.min(
        100,
        Math.round((contentData.videosThisMonth / contentData.monthlyGoal) * 100)
    );

    c.innerHTML = `
        <div class="content-streak-card">
            ${streak > 0
                ? `🔥 Content Streak: <strong>${streak} day${streak > 1 ? 's' : ''}</strong>`
                : `Log content today to start your streak`}
        </div>

        <div class="monthly-goal-card">
            <div style="margin-bottom:6px;">
                🎯 Monthly Video Goal — ${contentData.videosThisMonth} / ${contentData.monthlyGoal}
            </div>
            <div class="goal-bar">
                <div class="goal-fill" style="width:${goalPct}%;"></div>
            </div>
        </div>

        <div class="section-title" style="margin-top:20px;">🎬 Content Tracker</div>

        <div class="content-stats">
            <div class="content-stat-card">
                <div>Subscribers</div>
                <div class="stat-big">${contentData.subscribers}</div>
                <input id="subsInput" type="number">
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
        </div>

        <div class="ideas-list">
            <div class="section-title">💡 Video Ideas</div>
            <button onclick="addVideoIdea()">➕ Add Idea</button>
            ${contentData.videoIdeas.length === 0
                ? `<p class="muted">No ideas yet.</p>`
                : contentData.videoIdeas.map((v,i)=>`
                    <div class="idea-item">
                        <strong>${v.title}</strong>
                        <button onclick="deleteVideoIdea(${i})">Delete</button>
                    </div>
                `).join('')}
        </div>

        <div class="ideas-list">
            <div class="section-title">📝 Content Notes</div>
            <textarea id="contentNotes" onchange="saveContentNotes()">${contentData.notes||''}</textarea>
        </div>
    `;
}

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
    const t = prompt('Video idea title');
    if (!t) return;
    contentData.videoIdeas.push({ title: t });
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
