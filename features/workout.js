// ============================================
// WORKOUT MODULE (with categories)
// ============================================

let workoutData = {};
let lifetimePushups = 0;
let lifetimePullups = 0;

const DEFAULT_CATEGORY = "Other";
const WORKOUT_CATEGORIES = ["Push", "Pull", "Legs", "Cardio", "Other"];

// ---------------- INIT ----------------
function initWorkoutData() {
    const saved = localStorage.getItem("workoutData");
    if (saved) {
        workoutData = JSON.parse(saved);
    }

    // Backward compatibility: ensure category exists
    Object.keys(workoutData).forEach(exercise => {
        workoutData[exercise] = workoutData[exercise].map(entry => ({
            category: entry.category || DEFAULT_CATEGORY,
            ...entry
        }));
    });

    const savedPushups = localStorage.getItem("lifetimePushups");
    if (savedPushups) lifetimePushups = parseInt(savedPushups);

    const savedPullups = localStorage.getItem("lifetimePullups");
    if (savedPullups) lifetimePullups = parseInt(savedPullups);

    renderLifetimeCounters();
    renderExerciseCards();
}

// ---------------- SAVE ----------------
function saveWorkoutData() {
    localStorage.setItem("workoutData", JSON.stringify(workoutData));
}

// ---------------- LOG WORKOUT ----------------
function logWorkout() {
    const exerciseName = document.getElementById("exerciseName").value.trim();
    const weight = parseInt(document.getElementById("exerciseWeight").value);
    const reps = parseInt(document.getElementById("exerciseReps").value);
    const sets = parseInt(document.getElementById("exerciseSets").value);

    if (!exerciseName || !weight || !reps || !sets) {
        alert("Please fill in all fields");
        return;
    }

    if (!workoutData[exerciseName]) {
        workoutData[exerciseName] = [];
    }

    workoutData[exerciseName].push({
        date: new Date().toISOString(),
        weight,
        reps,
        sets,
        category: DEFAULT_CATEGORY
    });

    saveWorkoutData();

    document.getElementById("exerciseName").value = "";
    document.getElementById("exerciseWeight").value = "";
    document.getElementById("exerciseReps").value = "";
    document.getElementById("exerciseSets").value = "";

    renderExerciseCards();
}

// ---------------- RENDER EXERCISES ----------------
function renderExerciseCards(filterCategory = "All") {
    const container = document.getElementById("exerciseCards");
    if (!container) return;

    const exercises = Object.keys(workoutData);

    if (!exercises.length) {
        container.innerHTML = `
            <div style="text-align:center; color:#6B7280; padding:40px;">
                No exercises logged yet. Start tracking your workouts above!
            </div>`;
        return;
    }

    let html = "";

    exercises.forEach(exerciseName => {
        const sessions = workoutData[exerciseName];
        const latest = sessions[sessions.length - 1];
        const first = sessions[0];

        if (filterCategory !== "All" && latest.category !== filterCategory) return;

        const weightGain = latest.weight - first.weight;

        html += `
            <div class="exercise-card" onclick="showExerciseChart('${exerciseName}')">
                <div style="display:flex; justify-content:space-between;">
                    <h3 style="color:white;">${exerciseName}</h3>
                    <span style="color:#9CA3AF;">${latest.category}</span>
                </div>

                <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px;">
                    <div>
                        <div style="color:#9CA3AF;">Current</div>
                        <div style="color:white;font-weight:700;">${latest.weight} lbs</div>
                    </div>
                    <div>
                        <div style="color:#9CA3AF;">Started</div>
                        <div style="color:white;font-weight:700;">${first.weight} lbs</div>
                    </div>
                    <div>
                        <div style="color:#9CA3AF;">Gain</div>
                        <div style="color:${weightGain >= 0 ? "#10B981" : "#EF4444"};">
                            ${weightGain > 0 ? "+" : ""}${weightGain} lbs
                        </div>
                    </div>
                </div>

                <div style="margin-top:8px; color:#6B7280;">
                    ${latest.sets} × ${latest.reps} reps
                </div>
            </div>`;
    });

    container.innerHTML = html || `
        <div style="text-align:center; color:#6B7280; padding:40px;">
            No workouts in this category yet.
        </div>`;
}

// ---------------- MODAL ----------------
function showExerciseChart(exerciseName) {
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modalBody");
    if (!modal || !modalBody) return;

    const sessions = workoutData[exerciseName];
    const latest = sessions[sessions.length - 1];
    const first = sessions[0];
    const weightGain = latest.weight - first.weight;

    modalBody.innerHTML = `
        <h2 style="color:white;">${exerciseName}</h2>
        <p style="color:#9CA3AF;">Category: ${latest.category}</p>

        <div style="margin:20px 0;">
            <strong style="color:white;">Progress:</strong>
            ${first.weight} → ${latest.weight} lbs
        </div>

        <button onclick="deleteExercise('${exerciseName}')"
            style="background:rgba(255,60,60,0.2);border:1px solid rgba(255,60,60,0.4);
            padding:10px;border-radius:8px;color:#ffb4b4;cursor:pointer;">
            Delete Exercise
        </button>
    `;

    modal.style.display = "flex";
}

// ---------------- DELETE ----------------
function deleteExercise(exerciseName) {
    if (!confirm(`Delete all data for ${exerciseName}?`)) return;
    delete workoutData[exerciseName];
    saveWorkoutData();
    renderExerciseCards();
    closeModal();
}

// ---------------- COUNTERS ----------------
function renderLifetimeCounters() {
    const p = document.getElementById("lifetimePushups");
    const pu = document.getElementById("lifetimePullups");
    if (p) p.textContent = lifetimePushups.toLocaleString();
    if (pu) pu.textContent = lifetimePullups.toLocaleString();
}

// ---------------- BOOT ----------------
initWorkoutData();
