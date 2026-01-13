// ============================================
// CORE APP.JS - Essential Dashboard Functions
// ============================================

// HABITS CONFIGURATION
const HABITS = [
    '⏰ Wake Up At 7 AM',
    '☀️ Morning Sunlight',
    '🧴 Skincare',
    '🧘 Meditation',
    '📝 Journal/Reflect',
    '💪 Work Out',
    '📚 Read 10 Pages',
    '🎬 YouTube Work (2hrs)',
    '🚫 No Porn',
    '🌿 No Weed',
    '🧘‍♂️ Nightly Mobility'
];

// GLOBAL STATE
let habitData = {};
let notificationsOn = true;
let timerInterval = null;
let timerSeconds = 1500; // 25 minutes
let timerMode = 'focus';

// ============================================
// HABIT TRACKING SYSTEM
// ============================================

// Initialize habit data for last 7 days
function initHabitData() {
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        if (!habitData[dateKey]) {
            habitData[dateKey] = HABITS.map(() => Math.random() > 0.3); // Random for demo
        }
    }
}

// Render habit grid
function renderHabitGrid() {
    const grid = document.getElementById('habitGrid');
    if (!grid) return;
    
    let html = '';

    // Header row
    html += '<div class="habit-cell header">Habit</div>';
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const isToday = i === 0;
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        html += `<div class="habit-cell header ${isToday ? 'today' : ''}">
            ${monthDay}<br><span style="font-size: 11px;">${isToday ? '📍 TODAY' : dayName.toUpperCase()}</span>
        </div>`;
    }

    // Habit rows
    HABITS.forEach((habit, habitIndex) => {
        html += `<div class="habit-cell habit-label">${habit}</div>`;
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            const isToday = i === 0;
            const checked = habitData[dateKey][habitIndex];
            const emoji = checked ? '✅' : (isToday ? '●' : '');
            html += `<div class="habit-cell clickable ${isToday ? 'today' : ''}" 
                     onclick="toggleHabit('${dateKey}', ${habitIndex})"
                     style="color: ${isToday && !checked ? '#8B5CF6' : 'inherit'}; font-size: ${isToday && !checked ? '24px' : '20px'}; cursor: pointer;">
                ${emoji}
            </div>`;
        }
    });

    grid.innerHTML = html;
}

// Toggle habit
function toggleHabit(dateKey, habitIndex) {
    habitData[dateKey][habitIndex] = !habitData[dateKey][habitIndex];
    renderHabitGrid();
}

// ============================================
// THEME SWITCHING
// ============================================

function switchToZenMode() {
    document.body.className = 'zen-mode';
    document.getElementById('zenModeBtn').classList.add('active');
    document.getElementById('fireModeBtn').classList.remove('active');
    document.getElementById('pageIcon').textContent = '🧘';
}

function switchToFireMode() {
    document.body.className = 'fire-mode';
    document.getElementById('fireModeBtn').classList.add('active');
    document.getElementById('zenModeBtn').classList.remove('active');
    document.getElementById('pageIcon').textContent = '🔥';
}

// ============================================
// PAGE NAVIGATION
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
    const pageIndex = {dashboard: 0, wins: 1, stats: 2, workout: 3, books: 4, settings: 5};
    tabs[pageIndex[pageName]].classList.add('active');
}

// ============================================
// FOCUS TIMER
// ============================================

function setTimerMode(mode) {
    timerMode = mode;
    document.querySelectorAll('.timer-mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (mode === 'short') timerSeconds = 300; // 5 min
    else if (mode === 'focus') timerSeconds = 1500; // 25 min
    else if (mode === 'long') timerSeconds = 900; // 15 min
    
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const display = document.getElementById('timerDisplay');
    if (display) {
        display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            alert('⏰ Time\'s up! Great work!');
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

// ============================================
// PLAYLIST INTEGRATION
// ============================================

function loadPlaylist() {
    const url = document.getElementById('playlistUrl').value;
    const frame = document.getElementById('playlistFrame');
    const toggle = document.getElementById('playlistToggle');
    
    if (!url) {
        alert('Please paste a playlist URL!');
        return;
    }
    
    let embedUrl = '';
    
    if (url.includes('spotify.com')) {
        const playlistId = url.split('/playlist/')[1]?.split('?')[0];
        if (playlistId) {
            embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
            frame.innerHTML = `<iframe style="border-radius: 12px" src="${embedUrl}" width="100%" height="380" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
            frame.style.display = 'block';
            toggle.style.display = 'none';
        }
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const playlistId = url.split('list=')[1]?.split('&')[0];
        if (playlistId) {
            embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
            frame.innerHTML = `<iframe width="100%" height="380" style="border-radius: 12px;" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            frame.style.display = 'block';
            toggle.style.display = 'inline-block';
        }
    } else {
        alert('Please use a Spotify or YouTube playlist URL!');
        return;
    }
}

function togglePlaylist() {
    const toggle = document.getElementById('playlistToggle');
    if (toggle.textContent.includes('Play')) {
        toggle.textContent = '⏸ Pause Music';
    } else {
        toggle.textContent = '▶ Play Music';
    }
}

// ============================================
// NOTIFICATIONS
// ============================================

function toggleNotifications() {
    notificationsOn = !notificationsOn;
    const toggle = document.getElementById('notifToggle');
    const status = document.getElementById('notifStatus');
    
    if (notificationsOn) {
        toggle.classList.remove('off');
        status.textContent = 'ON';
    } else {
        toggle.classList.add('off');
        status.textContent = 'OFF';
    }
}

// ============================================
// READING LIST (Books Page)
// ============================================

function addBookToWantList() {
    const title = document.getElementById('newBookTitle').value;
    const author = document.getElementById('newBookAuthor').value;
    
    if (!title || !author) {
        alert('Please enter both title and author!');
        return;
    }
    
    const listDiv = document.getElementById('wantToReadList');
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.style.cssText = 'background: rgba(255, 255, 255, 0.95); border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 15px; color: #1a1a1a;';
    bookCard.innerHTML = `
        <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">${title}</div>
        <div style="font-size: 13px; color: #6B7280; margin-bottom: 10px;">by ${author}</div>
        <button onclick="this.parentElement.remove()" style="background: linear-gradient(135deg, #10B981, #34D399); color: white; border: none; padding: 8px 16px; border-radius: 50px; font-size: 12px; font-weight: 600; cursor: pointer;">✓ Mark as Read</button>
    `;
    listDiv.appendChild(bookCard);
    
    document.getElementById('newBookTitle').value = '';
    document.getElementById('newBookAuthor').value = '';
}

function moveToRead(index) {
    alert('Book moved to "Already Read"! (Full functionality will be added)');
}

function rateBook(bookIndex, rating) {
    alert(`You rated this book ${rating} stars!`);
}

// ============================================
// DATA EXPORT
// ============================================

function exportData() {
    const data = JSON.stringify({habitData, timestamp: new Date().toISOString()}, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    alert('💾 Data exported successfully!');
}

// ============================================
// YOUTUBE & WEATHER WIDGETS
// ============================================

// YouTube API Configuration
const YOUTUBE_API_KEY = 'YOUR_API_KEY_HERE';
const YOUTUBE_CHANNEL_ID = 'YOUR_CHANNEL_ID_HERE';

// Weather API Configuration
const WEATHER_API_KEY = 'YOUR_WEATHER_API_KEY_HERE';
const WEATHER_LOCATION = 'Yonkers,NY,US';

async function fetchYouTubeStats() {
    try {
        if (YOUTUBE_API_KEY === 'YOUR_API_KEY_HERE') {
            document.getElementById('subCount').textContent = '750';
            document.getElementById('subGrowth').textContent = '🔴 Setup Required';
            document.getElementById('subGrowth').style.color = '#EF4444';
            document.getElementById('subGrowth').style.cursor = 'pointer';
            document.getElementById('subGrowth').onclick = () => {
                alert('📺 YouTube Live Count Setup:\n\n1. Get your API key from: https://console.cloud.google.com/apis/credentials\n2. Enable YouTube Data API v3\n3. Replace "YOUR_API_KEY_HERE" in app.js\n4. Get your Channel ID from YouTube Studio\n5. Replace "YOUR_CHANNEL_ID_HERE" in app.js\n\n✨ Then your subscriber count will update automatically!');
            };
            return;
        }

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${YOUTUBE_CHANNEL_ID}&key=${YOUTUBE_API_KEY}`
        );
        const data = await response.json();
        
        if (data.items && data.items[0]) {
            const subCount = parseInt(data.items[0].statistics.subscriberCount);
            document.getElementById('subCount').textContent = subCount.toLocaleString();
            
            const yesterday = localStorage.getItem('yesterdaySubCount');
            if (yesterday) {
                const growth = subCount - parseInt(yesterday);
                if (growth > 0) {
                    document.getElementById('subGrowth').textContent = `+${growth} today`;
                    document.getElementById('subGrowth').style.color = '#34D399';
                } else if (growth < 0) {
                    document.getElementById('subGrowth').textContent = `${growth} today`;
                    document.getElementById('subGrowth').style.color = '#EF4444';
                } else {
                    document.getElementById('subGrowth').textContent = 'No change';
                    document.getElementById('subGrowth').style.color = '#9CA3AF';
                }
            }
            
            const today = new Date().toDateString();
            const storedDate = localStorage.getItem('subCountDate');
            if (storedDate !== today) {
                localStorage.setItem('yesterdaySubCount', subCount);
                localStorage.setItem('subCountDate', today);
            }
        }
    } catch (error) {
        console.error('Error fetching YouTube stats:', error);
        document.getElementById('subGrowth').textContent = 'Update failed';
        document.getElementById('subGrowth').style.color = '#EF4444';
    }
}

async function fetchWeather() {
    try {
        if (WEATHER_API_KEY === 'YOUR_WEATHER_API_KEY_HERE') {
            document.getElementById('weatherTemp').textContent = '45°F';
            document.getElementById('weatherIcon').textContent = '🌤️';
            document.getElementById('weatherLocation').textContent = '🔧 Setup Required';
            document.getElementById('weatherLocation').style.cursor = 'pointer';
            document.getElementById('weatherLocation').onclick = () => {
                alert('🌤️ Weather Widget Setup:\n\n1. Get FREE API key from: https://openweathermap.org/api\n2. Sign up (takes 2 minutes)\n3. Copy your API key\n4. Replace "YOUR_WEATHER_API_KEY_HERE" in app.js\n\n✨ Then you\'ll see live weather for Yonkers!');
            };
            return;
        }

        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${WEATHER_LOCATION}&appid=${WEATHER_API_KEY}&units=imperial`
        );
        const data = await response.json();
        
        if (data.main && data.weather) {
            const temp = Math.round(data.main.temp);
            const condition = data.weather[0].main.toLowerCase();
            
            document.getElementById('weatherTemp').textContent = `${temp}°F`;
            
            const weatherIcons = {
                'clear': '☀️',
                'clouds': '⛅',
                'rain': '🌧️',
                'drizzle': '🌦️',
                'thunderstorm': '⛈️',
                'snow': '❄️',
                'mist': '🌫️',
                'fog': '🌫️'
            };
            
            document.getElementById('weatherIcon').textContent = 
                weatherIcons[condition] || '🌤️';
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
        document.getElementById('weatherTemp').textContent = '--°F';
        document.getElementById('weatherIcon').textContent = '❌';
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize on page load
initHabitData();
renderHabitGrid();
fetchYouTubeStats();
fetchWeather();

// Refresh YouTube stats every 5 minutes
setInterval(fetchYouTubeStats, 300000);

// Refresh weather every 30 minutes
setInterval(fetchWeather, 1800000);
