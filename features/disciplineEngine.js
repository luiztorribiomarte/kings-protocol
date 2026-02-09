// =====================================================
// KINGS PROTOCOL — DISCIPLINE ENGINE v1 (AGGRESSIVE MODE)
// File: features/disciplineEngine.js
// - Injects "👑 KING COMMAND CENTER" at top of Dashboard
// - Tier system: Bronze → Silver → Gold → King → Legend
// - Discipline streak + 7-day consistency
// - Forgiveness token (Shield) resets weekly (option C)
// - Pulls from existing data safely (no hard dependencies)
// - Does NOT modify other modules
// =====================================================

(function () {
  "use strict";

  const COMMAND_ID = "kpKingCommandCenter_v1";

  // Workouts storage used by your workouts system
  const WORKOUTS_KEY = "kp_workouts_v2";

  // Shield storage
  const SHIELD_KEY = "kp_discipline_shield_v1"; // { weekKey: "YYYY-MM-DD", used: true/false }

  // Optional: store computed daily discipline results so we can be consistent
  const DAY_STATUS_KEY = "kp_discipline_day_status_v1"; // { "YYYY-MM-DD": { success: true/false, reason: "..." } }

  // -----------------------------
  // Helpers
  // -----------------------------
  function byId(id) {
    return document.getElementById(id);
  }

  function safeParse(raw, fallback) {
    try {
      const v = JSON.parse(raw);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function todayKey() {
    return new Date().toISOString().split("T")[0];
  }

  // Monday-start week key (aligns with your split)
  function weekKeyMondayStart(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    // JS getDay(): Sun=0, Mon=1 ... Sat=6
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day; // if Sun, go back 6 days
    d.setDate(d.getDate() + diffToMonday);

    return d.toISOString().split("T")[0];
  }

  function getSplitForDate(date = new Date()) {
    const day = date.getDay(); // Sun=0 ... Sat=6
    // User split:
    // Mon Push, Tue Pull, Wed Legs, Thu Push, Fri Pull, Sat Rest, Sun Legs
    if (day === 1) return { label: "PUSH DAY", emoji: "💪", type: "train", short: "Push" };
    if (day === 2) return { label: "PULL DAY", emoji: "💪", type: "train", short: "Pull" };
    if (day === 3) return { label: "LEGS DAY", emoji: "🦵", type: "train", short: "Legs" };
    if (day === 4) return { label: "PUSH DAY", emoji: "💪", type: "train", short: "Push" };
    if (day === 5) return { label: "PULL DAY", emoji: "💪", type: "train", short: "Pull" };
    if (day === 6) return { label: "REST DAY", emoji: "🛡️", type: "rest", short: "Rest" };
    // Sunday
    return { label: "LEGS DAY", emoji: "🦵", type: "train", short: "Legs" };
  }

  function loadWorkouts() {
    return safeParse(localStorage.getItem(WORKOUTS_KEY), []);
  }

  function flattenWorkoutSetDates(workouts) {
    const dates = [];
    (workouts || []).forEach(w => {
      (w.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(s => {
          const k = String(s.date || "").split("T")[0];
          if (k) dates.push(k);
        });
      });
    });
    return dates;
  }

  function didWorkoutOnDay(dayISO) {
    const workouts = loadWorkouts();
    const dates = flattenWorkoutSetDates(workouts);
    return dates.includes(dayISO);
  }

  function getPlannerPercent(dayISO) {
    // Your core.js exports window.getPlannerCompletionForDay
    if (typeof window.getPlannerCompletionForDay === "function") {
      try {
        const r = window.getPlannerCompletionForDay(dayISO);
        return Number(r?.percent || 0);
      } catch {
        return 0;
      }
    }
    return 0;
  }

  function getTodoPercent(dayISO) {
    // core.js stores todoHistory + todos
    // We'll read from localStorage to avoid relying on globals
    const todoHistory = safeParse(localStorage.getItem("todoHistory"), {});
    const lastTodoDate = localStorage.getItem("lastTodoDate");
    const todos = safeParse(localStorage.getItem("todos"), []);

    if (dayISO === todayKey()) {
      const total = Array.isArray(todos) ? todos.length : 0;
      const done = Array.isArray(todos) ? todos.filter(t => t && t.done).length : 0;
      return total ? Math.round((done / total) * 100) : 0;
    }

    const entry = todoHistory?.[dayISO];
    if (!entry) return 0;
    return Number(entry.percent || 0);
  }

  function loadDayStatus() {
    return safeParse(localStorage.getItem(DAY_STATUS_KEY), {});
  }

  function saveDayStatus(map) {
    localStorage.setItem(DAY_STATUS_KEY, JSON.stringify(map));
  }

  // Discipline success logic (v1):
  // - Training day: must have workout logged that day
  // - Rest day: success if planner >= 50 OR todos >= 50 OR a workout was done anyway
  function computeDisciplineSuccessForDay(dayISO) {
    const d = new Date(dayISO + "T00:00:00");
    const split = getSplitForDate(d);
    const workout = didWorkoutOnDay(dayISO);
    const plannerPct = getPlannerPercent(dayISO);
    const todoPct = getTodoPercent(dayISO);

    if (split.type === "train") {
      return {
        success: !!workout,
        reason: workout ? "workout logged" : "training day missed",
        split
      };
    }

    const restSuccess = workout || plannerPct >= 50 || todoPct >= 50;
    return {
      success: !!restSuccess,
      reason: workout ? "workout logged (rest day)" : plannerPct >= 50 ? "planner handled" : todoPct >= 50 ? "tasks handled" : "rest day drift",
      split
    };
  }

  function computeLast7DaysKeys() {
    const keys = [];
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(t);
      d.setDate(t.getDate() - i);
      keys.push(d.toISOString().split("T")[0]);
    }
    return keys;
  }

  function computeConsistency7(dayStatusMap) {
    const keys = computeLast7DaysKeys();
    const wins = keys.filter(k => dayStatusMap?.[k]?.success).length;
    return {
      wins,
      total: keys.length,
      percent: Math.round((wins / keys.length) * 100),
      keys
    };
  }

  function computeStreakWithShield(dayStatusMap) {
    const shield = loadShield();
    const weekKey = weekKeyMondayStart(new Date());

    // Ensure shield week is current
    if (shield.weekKey !== weekKey) {
      shield.weekKey = weekKey;
      shield.used = false;
      saveShield(shield);
    }

    let streak = 0;
    let shieldUsed = !!shield.used;

    for (let i = 0; i < 180; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const k = d.toISOString().split("T")[0];

      const status = dayStatusMap?.[k];
      if (status?.success) {
        streak++;
        continue;
      }

      // Missing or failed:
      // Apply shield only if the miss is in the current week AND shield is available
      const missWeek = weekKeyMondayStart(d);
      const inCurrentWeek = missWeek === weekKey;

      if (inCurrentWeek && !shieldUsed) {
        shieldUsed = true;
        streak++; // forgiven day still counts
        continue;
      }

      break;
    }

    return { streak, shieldUsed, weekKey };
  }

  function rankFromConsistency(consistencyPercent, streak) {
    // Simple but meaningful thresholds
    // Legend requires high consistency + real streak
    if (consistencyPercent >= 98 && streak >= 21) return "LEGEND";
    if (consistencyPercent >= 90) return "KING";
    if (consistencyPercent >= 75) return "GOLD";
    if (consistencyPercent >= 60) return "SILVER";
    return "BRONZE";
  }

  function rankColor(rank) {
    if (rank === "LEGEND") return "linear-gradient(135deg, rgba(236,72,153,0.95), rgba(99,102,241,0.95))";
    if (rank === "KING") return "linear-gradient(135deg, rgba(250,204,21,0.9), rgba(245,158,11,0.9))";
    if (rank === "GOLD") return "linear-gradient(135deg, rgba(34,197,94,0.85), rgba(16,185,129,0.85))";
    if (rank === "SILVER") return "linear-gradient(135deg, rgba(148,163,184,0.85), rgba(59,130,246,0.65))";
    return "linear-gradient(135deg, rgba(239,68,68,0.85), rgba(168,85,247,0.65))";
  }

  function loadShield() {
    const v = safeParse(localStorage.getItem(SHIELD_KEY), {});
    return {
      weekKey: String(v.weekKey || ""),
      used: !!v.used
    };
  }

  function saveShield(shield) {
    localStorage.setItem(SHIELD_KEY, JSON.stringify(shield));
  }

  // -----------------------------
  // UI injection
  // -----------------------------
  function ensureCommandCenterHost() {
    const dash = byId("dashboardPage");
    if (!dash) return null;

    let el = byId(COMMAND_ID);
    if (el) return el;

    el = document.createElement("div");
    el.id = COMMAND_ID;
    el.style.marginBottom = "14px";

    // Put it at the very top of dashboard
    dash.prepend(el);
    return el;
  }

  function renderCommandCenter() {
    const host = ensureCommandCenterHost();
    if (!host) return;

    // Update day status map (compute today + recent days)
    const dayStatusMap = loadDayStatus();
    const last7 = computeLast7DaysKeys();
    const today = todayKey();

    // Compute + cache last 7 days + today (safe, deterministic)
    [...new Set([...last7, today])].forEach(k => {
      const r = computeDisciplineSuccessForDay(k);
      dayStatusMap[k] = { success: !!r.success, reason: r.reason, split: r.split?.short || "" };
    });

    saveDayStatus(dayStatusMap);

    const split = getSplitForDate(new Date());
    const workoutDoneToday = didWorkoutOnDay(today);
    const plannerToday = getPlannerPercent(today);
    const todoToday = getTodoPercent(today);

    const consistency = computeConsistency7(dayStatusMap);
    const streakInfo = computeStreakWithShield(dayStatusMap);

    // Persist shield usage state if it changed
    const shield = loadShield();
    if (shield.weekKey !== streakInfo.weekKey || shield.used !== streakInfo.shieldUsed) {
      saveShield({ weekKey: streakInfo.weekKey, used: streakInfo.shieldUsed });
    }

    const rank = rankFromConsistency(consistency.percent, streakInfo.streak);
    const shieldAvailable = !streakInfo.shieldUsed;

    // Coaching lines (aggressive but not cheesy)
    let primary = "";
    let focus = "";
    let warning = "";
    let win = "";

    if (split.type === "train") {
      primary = workoutDoneToday
        ? `✅ TRAIN COMPLETE (${split.short} Day)`
        : `${split.emoji} TRAIN HARD (${split.short} Day)`;

      focus = plannerToday >= 50 ? "✅ SCHEDULE HANDLED" : "⚠️ LOCK YOUR DAY (Planner)";
      warning = todoToday >= 50 ? "✅ TASKS MOVING" : "📵 DONT DRIFT (Finish tasks)";
      win = workoutDoneToday ? "KEEP MOMENTUM. LOG CLEAN." : "LOG WORKOUT TODAY. NO EXCUSES.";
    } else {
      primary = `🛡️ RECOVER HARD (Rest Day)`;
      focus = plannerToday >= 50 ? "✅ PLAN IS SET" : "⚠️ SET INTENTIONS (Planner)";
      warning = todoToday >= 50 ? "✅ TASKS CONTROLLED" : "📵 DONT WASTE TODAY";
      win = "WIN TODAY = PLAN + RECOVER + PREP.";
    }

    host.innerHTML = `
      <div class="habit-section" style="
        padding:18px;
        border:1px solid rgba(255,255,255,0.14);
        border-radius:18px;
        background:${rankColor(rank)};
        box-shadow: 0 16px 40px rgba(0,0,0,0.35);
      ">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap;">
          <div>
            <div style="font-weight:1000; letter-spacing:0.6px; font-size:1.05rem;">
              👑 KING COMMAND CENTER
            </div>
            <div style="margin-top:8px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
              <div style="padding:6px 10px; border-radius:999px; background:rgba(0,0,0,0.22); border:1px solid rgba(255,255,255,0.20); font-weight:1000;">
                STATUS: ${rank}
              </div>
              <div style="padding:6px 10px; border-radius:999px; background:rgba(0,0,0,0.22); border:1px solid rgba(255,255,255,0.20); font-weight:1000;">
                🔥 STREAK: ${streakInfo.streak}
              </div>
              <div style="padding:6px 10px; border-radius:999px; background:rgba(0,0,0,0.22); border:1px solid rgba(255,255,255,0.20); font-weight:1000;">
                📊 7D: ${consistency.percent}%
              </div>
              <div style="padding:6px 10px; border-radius:999px; background:rgba(0,0,0,0.22); border:1px solid rgba(255,255,255,0.20); font-weight:1000;">
                🛡️ SHIELD: ${shieldAvailable ? "AVAILABLE" : "USED"}
              </div>
            </div>
          </div>

          <button id="kpCommandRefresh" class="form-submit" style="
            background:rgba(0,0,0,0.25);
            border:1px solid rgba(255,255,255,0.22);
            font-weight:1000;
          ">
            Refresh
          </button>
        </div>

        <div style="margin-top:14px; border-top:1px solid rgba(255,255,255,0.22); padding-top:14px;">
          <div style="font-weight:1000; font-size:1.1rem;">⚠️ TODAY’S COMMAND</div>

          <div style="margin-top:10px; display:grid; gap:10px;">
            <div style="padding:12px 12px; border-radius:14px; background:rgba(0,0,0,0.20); border:1px solid rgba(255,255,255,0.18); font-weight:1000;">
              ${primary}
            </div>

            <div style="padding:12px 12px; border-radius:14px; background:rgba(0,0,0,0.20); border:1px solid rgba(255,255,255,0.18); font-weight:1000;">
              ${focus}
            </div>

            <div style="padding:12px 12px; border-radius:14px; background:rgba(0,0,0,0.20); border:1px solid rgba(255,255,255,0.18); font-weight:1000;">
              ${warning}
            </div>

            <div style="padding:12px 12px; border-radius:14px; background:rgba(0,0,0,0.26); border:1px solid rgba(255,255,255,0.22); font-weight:1100;">
              🏆 WIN CONDITION: ${win}
            </div>
          </div>

          <div style="margin-top:12px; color:rgba(255,255,255,0.92); font-weight:900;">
            Quick stats: Planner ${plannerToday}% • Tasks ${todoToday}% • Workout ${workoutDoneToday ? "LOGGED" : "NOT LOGGED"}
          </div>
        </div>
      </div>
    `;

    const btn = byId("kpCommandRefresh");
    if (btn) btn.onclick = () => renderCommandCenter();
  }

  // -----------------------------
  // Hooks: render on dashboard view
  // -----------------------------
  function isDashboardActive() {
    const page = byId("dashboardPage");
    return !!(page && page.classList.contains("active"));
  }

  function hookShowPage() {
    if (typeof window.showPage !== "function") return;
    if (window.showPage.__kpCommandWrapped) return;

    const original = window.showPage;
    window.showPage = function () {
      const res = original.apply(this, arguments);
      const page = arguments[0];
      if (page === "dashboard") {
        setTimeout(() => renderCommandCenter(), 60);
      }
      return res;
    };
    window.showPage.__kpCommandWrapped = true;
  }

  function hookNavClicks() {
    document.addEventListener("click", e => {
      const tab = e.target && e.target.closest ? e.target.closest(".nav-tab") : null;
      if (!tab) return;
      setTimeout(() => {
        if (isDashboardActive()) renderCommandCenter();
      }, 90);
    });
  }

  function boot() {
    hookShowPage();
    hookNavClicks();

    // If user loads straight into dashboard
    setTimeout(() => {
      if (isDashboardActive()) renderCommandCenter();
    }, 140);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Optional debug API
  window.KPDiscipline = {
    render: renderCommandCenter
  };
})();
