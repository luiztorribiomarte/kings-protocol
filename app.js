// ============================================
// CORE APP.JS
// Dashboard initialization + utilities
// ============================================

let notificationsOn = true;

/* ------------------ PAGE NAV ------------------ */
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const page = document.getElementById(pageName + 'Page');
    if (page) page.classList.add('active');

    const indexMap = {
        dashboard: 0,
        goalsHabits: 1,
        workout: 2,
        journal: 3,
        visionBoard: 4,
        content: 5,
        books: 6,
        settings: 7
    };

    const tabs = document.querySelectorAll('.nav-tab');
    if (tabs[indexMap[pageName]]) {
        tabs[indexMap[pageName]].classList.add('active');
    }

    if (pageName === 'journal' && typeof renderJournalPage === 'function') renderJournalPage();
    if (pageName === 'visionBoard' && typeof renderVisionBoard === 'function') renderVisionBoard();
    if (pageName === 'content' && typeof renderContentTracker === 'function') renderContentTracker();
    if (pageName === 'books' && typeof renderReadingList === 'function') renderReadingList();
    if (pageName === 'goalsHabits' && typeof renderGoals === 'function') renderGoals();
    if (pageName === 'workout' && typeof renderExerciseCards === 'function') renderExerciseCards();

    if (pageName === 'dashboard') {
        ensureDailyBriefUI();
        updateDailyBrief();
        updateStreakWithContent();

        ensureMomentumSnapshotUI();
        updateMomentumSnapshot();

        ensureLastActionUI();
        updateLastActionUI();

        initDailyFocus();
        renderTodos();
    }
}

/* ------------------ CLOCK ------------------ */
function updateClock() {
    const now = new Date();
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;

    const timeEl = document.getElementById('currentTime');
    const dateEl = document.getElementById('currentDate');

    if (timeEl) timeEl.textContent = `${h}:${m} ${ampm}`;
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

/* ------------------ HELPERS ------------------ */
function todayKey() {
    return new Date().toISOString().split('T')[0];
}

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

/* ------------------ DAILY BRIEF ------------------ */
function seededPick(arr, seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i);
    return arr[Math.abs(h) % arr.length];
}

function buildDailyBrief() {
    const seed = todayKey();

    const lines = [
        "Discipline compounds quietly.",
        "Win the morning, the day follows.",
        "Focus beats motivation.",
        "One clean action changes momentum.",
        "You already know what to do."
    ];

    return seededPick(lines, seed);
}

function ensureDailyBriefUI() {
    if (document.getElementById('dailyBriefCard')) return;

    const dash = document.getElementById('dashboardPage');
    if (!dash) return;

    const card = document.createElement('div');
    card.id = 'dailyBriefCard';
    card.className = 'habit-section';
    card.innerHTML = `<div id="dailyBriefText">Loading…</div>`;
    dash.insertBefore(card, dash.children[1]);
}

function updateDailyBrief() {
    const el = document.getElementById('dailyBriefText');
    if (el) el.textContent = buildDailyBrief();
}

/* ------------------ LAST ACTION ------------------ */
function setLastAction(label) {
    localStorage.setItem('lastAction', JSON.stringify({
        label,
        timestamp: Date.now()
    }));
}

function ensureLastActionUI() {
    if (document.getElementById('lastActionCard')) return;

    const dash = document.getElementById('dashboardPage');
    if (!dash) return;

    const card = document.createElement('div');
    card.id = 'lastActionCard';
    card.className = 'habit-section';
    card.innerHTML = `
        <div class="section-title">🕘 Last Action</div>
        <div id="lastActionText">No activity logged yet.</div>
    `;
    dash.appendChild(card);
}

function updateLastActionUI() {
    const el = document.getElementById('lastActionText');
    if (!el) return;

    const raw = localStorage.getItem('lastAction');
    if (!raw) {
        el.textContent = 'No activity logged yet.';
        return;
    }

    try {
        const { label, timestamp } = JSON.parse(raw);
        el.textContent = `${label} (${timeAgo(timestamp)})`;
    } catch {
        el.textContent = 'No activity logged yet.';
    }
}

/* ------------------ MOMENTUM SNAPSHOT ------------------ */
function ensureMomentumSnapshotUI() {
    if (document.getElementById('momentumSnapshot')) return;

    const dash = document.getElementById('dashboardPage');
    if (!dash) return;

    const wrap = document.createElement('div');
    wrap.id = 'momentumSnapshot';
    wrap.className = 'habit-section';

    wrap.innerHTML = `
        <div class="section-title">🔥 Momentum Snapshot</div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="msStreak">0</div>
                <div class="stat-label">Current Streak</div>
            </div>
        </div>
    `;

    dash.appendChild(wrap);
}

function updateMomentumSnapshot() {
    const el = document.getElementById('msStreak');
    if (el) el.textContent = localStorage.getItem('currentStreak') || '0';
}

/* ------------------ TODO LIST ------------------ */
let todos = JSON.parse(localStorage.getItem('todos') || '[]');

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function addTodo() {
    const input = document.getElementById('todoInput');
    if (!input || !input.value.trim()) return;

    todos.push({ text: input.value.trim(), done: false });
    input.value = '';
    saveTodos();
    renderTodos();
    setLastAction('Todo added');
}

function toggleTodo(i) {
    todos[i].done = !todos[i].done;
    saveTodos();
    renderTodos();
}

function deleteTodo(i) {
    todos.splice(i, 1);
    saveTodos();
    renderTodos();
}

function renderTodos() {
    const list = document.getElementById('todoList');
    if (!list) return;

    if (!todos.length) {
        list.innerHTML = `<div style="color:#9CA3AF;">No tasks yet.</div>`;
        return;
    }

    list.innerHTML = todos.map((t, i) => `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <input type="checkbox" ${t.done ? 'checked' : ''} onclick="toggleTodo(${i})">
            <span style="flex:1; ${t.done ? 'text-decoration:line-through; opacity:.6;' : ''}">
                ${t.text}
            </span>
            <button onclick="deleteTodo(${i})">×</button>
        </div>
    `).join('');
}

/* ------------------ STREAK ------------------ */
function updateStreakWithContent() {
    const streakEl = document.getElementById('currentStreak');
    if (streakEl) {
        streakEl.textContent = localStorage.getItem('currentStreak') || '0';
    }
}

/* ------------------ DAILY FOCUS ------------------ */
function initDailyFocus() {
    const input = document.getElementById('dailyFocusInput');
    if (!input) return;

    input.value = localStorage.getItem('dailyFocus') || '';
    input.oninput = () => localStorage.setItem('dailyFocus', input.value);
}

/* ------------------ INIT ------------------ */
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);

    ensureDailyBriefUI();
    updateDailyBrief();

    ensureMomentumSnapshotUI();
    updateMomentumSnapshot();

    ensureLastActionUI();
    updateLastActionUI();

    initDailyFocus();
    renderTodos();
});
