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
        updateStreakWithContent(); // ✅ NEW
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

/* ------------------ CONTENT SIGNAL ------------------ */
function getContentSignal() {
    try {
        const data = JSON.parse(localStorage.getItem('contentData') || '{}');
        return {
            hours: Number(data.hoursLogged || 0),
            videos: Number(data.videosThisMonth || 0)
        };
    } catch {
        return { hours: 0, videos: 0 };
    }
}

/* ------------------ STREAK + CONTENT BOOST ------------------ */
function updateStreakWithContent() {
    if (typeof getDayCompletion !== 'function') return;

    const today = todayKey();
    const habits = getDayCompletion(today);
    const content = getContentSignal();

    let effectivePercent = habits.percent;

    // 🔥 Content boost logic
    if (habits.percent >= 60 && habits.percent < 80) {
        if (content.hours >= 1 || content.videos >= 1) {
            effectivePercent = 80;
        }
    }

    const statusEl = document.getElementById('dailyStatus');
    if (statusEl) {
        statusEl.textContent =
            effectivePercent >= 80
                ? 'Day secured. Streak protected.'
                : 'Push for 80% to secure the day.';
        statusEl.style.color = effectivePercent >= 80 ? '#22c55e' : '#f87171';
    }

    // Persist streak memory
    const lastKey = localStorage.getItem('lastStreakDay');
    let streak = Number(localStorage.getItem('currentStreak') || 0);

    if (effectivePercent >= 80) {
        if (lastKey !== today) {
            streak += 1;
            localStorage.setItem('currentStreak', streak);
            localStorage.setItem('lastStreakDay', today);
        }
    }

    const streakEl = document.getElementById('currentStreak');
    if (streakEl) streakEl.textContent = streak;
}

/* ------------------ DAILY BRIEF ------------------ */
function seededPick(arr, seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i);
    return arr[Math.abs(h) % arr.length];
}

function buildDailyBrief() {
    const seed = todayKey();
    const content = getContentSignal();

    const openers = [
        "No excuses—just execution.",
        "Discipline compounds quietly.",
        "Momentum favors action.",
        "Stack the day correctly.",
        "One clean win starts everything."
    ];

    const contentWins = [
        "Content work logged. That counts—keep stacking.",
        "Output recorded. Momentum is real.",
        "You showed up creatively. Protect the streak.",
        "Content execution locked in."
    ];

    const nudges = [
        "No content yet. One focused block changes the day.",
        "Nothing logged—start small, start now.",
        "One session today still moves the needle.",
        "Create first. Optimize later."
    ];

    const line =
        content.hours > 0 || content.videos > 0
            ? seededPick(contentWins, seed)
            : seededPick(nudges, seed);

    return `${seededPick(openers, seed)} ${line}`;
}

function ensureDailyBriefUI() {
    if (document.getElementById('dailyBriefCard')) return;

    const dash = document.getElementById('dashboardPage');
    if (!dash) return;

    const card = document.createElement('div');
    card.id = 'dailyBriefCard';
    card.style.cssText = `
        margin: 16px 0;
        padding: 16px;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(99,102,241,.18), rgba(236,72,153,.12));
        border: 1px solid rgba(255,255,255,.18);
        color: white;
        font-weight: 600;
    `;

    card.innerHTML = `<div id="dailyBriefText">Loading…</div>`;
    dash.insertBefore(card, dash.children[1]);
}

function updateDailyBrief() {
    ensureDailyBriefUI();
    const el = document.getElementById('dailyBriefText');
    if (el) el.textContent = buildDailyBrief();
}

/* ------------------ INIT ------------------ */
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initHabitData === 'function') initHabitData();
    if (typeof initHabitsList === 'function') initHabitsList();
    if (typeof initMoodData === 'function') initMoodData();
    if (typeof initGoalsData === 'function') initGoalsData();
    if (typeof initWorkoutData === 'function') initWorkoutData();
    if (typeof initJournalData === 'function') initJournalData();
    if (typeof initVisionBoardData === 'function') initVisionBoardData();
    if (typeof initContentData === 'function') initContentData();
    if (typeof initReadingListData === 'function') initReadingListData();

    if (typeof renderHabitGrid === 'function') renderHabitGrid();
    if (typeof renderMoodTracker === 'function') renderMoodTracker();

    updateClock();
    setInterval(updateClock, 1000);

    ensureDailyBriefUI();
    updateDailyBrief();
    updateStreakWithContent();
});
