// ============================================
// CORE APP.JS - Main initialization & utilities
// ============================================

let notificationsOn = true;
let timerInterval = null;
let timerSeconds = 1500;
let timerMode = 'focus';

// ============================================
// MODAL SYSTEM
// ============================================

function createModal() {
    const overlay = document.createElement('div');
    overlay.id = 'modalOverlay';
    overlay.style.cssText =
        'position: fixed; inset: 0; background: rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:1000;';

    const content = document.createElement('div');
    content.style.cssText =
        'background: linear-gradient(135deg, rgba(139,92,246,.95), rgba(236,72,153,.95)); border-radius:20px; padding:30px; max-width:600px; width:90%; max-height:90vh; overflow:auto; position:relative;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.onclick = closeModal;
    closeBtn.style.cssText =
        'position:absolute; top:15px; right:15px; background:rgba(255,255,255,.2); border:2px solid white; color:white; font-size:28px; width:40px; height:40px; border-radius:50%; cursor:pointer;';

    content.appendChild(closeBtn);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    overlay.onclick = e => {
        if (e.target === overlay) closeModal();
    };

    return content;
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.remove();
}

// ============================================
// NAVIGATION (STABLE)
// ============================================

function showPage(pageName) {
    document.querySelectorAll('[id$="Page"]').forEach(page => {
        page.style.display = 'none';
        page.classList.remove('active');
    });

    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    const pageEl = document.getElementById(pageName + 'Page');
    if (!pageEl) return;

    pageEl.style.display = 'block';
    pageEl.classList.add('active');

    const tabs = document.querySelectorAll('.nav-tab');
    const pageIndex = {
        dashboard: 0,
        goalsHabits: 1,
        workout: 2,
        journal: 3,
        visionBoard: 4,
        content: 5,
        books: 6,
        settings: 7
    };

    if (tabs[pageIndex[pageName]]) {
        tabs[pageIndex[pageName]].classList.add('active');
    }

    if (pageName === 'goalsHabits') {
        if (typeof renderGoals === 'function') renderGoals();
        if (typeof updateHabitAnalytics === 'function') updateHabitAnalytics();
    }
    if (pageName === 'workout' && typeof renderExerciseCards === 'function') renderExerciseCards();
    if (pageName === 'journal' && typeof renderJournalPage === 'function') renderJournalPage();
    if (pageName === 'visionBoard' && typeof renderVisionBoard === 'function') renderVisionBoard();
    if (pageName === 'content' && typeof renderContentTracker === 'function') renderContentTracker();
    if (pageName === 'books' && typeof renderReadingList === 'function') renderReadingList();
}

// ============================================
// LIVE CLOCK + LOCATION (FIXED IDS)
// ============================================

function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    const timeString = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    const dateString = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    const timeEl = document.getElementById('currentTime');
    const dateEl = document.getElementById('currentDate');

    if (timeEl) timeEl.textContent = timeString;
    if (dateEl) dateEl.textContent = dateString;
}

function updateLocation() {
    const locationEl = document.getElementById('currentLocation');
    if (!locationEl) return;

    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            async pos => {
                try {
                    const { latitude, longitude } = pos.coords;
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
                    );
                    const data = await res.json();

                    const city =
                        data.address.city ||
                        data.address.town ||
                        data.address.village ||
                        data.address.suburb ||
                        data.address.county ||
                        'Unknown';

                    locationEl.textContent = city;
                    localStorage.setItem('userLocation', city);
                } catch {
                    locationEl.textContent = localStorage.getItem('userLocation') || 'New York';
                }
            },
            () => {
                locationEl.textContent = localStorage.getItem('userLocation') || 'New York';
            }
        );
    } else {
        locationEl.textContent = localStorage.getItem('userLocation') || 'New York';
    }
}

// ============================================
// DASHBOARD SMART STATUS (NEW)
// ============================================

function updateDailyStatus() {
    const el = document.getElementById('dailyStatus');
    if (!el) return;

    const streak = parseInt(document.getElementById('currentStreak')?.textContent || 0);
    const weekly = parseInt(document.getElementById('weeklyCompletion')?.textContent || 0);

    let message = '⚠️ Let’s get started today.';
    let color = '#FBBF24';

    if (streak >= 5) {
        message = '🔥 Strong momentum. Protect the streak.';
        color = '#34D399';
    } else if (weekly >= 50) {
        message = '✅ You’re on track this week.';
        color = '#60A5FA';
    }

    el.textContent = message;
    el.style.borderColor = color;
}

// ============================================
// STAT PULSE (ALIVE FEEL)
// ============================================

function pulseStat(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('updated');
    setTimeout(() => el.classList.remove('updated'), 150);
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    if (typeof initHabitData === 'function') initHabitData();
    if (typeof initGoalsData === 'function') initGoalsData();
    if (typeof initMoodData === 'function') initMoodData();
    if (typeof initHabitsList === 'function') initHabitsList();
    if (typeof initWorkoutData === 'function') initWorkoutData();
    if (typeof initJournalData === 'function') initJournalData();
    if (typeof initVisionBoardData === 'function') initVisionBoardData();
    if (typeof initContentData === 'function') initContentData();
    if (typeof initReadingListData === 'function') initReadingListData();

    if (typeof renderHabitGrid === 'function') renderHabitGrid();
    if (typeof renderMoodTracker === 'function') renderMoodTracker();
    if (typeof updateStreakDisplay === 'function') updateStreakDisplay();

    updateClock();
    setInterval(updateClock, 1000);
    updateLocation();
    updateDailyStatus();

    showPage('dashboard');
});
