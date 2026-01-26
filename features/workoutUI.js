// ============================================
// WORKOUT UI LAYER — SAFE UPGRADES
// Requires: workout.js loaded first, WorkoutEngine loaded
// Does NOT remove any existing features
// Adds: streak UI, today summary, weekly graph (7/30/all), line charts, PR toast
// ============================================

(function () {
  function qs(sel) {
    return document.querySelector(sel);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatShort(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }

  function ensureTopPanels() {
    const host = byId("exerciseCards");
    if (!host) return;

    // workout.js injects its own UI into exerciseCards.
    // We add an additional panel ABOVE the exercise list container if it exists.
    if (byId("workoutTopPanels")) return;

    const logPanel = byId("workoutLogPanel");     // created by workout.js UI injection
    const lifetimePanel = byId("lifetimePanel");  // created by workout.js UI injection

    // If workout.js hasn't injected yet, do nothing now.
    if (!logPanel || !lifetimePanel) return;

    const wrapper = document.createElement("div");
    wrapper.id = "workoutTopPanels";
    wrapper.style.marginBottom = "16px";

    wrapper.innerHTML = `
      <div class="habit-section" style="padding:16px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:10px;">
          <div class="section-title" style="margin:0;">🔥 Workout Intelligence</div>

          <button
            class="form-submit"
            style="padding:10px 12px; border-radius:12px; white-space:nowrap;"
            onclick="openWorkoutWeeklyGraph()"
            title="View workout momentum graph"
          >
            View Graph
          </button>
        </div>

        <div style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:12px;">
          <div style="border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); border-radius:14px; padding:12px;">
            <div style="color:#9ca3af; font-size:0.85rem; font-weight:800;">Streak</div>
            <div id="workoutStreakValue" style="color:white; font-size:1.8rem; font-weight:900; margin-top:6px;">0</div>
            <div style="color:#9ca3af; font-size:0.85rem; margin-top:4px;">days in a row</div>
          </div>

          <div style="border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); border-radius:14px; padding:12px;">
            <div style="color:#9ca3af; font-size:0.85rem; font-weight:800;">Last 7 Days</div>
            <div id="workoutWeekSessions" style="color:white; font-size:1.8rem; font-weight:900; margin-top:6px;">0</div>
            <div style="color:#9ca3af; font-size:0.85rem; margin-top:4px;">sessions</div>
          </div>

          <div style="border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); border-radius:14px; padding:12px;">
            <div style="color:#9ca3af; font-size:0.85rem; font-weight:800;">Last 7 Days</div>
            <div id="workoutWeekVolume" style="color:white; font-size:1.8rem; font-weight:900; margin-top:6px;">0</div>
            <div style="color:#9ca3af; font-size:0.85rem; margin-top:4px;">total volume</div>
          </div>
        </div>

        <div style="margin-top:12px; border-top:1px solid rgba(255,255,255,0.10); padding-top:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px;">
            <div style="color:white; font-weight:900;">Today</div>
            <div id="workoutTodayMeta" style="color:#9ca3af; font-size:0.9rem;">—</div>
          </div>
          <div id="workoutTodayList" style="display:flex; flex-direction:column; gap:8px;"></div>
        </div>
      </div>
    `;

    // Insert above lifetime panel (so order becomes: Log panel -> Intelligence -> Lifetime -> Exercise list)
    lifetimePanel.parentNode.insertBefore(wrapper, lifetimePanel);

    refreshWorkoutPanels();
  }

  function refreshWorkoutPanels() {
    if (!window.WorkoutEngine) return;

    const sEl = byId("workoutStreakValue");
    const wSessEl = byId("workoutWeekSessions");
    const wVolEl = byId("workoutWeekVolume");
    const metaEl = byId("workoutTodayMeta");
    const listEl = byId("workoutTodayList");

    const summary = WorkoutEngine.getWorkoutSummary();
    const today = WorkoutEngine.getTodaySummary();

    if (sEl) sEl.textContent = String(summary.streak);
    if (wSessEl) wSessEl.textContent = String(summary.weekly.sessions);
    if (wVolEl) wVolEl.textContent = Number(summary.weekly.volume || 0).toLocaleString();

    if (metaEl) {
      metaEl.textContent = `${today.sessions} sessions • ${today.exercises.length} exercises • ${Number(today.totalVolume || 0).toLocaleString()} volume`;
    }

    if (listEl) {
      if (!today.exercises.length) {
        listEl.innerHTML = `<div style="color:#9ca3af;">No workouts logged today.</div>`;
      } else {
        listEl.innerHTML = today.exercises.map(ex => {
          const sessions = today.byExercise[ex] || [];
          const latest = sessions[sessions.length - 1];
          const vol = sessions.reduce((a, s) => a + (Number(s.weight || 0) * Number(s.reps || 0) * Number(s.sets || 0)), 0);

          return `
            <div style="border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.03); border-radius:12px; padding:10px 12px; display:flex; justify-content:space-between; gap:10px; align-items:center;">
              <div>
                <div style="color:white; font-weight:900;">${esc(ex)}</div>
                <div style="color:#9ca3af; font-size:0.85rem; margin-top:2px;">
                  latest: ${Number(latest.weight || 0)} lbs • ${Number(latest.sets || 0)} × ${Number(latest.reps || 0)} • ${formatShort(latest.date)}
                </div>
              </div>
              <div style="color:#e5e7eb; font-weight:900;">${Number(vol || 0).toLocaleString()}</div>
            </div>
          `;
        }).join("");
      }
    }
  }

  // ----------------------------
  // Weekly graph modal (7/30/all)
  // ----------------------------

  let workoutWeeklyChart = null;

  window.openWorkoutWeeklyGraph = function (range = "7") {
    const title = range === "30" ? "Last 30 Days" : range === "all" ? "All Time" : "Last 7 Days";

    const html = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px;">
        <div style="color:white; font-weight:900; font-size:1.1rem;">Workout Momentum (${title})</div>
        <select id="workoutRangeSelect" style="padding:10px; border-radius:10px; background:rgba(255,255,255,0.08); color:white; border:1px solid rgba(255,255,255,0.14);">
          <option value="7" ${range === "7" ? "selected" : ""}>7 days</option>
          <option value="30" ${range === "30" ? "selected" : ""}>30 days</option>
          <option value="all" ${range === "all" ? "selected" : ""}>All time</option>
        </select>
      </div>

      <div style="color:#9ca3af; font-size:0.9rem; margin-bottom:12px;">
        Two lines: sessions and training volume. Volume = weight × reps × sets.
      </div>

      <div style="width:100%; height:320px;">
        <canvas id="workoutWeeklyCanvas" height="320"></canvas>
      </div>
    `;

    if (typeof window.openModal === "function") {
      window.openModal(html);
    } else {
      // fallback to existing modal elements
      const modal = byId("modal");
      const body = byId("modalBody");
      if (!modal || !body) return;
      body.innerHTML = html;
      modal.style.display = "flex";
    }

    const sel = byId("workoutRangeSelect");
    if (sel) sel.onchange = () => window.openWorkoutWeeklyGraph(sel.value);

    setTimeout(() => renderWorkoutWeeklyChart(range), 0);
  };

  function renderWorkoutWeeklyChart(range) {
    if (!window.WorkoutEngine) return;
    if (typeof Chart === "undefined") return;

    const canvas = byId("workoutWeeklyCanvas");
    if (!canvas) return;

    const series = WorkoutEngine.getDailySeries(range);

    if (workoutWeeklyChart) {
      try { workoutWeeklyChart.destroy(); } catch {}
      workoutWeeklyChart = null;
    }

    workoutWeeklyChart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Sessions",
            data: series.sessions,
            tension: 0.35,
            spanGaps: true,
            borderWidth: 3,
            yAxisID: "y"
          },
          {
            label: "Volume",
            data: series.volume,
            tension: 0.35,
            spanGaps: true,
            borderWidth: 3,
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

  // ----------------------------
  // Exercise line charts (modal)
  // ----------------------------

  let exerciseLineChart = null;

  function openExerciseLineChart(exerciseName) {
    if (!window.WorkoutEngine) return;
    if (typeof Chart === "undefined") return;

    const s = WorkoutEngine.getExerciseSeries(exerciseName);
    if (!s) return;

    const html = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:10px;">
        <div style="color:white; font-weight:900; font-size:1.1rem;">${esc(exerciseName)} Progress</div>
        <select id="exerciseMetricSelect" style="padding:10px; border-radius:10px; background:rgba(255,255,255,0.08); color:white; border:1px solid rgba(255,255,255,0.14);">
          <option value="weight">Weight</option>
          <option value="volume">Volume</option>
          <option value="1rm">Estimated 1RM</option>
        </select>
      </div>

      <div style="color:#9ca3af; font-size:0.9rem; margin-bottom:12px;">
        Click points to inspect sessions. This is a line chart (not bars).
      </div>

      <div style="width:100%; height:320px;">
        <canvas id="exerciseLineCanvas" height="320"></canvas>
      </div>
    `;

    if (typeof window.openModal === "function") {
      window.openModal(html);
    } else {
      const modal = byId("modal");
      const body = byId("modalBody");
      if (!modal || !body) return;
      body.innerHTML = html;
      modal.style.display = "flex";
    }

    const sel = byId("exerciseMetricSelect");
    if (sel) sel.onchange = () => renderExerciseLineChart(exerciseName, sel.value);

    setTimeout(() => renderExerciseLineChart(exerciseName, "weight"), 0);
  }

  function renderExerciseLineChart(exerciseName, metric) {
    const canvas = byId("exerciseLineCanvas");
    if (!canvas) return;

    const s = WorkoutEngine.getExerciseSeries(exerciseName);
    if (!s) return;

    if (exerciseLineChart) {
      try { exerciseLineChart.destroy(); } catch {}
      exerciseLineChart = null;
    }

    let data = s.weights;
    let label = "Weight";

    if (metric === "volume") {
      data = s.volumes;
      label = "Volume";
    }
    if (metric === "1rm") {
      data = s.est1rm;
      label = "Estimated 1RM";
    }

    exerciseLineChart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: s.labels,
        datasets: [
          {
            label,
            data,
            tension: 0.35,
            spanGaps: true,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
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
                const sess = s.sessions[idx];
                if (!sess) return [];
                return [
                  `Date: ${sess.date ? sess.date.split("T")[0] : ""}`,
                  `Weight: ${Number(sess.weight || 0)} lbs`,
                  `Sets × Reps: ${Number(sess.sets || 0)} × ${Number(sess.reps || 0)}`
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

  // ----------------------------
  // PR toast + PR detection
  // ----------------------------

  function ensureToastHost() {
    if (byId("kpToastHost")) return;
    const host = document.createElement("div");
    host.id = "kpToastHost";
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
    const host = byId("kpToastHost");
    if (!host) return;

    const el = document.createElement("div");
    el.style.border = "1px solid rgba(255,255,255,0.18)";
    el.style.background = "rgba(0,0,0,0.75)";
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
      el.style.transition = "opacity 250ms ease";
      setTimeout(() => el.remove(), 350);
    }, 2500);
  }

  function diffPRs(before, after) {
    const wins = [];

    const all = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    all.forEach(ex => {
      const b = before?.[ex] || { bestWeight: 0, bestVolume: 0, best1RM: 0 };
      const a = after?.[ex] || { bestWeight: 0, bestVolume: 0, best1RM: 0 };

      if (a.bestWeight > b.bestWeight) wins.push(`${ex}: weight PR ${a.bestWeight} lbs`);
      if (a.bestVolume > b.bestVolume) wins.push(`${ex}: volume PR ${Math.round(a.bestVolume).toLocaleString()}`);
      if (a.best1RM > b.best1RM) wins.push(`${ex}: 1RM PR ${a.best1RM} lbs`);
    });

    return wins;
  }

  function patchLogWorkoutForPR() {
    if (typeof window.logWorkout !== "function") return false;
    if (!window.WorkoutEngine) return false;
    if (window.logWorkout.__kpPRWrapped) return true;

    const original = window.logWorkout;

    const wrapped = function () {
      const before = WorkoutEngine.computePRs();
      const result = original.apply(this, arguments);
      const after = WorkoutEngine.computePRs();

      const wins = diffPRs(before, after);
      if (wins.length) {
        // show up to 2 toasts so it doesn’t spam
        toast("New PR!");
        wins.slice(0, 2).forEach(w => toast(w));
      }

      // refresh top panels so streak + today summary update instantly
      try { refreshWorkoutPanels(); } catch {}

      return result;
    };

    wrapped.__kpPRWrapped = true;
    window.logWorkout = wrapped;
    return true;
  }

  // ----------------------------
  // Add "Line Chart" button without breaking existing modal
  // ----------------------------

  function patchShowExerciseChart() {
    if (typeof window.showExerciseChart !== "function") return false;
    if (window.showExerciseChart.__kpWrapped) return true;

    const original = window.showExerciseChart;

    const wrapped = function (exerciseName) {
      // keep existing modal UI exactly
      const res = original.apply(this, arguments);

      // add an extra button inside the modal (if modal exists)
      const modalBody = byId("modalBody");
      if (!modalBody) return res;

      // prevent duplicates
      if (byId("kpLineChartBtn")) return res;

      const btnRow = document.createElement("div");
      btnRow.style.marginTop = "12px";
      btnRow.style.display = "flex";
      btnRow.style.gap = "10px";

      btnRow.innerHTML = `
        <button
          id="kpLineChartBtn"
          style="flex:1; padding: 10px 12px; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.20); border-radius: 12px; color: white; cursor:pointer; font-weight:800;"
        >
          View Line Chart
        </button>
      `;

      modalBody.appendChild(btnRow);

      const btn = byId("kpLineChartBtn");
      if (btn) {
        btn.onclick = function () {
          openExerciseLineChart(exerciseName);
        };
      }

      return res;
    };

    wrapped.__kpWrapped = true;
    window.showExerciseChart = wrapped;
    return true;
  }

  // ----------------------------
  // Boot safely
  // ----------------------------

  function safeBoot() {
    try {
      ensureTopPanels();
      patchLogWorkoutForPR();
      patchShowExerciseChart();
      refreshWorkoutPanels();
    } catch (e) {
      console.error("WorkoutUI boot failed:", e);
    }
  }

  // keep trying until workout.js has injected its UI and functions exist
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    safeBoot();

    const ok =
      byId("workoutTopPanels") &&
      typeof window.logWorkout === "function" &&
      typeof window.showExerciseChart === "function";

    if (ok || tries > 30) clearInterval(timer);
  }, 200);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeBoot);
  } else {
    safeBoot();
  }

  // If user navigates away and back, refresh panels
  window.addEventListener("focus", () => {
    try {
      ensureTopPanels();
      refreshWorkoutPanels();
    } catch {}
  });
})();
