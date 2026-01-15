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
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background: linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(139, 92, 246, 0.95)); border: 2px solid rgba(59, 130, 246, 0.8); border-radius: 20px; padding: 30px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; position: relative;';
    
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
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(pageName + 'Page').classList.add('active');
    const tabs = document.querySelectorAll('.nav-tab');
    const pageIndex = {dashboard: 0, goals: 1, workout: 2, journal: 3, vision: 4, content: 5, books: 6, settings: 7};
    tabs[pageIndex[pageName]].classList.add('active');
    
    // Load page-specific data
    if (pageName === 'goals') {
        renderGoals();
        if (typeof updateHabitAnalytics === 'function') updateHabitAnalytics();
    }
    
    if (pageName === 'workout') {
        renderExerciseCards();
    }
    
    if (pageName === 'journal') {
        renderJournalPage();
    }
    
    if (pageName === 'vision') {
        renderVisionBoard();
    }
    
    if (pageName === 'content') {
        renderContentTracker();
    }
}

// ============================================
// FOCUS TIMER
// ============================================

function setTimerMode(mode) {
    timerMode = mode;
    document.querySelectorAll('.timer-mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (mode === 'short') timerSeconds = 300;
    else if (mode === 'focus') timerSeconds = 1500;
    else if (mode === 'long') timerSeconds = 900;
    
    resetTimer();
}

function startTimer() {
    if (timerInterval) return;
    
    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            if (notificationsOn && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('Timer Complete!', {
                    body: timerMode === 'focus' ? 'Great work! Time for a break.' : 'Break over! Back to focus.',
                    icon: '🔥'
                });
            }
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    
    if (timerMode === 'short') timerSeconds = 300;
    else if (timerMode === 'focus') timerSeconds = 1500;
    else if (timerMode === 'long') timerSeconds = 900;
    
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    const display = document.getElementById('timerDisplay');
    if (display) {
        display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// ============================================
// NOTIFICATIONS
// ============================================

function toggleNotifications() {
    notificationsOn = !notificationsOn;
    const toggle = document.getElementById('notifToggle');
    const status = document.getElementById('notifStatus');
    
    if (toggle) {
        if (notificationsOn) {
            toggle.classList.remove('off');
        } else {
            toggle.classList.add('off');
        }
    }
    
    if (status) {
        status.textContent = notificationsOn ? 'ON' : 'OFF';
    }
    
    if (notificationsOn && 'Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
}

// ============================================
// PLAYLIST
// ============================================

function loadPlaylist() {
    const url = document.getElementById('playlistUrl')?.value;
    if (!url) {
        alert('Please paste a playlist URL');
        return;
    }
    
    const frame = document.getElementById('playlistFrame');
    const toggle = document.getElementById('playlistToggle');
    
    let embedUrl = '';
    if (url.includes('spotify')) {
        const playlistId = url.split('/playlist/')[1]?.split('?')[0];
        embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
    } else if (url.includes('youtube')) {
        const playlistId = url.split('list=')[1]?.split('&')[0];
        embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
    }
    
    if (embedUrl && frame) {
        frame.innerHTML = `<iframe src="${embedUrl}" width="100%" height="380" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
        frame.style.display = 'block';
        if (toggle) toggle.style.display = 'inline-block';
    }
}

function togglePlaylist() {
    const frame = document.getElementById('playlistFrame');
    if (frame) {
        frame.style.display = frame.style.display === 'none' ? 'block' : 'none';
    }
}

// ============================================
// LIVE CLOCK WITH GEOLOCATION
// ============================================

function updateClock() {
    const now = new Date();
    
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeString = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', options);
    
    const clockElement = document.getElementById('liveClock');
    const dateElement = document.getElementById('liveDate');
    
    if (clockElement) clockElement.textContent = timeString;
    if (dateElement) dateElement.textContent = dateString;
}

function updateLocation() {
    const locationElement = document.getElementById('clockLocation');
    
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
                    const data = await response.json();
                    
                    const city = data.address.city || 
                                data.address.town || 
                                data.address.village || 
                                data.address.suburb || 
                                data.address.neighbourhood || 
                                data.address.county ||
                                'Unknown';
                    
                    if (locationElement) {
                        locationElement.textContent = city;
                    }
                    
                    localStorage.setItem('userLocation', city);
                    
                    // Fetch weather for this location
                    fetchWeather(lat, lon, city);
                } catch (error) {
                    console.error('Error getting location name:', error);
                    if (locationElement) {
                        locationElement.textContent = 'New York';
                    }
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                const savedLocation = localStorage.getItem('userLocation');
                if (locationElement) {
                    locationElement.textContent = savedLocation || 'New York';
                }
                // Default to NYC coordinates
                fetchWeather(40.7128, -74.0060, savedLocation || 'New York');
            }
        );
    } else {
        const savedLocation = localStorage.getItem('userLocation');
        if (locationElement) {
            locationElement.textContent = savedLocation || 'New York';
        }
        fetchWeather(40.7128, -74.0060, savedLocation || 'New York');
    }
}

// ============================================
// WEATHER API
// ============================================

async function fetchWeather(lat, lon, city) {
    try {
        // Using Open-Meteo API (free, no key required)
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`);
        const data = await response.json();
        
        if (data.current) {
            const temp = Math.round(data.current.temperature_2m);
            const weatherCode = data.current.weather_code;
            
            // Weather code to emoji mapping
            const weatherEmojis = {
                0: '☀️',   // Clear sky
                1: '🌤️',  // Mainly clear
                2: '⛅',  // Partly cloudy
                3: '☁️',  // Overcast
                45: '🌫️', // Fog
                48: '🌫️', // Depositing rime fog
                51: '🌦️', // Light drizzle
                53: '🌦️', // Moderate drizzle
                55: '🌧️', // Dense drizzle
                61: '🌧️', // Slight rain
                63: '🌧️', // Moderate rain
                65: '🌧️', // Heavy rain
                71: '🌨️', // Slight snow
                73: '🌨️', // Moderate snow
                75: '🌨️', // Heavy snow
                77: '❄️',  // Snow grains
                80: '🌦️', // Slight rain showers
                81: '🌧️', // Moderate rain showers
                82: '⛈️', // Violent rain showers
                85: '🌨️', // Slight snow showers
                86: '🌨️', // Heavy snow showers
                95: '⛈️', // Thunderstorm
                96: '⛈️', // Thunderstorm with slight hail
                99: '⛈️'  // Thunderstorm with heavy hail
            };
            
            const emoji = weatherEmojis[weatherCode] || '🌤️';
            
            const tempElement = document.getElementById('weatherTemp');
            const iconElement = document.getElementById('weatherIcon');
            const locationElement = document.getElementById('weatherLocation');
            
            if (tempElement) tempElement.textContent = `${temp}°F`;
            if (iconElement) iconElement.textContent = emoji;
            if (locationElement) locationElement.textContent = city;
            
            // Cache weather data
            localStorage.setItem('weatherData', JSON.stringify({
                temp: temp,
                emoji: emoji,
                city: city,
                timestamp: Date.now()
            }));
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
        
        // Try to load cached data
        const cached = localStorage.getItem('weatherData');
        if (cached) {
            const data = JSON.parse(cached);
            // Use cached data if it's less than 30 minutes old
            if (Date.now() - data.timestamp < 1800000) {
                const tempElement = document.getElementById('weatherTemp');
                const iconElement = document.getElementById('weatherIcon');
                const locationElement = document.getElementById('weatherLocation');
                
                if (tempElement) tempElement.textContent = `${data.temp}°F`;
                if (iconElement) iconElement.textContent = data.emoji;
                if (locationElement) locationElement.textContent = data.city;
            }
        }
    }
}

// ============================================
// DATA EXPORT
// ============================================

function exportData() {
    const data = {
        habitData: habitData,
        goalsData: goalsData,
        moodData: moodData,
        workoutData: workoutData,
        habitsList: habitsList,
        lifetimePushups: lifetimePushups,
        lifetimePullups: lifetimePullups,
        journalData: journalData,
        visionBoardData: visionBoardData,
        contentData: contentData,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kings-protocol-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    alert('✅ Data exported successfully!');
}

// ============================================
// MODE SWITCHING
// ============================================

function switchToZenMode() {
    document.body.classList.remove('fire-mode');
    document.body.classList.add('zen-mode');
    document.getElementById('pageIcon').textContent = '🧘';
    document.getElementById('zenModeBtn').classList.add('active');
    document.getElementById('fireModeBtn').classList.remove('active');
}

function switchToFireMode() {
    document.body.classList.remove('zen-mode');
    document.body.classList.add('fire-mode');
    document.getElementById('pageIcon').textContent = '🔥';
    document.getElementById('fireModeBtn').classList.add('active');
    document.getElementById('zenModeBtn').classList.remove('active');
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize all modules
if (typeof initHabitData === 'function') initHabitData();
if (typeof initGoalsData === 'function') initGoalsData();
if (typeof initMoodData === 'function') initMoodData();
if (typeof initHabitsList === 'function') initHabitsList();
if (typeof initWorkoutData === 'function') initWorkoutData();
if (typeof initJournalData === 'function') initJournalData();
if (typeof initVisionBoardData === 'function') initVisionBoardData();
if (typeof initContentData === 'function') initContentData();

// Render initial views
if (typeof renderHabitGrid === 'function') renderHabitGrid();
if (typeof updateStreakDisplay === 'function') updateStreakDisplay();

// Initialize clock and weather
updateClock();
setInterval(updateClock, 1000);
updateLocation();

// Update weather every 30 minutes
setInterval(() => {
    updateLocation();
}, 1800000);

// Initialize notification toggle state
const notifToggle = document.getElementById('notifToggle');
if (notifToggle && !notificationsOn) {
    notifToggle.classList.add('off');
}

// Request notification permission if enabled
if (notificationsOn && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

console.log('✅ Kings Protocol initialized successfully!');
