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
        try {
            workoutData = JSON.parse(saved) || {};
        } catch {
            workoutData = {};
        }
    }

    const savedPushups = localStorage.getItem('lifetimePushups');
    if (savedPushups) {
        lifetimePushups = parseInt(savedPushups) || 0;
    }

    const savedPullups = localStorage.getItem('lifetimePullups');
    if (savedPullups) {
        lifetimePullups = parseInt(savedPullups) || 0;
    }

    renderExerciseCards();
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

    // Empty state
    if (exercises.length === 0) {
        container.innerHTML = `
            <div style="
                text-align:center;
                color:#9CA3AF;
                padding:40px;
                border-radius:18px;
                border:1px solid rgba(255,255,255,0.12);
                background:rgba(255,255,255,0.04);
            ">
                No exercises logged yet. Start tracking your workouts above.
            </div>
        `;
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
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h3 style="color:white; margin:0;">${exerciseName}</h3>
                    <span style="color:#9CA3AF; font-size:0.85em;">
                        ${totalSessions} session${totalSessions !== 1 ? 's' : ''}
                    </span>
                </div>

                <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px;">
                    <div>
                        <div style="color:#9CA3AF; font-size:0.8em;">Current</div>
                        <div style="color:white; font-weight:700;">${latest.weight} lbs</div>
                    </div>
                    <div>
                        <div style="color:#9CA3AF; font-size:0.8em;">Started</div>
                        <div style="color:white; font-weight:700;">${first.weight} lbs</div>
                    </div>
                    <div>
                        <div style="color:#9CA3AF; font-size:0.8em;">Gain</div>
                        <div style="color:${weightGain >= 0 ? '#10B981' : '#EF4444'}; font-weight:700;">
                            ${weightGain > 0 ? '+' : ''}${weightGain} lbs
                        </div>
                    </div>
                </div>

                <div style="margin-top:8px; color:#9CA3AF; font-size:0.8em;">
                    Latest: ${latest.sets} × ${latest.reps} reps
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Show exercise details
function showExerciseChart(exerciseName) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;

    const sessions = workoutData[exerciseName];
    const latest = sessions[sessions.length - 1];
    const first = sessions[0];
    const weightGain = latest.weight - first.weight;

    let html = `
        <h2 style="color:white; margin-bottom:16px;">${exerciseName}</h2>

        <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-bottom:18px;">
            <div class="stat-card">
                <div class="stat-label">Current</div>
                <div class="stat-value">${latest.weight} lbs</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Gain</div>
                <div class="stat-value" style="color:${weightGain >= 0 ? '#10B981' : '#EF4444'};">
                    ${weightGain > 0 ? '+' : ''}${weightGain} lbs
                </div>
            </div>
        </div>

        <div style="display:flex; gap:10px;">
            <button onclick="deleteExercise('${exerciseName}')" style="flex:1;">
                Delete Exercise
            </button>
            <button onclick="closeModal()" style="flex:1;">
                Close
            </button>
        </div>
    `;

    modalBody.innerHTML = html;
    modal.style.display = 'flex';
}

// Delete exercise
function deleteExercise(exerciseName) {
    if (!confirm(`Delete all data for ${exerciseName}?`)) return;

    delete workoutData[exerciseName];
    saveWorkoutData();
    renderExerciseCards();
    closeModal();
}

// Pushups / Pullups (future-proofed)
function renderLifetimeCounters() {
    const pushupsEl = document.getElementById('lifetimePushups');
    const pullupsEl = document.getElementById('lifetimePullups');

    if (pushupsEl) pushupsEl.textContent = lifetimePushups.toLocaleString();
    if (pullupsEl) pullupsEl.textContent = lifetimePullups.toLocaleString();
}
