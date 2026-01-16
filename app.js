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

function closeModal(e) {
    const modal = document.getElementById('modal');
    if (!modal) return;

    if (!e || e.target === modal) {
        modal.style.display = 'none';
    }
}

function openModal(html) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;

    body.innerHTML = html;
    modal.style.display = 'flex';
}

// ============================================
// NAVIGATION (THIS WAS A CORE ISSUE)
// ============================================

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const pageEl = document.getElementById(page + 'Page');
    if (pageEl) pageEl.classList.add('active');

    const tabs = document.querySelectorAll('.nav-tab');
    const map = {
        dashboard: 0,
        goalsHabits: 1,
        workout: 2,
        journal: 3,
        visionBoard: 4,
        content: 5,
        books: 6,
        settings: 7
    };

    if (tabs[map[page]]) tabs[map[page]].classList.add('active');

    if (page === 'goalsHabits' && typeof renderGoals === 'function') {
        renderGoals();
        if (typeof updateHabitAnalytics === 'function') updateHabitAnalytics();
    }

    if (page === 'workout' && typeof renderExerciseCards === 'function') {
        renderExerciseCards();
    }

    if (page === 'journal' && typeof renderJournalPage === 'function') {
        renderJournalPage();
    }

    if (page === 'visionBoard' && typeof renderVisionBoard === 'function') {
        renderVisionBoard();
    }

    if (page === 'content' && typeof renderContentTracker === 'function') {
        renderContentTracker();
    }

    if (page === 'books' && typeof renderReadingList === 'function') {
        renderReadingList();
    }
}

// ============================================
// TIMER
// ============================================

function startTimer(minutes) {
    if (typeof minutes === 'number') {
        timerSeconds = minutes * 60;
        timerMode = minutes === 25 ? 'focus' : minutes === 5 ? 'short' : 'long';
        updateTimerDisplay();
    }

    if (timerInterval) return;

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();

        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;

            if (notificationsOn && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('Timer Complete!', {
                    body: timerMode === 'focus' ? 'Time to rest.' : 'Back to focus.',
                });
            }
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerSeconds = 1500;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const el = document.getElementById('timerDisplay');
    if (!el) return;
    const m = Math.floor(timerSeconds / 60);
    const s = timerSeconds % 60;
    el.textContent = `${m}:${String(s).padStart(2, '0')}`;
}

// ============================================
// PLAYLIST
// ============================================

function loadPlaylist() {
    const input = document.getElementById('playlistUrl');
    const player = document.getElementById('playlistPlayer');
    if (!input || !player) return;

    const url = input.value;
    let embed = '';

    if (url.includes('spotify')) {
        const id = url.split('/playlist/')[1]?.split('?')[0];
        embed = `https://open.spotify.com/embed/playlist/${id}`;
    }

    if (url.includes('youtube')) {
        const id = url.split('list=')[1]?.split('&')[0];
        embed = `https://www.youtube.com/embed/videoseries?list=${id}`;
    }

    if (!embed) {
        alert('Invalid playlist URL');
        return;
    }

    player.innerHTML = `<iframe src="${embed}" width="100%" height="380" loading="lazy"></iframe>`;
}

// ============================================
// CLOCK + LOCATION (FIXED IDS)
// ============================================

function updateClock() {
    const now = new Date();
    const h = now.getHours() % 12 || 12;
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';

    const timeEl = document.getElementById('currentTime');
    const dateEl = document.getElementById('currentDate');

    if (timeEl) timeEl.textContent = `${h}:${m} ${ampm}`;
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function updateLocation() {
    const el = document.getElementById('currentLocation');
    const cached = localStorage.getItem('userLocation');
    if (cached && el) el.textContent = cached;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async pos => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
            );
            const data = await res.json();
            const city =
                data.address.city ||
                data.address.town ||
                data.address.village ||
                data.address.county ||
                'Unknown';

            localStorage.setItem('userLocation', city);
            if (el) el.textContent = city;
        } catch {}
    });
}

// ============================================
// MODE TOGGLE
// ============================================

function toggleMode() {
    const body = document.body;
    const icon = document.getElementById('modeIcon');
    const text = document.getElementById('modeText');

    if (body.classList.contains('fire-mode')) {
        body.classList.remove('fire-mode');
        body.classList.add('zen-mode');
        if (icon) icon.textContent = '🧘';
        if (text) text.textContent = 'Zen Mode';
    } else {
        body.classList.remove('zen-mode');
        body.classList.add('fire-mode');
        if (icon) icon.textContent = '🔥';
        if (text) text.textContent = 'Fire Mode';
    }
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
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
    updateLocation();
    setInterval(updateClock, 1000);
});
