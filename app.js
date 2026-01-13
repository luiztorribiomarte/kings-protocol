// ============================================
// ENHANCED CORE APP.JS - With Charts & Analytics
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
let timerSeconds = 1500;
let timerMode = 'focus';

// ============================================
// DATA INITIALIZATION - STARTS CLEAN
// ============================================

function initHabitData() {
    // Load from localStorage or start fresh
    const saved = localStorage.getItem('habitData');
    if (saved) {
        habitData = JSON.parse(saved);
    }
    
    // Always ensure last 7 days exist
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        if (!habitData[dateKey]) {
            habitData[dateKey] = HABITS.map(() => false);
        }
    }
}

function saveHabitData() {
    localStorage.setItem('habitData', JSON.stringify(habitData));
}

// ============================================
// HABIT TRACKING SYSTEM  
// ============================================

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

    // Habit rows - CLICKABLE habit names
    HABITS.forEach((habit, habitIndex) => {
        html += `<div class="habit-cell habit-label" onclick="showHabitChart(${habitIndex})" style="cursor: pointer; transition: all 0.2s;">${habit}</div>`;
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            const isToday = i === 0;
            
            if (!habitData[dateKey]) {
                habitData[dateKey] = HABITS.map(() => false);
            }
            
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
    updateStats();
}

function toggleHabit(dateKey, habitIndex) {
    if (!habitData[dateKey]) {
        habitData[dateKey] = HABITS.map(() => false);
    }
    habitData[dateKey][habitIndex] = !habitData[dateKey][habitIndex];
    saveHabitData();
    renderHabitGrid();
}

// ============================================
// STATS CALCULATION
// ============================================

function updateStats() {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        if (habitData[dateKey]) {
            last7Days.push(habitData[dateKey]);
        }
    }
    
    const daysAt80 = last7Days.filter(day => {
        const completed = day.filter(h => h).length;
        const percentage = (completed / HABITS.length) * 100;
        return percentage >= 80;
    }).length;
    
    const totalChecks = last7Days.flat().filter(h => h).length;
    const totalPossible = last7Days.length * HABITS.length;
    const weeklyCompletion = totalPossible > 0 ? Math.round((totalChecks / totalPossible) * 100) : 0;
    
    const streak = calculateStreak();
    
    const statsElements = document.querySelectorAll('.stat-value');
    if (statsElements[0]) statsElements[0].textContent = `${daysAt80}/7`;
    if (statsElements[1]) statsElements[1].textContent = `${weeklyCompletion}%`;
    if (statsElements[2]) statsElements[2].textContent = streak;
}

function calculateStreak() {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        
        if (!habitData[dateKey]) break;
        
        const completed = habitData[dateKey].filter(h => h).length;
        const percentage = (completed / HABITS.length) * 100;
        
        if (percentage >= 80) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

// ============================================
// CHART MODAL SYSTEM
// ============================================

function createModal() {
    const existing = document.getElementById('chartModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'chartModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.8); display: flex;
        align-items: center; justify-content: center;
        z-index: 10000; animation: fadeIn 0.3s ease;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: linear-gradient(135deg, #1a0b2e 0%, #16213e 50%, #1a0b2e 100%);
        border: 2px solid rgba(139, 92, 246, 0.5); border-radius: 20px;
        padding: 40px; max-width: 900px; width: 90%; max-height: 80vh;
        overflow-y: auto; position: relative;
        box-shadow: 0 0 60px rgba(139, 92, 246, 0.6);
        animation: slideUp 0.3s ease;
    `;
    
    content.innerHTML = `
        <button onclick="closeModal()" style="position: absolute; top: 20px; right: 20px; background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 2px solid #EF4444; border-radius: 50%; width: 40px; height: 40px; font-size: 20px; cursor: pointer; font-weight: 700;">✕</button>
        <div id="modalContent"></div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    return content.querySelector('#modalContent');
}

function closeModal() {
    const modal = document.getElementById('chartModal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    }
}

// ============================================
// STAT CARD CHARTS
// ============================================

function showCompletionChart() {
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">📊 Daily Completion Rate</h2>
        
        <div style="margin-bottom: 20px;">
            <select id="timeRange" onchange="updateCompletionChart()" style="padding: 10px; border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 8px; background: rgba(255, 255, 255, 0.1); color: white; font-size: 14px; font-weight: 600;">
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="all">All Time</option>
            </select>
        </div>
        
        <canvas id="completionChart" style="max-height: 400px;"></canvas>
    `;
    
    updateCompletionChart();
}

function updateCompletionChart() {
    const range = document.getElementById('timeRange')?.value || '7';
    const days = range === 'all' ? Math.min(Object.keys(habitData).length, 90) : parseInt(range);
    
    const labels = [];
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        labels.push(label);
        
        if (habitData[dateKey]) {
            const completed = habitData[dateKey].filter(h => h).length;
            const percentage = (completed / HABITS.length) * 100;
            data.push(Math.round(percentage));
        } else {
            data.push(0);
        }
    }
    
    const canvas = document.getElementById('completionChart');
    if (!canvas) return;
    
    if (window.completionChartInstance) {
        window.completionChartInstance.destroy();
    }
    
    window.completionChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Completion %',
                data: data,
                borderColor: '#8B5CF6',
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#ffffff' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

function showWeeklyChart() {
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">📈 Weekly Completion Trend</h2>
        
        <div style="margin-bottom: 20px;">
            <select id="weeklyTimeRange" onchange="updateWeeklyChart()" style="padding: 10px; border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 8px; background: rgba(255, 255, 255, 0.1); color: white; font-size: 14px; font-weight: 600;">
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="all">All Time</option>
            </select>
        </div>
        
        <canvas id="weeklyChart" style="max-height: 400px;"></canvas>
    `;
    
    updateWeeklyChart();
}

function updateWeeklyChart() {
    const range = document.getElementById('weeklyTimeRange')?.value || '7';
    const days = range === 'all' ? Math.min(Object.keys(habitData).length, 90) : parseInt(range);
    
    const labels = [];
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        labels.push(label);
        
        if (habitData[dateKey]) {
            const completed = habitData[dateKey].filter(h => h).length;
            data.push(completed);
        } else {
            data.push(0);
        }
    }
    
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;
    
    if (window.weeklyChartInstance) {
        window.weeklyChartInstance.destroy();
    }
    
    window.weeklyChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Habits Completed',
                data: data,
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: '#10B981',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#ffffff' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: HABITS.length,
                    ticks: { color: '#ffffff', stepSize: 1 },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

function showStreakChart() {
    const modalContent = createModal();
    
    const currentStreak = calculateStreak();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #F59E0B, #EF4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🔥 Streak History</h2>
        
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 72px; font-weight: 900; background: linear-gradient(135deg, #F59E0B, #EF4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${currentStreak}</div>
            <div style="font-size: 18px; color: #9CA3AF;">Current Streak (Days)</div>
        </div>
        
        <canvas id="streakChart" style="max-height: 400px;"></canvas>
    `;
    
    const labels = [];
    const data = [];
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        labels.push(label);
        
        if (habitData[dateKey]) {
            const completed = habitData[dateKey].filter(h => h).length;
            const percentage = (completed / HABITS.length) * 100;
            data.push(percentage >= 80 ? 1 : 0);
        } else {
            data.push(0);
        }
    }
    
    const canvas = document.getElementById('streakChart');
    if (!canvas) return;
    
    if (window.streakChartInstance) {
        window.streakChartInstance.destroy();
    }
    
    window.streakChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Streak Day (80%+)',
                data: data,
                backgroundColor: data.map(d => d === 1 ? 'rgba(245, 158, 11, 0.6)' : 'rgba(107, 114, 128, 0.3)'),
                borderColor: data.map(d => d === 1 ? '#F59E0B' : '#6B7280'),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#ffffff' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
                    ticks: { 
                        color: '#ffffff',
                        callback: function(value) {
                            return value === 1 ? 'Yes' : 'No';
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

function showHabitChart(habitIndex) {
    const habitName = HABITS[habitIndex];
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${habitName}</h2>
        
        <div style="margin-bottom: 20px;">
            <select id="habitTimeRange" onchange="updateHabitChart(${habitIndex})" style="padding: 10px; border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 8px; background: rgba(255, 255, 255, 0.1); color: white; font-size: 14px; font-weight: 600;">
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="all">All Time</option>
            </select>
        </div>
        
        <canvas id="habitChart" style="max-height: 400px;"></canvas>
        
        <div style="margin-top: 30px; padding: 20px; background: rgba(139, 92, 246, 0.2); border-radius: 12px; border: 2px solid rgba(139, 92, 246, 0.4);">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 15px; color: #A78BFA;">📊 Stats</h3>
            <div id="habitStats"></div>
        </div>
    `;
    
    updateHabitChart(habitIndex);
}

function updateHabitChart(habitIndex) {
    const range = document.getElementById('habitTimeRange')?.value || '7';
    const days = range === 'all' ? Math.min(Object.keys(habitData).length, 90) : parseInt(range);
    
    const labels = [];
    const data = [];
    let completed = 0;
    let total = 0;
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        labels.push(label);
        
        if (habitData[dateKey] && habitData[dateKey][habitIndex] !== undefined) {
            const done = habitData[dateKey][habitIndex];
            data.push(done ? 1 : 0);
            if (done) completed++;
            total++;
        } else {
            data.push(0);
            total++;
        }
    }
    
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const statsDiv = document.getElementById('habitStats');
    if (statsDiv) {
        statsDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 900; color: #10B981;">${completed}</div>
                    <div style="font-size: 12px; color: #9CA3AF;">Completed</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 900; color: #EF4444;">${total - completed}</div>
                    <div style="font-size: 12px; color: #9CA3AF;">Missed</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 900; color: #FBBF24;">${percentage}%</div>
                    <div style="font-size: 12px; color: #9CA3AF;">Success Rate</div>
                </div>
            </div>
        `;
    }
    
    const canvas = document.getElementById('habitChart');
    if (!canvas) return;
    
    if (window.habitChartInstance) {
        window.habitChartInstance.destroy();
    }
    
    window.habitChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Completed',
                data: data,
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                stepped: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#ffffff' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
                    ticks: { 
                        color: '#ffffff',
                        callback: function(value) {
                            return value === 1 ? '✓' : '✗';
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// ============================================
// MAKE STAT CARDS CLICKABLE
// ============================================

function makeStatsClickable() {
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards[0]) {
        statCards[0].style.cursor = 'pointer';
        statCards[0].onclick = showCompletionChart;
    }
    if (statCards[1]) {
        statCards[1].style.cursor = 'pointer';
        statCards[1].onclick = showWeeklyChart;
    }
    if (statCards[2]) {
        statCards[2].style.cursor = 'pointer';
        statCards[2].onclick = showStreakChart;
    }
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
    
    if (mode === 'short') timerSeconds = 300;
    else if (mode === 'focus') timerSeconds = 1500;
    else if (mode === 'long') timerSeconds = 900;
    
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
// READING LIST
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
    alert('Book moved to "Already Read"!');
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

const YOUTUBE_API_KEY = 'YOUR_API_KEY_HERE';
const YOUTUBE_CHANNEL_ID = 'YOUR_CHANNEL_ID_HERE';
const WEATHER_API_KEY = 'YOUR_WEATHER_API_KEY_HERE';
const WEATHER_LOCATION = 'Yonkers,NY,US';

async function fetchYouTubeStats() {
    try {
        if (YOUTUBE_API_KEY === 'YOUR_API_KEY_HERE') {
            document.getElementById('subCount').textContent = '0';
            document.getElementById('subGrowth').textContent = '🔴 Setup Required';
            return;
        }

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${YOUTUBE_CHANNEL_ID}&key=${YOUTUBE_API_KEY}`
        );
        const data = await response.json();
        
        if (data.items && data.items[0]) {
            const subCount = parseInt(data.items[0].statistics.subscriberCount);
            document.getElementById('subCount').textContent = subCount.toLocaleString();
        }
    } catch (error) {
        console.error('Error fetching YouTube stats:', error);
    }
}

async function fetchWeather() {
    try {
        if (WEATHER_API_KEY === 'YOUR_WEATHER_API_KEY_HERE') {
            document.getElementById('weatherTemp').textContent = '--°F';
            document.getElementById('weatherIcon').textContent = '🌤️';
            return;
        }

        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${WEATHER_LOCATION}&appid=${WEATHER_API_KEY}&units=imperial`
        );
        const data = await response.json();
        
        if (data.main && data.weather) {
            const temp = Math.round(data.main.temp);
            document.getElementById('weatherTemp').textContent = `${temp}°F`;
            
            const weatherIcons = {
                'clear': '☀️', 'clouds': '⛅', 'rain': '🌧️',
                'drizzle': '🌦️', 'thunderstorm': '⛈️',
                'snow': '❄️', 'mist': '🌫️', 'fog': '🌫️'
            };
            
            const condition = data.weather[0].main.toLowerCase();
            document.getElementById('weatherIcon').textContent = weatherIcons[condition] || '🌤️';
        }
    } catch (error) {
        console.error('Error fetching weather:', error);
    }
}

// ============================================
// INITIALIZATION
// ============================================

initHabitData();
renderHabitGrid();
makeStatsClickable();
fetchYouTubeStats();
fetchWeather();

setInterval(fetchYouTubeStats, 300000);
setInterval(fetchWeather, 1800000);

// Add animations CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
