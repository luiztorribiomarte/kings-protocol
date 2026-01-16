// ============================================
// MOOD MODULE
// ============================================

let moodData = {};

// Initialize mood data
function initMoodData() {
    const saved = localStorage.getItem('moodData');
    if (saved) {
        moodData = JSON.parse(saved);
    }
}

// Save mood data
function saveMoodData() {
    localStorage.setItem('moodData', JSON.stringify(moodData));
}

// Get date string
function getMoodDateString(date) {
    const d = date || new Date();
    return d.toISOString().split('T')[0];
}

// Render mood tracker
function renderMoodTracker() {
    const container = document.getElementById('moodTracker');
    if (!container) return;

    const today = getMoodDateString(new Date());
    const todayData = moodData[today] || { energy: 5, mood: null };

    let html = '<div class="mood-tracker-container">';
    
    // Today's input section
    html += '<div class="mood-today">';
    html += '<h3 style="color: white; margin-bottom: 15px;">Today</h3>';
    
    // Energy slider
    html += '<div style="margin-bottom: 20px;">';
    html += '<label style="color: #9CA3AF; display: block; margin-bottom: 10px;">⚡ Energy Level: <span id="energyValue">' + (todayData.energy || 5) + '</span>/10</label>';
    html += '<input type="range" min="1" max="10" value="' + (todayData.energy || 5) + '" oninput="document.getElementById(\'energyValue\').textContent = this.value" onchange="setEnergy(this.value)" class="energy-slider" style="width: 100%;">';
    html += '</div>';
    
    // Mood selector
    html += '<div>';
    html += '<label style="color: #9CA3AF; display: block; margin-bottom: 10px;">😊 Mood</label>';
    html += '<div class="mood-selector">';
    const moods = ['😃', '💪', '😴', '😤', '🧘'];
    const moodLabels = ['Happy', 'Energized', 'Tired', 'Stressed', 'Calm'];
    moods.forEach((emoji, index) => {
        const selected = todayData.mood === emoji ? 'selected' : '';
        html += `<button class="mood-btn ${selected}" onclick="setMood('${emoji}')" title="${moodLabels[index]}">${emoji}</button>`;
    });
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    // Past 7 days section
    html += '<div class="mood-history" onclick="showMoodChart()">';
    html += '<h3 style="color: white; margin-bottom: 15px;">Past 7 Days</h3>';
    html += '<div class="past-mood-grid">';
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = getMoodDateString(date);
        const dayData = moodData[dateStr] || {};
        const isToday = i === 0;
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        html += `<div class="past-mood-day ${isToday ? 'today' : ''}">`;
        html += `<div style="font-size: 0.8em; color: #6B7280; margin-bottom: 5px;">${dayName}</div>`;
        html += `<div style="font-size: 1.5em; margin-bottom: 5px;">${dayData.mood || '—'}</div>`;
        html += `<div style="color: ${getEnergyColor(dayData.energy)}; font-weight: bold;">${dayData.energy || '—'}</div>`;
        html += '</div>';
    }
    
    html += '</div>';
    html += '<div style="text-align: center; color: #6B7280; font-size: 0.85em; margin-top: 10px;">Click to view chart</div>';
    html += '</div>';
    
    html += '</div>';
    
    container.innerHTML = html;
}

// Get energy color
function getEnergyColor(energy) {
    if (!energy) return '#6B7280';
    if (energy >= 8) return '#10B981';
    if (energy >= 5) return '#F59E0B';
    return '#EF4444';
}

// Set energy
function setEnergy(value) {
    const today = getMoodDateString(new Date());
    if (!moodData[today]) {
        moodData[today] = {};
    }
    
    moodData[today].energy = parseInt(value);
    saveMoodData();
}

// Set mood
function setMood(emoji) {
    const today = getMoodDateString(new Date());
    if (!moodData[today]) {
        moodData[today] = {};
    }
    
    moodData[today].mood = emoji;
    saveMoodData();
    renderMoodTracker();
}

// Show mood chart
function showMoodChart() {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) return;

    let html = '<h2 style="color: white; margin-bottom: 20px;">Energy & Mood Trends</h2>';
    
    // Time range selector
    html += '<div style="margin-bottom: 20px;">';
    html += '<select id="moodTimeRange" onchange="updateMoodChart()" style="padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; width: 100%;">';
    html += '<option value="7">Last 7 Days</option>';
    html += '<option value="30">Last 30 Days</option>';
    html += '<option value="90">All Time</option>';
    html += '</select>';
    html += '</div>';
    
    // Stats
    const stats = calculateMoodStats(7);
    html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">';
    html += `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">`;
    html += `<div style="color: #9CA3AF; font-size: 0.9em;">Avg Energy</div>`;
    html += `<div style="font-size: 2em; color: white; font-weight: bold;">${stats.avgEnergy}</div>`;
    html += `</div>`;
    html += `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">`;
    html += `<div style="color: #9CA3AF; font-size: 0.9em;">High Energy Days</div>`;
    html += `<div style="font-size: 2em; color: white; font-weight: bold;">${stats.highEnergyDays}</div>`;
    html += `</div>`;
    html += '</div>';
    
    // Simple line chart
    html += '<div id="moodChartContainer">';
    html += renderMoodChartBars(7);
    html += '</div>';
    
    html += '<button onclick="closeModal()" style="padding: 10px 20px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; cursor: pointer; width: 100%; margin-top: 20px;">Close</button>';

    modalBody.innerHTML = html;
    modal.style.display = 'flex';
}

// Calculate mood stats
function calculateMoodStats(days) {
    const today = new Date();
    let totalEnergy = 0;
    let energyCount = 0;
    let highEnergyDays = 0;
    
    const daysToCheck = days === 90 ? 90 : days;
    
    for (let i = 0; i < daysToCheck; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = getMoodDateString(date);
        const dayData = moodData[dateStr];
        
        if (dayData && dayData.energy) {
            totalEnergy += dayData.energy;
            energyCount++;
            if (dayData.energy >= 7) {
                highEnergyDays++;
            }
        }
    }
    
    return {
        avgEnergy: energyCount > 0 ? (totalEnergy / energyCount).toFixed(1) : '0.0',
        highEnergyDays
    };
}

// Render mood chart bars
function renderMoodChartBars(days) {
    const today = new Date();
    let html = '<div style="margin-bottom: 10px; color: #9CA3AF;">Energy Levels</div>';
    html += '<div style="display: flex; gap: 4px; height: 150px; align-items: flex-end; margin-bottom: 20px;">';
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = getMoodDateString(date);
        const dayData = moodData[dateStr] || {};
        const energy = dayData.energy || 0;
        const height = (energy / 10) * 100;
        const color = getEnergyColor(energy);
        
        html += `<div style="flex: 1; background: ${color}; height: ${height}%; border-radius: 3px; opacity: 0.7; position: relative;" title="${dateStr}: ${energy}/10">`;
        html += `<div style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 1.2em;">${dayData.mood || ''}</div>`;
        html += `</div>`;
    }
    
    html += '</div>';
    return html;
}

// Update mood chart
function updateMoodChart() {
    const range = document.getElementById('moodTimeRange').value;
    const days = parseInt(range);
    
    const stats = calculateMoodStats(days);
    const chartHtml = renderMoodChartBars(days);
    
    document.getElementById('moodChartContainer').innerHTML = chartHtml;
}
