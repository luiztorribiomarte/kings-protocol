// ============================================
// CORE APP.JS - Main initialization & utilities
// ============================================
// All feature modules are loaded separately

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
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background: linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(236, 72, 153, 0.95)); border: 2px solid rgba(139, 92, 246, 0.8); border-radius: 20px; padding: 30px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; position: relative;';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.onclick = closeModal;
    closeBtn.style.cssText = 'position: absolute; top: 15px; right: 15px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; color: white; font-size: 28px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-weight: 700; line-height: 1;';
    
    content.appendChild(closeBtn);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
    };
    
    return content;
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.remove();
}

// ============================================
// NAVIGATION
// ============================================

function showPage(pageName) {
    document.querySelectorAll('.page, .page-content').forEach(page => {
        page.classList.remove('active');
    });

    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    const pageEl = document.getElementById(pageName + 'Page');
    if (!pageEl) return;

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
        renderGoals();
        if (typeof updateHabitAnalytics === 'function') updateHabitAnalytics();
    }
    if (pageName === 'workout') renderExerciseCards();
    if (pageName === 'journal') renderJournalPage();
    if (pageName === 'visionBoard') renderVisionBoard();
    if (pageName === 'content') renderContentTracker();
    if (pageName === 'books') renderReadingList();
}

// ============================================
// LIVE CLOCK (FIXED IDS — THIS WAS THE BUG)
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

    // ✅ MATCH HTML IDS
    const clockElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');

    if (clockElement) clockElement.textContent = timeString;
    if (dateElement) dateElement.textContent = dateString;
}

function updateLocation() {
    // ✅ MATCH HTML ID
    const locationElement = document.getElementById('currentLocation');
    if (!locationElement) return;

    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
                    );
                    const data = await response.json();

                    const city =
                        data.address.city ||
                        data.address.town ||
                        data.address.village ||
                        data.address.suburb ||
                        data.address.county ||
                        'Unknown';

                    locationElement.textContent = city;
                    localStorage.setItem('userLocation', city);
                } catch {
                    locationElement.textContent = localStorage.getItem('userLocation') || 'New York';
                }
            },
            () => {
                locationElement.textContent = localStorage.getItem('userLocation') || 'New York';
            }
        );
    } else {
        locationElement.textContent = localStorage.getItem('userLocation') || 'New York';
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initHabitData();
    initGoalsData();
    initMoodData();
    initHabitsList();
    initWorkoutData();
    initJournalData();
    initVisionBoardData();
    initContentData();
    initReadingListData();

    renderHabitGrid();
    renderMoodTracker();
    updateStreakDisplay();

    updateClock();
    setInterval(updateClock, 1000);
    updateLocation();

    showPage('dashboard');
});
