// ============================================
// MOOD MODULE - Mood & energy tracking
// ============================================

let moodData = {};

// ============================================
// INITIALIZATION
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

// ============================================
// MOOD TRACKING
// ============================================

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
                <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #ffffff, #9CA3AF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">😊 How are you feeling today?</h3>
                
                <!-- Energy Slider -->
                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #6B7280;">⚡ Energy Level: <span id="energyValue" style="color: #ffffff; font-size: 18px;">${currentEnergy}/10</span></label>
                    <input type="range" min="1" max="10" value="${currentEnergy}" oninput="setEnergy(this.value); document.getElementById('energyValue').textContent = this.value + '/10';" style="width: 100%; height: 8px; border-radius: 5px; background: linear-gradient(to right, #EF4444 0%, #ffffff 50%, #ffffff 100%); outline: none; -webkit-appearance: none; cursor: pointer;">
                </div>
                
                <!-- Mood Selector -->
                <div>
                    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #6B7280;">😊 Mood</label>
                    <div style="display: flex; gap: 10px; justify-content: space-between;">
                        ${moods.map(mood => `
                            <button onclick="setMood('${mood}')" style="background: ${currentMood === mood ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)'}; border: 2px solid ${currentMood === mood ? '#ffffff' : 'rgba(139, 92, 246, 0.3)'}; border-radius: 12px; padding: 15px; font-size: 32px; cursor: pointer; transition: all 0.2s; flex: 1;">
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
                <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #ffffff, #6B7280); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">📊 Past 7 Days</h3>
                
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
                    ${last7Days.map(day => `
                        <div style="background: ${day.isToday ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)'}; border: 2px solid ${day.isToday ? '#ffffff' : 'rgba(16, 185, 129, 0.3)'}; border-radius: 12px; padding: 10px; text-align: center;">
                            <div style="font-size: 9px; color: #9CA3AF; margin-bottom: 5px; font-weight: 600;">${day.monthDay}</div>
                            <div style="font-size: 8px; color: ${day.isToday ? '#6B7280' : '#6B7280'}; margin-bottom: 8px;">${day.label}</div>
                            <div style="font-size: 28px; margin-bottom: 8px;">${day.data.mood || '—'}</div>
                            <div style="font-size: 14px; font-weight: 900; color: ${day.data.energy >= 7 ? '#ffffff' : day.data.energy >= 4 ? '#ffffff' : day.data.energy > 0 ? '#EF4444' : '#6B7280'};">
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
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #ffffff, #6B7280); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">😊 Energy & Mood History</h2>
        
        <div style="margin-bottom: 20px;">
            <select id="moodTimeRange" onchange="updateMoodChart()" style="padding: 10px; border: 2px solid rgba(16, 185, 129, 0.4); border-radius: 8px; background: rgba(255, 255, 255, 0.1); color: white; font-size: 14px; font-weight: 600;">
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="all">All Time</option>
            </select>
        </div>
        
        <canvas id="moodChart" style="max-height: 400px;"></canvas>
        
        <div style="margin-top: 30px; padding: 20px; background: rgba(16, 185, 129, 0.2); border-radius: 12px; border: 2px solid rgba(16, 185, 129, 0.4);">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 15px; color: #6B7280;">📊 Stats</h3>
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
                    <div style="font-size: 32px; font-weight: 900; color: #ffffff;">${avgEnergy}</div>
                    <div style="font-size: 12px; color: #9CA3AF;">Avg Energy</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 900; color: #6B7280;">${highEnergyDays}</div>
                    <div style="font-size: 12px; color: #9CA3AF;">High Energy Days</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 900; color: #EF4444;">${lowEnergyDays}</div>
                    <div style="font-size: 12px; color: #9CA3AF;">Low Energy Days</div>
                </div>
            </div>
            <div style="margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.1); border-radius: 8px;">
                <div style="font-size: 14px; color: #6B7280; margin-bottom: 10px;">🗓️ Mood Pattern:</div>
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
                borderColor: '#ffffff',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: energyData.map(e => {
                    if (!e) return '#6B7280';
                    if (e >= 7) return '#ffffff';
                    if (e >= 4) return '#ffffff';
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
