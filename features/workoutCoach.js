// =====================================================
// WORKOUT GOD MODE COACH (SAFE OVERLAY)
// - Does NOT modify workout.js
// - Adds: Plan (PPL templates + custom), auto-complete on log,
//         weekly goal + progress bar, 7-day heatmap,
//         PR toasts, next-action coaching, recent sessions timeline
// - Uses workout.js storage keys:
//   workoutsData, workoutsHistory, workoutPRs
// =====================================================

(function () {
  "use strict";

  const WORKOUTS_KEY = "workoutsData";     // from workout.js
  const HISTORY_KEY = "workoutsHistory";   // from workout.js
  const PR_KEY = "workoutPRs";             // from workout.js

  const COACH_SETTINGS_KEY = "kp_workoutCoachSettings_v1";
  const PLAN_KEY = "kp_workoutPlan_v2";

  const PANEL_ID = "kpWorkoutCoachPanel";
  const TOAST_HOST_ID = "kpToastHost_workoutCoach";

  let heatChart = null;

  // -------------------------
  // helpers
  // -------------------------

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

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function load(key, fallback) {
    return safeParse(localStorage.getItem(key) || "", fallback);
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function todayKeyISO() {
    return new Date().toISOString().split("T")[0];
  }

  function dayISOFromMs(ms) {
    try {
      const d = new Date(Number(ms || 0));
      return d.toISOString().split("T")[0];
    } catch {
      return todayKeyISO();
    }
  }

  function startOfWeekISO(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay(); // 0 Sun
    const diff = (day + 6) % 7; // Monday-start
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  }

  function sameWeek(isoDate, weekStartISO) {
    try {
      const d = new Date(isoDate + "T00:00:00");
      const ws = new Date(weekStartISO + "T00:00:00");
      const we = new Date(ws);
      we.setDate(ws.getDate() + 7);
      return d >= ws && d < we;
    } catch {
      return false;
    }
  }

  // -------------------------
  // data readers (aligned with workout.js)
  // -------------------------

  function loadWorkouts() {
    return load(WORKOUTS_KEY, []);
  }

  function loadHistory() {
    return load(HISTORY_KEY, []);
  }

  function loadPRs() {
    return load(PR_KEY, {});
  }

  // history items from workout.js:
  // { day: todayKeyMs, workoutId, exercise, weight, reps }
  function getHistorySessions() {
    const history = loadHistory();
    return Array.isArray(history) ? history : [];
  }

  function get7DayKeysISO() {
    const out = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      out.push(d.toISOString().split("T")[0]);
    }
    return out;
  }

  function getDailyTotals7() {
    const keys = get7DayKeysISO();
    const map = {};
    keys.forEach(k => (map[k] = { sessions: 0, volume: 0 }));

    const sessions = getHistorySessions();
    sessions.forEach(s => {
      const k = dayISOFromMs(s.day);
      if (!map[k]) return;
      const w = Number(s.weight || 0);
      const r = Number(s.reps || 0);
      map[k].sessions += 1;
      map[k].volume += (w * r);
    });

    return {
      keys,
      labels: keys.map(k => {
        const d = new Date(k + "T00:00:00");
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      }),
      sessions: keys.map(k => map[k].sessions),
      volume: keys.map(k => map[k].volume)
    };
  }

  function getWeekStats() {
    const ws = startOfWeekISO(new Date());
    const sessions = getHistorySessions();

    let sets = 0;
    let volume = 0;
    const activeDays = new Set();

    sessions.forEach(s => {
      const dayISO = dayISOFromMs(s.day);
      if (!sameWeek(dayISO, ws)) return;
      sets += 1;
      volume += Number(s.weight || 0) * Number(s.reps || 0);
      activeDays.add(dayISO);
    });

    return {
      weekStartISO: ws,
      sets,
      volume,
      activeDays: activeDays.size
    };
  }

  function getRecentTimeline(limit = 10) {
    const sessions = getHistorySessions()
      .slice()
      .sort((a, b) => Number(b.day) - Number(a.day));

    const groups = [];
    const seen = new Set();

    for (const s of sessions) {
      const dayISO = dayISOFromMs(s.day);
      if (!seen.has(dayISO)) {
        seen.add(dayISO);
        groups.push({ dayISO, items: [] });
      }
      const g = groups[groups.length - 1];
      if (g && g.dayISO === dayISO && g.items.length < 8) {
        g.items.push(s);
      }
      if (groups.length >= limit) break;
    }

    return groups;
  }

  // -------------------------
  // plan system (coach)
  // -------------------------

  const planTemplates = {
    push: ["Bench Press", "Incline Press", "Shoulder Press", "Dips", "Tricep Extensions", "Lateral Raises"],
    pull: ["Pull Ups", "Barbell Row", "Lat Pulldown", "Face Pulls", "Bicep Curls", "Hammer Curls"],
    legs: ["Squat", "Romanian Deadlift", "Leg Press", "Leg Extension", "Hamstring Curl", "Calf Raises"],
    full: ["Squat", "Bench Press", "Barbell Row", "Shoulder Press", "RDL", "Pull Ups"]
  };

  function loadPlan() {
    const p = load(PLAN_KEY, null);
    if (!p || p.date !== todayKeyISO()) {
      const fresh = { date: todayKeyISO(), template: null, items: [] }; // {name, done}
      save(PLAN_KEY, fresh);
      return fresh;
    }
    if (!Array.isArray(p.items)) p.items = [];
    return p;
  }

  function savePlan(p) {
    save(PLAN_KEY, p);
  }

  function setPlanTemplate(type) {
    const base = planTemplates[type];
    if (!base) return;
    const p = loadPlan();
    p.template = type;
    p.items = base.map(name => ({ name, done: false }));
    savePlan(p);
    refreshCoach();
  }

  function addPlanItem(name) {
    const p = loadPlan();
    p.template = p.template || "custom";
    p.items.push({ name: name.trim(), done: false });
    savePlan(p);
    refreshCoach();
  }

  function togglePlanDone(idx) {
    const p = loadPlan();
    if (!p.items[idx]) return;
    p.items[idx].done = !p.items[idx].done;
    savePlan(p);
    refreshCoach();
  }

  function removePlanItem(idx) {
    const p = loadPlan();
    if (!p.items[idx]) return;
    p.items.splice(idx, 1);
    savePlan(p);
    refreshCoach();
  }

  function markPlanDoneByExerciseName(exerciseName) {
    const name = String(exerciseName || "").trim();
    if (!name) return;

    const p = loadPlan();
    const idx = p.items.findIndex(i => String(i.name || "").toLowerCase() === name.toLowerCase());
    if (idx >= 0) {
      p.items[idx].done = true;
      savePlan(p);
    }
  }

  // -------------------------
  // settings
  // -------------------------

  function loadSettings() {
    return load(COACH_SETTINGS_KEY, {
      weeklyGoalDays: 4,      // training days target
      weeklyGoalSets: 40      // logged sets target (each "Log" is a set in your system)
    });
  }

  function saveSettings(s) {
    save(COACH_SETTINGS_KEY, s);
  }

  // -------------------------
  // UI injection
  // -------------------------

  function getWorkoutContainer() {
    return byId("exerciseCards");
  }

  function ensurePanel() {
    const host = getWorkoutContainer();
    if (!host) return null;

    let panel = byId(PANEL_ID);
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = PANEL_ID;

    // top of page (you asked for top priority placement)
    host.prepend(panel);

    return panel;
  }

  function ensureToastHost() {
    if (byId(TOAST_HOST_ID)) return;
    const host = document.createElement("div");
    host.id = TOAST_HOST_ID;
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
    const host = byId(TOAST_HOST_ID);
    if (!host) return;

    const el = document.createElement("div");
    el.style.border = "1px solid rgba(255,255,255,0.18)";
    el.style.background = "rgba(0,0,0,0.78)";
    el.style.backdropFilter = "blur(8px)";
    el.style.borderRadius = "14px";
    el.style.padding = "12px";
    el.style.color = "white";
    el.style.fontWeight = "900";
    el.style.maxWidth = "360px";
    el.textContent = msg;

    host.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 220ms ease";
      setTimeout(() => el.remove(), 300);
    }, 2400);
  }

  function coachOrders() {
    const workouts = loadWorkouts();
    const current = workouts.filter(w => w.status === "current");
    const planned = workouts.filter(w => w.status === "planned");

    const p = loadPlan();
    const remaining = p.items.filter(i => !i.done).length;

    if (!workouts.length) return "Coach Order: add your first workout and name it (Push, Pull, Legs, Upper, Lower).";
    if (!current.length && planned.length) return "Coach Order: start one planned workout. Then add exercises.";
    if (!current.length && !planned.length) return "Coach Order: create a workout, set it to planned, then start it.";
    if (current.length && remaining) return `Coach Order: finish today’s plan. ${remaining} exercises left.`;
    if (current.length && !remaining) return "Coach Order: log your heavy sets, then finish the workout.";
    return "Coach Order: keep stacking clean logs. Consistency beats hype.";
  }

  function renderPanel() {
    const panel = ensurePanel();
    if (!panel) return;

    const settings = loadSettings();
    const week = getWeekStats();
    const plan = loadPlan();
    const doneCount = plan.items.filter(i => i.done).length;
    const totalCount = plan.items.length;
    const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

    const goalDays = Number(settings.weeklyGoalDays || 0);
    const goalSets = Number(settings.weeklyGoalSets || 0);

    const daysProgressPct = goalDays ? Math.min(100, Math.round((week.activeDays / goalDays) * 100)) : 0;
    const setsProgressPct = goalSets ? Math.min(100, Math.round((week.sets / goalSets) * 100)) : 0;

    panel.innerHTML = `
      <div class="habit-section" style="padding:16px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
          <div>
            <div class="section-title" style="margin:0;">Workout God Mode Coach</div>
            <div style="margin-top:6px; color:#a78bfa; font-weight:900;">${esc(coachOrders())}</div>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="form-submit" onclick="kpOpenCoachModal()" style="white-space:nowrap;">Coach Settings</button>
            <button class="form-submit" onclick="kpOpenHeatmapModal()" style="white-space:nowrap;">Heatmap</button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:12px; margin-top:14px;">
          <div style="border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); border-radius:14px; padding:12px;">
            <div style="color:#9ca3af; font-size:0.85rem; font-weight:900;">This Week</div>
            <div style="font-size:1.8rem; font-weight:900; margin-top:6px;">${week.activeDays} days</div>
            <div style="color:#9ca3af; font-size:0.85rem; margin-top:4px;">${week.sets} logged sets</div>
          </div>

          <div style="border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); border-radius:14px; padding:12px;">
            <div style="color:#9ca3af; font-size:0.85rem; font-weight:900;">Weekly Days Goal</div>
            <div style="font-size:1.8rem; font-weight:900; margin-top:6px;">${week.activeDays}/${goalDays || "—"}</div>
            <div style="margin-top:8px; height:8px; border-radius:999px; background:rgba(255,255,255,0.16); overflow:hidden;">
              <div style="height:100%; width:${daysProgressPct}%; background:linear-gradient(135deg, rgba(99,102,241,0.95), rgba(236,72,153,0.95));"></div>
            </div>
          </div>

          <div style="border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); border-radius:14px; padding:12px;">
            <div style="color:#9ca3af; font-size:0.85rem; font-weight:900;">Weekly Sets Goal</div>
            <div style="font-size:1.8rem; font-weight:900; margin-top:6px;">${week.sets}/${goalSets || "—"}</div>
            <div style="margin-top:8px; height:8px; border-radius:999px; background:rgba(255,255,255,0.16); overflow:hidden;">
              <div style="height:100%; width:${setsProgressPct}%; background:linear-gradient(135deg, rgba(34,197,94,0.95), rgba(99,102,241,0.95));"></div>
            </div>
          </div>
        </div>

        <div style="margin-top:14px; border-top:1px solid rgba(255,255,255,0.10); padding-top:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="font-weight:900;">Today’s Plan</div>
            <div style="color:#9ca3af;">${plan.template ? String(plan.template).toUpperCase() : "CUSTOM"} • ${doneCount}/${totalCount} • ${pct}%</div>
          </div>

          <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
            <button class="form-submit" onclick="kpPlanTemplate('push')">Push</button>
            <button class="form-submit" onclick="kpPlanTemplate('pull')">Pull</button>
            <button class="form-submit" onclick="kpPlanTemplate('legs')">Legs</button>
            <button class="form-submit" onclick="kpPlanTemplate('full')">Full</button>
            <button class="form-submit" style="background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.18);" onclick="kpPlanAdd()">Add</button>
          </div>

          <div id="kpPlanList" style="display:flex; flex-direction:column; gap:8px; margin-top:12px;"></div>
        </div>

        <div style="margin-top:14px; border-top:1px solid rgba(255,255,255,0.10); padding-top:14px;">
          <div style="font-weight:900; margin-bottom:10px;">Last 7 Days Momentum</div>
          <div style="width:100%; height:220px;">
            <canvas id="kpHeatChart" height="220"></canvas>
          </div>
          <div style="color:#9ca3af; font-size:0.88rem; margin-top:8px;">
            sessions and volume (weight × reps). keeps your training honest.
          </div>
        </div>

        <div style="margin-top:14px; border-top:1px solid rgba(255,255,255,0.10); padding-top:14px;">
          <div style="font-weight:900; margin-bottom:10px;">Recent Training</div>
          <div id="kpTimeline"></div>
        </div>
      </div>
    `;

    renderPlanList();
    renderHeatChart();
    renderTimeline();
  }

  function renderPlanList() {
    const list = byId("kpPlanList");
    if (!list) return;

    const p = loadPlan();

    if (!p.items.length) {
      list.innerHTML = `
        <div style="color:#9ca3af; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.03);">
          no plan yet. hit Push/Pull/Legs/Full or Add to build your own.
        </div>
      `;
      return;
    }

    list.innerHTML = p.items.map((item, idx) => {
      const done = !!item.done;
      const border = done
        ? "border:1px solid rgba(34,197,94,0.25); background:rgba(34,197,94,0.06);"
        : "border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.03);";

      const text = done
        ? "text-decoration:line-through; color:rgba(255,255,255,0.55);"
        : "color:white;";

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 12px; border-radius:12px; ${border}">
          <div style="display:flex; align-items:center; gap:10px; flex:1;">
            <div style="min-width:22px;">${done ? "✅" : "○"}</div>
            <div style="font-weight:900; ${text}">${esc(item.name)}</div>
          </div>

          <div style="display:flex; gap:8px;">
            <button
              style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.14); color:white; padding:8px 10px; border-radius:10px; cursor:pointer;"
              onclick="kpPlanToggle(${idx})"
            >
              Toggle
            </button>
            <button
              style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.25); color:#ffd1d1; padding:8px 10px; border-radius:10px; cursor:pointer;"
              onclick="kpPlanRemove(${idx})"
            >
              ✕
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderHeatChart() {
    const canvas = byId("kpHeatChart");
    if (!canvas) return;
    if (typeof Chart === "undefined") return;

    const series = getDailyTotals7();

    if (heatChart) {
      try { heatChart.destroy(); } catch {}
      heatChart = null;
    }

    heatChart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Sessions",
            data: series.sessions,
            tension: 0.35,
            borderWidth: 3,
            yAxisID: "y"
          },
          {
            label: "Volume",
            data: series.volume,
            tension: 0.35,
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
          y: { beginAtZero: true, ticks: { color: "rgba(255,255,255,0.65)" }, grid: { color: "rgba(255,255,255,0.08)" } },
          y1: { beginAtZero: true, position: "right", ticks: { color: "rgba(255,255,255,0.65)" }, grid: { drawOnChartArea: false } }
        }
      }
    });
  }

  function renderTimeline() {
    const el = byId("kpTimeline");
    if (!el) return;

    const groups = getRecentTimeline(8);

    if (!groups.length) {
      el.innerHTML = `<div style="color:#9ca3af;">no logs yet. log sets and this becomes your timeline.</div>`;
      return;
    }

    el.innerHTML = groups.map(g => {
      const d = new Date(g.dayISO + "T00:00:00");
      const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

      const rows = (g.items || []).map(s => {
        return `
          <div style="display:flex; justify-content:space-between; gap:10px; padding:8px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.03); margin-top:6px;">
            <div style="min-width:0;">
              <div style="font-weight:900; color:white;">${esc(s.exercise)}</div>
              <div style="color:#9ca3af; font-size:0.85rem;">${Number(s.weight || 0)} lbs × ${Number(s.reps || 0)}</div>
            </div>
            <div style="font-weight:900; color:#e5e7eb;">${(Number(s.weight || 0) * Number(s.reps || 0)).toLocaleString()}</div>
          </div>
        `;
      }).join("");

      return `
        <div style="margin-bottom:10px;">
          <div style="color:#9ca3af; font-weight:900;">${label}</div>
          ${rows}
        </div>
      `;
    }).join("");
  }

  // -------------------------
  // coach modal
  // -------------------------

  window.kpOpenCoachModal = function () {
    const settings = loadSettings();

    const html = `
      <div class="section-title" style="margin-bottom:10px;">Coach Settings</div>

      <div class="form-group">
        <label>Weekly Goal (training days)</label>
        <input id="kpGoalDays" type="number" class="form-input" value="${Number(settings.weeklyGoalDays || 4)}" />
      </div>

      <div class="form-group">
        <label>Weekly Goal (logged sets)</label>
        <input id="kpGoalSets" type="number" class="form-input" value="${Number(settings.weeklyGoalSets || 40)}" />
      </div>

      <div class="form-actions">
        <button class="form-submit" id="kpSaveCoachSettings">Save</button>
        <button class="form-cancel" onclick="closeModal()">Close</button>
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

    setTimeout(() => {
      const btn = byId("kpSaveCoachSettings");
      if (!btn) return;
      btn.onclick = function () {
        const days = Number(byId("kpGoalDays")?.value || 0);
        const sets = Number(byId("kpGoalSets")?.value || 0);
        saveSettings({ weeklyGoalDays: Math.max(0, days), weeklyGoalSets: Math.max(0, sets) });
        try { closeModal(); } catch {}
        refreshCoach();
      };
    }, 0);
  };

  window.kpOpenHeatmapModal = function () {
    const series = getDailyTotals7();
    const html = `
      <div class="section-title" style="margin-bottom:10px;">Heatmap (Last 7 Days)</div>
      <div style="color:#9ca3af; margin-bottom:12px;">sessions and volume per day.</div>
      <div style="width:100%; height:320px;">
        <canvas id="kpHeatModalCanvas" height="320"></canvas>
      </div>
      <div class="form-actions" style="margin-top:14px;">
        <button class="form-cancel" onclick="closeModal()">Close</button>
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

    setTimeout(() => {
      const canvas = byId("kpHeatModalCanvas");
      if (!canvas || typeof Chart === "undefined") return;

      const c = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
          labels: series.labels,
          datasets: [
            { label: "Sessions", data: series.sessions, tension: 0.35, borderWidth: 3, yAxisID: "y" },
            { label: "Volume", data: series.volume, tension: 0.35, borderWidth: 3, yAxisID: "y1" }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: { legend: { labels: { color: "rgba(255,255,255,0.8)" } } },
          scales: {
            x: { ticks: { color: "rgba(255,255,255,0.65)" }, grid: { color: "rgba(255,255,255,0.08)" } },
            y: { beginAtZero: true, ticks: { color: "rgba(255,255,255,0.65)" }, grid: { color: "rgba(255,255,255,0.08)" } },
            y1: { beginAtZero: true, position: "right", ticks: { color: "rgba(255,255,255,0.65)" }, grid: { drawOnChartArea: false } }
          }
        }
      });

      // avoid leaks if modal reopened
      setTimeout(() => {
        try { c.destroy(); } catch {}
      }, 15000);
    }, 0);
  };

  // -------------------------
  // plan actions (global)
  // -------------------------

  window.kpPlanTemplate = function (type) {
    setPlanTemplate(type);
  };

  window.kpPlanAdd = function () {
    // no popups for deletes; prompt is ok for adding (fast + safe)
    const name = prompt("Add exercise to today’s plan:");
    if (!name || !name.trim()) return;
    addPlanItem(name);
  };

  window.kpPlanToggle = function (idx) {
    togglePlanDone(idx);
  };

  window.kpPlanRemove = function (idx) {
    // no confirm popups (you asked for none)
    removePlanItem(idx);
  };

  // -------------------------
  // PR detection + auto plan completion
  // wrap Workouts.logSet safely
  // -------------------------

  function diffPRs(before, after) {
    const wins = [];

    const all = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    all.forEach(ex => {
      const b = before?.[ex] || { volume: 0, weight: 0, reps: 0 };
      const a = after?.[ex] || { volume: 0, weight: 0, reps: 0 };

      // workout.js stores PRs as: {exercise, weight, reps, volume, date}
      const bw = Number(b.weight || 0);
      const aw = Number(a.weight || 0);
      const bv = Number(b.volume || 0);
      const av = Number(a.volume || 0);

      if (aw > bw) wins.push(`${ex}: weight PR ${aw} lbs`);
      if (av > bv) wins.push(`${ex}: volume PR ${Math.round(av).toLocaleString()}`);
    });

    return wins;
  }

  function patchLogSet() {
    if (!window.Workouts || typeof window.Workouts.logSet !== "function") return false;
    if (window.Workouts.logSet.__kpCoachWrapped) return true;

    const original = window.Workouts.logSet;

    const wrapped = function (workoutId, exerciseId, weight, reps) {
      const before = loadPRs();

      // get exercise name for plan auto-complete
      let exerciseName = "";
      try {
        const workouts = loadWorkouts();
        const w = workouts.find(x => x.id === workoutId);
        const ex = w?.exercises?.find(x => x.id === exerciseId);
        exerciseName = ex?.name || "";
      } catch {}

      const result = original.apply(this, arguments);

      // auto-complete plan item if it matches
      if (exerciseName) {
        markPlanDoneByExerciseName(exerciseName);
      }

      // PR toasts
      const after = loadPRs();
      const wins = diffPRs(before, after);
      if (wins.length) {
        toast("New PR detected");
        wins.slice(0, 2).forEach(w => toast(w));
      }

      // refresh coach panel after any log
      refreshCoach();
      return result;
    };

    wrapped.__kpCoachWrapped = true;
    window.Workouts.logSet = wrapped;
    return true;
  }

  // -------------------------
  // refresh loop
  // -------------------------

  function refreshCoach() {
    // keep panel on top, render again
    renderPanel();
  }

  function safeBoot() {
    try {
      ensurePanel();
      patchLogSet();
      renderPanel();
    } catch (e) {
      console.error("Workout Coach boot error:", e);
    }
  }

  // keep trying until workout.js loads (Workouts exists)
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    safeBoot();
    if (window.Workouts && typeof window.Workouts.logSet === "function") {
      clearInterval(timer);
    }
    if (tries > 60) clearInterval(timer);
  }, 200);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeBoot);
  } else {
    safeBoot();
  }

  window.addEventListener("focus", () => {
    try { refreshCoach(); } catch {}
  });

})();
