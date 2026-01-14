// ============================================
// ENHANCED CORE APP.JS - With Charts & Analytics
// ============================================

// GLOBAL STATE
let habitData = {};
let goalsData = [];
let moodData = {};
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
// GOALS MANAGEMENT SYSTEM
// ============================================

function initGoalsData() {
    const saved = localStorage.getItem('goalsData');
    if (saved) {
        goalsData = JSON.parse(saved);
    }
    renderGoals();
}

function saveGoalsData() {
    localStorage.setItem('goalsData', JSON.stringify(goalsData));
}

// ============================================
// MOOD & ENERGY TRACKING
// ============================================

function initMoodData() {
    const saved = localStorage.getItem('moodData');
    if (saved) {
        moodData = JSON.parse(saved);
    }
    renderMoodTracker();
}

function saveMoodData() {
    localStorage.setItem('moodData', JSON.stringify(moodData));
}

function setEnergy(value) {
    const today = new Date().toISOString().split('T')[0];
    if (!moodData[today]) {
        moodData[today] = { energy: 5, mood: '' };
    }
    moodData[today].energy = parseInt(value);
    saveMoodData();
    renderMoodTracker();
}

function setMood(emoji) {
    const today = new Date().toISOString().split('T')[0];
    if (!moodData[today]) {
        moodData[today] = { energy: 5, mood: '' };
    }
    moodData[today].mood = emoji;
    saveMoodData();
    renderMoodTracker();
}

function renderMoodTracker() {
    const container = document.getElementById('moodTracker');
    if (!container) return;
    
    const today = new Date().toISOString().split('T')[0];
    const currentEnergy = moodData[today]?.energy || 5;
    const currentMood = moodData[today]?.mood || '';
    
    const moods = ['😃', '💪', '😴', '😤', '🧘'];
    
    // Get last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const isToday = i === 0;
        last7Days.push({
            date: dateKey,
            isToday: isToday,
            label: isToday ? 'TODAY' : date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
            monthDay: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            data: moodData[dateKey] || { energy: 0, mood: '' }
        });
    }
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <!-- Left: Today's Input -->
            <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1)); border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 16px; padding: 25px;">
                <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">😊 How are you feeling today?</h3>
                
                <!-- Energy Slider -->
                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #A78BFA;">⚡ Energy Level: <span id="energyValue" style="color: #10B981; font-size: 18px;">${currentEnergy}/10</span></label>
                    <input type="range" min="1" max="10" value="${currentEnergy}" oninput="setEnergy(this.value); document.getElementById('energyValue').textContent = this.value + '/10';" style="width: 100%; height: 8px; border-radius: 5px; background: linear-gradient(to right, #EF4444 0%, #FBBF24 50%, #10B981 100%); outline: none; -webkit-appearance: none; cursor: pointer;">
                </div>
                
                <!-- Mood Selector -->
                <div>
                    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #A78BFA;">😊 Mood</label>
                    <div style="display: flex; gap: 10px; justify-content: space-between;">
                        ${moods.map(mood => `
                            <button onclick="setMood('${mood}')" style="background: ${currentMood === mood ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)'}; border: 2px solid ${currentMood === mood ? '#8B5CF6' : 'rgba(139, 92, 246, 0.3)'}; border-radius: 12px; padding: 15px; font-size: 32px; cursor: pointer; transition: all 0.2s; flex: 1;">
                                ${mood}
                            </button>
                        `).join('')}
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #9CA3AF;">
                        <span>Happy</span>
                        <span>Energized</span>
                        <span>Tired</span>
                        <span>Stressed</span>
                        <span>Calm</span>
                    </div>
                </div>
            </div>
            
            <!-- Right: Last 7 Days Comparison - CLICKABLE -->
            <div onclick="showMoodChart()" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.1)); border: 2px solid rgba(16, 185, 129, 0.4); border-radius: 16px; padding: 25px; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #10B981, #34D399); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">📊 Past 7 Days</h3>
                
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
                    ${last7Days.map(day => `
                        <div style="background: ${day.isToday ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)'}; border: 2px solid ${day.isToday ? '#8B5CF6' : 'rgba(16, 185, 129, 0.3)'}; border-radius: 12px; padding: 10px; text-align: center;">
                            <div style="font-size: 9px; color: #9CA3AF; margin-bottom: 5px; font-weight: 600;">${day.monthDay}</div>
                            <div style="font-size: 8px; color: ${day.isToday ? '#A78BFA' : '#6B7280'}; margin-bottom: 8px;">${day.label}</div>
                            <div style="font-size: 28px; margin-bottom: 8px;">${day.data.mood || '—'}</div>
                            <div style="font-size: 14px; font-weight: 900; color: ${day.data.energy >= 7 ? '#10B981' : day.data.energy >= 4 ? '#FBBF24' : day.data.energy > 0 ? '#EF4444' : '#6B7280'};">
                                ${day.data.energy > 0 ? day.data.energy : '—'}
                            </div>
                            <div style="font-size: 8px; color: #9CA3AF;">energy</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function showMoodChart() {
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #10B981, #34D399); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">😊 Energy & Mood History</h2>
        
        <div style="margin-bottom: 20px;">
            <select id="moodTimeRange" onchange="updateMoodChart()" style="padding: 10px; border: 2px solid rgba(16, 185, 129, 0.4); border-radius: 8px; background: rgba(255, 255, 255, 0.1); color: white; font-size: 14px; font-weight: 600;">
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="all">All Time</option>
            </select>
        </div>
        
        <canvas id="moodChart" style="max-height: 400px;"></canvas>
        
        <div style="margin-top: 30px; padding: 20px; background: rgba(16, 185, 129, 0.2); border-radius: 12px; border: 2px solid rgba(16, 185, 129, 0.4);">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 15px; color: #34D399;">📊 Stats</h3>
            <div id="moodStats"></div>
        </div>
    `;
    
    updateMoodChart();
}

function updateMoodChart() {
    const range = document.getElementById('moodTimeRange')?.value || '7';
    const days = range === 'all' ? Math.min(Object.keys(moodData).length, 90) : parseInt(range);
    
    const labels = [];
    const energyData = [];
    const moodEmojis = [];
    let totalEnergy = 0;
    let daysWithData = 0;
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        labels.push(label);
        
        if (moodData[dateKey]) {
            const energy = moodData[dateKey].energy || 0;
            energyData.push(energy);
            moodEmojis.push(moodData[dateKey].mood || '');
            if (energy > 0) {
                totalEnergy += energy;
                daysWithData++;
            }
        } else {
            energyData.push(null);
            moodEmojis.push('');
        }
    }
    
    const avgEnergy = daysWithData > 0 ? (totalEnergy / daysWithData).toFixed(1) : 0;
    const highEnergyDays = energyData.filter(e => e >= 7).length;
    const lowEnergyDays = energyData.filter(e => e > 0 && e <= 3).length;
    
    // Update stats
    const statsDiv = document.getElementById('moodStats');
    if (statsDiv) {
        statsDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 900; color: #10B981;">${avgEnergy}</div>
                    <div style="font-size: 12px; color: #9CA3AF;">Avg Energy</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 900; color: #34D399;">${highEnergyDays}</div>
                    <div style="font-size: 12px; color: #9CA3AF;">High Energy Days</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 900; color: #EF4444;">${lowEnergyDays}</div>
                    <div style="font-size: 12px; color: #9CA3AF;">Low Energy Days</div>
                </div>
            </div>
            <div style="margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.1); border-radius: 8px;">
                <div style="font-size: 14px; color: #A78BFA; margin-bottom: 10px;">🗓️ Mood Pattern:</div>
                <div style="font-size: 24px; display: flex; gap: 8px; flex-wrap: wrap;">
                    ${moodEmojis.filter(m => m).slice(-14).join(' ')}
                </div>
            </div>
        `;
    }
    
    const canvas = document.getElementById('moodChart');
    if (!canvas) return;
    
    if (window.moodChartInstance) {
        window.moodChartInstance.destroy();
    }
    
    window.moodChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Energy Level',
                data: energyData,
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: energyData.map(e => {
                    if (!e) return '#6B7280';
                    if (e >= 7) return '#10B981';
                    if (e >= 4) return '#FBBF24';
                    return '#EF4444';
                })
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#ffffff' } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const mood = moodEmojis[context.dataIndex];
                            return `Energy: ${context.parsed.y}/10 ${mood ? '• ' + mood : ''}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
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

function addGoal() {
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">➕ Add New Goal</h2>
        
        <div style="background: rgba(139, 92, 246, 0.1); border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 16px; padding: 30px;">
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #A78BFA;">Goal Title *</label>
                <input type="text" id="goalTitle" placeholder="e.g. 25K YouTube Subscribers, Get in Shape, Learn Spanish..." style="width: 100%; padding: 12px; border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 8px; font-size: 14px; background: rgba(255, 255, 255, 0.9); color: #1a1a1a;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #A78BFA;">Target Number (optional)</label>
                <input type="number" id="goalTarget" placeholder="e.g. 25000 (leave blank if not applicable)" style="width: 100%; padding: 12px; border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 8px; font-size: 14px; background: rgba(255, 255, 255, 0.9); color: #1a1a1a;">
                <div style="font-size: 12px; color: #9CA3AF; margin-top: 5px;">💡 Only needed for measurable goals (subscribers, money, weight, etc.)</div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #A78BFA;">Current Progress (optional)</label>
                <input type="number" id="goalCurrent" placeholder="e.g. 750 (leave blank if starting from 0)" style="width: 100%; padding: 12px; border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 8px; font-size: 14px; background: rgba(255, 255, 255, 0.9); color: #1a1a1a;">
            </div>
            
            <div style="margin-bottom: 30px;">
                <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #A78BFA;">Deadline (optional)</label>
                <input type="text" id="goalDeadline" placeholder="e.g. May 2026, End of 2026, Summer 2027..." style="width: 100%; padding: 12px; border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 8px; font-size: 14px; background: rgba(255, 255, 255, 0.9); color: #1a1a1a;">
            </div>
            
            <div style="text-align: center;">
                <button onclick="saveNewGoal()" style="background: linear-gradient(135deg, #10B981, #34D399); color: white; border: none; padding: 15px 40px; border-radius: 50px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4); margin-right: 10px;">✓ Save Goal</button>
                <button onclick="closeModal()" style="background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 2px solid #EF4444; padding: 15px 40px; border-radius: 50px; font-size: 16px; font-weight: 700; cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;
    
    // Focus on title input
    setTimeout(() => {
        document.getElementById('goalTitle')?.focus();
    }, 100);
}

function saveNewGoal() {
    const title = document.getElementById('goalTitle')?.value.trim();
    
    if (!title) {
        alert('Please enter a goal title!');
        return;
    }
    
    const targetInput = document.getElementById('goalTarget')?.value;
    const currentInput = document.getElementById('goalCurrent')?.value;
    const deadline = document.getElementById('goalDeadline')?.value.trim();
    
    const target = targetInput ? parseFloat(targetInput) : null;
    const current = currentInput ? parseFloat(currentInput) : 0;
    
    const goal = {
        id: Date.now(),
        title: title,
        target: target,
        current: current,
        deadline: deadline || '',
        history: current > 0 ? [{
            date: new Date().toISOString(),
            value: current
        }] : []
    };
    
    goalsData.push(goal);
    saveGoalsData();
    renderGoals();
    closeModal();
}

function updateGoalProgress(goalId) {
    const goal = goalsData.find(g => g.id === goalId);
    if (!goal) return;
    
    closeModal();
    
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">📈 Update Progress</h2>
        
        <div style="background: rgba(139, 92, 246, 0.1); border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 16px; padding: 30px;">
            <div style="text-align: center; margin-bottom: 25px;">
                <div style="font-size: 20px; font-weight: 600; color: #A78BFA; margin-bottom: 10px;">${goal.title}</div>
                ${goal.target ? `<div style="font-size: 14px; color: #9CA3AF;">Target: ${goal.target.toLocaleString()}</div>` : ''}
            </div>
            
            <div style="margin-bottom: 30px;">
                <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #A78BFA;">New Progress Value</label>
                <input type="number" id="newProgressValue" value="${goal.current}" placeholder="Enter new value..." style="width: 100%; padding: 15px; border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 8px; font-size: 18px; background: rgba(255, 255, 255, 0.9); color: #1a1a1a; text-align: center; font-weight: 700;">
                <div style="font-size: 12px; color: #9CA3AF; margin-top: 5px; text-align: center;">Current: ${goal.current.toLocaleString()}</div>
            </div>
            
            <div style="text-align: center;">
                <button onclick="saveProgressUpdate(${goalId})" style="background: linear-gradient(135deg, #10B981, #34D399); color: white; border: none; padding: 15px 40px; border-radius: 50px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(10, 185, 129, 0.4); margin-right: 10px;">✓ Update</button>
                <button onclick="closeModal()" style="background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 2px solid #EF4444; padding: 15px 40px; border-radius: 50px; font-size: 16px; font-weight: 700; cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        document.getElementById('newProgressValue')?.focus();
    }, 100);
}

function saveProgressUpdate(goalId) {
    const goal = goalsData.find(g => g.id === goalId);
    if (!goal) return;
    
    const newValue = document.getElementById('newProgressValue')?.value;
    
    if (!newValue) {
        alert('Please enter a value!');
        return;
    }
    
    const value = parseFloat(newValue);
    if (isNaN(value)) {
        alert('Please enter a valid number!');
        return;
    }
    
    goal.current = value;
    goal.history.push({
        date: new Date().toISOString(),
        value: value
    });
    
    saveGoalsData();
    renderGoals();
    closeModal();
}

function editGoal(goalId) {
    const goal = goalsData.find(g => g.id === goalId);
    if (!goal) return;
    
    closeModal();
    
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">✏️ Edit Goal</h2>
        
        <div style="background: rgba(139, 92, 246, 0.1); border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 16px; padding: 30px;">
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #A78BFA;">Goal Title</label>
                <input type="text" id="editGoalTitle" value="${goal.title}" style="width: 100%; padding: 12px; border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 8px; font-size: 14px; background: rgba(255, 255, 255, 0.9); color: #1a1a1a;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #A78BFA;">Target Number (optional)</label>
                <input type="number" id="editGoalTarget" value="${goal.target || ''}" placeholder="Leave blank if not applicable" style="width: 100%; padding: 12px; border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 8px; font-size: 14px; background: rgba(255, 255, 255, 0.9); color: #1a1a1a;">
            </div>
            
            <div style="margin-bottom: 30px;">
                <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #A78BFA;">Deadline (optional)</label>
                <input type="text" id="editGoalDeadline" value="${goal.deadline}" placeholder="e.g. May 2026" style="width: 100%; padding: 12px; border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 8px; font-size: 14px; background: rgba(255, 255, 255, 0.9); color: #1a1a1a;">
            </div>
            
            <div style="text-align: center;">
                <button onclick="saveGoalEdit(${goalId})" style="background: linear-gradient(135deg, #10B981, #34D399); color: white; border: none; padding: 15px 40px; border-radius: 50px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4); margin-right: 10px;">✓ Save Changes</button>
                <button onclick="closeModal()" style="background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 2px solid #EF4444; padding: 15px 40px; border-radius: 50px; font-size: 16px; font-weight: 700; cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;
}

function saveGoalEdit(goalId) {
    const goal = goalsData.find(g => g.id === goalId);
    if (!goal) return;
    
    const title = document.getElementById('editGoalTitle')?.value.trim();
    const targetInput = document.getElementById('editGoalTarget')?.value;
    const deadline = document.getElementById('editGoalDeadline')?.value.trim();
    
    if (!title) {
        alert('Please enter a goal title!');
        return;
    }
    
    goal.title = title;
    goal.target = targetInput ? parseFloat(targetInput) : null;
    goal.deadline = deadline || '';
    
    saveGoalsData();
    renderGoals();
    closeModal();
}

function deleteGoal(goalId) {
    if (!confirm('Delete this goal?')) return;
    
    goalsData = goalsData.filter(g => g.id !== goalId);
    saveGoalsData();
    renderGoals();
}

function showGoalChart(goalId) {
    const goal = goalsData.find(g => g.id === goalId);
    if (!goal) return;
    
    const modalContent = createModal();
    
    const hasTarget = goal.target !== null && goal.target !== undefined;
    const percentage = hasTarget && goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
    
    if (!hasTarget) {
        // Non-measurable goal
        modalContent.innerHTML = `
            <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${goal.title}</h2>
            
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 48px; margin-bottom: 15px;">🎯</div>
                <div style="font-size: 18px; color: #9CA3AF;">Non-measurable goal</div>
                ${goal.deadline ? `<div style="font-size: 14px; color: #FBBF24; margin-top: 10px;">📅 Target: ${goal.deadline}</div>` : ''}
            </div>
            
            <div style="background: rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 20px; text-align: center;">
                <div style="font-size: 14px; color: #A78BFA; margin-bottom: 10px;">This goal doesn't have measurable progress tracking.</div>
                <div style="font-size: 12px; color: #9CA3AF;">You can edit it to add a target number if needed.</div>
            </div>
            
            <div style="margin-top: 20px; text-align: center;">
                <button onclick="editGoal(${goalId});" style="background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer;">✏️ Edit Goal</button>
            </div>
        `;
        return;
    }
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${goal.title}</h2>
        
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 72px; font-weight: 900; background: linear-gradient(135deg, #10B981, #34D399); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${percentage}%</div>
            <div style="font-size: 18px; color: #9CA3AF;">${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}</div>
            ${goal.deadline ? `<div style="font-size: 14px; color: #FBBF24; margin-top: 10px;">📅 Target: ${goal.deadline}</div>` : ''}
        </div>
        
        <canvas id="goalChart" style="max-height: 400px;"></canvas>
        
        <div style="margin-top: 20px; text-align: center;">
            <button onclick="updateGoalProgress(${goalId});" style="background: linear-gradient(135deg, #10B981, #34D399); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer; margin-right: 10px;">📈 Update Progress</button>
            <button onclick="editGoal(${goalId});" style="background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer;">✏️ Edit Goal</button>
        </div>
    `;
    
    // Draw chart
    const labels = [];
    const data = [];
    
    goal.history.forEach(entry => {
        const date = new Date(entry.date);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        data.push(entry.value);
    });
    
    const canvas = document.getElementById('goalChart');
    if (!canvas) return;
    
    if (window.goalChartInstance) {
        window.goalChartInstance.destroy();
    }
    
    window.goalChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Progress',
                data: data,
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }, {
                label: 'Target',
                data: Array(labels.length).fill(goal.target),
                borderColor: '#FBBF24',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0
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

function renderGoals() {
    const container = document.getElementById('goalsGrid');
    if (!container) return;
    
    if (goalsData.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(139, 92, 246, 0.1); border: 2px dashed rgba(139, 92, 246, 0.4); border-radius: 16px;">
                <div style="font-size: 48px; margin-bottom: 15px;">🎯</div>
                <div style="font-size: 18px; font-weight: 600; color: #A78BFA; margin-bottom: 10px;">No Goals Yet</div>
                <div style="font-size: 14px; color: #9CA3AF; margin-bottom: 20px;">Start by adding your first goal!</div>
                <button onclick="addGoal()" style="background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; border: none; padding: 15px 30px; border-radius: 50px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);">➕ Add Goal</button>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    goalsData.forEach(goal => {
        const hasTarget = goal.target !== null && goal.target !== undefined;
        const percentage = hasTarget && goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
        
        html += `
            <div class="goal-card" onclick="showGoalChart(${goal.id})" style="cursor: pointer; transition: transform 0.2s;">
                <div class="goal-cover">📈</div>
                <div class="goal-content">
                    <div class="goal-title">${goal.title}</div>
                    <span class="property-pill">In Progress</span>
                    ${hasTarget ? `
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%;"></div>
                        </div>
                        <div class="progress-text">${goal.current.toLocaleString()} / ${goal.target.toLocaleString()} (${percentage}%)</div>
                    ` : `
                        <div style="font-size: 14px; color: #9CA3AF; margin-top: 10px;">Non-measurable goal</div>
                    `}
                    ${goal.deadline ? `<div style="font-size: 12px; color: #FBBF24; margin-top: 8px;">📅 ${goal.deadline}</div>` : ''}
                </div>
                <button onclick="event.stopPropagation(); deleteGoal(${goal.id})" style="position: absolute; top: 10px; right: 10px; background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 2px solid #EF4444; border-radius: 50%; width: 32px; height: 32px; font-size: 16px; cursor: pointer; font-weight: 700;">✕</button>
            </div>
        `;
    });
    
    // Add "Add Goal" button
    html += `
        <div onclick="addGoal()" style="cursor: pointer; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1)); border: 2px dashed rgba(139, 92, 246, 0.5); border-radius: 16px; padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.3s; min-height: 200px;">
            <div style="font-size: 48px; margin-bottom: 10px;">➕</div>
            <div style="font-size: 16px; font-weight: 700; color: #A78BFA;">Add New Goal</div>
        </div>
    `;
    
    container.innerHTML = html;
}

// ============================================
// HABIT MANAGEMENT
// ============================================

function initHabitsList() {
    const saved = localStorage.getItem('habitsList');
    if (saved) {
        habitsList = JSON.parse(saved);
    }
}

function saveHabitsList() {
    localStorage.setItem('habitsList', JSON.stringify(habitsList));
}

function addNewHabit() {
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">➕ Add New Habit</h2>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #A78BFA;">Habit Name</label>
            <input type="text" id="newHabitName" placeholder="e.g., Read 30 Minutes" style="width: 100%; padding: 15px; border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 12px; font-size: 16px; background: rgba(255, 255, 255, 0.1); color: white;" autofocus>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: flex-end;">
            <button onclick="closeModal()" style="background: rgba(255, 255, 255, 0.1); color: white; border: 2px solid rgba(255, 255, 255, 0.3); padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer;">Cancel</button>
            <button onclick="saveNewHabit()" style="background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);">Add Habit</button>
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
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">📋 Manage Habits</h2>
        
        <div style="margin-bottom: 20px; max-height: 400px; overflow-y: auto;">
            ${habitsHTML}
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: space-between;">
            <button onclick="closeModal(); addNewHabit();" style="background: linear-gradient(135deg, #10B981, #34D399); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);">➕ Add New Habit</button>
            <button onclick="closeModal()" style="background: rgba(255, 255, 255, 0.1); color: white; border: 2px solid rgba(255, 255, 255, 0.3); padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer;">Close</button>
        </div>
    `;
}

// ============================================
// HABIT TRACKING SYSTEM  
// ============================================

function renderHabitGrid() {
    const grid = document.getElementById('habitGrid');
    if (!grid) return;
    
    let html = '';

    // Header row with Manage button
    html += `<div class="habit-cell header">
        Habit 
        <button onclick="manageHabits()" style="margin-left: 10px; background: rgba(139, 92, 246, 0.3); border: 2px solid #8B5CF6; color: white; border-radius: 8px; padding: 4px 8px; font-size: 11px; cursor: pointer;">⚙️ Manage</button>
    </div>`;
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.setDate() - i);
        const isToday = i === 0;
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        html += `<div class="habit-cell header ${isToday ? 'today' : ''}">
            ${monthDay}<br><span style="font-size: 11px;">${isToday ? '📍 TODAY' : dayName.toUpperCase()}</span>
        </div>`;
    }

    // Habit rows
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
                     style="color: ${isToday && !checked ? '#8B5CF6' : 'inherit'}; font-size: ${isToday && !checked ? '24px' : '20px'}; cursor: pointer;">
                ${emoji}
            </div>`;
        }
    });

    grid.innerHTML = html;
}
        }
    });

    grid.innerHTML = html;
    updateStats();
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
    const bestStreakText = document.querySelector('.streak-display').querySelector('div[style*="font-size: 14px"]');
    if (bestStreakText) {
        if (currentStreak === bestStreak && currentStreak > 0) {
            bestStreakText.innerHTML = `🏆 Best Streak: ${bestStreak} days (Current!)`;
        } else {
            bestStreakText.innerHTML = `🏆 Best Streak: ${bestStreak} days`;
        }
    }
    
    // Update milestone cards
    updateMilestones(currentStreak);
}

function updateMilestones(streak) {
    const milestones = [
        { days: 7, icon: '🥉', name: '7 Days' },
        { days: 15, icon: '🥈', name: '15 Days' },
        { days: 30, icon: '🥇', name: '30 Days' }
    ];
    
    const milestoneCards = document.querySelectorAll('.milestone-card');
    
    milestones.forEach((milestone, index) => {
        if (milestoneCards[index]) {
            const card = milestoneCards[index];
            
            if (streak >= milestone.days) {
                card.classList.add('achieved');
                const statusDiv = card.querySelector('div[style*="font-size: 10px"]');
                if (statusDiv) {
                    statusDiv.innerHTML = '✓ UNLOCKED';
                    statusDiv.style.color = '#10B981';
                }
            } else {
                card.classList.remove('achieved');
                const statusDiv = card.querySelector('div[style*="font-size: 10px"]');
                if (statusDiv) {
                    const daysAway = milestone.days - streak;
                    statusDiv.innerHTML = `${daysAway} days away`;
                    statusDiv.style.color = '#FBBF24';
                }
            }
        }
    });
    
    // Update rewards based on milestones
    const rewardCards = document.querySelectorAll('.habit-section')[2].querySelectorAll('.milestone-card');
    if (rewardCards.length >= 2) {
        // Cheat Meal (7 days)
        if (streak >= 7) {
            rewardCards[0].classList.add('achieved');
            const statusDiv = rewardCards[0].querySelector('div[style*="font-size: 10px"]');
            if (statusDiv) {
                statusDiv.innerHTML = '✓ Unlocked';
                statusDiv.style.color = '#10B981';
            }
        }
        
        // New Gear (30 days)
        if (streak >= 30) {
            rewardCards[1].classList.add('achieved');
            const statusDiv = rewardCards[1].querySelector('div[style*="font-size: 10px"]');
            if (statusDiv) {
                statusDiv.innerHTML = '✓ Unlocked';
                statusDiv.style.color = '#10B981';
            }
        } else {
            const daysAway = 30 - streak;
            const statusDiv = rewardCards[1].querySelector('div[style*="font-size: 10px"]');
            if (statusDiv) {
                statusDiv.innerHTML = `🔒 ${daysAway} days away`;
                statusDiv.style.color = '#FBBF24';
            }
        }
    }
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
    // Only target the dashboard page stats (inside dashboardPage)
    const dashboardStats = document.querySelectorAll('#dashboardPage .stats-grid .stat-card');
    if (dashboardStats[0]) {
        dashboardStats[0].style.cursor = 'pointer';
        dashboardStats[0].onclick = showCompletionChart;
    }
    if (dashboardStats[1]) {
        dashboardStats[1].style.cursor = 'pointer';
        dashboardStats[1].onclick = showWeeklyChart;
    }
    if (dashboardStats[2]) {
        dashboardStats[2].style.cursor = 'pointer';
        dashboardStats[2].onclick = showStreakChart;
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
    const pageIndex = {dashboard: 0, goals: 1, workout: 2, journal: 3, vision: 4, content: 5, books: 6, settings: 7};
    tabs[pageIndex[pageName]].classList.add('active');
    
    // Load analytics when goals page is opened
    if (pageName === 'goals') {
        renderGoals();
        updateHabitAnalytics();
    }
    
    // Load workout data when workout page is opened
    if (pageName === 'workout') {
        renderExerciseCards();
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
// HABIT ANALYTICS
// ============================================

function updateHabitAnalytics() {
    const range = document.getElementById('habitAnalyticsRange')?.value || '7';
    const days = range === 'all' ? 90 : parseInt(range);
    
    const habitStats = {};
    
    // Initialize stats
    habitsList.forEach(habit => {
        habitStats[habit] = { completed: 0, total: 0, percentage: 0 };
    });
    
    // Calculate completion rates
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
    
    // Calculate percentages
    habitsList.forEach(habit => {
        if (habitStats[habit].total > 0) {
            habitStats[habit].percentage = Math.round((habitStats[habit].completed / habitStats[habit].total) * 100);
        }
    });
    
    // Sort habits by percentage
    const sortedHabits = [...habitsList].sort((a, b) => habitStats[b].percentage - habitStats[a].percentage);
    
    // Render top habits
    const topHabitsDiv = document.getElementById('topHabits');
    if (topHabitsDiv) {
        const top3 = sortedHabits.slice(0, 3);
        topHabitsDiv.innerHTML = top3.map((habit, index) => `
            <div style="background: rgba(255, 255, 255, 0.95); padding: 15px; margin-bottom: 12px; border-radius: 8px; border-left: 4px solid #10B981; color: #1a1a1a;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div><strong>${index + 1}.</strong> ${habit}</div>
                    <div style="font-size: 20px; font-weight: 900; color: #10B981;">${habitStats[habit].percentage}%</div>
                </div>
            </div>
        `).join('');
    }
    
    // Render bottom habits
    const bottomHabitsDiv = document.getElementById('bottomHabits');
    if (bottomHabitsDiv) {
        const bottom3 = sortedHabits.slice(-3).reverse();
        bottomHabitsDiv.innerHTML = bottom3.map((habit, index) => `
            <div style="background: rgba(255, 255, 255, 0.95); padding: 15px; margin-bottom: 12px; border-radius: 8px; border-left: 4px solid #EF4444; color: #1a1a1a;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div><strong>${index + 1}.</strong> ${habit}</div>
                    <div style="font-size: 20px; font-weight: 900; color: #EF4444;">${habitStats[habit].percentage}%</div>
                </div>
            </div>
        `).join('');
    }
    
    // Generate insights
    const insightsDiv = document.getElementById('habitInsights');
    if (insightsDiv) {
        const worst = sortedHabits[sortedHabits.length - 1];
        const best = sortedHabits[0];
        insightsDiv.innerHTML = `
            <p style="margin-bottom: 10px;">Your strongest habit is <strong>${best}</strong> at ${habitStats[best].percentage}%! Keep it up! 💪</p>
            <p>Focus on improving <strong>${worst}</strong> - small improvements here will have the biggest impact.</p>
        `;
    }
    
    // Render trends chart
    renderHabitTrendsChart(days, habitStats);
    
    // Render day analysis
    renderDayAnalysis(days);
}

function renderHabitTrendsChart(days, habitStats) {
    const canvas = document.getElementById('habitTrendsChart');
    if (!canvas) return;
    
    const labels = [];
    const datasets = [];
    
    // Generate date labels
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    
    // Get top 5 habits to display
    const sortedHabits = [...habitsList].sort((a, b) => habitStats[b].percentage - habitStats[a].percentage);
    const topHabits = sortedHabits.slice(0, 5);
    const colors = ['#10B981', '#8B5CF6', '#EC4899', '#FBBF24', '#3B82F6'];
    
    topHabits.forEach((habit, index) => {
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            data.push(habitData[dateKey]?.[habit] ? 1 : 0);
        }
        
        datasets.push({
            label: habit,
            data: data,
            borderColor: colors[index],
            backgroundColor: colors[index] + '40',
            borderWidth: 2,
            tension: 0.4
        });
    });
    
    if (window.habitTrendsChartInstance) {
        window.habitTrendsChartInstance.destroy();
    }
    
    window.habitTrendsChartInstance = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#ffffff' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
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

function renderDayAnalysis(days) {
    const dayStats = {
        'Sunday': { completed: 0, total: 0 },
        'Monday': { completed: 0, total: 0 },
        'Tuesday': { completed: 0, total: 0 },
        'Wednesday': { completed: 0, total: 0 },
        'Thursday': { completed: 0, total: 0 },
        'Friday': { completed: 0, total: 0 },
        'Saturday': { completed: 0, total: 0 }
    };
    
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        if (habitData[dateKey]) {
            const habits = Object.keys(habitData[dateKey]);
            const completed = habits.filter(h => habitData[dateKey][h]).length;
            dayStats[dayName].completed += completed;
            dayStats[dayName].total += habits.length;
        }
    }
    
    const dayPercentages = Object.keys(dayStats).map(day => ({
        day,
        percentage: dayStats[day].total > 0 ? Math.round((dayStats[day].completed / dayStats[day].total) * 100) : 0
    })).sort((a, b) => b.percentage - a.percentage);
    
    const bestDay = dayPercentages[0];
    const worstDay = dayPercentages[dayPercentages.length - 1];
    
    const dayAnalysisDiv = document.getElementById('dayAnalysis');
    if (dayAnalysisDiv) {
        dayAnalysisDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
                <div style="background: rgba(16, 185, 129, 0.2); border: 2px solid rgba(16, 185, 129, 0.5); border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🌟</div>
                    <div style="font-size: 20px; font-weight: 700; color: #10B981; margin-bottom: 5px;">${bestDay.day}</div>
                    <div style="font-size: 32px; font-weight: 900; color: #34D399;">${bestDay.percentage}%</div>
                    <div style="font-size: 12px; color: #9CA3AF; margin-top: 5px;">Best Day</div>
                </div>
                <div style="background: rgba(239, 68, 68, 0.2); border: 2px solid rgba(239, 68, 68, 0.5); border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                    <div style="font-size: 20px; font-weight: 700; color: #EF4444; margin-bottom: 5px;">${worstDay.day}</div>
                    <div style="font-size: 32px; font-weight: 900; color: #F87171;">${worstDay.percentage}%</div>
                    <div style="font-size: 12px; color: #9CA3AF; margin-top: 5px;">Needs Attention</div>
                </div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px;">
                <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 15px; color: #FBBF24;">📊 All Days Breakdown</h4>
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px;">
                    ${dayPercentages.map(d => `
                        <div style="text-align: center; padding: 15px; background: rgba(255, 255, 255, 0.1); border-radius: 8px;">
                            <div style="font-size: 12px; color: #9CA3AF; margin-bottom: 8px;">${d.day.slice(0, 3)}</div>
                            <div style="font-size: 20px; font-weight: 900; color: ${d.percentage >= 80 ? '#10B981' : d.percentage >= 50 ? '#FBBF24' : '#EF4444'};">${d.percentage}%</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

// ============================================
// WORKOUT TRACKING
// ============================================

let workoutData = {};
let lifetimePushups = 0;
let lifetimePullups = 0;

function initWorkoutData() {
    const saved = localStorage.getItem('workoutData');
    if (saved) {
        workoutData = JSON.parse(saved);
    }
    
    const savedPushups = localStorage.getItem('lifetimePushups');
    if (savedPushups) {
        lifetimePushups = parseInt(savedPushups);
        const display = document.getElementById('totalPushups');
        if (display) display.textContent = lifetimePushups.toLocaleString();
    }
    
    const savedPullups = localStorage.getItem('lifetimePullups');
    if (savedPullups) {
        lifetimePullups = parseInt(savedPullups);
        const display = document.getElementById('totalPullups');
        if (display) display.textContent = lifetimePullups.toLocaleString();
    }
}

function saveWorkoutData() {
    localStorage.setItem('workoutData', JSON.stringify(workoutData));
}

function logWorkout() {
    const name = document.getElementById('exerciseName')?.value.trim();
    const weight = parseFloat(document.getElementById('exerciseWeight')?.value);
    const reps = parseInt(document.getElementById('exerciseReps')?.value);
    const sets = parseInt(document.getElementById('exerciseSets')?.value);
    
    if (!name) {
        alert('Please enter an exercise name');
        return;
    }
    
    if (isNaN(weight) || isNaN(reps) || isNaN(sets)) {
        alert('Please enter valid numbers for weight, reps, and sets');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    if (!workoutData[name]) {
        workoutData[name] = [];
    }
    
    workoutData[name].push({
        date: today,
        weight: weight,
        reps: reps,
        sets: sets
    });
    
    saveWorkoutData();
    renderExerciseCards();
    
    // Clear inputs
    document.getElementById('exerciseName').value = '';
    document.getElementById('exerciseWeight').value = '';
    document.getElementById('exerciseReps').value = '';
    document.getElementById('exerciseSets').value = '';
}

function renderExerciseCards() {
    const container = document.getElementById('exerciseCardsContainer');
    if (!container) return;
    
    const exercises = Object.keys(workoutData);
    
    if (exercises.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; background: rgba(255, 255, 255, 0.05); border-radius: 16px; border: 2px dashed rgba(139, 92, 246, 0.3); margin-bottom: 30px;">
                <div style="font-size: 48px; margin-bottom: 15px;">💪</div>
                <div style="font-size: 18px; font-weight: 600; color: #A78BFA; margin-bottom: 10px;">No exercises tracked yet!</div>
                <div style="font-size: 14px; color: #9CA3AF;">Log your first workout above to get started</div>
            </div>
        `;
        return;
    }
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">';
    
    exercises.forEach(exercise => {
        const workouts = workoutData[exercise];
        const latest = workouts[workouts.length - 1];
        const first = workouts[0];
        const totalGain = latest.weight - first.weight;
        const percentGain = first.weight > 0 ? Math.round((totalGain / first.weight) * 100) : 0;
        
        html += `
            <div onclick="showExerciseChart('${exercise.replace(/'/g, "\\'")})" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.1)); border: 2px solid rgba(16, 185, 129, 0.4); border-radius: 16px; padding: 20px; cursor: pointer; transition: transform 0.2s; position: relative;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <button onclick="event.stopPropagation(); deleteExercise('${exercise.replace(/'/g, "\\'")}')" style="position: absolute; top: 10px; right: 10px; background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 2px solid #EF4444; border-radius: 50%; width: 32px; height: 32px; font-size: 16px; cursor: pointer; font-weight: 700;">✕</button>
                
                <h3 style="font-size: 18px; font-weight: 700; color: #10B981; margin-bottom: 15px;">🏋️ ${exercise}</h3>
                
                <div style="background: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 15px; margin-bottom: 12px; color: #1a1a1a;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-size: 13px; color: #6B7280;">Latest</span>
                        <span style="font-weight: 700;">${latest.weight} lbs × ${latest.reps} × ${latest.sets}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-size: 13px; color: #6B7280;">Starting</span>
                        <span style="font-weight: 700;">${first.weight} lbs</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-size: 13px; color: #6B7280;">Gain</span>
                        <span style="font-weight: 700; color: ${totalGain >= 0 ? '#10B981' : '#EF4444'};">${totalGain >= 0 ? '+' : ''}${totalGain} lbs (${percentGain >= 0 ? '+' : ''}${percentGain}%)</span>
                    </div>
                </div>
                
                <div style="background: rgba(16, 185, 129, 0.1); border-radius: 8px; padding: 12px;">
                    <div style="font-size: 12px; color: #6B7280; margin-bottom: 8px;">Total Workouts: ${workouts.length}</div>
                    <div style="font-size: 11px; color: #9CA3AF;">Click to see progress chart</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function showExerciseChart(exerciseName) {
    const workouts = workoutData[exerciseName];
    if (!workouts || workouts.length === 0) return;
    
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #10B981, #34D399); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🏋️ ${exerciseName} Progress</h2>
        
        <canvas id="exerciseChart" style="max-height: 400px; margin-bottom: 30px;"></canvas>
        
        <div style="background: rgba(16, 185, 129, 0.2); border-radius: 12px; border: 2px solid rgba(16, 185, 129, 0.4); padding: 20px;">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 15px; color: #34D399;">📊 Stats</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;" id="exerciseStats"></div>
        </div>
        
        <div style="margin-top: 20px; max-height: 200px; overflow-y: auto; background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 15px;">
            <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 10px; color: #A78BFA;">📝 Recent Workouts</h4>
            ${workouts.slice(-10).reverse().map(w => `
                <div style="padding: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 8px; margin-bottom: 8px; font-size: 13px;">
                    <strong>${new Date(w.date).toLocaleDateString()}</strong>: ${w.weight} lbs × ${w.reps} reps × ${w.sets} sets
                </div>
            `).join('')}
        </div>
    `;
    
    renderExerciseChart(exerciseName, workouts);
}

function renderExerciseChart(exerciseName, workouts) {
    const canvas = document.getElementById('exerciseChart');
    if (!canvas) return;
    
    const labels = workouts.map(w => new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const weights = workouts.map(w => w.weight);
    
    const first = workouts[0];
    const latest = workouts[workouts.length - 1];
    const totalGain = latest.weight - first.weight;
    const maxWeight = Math.max(...weights);
    
    // Update stats
    const statsDiv = document.getElementById('exerciseStats');
    if (statsDiv) {
        statsDiv.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 28px; font-weight: 900; color: #8B5CF6;">${first.weight} lbs</div>
                <div style="font-size: 12px; color: #9CA3AF;">Starting</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 28px; font-weight: 900; color: #10B981;">${latest.weight} lbs</div>
                <div style="font-size: 12px; color: #9CA3AF;">Current</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 28px; font-weight: 900; color: ${totalGain >= 0 ? '#FBBF24' : '#EF4444'};">${totalGain >= 0 ? '+' : ''}${totalGain} lbs</div>
                <div style="font-size: 12px; color: #9CA3AF;">Gain</div>
            </div>
        `;
    }
    
    if (window.exerciseChartInstance) {
        window.exerciseChartInstance.destroy();
    }
    
    window.exerciseChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Weight (lbs)',
                data: weights,
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#10B981'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#ffffff' } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const workout = workouts[context.dataIndex];
                            return `${workout.weight} lbs × ${workout.reps} reps × ${workout.sets} sets`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
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

function deleteExercise(exerciseName) {
    if (!confirm(`Delete all data for "${exerciseName}"? This cannot be undone.`)) {
        return;
    }
    
    delete workoutData[exerciseName];
    saveWorkoutData();
    renderExerciseCards();
}

function addPushups() {
    const input = document.getElementById('pushupInput');
    const amount = parseInt(input?.value);
    
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid number');
        return;
    }
    
    lifetimePushups += amount;
    localStorage.setItem('lifetimePushups', lifetimePushups);
    
    const display = document.getElementById('totalPushups');
    if (display) display.textContent = lifetimePushups.toLocaleString();
    
    input.value = '';
}

function addPullups() {
    const input = document.getElementById('pullupInput');
    const amount = parseInt(input?.value);
    
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid number');
        return;
    }
    
    lifetimePullups += amount;
    localStorage.setItem('lifetimePullups', lifetimePullups);
    
    const display = document.getElementById('totalPullups');
    if (display) display.textContent = lifetimePullups.toLocaleString();
    
    input.value = '';
}

// ============================================
// INITIALIZATION
// ============================================

initHabitData();
initGoalsData();
initMoodData();
initHabitsList();
initWorkoutData();
renderHabitGrid();
updateStreakDisplay();
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
