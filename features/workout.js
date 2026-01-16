// ============================================
// WORKOUT MODULE
// ============================================

let workoutData = {};
let lifetimePushups = 0;
let lifetimePullups = 0;

// Initialize workout data
function initWorkoutData() {
    const saved = localStorage.getItem('workoutData');
    if (saved) {
        workoutData = JSON.parse(saved);
    }
    
    const savedPushups = localStorage.getItem('lifetimePushups');
    if (savedPushups) {
        lifetimePushups = parseInt(savedPushups);
    }
    
    const savedPullups = localStorage.getItem('lifetimePullups');
    if (savedPullups) {
        lifetimePullups = parseInt(savedPullups);
    }
    
    renderLifetimeCounters();
}

// Save workout data
function saveWorkoutData() {
    localStorage.setItem('workoutData', JSON.stringify(workoutData));
}

// Log workout
function logWorkout() {
    const exerciseName = document.getElementById('exerciseName').value.trim();
    const weight = parseInt(document.getElementById('exerciseWeight').value);
    const reps = parseInt(document.getElementById('exerciseReps').value);
    const sets = parseInt(document.getElementById('exerciseSets').value);
    
    if (!exerciseName || !weight || !reps || !sets) {
        alert('Please fill in all fields');
        return;
    }
    
    if (!workoutData[exerciseName]) {
        workoutData[exerciseName] = [];
    }
    
    workoutData[exerciseName].push({
        date: new Date().toISOString(),
        weight,
        reps,
        sets
    });
    
    saveWorkoutData();
    
    // Clear inputs
    document.getElementById('exerciseName').value = '';
    document.getElementById('exerciseWeight').value = '';
    document.getElementById('exerciseReps').value = '';
    document.getElementById('exerciseSets').value = '';
    
    renderExerciseCards();
}

// Render exercise cards
function renderExerciseCards() {
    const container = document.getElementById('exerciseCards');
    if (!container) return;
    
    const exercises = Object.keys(workoutData);
    
    if (exercises.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #6B7280; padding: 40px;">No exercises logged yet. Start tracking your workouts above!</div>';
        return;
    }
    
    let html = '';
    exercises.forEach(exerciseName => {
        const sessions = workoutData[exerciseName];
        const latest = sessions[sessions.length - 1];
        const first = sessions[0];
        const totalSessions = sessions.length;
        const weightGain = latest.weight - first.weight;
        
        html += `
            <div class="exercise-card" onclick="showExerciseChart('${exerciseName}')">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="color: white; margin: 0;">${exerciseName}</h3>
                    <span style="color: #9CA3AF; font-size: 0.9em;">${totalSessions} sessions</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div>
                        <div style="color: #9CA3AF; font-size: 0.85em;">Current</div>
                        <div style="color: white; font-weight: bold;">${latest.weight} lbs</div>
                    </div>
                    <div>
                        <div style="color: #9CA3AF; font-size: 0.85em;">Started</div>
                        <div style="color: white; font-weight: bold;">${first.weight} lbs</div>
                    </div>
                    <div>
                        <div style="color: #9CA3AF; font-size: 0.85em;">Gain</div>
                        <div style="color: ${weightGain >= 0 ? '#10B981' : '#EF4444'}; font-weight: bold;">${weightGain > 0 ? '+' : ''}${weightGain} lbs</div>
                    </div>
                </div>
                <div style="margin-top: 10px; color: #6B7280; font-size: 0.85em;">
                    Latest: ${latest.sets} × ${latest.reps} reps
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Show exercise chart
function showExerciseChart(exerciseName) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) return;
    
    const sessions = workoutData[exerciseName];
    
    let html = `<h2 style="color: white; margin-bottom: 20px;">${exerciseName}</h2>`;
    
    // Stats
    const latest = sessions[sessions.length - 1];
    const first = sessions[0];
    const totalSessions = sessions.length;
    const weightGain = latest.weight - first.weight;
    
    html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">';
    html += `
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
            <div style="color: #9CA3AF; font-size: 0.9em;">Current Weight</div>
            <div style="font-size: 2em; color: white; font-weight: bold;">${latest.weight} lbs</div>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
            <div style="color: #9CA3AF; font-size: 0.9em;">Total Gain</div>
            <div style="font-size: 2em; color: ${weightGain >= 0 ? '#10B981' : '#EF4444'}; font-weight: bold;">${weightGain > 0 ? '+' : ''}${weightGain} lbs</div>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
            <div style="color: #9CA3AF; font-size: 0.9em;">Total Sessions</div>
            <div style="font-size: 2em; color: white; font-weight: bold;">${totalSessions}</div>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
            <div style="color: #9CA3AF; font-size: 0.9em;">Latest Volume</div>
            <div style="font-size: 1.5em; color: white; font-weight: bold;">${latest.sets} × ${latest.reps}</div>
        </div>
    `;
    html += '</div>';
    
    // Progress chart
    html += '<div style="margin-bottom: 20px;">';
    html += '<div style="color: white; font-weight: 600; margin-bottom: 10px;">Weight Progress</div>';
    html += '<div style="display: flex; gap: 3px; height: 150px; align-items: flex-end;">';
    
    const maxWeight = Math.max(...sessions.map(s => s.weight));
    sessions.forEach((session, index) => {
        const height = (session.weight / maxWeight) * 100;
        html += `<div style="flex: 1; background: rgba(16, 185, 129, 0.6); height: ${height}%; border-radius: 2px;" title="Session ${index + 1}: ${session.weight} lbs"></div>`;
    });
    
    html += '</div>';
    html += '</div>';
    
    // Recent sessions
    html += '<div style="margin-bottom: 20px;">';
    html += '<div style="color: white; font-weight: 600; margin-bottom: 10px;">Recent Sessions</div>';
    const recentSessions = sessions.slice(-5).reverse();
    recentSessions.forEach(session => {
        const date = new Date(session.date);
        html += `
            <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between;">
                <span style="color: #9CA3AF;">${date.toLocaleDateString()}</span>
                <span style="color: white;">${session.weight} lbs × ${session.sets} sets × ${session.reps} reps</span>
            </div>
        `;
    });
    html += '</div>';
    
    html += '<div style="display: flex; gap: 10px;">';
    html += `<button onclick="deleteExercise('${exerciseName}')" style="flex: 1; padding: 10px; background: rgba(255,50,50,0.2); border: 1px solid rgba(255,50,50,0.3); border-radius: 8px; color: #ff9999; cursor: pointer;">Delete Exercise</button>`;
    html += '<button onclick="closeModal()" style="flex: 1; padding: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; cursor: pointer;">Close</button>';
    html += '</div>';
    
    modalBody.innerHTML = html;
    modal.style.display = 'flex';
}

// Delete exercise
function deleteExercise(exerciseName) {
    if (!confirm(`Delete all data for ${exerciseName}?`)) {
        return;
    }
    
    delete workoutData[exerciseName];
    saveWorkoutData();
    renderExerciseCards();
    closeModal();
}

// Add pushups
function addPushups() {
    const input = document.getElementById('pushupsToAdd');
    const reps = parseInt(input.value);
    
    if (!reps || reps <= 0) {
        alert('Please enter a valid number');
        return;
    }
    
    lifetimePushups += reps;
    localStorage.setItem('lifetimePushups', lifetimePushups.toString());
    input.value = '';
    renderLifetimeCounters();
}

// Add pullups
function addPullups() {
    const input = document.getElementById('pullupsToAdd');
    const reps = parseInt(input.value);
    
    if (!reps || reps <= 0) {
        alert('Please enter a valid number');
        return;
    }
    
    lifetimePullups += reps;
    localStorage.setItem('lifetimePullups', lifetimePullups.toString());
    input.value = '';
    renderLifetimeCounters();
}

// Render lifetime counters
function renderLifetimeCounters() {
    const pushupsEl = document.getElementById('lifetimePushups');
    const pullupsEl = document.getElementById('lifetimePullups');
    
    if (pushupsEl) pushupsEl.textContent = lifetimePushups.toLocaleString();
    if (pullupsEl) pullupsEl.textContent = lifetimePullups.toLocaleString();
}
