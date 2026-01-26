// ============================================
// WORKOUT ENGINE — INTELLIGENCE LAYER
// SAFE: does NOT modify workout.js
// Reads workoutData only (localStorage)
// Provides: streak, weekly stats, daily series, PR detection helpers
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

  function loadWorkoutData() {
    return safeParse(localStorage.getItem("workoutData") || "{}", {});
  }

  function toDayKey(isoOrDate) {
    try {
      const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
      return d.toISOString().split("T")[0];
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  }

  function getAllSessions() {
    const data = loadWorkoutData();
    const out = [];

    Object.keys(data).forEach(exercise => {
      const arr = Array.isArray(data[exercise]) ? data[exercise] : [];
      arr.forEach(s => {
        out.push({
          exercise,
          date: s.date,
          weight: Number(s.weight || 0),
          reps: Number(s.reps || 0),
          sets: Number(s.sets || 0)
        });
      });
    });

    out.sort((a, b) => new Date(a.date) - new Date(b.date));
    return out;
  }

  function getRangeKeys(range) {
    const sessions = getAllSessions();
    const today = new Date();

    if (range === "all") {
      const set = new Set(sessions.map(s => toDayKey(s.date)));
      const keys = [...set].sort((a, b) => new Date(a) - new Date(b));
      if (!keys.length) return getRangeKeys("7");
      return keys;
    }

    const n = range === "30" ? 30 : 7;
    const keys = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      keys.push(toDayKey(d));
    }
    return keys;
  }

  function calcVolume(s) {
    const w = Number(s.weight || 0);
    const r = Number(s.reps || 0);
    const sets = Number(s.sets || 0);
    return w * r * sets;
  }

  // Epley estimate (common + simple). Safe for reps>=1.
  function estimate1RM(weight, reps) {
    const w = Number(weight || 0);
    const r = Number(reps || 0);
    if (!w || r < 1) return 0;
    return w * (1 + r / 30);
  }

  // ======================
  // METRICS
  // ======================

  function getWorkoutDays() {
    const sessions = getAllSessions();
    const days = new Set(sessions.map(s => toDayKey(s.date)));
    return [...days];
  }

  function getWorkoutStreak(maxLookbackDays = 120) {
    const days = new Set(getWorkoutDays());
    let streak = 0;

    for (let i = 0; i < maxLookbackDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = toDayKey(d);

      if (days.has(key)) streak++;
      else break;
    }

    return streak;
  }

  function getDailySeries(range = "7") {
    const keys = getRangeKeys(range);
    const sessions = getAllSessions();

    const map = {};
    keys.forEach(k => (map[k] = { sessions: 0, volume: 0, exercises: new Set() }));

    sessions.forEach(s => {
      const k = toDayKey(s.date);
      if (!map[k]) return;
      map[k].sessions += 1;
      map[k].volume += calcVolume(s);
      map[k].exercises.add(s.exercise);
    });

    return {
      keys,
      labels: keys.map(k => {
        const d = new Date(k + "T00:00:00");
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      }),
      sessions: keys.map(k => map[k].sessions),
      volume: keys.map(k => map[k].volume),
      exercises: keys.map(k => map[k].exercises.size)
    };
  }

  function getWeeklyStats() {
    const series = getDailySeries("7");
    const totalSessions = series.sessions.reduce((a, b) => a + b, 0);
    const totalVolume = series.volume.reduce((a, b) => a + b, 0);
    const activeDays = series.sessions.filter(x => x > 0).length;

    return {
      sessions: totalSessions,
      volume: totalVolume,
      activeDays
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
      dateKey: today,
      sessions: sessions.length,
      exercises: Object.keys(byExercise).sort((a, b) => a.localeCompare(b)),
      byExercise,
      totalVolume
    };
  }

  function getExerciseSeries(exercise) {
    const data = loadWorkoutData();
    const sessions = Array.isArray(data[exercise]) ? data[exercise] : [];
    if (!sessions.length) return null;

    const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = sorted.map(s => {
      const d = new Date(s.date);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    });

    const weights = sorted.map(s => Number(s.weight || 0));
    const volumes = sorted.map(s => calcVolume(s));
    const est1rm = sorted.map(s => Math.round(estimate1RM(s.weight, s.reps)));

    return {
      labels,
      weights,
      volumes,
      est1rm,
      sessions: sorted
    };
  }

  function computePRs() {
    const data = loadWorkoutData();
    const pr = {};

    Object.keys(data).forEach(exercise => {
      const arr = Array.isArray(data[exercise]) ? data[exercise] : [];
      if (!arr.length) return;

      let bestWeight = 0;
      let bestVolume = 0;
      let best1RM = 0;

      arr.forEach(s => {
        const w = Number(s.weight || 0);
        const v = calcVolume(s);
        const one = estimate1RM(s.weight, s.reps);

        if (w > bestWeight) bestWeight = w;
        if (v > bestVolume) bestVolume = v;
        if (one > best1RM) best1RM = one;
      });

      pr[exercise] = {
        bestWeight,
        bestVolume,
        best1RM: Math.round(best1RM)
      };
    });

    return pr;
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

  function debug() {
    console.log("WorkoutEngine summary:", getWorkoutSummary());
  }

  return {
    loadWorkoutData,
    getAllSessions,
    getWorkoutSummary,
    getWorkoutStreak,
    getWeeklyStats,
    getDailySeries,
    getTodaySummary,
    getExerciseSeries,
    computePRs,
    debug
  };
})();
