// ============================================
// WORKOUT MODULE (STABLE + CATEGORY SAFE)
// ============================================

let workoutData = {};
let lifetimePushups = 0;
let lifetimePullups = 0;

const DEFAULT_CATEGORY = "Other";

// ---------------- INIT ----------------
function initWorkoutData() {
    const saved = localStorage.getItem("workoutData");

    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            workoutData = normalizeWorkoutData(parsed);
        } catch {
            workoutData = {};
        }
    }

    const savedPushups = localStorage.getItem("lifetimePushups");
    if (savedPushups) lifetimePushups = parseInt(savedPushups);

    const savedPullups = localStorage.getItem("lifetimePullups");
    if (savedPullups) lifetimePullups = parseInt(savedPullups);

    renderLifetimeCounters();
    renderExerciseCards();
}

// ---------------- NORMALIZE DATA ----------------
function normalizeWorkoutData(data) {
    const clean = {};

    Object.keys(data || {}).forEach(exercise => {
        const sessions = Array.isArray(data[exercise]) ? data[exercise] : [];

        const validSessions = sessions
            .filter(s => s && typeof s === "object" && s.weight)
            .map(s => ({
                date: s.date || new Date().toISOString(),
                weight: Number(s.weight),
                reps: Number(s.reps || 0),
                sets: Number(s.sets || 0),
                category: s.category || DEFAULT_CATEGORY
            }));

        if (validSessions.length) {
            clean[exercise] = validSessions;
        }
    });

    return clean;
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

    if (!Array.isArray(workoutData[exerciseName])) {
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

// ---------------- RENDER ----------------
function renderExerciseCards() {
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

    exercises.forEach(exercise => {
        const sessions = workoutData[exercise];
        if (!Array.isArray(sessions) || !sessions.length) return;

        const first = sessions[0];
        const latest = sessions[sessions.length - 1];
        const gain = latest.weight - first.weight;

        html += `
            <div class="exercise-card" onclick="showExerciseChart('${exercise}')">
                <div style="display:flex; justify-content:space-between;">
                    <h3 style="color:white;">${exercise}</h3>
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
                        <div style="color:${gain >= 0 ? "#10B981" : "#EF4444"};">
                            ${gain > 0 ? "+" : ""}${gain} lbs
                        </div>
                    </div>
                </div>
            </div>`;
    });

    container.innerHTML = html;
}

// ---------------- MODAL ----------------
function showExerciseChart(exercise) {
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modalBody");
    if (!modal || !modalBody) return;

    const sessions = workoutData[exercise];
    if (!sessions || !sessions.length) return;

    const first = sessions[0];
    const latest = sessions[sessions.length - 1];

    modalBody.innerHTML = `
        <h2 style="color:white;">${exercise}</h2>
        <p style="color:#9CA3AF;">Category: ${latest.category}</p>
        <p style="color:white;">${first.weight} → ${latest.weight} lbs</p>

        <button onclick="deleteExercise('${exercise}')"
            style="margin-top:20px;padding:10px;
            background:rgba(255,60,60,0.2);
            border:1px solid rgba(255,60,60,0.4);
            border-radius:8px;color:#ffb4b4;">
            Delete Exercise
        </button>
    `;

    modal.style.display = "flex";
}

// ---------------- DELETE ----------------
function deleteExercise(exercise) {
    if (!confirm(`Delete all data for ${exercise}?`)) return;
    delete workoutData[exercise];
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
