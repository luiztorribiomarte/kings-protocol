// ============================================
// WORKOUT MODULE - Workout tracking
// ============================================

let workoutData = {};
let lifetimePushups = 0;
let lifetimePullups = 0;

// ============================================
// INITIALIZATION
// ============================================

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

// ============================================
// WORKOUT LOGGING
// ============================================

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
            <div style="text-align: center; padding: 60px; background: rgba(255, 255, 255, 0.05); border-radius: 16px; border: 2px dashed rgba(58, 58, 58, 0.3); margin-bottom: 30px;">
                <div style="font-size: 48px; margin-bottom: 15px;">💪</div>
                <div style="font-size: 18px; font-weight: 600; color: #6B7280; margin-bottom: 10px;">No exercises tracked yet!</div>
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
            <div onclick="showExerciseChart('${exercise.replace(/'/g, "\\'")})" style="background: linear-gradient(135deg, rgba(26, 26, 26, 0.1), rgba(38, 38, 38, 0.1)); border: 2px solid rgba(26, 26, 26, 0.4); border-radius: 16px; padding: 20px; cursor: pointer; transition: transform 0.2s; position: relative;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <button onclick="event.stopPropagation(); deleteExercise('${exercise.replace(/'/g, "\\'")}')" style="position: absolute; top: 10px; right: 10px; background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 2px solid #EF4444; border-radius: 50%; width: 32px; height: 32px; font-size: 16px; cursor: pointer; font-weight: 700;">✕</button>
                
                <h3 style="font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 15px;">🏋️ ${exercise}</h3>
                
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
                        <span style="font-weight: 700; color: ${totalGain >= 0 ? '#ffffff' : '#EF4444'};">${totalGain >= 0 ? '+' : ''}${totalGain} lbs (${percentGain >= 0 ? '+' : ''}${percentGain}%)</span>
                    </div>
                </div>
                
                <div style="background: rgba(26, 26, 26, 0.1); border-radius: 8px; padding: 12px;">
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
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #ffffff, #6B7280); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🏋️ ${exerciseName} Progress</h2>
        
        <canvas id="exerciseChart" style="max-height: 400px; margin-bottom: 30px;"></canvas>
        
        <div style="background: rgba(26, 26, 26, 0.2); border-radius: 12px; border: 2px solid rgba(26, 26, 26, 0.4); padding: 20px;">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 15px; color: #6B7280;">📊 Stats</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;" id="exerciseStats"></div>
        </div>
        
        <div style="margin-top: 20px; max-height: 200px; overflow-y: auto; background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 15px;">
            <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 10px; color: #6B7280;">📝 Recent Workouts</h4>
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
    
    // Update stats
    const statsDiv = document.getElementById('exerciseStats');
    if (statsDiv) {
        statsDiv.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 28px; font-weight: 900; color: #ffffff;">${first.weight} lbs</div>
                <div style="font-size: 12px; color: #9CA3AF;">Starting</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 28px; font-weight: 900; color: #ffffff;">${latest.weight} lbs</div>
                <div style="font-size: 12px; color: #9CA3AF;">Current</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 28px; font-weight: 900; color: ${totalGain >= 0 ? '#ffffff' : '#EF4444'};">${totalGain >= 0 ? '+' : ''}${totalGain} lbs</div>
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
                borderColor: '#ffffff',
                backgroundColor: 'rgba(26, 26, 26, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointBackgroundColor: '#ffffff'
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

// ============================================
// LIFETIME COUNTERS
// ============================================

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
