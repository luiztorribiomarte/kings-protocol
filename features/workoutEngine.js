// ============================================
// WORKOUT ENGINE — INTELLIGENCE LAYER
// SAFE: does NOT modify workout.js
// Reads workoutData only
// ============================================

window.WorkoutEngine = (function () {
  function loadWorkoutData() {
    try {
      return JSON.parse(localStorage.getItem("workoutData") || "{}");
    } catch {
      return {};
    }
  }

  function getAllSessions() {
    const data = loadWorkoutData();
    const sessions = [];

    Object.keys(data).forEach(exercise => {
      data[exercise].forEach(s => {
        sessions.push({
          exercise,
          date: s.date,
          weight: s.weight,
          reps: s.reps,
          sets: s.sets
        });
      });
    });

    return sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function getLastNDays(n) {
    const days = [];
    for (let i = 0; i < n; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  }

  // ======================
  // CORE METRICS
  // ======================

  function getWorkoutDays() {
    const sessions = getAllSessions();
    const days = new Set(sessions.map(s => s.date.split("T")[0]));
    return [...days];
  }

  function getWorkoutStreak() {
    const days = getWorkoutDays();
    let streak = 0;

    for (let d of getLastNDays(60)) {
      if (days.includes(d)) streak++;
      else break;
    }

    return streak;
  }

  function getWeeklyStats() {
    const sessions = getAllSessions();
    const last7 = getLastNDays(7);

    let totalSessions = 0;
    let totalVolume = 0;

    sessions.forEach(s => {
      const day = s.date.split("T")[0];
      if (last7.includes(day)) {
        totalSessions++;
        totalVolume += (s.weight || 0) * (s.reps || 0) * (s.sets || 0);
      }
    });

    return {
      sessions: totalSessions,
      volume: totalVolume
    };
  }

  function getExerciseProgress(exercise) {
    const data = loadWorkoutData();
    const sessions = data[exercise] || [];
    if (!sessions.length) return null;

    const first = sessions[0];
    const last = sessions[sessions.length - 1];

    return {
      startWeight: first.weight,
      currentWeight: last.weight,
      gain: last.weight - first.weight,
      sessions: sessions.length
    };
  }

  function getWorkoutSummary() {
    const sessions = getAllSessions();
    const exercises = Object.keys(loadWorkoutData());

    return {
      totalExercises: exercises.length,
      totalSessions: sessions.length,
      streak: getWorkoutStreak(),
      weekly: getWeeklyStats()
    };
  }

  // ======================
  // DEBUG (optional)
  // ======================

  function debug() {
    console.log("WorkoutEngine summary:", getWorkoutSummary());
  }

  return {
    loadWorkoutData,
    getWorkoutSummary,
    getWorkoutStreak,
    getWeeklyStats,
    getExerciseProgress,
    debug
  };
})();
