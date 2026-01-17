// ============================================
// CORE APP.JS
// ============================================

let notificationsOn = true;
let timerInterval = null;
let timerSeconds = 1500;
let timerMode = 'focus';

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

    if (pageName === 'journal' && typeof renderJournalPage === 'function') {
        renderJournalPage();
    }
    if (pageName === 'visionBoard' && typeof renderVisionBoard === 'function') {
        renderVisionBoard();
    }
    if (pageName === 'content' && typeof renderContentTracker === 'function') {
        renderContentTracker();
    }
    if (pageName === 'books' && typeof renderReadingList === 'function') {
        renderReadingList();
    }
}

// ============================================
// CLOCK (REAL TIME)
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
// 🌦️ REAL-TIME WEATHER (GEOLOCATION + OPEN-METEO)
// ============================================

async function fetchWeather(lat, lon) {
    try {
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        const data = await res.json();

        if (!data.current_weather) return;

        const tempC = data.current_weather.temperature;
        const tempF = Math.round((tempC * 9) / 5 + 32);
        const code = data.current_weather.weathercode;

        const icon = getWeatherIcon(code);

        const widget = document.getElementById('weatherWidget');
        if (!widget) return;

        widget.innerHTML = `
            <div class="widget-icon">${icon}</div>
            <div>
                <div class="widget-value">${tempF}°F</div>
                <div class="widget-label">Right now</div>
            </div>
        `;
    } catch (err) {
        console.error('Weather fetch failed', err);
    }
}

function getWeatherIcon(code) {
    if (code === 0) return '☀️';
    if (code <= 2) return '🌤️';
    if (code <= 48) return '☁️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 99) return '⛈️';
    return '🌡️';
}

function initWeather() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude, longitude } = pos.coords;
            fetchWeather(latitude, longitude);
            setInterval(() => fetchWeather(latitude, longitude), 10 * 60 * 1000);
        },
        () => {
            console.warn('Location denied. Weather unavailable.');
        }
    );
}

// ============================================
// INITIALIZATION
// ============================================

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
    if (typeof updateStreakDisplay === 'function') updateStreakDisplay();

    updateClock();
    setInterval(updateClock, 1000);

    initWeather();
});
