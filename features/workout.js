// ============================================
// WORKOUT MODULE (SAFE VERSION)
// ============================================

let workoutData = {};
let lifetimePushups = 0;
let lifetimePullups = 0;

/* ---------- INIT ---------- */
function initWorkoutData() {
    const saved = localStorage.getItem('workoutData');
    if (saved) {
        try {
            workoutData = JSON.parse(saved) || {};
        } catch {
            workoutData = {};
        }
    }

    renderExerciseCards();
    renderLifetimeCounters();
}

/* ---------- SAVE ---------- */
function saveWorkoutData() {
    localStorage.setItem('workoutData', JSON.stringify(workoutData));
}

/* ---------- LOG WORKOUT ---------- */
function logWorkout() {
    const name = document.getElementById('exerciseName').value.trim();
    const weight = parseInt(document.getElementById('exerciseWeight').value);
    const sets = parseInt(document.getElementById('exerciseSets').value);
    const reps = parseInt(document.getElementById('exerciseReps').value);

    if (!name || !weight || !sets || !reps) {
        alert('Please fill in all fields');
        return;
    }

    if (!Array.isArray(workoutData[name])) {
        workoutData[name] = [];
    }

    workoutData[name].push({
        date: new Date().toISOString(),
        weight,
        sets,
        reps
    });

    saveWorkoutData();

    document.getElementById('exerciseName').value = '';
    document.getElementById('exerciseWeight').value = '';
    document.getElementById('exerciseSets').value = '';
    document.getElementById('exerciseReps').value = '';

    renderExerciseCards();
}

/* ---------- HELPERS ---------- */
function isThisWeek(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return d >= start;
}

/* ---------- WEEKLY SUMMARY ---------- */
function buildWeeklySummary() {
    let workouts = 0;
    let totalSets = 0;
    let totalReps = 0;

    Object.values(workoutData).forEach(sessions => {
        if (!Array.isArray(sessions)) return;

        sessions.forEach(s => {
            if (isThisWeek(s.date)) {
                workouts++;
                totalSets += s.sets;
                totalReps += s.sets * s.reps;
            }
        });
    });

    return `
        <div class="stats-grid" style="margin-bottom:18px;">
            <div class="stat-card">
                <div class="stat-value">${workouts}</div>
                <div class="stat-label">Workouts This Week</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalSets}</div>
                <div class="stat-label">Total Sets</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalReps}</div>
                <div class="stat-label">Total Reps</div>
            </div>
        </div>
    `;
}

/* ---------- RENDER ---------- */
function renderExerciseCards() {
    const container = document.getElementById('exerciseCards');
    if (!container) return;

    const exercises = Object.keys(workoutData).filter(
        key => Array.isArray(workoutData[key])
    );

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

    let html = buildWeeklySummary();

    exercises.forEach(name => {
        const sessions = workoutData[name];
        const latest = sessions[sessions.length - 1];
        const first = sessions[0];
        const gain = latest.weight - first.weight;

        html += `
            <div class="exercise-card" onclick="showExerciseChart('${name}')">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <h3 style="margin:0;">${name}</h3>
                    <span style="color:#9CA3AF; font-size:0.85em;">
                        ${sessions.length} session${sessions.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px;">
                    <div>
                        <div class="stat-label">Current</div>
                        <div class="stat-value">${latest.weight} lbs</div>
                    </div>
                    <div>
                        <div class="stat-label">Started</div>
                        <div class="stat-value">${first.weight} lbs</div>
                    </div>
                    <div>
                        <div class="stat-label">Gain</div>
                        <div class="stat-value" style="color:${gain >= 0 ? '#10B981' : '#EF4444'};">
                            ${gain > 0 ? '+' : ''}${gain} lbs
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/* ---------- MODAL ---------- */
function showExerciseChart(name) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;

    const sessions = workoutData[name];
    if (!Array.isArray(sessions)) return;

    const latest = sessions[sessions.length - 1];
    const first = sessions[0];
    const gain = latest.weight - first.weight;

    body.innerHTML = `
        <h2>${name}</h2>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Current</div>
                <div class="stat-value">${latest.weight} lbs</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Gain</div>
                <div class="stat-value" style="color:${gain >= 0 ? '#10B981' : '#EF4444'};">
                    ${gain > 0 ? '+' : ''}${gain} lbs
                </div>
            </div>
        </div>

        <div style="display:flex; gap:10px; margin-top:18px;">
            <button onclick="deleteExercise('${name}')" style="flex:1;">Delete</button>
            <button onclick="closeModal()" style="flex:1;">Close</button>
        </div>
    `;

    modal.style.display = 'flex';
}

/* ---------- DELETE ---------- */
function deleteExercise(name) {
    if (!confirm(`Delete all data for ${name}?`)) return;
    delete workoutData[name];
    saveWorkoutData();
    renderExerciseCards();
    closeModal();
}

/* ---------- LIFETIME ---------- */
function renderLifetimeCounters() {
    const p = document.getElementById('lifetimePushups');
    const l = document.getElementById('lifetimePullups');
    if (p) p.textContent = lifetimePushups;
    if (l) l.textContent = lifetimePullups;
}
