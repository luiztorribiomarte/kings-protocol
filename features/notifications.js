/* features/notifications.js — KINGS PROTOCOL
   Two daily banners:
   - 6 AM  Morning Briefing  → everything scheduled for today (ignore completion)
   - 8 PM  Evening Check-in  → only what's still NOT done today
   Each banner dismisses for its own session (morning dismiss ≠ evening dismiss).
   Banner re-appears once the next time window opens.
*/

(function () {
  "use strict";

  const STORE_DISMISSED = "kpNotifDismissed"; // { morning: "YYYY-MM-DD", evening: "YYYY-MM-DD" }

  function pad(n) { return String(n).padStart(2, "0"); }
  function todayKey(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function safeParse(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  }

  const NOW  = new Date();
  const HOUR = NOW.getHours();
  const DOW  = NOW.getDay(); // 0=Sun … 6=Sat
  const TODAY = todayKey();

  // Which window are we in?
  // Morning: 6:00 – 11:59
  // Evening: 20:00 – 23:59
  // Outside those hours: no banner
  function getWindow() {
    if (HOUR >= 6  && HOUR < 12) return "morning";
    if (HOUR >= 20 && HOUR < 24) return "evening";
    return null;
  }

  // ── STORAGE ───────────────────────────────────────────────────────────────

  function getDismissed() { return safeParse(STORE_DISMISSED, {}); }

  function isDismissedToday(windowName) {
    return getDismissed()[windowName] === TODAY;
  }

  function dismissWindow(windowName) {
    const d = getDismissed();
    d[windowName] = TODAY;
    localStorage.setItem(STORE_DISMISSED, JSON.stringify(d));
  }

  // ── DATA HELPERS ──────────────────────────────────────────────────────────

  function lmDone(id) {
    const data = safeParse("looksmaxxCompletions", {});
    return !!(data?.[TODAY]?.[id]);
  }

  function habitDoneById(id) {
    const completions = safeParse("habitCompletions", {});
    return !!(completions?.[TODAY]?.[id]);
  }

  function findHabit(fragment) {
    const habits = safeParse("habits", []);
    return habits.find(h => h.name.toLowerCase().includes(fragment.toLowerCase()));
  }

  function habitDoneByName(fragment) {
    const h = findHabit(fragment);
    return h ? habitDoneById(h.id) : false;
  }

  function sprintDoneToday() {
    const log = safeParse("looksmaxxSprintLog", []);
    return log.length > 0 && log[log.length - 1].date === TODAY;
  }

  function workoutDoneToday() {
    const list = safeParse("kp_workouts_v2", []);
    if (!Array.isArray(list)) return false;
    for (const w of list) {
      if (w.status !== "completed") continue;
      for (const ex of w.exercises || []) {
        for (const s of ex.sets || []) {
          if (String(s?.date || "").split("T")[0] === TODAY) return true;
        }
      }
    }
    return false;
  }

  // ── ITEM DEFINITIONS ──────────────────────────────────────────────────────
  // Each item: { icon, title, detail, page, isScheduledToday(), isDoneToday() }

  function buildAllItems() {
    const isNeckDay   = [1,3,5].includes(DOW);
    const isSprintDay = [2,4,6].includes(DOW);
    const isSalDay    = [1,3,5].includes(DOW);
    const DOW_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    const items = [];

    // ── MORNING PROTOCOL ──────────────────────────────────────────────────

    items.push({
      icon: "🌅",
      title: "Wake Up & Morning Sunlight",
      detail: "Get outside within 30min of waking. Sets your circadian rhythm.",
      page: "dashboard",
      scheduled: true,
      done: () => habitDoneByName("sunlight") || habitDoneByName("sun") || habitDoneByName("wake"),
    });

    items.push({
      icon: "✨",
      title: "Morning Skin Routine",
      detail: "Cleanser → Ice → Vitamin C → Beef Tallow. Exact order.",
      page: "looksmaxxing",
      scheduled: true,
      done: () => lmDone("lm_am_cleanser") && lmDone("lm_am_vitc") && lmDone("lm_am_tallow"),
    });

    items.push({
      icon: "💊",
      title: "Morning Supplements",
      detail: "Vitamin D · Zinc · Creatine · Ashwagandha — take with food.",
      page: "looksmaxxing",
      scheduled: true,
      done: () => lmDone("lm_supp_vitd") && lmDone("lm_supp_zinc") && lmDone("lm_supp_creatine") && lmDone("lm_supp_ashwagandha"),
    });

    // ── TRAINING ──────────────────────────────────────────────────────────

    items.push({
      icon: "🏋️",
      title: "Workout",
      detail: "Push/Pull/Legs — log your session.",
      page: "workout",
      scheduled: true,
      done: () => workoutDoneToday() || habitDoneByName("work out") || habitDoneByName("workout") || habitDoneByName("morning exercise"),
    });

    if (isNeckDay) {
      items.push({
        icon: "💪",
        title: `Neck Training Day — ${DOW_NAMES[DOW]}`,
        detail: "Weighted curls · Neck bridges · Trap shrugs. Heavy.",
        page: "looksmaxxing",
        scheduled: true,
        done: () => lmDone("lm_neck_curls") && lmDone("lm_neck_bridges"),
      });
    }

    if (isSprintDay) {
      items.push({
        icon: "🚴",
        title: `Sprint Day — ${DOW_NAMES[DOW]}`,
        detail: "Stationary bike session. 48hr rule — don't skip.",
        page: "looksmaxxing",
        scheduled: true,
        done: () => sprintDoneToday(),
      });
    }

    // ── NECK ISOMETRICS — every day ────────────────────────────────────────

    items.push({
      icon: "🦾",
      title: "Neck Isometrics",
      detail: "All 4 directions · 3×20sec each. Daily — no excuses.",
      page: "looksmaxxing",
      scheduled: true,
      done: () => lmDone("lm_neck_iso"),
    });

    // ── FACIAL ────────────────────────────────────────────────────────────

    items.push({
      icon: "😮",
      title: "Mewing + Jaw Work",
      detail: "Mewing all day · Gum chewing 30min · Cheek lifts · Chin tucks.",
      page: "looksmaxxing",
      scheduled: true,
      done: () => lmDone("lm_mewing") && lmDone("lm_jaw_gum") && lmDone("lm_cheek_lifts") && lmDone("lm_chin_tucks"),
    });

    // ── MIND ──────────────────────────────────────────────────────────────

    const readHabit = findHabit("read");
    if (readHabit) {
      items.push({
        icon: "📖",
        title: "Read Today",
        detail: `${readHabit.icon} ${readHabit.name} — check it off.`,
        page: "dashboard",
        scheduled: true,
        done: () => habitDoneById(readHabit.id),
      });
    }

    const meditateHabit = findHabit("meditat");
    if (meditateHabit) {
      items.push({
        icon: "🧘",
        title: "Meditation",
        detail: `${meditateHabit.icon} ${meditateHabit.name}`,
        page: "dashboard",
        scheduled: true,
        done: () => habitDoneById(meditateHabit.id),
      });
    }

    const journalHabit = findHabit("journal") || findHabit("reflect");
    if (journalHabit) {
      items.push({
        icon: "📝",
        title: "Journal / Reflect",
        detail: `${journalHabit.icon} ${journalHabit.name}`,
        page: "dashboard",
        scheduled: true,
        done: () => habitDoneById(journalHabit.id),
      });
    }

    // ── YOUTUBE / CONTENT ─────────────────────────────────────────────────

    const ytHabit = findHabit("youtube") || findHabit("content");
    if (ytHabit) {
      items.push({
        icon: "🎬",
        title: "YouTube Work",
        detail: `${ytHabit.icon} ${ytHabit.name} — 2hr minimum.`,
        page: "content",
        scheduled: true,
        done: () => habitDoneById(ytHabit.id),
      });
    }

    // ── EVENING ──────────────────────────────────────────────────────────

    items.push({
      icon: "🌙",
      title: "Night Skin Routine",
      detail: isSalDay
        ? "Cleanser → Salicylic Acid → Moisturizer → Gua Sha."
        : "Cleanser → Moisturizer → Gua Sha.",
      page: "looksmaxxing",
      scheduled: true,
      done: () => lmDone("lm_pm_cleanser") && lmDone("lm_pm_moisturizer") && lmDone("lm_pm_guasha"),
    });

    items.push({
      icon: "💤",
      title: "Night Supplements",
      detail: "Magnesium 400mg — before bed for deep sleep.",
      page: "looksmaxxing",
      scheduled: true,
      done: () => lmDone("lm_supp_magnesium"),
    });

    items.push({
      icon: "🦷",
      title: "Dental + Grooming",
      detail: "Electric toothbrush + floss. Face massage before sleep.",
      page: "looksmaxxing",
      scheduled: true,
      done: () => lmDone("lm_teeth_brush") && lmDone("lm_teeth_floss") && lmDone("lm_face_massage"),
    });

    return items;
  }

  // ── BANNER BUILDER ────────────────────────────────────────────────────────

  function renderBanner(windowName, items) {
    document.getElementById("kpNotifBanner")?.remove();

    if (!items.length) return;

    const isMorning = windowName === "morning";

    const title   = isMorning ? "☀️ Morning Briefing" : "🌙 Evening Check-in";
    const subtitle = isMorning
      ? "Everything on your plate today."
      : "Still not done — close the day strong.";

    // Inject styles once
    if (!document.getElementById("kpNotifStyles")) {
      const style = document.createElement("style");
      style.id = "kpNotifStyles";
      style.textContent = `
        @keyframes kpSlideUp {
          from { opacity:0; transform:translateX(-50%) translateY(24px) scale(0.97); }
          to   { opacity:1; transform:translateX(-50%) translateY(0)    scale(1);    }
        }
        @keyframes kpSlideDown {
          from { opacity:1; transform:translateX(-50%) translateY(0)    scale(1);    }
          to   { opacity:0; transform:translateX(-50%) translateY(24px) scale(0.97); }
        }
        #kpNotifBanner .kp-notif-row:hover { background:rgba(255,255,255,0.07) !important; }
        #kpNotifDismiss:hover { background:rgba(255,255,255,0.12) !important; border-color:rgba(255,255,255,0.25) !important; }
      `;
      document.head.appendChild(style);
    }

    const accentColor  = isMorning ? "#f59e0b" : "#a78bfa";
    const accentBorder = isMorning ? "rgba(245,158,11,0.35)" : "rgba(167,139,250,0.3)";
    const accentBg     = isMorning ? "rgba(245,158,11,0.08)" : "rgba(167,139,250,0.08)";

    const banner = document.createElement("div");
    banner.id = "kpNotifBanner";
    banner.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      width: min(460px, calc(100vw - 28px));
      z-index: 9999;
      border-radius: 22px;
      border: 1px solid ${accentBorder};
      background: linear-gradient(160deg, rgba(13,12,20,0.98), rgba(18,16,28,0.98));
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.07);
      font-family: inherit;
      animation: kpSlideUp 0.35s cubic-bezier(0.34,1.4,0.64,1) both;
      overflow: hidden;
    `;

    // Build item rows
    const rows = items.map(item => {
      const done = item.done();
      return `
        <div class="kp-notif-row" onclick="kpNotifGo('${item.page}')" style="
          display:flex; align-items:center; gap:12px;
          padding:11px 16px; cursor:pointer;
          border-top:1px solid rgba(255,255,255,0.05);
          background:transparent; transition:background 0.15s;
        ">
          <div style="
            width:38px; height:38px; border-radius:10px; flex-shrink:0;
            background:${done ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)"};
            border:1px solid ${done ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.1)"};
            display:flex; align-items:center; justify-content:center; font-size:1.1rem;
          ">${item.icon}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:800; font-size:0.9rem; color:${done ? "#86efac" : "#e5e7eb"};">
              ${done ? "✓ " : ""}${item.title}
            </div>
            <div style="font-size:0.76rem; color:#6b7280; margin-top:2px; line-height:1.3;">${item.detail}</div>
          </div>
          ${!done ? `<div style="font-size:0.72rem; font-weight:800; color:${accentColor}; white-space:nowrap; flex-shrink:0;">Go →</div>` : ""}
        </div>
      `;
    }).join("");

    banner.innerHTML = `
      <!-- Header -->
      <div style="
        display:flex; justify-content:space-between; align-items:center;
        padding:14px 16px 12px;
        background:${accentBg};
        border-bottom:1px solid ${accentBorder};
      ">
        <div>
          <div style="font-weight:900; font-size:1rem; color:${accentColor};">${title}</div>
          <div style="font-size:0.78rem; color:#9ca3af; margin-top:2px;">${subtitle}</div>
        </div>
        <button id="kpNotifDismiss" style="
          width:28px; height:28px; border-radius:50%; flex-shrink:0;
          border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.06);
          color:#6b7280; font-size:0.85rem; cursor:pointer;
          display:flex; align-items:center; justify-content:center; transition:all 0.15s;
        " title="Dismiss">✕</button>
      </div>

      <!-- Scrollable item list -->
      <div style="max-height:55vh; overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.1) transparent;">
        ${rows}
      </div>

      <!-- Footer -->
      <div style="padding:10px 16px; text-align:center; font-size:0.72rem; color:#374151; border-top:1px solid rgba(255,255,255,0.05);">
        Tap any item to navigate · ✕ to dismiss for this session
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById("kpNotifDismiss").addEventListener("click", () => {
      closeBanner(windowName);
    });
  }

  function closeBanner(windowName) {
    const banner = document.getElementById("kpNotifBanner");
    if (!banner) return;
    banner.style.animation = "kpSlideDown 0.25s ease forwards";
    setTimeout(() => banner.remove(), 260);
    dismissWindow(windowName);
  }

  window.kpNotifGo = function(page) {
    const win = getWindow();
    if (win) closeBanner(win);
    setTimeout(() => {
      if (typeof window.showPage === "function") window.showPage(page);
    }, 150);
  };

  // ── MAIN LOGIC ────────────────────────────────────────────────────────────

  function evaluate() {
    const win = getWindow();
    if (!win) return; // outside 6-11am or 8-11pm — do nothing

    if (isDismissedToday(win)) return; // already dismissed this session today

    const allItems = buildAllItems();

    let visibleItems;
    if (win === "morning") {
      // Morning: show EVERYTHING scheduled today, regardless of completion
      visibleItems = allItems.filter(item => item.scheduled);
    } else {
      // Evening: show only incomplete items
      visibleItems = allItems.filter(item => !item.done());
    }

    if (!visibleItems.length) return; // everything done — nothing to show

    renderBanner(win, visibleItems);
  }

  // ── INIT ──────────────────────────────────────────────────────────────────

  function init() {
    if (window.App) {
      window.App.on("dashboard", () => setTimeout(evaluate, 700));
    }

    // When habits update, silently refresh evening banner item states
    window.addEventListener("habitsUpdated", () => {
      const banner = document.getElementById("kpNotifBanner");
      if (!banner) return;
      const win = getWindow();
      if (win === "evening") {
        // Re-evaluate — if everything is done now, close it
        const undone = buildAllItems().filter(item => !item.done());
        if (!undone.length) {
          banner.style.animation = "kpSlideDown 0.25s ease forwards";
          setTimeout(() => banner.remove(), 260);
        }
      }
    });
  }

  init();
  window.renderNotifications = evaluate;

})();
