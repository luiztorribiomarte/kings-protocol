// ============================================
// WORKOUT MODULE
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

    if (!workoutData[name]) {
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
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return d >= startOfWeek;
}

/* ---------- WEEKLY SUMMARY ---------- */
function buildWeeklySummary() {
    let workouts = 0;
    let totalSets = 0;
    let totalReps = 0;

    Object.values(workoutData).forEach(sessions => {
        sessions.forEach(s => {
            if (isThisWeek(s.date)) {
                workouts += 1;
                totalSets += s.sets;
                totalReps += s.reps * s.sets;
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

    const exercises = Object.keys(workoutData);

    // Empty state (true empty only)
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
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3 style="margin:0; color:white;">${name}</h3>
                    <span style="color:#9CA3AF; font-size:0.85em;">
                        ${sessions.length} session${sessions.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px;">
                    <div>
                        <div style="color:#9CA3AF; font-size:0.8em;">Current</div>
                        <div style="font-weight:700;">${latest.weight} lbs</div>
                    </div>
                    <div>
                        <div style="color:#9CA3AF; font-size:0.8em;">Started</div>
                        <div style="font-weight:700;">${first.weight} lbs</div>
                    </div>
                    <div>
                        <div style="color:#9CA3AF; font-size:0.8em;">Gain</div>
                        <div style="font-weight:700; color:${gain >= 0 ? '#10B981' : '#EF4444'};">
                            ${gain > 0 ? '+' : ''}${gain} lbs
                        </div>
                    </div>
                </div>

                <div style="margin-top:8px; font-size:0.8em; color:#9CA3AF;">
                    Latest: ${latest.sets} × ${latest.reps}
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
    const latest = sessions[sessions.length - 1];
    const first = sessions[0];
    const gain = latest.weight - first.weight;

    body.innerHTML = `
        <h2 style="margin-bottom:16px;">${name}</h2>

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

/* ---------- LIFETIME (FUTURE) ---------- */
function renderLifetimeCounters() {
    const p = document.getElementById('lifetimePushups');
    const l = document.getElementById('lifetimePullups');
    if (p) p.textContent = lifetimePushups;
    if (l) l.textContent = lifetimePullups;
}
