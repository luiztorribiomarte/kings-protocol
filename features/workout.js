// ============================================
// WORKOUT MODULE
// ============================================

let workoutData = {};
let lifetimePushups = 0;
let lifetimePullups = 0;

/* ---------- Init ---------- */
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

    hideAddGoalButton();
    renderWorkoutLogger();
    renderExerciseCards();
    renderLifetimeCounters();
}

/* ---------- Hide Add Goal Button ---------- */
function hideAddGoalButton() {
    const addGoalBtn = document.querySelector('[onclick="openGoalModal()"]');
    if (addGoalBtn) {
        addGoalBtn.style.display = 'none';
    }
}

/* ---------- UI: Workout Logger ---------- */
function renderWorkoutLogger() {
    const page = document.getElementById('workoutPage');
    if (!page) return;

    if (document.getElementById('workoutLogger')) return;

    const logger = document.createElement('div');
    logger.id = 'workoutLogger';
    logger.style.marginBottom = '20px';

    logger.innerHTML = `
        <div class="section-title">💪 Log Workout</div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:12px;">
            <input id="exerciseName" class="form-input" placeholder="Exercise (Bench Press)" />
            <input id="exerciseWeight" class="form-input" type="number" placeholder="Weight (lbs)" />
            <input id="exerciseSets" class="form-input" type="number" placeholder="Sets" />
            <input id="exerciseReps" class="form-input" type="number" placeholder="Reps" />
        </div>

        <div style="margin-top:12px;">
            <button onclick="logWorkout()" class="form-submit">
                Log Workout
            </button>
        </div>
    `;

    page.insertBefore(logger, page.firstChild);
}

/* ---------- Save ---------- */
function saveWorkoutData() {
    localStorage.setItem('workoutData', JSON.stringify(workoutData));
}

/* ---------- Log Workout ---------- */
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

    document.getElementById('exerciseName').value = '';
    document.getElementById('exerciseWeight').value = '';
    document.getElementById('exerciseReps').value = '';
    document.getElementById('exerciseSets').value = '';

    renderExerciseCards();
}

/* ---------- Render Exercise Cards ---------- */
function renderExerciseCards() {
    const container = document.getElementById('exerciseCards');
    if (!container) return;

    const exercises = Object.keys(workoutData);

    if (exercises.length === 0) {
        container.innerHTML = `
            <div id="emptyWorkoutState" style="text-align:center; color:#9CA3AF; padding:40px;">
                No exercises logged yet. Start tracking your workouts above!
            </div>
        `;
        return;
    }

    container.innerHTML = exercises.map(exerciseName => {
        const sessions = workoutData[exerciseName];
        const latest = sessions[sessions.length - 1];
        const first = sessions[0];
        const totalSessions = sessions.length;
        const weightGain = latest.weight - first.weight;

        return `
            <div class="exercise-card" onclick="showExerciseChart('${exerciseName}')">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <div style="font-weight:800;">${exerciseName}</div>
                    <div style="color:#9CA3AF;">${totalSessions} sessions</div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(3,1fr); gap:10px;">
                    <div>
                        <div style="color:#9CA3AF;">Current</div>
                        <div>${latest.weight} lbs</div>
                    </div>
                    <div>
                        <div style="color:#9CA3AF;">Start</div>
                        <div>${first.weight} lbs</div>
                    </div>
                    <div style="color:${weightGain >= 0 ? '#10B981' : '#EF4444'};">
                        ${weightGain >= 0 ? '+' : ''}${weightGain} lbs
                    </div>
                </div>

                <div style="margin-top:8px; color:#9CA3AF;">
                    Latest: ${latest.sets} × ${latest.reps}
                </div>
            </div>
        `;
    }).join('');
}

/* ---------- Modal ---------- */
function showExerciseChart(exerciseName) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;

    const sessions = workoutData[exerciseName];
    const latest = sessions[sessions.length - 1];
    const first = sessions[0];
    const weightGain = latest.weight - first.weight;

    modalBody.innerHTML = `
        <h2>${exerciseName}</h2>
        <p>Current: ${latest.weight} lbs</p>
        <p>Total Gain: ${weightGain >= 0 ? '+' : ''}${weightGain} lbs</p>
        <p>Total Sessions: ${sessions.length}</p>

        <div style="margin-top:16px; display:flex; gap:10px;">
            <button onclick="deleteExercise('${exerciseName}')" class="form-cancel">
                Delete
            </button>
            <button onclick="closeModal()" class="form-submit">
                Close
            </button>
        </div>
    `;

    modal.style.display = 'flex';
}

/* ---------- Delete ---------- */
function deleteExercise(exerciseName) {
    if (!confirm(`Delete all data for ${exerciseName}?`)) return;

    delete workoutData[exerciseName];
    saveWorkoutData();
    closeModal();
    renderExerciseCards();
}

/* ---------- Lifetime ---------- */
function renderLifetimeCounters() {
    const pushupsEl = document.getElementById('lifetimePushups');
    const pullupsEl = document.getElementById('lifetimePullups');

    if (pushupsEl) pushupsEl.textContent = lifetimePushups.toLocaleString();
    if (pullupsEl) pullupsEl.textContent = lifetimePullups.toLocaleString();
}
