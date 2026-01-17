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

    // Render page modules (only when needed)
    if (pageName === 'journal' && typeof renderJournalPage === 'function') renderJournalPage();
    if (pageName === 'visionBoard' && typeof renderVisionBoard === 'function') renderVisionBoard();
    if (pageName === 'content' && typeof renderContentTracker === 'function') renderContentTracker();
    if (pageName === 'books' && typeof renderReadingList === 'function') renderReadingList();
    if (pageName === 'goalsHabits' && typeof renderGoals === 'function') renderGoals();
    if (pageName === 'workout' && typeof renderExerciseCards === 'function') renderExerciseCards();
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
// LOCATION (CITY NAME) via Reverse Geocoding
// Uses OpenStreetMap Nominatim (no key needed)
// ============================================

async function reverseGeocodeCity(lat, lon) {
    try {
        // Nominatim requires a User-Agent; browsers handle headers differently.
        // This still works in most cases; if blocked, we fall back gracefully.
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`
        );
        const data = await res.json();

        const a = data.address || {};
        const city =
            a.city ||
            a.town ||
            a.village ||
            a.suburb ||
            a.neighbourhood ||
            a.county ||
            'Your Area';

        // Save + update both Clock widget and Weather widget labels
        localStorage.setItem('userCity', city);

        const clockLoc = document.getElementById('currentLocation');
        if (clockLoc) clockLoc.textContent = city;

        return city;
    } catch (e) {
        console.warn('Reverse geocode failed:', e);
        const saved = localStorage.getItem('userCity') || 'Your Area';
        const clockLoc = document.getElementById('currentLocation');
        if (clockLoc) clockLoc.textContent = saved;
        return saved;
    }
}

// ============================================
// 🌦️ REAL-TIME WEATHER (Open-Meteo, no key)
// Includes: real temp, feels-like, weather icon, and smart nudge
// Docs: Open-Meteo Weather API :contentReference[oaicite:0]{index=0}
// ============================================

function cToF(c) {
    return Math.round((c * 9) / 5 + 32);
}

function getWeatherIcon(code) {
    // Open-Meteo weather_code mapping (simplified)
    if (code === 0) return '☀️';
    if (code === 1 || code === 2) return '🌤️';
    if (code === 3) return '☁️';

    // Fog
    if (code === 45 || code === 48) return '🌫️';

    // Drizzle / Rain
    if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
    if ([61, 63, 65, 66, 67].includes(code)) return '🌧️';

    // Snow
    if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';

    // Thunderstorm
    if ([95, 96, 99].includes(code)) return '⛈️';

    return '🌡️';
}

function getWeatherNudge({ code, tempF, feelsF }) {
    // Short, useful “coach” nudges
    // We keep these subtle — just one line.
    const cold = tempF <= 35;
    const hot = tempF >= 85;
    const rainy = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67].includes(code);
    const snow = [71, 73, 75, 77, 85, 86].includes(code);
    const storm = [95, 96, 99].includes(code);
    const fog = (code === 45 || code === 48);

    // Feels-like gap (wind/cold/humidity effect)
    const delta = (feelsF != null && tempF != null) ? (feelsF - tempF) : 0;

    if (storm) return 'Stormy: keep the day “indoor strong” (habits + mobility).';
    if (snow) return 'Snowy: warm up extra + keep steps safe.';
    if (rainy) return 'Rainy: perfect focus day—lock habits early.';
    if (fog) return 'Low visibility: slow morning, sharp plan.';
    if (hot) return 'Hot: hydrate + train earlier if possible.';
    if (cold) return 'Cold: bundle up—momentum beats motivation.';

    if (Math.abs(delta) >= 8) {
        return delta < 0 ? 'Feels colder than it looks—warm up longer.' : 'Feels warmer—pace yourself today.';
    }

    // Default gentle nudge
    return 'Good day to stack small wins—start with the easiest habit.';
}

async function fetchWeather(lat, lon, cityLabel) {
    try {
        // Use Open-Meteo "current" fields (modern format)
        // temperature_2m, apparent_temperature, weather_code
        const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,apparent_temperature,weather_code` +
            `&temperature_unit=celsius` +
            `&timezone=auto`;

        const res = await fetch(url);
        const data = await res.json();

        const cur = data.current;
        if (!cur) return;

        const tempF = cToF(cur.temperature_2m);
        const feelsF = cToF(cur.apparent_temperature);
        const code = cur.weather_code;

        const icon = getWeatherIcon(code);
        const nudge = getWeatherNudge({ code, tempF, feelsF });

        const city = cityLabel || localStorage.getItem('userCity') || 'Your Area';

        // Update Weather Widget HTML
        const widget = document.getElementById('weatherWidget');
        if (widget) {
            widget.innerHTML = `
                <div class="widget-icon">${icon}</div>
                <div>
                    <div class="widget-value">${tempF}°F <span style="font-size:0.55em; opacity:0.75;">(feels ${feelsF}°)</span></div>
                    <div class="widget-label">${city}</div>
                    <div class="widget-sublabel" style="opacity:0.75;">${nudge}</div>
                </div>
            `;
        }

        // Optional: store last weather snapshot
        localStorage.setItem('lastWeather', JSON.stringify({
            city,
            tempF,
            feelsF,
            code,
            at: new Date().toISOString()
        }));
    } catch (err) {
        console.error('Weather fetch failed', err);

        // Fallback to last saved weather (so it never looks “dead”)
        try {
            const saved = JSON.parse(localStorage.getItem('lastWeather') || 'null');
            if (saved) {
                const widget = document.getElementById('weatherWidget');
                if (widget) {
                    widget.innerHTML = `
                        <div class="widget-icon">🌤️</div>
                        <div>
                            <div class="widget-value">${saved.tempF}°F <span style="font-size:0.55em; opacity:0.75;">(feels ${saved.feelsF}°)</span></div>
                            <div class="widget-label">${saved.city}</div>
                            <div class="widget-sublabel" style="opacity:0.65;">(offline) last update saved</div>
                        </div>
                    `;
                }
            }
        } catch {}
    }
}

function initWeatherAndCity() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const { latitude, longitude } = pos.coords;

            // 1) City name
            const city = await reverseGeocodeCity(latitude, longitude);

            // 2) Weather now + repeat
            await fetchWeather(latitude, longitude, city);
            setInterval(() => fetchWeather(latitude, longitude, city), 10 * 60 * 1000);
        },
        () => {
            console.warn('Location denied. Weather/city unavailable.');

            // If location is denied, at least show saved city + saved weather if we have it
            const savedCity = localStorage.getItem('userCity') || 'Your Area';
            const clockLoc = document.getElementById('currentLocation');
            if (clockLoc) clockLoc.textContent = savedCity;

            try {
                const saved = JSON.parse(localStorage.getItem('lastWeather') || 'null');
                const widget = document.getElementById('weatherWidget');
                if (widget && saved) {
                    widget.innerHTML = `
                        <div class="widget-icon">🌤️</div>
                        <div>
                            <div class="widget-value">${saved.tempF}°F <span style="font-size:0.55em; opacity:0.75;">(feels ${saved.feelsF}°)</span></div>
                            <div class="widget-label">${savedCity}</div>
                            <div class="widget-sublabel" style="opacity:0.65;">Allow location for live weather</div>
                        </div>
                    `;
                }
            } catch {}
        }
    );
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Init modules (only if present)
    if (typeof initHabitData === 'function') initHabitData();
    if (typeof initHabitsList === 'function') initHabitsList();
    if (typeof initMoodData === 'function') initMoodData();
    if (typeof initGoalsData === 'function') initGoalsData();
    if (typeof initWorkoutData === 'function') initWorkoutData();
    if (typeof initJournalData === 'function') initJournalData();
    if (typeof initVisionBoardData === 'function') initVisionBoardData();
    if (typeof initContentData === 'function') initContentData();
    if (typeof initReadingListData === 'function') initReadingListData();

    // Render dashboard modules
    if (typeof renderHabitGrid === 'function') renderHabitGrid();
    if (typeof renderMoodTracker === 'function') renderMoodTracker();
    if (typeof updateStreakDisplay === 'function') updateStreakDisplay();

    // Clock
    updateClock();
    setInterval(updateClock, 1000);

    // Weather + City
    initWeatherAndCity();
});
