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
    updateWeeklyStats();
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
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #3B82F6, #8B5CF6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">➕ Add New Habit</h2>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #9CA3AF;">Habit Name</label>
            <input type="text" id="newHabitName" placeholder="e.g., Read 30 Minutes" style="width: 100%; padding: 15px; border: 2px solid rgba(59, 130, 246, 0.4); border-radius: 12px; font-size: 16px; background: rgba(255, 255, 255, 0.1); color: white;" autofocus>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: flex-end;">
            <button onclick="closeModal()" style="background: rgba(255, 255, 255, 0.1); color: white; border: 2px solid rgba(255, 255, 255, 0.3); padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer;">Cancel</button>
            <button onclick="saveNewHabit()" style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);">Add Habit</button>
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
    
    habitsList = habitsList.filter(h => h !== habitName);
    saveHabitsList();
    
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
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #3B82F6, #8B5CF6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">📋 Manage Habits</h2>
        
        <div style="margin-bottom: 20px; max-height: 400px; overflow-y: auto;">
            ${habitsHTML}
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: space-between;">
            <button onclick="closeModal(); addNewHabit();" style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);">➕ Add New Habit</button>
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

    html += `<div class="habit-cell header">
        Habit 
        <button onclick="manageHabits()" style="margin-left: 10px; background: rgba(59, 130, 246, 0.3); border: 2px solid #3B82F6; color: white; border-radius: 8px; padding: 4px 8px; font-size: 11px; cursor: pointer;">⚙️ Manage</button>
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

    habitsList.forEach(habit => {
        html += `<div class="habit-cell habit-label" onclick="showHabitChart('${habit.replace(/'/g, "\\'")}', '${habit.replace(/'/g, "\\'")}')" style="cursor: pointer; transition: all 0.2s;">${habit}</div>`;
        
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
                     style="color: ${isToday && !checked ? '#3B82F6' : 'inherit'}; font-size: ${isToday && !checked ? '24px' : '20px'}; cursor: pointer;">
                ${emoji}
            </div>`;
        }
    });

    grid.innerHTML = html;
    updateWeeklyStats();
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
// WEEKLY STATS CALCULATION
// ============================================

function updateWeeklyStats() {
    let daysAt80Plus = 0;
    let totalCompletion = 0;
    
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        
        if (habitData[dateKey]) {
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
    
    const streakDisplay = document.querySelector('.current-streak');
    if (streakDisplay) {
        streakDisplay.textContent = currentStreak;
    }
    
    const bestStreakText = document.querySelector('.streak-display > div:last-child');
    if (bestStreakText) {
        bestStreakText.innerHTML = `🏆 Best Streak: ${bestStreak} days${currentStreak === bestStreak && currentStreak > 0 ? ' (Current!)' : ''}`;
    }
    
    updateMilestones(currentStreak);
    updateWeeklyStats();
}

function updateMilestones(streak) {
    const milestones = document.querySelectorAll('.milestone-card');
    
    if (milestones.length >= 3) {
        if (streak >= 7) {
            milestones[0].classList.add('achieved');
            milestones[0].querySelector('div:last-child').innerHTML = '<div style="font-size: 10px; margin-top: 5px; color: #3B82F6;">✓ UNLOCKED</div>';
        } else {
            milestones[0].classList.remove('achieved');
            milestones[0].querySelector('div:last-child').innerHTML = `<div style="font-size: 10px; margin-top: 5px; color: #FBBF24;">${7 - streak} days away</div>`;
        }
        
        if (streak >= 15) {
            milestones[1].classList.add('achieved');
            milestones[1].querySelector('div:last-child').innerHTML = '<div style="font-size: 10px; margin-top: 5px; color: #3B82F6;">✓ UNLOCKED</div>';
        } else {
            milestones[1].classList.remove('achieved');
            milestones[1].querySelector('div:last-child').innerHTML = `<div style="font-size: 10px; margin-top: 5px; color: #FBBF24;">${15 - streak} days away</div>`;
        }
        
        if (streak >= 30) {
            milestones[2].classList.add('achieved');
            milestones[2].querySelector('div:last-child').innerHTML = '<div style="font-size: 10px; margin-top: 5px; color: #3B82F6;">✓ UNLOCKED</div>';
        } else {
            milestones[2].classList.remove('achieved');
            milestones[2].querySelector('div:last-child').innerHTML = `<div style="font-size: 10px; margin-top: 5px; color: #FBBF24;">${30 - streak} days away</div>`;
        }
    }
    
    const rewardCards = document.querySelectorAll('.milestone-card');
    if (rewardCards.length >= 5) {
        if (streak >= 7) {
            rewardCards[3].classList.add('achieved');
            rewardCards[3].querySelector('div:last-child').innerHTML = '<div style="font-size: 10px; margin-top: 5px; color: #10B981;">✓ Unlocked</div>';
        } else {
            rewardCards[3].classList.remove('achieved');
            rewardCards[3].querySelector('div:last-child').innerHTML = `<div style="font-size: 10px; margin-top: 5px; color: #FBBF24;">🔒 ${7 - streak} days away</div>`;
        }
        
        if (streak >= 30) {
            rewardCards[4].classList.add('achieved');
            rewardCards[4].querySelector('div:last-child').innerHTML = '<div style="font-size: 10px; margin-top: 5px; color: #10B981;">✓ Unlocked</div>';
        } else {
            rewardCards[4].classList.remove('achieved');
            rewardCards[4].querySelector('div:last-child').innerHTML = `<div style="font-size: 10px; margin-top: 5px; color: #FBBF24;">🔒 ${30 - streak} days away</div>`;
        }
    }
}
            const totalHabits = habitsList.length;
            const percentage = totalHabits > 0 ? (completed / totalHabits) * 100 : 0;
            
            totalCompletion += percentage;
            if (percentage >= 80) daysAt80Plus++;
        }
    }
    
    const avgCompletion = Math.round(totalCompletion / 7);
    
    // Update stats display
    const statsCards = document.querySelectorAll('.stat-card');
    if (statsCards.length >= 3) {
        statsCards[0].querySelector('.stat-value').textContent = `${daysAt80Plus}/7`;
        statsCards[1].querySelector('.stat-value').textContent = `${avgCompletion}%`;
        statsCards[2].querySelector('.stat-value').textContent = calculateStreak();
    }
}

// ============================================
// HABIT CHART
// ============================================

function showHabitChart(habitName) {
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #3B82F6, #8B5CF6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${habitName} - History</h2>
        
        <div style="margin-bottom: 20px;">
            <select id="habitChartRange" onchange="updateHabitChartRange('${habitName.replace(/'/g, "\\'")}', this.value)" style="padding: 10px; border: 2px solid rgba(59, 130, 246, 0.4); border-radius: 8px; background: rgba(255, 255, 255, 0.1); color: white; font-size: 14px; font-weight: 600;">
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
            </select>
        </div>
        
        <canvas id="habitChart" style="max-height: 300px; margin-bottom: 30px;"></canvas>
        
        <div style="background: rgba(59, 130, 246, 0.2); border-radius: 12px; border: 2px solid rgba(59, 130, 246, 0.4); padding: 20px;">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 15px; color: #3B82F6;">📊 Stats</h3>
            <div id="habitChartStats"></div>
        </div>
    `;
    
    renderHabitChart(habitName, 7);
}

function updateHabitChartRange(habitName, days) {
    renderHabitChart(habitName, parseInt(days));
}

function renderHabitChart(habitName, days) {
    const labels = [];
    const data = [];
    let completions = 0;
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        labels.push(label);
        
        const completed = habitData[dateKey]?.[habitName] ? 1 : 0;
        data.push(completed);
        if (completed) completions++;
    }
    
    const completionRate = Math.round((completions / days) * 100);
    
    // Update stats
    const statsDiv = document.getElementById('habitChartStats');
    if (statsDiv) {
        let streak = 0;
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            if (habitData[dateKey]?.[habitName]) {
                streak++;
            } else {
                break;
            }
        }
        
        statsDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 900; color: #3B82F6;">${completions}</div>
                    <div style="font-size: 12px; color: #9CA3AF;">Completions</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 900; color: #8B5CF6;">${completionRate}%</div>
                    <div style="font-size: 12px; color: #9CA3AF;">Success Rate</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 900; color: #F59E0B;">${streak}</div>
                    <div style="font-size: 12px; color: #9CA3AF;">Current Streak</div>
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
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Completed',
                data: data,
                backgroundColor: data.map(d => d ? '#3B82F6' : '#6B7280'),
                borderColor: data.map(d => d ? '#2563EB' : '#4B5563'),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
                    ticks: { 
                        color: '#9CA3AF',
                        stepSize: 1,
                        callback: function(value) {
                            return value === 1 ? '✓' : '';
                        }
                    },
                    grid: { color: 'rgba(156, 163, 175, 0.1)' }
                },
                x: {
                    ticks: { color: '#9CA3AF' },
                    grid: { color: 'rgba(156, 163, 175, 0.1)' }
                }
            }
        }
    });
}

// ============================================
// HABIT ANALYTICS
// ============================================

function updateHabitAnalytics() {
    const range = document.getElementById('habitAnalyticsRange')?.value || '7';
    const days = range === 'all' ? 365 : parseInt(range);
    
    const habitStats = {};
    habitsList.forEach(habit => {
        habitStats[habit] = { completed: 0, total: 0 };
    });
    
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        
        if (habitData[dateKey]) {
            habitsList.forEach(habit => {
                habitStats[habit].total++;
                if (habitData[dateKey][habit]) {
                    habitStats[habit].completed++;
                }
            });
        }
    }
    
    const sorted = Object.entries(habitStats)
        .map(([habit, stats]) => ({
            habit,
            rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
            completed: stats.completed,
            total: stats.total
        }))
        .sort((a, b) => b.rate - a.rate);
    
    // Update top habits
    const topHabits = sorted.slice(0, 3);
    const topDiv = document.getElementById('topHabits');
    if (topDiv) {
        topDiv.innerHTML = topHabits.map(h => `
            <div style="margin-bottom: 15px; padding: 15px; background: rgba(59, 130, 246, 0.1); border-radius: 12px; border: 2px solid rgba(59, 130, 246, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-size: 16px; font-weight: 600; color: #E5E7EB;">${h.habit}</div>
                    <div style="font-size: 18px; font-weight: 900; color: #3B82F6;">${Math.round(h.rate)}%</div>
                </div>
                <div style="width: 100%; height: 6px; background: rgba(59, 130, 246, 0.2); border-radius: 3px; overflow: hidden;">
                    <div style="width: ${h.rate}%; height: 100%; background: linear-gradient(90deg, #3B82F6, #8B5CF6);"></div>
                </div>
                <div style="font-size: 11px; color: #9CA3AF; margin-top: 5px;">${h.completed} / ${h.total} days</div>
            </div>
        `).join('');
    }
    
    // Update bottom habits
    const bottomHabits = sorted.slice(-3).reverse();
    const bottomDiv = document.getElementById('bottomHabits');
    if (bottomDiv) {
        bottomDiv.innerHTML = bottomHabits.map(h => `
            <div style="margin-bottom: 15px; padding: 15px; background: rgba(239, 68, 68, 0.1); border-radius: 12px; border: 2px solid rgba(239, 68, 68, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-size: 16px; font-weight: 600; color: #E5E7EB;">${h.habit}</div>
                    <div style="font-size: 18px; font-weight: 900; color: #EF4444;">${Math.round(h.rate)}%</div>
                </div>
                <div style="width: 100%; height: 6px; background: rgba(239, 68, 68, 0.2); border-radius: 3px; overflow: hidden;">
                    <div style="width: ${h.rate}%; height: 100%; background: linear-gradient(90deg, #EF4444, #DC2626);"></div>
                </div>
                <div style="font-size: 11px; color: #9CA3AF; margin-top: 5px;">${h.completed} / ${h.total} days</div>
            </div>
        `).join('');
    }
    
    // Generate insights
    const insightsDiv = document.getElementById('habitInsights');
    if (insightsDiv) {
        const avgRate = sorted.reduce((sum, h) => sum + h.rate, 0) / sorted.length;
        const bestHabit = sorted[0];
        const worstHabit = sorted[sorted.length - 1];
        
        let insights = [];
        if (avgRate >= 80) {
            insights.push('🎉 Outstanding! You\'re crushing your habits with an average ' + Math.round(avgRate) + '% completion rate!');
        } else if (avgRate >= 60) {
            insights.push('💪 Good work! You\'re on track with ' + Math.round(avgRate) + '% average completion. Push for 80%+!');
        } else {
            insights.push('⚡ Time to level up! Current average is ' + Math.round(avgRate) + '%. Focus on consistency!');
        }
        
        if (worstHabit.rate < 50) {
            insights.push(`🎯 "${worstHabit.habit}" needs attention at ${Math.round(worstHabit.rate)}%. Make it your priority!`);
        }
        
        if (bestHabit.rate === 100) {
            insights.push(`🏆 Perfect streak on "${bestHabit.habit}"! Keep that momentum!`);
        }
        
        insightsDiv.innerHTML = insights.join('<br><br>');
    }
    
    // Update trends chart
    updateHabitTrendsChart(days);
    
    // Update day analysis
    updateDayAnalysis();
}

function updateHabitTrendsChart(days) {
    const canvas = document.getElementById('habitTrendsChart');
    if (!canvas) return;
    
    const labels = [];
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        labels.push(label);
        
        if (habitData[dateKey]) {
            const completed = Object.values(habitData[dateKey]).filter(h => h).length;
            const percentage = habitsList.length > 0 ? (completed / habitsList.length) * 100 : 0;
            data.push(percentage);
        } else {
            data.push(0);
        }
    }
    
    if (window.habitTrendsChartInstance) {
        window.habitTrendsChartInstance.destroy();
    }
    
    window.habitTrendsChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Completion %',
                data: data,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#E5E7EB' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { 
                        color: '#9CA3AF',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: { color: 'rgba(156, 163, 175, 0.1)' }
                },
                x: {
                    ticks: { color: '#9CA3AF' },
                    grid: { color: 'rgba(156, 163, 175, 0.1)' }
                }
            }
        }
    });
}

function updateDayAnalysis() {
    const dayStats = {
        'Sunday': { completed: 0, total: 0 },
        'Monday': { completed: 0, total: 0 },
        'Tuesday': { completed: 0, total: 0 },
        'Wednesday': { completed: 0, total: 0 },
        'Thursday': { completed: 0, total: 0 },
        'Friday': { completed: 0, total: 0 },
        'Saturday': { completed: 0, total: 0 }
    };
    
    Object.keys(habitData).forEach(dateKey => {
        const date = new Date(dateKey);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        const completed = Object.values(habitData[dateKey]).filter(h => h).length;
        const total = habitsList.length;
        
        dayStats[dayName].completed += completed;
        dayStats[dayName].total += total;
    });
    
    const dayRates = Object.entries(dayStats).map(([day, stats]) => ({
        day,
        rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
    })).sort((a, b) => b.rate - a.rate);
    
    const best = dayRates[0];
    const worst = dayRates[dayRates.length - 1];
    
    const dayDiv = document.getElementById('dayAnalysis');
    if (dayDiv) {
        dayDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div style="background: rgba(59, 130, 246, 0.1); border-radius: 12px; padding: 20px; border: 2px solid rgba(59, 130, 246, 0.3);">
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 10px; color: #3B82F6;">🌟 Best Day</div>
                    <div style="font-size: 32px; font-weight: 900; color: #E5E7EB;">${best.day}</div>
                    <div style="font-size: 18px; color: #3B82F6; margin-top: 5px;">${Math.round(best.rate)}% completion</div>
                </div>
                <div style="background: rgba(239, 68, 68, 0.1); border-radius: 12px; padding: 20px; border: 2px solid rgba(239, 68, 68, 0.3);">
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 10px; color: #EF4444;">⚠️ Needs Work</div>
                    <div style="font-size: 32px; font-weight: 900; color: #E5E7EB;">${worst.day}</div>
                    <div style="font-size: 18px; color: #EF4444; margin-top: 5px;">${Math.round(worst.rate)}% completion</div>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                ${dayRates.map(d => `
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="font-size: 14px; font-weight: 600; color: #E5E7EB;">${d.day}</span>
                            <span style="font-size: 14px; font-weight: 700; color: ${d.rate >= 80 ? '#3B82F6' : d.rate >= 60 ? '#F59E0B' : '#EF4444'};">${Math.round(d.rate)}%</span>
                        </div>
                        <div style="width: 100%; height: 6px; background: rgba(156, 163, 175, 0.2); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${d.rate}%; height: 100%; background: ${d.rate >= 80 ? 'linear-gradient(90deg, #3B82F6, #8B5CF6)' : d.rate >= 60 ? 'linear-gradient(90deg, #F59E0B, #F97316)' : 'linear-gradient(90deg, #EF4444, #DC2626)'};"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
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
