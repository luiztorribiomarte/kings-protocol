// ============================================
// HABITS MODULE
// ============================================

// Habit data structure
let habitData = {};
let habitsList = [
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

// Initialize habit data
function initHabitData() {
    const saved = localStorage.getItem('habitData');
    if (saved) {
        habitData = JSON.parse(saved);
    }
}

// Initialize habits list
function initHabitsList() {
    const saved = localStorage.getItem('habitsList');
    if (saved) {
        habitsList = JSON.parse(saved);
    } else {
        localStorage.setItem('habitsList', JSON.stringify(habitsList));
    }
}

// Save habit data
function saveHabitData() {
    localStorage.setItem('habitData', JSON.stringify(habitData));
}

// Get date string
function getDateString(date) {
    const d = date || new Date();
    return d.toISOString().split('T')[0];
}

// Render habit grid
function renderHabitGrid() {
    const grid = document.getElementById('habitGrid');
    if (!grid) return;

    const today = new Date();
    const dates = [];
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date);
    }

    let html = '<table><thead><tr><th>Habit</th>';
    
    // Header row with dates
    dates.forEach((date, index) => {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const isToday = index === 6;
        html += `<th class="${isToday ? 'today' : ''}">${isToday ? '📍 ' : ''}${dayName}<br>${date.getDate()}</th>`;
    });
    
    html += '</tr></thead><tbody>';

    // Habit rows
    habitsList.forEach((habit, habitIndex) => {
        html += `<tr><td onclick="showHabitChart('${habit}')" style="cursor: pointer;">${habit}</td>`;
        
        dates.forEach((date, dateIndex) => {
            const dateStr = getDateString(date);
            const isChecked = habitData[dateStr] && habitData[dateStr][habit];
            const isToday = dateIndex === 6;
            const symbol = isChecked ? '✅' : (isToday ? '●' : '');
            
            html += `<td class="${isToday ? 'today' : ''}" onclick="toggleHabit('${dateStr}', '${habit}')">${symbol}</td>`;
        });
        
        html += '</tr>';
    });

    html += '</tbody></table>';
    
    // Add completion percentage for today
    const todayStr = getDateString(today);
    const completion = calculateDayCompletion(todayStr);
    html += `<div style="margin-top: 20px; text-align: center; color: #9CA3AF;">Today's Progress: <strong style="color: ${completion >= 80 ? '#10B981' : '#EF4444'};">${completion}%</strong> (Need 80% for streak)</div>`;
    
    grid.innerHTML = html;
    updateStreakDisplay();
}

// Toggle habit
function toggleHabit(dateStr, habit) {
    if (!habitData[dateStr]) {
        habitData[dateStr] = {};
    }
    
    habitData[dateStr][habit] = !habitData[dateStr][habit];
    saveHabitData();
    renderHabitGrid();
    updateStreakDisplay();
}

// Calculate day completion
function calculateDayCompletion(dateStr) {
    if (!habitData[dateStr]) return 0;
    
    const completed = Object.keys(habitData[dateStr]).filter(habit => habitData[dateStr][habit]).length;
    return Math.round((completed / habitsList.length) * 100);
}

// Calculate current streak
function calculateStreak() {
    const today = new Date();
    let streak = 0;
    let checkDate = new Date(today);
    
    while (true) {
        const dateStr = getDateString(checkDate);
        const completion = calculateDayCompletion(dateStr);
        
        if (completion >= 80) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    return streak;
}

// Calculate best streak
function calculateBestStreak() {
    let bestStreak = 0;
    let currentStreak = 0;
    
    // Get all dates sorted
    const dates = Object.keys(habitData).sort();
    
    dates.forEach(dateStr => {
        const completion = calculateDayCompletion(dateStr);
        
        if (completion >= 80) {
            currentStreak++;
            if (currentStreak > bestStreak) {
                bestStreak = currentStreak;
            }
        } else {
            currentStreak = 0;
        }
    });
    
    return bestStreak;
}

// Update streak display
function updateStreakDisplay() {
    const currentStreak = calculateStreak();
    const bestStreak = calculateBestStreak();
    
    const streakNumber = document.getElementById('streakNumber');
    const bestStreakSpan = document.getElementById('bestStreak');
    
    if (streakNumber) streakNumber.textContent = currentStreak;
    if (bestStreakSpan) bestStreakSpan.textContent = bestStreak;
    
    // Update milestones
    renderMilestones(currentStreak);
    
    // Update weekly stats
    updateWeeklyStats();
}

// Render milestones
function renderMilestones(streak) {
    const container = document.getElementById('milestones');
    if (!container) return;
    
    const milestones = [
        { days: 7, label: '7 Days', icon: '🥉' },
        { days: 15, label: '15 Days', icon: '🥈' },
        { days: 30, label: '30 Days', icon: '🥇' },
        { days: 60, label: '60 Days', icon: '💎' },
        { days: 90, label: '90 Days', icon: '👑' }
    ];
    
    let html = '';
    milestones.forEach(milestone => {
        const unlocked = streak >= milestone.days;
        html += `
            <div class="milestone ${unlocked ? 'unlocked' : ''}">
                <div class="milestone-icon">${milestone.icon}</div>
                <div class="milestone-label">${milestone.label}</div>
                ${unlocked ? '<div style="color: #10B981; font-size: 0.8em;">✓ Unlocked</div>' : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Update weekly stats
function updateWeeklyStats() {
    const today = new Date();
    let daysAt80 = 0;
    let totalCompletion = 0;
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = getDateString(date);
        const completion = calculateDayCompletion(dateStr);
        
        if (completion >= 80) daysAt80++;
        totalCompletion += completion;
    }
    
    const avgCompletion = Math.round(totalCompletion / 7);
    
    const daysAt80El = document.getElementById('daysAt80');
    const weeklyCompletionEl = document.getElementById('weeklyCompletion');
    const currentStreakEl = document.getElementById('currentStreak');
    
    if (daysAt80El) daysAt80El.textContent = `${daysAt80}/7`;
    if (weeklyCompletionEl) weeklyCompletionEl.textContent = `${avgCompletion}%`;
    if (currentStreakEl) currentStreakEl.textContent = calculateStreak();
}

// Open manage habits modal
function openManageHabits() {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) return;
    
    let html = '<h2 style="color: white; margin-bottom: 20px;">Manage Habits</h2>';
    html += '<div style="margin-bottom: 20px;">';
    
    habitsList.forEach((habit, index) => {
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1);">
                <span style="color: white;">${habit}</span>
                <button onclick="deleteHabit(${index})" style="padding: 5px 15px; background: rgba(255,50,50,0.3); border: 1px solid rgba(255,50,50,0.5); border-radius: 6px; color: #ff9999; cursor: pointer;">Delete</button>
            </div>
        `;
    });
    
    html += '</div>';
    html += '<button onclick="openAddHabit()" style="padding: 10px 20px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; cursor: pointer; width: 100%; margin-bottom: 10px;">➕ Add New Habit</button>';
    html += '<button onclick="closeModal()" style="padding: 10px 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #9CA3AF; cursor: pointer; width: 100%;">Close</button>';
    
    modalBody.innerHTML = html;
    modal.style.display = 'flex';
}

// Open add habit modal
function openAddHabit() {
    const modalBody = document.getElementById('modalBody');
    
    let html = '<h2 style="color: white; margin-bottom: 20px;">Add New Habit</h2>';
    html += '<input type="text" id="newHabitName" placeholder="Enter habit name (e.g., 🏃 Run 5K)" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: white; font-size: 1em; margin-bottom: 20px;">';
    html += '<div style="display: flex; gap: 10px;">';
    html += '<button onclick="saveNewHabit()" style="flex: 1; padding: 10px 20px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: 8px; color: white; cursor: pointer;">Add Habit</button>';
    html += '<button onclick="openManageHabits()" style="padding: 10px 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #9CA3AF; cursor: pointer;">Cancel</button>';
    html += '</div>';
    
    modalBody.innerHTML = html;
}

// Save new habit
function saveNewHabit() {
    const input = document.getElementById('newHabitName');
    const habitName = input.value.trim();
    
    if (!habitName) {
        alert('Please enter a habit name');
        return;
    }
    
    habitsList.push(habitName);
    localStorage.setItem('habitsList', JSON.stringify(habitsList));
    renderHabitGrid();
    openManageHabits();
}

// Delete habit
function deleteHabit(index) {
    if (!confirm('Delete this habit? All tracking data for this habit will be removed.')) {
        return;
    }
    
    const habitName = habitsList[index];
    habitsList.splice(index, 1);
    
    // Remove from all dates in habitData
    Object.keys(habitData).forEach(dateStr => {
        if (habitData[dateStr][habitName]) {
            delete habitData[dateStr][habitName];
        }
    });
    
    localStorage.setItem('habitsList', JSON.stringify(habitsList));
    saveHabitData();
    renderHabitGrid();
    openManageHabits();
}

// Show habit chart
function showHabitChart(habitName) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) return;
    
    // Calculate stats
    const last30Days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = getDateString(date);
        const completed = habitData[dateStr] && habitData[dateStr][habitName] ? 1 : 0;
        last30Days.push({ date: date.getDate(), completed });
    }
    
    const totalDays = last30Days.length;
    const completedDays = last30Days.filter(d => d.completed).length;
    const completionRate = Math.round((completedDays / totalDays) * 100);
    
    let html = `<h2 style="color: white; margin-bottom: 20px;">${habitName}</h2>`;
    html += `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">`;
    html += `<div style="color: #9CA3AF; margin-bottom: 10px;">Last 30 Days</div>`;
    html += `<div style="font-size: 2em; color: white; font-weight: bold;">${completionRate}%</div>`;
    html += `<div style="color: #9CA3AF;">${completedDays} of ${totalDays} days completed</div>`;
    html += `</div>`;
    
    // Simple bar chart
    html += '<div style="display: flex; gap: 2px; height: 100px; align-items: flex-end; margin-bottom: 20px;">';
    last30Days.forEach(day => {
        const height = day.completed ? 100 : 20;
        const color = day.completed ? 'rgba(16, 185, 129, 0.6)' : 'rgba(255, 255, 255, 0.1)';
        html += `<div style="flex: 1; background: ${color}; height: ${height}%; border-radius: 2px;" title="Day ${day.date}"></div>`;
    });
    html += '</div>';
    
    html += '<button onclick="closeModal()" style="padding: 10px 20px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; cursor: pointer; width: 100%;">Close</button>';
    
    modalBody.innerHTML = html;
    modal.style.display = 'flex';
}
