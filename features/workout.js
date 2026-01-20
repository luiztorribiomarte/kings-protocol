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
    if (savedPushups) lifetimePushups = parseInt(savedPushups);

    const savedPullups = localStorage.getItem('lifetimePullups');
    if (savedPullups) lifetimePullups = parseInt(savedPullups);

    injectWorkoutCategorySelect();
    renderLifetimeCounters();
    renderExerciseCards();
}

// Inject category dropdown
function injectWorkoutCategorySelect() {
    const nameInput = document.getElementById('exerciseName');
    if (!nameInput || document.getElementById('exerciseCategory')) return;

    const select = document.createElement('select');
    select.id = 'exerciseCategory';
    select.className = 'form-input';
    select.style.marginRight = '10px';

    select.innerHTML = `
        <option value="Push">Push</option>
        <option value="Pull">Pull</option>
        <option value="Legs">Legs</option>
        <option value="Cardio">Cardio</option>
        <option value="Custom">Custom</option>
    `;

    nameInput.parentNode.insertBefore(select, nameInput);
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
    const category = document.getElementById('exerciseCategory')?.value || 'Custom';

    if (!exerciseName || !weight || !reps || !sets) {
        alert('Please fill in all fields');
        return;
    }

    if (!workoutData[exerciseName]) {
        workoutData[exerciseName] = {
            category,
            sessions: []
        };
    }

    workoutData[exerciseName].category = category;

    workoutData[exerciseName].sessions.push({
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

// Render exercise cards
function renderExerciseCards() {
    const container = document.getElementById('exerciseCards');
    if (!container) return;

    const exercises = Object.keys(workoutData);

    // CLEAN empty state (no big box)
    if (exercises.length === 0) {
        container.innerHTML = `
            <div style="
                text-align:center;
                color:#6B7280;
                padding:30px 0;
                font-size:0.95em;
            ">
                No exercises logged yet. Start tracking your workouts above.
            </div>
        `;
        return;
    }

    let html = '';

    exercises.forEach(exerciseName => {
        const data = workoutData[exerciseName];
        const sessions = data.sessions;
        const latest = sessions[sessions.length - 1];
        const first = sessions[0];
        const weightGain = latest.weight - first.weight;

        html += `
            <div class="exercise-card" onclick="showExerciseChart('${exerciseName}')">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="color:white; margin:0;">${exerciseName}</h3>
                    <span style="color:#9CA3AF; font-size:0.85em;">
                        ${data.category} • ${sessions.length} sessions
                    </span>
                </div>

                <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:12px;">
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

                <div style="margin-top:8px; color:#6B7280; font-size:0.85em;">
                    Latest: ${latest.sets} × ${latest.reps}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Show exercise chart (unchanged)
function showExerciseChart(exerciseName) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;

    const data = workoutData[exerciseName];

    modalBody.innerHTML = `
        <h2 style="color:white;">${exerciseName}</h2>
        <div style="color:#9CA3AF; margin-bottom:20px;">
            Category: ${data.category}
        </div>

        <button onclick="deleteExercise('${exerciseName}')"
            style="width:100%; padding:10px;
            background:rgba(255,60,60,0.2);
            border:1px solid rgba(255,60,60,0.3);
            border-radius:8px;
            color:#ffb4b4;
            cursor:pointer;">
            Delete Exercise
        </button>
    `;

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

// Render lifetime counters
function renderLifetimeCounters() {
    const pushupsEl = document.getElementById('lifetimePushups');
    const pullupsEl = document.getElementById('lifetimePullups');

    if (pushupsEl) pushupsEl.textContent = lifetimePushups.toLocaleString();
    if (pullupsEl) pullupsEl.textContent = lifetimePullups.toLocaleString();
}

// Boot
initWorkoutData();
