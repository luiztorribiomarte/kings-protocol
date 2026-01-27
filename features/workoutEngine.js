// ============================================
// WORKOUT ENGINE — ALIGNED WITH workout.js
// Reads Workouts.workouts[] structure
// Provides analytics, streaks, series, PRs
// ============================================

window.WorkoutEngine = (function () {
  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function loadWorkouts() {
    return safeParse(localStorage.getItem("kp_workouts") || "[]", []);
  }

  function toDayKey(date) {
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  }

  function getAllSessions() {
    const workouts = loadWorkouts();
    const sessions = [];

    workouts.forEach(w => {
      (w.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(s => {
          sessions.push({
            date: w.date,
            workoutId: w.id,
            exercise: ex.name,
            weight: Number(s.weight || 0),
            reps: Number(s.reps || 0)
          });
        });
      });
    });

    sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
    return sessions;
  }

  function calcVolume(s) {
    return s.weight * s.reps;
  }

  function estimate1RM(weight, reps) {
    if (!weight || !reps) return 0;
    return weight * (1 + reps / 30);
  }

  function getWorkoutDays() {
    const workouts = loadWorkouts();
    return [...new Set(workouts.map(w => toDayKey(w.date)))];
  }

  function getWorkoutStreak() {
    const days = new Set(getWorkoutDays());
    let streak = 0;

    for (let i = 0; i < 120; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = toDayKey(d);
      if (days.has(key)) streak++;
      else break;
    }

    return streak;
  }

  function getDailySeries(range = "7") {
    const sessions = getAllSessions();
    const today = new Date();

    let keys = [];
    if (range === "all") {
      keys = [...new Set(sessions.map(s => toDayKey(s.date)))];
    } else {
      const n = range === "30" ? 30 : 7;
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        keys.push(toDayKey(d));
      }
    }

    const map = {};
    keys.forEach(k => (map[k] = { sessions: 0, volume: 0 }));

    sessions.forEach(s => {
      const k = toDayKey(s.date);
      if (!map[k]) return;
      map[k].sessions++;
      map[k].volume += calcVolume(s);
    });

    return {
      labels: keys.map(k => {
        const d = new Date(k);
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      }),
      sessions: keys.map(k => map[k].sessions),
      volume: keys.map(k => map[k].volume)
    };
  }

  function getTodaySummary() {
    const today = toDayKey(new Date());
    const sessions = getAllSessions().filter(s => toDayKey(s.date) === today);

    const byExercise = {};
    let totalVolume = 0;

    sessions.forEach(s => {
      if (!byExercise[s.exercise]) byExercise[s.exercise] = [];
      byExercise[s.exercise].push(s);
      totalVolume += calcVolume(s);
    });

    return {
      sessions: sessions.length,
      exercises: Object.keys(byExercise),
      byExercise,
      totalVolume
    };
  }

  function computePRs() {
    const sessions = getAllSessions();
    const pr = {};

    sessions.forEach(s => {
      if (!pr[s.exercise]) pr[s.exercise] = { bestWeight: 0, bestVolume: 0, best1RM: 0 };

      const v = calcVolume(s);
      const one = estimate1RM(s.weight, s.reps);

      if (s.weight > pr[s.exercise].bestWeight) pr[s.exercise].bestWeight = s.weight;
      if (v > pr[s.exercise].bestVolume) pr[s.exercise].bestVolume = v;
      if (one > pr[s.exercise].best1RM) pr[s.exercise].best1RM = Math.round(one);
    });

    return pr;
  }

  function getWorkoutSummary() {
    const sessions = getAllSessions();
    return {
      totalSessions: sessions.length,
      streak: getWorkoutStreak(),
      weekly: {
        sessions: getDailySeries("7").sessions.reduce((a, b) => a + b, 0),
        volume: getDailySeries("7").volume.reduce((a, b) => a + b, 0)
      }
    };
  }

  return {
    loadWorkouts,
    getAllSessions,
    getWorkoutSummary,
    getWorkoutStreak,
    getDailySeries,
    getTodaySummary,
    computePRs
  };
})();
