// ============================================
// CORE APP.JS
// Dashboard initialization + utilities
// ============================================

let notificationsOn = true;

// ============================================
// MODAL SYSTEM
// ============================================

function openModal(html) {
    const overlay = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    if (!overlay || !body) return;
    body.innerHTML = html;
    overlay.style.display = 'flex';
}

function closeModal() {
    const overlay = document.getElementById('modal');
    if (overlay) overlay.style.display = 'none';
}

// ============================================
// NAVIGATION
// ============================================

function showPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const page = document.getElementById(pageName + 'Page');
    if (page) page.classList.add('active');

    const tabs = document.querySelectorAll('.nav-tab');
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

    if (tabs[indexMap[pageName]]) {
        tabs[indexMap[pageName]].classList.add('active');
    }

    // Render pages
    if (pageName === 'journal' && typeof renderJournalPage === 'function') renderJournalPage();
    if (pageName === 'visionBoard' && typeof renderVisionBoard === 'function') renderVisionBoard();
    if (pageName === 'content' && typeof renderContentTracker === 'function') renderContentTracker();
    if (pageName === 'books' && typeof renderReadingList === 'function') renderReadingList();
    if (pageName === 'goalsHabits' && typeof renderGoals === 'function') renderGoals();
    if (pageName === 'workout' && typeof renderExerciseCards === 'function') renderExerciseCards();
}

// ============================================
// CLOCK
// ============================================

function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    const time = `${hours}:${minutes} ${ampm}`;
    const date = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    const timeEl = document.getElementById('currentTime');
    const dateEl = document.getElementById('currentDate');

    if (timeEl) timeEl.textContent = time;
    if (dateEl) dateEl.textContent = date;
}

// ============================================
// INITIALIZATION (FIX IS HERE)
// ============================================

document.addEventListener('DOMContentLoaded', () => {

    // INIT ALL MODULE DATA (DO NOT REMOVE)
    if (typeof initHabitData === 'function') initHabitData();
    if (typeof initHabitsList === 'function') initHabitsList();
    if (typeof initMoodData === 'function') initMoodData();
    if (typeof initGoalsData === 'function') initGoalsData();
    if (typeof initWorkoutData === 'function') initWorkoutData();
    if (typeof initJournalData === 'function') initJournalData();
    if (typeof initVisionBoardData === 'function') initVisionBoardData();

    // ✅ THIS WAS MISSING — CONTENT PAGE FIX
    if (typeof initContentData === 'function') initContentData();

    if (typeof initReadingListData === 'function') initReadingListData();

    // Dashboard renders
    if (typeof renderHabitGrid === 'function') renderHabitGrid();
    if (typeof renderMoodTracker === 'function') renderMoodTracker();
    if (typeof updateStreakDisplay === 'function') updateStreakDisplay();

    // Clock
    updateClock();
    setInterval(updateClock, 1000);
});
