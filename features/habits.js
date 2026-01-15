// ============================================
// HABITS MODULE - Habit tracking & management
// ============================================

let habitData = {};
let habitsList = [
    'Wake Up At 7 AM',
    'Morning Sunlight', 
    'Skincare',
    'Gym/Workout',
    '3L Water',
    'Content Creation Work',
    'No Weed',
    'No Porn',
    'No Junk Food',
    'Cold Shower',
    'Journal/Reflect'
];

// ============================================
// INITIALIZATION
// ============================================

function initHabitData() {
    const saved = localStorage.getItem('habitData');
    if (saved) {
        habitData = JSON.parse(saved);
    }
}

function initHabitsList() {
    const saved = localStorage.getItem('habitsList');
    if (saved) {
        habitsList = JSON.parse(saved);
    }
}

function saveHabitData() {
    localStorage.setItem('habitData', JSON.stringify(habitData));
}

function saveHabitsList() {
    localStorage.setItem('habitsList', JSON.stringify(habitsList));
}

// ============================================
// HABIT MANAGEMENT
// ============================================

function addNewHabit() {
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #ffffff, #9CA3AF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">➕ Add New Habit</h2>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #9CA3AF;">Habit Name</label>
            <input type="text" id="newHabitName" placeholder="e.g., Read 30 Minutes" style="width: 100%; padding: 15px; border: 2px solid rgba(255, 255, 255, 0.2, 0.4); border-radius: 12px; font-size: 16px; background: rgba(255, 255, 255, 0.1); color: white;" autofocus>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: flex-end;">
            <button onclick="closeModal()" style="background: rgba(255, 255, 255, 0.1); color: white; border: 2px solid rgba(255, 255, 255, 0.3); padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer;">Cancel</button>
            <button onclick="saveNewHabit()" style="background: linear-gradient(135deg, #ffffff, #9CA3AF); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(255, 255, 255, 0.2, 0.4);">Add Habit</button>
        </div>
    `;
}

function saveNewHabit() {
    const input = document.getElementById('newHabitName');
    const habitName = input?.value.trim();
    
    if (!habitName) {
        alert('Please enter a habit name');
        return;
    }
    
    if (habitsList.includes(habitName)) {
        alert('This habit already exists!');
        return;
    }
    
    habitsList.push(habitName);
    saveHabitsList();
    renderHabitGrid();
    closeModal();
}

function deleteHabit(habitName) {
    if (!confirm(`Are you sure you want to delete "${habitName}"? All tracking data for this habit will be removed.`)) {
        return;
    }
    
    // Remove from habits list
    habitsList = habitsList.filter(h => h !== habitName);
    saveHabitsList();
    
    // Remove from all historical data
    Object.keys(habitData).forEach(date => {
        if (habitData[date][habitName] !== undefined) {
            delete habitData[date][habitName];
        }
    });
    saveHabitData();
    
    renderHabitGrid();
    updateStreakDisplay();
}

function manageHabits() {
    const modalContent = createModal();
    
    let habitsHTML = habitsList.map(habit => `
        <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="font-size: 16px; font-weight: 600;">${habit}</div>
            <button onclick="deleteHabit('${habit.replace(/'/g, "\\'")}'); manageHabits();" style="background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 2px solid #EF4444; border-radius: 8px; padding: 8px 16px; font-size: 14px; font-weight: 700; cursor: pointer;">Delete</button>
        </div>
    `).join('');
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #ffffff, #9CA3AF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">📋 Manage Habits</h2>
        
        <div style="margin-bottom: 20px; max-height: 400px; overflow-y: auto;">
            ${habitsHTML}
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: space-between;">
            <button onclick="closeModal(); addNewHabit();" style="background: linear-gradient(135deg, #ffffff, #9CA3AF); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(31, 41, 55, 0.4);">➕ Add New Habit</button>
            <button onclick="closeModal()" style="background: rgba(255, 255, 255, 0.1); color: white; border: 2px solid rgba(255, 255, 255, 0.3); padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer;">Close</button>
        </div>
    `;
}

// ============================================
// HABIT TRACKING
// ============================================

function renderHabitGrid() {
    const grid = document.getElementById('habitGrid');
    if (!grid) return;
    
    let html = '';

    // Header row with Manage button
    html += `<div class="habit-cell header">
        Habit 
        <button onclick="manageHabits()" style="margin-left: 10px; background: rgba(255, 255, 255, 0.2, 0.3); border: 2px solid #ffffff; color: white; border-radius: 8px; padding: 4px 8px; font-size: 11px; cursor: pointer;">⚙️ Manage</button>
    </div>`;
    
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
    habitsList.forEach(habit => {
        html += `<div class="habit-cell habit-label" style="cursor: default;">${habit}</div>`;
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            const isToday = i === 0;
            
            if (!habitData[dateKey]) {
                habitData[dateKey] = {};
            }
            
            const checked = habitData[dateKey][habit] || false;
            const emoji = checked ? '✅' : (isToday ? '●' : '');
            html += `<div class="habit-cell clickable ${isToday ? 'today' : ''}" 
                     onclick="toggleHabit('${dateKey}', '${habit.replace(/'/g, "\\'")}')"
                     style="color: ${isToday && !checked ? '#ffffff' : 'inherit'}; font-size: ${isToday && !checked ? '24px' : '20px'}; cursor: pointer;">
                ${emoji}
            </div>`;
        }
    });

    grid.innerHTML = html;
}

function toggleHabit(dateKey, habitName) {
    if (!habitData[dateKey]) {
        habitData[dateKey] = {};
    }
    habitData[dateKey][habitName] = !habitData[dateKey][habitName];
    saveHabitData();
    renderHabitGrid();
    updateStreakDisplay();
}

// ============================================
// STREAK CALCULATIONS
// ============================================

function calculateStreak() {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        
        if (!habitData[dateKey]) break;
        
        const completed = Object.values(habitData[dateKey]).filter(h => h).length;
        const totalHabits = habitsList.length;
        const percentage = totalHabits > 0 ? (completed / totalHabits) * 100 : 0;
        
        if (percentage >= 80) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

function calculateBestStreak() {
    let bestStreak = 0;
    let currentStreak = 0;
    
    const dates = Object.keys(habitData).sort();
    
    dates.forEach(dateKey => {
        const completed = Object.values(habitData[dateKey]).filter(h => h).length;
        const totalHabits = habitsList.length;
        const percentage = totalHabits > 0 ? (completed / totalHabits) * 100 : 0;
        
        if (percentage >= 80) {
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

function updateStreakDisplay() {
    const currentStreak = calculateStreak();
    const bestStreak = calculateBestStreak();
    
    // Update current streak display
    const streakDisplay = document.querySelector('.current-streak');
    if (streakDisplay) {
        streakDisplay.textContent = currentStreak;
    }
    
    // Update best streak text
    const bestStreakText = document.querySelector('.streak-display > div:last-child');
    if (bestStreakText) {
        bestStreakText.innerHTML = `🏆 Best Streak: ${bestStreak} days${currentStreak === bestStreak && currentStreak > 0 ? ' (Current!)' : ''}`;
    }
    
    // Update milestones
    updateMilestones(currentStreak);
}

function updateMilestones(streak) {
    const milestones = document.querySelectorAll('.milestone-card');
    
    if (milestones.length >= 3) {
        // 7 day milestone
        if (streak >= 7) {
            milestones[0].classList.add('achieved');
            milestones[0].querySelector('div:last-child').innerHTML = '<div style="font-size: 10px; margin-top: 5px; color: #ffffff;">✓ UNLOCKED</div>';
        } else {
            milestones[0].classList.remove('achieved');
            milestones[0].querySelector('div:last-child').innerHTML = `<div style="font-size: 10px; margin-top: 5px; color: #ffffff;">${7 - streak} days away</div>`;
        }
        
        // 15 day milestone
        if (streak >= 15) {
            milestones[1].classList.add('achieved');
            milestones[1].querySelector('div:last-child').innerHTML = '<div style="font-size: 10px; margin-top: 5px; color: #ffffff;">✓ UNLOCKED</div>';
        } else {
            milestones[1].classList.remove('achieved');
            milestones[1].querySelector('div:last-child').innerHTML = `<div style="font-size: 10px; margin-top: 5px; color: #ffffff;">${15 - streak} days away</div>`;
        }
        
        // 30 day milestone
        if (streak >= 30) {
            milestones[2].classList.add('achieved');
            milestones[2].querySelector('div:last-child').innerHTML = '<div style="font-size: 10px; margin-top: 5px; color: #ffffff;">✓ UNLOCKED</div>';
        } else {
            milestones[2].classList.remove('achieved');
            milestones[2].querySelector('div:last-child').innerHTML = `<div style="font-size: 10px; margin-top: 5px; color: #ffffff;">${30 - streak} days away</div>`;
        }
    }
    
    // Update reward cards
    const rewardCards = document.querySelectorAll('.milestone-card');
    if (rewardCards.length >= 5) {
        // Cheat meal (7 days)
        if (streak >= 7) {
            rewardCards[3].classList.add('achieved');
            rewardCards[3].querySelector('div:last-child').innerHTML = '<div style="font-size: 10px; margin-top: 5px; color: #ffffff;">✓ Unlocked</div>';
        } else {
            rewardCards[3].classList.remove('achieved');
            rewardCards[3].querySelector('div:last-child').innerHTML = `<div style="font-size: 10px; margin-top: 5px; color: #ffffff;">🔒 ${7 - streak} days away</div>`;
        }
        
        // New gear (30 days)
        if (streak >= 30) {
            rewardCards[4].classList.add('achieved');
            rewardCards[4].querySelector('div:last-child').innerHTML = '<div style="font-size: 10px; margin-top: 5px; color: #ffffff;">✓ Unlocked</div>';
        } else {
            rewardCards[4].classList.remove('achieved');
            rewardCards[4].querySelector('div:last-child').innerHTML = `<div style="font-size: 10px; margin-top: 5px; color: #ffffff;">🔒 ${30 - streak} days away</div>`;
        }
    }
}
