// =====================================================
// KINGS PROTOCOL — WORKOUT SYSTEM (SINGLE FILE, ELITE)
// File: features/workout.js
// - Books-style layout (Currently Training / Planned / Completed)
// - Workouts -> Exercises -> Sets (individual sets with custom weight/reps)
// - Edit/Delete sets (NO confirm popups)
// - Move workouts across sections
// - PRs, streak, weekly stats
// - Charts: weekly momentum (7/30/all) + exercise progress
// - Safe mount: does not wipe other page features
// =====================================================

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

  function qs(sel) {
    return document.querySelector(sel);
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
      return isoDay;
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
    const w = Number(set.weight || 0);
    const r = Number(set.reps || 0);
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
      (w.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(set => {
          out.push({
            workoutId: w.id,
            workoutName: w.name,
            exerciseId: ex.id,
            exerciseName: ex.name,
            date: dayKey(set.date),
            weight: Number(set.weight || 0),
            reps: Number(set.reps || 0),
            volume: calcSetVolume(set),
            est1rm: estimate1RM(set.weight, set.reps)
          });
        });
      });
    });

    out.sort((a, b) => new Date(a.date) - new Date(b.date));
    return out;
  }

  // -----------------------------
  // Data model
  // -----------------------------
  function normalizeWorkouts(list) {
    if (!Array.isArray(list)) return [];

    return list.map(w => ({
      id: w.id || uuid(),
      name: String(w.name || "Untitled").trim(),
      type: String(w.type || "").trim(),
      status: w.status || "planned", // planned | current | completed
      createdAt: Number(w.createdAt || Date.now()),
      updatedAt: Number(w.updatedAt || Date.now()),
      exercises: Array.isArray(w.exercises)
        ? w.exercises.map(ex => ({
            id: ex.id || uuid(),
            name: String(ex.name || "Exercise").trim(),
            createdAt: Number(ex.createdAt || Date.now()),
            updatedAt: Number(ex.updatedAt || Date.now()),
            sets: Array.isArray(ex.sets)
              ? ex.sets.map(s => ({
                  id: s.id || uuid(),
                  date: dayKey(s.date || todayISO()),
                  weight: Number(s.weight || 0),
                  reps: Number(s.reps || 0),
                  createdAt: Number(s.createdAt || Date.now()),
                  updatedAt: Number(s.updatedAt || Date.now())
                }))
              : []
          }))
        : []
    }));
  }

  function loadWorkouts() {
    return normalizeWorkouts(load(STORAGE_KEY, []));
  }

  function saveWorkouts(workouts) {
    save(STORAGE_KEY, workouts);
  }

  function loadUIState() {
    return load(UI_STATE_KEY, {
      exerciseChartExercise: "",
      exerciseChartMetric: "1rm" // 1rm | volume | weight
    });
  }

  function saveUIState(state) {
    save(UI_STATE_KEY, state);
  }

  // -----------------------------
  // Safe mount + navigation hook
  // -----------------------------
  function getWorkoutHost() {
    // Your workout page already uses this container in other builds
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
      const key = String(s.exerciseName || "").toLowerCase();
      if (!key) return;

      if (!pr[key]) {
        pr[key] = {
          exerciseName: s.exerciseName,
          bestWeight: s.weight,
          bestVolume: s.volume,
          best1RM: Math.round(s.est1rm || 0),
          date: s.date
        };
        return;
      }

      if (s.weight > pr[key].bestWeight) {
        pr[key].bestWeight = s.weight;
        pr[key].date = s.date;
      }
      if (s.volume > pr[key].bestVolume) {
        pr[key].bestVolume = s.volume;
        pr[key].date = s.date;
      }
      if (Math.round(s.est1rm || 0) > pr[key].best1RM) {
        pr[key].best1RM = Math.round(s.est1rm || 0);
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
      map[s.date].volume += s.volume;
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
      const name = s.exerciseName;
      if (!byExercise[name]) byExercise[name] = [];
      byExercise[name].push(s);
      volume += s.volume;
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
    (workouts || []).forEach(w => (w.exercises || []).forEach(ex => set.add(ex.name)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }

  function computeExerciseSeries(workouts, exerciseName) {
    if (!exerciseName) return null;
    const exLower = String(exerciseName).toLowerCase();
    const sets = flattenAllSets(workouts).filter(s => String(s.exerciseName).toLowerCase() === exLower);

    if (!sets.length) return null;

    // Per day: take best 1RM and also total volume
    const byDay = {};
    sets.forEach(s => {
      if (!byDay[s.date]) byDay[s.date] = { day: s.date, best1rm: 0, bestWeight: 0, volume: 0 };
      byDay[s.date].best1rm = Math.max(byDay[s.date].best1rm, s.est1rm || 0);
      byDay[s.date].bestWeight = Math.max(byDay[s.date].bestWeight, s.weight || 0);
      byDay[s.date].volume += s.volume || 0;
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

  // -----------------------------
  // Core actions (no popups)
  // -----------------------------
  function addWorkout(name, type, status) {
    const n = String(name || "").trim();
    if (!n) return;

    const workouts = loadWorkouts();
    workouts.push({
      id: uuid(),
      name: n,
      type: String(type || "").trim(),
      status: status || "planned",
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
    w.status = status;
    w.updatedAt = Date.now();
    saveWorkouts(workouts);
    render();
  }

  function addExercise(workoutId, exerciseName) {
    const name = String(exerciseName || "").trim();
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
    const name = String(newName || "").trim();
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

    const exLower = String(ex.name).toLowerCase();
    const before = beforePRs.find(p => String(p.exerciseName).toLowerCase() === exLower);
    const after = afterPRs.find(p => String(p.exerciseName).toLowerCase() === exLower);

    if (after && (!before || after.best1RM > before.best1RM || after.bestWeight > before.bestWeight || after.bestVolume > before.bestVolume)) {
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

    // fallback: minimal modal behavior if your modal system is missing
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

    const current = workouts.filter(w => w.status === "current").sort((a, b) => b.updatedAt - a.updatedAt);
    const planned = workouts.filter(w => w.status === "planned").sort((a, b) => b.updatedAt - a.updatedAt);
    const completed = workouts.filter(w => w.status === "completed").sort((a, b) => b.updatedAt - a.updatedAt);

    const streak = computeStreak(workouts);
    const series7 = computeDailySeries(workouts, "7");
    const weeklySets = series7.sets.reduce((a, b) => a + b, 0);
    const weeklyVolume = series7.volume.reduce((a, b) => a + b, 0);

    const today = computeTodaySummary(workouts);
    const prs = computePRs(workouts).slice(0, 8);

    const ui = loadUIState();
    const allExercises = getAllExerciseNames(workouts);

    // pick a default exercise for chart
    if (!ui.exerciseChartExercise && allExercises.length) {
      ui.exerciseChartExercise = allExercises[0];
      saveUIState(ui);
    }

    mount.innerHTML = `
      <div class="habit-section" style="padding:18px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div class="section-title" style="margin:0;">Workouts</div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="form-submit" id="kpAddWorkoutBtn">Add workout</button>
            <button class="form-submit" id="kpOpenWeeklyGraphBtn" style="background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.18);">View graph</button>
          </div>
        </div>

        <div style="margin-top:10px; display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px;">
          <div style="border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); border-radius:14px; padding:12px;">
            <div style="color:#9ca3af; font-size:0.85rem; font-weight:800;">Streak</div>
            <div style="font-size:1.8rem; font-weight:900; margin-top:6px;">${streak}</div>
            <div style="color:#9ca3af; font-size:0.85rem; margin-top:4px;">days in a row</div>
          </div>

          <div style="border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); border-radius:14px; padding:12px;">
            <div style="color:#9ca3af; font-size:0.85rem; font-weight:800;">Last 7 days</div>
            <div style="font-size:1.8rem; font-weight:900; margin-top:6px;">${weeklySets}</div>
            <div style="color:#9ca3af; font-size:0.85rem; margin-top:4px;">sets logged</div>
          </div>

          <div style="border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); border-radius:14px; padding:12px;">
            <div style="color:#9ca3af; font-size:0.85rem; font-weight:800;">Last 7 days</div>
            <div style="font-size:1.8rem; font-weight:900; margin-top:6px;">${Number(weeklyVolume || 0).toLocaleString()}</div>
            <div style="color:#9ca3af; font-size:0.85rem; margin-top:4px;">total volume</div>
          </div>
        </div>

        <div style="margin-top:12px; border-top:1px solid rgba(255,255,255,0.10); padding-top:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px;">
            <div style="color:white; font-weight:900;">Today</div>
            <div style="color:#9ca3af; font-size:0.9rem;">
              ${today.totalSets} sets • ${today.exercises.length} exercises • ${Number(today.volume || 0).toLocaleString()} volume
            </div>
          </div>

          <div>
            ${
              !today.exercises.length
                ? `<div style="color:#9ca3af;">No sets logged today.</div>`
                : today.exercises.map(exName => {
                    const arr = today.byExercise[exName] || [];
                    const latest = arr[arr.length - 1];
                    const vol = arr.reduce((a, s) => a + (Number(s.volume || 0)), 0);
                    return `
                      <div style="border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.03); border-radius:12px; padding:10px 12px; display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:8px;">
                        <div>
                          <div style="color:white; font-weight:900;">${escapeHtml(exName)}</div>
                          <div style="color:#9ca3af; font-size:0.85rem; margin-top:2px;">
                            latest: ${Number(latest.weight || 0)} lbs × ${Number(latest.reps || 0)} • ${formatDay(latest.date)}
                          </div>
                        </div>
                        <div style="color:#e5e7eb; font-weight:900;">${Number(vol || 0).toLocaleString()}</div>
                      </div>
                    `;
                  }).join("")
            }
          </div>
        </div>
      </div>

      <div class="habit-section" style="padding:18px; margin-bottom:18px;">
        <div class="section-title" style="margin:0;">Currently training</div>
        <div style="margin-top:10px;">
          ${current.length ? current.map(renderWorkoutCard).join("") : `<div style="color:#9ca3af;">No active workouts.</div>`}
        </div>
      </div>

      <div class="habit-section" style="padding:18px; margin-bottom:18px;">
        <div class="section-title" style="margin:0;">Planned workouts</div>
        <div style="margin-top:10px;">
          ${planned.length ? planned.map(renderWorkoutCard).join("") : `<div style="color:#9ca3af;">No planned workouts.</div>`}
        </div>
      </div>

      <div class="habit-section" style="padding:18px; margin-bottom:18px;">
        <div class="section-title" style="margin:0;">Workouts completed</div>
        <div style="margin-top:10px;">
          ${completed.length ? completed.map(renderWorkoutCard).join("") : `<div style="color:#9ca3af;">No completed workouts.</div>`}
        </div>
      </div>

      <div class="habit-section" style="padding:18px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div class="section-title" style="margin:0;">Personal records</div>
          <div style="color:#9ca3af; font-size:0.9rem;">best 1RM, weight, and volume</div>
        </div>

        <div style="margin-top:10px;">
          ${
            prs.length
              ? prs.map(p => `
                <div class="idea-item" style="margin-top:8px;">
                  <div style="font-weight:900;">${escapeHtml(p.exerciseName)}</div>
                  <div style="color:#9ca3af; margin-top:4px; font-size:0.9rem;">
                    best 1RM: ${p.best1RM} • best weight: ${p.bestWeight} • best volume: ${Number(p.bestVolume || 0).toLocaleString()} • ${formatDay(p.date)}
                  </div>
                </div>
              `).join("")
              : `<div style="color:#9ca3af;">No PRs yet.</div>`
          }
        </div>
      </div>

      <div class="habit-section" style="padding:18px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div class="section-title" style="margin:0;">Strength progress</div>

          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <select id="kpExerciseChartSelect" class="form-input" style="width:auto; min-width:220px;">
              ${
                allExercises.length
                  ? allExercises.map(n => `<option value="${escapeHtml(n)}" ${n === ui.exerciseChartExercise ? "selected" : ""}>${escapeHtml(n)}</option>`).join("")
                  : `<option value="">No exercises yet</option>`
              }
            </select>

            <select id="kpExerciseChartMetric" class="form-input" style="width:auto;">
              <option value="1rm" ${ui.exerciseChartMetric === "1rm" ? "selected" : ""}>Estimated 1RM</option>
              <option value="weight" ${ui.exerciseChartMetric === "weight" ? "selected" : ""}>Best weight per day</option>
              <option value="volume" ${ui.exerciseChartMetric === "volume" ? "selected" : ""}>Total volume per day</option>
            </select>
          </div>
        </div>

        <div style="color:#9ca3af; font-size:0.9rem; margin-top:10px;">
          Progress is calculated per day for the selected exercise.
        </div>

        <div style="width:100%; height:320px; margin-top:10px;">
          <canvas id="kpExerciseChartCanvas" height="320"></canvas>
        </div>
      </div>
    `;

    bindTopEvents();
    bindWorkoutCardEvents();
    bindExerciseChartEvents();
    renderExerciseProgressChart();
  }

  function renderWorkoutCard(workout) {
    const statusPill = workout.status === "current"
      ? `<span style="padding:6px 10px; border-radius:999px; font-weight:900; font-size:0.8rem; border:1px solid rgba(34,197,94,0.25); background:rgba(34,197,94,0.08); color:#bbf7d0;">active</span>`
      : workout.status === "planned"
        ? `<span style="padding:6px 10px; border-radius:999px; font-weight:900; font-size:0.8rem; border:1px solid rgba(250,204,21,0.25); background:rgba(250,204,21,0.08); color:#fde68a;">planned</span>`
        : `<span style="padding:6px 10px; border-radius:999px; font-weight:900; font-size:0.8rem; border:1px solid rgba(148,163,184,0.25); background:rgba(148,163,184,0.08); color:#e5e7eb;">completed</span>`;

    const headerBtns = [];

    if (workout.status === "planned") {
      headerBtns.push(`<button class="form-submit" data-action="moveWorkout" data-id="${workout.id}" data-status="current">Start</button>`);
    }
    if (workout.status === "current") {
      headerBtns.push(`<button class="form-submit" data-action="addExercise" data-id="${workout.id}">Add exercise</button>`);
      headerBtns.push(`<button class="form-submit" data-action="moveWorkout" data-id="${workout.id}" data-status="completed">Finish</button>`);
    }
    if (workout.status === "completed") {
      headerBtns.push(`<button class="form-submit" data-action="moveWorkout" data-id="${workout.id}" data-status="current">Re-open</button>`);
    }

    headerBtns.push(`<button class="form-cancel" data-action="deleteWorkout" data-id="${workout.id}" style="color:#ef4444;">Delete</button>`);

    const vol = calcWorkoutVolume(workout);

    return `
      <div class="idea-item" style="margin-top:10px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
          <div style="flex:1; min-width:220px;">
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
              <div style="font-weight:900; font-size:1.05rem;">${escapeHtml(workout.name)}</div>
              ${statusPill}
            </div>
            <div style="color:#9ca3af; margin-top:4px;">
              ${escapeHtml(workout.type || "")}
              <span style="margin-left:10px;">• total volume: ${Number(vol || 0).toLocaleString()}</span>
            </div>
          </div>

          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${headerBtns.join("")}
          </div>
        </div>

        <div style="margin-top:12px;">
          ${
            (workout.exercises || []).length
              ? workout.exercises.map(ex => renderExerciseBlock(workout, ex)).join("")
              : `<div style="color:#9ca3af;">No exercises yet.</div>`
          }
        </div>
      </div>
    `;
  }

  function renderExerciseBlock(workout, ex) {
    const sets = Array.isArray(ex.sets) ? ex.sets : [];
    const setsSorted = [...sets].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    return `
      <div style="margin-top:10px; padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.03);">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div style="font-weight:900;">${escapeHtml(ex.name)}</div>

          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button
              class="form-submit"
              data-action="renameExercise"
              data-w="${workout.id}"
              data-e="${ex.id}"
              style="background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.18);"
            >
              Rename
            </button>

            <button
              class="form-cancel"
              data-action="deleteExercise"
              data-w="${workout.id}"
              data-e="${ex.id}"
              style="color:#ef4444;"
            >
              Delete
            </button>
          </div>
        </div>

        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <input
            type="number"
            inputmode="decimal"
            placeholder="Weight"
            class="form-input"
            style="width:110px;"
            data-role="setWeight"
            data-w="${workout.id}"
            data-e="${ex.id}"
          />
          <input
            type="number"
            inputmode="numeric"
            placeholder="Reps"
            class="form-input"
            style="width:90px;"
            data-role="setReps"
            data-w="${workout.id}"
            data-e="${ex.id}"
          />
          <input
            type="date"
            class="form-input"
            style="width:170px;"
            value="${todayISO()}"
            data-role="setDate"
            data-w="${workout.id}"
            data-e="${ex.id}"
          />
          <button
            class="form-submit"
            data-action="addSet"
            data-w="${workout.id}"
            data-e="${ex.id}"
          >
            Add set
          </button>
        </div>

        <div style="margin-top:10px;">
          ${
            setsSorted.length
              ? setsSorted.map((s, idx) => renderSetRow(workout.id, ex.id, s, idx)).join("")
              : `<div style="color:#9ca3af;">No sets yet. Add your first set above.</div>`
          }
        </div>
      </div>
    `;
  }

  function renderSetRow(workoutId, exerciseId, set, idx) {
    const w = Number(set.weight || 0);
    const r = Number(set.reps || 0);
    const vol = w * r;
    const one = Math.round(estimate1RM(w, r) || 0);

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 10px; border-radius:12px; border:1px solid rgba(255,255,255,0.10); background:rgba(0,0,0,0.16); margin-top:8px; flex-wrap:wrap;">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <div style="color:#9ca3af; font-weight:900; width:34px;">#${idx + 1}</div>
          <div style="font-weight:900; color:white;">${w} x ${r}</div>
          <div style="color:#9ca3af;">vol ${Number(vol || 0).toLocaleString()}</div>
          <div style="color:#a78bfa;">1RM ${one}</div>
          <div style="color:#9ca3af;">${formatDay(set.date || todayISO())}</div>
        </div>

        <div style="display:flex; gap:8px; align-items:center;">
          <button
            class="form-submit"
            data-action="editSet"
            data-w="${workoutId}"
            data-e="${exerciseId}"
            data-s="${set.id}"
            style="background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.18);"
          >
            Edit
          </button>

          <button
            class="form-cancel"
            data-action="deleteSet"
            data-w="${workoutId}"
            data-e="${exerciseId}"
            data-s="${set.id}"
            style="color:#ef4444;"
          >
            Delete
          </button>
        </div>
      </div>
    `;
  }

  // -----------------------------
  // Bind events
  // -----------------------------
  function bindTopEvents() {
    const mount = byId(MOUNT_ID);
    if (!mount) return;

    const addBtn = mount.querySelector("#kpAddWorkoutBtn");
    if (addBtn) addBtn.onclick = openAddWorkoutModal;

    const graphBtn = mount.querySelector("#kpOpenWeeklyGraphBtn");
    if (graphBtn) graphBtn.onclick = () => openWeeklyGraphModal("7");
  }

  function bindWorkoutCardEvents() {
    const mount = byId(MOUNT_ID);
    if (!mount) return;

    mount.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;

        if (action === "deleteWorkout") {
          deleteWorkout(btn.dataset.id);
          return;
        }

        if (action === "moveWorkout") {
          moveWorkout(btn.dataset.id, btn.dataset.status);
          return;
        }

        if (action === "addExercise") {
          openAddExerciseModal(btn.dataset.id);
          return;
        }

        if (action === "deleteExercise") {
          deleteExercise(btn.dataset.w, btn.dataset.e);
          return;
        }

        if (action === "renameExercise") {
          openRenameExerciseModal(btn.dataset.w, btn.dataset.e);
          return;
        }

        if (action === "addSet") {
          const wId = btn.dataset.w;
          const eId = btn.dataset.e;

          const weightEl = mount.querySelector(`[data-role="setWeight"][data-w="${wId}"][data-e="${eId}"]`);
          const repsEl = mount.querySelector(`[data-role="setReps"][data-w="${wId}"][data-e="${eId}"]`);
          const dateEl = mount.querySelector(`[data-role="setDate"][data-w="${wId}"][data-e="${eId}"]`);

          const weight = weightEl ? weightEl.value : "";
          const reps = repsEl ? repsEl.value : "";
          const date = dateEl ? dateEl.value : todayISO();

          addSet(wId, eId, weight, reps, date);

          // keep UX tight
          if (weightEl) weightEl.value = "";
          if (repsEl) repsEl.value = "";
          return;
        }

        if (action === "deleteSet") {
          deleteSet(btn.dataset.w, btn.dataset.e, btn.dataset.s);
          return;
        }

        if (action === "editSet") {
          openEditSetModal(btn.dataset.w, btn.dataset.e, btn.dataset.s);
          return;
        }
      };
    });
  }

  function bindExerciseChartEvents() {
    const mount = byId(MOUNT_ID);
    if (!mount) return;

    const exSel = mount.querySelector("#kpExerciseChartSelect");
    const metricSel = mount.querySelector("#kpExerciseChartMetric");

    if (exSel) {
      exSel.onchange = () => {
        const ui = loadUIState();
        ui.exerciseChartExercise = exSel.value;
        saveUIState(ui);
        renderExerciseProgressChart();
      };
    }

    if (metricSel) {
      metricSel.onchange = () => {
        const ui = loadUIState();
        ui.exerciseChartMetric = metricSel.value;
        saveUIState(ui);
        renderExerciseProgressChart();
      };
    }
  }

  // -----------------------------
  // Modals
  // -----------------------------
  function openAddWorkoutModal() {
    openModalSafe(`
      <div class="section-title">Add workout</div>

      <div class="form-group">
        <label>Name</label>
        <input id="kpWorkoutName" class="form-input" placeholder="e.g. Push day" />
      </div>

      <div class="form-group">
        <label>Type</label>
        <input id="kpWorkoutType" class="form-input" placeholder="e.g. strength / hypertrophy / conditioning" />
      </div>

      <div class="form-group">
        <label>Where should it go?</label>
        <select id="kpWorkoutStatus" class="form-input">
          <option value="planned">Planned workouts</option>
          <option value="current">Currently training</option>
        </select>
      </div>

      <div class="form-actions">
        <button class="form-submit" id="kpSaveWorkoutBtn">Save</button>
        <button class="form-cancel" id="kpCancelWorkoutBtn">Cancel</button>
      </div>
    `);

    const saveBtn = byId("kpSaveWorkoutBtn");
    const cancelBtn = byId("kpCancelWorkoutBtn");

    if (cancelBtn) cancelBtn.onclick = closeModalSafe;

    if (saveBtn) {
      saveBtn.onclick = () => {
        const name = byId("kpWorkoutName")?.value || "";
        const type = byId("kpWorkoutType")?.value || "";
        const status = byId("kpWorkoutStatus")?.value || "planned";
        addWorkout(name, type, status);
        closeModalSafe();
      };
    }
  }

  function openAddExerciseModal(workoutId) {
    openModalSafe(`
      <div class="section-title">Add exercise</div>

      <div class="form-group">
        <label>Exercise name</label>
        <input id="kpExerciseName" class="form-input" placeholder="e.g. Bench press" />
      </div>

      <div class="form-actions">
        <button class="form-submit" id="kpSaveExerciseBtn">Add</button>
        <button class="form-cancel" id="kpCancelExerciseBtn">Cancel</button>
      </div>
    `);

    const saveBtn = byId("kpSaveExerciseBtn");
    const cancelBtn = byId("kpCancelExerciseBtn");

    if (cancelBtn) cancelBtn.onclick = closeModalSafe;

    if (saveBtn) {
      saveBtn.onclick = () => {
        const name = byId("kpExerciseName")?.value || "";
        addExercise(workoutId, name);
        closeModalSafe();
      };
    }
  }

  function openRenameExerciseModal(workoutId, exerciseId) {
    const workouts = loadWorkouts();
    const w = workouts.find(x => x.id === workoutId);
    const ex = w?.exercises?.find(e => e.id === exerciseId);
    const currentName = ex?.name || "";

    openModalSafe(`
      <div class="section-title">Rename exercise</div>

      <div class="form-group">
        <label>New name</label>
        <input id="kpRenameExerciseInput" class="form-input" value="${escapeHtml(currentName)}" />
      </div>

      <div class="form-actions">
        <button class="form-submit" id="kpRenameExerciseSave">Save</button>
        <button class="form-cancel" id="kpRenameExerciseCancel">Cancel</button>
      </div>
    `);

    const saveBtn = byId("kpRenameExerciseSave");
    const cancelBtn = byId("kpRenameExerciseCancel");

    if (cancelBtn) cancelBtn.onclick = closeModalSafe;

    if (saveBtn) {
      saveBtn.onclick = () => {
        const name = byId("kpRenameExerciseInput")?.value || "";
        renameExercise(workoutId, exerciseId, name);
        closeModalSafe();
      };
    }
  }

  function openEditSetModal(workoutId, exerciseId, setId) {
    const workouts = loadWorkouts();
    const w = workouts.find(x => x.id === workoutId);
    const ex = w?.exercises?.find(e => e.id === exerciseId);
    const set = ex?.sets?.find(s => s.id === setId);

    if (!set) return;

    openModalSafe(`
      <div class="section-title">Edit set</div>

      <div class="form-group">
        <label>Date</label>
        <input id="kpEditSetDate" type="date" class="form-input" value="${escapeHtml(set.date || todayISO())}" />
      </div>

      <div class="form-group">
        <label>Weight</label>
        <input id="kpEditSetWeight" type="number" class="form-input" value="${Number(set.weight || 0)}" />
      </div>

      <div class="form-group">
        <label>Reps</label>
        <input id="kpEditSetReps" type="number" class="form-input" value="${Number(set.reps || 0)}" />
      </div>

      <div class="form-actions">
        <button class="form-submit" id="kpEditSetSave">Save</button>
        <button class="form-cancel" id="kpEditSetCancel">Cancel</button>
      </div>
    `);

    const saveBtn = byId("kpEditSetSave");
    const cancelBtn = byId("kpEditSetCancel");

    if (cancelBtn) cancelBtn.onclick = closeModalSafe;

    if (saveBtn) {
      saveBtn.onclick = () => {
        const d = byId("kpEditSetDate")?.value || todayISO();
        const wv = byId("kpEditSetWeight")?.value || 0;
        const rv = byId("kpEditSetReps")?.value || 0;
        editSet(workoutId, exerciseId, setId, wv, rv, d);
        closeModalSafe();
      };
    }
  }

  // -----------------------------
  // Weekly graph modal
  // -----------------------------
  function openWeeklyGraphModal(range) {
    const title = range === "30" ? "Last 30 days" : range === "all" ? "All time" : "Last 7 days";

    openModalSafe(`
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; flex-wrap:wrap;">
        <div style="color:white; font-weight:900; font-size:1.1rem;">Workout momentum (${title})</div>

        <select id="kpWeeklyRangeSelect" class="form-input" style="width:auto;">
          <option value="7" ${range === "7" ? "selected" : ""}>7 days</option>
          <option value="30" ${range === "30" ? "selected" : ""}>30 days</option>
          <option value="all" ${range === "all" ? "selected" : ""}>All time</option>
        </select>
      </div>

      <div style="color:#9ca3af; font-size:0.9rem; margin-bottom:12px;">
        Two lines: sets logged and training volume. Volume = weight × reps.
      </div>

      <div style="width:100%; height:320px;">
        <canvas id="kpWeeklyCanvas" height="320"></canvas>
      </div>

      <div style="margin-top:12px;">
        <button class="form-cancel" style="width:100%;" onclick="closeModal()">Close</button>
      </div>
    `);

    const sel = byId("kpWeeklyRangeSelect");
    if (sel) sel.onchange = () => openWeeklyGraphModal(sel.value);

    setTimeout(() => renderWeeklyChart(range), 0);
  }

  function renderWeeklyChart(range) {
    if (typeof Chart === "undefined") return;

    const canvas = byId("kpWeeklyCanvas");
    if (!canvas) return;

    const workouts = loadWorkouts();
    const series = computeDailySeries(workouts, range);

    if (weeklyChart) {
      try { weeklyChart.destroy(); } catch {}
      weeklyChart = null;
    }

    weeklyChart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Sets",
            data: series.sets,
            tension: 0.35,
            borderWidth: 3,
            spanGaps: true,
            yAxisID: "y"
          },
          {
            label: "Volume",
            data: series.volume,
            tension: 0.35,
            borderWidth: 3,
            spanGaps: true,
            yAxisID: "y1"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { color: "rgba(255,255,255,0.8)" } }
        },
        scales: {
          x: { ticks: { color: "rgba(255,255,255,0.65)" }, grid: { color: "rgba(255,255,255,0.08)" } },
          y: {
            beginAtZero: true,
            ticks: { color: "rgba(255,255,255,0.65)" },
            grid: { color: "rgba(255,255,255,0.08)" }
          },
          y1: {
            beginAtZero: true,
            position: "right",
            ticks: { color: "rgba(255,255,255,0.65)" },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  // -----------------------------
  // Exercise progress chart
  // -----------------------------
  function renderExerciseProgressChart() {
    if (typeof Chart === "undefined") return;

    const mount = byId(MOUNT_ID);
    if (!mount) return;

    const canvas = mount.querySelector("#kpExerciseChartCanvas");
    if (!canvas) return;

    const workouts = loadWorkouts();
    const ui = loadUIState();

    const series = computeExerciseSeries(workouts, ui.exerciseChartExercise);
    if (!series) {
      if (exerciseChart) {
        try { exerciseChart.destroy(); } catch {}
        exerciseChart = null;
      }
      return;
    }

    let data = series.best1rm;
    let label = "Estimated 1RM";

    if (ui.exerciseChartMetric === "weight") {
      data = series.bestWeight;
      label = "Best weight per day";
    }

    if (ui.exerciseChartMetric === "volume") {
      data = series.volume;
      label = "Total volume per day";
    }

    if (exerciseChart) {
      try { exerciseChart.destroy(); } catch {}
      exerciseChart = null;
    }

    exerciseChart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [{
          label,
          data,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          spanGaps: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { color: "rgba(255,255,255,0.8)" } },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const idx = items?.[0]?.dataIndex ?? 0;
                const d = series.days[idx];
                if (!d) return [];
                return [
                  `Day: ${d.day}`,
                  `Best 1RM: ${Math.round(d.best1rm || 0)}`,
                  `Best weight: ${Math.round(d.bestWeight || 0)}`,
                  `Volume: ${Math.round(d.volume || 0).toLocaleString()}`
                ];
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: "rgba(255,255,255,0.65)" }, grid: { color: "rgba(255,255,255,0.08)" } },
          y: { beginAtZero: true, ticks: { color: "rgba(255,255,255,0.65)" }, grid: { color: "rgba(255,255,255,0.08)" } }
        }
      }
    });
  }

  // -----------------------------
  // Boot
  // -----------------------------
  function boot() {
    hookShowPage();
    hookNavClicks();

    // render if workout page is already active or user reloads on workout page
    setTimeout(() => {
      if (isWorkoutPageActive()) render();
    }, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Optional global API (useful for debugging in console)
  window.KPWorkouts = {
    render,
    addWorkout,
    addExercise,
    addSet,
    moveWorkout,
    deleteWorkout
  };
})();
