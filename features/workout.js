(function () {
  "use strict";

  // -----------------------------
  // Storage keys (do not collide)
  // -----------------------------
  const STORAGE_KEY = "kp_workouts_v2";
  const UI_STATE_KEY = "kp_workouts_ui_v2";

  const MOUNT_ID = "kpWorkoutMount_v2";

  // Chart instances
  let weeklyChart = null;
  let exerciseChart = null;

  // -----------------------------
  // Helpers
  // -----------------------------
  function byId(id) {
    return document.getElementById(id);
  }

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function load(key, fallback) {
    return safeParse(localStorage.getItem(key), fallback);
  }

  function uuid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normText(v, fallback) {
    const s = String(v ?? "").trim();
    return s ? s : String(fallback ?? "").trim() || "";
  }

  function safeLower(v) {
    return String(v ?? "").toLowerCase();
  }

  function todayISO() {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }

  function dayKey(iso) {
    try {
      return String(iso || todayISO()).split("T")[0];
    } catch {
      return todayISO();
    }
  }

  function formatDay(isoDay) {
    try {
      const d = new Date(isoDay + "T00:00:00");
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return String(isoDay || "");
    }
  }

  function clampNum(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.min(max, Math.max(min, x));
  }

  // Epley estimate (simple, common)
  function estimate1RM(weight, reps) {
    const w = Number(weight || 0);
    const r = Number(reps || 0);
    if (!w || r < 1) return 0;
    return w * (1 + r / 30);
  }

  function calcSetVolume(set) {
    const w = Number(set?.weight || 0);
    const r = Number(set?.reps || 0);
    return w * r;
  }

  function calcWorkoutVolume(workout) {
    return (workout.exercises || []).reduce((sum, ex) => {
      const v = (ex.sets || []).reduce((s, set) => s + calcSetVolume(set), 0);
      return sum + v;
    }, 0);
  }

  function flattenAllSets(workouts) {
    const out = [];

    (workouts || []).forEach(w => {
      const workoutName = normText(w?.name, "Untitled");
      (w?.exercises || []).forEach(ex => {
        const exerciseName = normText(ex?.name, "Exercise");
        (ex?.sets || []).forEach(set => {
          const d = dayKey(set?.date);
          const weight = Number(set?.weight || 0);
          const reps = Number(set?.reps || 0);
          out.push({
            workoutId: w?.id,
            workoutName,
            exerciseId: ex?.id,
            exerciseName,
            date: d,
            weight,
            reps,
            volume: weight * reps,
            est1rm: estimate1RM(weight, reps)
          });
        });
      });
    });

    out.sort((a, b) => new Date(a.date) - new Date(b.date));
    return out;
  }

  // -----------------------------
  // Data model (CRASH-PROOF)
  // -----------------------------
  function normalizeWorkouts(list) {
    if (!Array.isArray(list)) return [];

    return list.map(w => {
      const workoutName = normText(w?.name, "Untitled");
      const workoutType = normText(w?.type, "");
      const workoutStatus = normText(w?.status, "planned") || "planned";

      const exercises = Array.isArray(w?.exercises) ? w.exercises : [];

      return {
        id: w?.id || uuid(),
        name: workoutName,
        type: workoutType,
        status: workoutStatus, // planned | current | completed
        createdAt: Number(w?.createdAt || Date.now()),
        updatedAt: Number(w?.updatedAt || Date.now()),
        exercises: exercises.map(ex => {
          const exName = normText(ex?.name, "Exercise");
          const sets = Array.isArray(ex?.sets) ? ex.sets : [];
          return {
            id: ex?.id || uuid(),
            name: exName,
            createdAt: Number(ex?.createdAt || Date.now()),
            updatedAt: Number(ex?.updatedAt || Date.now()),
            sets: sets
              .map(s => ({
                id: s?.id || uuid(),
                date: dayKey(s?.date || todayISO()),
                weight: Number(s?.weight || 0),
                reps: Number(s?.reps || 0),
                createdAt: Number(s?.createdAt || Date.now()),
                updatedAt: Number(s?.updatedAt || Date.now())
              }))
              // If any ancient bad set objects exist, filter them safely
              .filter(x => x && Number.isFinite(Number(x.weight)) && Number.isFinite(Number(x.reps)))
          };
        })
      };
    });
  }

  function loadWorkouts() {
    // IMPORTANT: always normalize so old data can’t crash render
    const raw = load(STORAGE_KEY, []);
    const normalized = normalizeWorkouts(raw);

    // If normalization repaired old data structure, persist it (safe, no wiping)
    // This prevents future crashes if the user refreshes.
    try {
      save(STORAGE_KEY, normalized);
    } catch {}

    return normalized;
  }

  function saveWorkouts(workouts) {
    save(STORAGE_KEY, workouts);
  }

  function loadUIState() {
    return load(UI_STATE_KEY, {
      exerciseChartExercise: "",
      exerciseChartMetric: "1rm", // 1rm | volume | weight

      // completed list UX (prevents infinite scroll)
      completedMonthsToShow: 3, // show newest 3 months at first
      completedExpanded: {} // { "YYYY-MM": true/false }
    });
  }

  function saveUIState(state) {
    save(UI_STATE_KEY, state);
  }

  // -----------------------------
  // Safe mount + navigation hook
  // -----------------------------
  function getWorkoutHost() {
    return byId("exerciseCards");
  }

  function ensureMount() {
    const host = getWorkoutHost();
    if (!host) return null;

    let mount = byId(MOUNT_ID);
    if (mount) return mount;

    mount = document.createElement("div");
    mount.id = MOUNT_ID;

    // SAFE: we prepend our UI; we do NOT delete other nodes
    host.prepend(mount);
    return mount;
  }

  function isWorkoutPageActive() {
    const page = byId("workoutPage");
    return !!(page && page.classList.contains("active"));
  }

  function hookShowPage() {
    if (typeof window.showPage !== "function") return;
    if (window.showPage.__kpWorkoutWrapped) return;

    const original = window.showPage;
    window.showPage = function (page) {
      const res = original.apply(this, arguments);
      if (page === "workout") {
        setTimeout(render, 50);
      }
      return res;
    };
    window.showPage.__kpWorkoutWrapped = true;
  }

  function hookNavClicks() {
    document.addEventListener("click", e => {
      const tab = e.target.closest?.(".nav-tab");
      if (!tab) return;
      setTimeout(() => {
        if (isWorkoutPageActive()) render();
      }, 80);
    });
  }

  // -----------------------------
  // Tiny toast (optional, no spam)
  // -----------------------------
  function ensureToastHost() {
    if (byId("kpWorkoutToastHost")) return;
    const host = document.createElement("div");
    host.id = "kpWorkoutToastHost";
    host.style.position = "fixed";
    host.style.right = "16px";
    host.style.bottom = "16px";
    host.style.zIndex = "99999";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.gap = "10px";
    document.body.appendChild(host);
  }

  function toast(msg) {
    ensureToastHost();
    const host = byId("kpWorkoutToastHost");
    if (!host) return;

    const el = document.createElement("div");
    el.style.border = "1px solid rgba(255,255,255,0.18)";
    el.style.background = "rgba(0,0,0,0.78)";
    el.style.backdropFilter = "blur(8px)";
    el.style.borderRadius = "14px";
    el.style.padding = "12px 12px";
    el.style.color = "white";
    el.style.fontWeight = "800";
    el.style.maxWidth = "320px";
    el.textContent = msg;

    host.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 240ms ease";
      setTimeout(() => el.remove(), 320);
    }, 1800);
  }

  // -----------------------------
  // Intelligence
  // -----------------------------
  function computePRs(workouts) {
    const pr = {}; // by exerciseNameLower -> { exerciseName, bestWeight, bestVolume, best1RM, date }

    const sets = flattenAllSets(workouts);
    sets.forEach(s => {
      const exName = normText(s?.exerciseName, "Exercise");
      const key = safeLower(exName);
      if (!key) return;

      if (!pr[key]) {
        pr[key] = {
          exerciseName: exName,
          bestWeight: Number(s.weight || 0),
          bestVolume: Number(s.volume || 0),
          best1RM: Math.round(s.est1rm || 0),
          date: s.date
        };
        return;
      }

      if (Number(s.weight || 0) > pr[key].bestWeight) {
        pr[key].bestWeight = Number(s.weight || 0);
        pr[key].date = s.date;
      }
      if (Number(s.volume || 0) > pr[key].bestVolume) {
        pr[key].bestVolume = Number(s.volume || 0);
        pr[key].date = s.date;
      }
      const one = Math.round(s.est1rm || 0);
      if (one > pr[key].best1RM) {
        pr[key].best1RM = one;
        pr[key].date = s.date;
      }
    });

    return Object.values(pr).sort((a, b) => b.best1RM - a.best1RM);
  }

  function computeWorkoutDays(workouts) {
    const days = new Set();
    flattenAllSets(workouts).forEach(s => days.add(s.date));
    return [...days].sort((a, b) => new Date(a) - new Date(b));
  }

  function computeStreak(workouts, maxLookback = 180) {
    const daySet = new Set(computeWorkoutDays(workouts));
    let streak = 0;

    for (let i = 0; i < maxLookback; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().split("T")[0];
      if (daySet.has(k)) streak++;
      else break;
    }
    return streak;
  }

  function computeDailySeries(workouts, range = "7") {
    const sets = flattenAllSets(workouts);
    const today = new Date();

    let keys = [];
    if (range === "all") {
      keys = [...new Set(sets.map(s => s.date))].sort((a, b) => new Date(a) - new Date(b));
      if (!keys.length) return computeDailySeries(workouts, "7");
    } else {
      const n = range === "30" ? 30 : 7;
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        keys.push(d.toISOString().split("T")[0]);
      }
    }

    const map = {};
    keys.forEach(k => (map[k] = { sets: 0, volume: 0 }));

    sets.forEach(s => {
      if (!map[s.date]) return;
      map[s.date].sets += 1;
      map[s.date].volume += Number(s.volume || 0);
    });

    return {
      keys,
      labels: keys.map(formatDay),
      sets: keys.map(k => map[k].sets),
      volume: keys.map(k => map[k].volume)
    };
  }

  function computeTodaySummary(workouts) {
    const t = todayISO();
    const sets = flattenAllSets(workouts).filter(s => s.date === t);

    const byExercise = {};
    let volume = 0;

    sets.forEach(s => {
      const name = normText(s.exerciseName, "Exercise");
      if (!byExercise[name]) byExercise[name] = [];
      byExercise[name].push(s);
      volume += Number(s.volume || 0);
    });

    const exercises = Object.keys(byExercise).sort((a, b) => a.localeCompare(b));
    return {
      date: t,
      totalSets: sets.length,
      exercises,
      byExercise,
      volume
    };
  }

  function getAllExerciseNames(workouts) {
    const set = new Set();
    (workouts || []).forEach(w => (w.exercises || []).forEach(ex => set.add(normText(ex?.name, "Exercise"))));
    return [...set].sort((a, b) => a.localeCompare(b));
  }

  function computeExerciseSeries(workouts, exerciseName) {
    const exTarget = normText(exerciseName, "");
    if (!exTarget) return null;

    const exLower = safeLower(exTarget);
    const sets = flattenAllSets(workouts).filter(s => safeLower(s.exerciseName) === exLower);
    if (!sets.length) return null;

    // Per day: take best 1RM and also total volume
    const byDay = {};
    sets.forEach(s => {
      if (!byDay[s.date]) byDay[s.date] = { day: s.date, best1rm: 0, bestWeight: 0, volume: 0 };
      byDay[s.date].best1rm = Math.max(byDay[s.date].best1rm, Number(s.est1rm || 0));
      byDay[s.date].bestWeight = Math.max(byDay[s.date].bestWeight, Number(s.weight || 0));
      byDay[s.date].volume += Number(s.volume || 0);
    });

    const days = Object.values(byDay).sort((a, b) => new Date(a.day) - new Date(b.day));
    return {
      labels: days.map(d => formatDay(d.day)),
      days,
      best1rm: days.map(d => Math.round(d.best1rm || 0)),
      bestWeight: days.map(d => Math.round(d.bestWeight || 0)),
      volume: days.map(d => Math.round(d.volume || 0))
    };
  }

  function monthKeyFromWorkout(workout) {
    // Prefer updatedAt/createdAt, fallback to latest set date
    const t = Number(workout?.updatedAt || workout?.createdAt || 0);
    if (t) {
      const d = new Date(t);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    }

    // fallback: latest set date
    const sets = [];
    (workout?.exercises || []).forEach(ex => (ex?.sets || []).forEach(s => sets.push(dayKey(s?.date))));
    sets.sort((a, b) => new Date(a) - new Date(b));
    const last = sets[sets.length - 1] || todayISO();
    return String(last).slice(0, 7);
  }

  function prettyMonth(ym) {
    try {
      const [y, m] = String(ym).split("-").map(Number);
      const d = new Date(y, (m || 1) - 1, 1);
      return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    } catch {
      return String(ym);
    }
  }

  // -----------------------------
  // Core actions (no popups)
  // -----------------------------
  function addWorkout(name, type, status) {
    const n = normText(name, "");
    if (!n) return;

    const workouts = loadWorkouts();
    workouts.push({
      id: uuid(),
      name: n,
      type: normText(type, ""),
      status: normText(status, "planned") || "planned",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      exercises: []
    });

    saveWorkouts(workouts);
    render();
  }

  function deleteWorkout(id) {
    const workouts = loadWorkouts().filter(w => w.id !== id);
    saveWorkouts(workouts);
    render();
  }

  function moveWorkout(id, status) {
    const workouts = loadWorkouts();
    const w = workouts.find(x => x.id === id);
    if (!w) return;
    w.status = normText(status, "planned") || "planned";
    w.updatedAt = Date.now();
    saveWorkouts(workouts);
    render();
  }

  function addExercise(workoutId, exerciseName) {
    const name = normText(exerciseName, "");
    if (!name) return;

    const workouts = loadWorkouts();
    const w = workouts.find(x => x.id === workoutId);
    if (!w) return;

    w.exercises.push({
      id: uuid(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sets: []
    });

    w.updatedAt = Date.now();
    saveWorkouts(workouts);
    render();
  }

  function deleteExercise(workoutId, exerciseId) {
    const workouts = loadWorkouts();
    const w = workouts.find(x => x.id === workoutId);
    if (!w) return;

    w.exercises = (w.exercises || []).filter(ex => ex.id !== exerciseId);
    w.updatedAt = Date.now();
    saveWorkouts(workouts);
    render();
  }

  function renameExercise(workoutId, exerciseId, newName) {
    const name = normText(newName, "");
    if (!name) return;

    const workouts = loadWorkouts();
    const w = workouts.find(x => x.id === workoutId);
    if (!w) return;

    const ex = (w.exercises || []).find(e => e.id === exerciseId);
    if (!ex) return;

    ex.name = name;
    ex.updatedAt = Date.now();
    w.updatedAt = Date.now();
    saveWorkouts(workouts);
    render();
  }

  function addSet(workoutId, exerciseId, weight, reps, dateISO) {
    const wNum = clampNum(weight, 0, 5000);
    const rNum = clampNum(reps, 0, 200);
    if (!wNum || !rNum) return;

    const workouts = loadWorkouts();
    const w = workouts.find(x => x.id === workoutId);
    if (!w) return;

    const ex = (w.exercises || []).find(e => e.id === exerciseId);
    if (!ex) return;

    const beforePRs = computePRs(workouts);

    ex.sets.push({
      id: uuid(),
      date: dayKey(dateISO || todayISO()),
      weight: wNum,
      reps: rNum,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    ex.updatedAt = Date.now();
    w.updatedAt = Date.now();
    saveWorkouts(workouts);

    const afterWorkouts = loadWorkouts();
    const afterPRs = computePRs(afterWorkouts);

    const exLower = safeLower(ex.name);
    const before = beforePRs.find(p => safeLower(p.exerciseName) === exLower);
    const after = afterPRs.find(p => safeLower(p.exerciseName) === exLower);

    if (
      after &&
      (!before ||
        after.best1RM > before.best1RM ||
        after.bestWeight > before.bestWeight ||
        after.bestVolume > before.bestVolume)
    ) {
      toast("new PR logged");
    }

    render();
  }

  function deleteSet(workoutId, exerciseId, setId) {
    const workouts = loadWorkouts();
    const w = workouts.find(x => x.id === workoutId);
    if (!w) return;

    const ex = (w.exercises || []).find(e => e.id === exerciseId);
    if (!ex) return;

    ex.sets = (ex.sets || []).filter(s => s.id !== setId);
    ex.updatedAt = Date.now();
    w.updatedAt = Date.now();
    saveWorkouts(workouts);
    render();
  }

  function editSet(workoutId, exerciseId, setId, weight, reps, dateISO) {
    const wNum = clampNum(weight, 0, 5000);
    const rNum = clampNum(reps, 0, 200);
    if (!wNum || !rNum) return;

    const workouts = loadWorkouts();
    const w = workouts.find(x => x.id === workoutId);
    if (!w) return;

    const ex = (w.exercises || []).find(e => e.id === exerciseId);
    if (!ex) return;

    const set = (ex.sets || []).find(s => s.id === setId);
    if (!set) return;

    set.weight = wNum;
    set.reps = rNum;
    set.date = dayKey(dateISO || set.date || todayISO());
    set.updatedAt = Date.now();

    ex.updatedAt = Date.now();
    w.updatedAt = Date.now();
    saveWorkouts(workouts);
    render();
  }

  // -----------------------------
  // Modal helpers (uses your app modal if present)
  // -----------------------------
  function openModalSafe(html) {
    if (typeof window.openModal === "function") {
      window.openModal(html);
      return;
    }

    const modal = byId("modal");
    const body = byId("modalBody");
    if (!modal || !body) return;
    body.innerHTML = html;
    modal.style.display = "flex";
  }

  function closeModalSafe() {
    if (typeof window.closeModal === "function") {
      window.closeModal();
      return;
    }
    const modal = byId("modal");
    if (modal) modal.style.display = "none";
  }

  // -----------------------------
  // UI
  // -----------------------------
  function render() {
    const mount = ensureMount();
    if (!mount) return;

    const workouts = loadWorkouts();

    const current = workouts.filter(w => w.status === "current").sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const planned = workouts.filter(w => w.status === "planned").s
