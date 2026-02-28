/* features/notifications.js — KINGS PROTOCOL
   Smart daily banner: reads today's schedule, checks what's done,
   shows max 3 relevant reminders. One dismiss per day. Non-intrusive.
*/

(function () {
  "use strict";

  const STORE_DISMISSED = "kpNotifDismissed"; // stores the date it was dismissed

  function pad(n) { return String(n).padStart(2, "0"); }
  function todayKey(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function safeParse(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  }

  const DOW = new Date().getDay(); // 0=Sun … 6=Sat

  // ── WHAT TO CHECK ─────────────────────────────────────────────────────────

  // Looksmaxx completions
  function lmDone(id) {
    const data = safeParse("looksmaxxCompletions", {});
    return !!(data?.[todayKey()]?.[id]);
  }

  // Habit completions (uses habits.js data)
  function habitDone(id) {
    const completions = safeParse("habitCompletions", {});
    return !!(completions?.[todayKey()]?.[id]);
  }

  // Find a habit by partial name match (case-insensitive)
  function findHabitByName(fragment) {
    const habits = safeParse("habits", []);
    return habits.find(h =>
      h.name.toLowerCase().includes(fragment.toLowerCase())
    );
  }

  function habitDoneByName(fragment) {
    const h = findHabitByName(fragment);
    return h ? habitDone(h.id) : false;
  }

  // ── BUILD TODAY'S REMINDERS ───────────────────────────────────────────────

  function getReminders() {
    const reminders = [];

    // 1. SPRINT DAY — Tue(2) Thu(4) Sat(6)
    if ([2, 4, 6].includes(DOW)) {
      const sprintLog = safeParse("looksmaxxSprintLog", []);
      const lastSprint = sprintLog.length ? sprintLog[sprintLog.length - 1] : null;
      const alreadyDoneToday = lastSprint?.date === todayKey();
      if (!alreadyDoneToday) {
        reminders.push({
          icon: "🚴",
          title: "Sprint Day",
          detail: "Stationary bike session on the schedule today.",
          action: "looksmaxxing",
          actionLabel: "Go log it",
          urgency: "high",
        });
      }
    }

    // 2. NECK TRAINING DAY — Mon(1) Wed(3) Fri(5)
    if ([1, 3, 5].includes(DOW)) {
      const neckDone = lmDone("lm_neck_curls") || lmDone("lm_neck_bridges");
      if (!neckDone) {
        reminders.push({
          icon: "💪",
          title: "Neck Training Day",
          detail: "Weighted curls + bridges on the schedule today.",
          action: "looksmaxxing",
          actionLabel: "Open Looksmaxxing",
          urgency: "medium",
        });
      }
    }

    // 3. WORKOUT — check habit named "work out" / "workout" / "morning exercise"
    const workoutDone = habitDoneByName("work out") || habitDoneByName("workout") || habitDoneByName("morning exercise");
    if (!workoutDone && findHabitByName("work")) {
      reminders.push({
        icon: "🏋️",
        title: "Log Your Workout",
        detail: "Workout habit not checked off yet today.",
        action: "workout",
        actionLabel: "Open Workouts",
        urgency: "medium",
      });
    }

    // 4. READ — check habit named "read"
    const readDone = habitDoneByName("read");
    if (!readDone && findHabitByName("read")) {
      reminders.push({
        icon: "📖",
        title: "Read Today",
        detail: "Reading habit not checked off yet.",
        action: "dashboard",
        actionLabel: "Mark done",
        urgency: "low",
      });
    }

    // 5. MORNING SKIN — AM cleanser not done and it's before 2pm
    const hour = new Date().getHours();
    if (hour < 14 && !lmDone("lm_am_cleanser")) {
      reminders.push({
        icon: "✨",
        title: "Morning Skin Routine",
        detail: "AM routine not logged yet — cleanser, ice, vitamin C, tallow.",
        action: "looksmaxxing",
        actionLabel: "Open Skin",
        urgency: "low",
      });
    }

    // 6. SUPPLEMENTS — vitamin d not checked
    if (!lmDone("lm_supp_vitd")) {
      reminders.push({
        icon: "💊",
        title: "Morning Supplements",
        detail: "Vitamin D, Zinc, Creatine, Ashwagandha — not logged yet.",
        action: "looksmaxxing",
        actionLabel: "Log them",
        urgency: "low",
      });
    }

    // 7. YouTube work
    const ytDone = habitDoneByName("youtube") || habitDoneByName("content");
    if (!ytDone && (findHabitByName("youtube") || findHabitByName("content"))) {
      reminders.push({
        icon: "🎬",
        title: "YouTube Work",
        detail: "Content creation habit not logged yet.",
        action: "content",
        actionLabel: "Open Content",
        urgency: "low",
      });
    }

    // Cap at 3 — prioritize high > medium > low, then first-come
    const order = { high: 0, medium: 1, low: 2 };
    reminders.sort((a, b) => order[a.urgency] - order[b.urgency]);
    return reminders.slice(0, 3);
  }

  // ── RENDER BANNER ─────────────────────────────────────────────────────────

  function renderNotifications() {
    // Remove any existing banner
    document.getElementById("kpNotifBanner")?.remove();

    // Already dismissed today?
    const dismissed = safeParse(STORE_DISMISSED, null);
    if (dismissed === todayKey()) return;

    const reminders = getReminders();
    if (!reminders.length) return; // nothing to show — all done!

    const urgencyColor = { high: "#f97316", medium: "#a78bfa", low: "#6b7280" };
    const urgencyBorder = { high: "rgba(249,115,22,0.35)", medium: "rgba(167,139,250,0.3)", low: "rgba(255,255,255,0.1)" };

    const banner = document.createElement("div");
    banner.id = "kpNotifBanner";
    banner.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      width: min(420px, calc(100vw - 32px));
      z-index: 9999;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.12);
      background: linear-gradient(160deg, rgba(15,15,20,0.97), rgba(20,18,28,0.97));
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset;
      padding: 16px;
      font-family: inherit;
      animation: kpSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
    `;

    // Inject keyframes once
    if (!document.getElementById("kpNotifStyles")) {
      const style = document.createElement("style");
      style.id = "kpNotifStyles";
      style.textContent = `
        @keyframes kpSlideUp {
          from { opacity:0; transform:translateX(-50%) translateY(20px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
        @keyframes kpSlideDown {
          from { opacity:1; transform:translateX(-50%) translateY(0); }
          to   { opacity:0; transform:translateX(-50%) translateY(20px); }
        }
        #kpNotifBanner:hover { box-shadow: 0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1) inset; }
      `;
      document.head.appendChild(style);
    }

    banner.innerHTML = `
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="font-size:0.72rem; font-weight:900; letter-spacing:0.1em; color:#6b7280; text-transform:uppercase;">
          Today's Reminders
        </div>
        <button id="kpNotifDismiss" style="
          width:26px; height:26px; border-radius:50%;
          border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.06);
          color:#6b7280; font-size:0.85rem; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition:all 0.15s;
        " title="Dismiss for today">✕</button>
      </div>

      <!-- Reminder items -->
      <div style="display:grid; gap:8px;">
        ${reminders.map(r => `
          <div onclick="kpNotifNavigate('${r.action}')" style="
            display:flex; align-items:center; gap:12px;
            padding:11px 13px; border-radius:13px; cursor:pointer;
            border:1px solid ${urgencyBorder[r.urgency]};
            background:rgba(255,255,255,0.03);
            transition:background 0.15s;
          "
          onmouseover="this.style.background='rgba(255,255,255,0.06)'"
          onmouseout="this.style.background='rgba(255,255,255,0.03)'">
            <div style="
              width:36px; height:36px; border-radius:10px; flex-shrink:0;
              background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
              display:flex; align-items:center; justify-content:center; font-size:1.1rem;
            ">${r.icon}</div>
            <div style="flex:1; min-width:0;">
              <div style="font-weight:800; font-size:0.9rem; color:#e5e7eb;">${r.title}</div>
              <div style="font-size:0.78rem; color:#6b7280; margin-top:2px; line-height:1.3;">${r.detail}</div>
            </div>
            <div style="font-size:0.75rem; font-weight:800; color:${urgencyColor[r.urgency]}; white-space:nowrap; flex-shrink:0;">
              ${r.actionLabel} →
            </div>
          </div>
        `).join("")}
      </div>

      <!-- Footer -->
      <div style="margin-top:10px; text-align:center; font-size:0.72rem; color:#374151;">
        Tap a reminder to go there · Dismiss to hide for today
      </div>
    `;

    document.body.appendChild(banner);

    // Dismiss button
    document.getElementById("kpNotifDismiss").addEventListener("click", () => {
      dismissBanner();
    });
  }

  function dismissBanner() {
    const banner = document.getElementById("kpNotifBanner");
    if (!banner) return;
    banner.style.animation = "kpSlideDown 0.25s ease forwards";
    setTimeout(() => banner.remove(), 260);
    localStorage.setItem(STORE_DISMISSED, JSON.stringify(todayKey()));
  }

  window.kpNotifNavigate = function(page) {
    dismissBanner();
    setTimeout(() => {
      if (typeof window.showPage === "function") window.showPage(page);
    }, 150);
  };

  // ── INIT ──────────────────────────────────────────────────────────────────
  // Show banner when dashboard loads, and re-evaluate if habits update

  function init() {
    // Show on dashboard load
    if (window.App) {
      window.App.on("dashboard", () => {
        // Small delay so habits data is loaded first
        setTimeout(renderNotifications, 600);
      });
    }

    // Re-evaluate when habits are toggled (dismiss stays, but if somehow
    // user finishes everything mid-session the banner disappears)
    window.addEventListener("habitsUpdated", () => {
      const dismissed = safeParse(STORE_DISMISSED, null);
      if (dismissed === todayKey()) return; // already dismissed, don't re-show
      const existing = document.getElementById("kpNotifBanner");
      if (existing) {
        // Silently refresh content
        const reminders = getReminders();
        if (!reminders.length) {
          // Everything done — animate away
          existing.style.animation = "kpSlideDown 0.25s ease forwards";
          setTimeout(() => existing.remove(), 260);
        }
      }
    });
  }

  init();
  window.renderNotifications = renderNotifications;

})();
