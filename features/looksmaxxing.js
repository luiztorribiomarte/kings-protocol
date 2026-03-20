/* features/looksmaxxing.js — KINGS PROTOCOL
   4 tabs: Facial & Neck | Skin & Grooming | Conditioning | Progress
   Smart day-awareness: neck days Mon/Wed/Fri, sprints Tue/Thu/Sat, salicylic Mon/Wed/Fri
*/

(function () {
  "use strict";

  const App = window.App;
  const STORE_COMPLETIONS = "looksmaxxCompletions";
  const STORE_NECK        = "looksmaxxNeckLog";
  const STORE_SPRINT      = "looksmaxxSprintLog";
  const STORE_NOTES       = "looksmaxxWeeklyNotes";
  const STORE_WEIGHT      = "looksmaxxWeightLog";
  const STORE_HEIGHT      = "looksmaxxHeight";

  let activeTab = "facial";

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  function pad(n) { return String(n).padStart(2, "0"); }

  function todayKey(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function safeParse(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  }

  // Day-of-week helpers: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  const DOW = new Date().getDay();
  const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  // Neck weighted: Mon/Wed/Fri
  const NECK_DAYS   = [1, 3, 5];
  // Sprint: Tue/Fri/Sun (per protocol)
  const SPRINT_DAYS = [2, 5, 0];
  // Salicylic: Mon/Wed/Fri
  const SAL_DAYS    = [1, 3, 5];

  function scheduleStatus(days) {
    const isToday = days.includes(DOW);
    if (isToday) return { isToday: true, nextDay: null };
    for (let i = 1; i <= 7; i++) {
      if (days.includes((DOW + i) % 7)) {
        return { isToday: false, nextDay: DAY_NAMES[(DOW + i) % 7] };
      }
    }
    return { isToday: false, nextDay: null };
  }

  function dayScheduleBadge(scheduledDays) {
    const { isToday, nextDay } = scheduleStatus(scheduledDays);
    const labels = scheduledDays.map(d => DAY_NAMES[d]).join(" · ");
    if (isToday) {
      return `<span style="font-size:0.72rem; padding:2px 8px; border-radius:20px; background:rgba(34,197,94,0.15); border:1px solid rgba(34,197,94,0.35); color:#86efac; font-weight:800;">✅ Today · ${labels}</span>`;
    }
    return `<span style="font-size:0.72rem; padding:2px 8px; border-radius:20px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#6b7280; font-weight:700;">Next: ${nextDay} · ${labels}</span>`;
  }

  function scheduleBanner(days, label) {
    const { isToday, nextDay } = scheduleStatus(days);
    const labels = days.map(d => DAY_NAMES[d]).join(" / ");
    if (isToday) {
      return `<div style="padding:10px 14px; border-radius:10px; background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.25); color:#86efac; font-size:0.82rem; margin-bottom:12px; font-weight:800;">✅ Today is a ${label} day &nbsp;·&nbsp; ${labels}</div>`;
    }
    return `<div style="padding:10px 14px; border-radius:10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:#6b7280; font-size:0.82rem; margin-bottom:12px;">⏭️ No ${label} today — next: <strong style="color:#9ca3af;">${nextDay}</strong> &nbsp;·&nbsp; ${labels}</div>`;
  }

  // ─── COMPLETIONS ──────────────────────────────────────────────────────────

  function getCompletions() { return safeParse(STORE_COMPLETIONS, {}); }
  function saveCompletions(d) { localStorage.setItem(STORE_COMPLETIONS, JSON.stringify(d)); }

  function isChecked(itemId, dateKey = todayKey()) {
    return !!(getCompletions()?.[dateKey]?.[itemId]);
  }

  function toggleItem(itemId) {
    const data = getCompletions();
    const k = todayKey();
    if (!data[k]) data[k] = {};
    data[k][itemId] = !data[k][itemId];
    saveCompletions(data);
    renderLooksmaxxing();
  }
  window.lmToggle = toggleItem;

  function getStreak(itemId) {
    const data = getCompletions();
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (data?.[todayKey(d)]?.[itemId]) streak++;
      else break;
    }
    return streak;
  }

  function getWeekCount(itemId) {
    const data = getCompletions();
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (data?.[todayKey(d)]?.[itemId]) count++;
    }
    return count;
  }

  // ─── CHECKLIST RENDERER ───────────────────────────────────────────────────

  function renderChecklist(items) {
    return items.map(item => {
      const checked  = isChecked(item.id);
      const streak   = getStreak(item.id);
      const weekCount = item.weeklyTarget ? getWeekCount(item.id) : null;
      const notToday = item.scheduledDays && !item.scheduledDays.includes(DOW);

      return `
        <div onclick="${notToday ? "" : `lmToggle('${item.id}')`}" style="
          display:flex; align-items:flex-start; gap:14px;
          padding:14px 16px; border-radius:14px;
          cursor:${notToday ? "default" : "pointer"};
          border:1px solid ${checked ? "rgba(34,197,94,0.3)" : notToday ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)"};
          background:${checked ? "rgba(34,197,94,0.06)" : notToday ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)"};
          opacity:${notToday ? "0.4" : "1"};
          margin-bottom:8px; transition:all 0.15s;
        ">
          <div style="
            width:22px; height:22px; border-radius:6px; flex-shrink:0; margin-top:1px;
            border:2px solid ${checked ? "#22c55e" : "rgba(255,255,255,0.2)"};
            background:${checked ? "#22c55e" : "transparent"};
            display:flex; align-items:center; justify-content:center;
            font-size:0.75rem; color:white; font-weight:900;
          ">${checked ? "✓" : ""}</div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-weight:800; color:${checked ? "#86efac" : "#e5e7eb"};">${item.name}</span>
              ${item.scheduledDays
                ? dayScheduleBadge(item.scheduledDays)
                : item.freq ? `<span style="font-size:0.72rem; padding:2px 8px; border-radius:20px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.25); color:#a78bfa; font-weight:700;">${item.freq}</span>` : ""}
              ${streak >= 3 ? `<span style="font-size:0.72rem; color:#f59e0b; font-weight:800;">🔥 ${streak}d</span>` : ""}
              ${weekCount !== null ? `<span style="font-size:0.72rem; color:#9ca3af;">${weekCount}/${item.weeklyTarget}x this week</span>` : ""}
            </div>
            ${item.detail ? `<div style="font-size:0.82rem; color:#6b7280; margin-top:3px; line-height:1.4;">${item.detail}</div>` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  // ─── UI HELPERS ───────────────────────────────────────────────────────────

  function sectionHeader(title, subtitle = "") {
    return `
      <div style="margin:20px 0 12px;">
        <div style="font-weight:900; font-size:1rem; color:#e5e7eb; letter-spacing:0.04em; text-transform:uppercase;">${title}</div>
        ${subtitle ? `<div style="font-size:0.82rem; color:#6b7280; margin-top:2px;">${subtitle}</div>` : ""}
      </div>
    `;
  }

  function warningCard(text) {
    return `<div style="padding:12px 14px; border-radius:12px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); color:#fcd34d; font-size:0.85rem; font-weight:700; margin-bottom:12px;">⚠️ ${text}</div>`;
  }

  function infoCard(text) {
    return `<div style="padding:12px 14px; border-radius:12px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2); color:#a78bfa; font-size:0.85rem; line-height:1.5; margin-bottom:12px;">💡 ${text}</div>`;
  }

  // ─── TAB 1: FACIAL & NECK ─────────────────────────────────────────────────

  function renderFacialTab() {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const neckYest  = ["lm_neck_curls","lm_neck_bridges"].some(id => isChecked(id, todayKey(yesterday)));

    const neckWeighted = [
      { id: "lm_neck_curls",   name: "Weighted Neck Curls", detail: "4 directions · 4×15 reps",  scheduledDays: NECK_DAYS, weeklyTarget: 3 },
      { id: "lm_neck_bridges", name: "Neck Bridges",        detail: "3×30sec holds",              scheduledDays: NECK_DAYS, weeklyTarget: 3 },
      { id: "lm_trap_shrugs",  name: "Trap Shrugs",         detail: "Heavy · 4×12",               scheduledDays: [1, 5],   weeklyTarget: 2 },
    ];
    const neckDaily = [
      { id: "lm_neck_iso", name: "Isometric Holds", detail: "All 4 directions · 3×20sec each · builds thickness + fixes posture", freq: "Daily" },
    ];
    const facial = [
      { id: "lm_mewing",       name: "Mewing",           detail: "Tongue fully on roof of mouth ALL DAY including back third — constant background habit, not just a few minutes.", freq: "All Day" },
      { id: "lm_jaw_gum",      name: "Mastic Gum",       detail: "30-45 min · both sides evenly · stop if TMJ pain develops",                                                      freq: "Daily" },
      { id: "lm_jaw_device",   name: "Jawliner Device",  detail: "10-15 min daily when available · stop immediately if TMJ pain",                                                   freq: "Daily" },
      { id: "lm_cheek_lifts",  name: "Cheek Lifts",      detail: "Smile wide, eyes neutral · 3×20 reps",                                                                           freq: "Daily" },
      { id: "lm_chin_tucks",   name: "Chin Tucks",       detail: "3×10 reps · hold 5-10 sec each · do against wall for feedback · AM + PM",                                        freq: "2x Daily" },
      { id: "lm_face_massage", name: "Face Massage",     detail: "5min lymphatic drainage · nightly before bed",                                                                    freq: "Daily" },
    ];

    return `
      ${sectionHeader("Neck Training", "Weighted Mon/Wed/Fri — isometrics every day.")}
      ${scheduleBanner(NECK_DAYS, "neck training")}
      ${neckYest ? warningCard("Neck trained yesterday — do isometrics only today. Skip weighted work.") : ""}
      ${renderChecklist(neckWeighted)}
      ${renderChecklist(neckDaily)}

      ${sectionHeader("Facial Exercises", "Daily — consistency over months is what creates change.")}
      ${infoCard("Best under 12% body fat. Stay lean to reveal bone structure.")}
      ${renderChecklist(facial)}
    `;
  }

  // ─── TAB 2: SKIN & GROOMING ───────────────────────────────────────────────

  function renderSkinTab() {
    const isSalDay = SAL_DAYS.includes(DOW);

    // AM: Cleanser → Ice Face → Caffeine Eye Cream → Vitamin C → Hyaluronic Acid → Moisturizer → SPF
    const amRoutine = [
      { id: "lm_am_cleanser",   name: "① Cleanser",              detail: "Gentle wash — pat dry",                                                                        freq: "AM" },
      { id: "lm_am_ice",        name: "② Ice Face",              detail: "2 min · focus under eyes · de-puffs, tightens pores · AM ONLY",                               freq: "AM" },
      { id: "lm_am_caffeine",   name: "③ Caffeine Eye Cream",    detail: "Targets puffiness and dark circles under eyes",                                                freq: "AM" },
      { id: "lm_am_vitc",       name: "④ Vitamin C Serum",       detail: "Brightens, evens tone, collagen — wait 5min. AM ONLY. Do NOT use with GHK-Cu.",               freq: "AM" },
      { id: "lm_am_hyaluronic", name: "⑤ Hyaluronic Acid",       detail: "Apply to damp skin for max absorption — locks in hydration",                                  freq: "AM" },
      { id: "lm_am_moisturizer",name: "⑥ Moisturizer",           detail: "Seals the AM routine",                                                                        freq: "AM" },
      { id: "lm_am_spf",        name: "⑦ SPF",                   detail: "Non-negotiable. Every single day, even indoors. Reapply if outside.",                         freq: "AM" },
    ];

    // PM: Cleanser → (Salicylic if day) → Niacinamide Under Eye → GHK-Cu → Moisturizer
    const pmBase = [
      { id: "lm_pm_cleanser", name: "① Cleanser", detail: "Double cleanse if wore SPF — remove all product first", freq: "PM" },
    ];
    const pmSal = [
      { id: "lm_pm_salicylic", name: "② Salicylic Acid", detail: "The Ordinary — exfoliates, unclogs pores. 3x/week MAX — more will strip barrier.", scheduledDays: SAL_DAYS, weeklyTarget: 3 },
    ];
    const pmAlways = [
      { id: "lm_pm_niacinamide", name: isSalDay ? "③ Niacinamide Eye" : "② Niacinamide Eye",  detail: "Under eye only — targets hyperpigmentation and dark circles",                     freq: "PM" },
      { id: "lm_pm_ghkcu",       name: isSalDay ? "④ GHK-Cu"          : "③ GHK-Cu",           detail: "Full face — collagen, skin thickness, repair. PM ONLY. Do NOT mix with Vitamin C.", freq: "PM" },
      { id: "lm_pm_moisturizer", name: isSalDay ? "⑤ Moisturizer"     : "④ Moisturizer",       detail: "Seals the PM routine",                                                             freq: "PM" },
    ];

    // Supplements
    const suppAM = [
      { id: "lm_supp_vitd",        name: "Vitamin D",         detail: "5000IU · take with a fatty meal for absorption · hormonal health, immunity",          freq: "AM" },
      { id: "lm_supp_enclomiphene",name: "Enclomiphene",      detail: "Testosterone optimization · take same time every morning",                            freq: "AM" },
      { id: "lm_supp_creatine",    name: "Creatine — 5g",     detail: "Mix in water or shake — daily consistency matters most · strength + muscle",          freq: "AM" },
      { id: "lm_supp_beetroot",    name: "Beetroot Pill",     detail: "Vascularity + blood flow — take with AM meal",                                        freq: "AM" },
      { id: "lm_supp_algaeoil",    name: "Algae Oil (Omega 3)",detail: "EPA/DHA — inflammation, skin, recovery. Algae not fish oil (shellfish allergy).",   freq: "AM" },
    ];
    const suppPM = [
      { id: "lm_supp_magnesium", name: "Magnesium Glycinate", detail: "Before bed — sleep quality, cramping, muscle recovery",                               freq: "Before Bed" },
      { id: "lm_supp_zinc",      name: "Zinc",                detail: "Every other day — free testosterone, immunity. Take with food.",                      freq: "EOD" },
      { id: "lm_supp_boron",     name: "Boron",               detail: "Every other day — free testosterone boost.",                                          freq: "EOD" },
    ];

    function haircutStatus() {
      const last = safeParse("lm_haircut_last", null);
      if (!last) return { days: null, due: false, last: null };
      const days = Math.floor((new Date() - new Date(last)) / 86400000);
      return { days, due: days >= 18, last };
    }

    function groomCheck(id, icon, name, detail, tag) {
      const checked = isChecked(id);
      const streak  = getStreak(id);
      return `
        <div onclick="lmToggle('${id}')" style="
          display:flex; align-items:center; gap:14px;
          padding:14px 16px; border-radius:14px; cursor:pointer;
          border:1px solid ${checked ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"};
          background:${checked ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)"};
          transition:all 0.15s;
        ">
          <div style="
            width:42px; height:42px; border-radius:12px; flex-shrink:0;
            background:${checked ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)"};
            border:1px solid ${checked ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"};
            display:flex; align-items:center; justify-content:center; font-size:1.3rem;
          ">${icon}</div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-weight:800; font-size:0.95rem; color:${checked ? "#86efac" : "#e5e7eb"};">${name}</span>
              ${tag ? `<span style="font-size:0.7rem; padding:2px 7px; border-radius:20px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.25); color:#a78bfa; font-weight:700;">${tag}</span>` : ""}
              ${streak >= 3 ? `<span style="font-size:0.72rem; color:#f59e0b; font-weight:800;">🔥 ${streak}d</span>` : ""}
            </div>
            <div style="font-size:0.8rem; color:#6b7280; margin-top:3px;">${detail}</div>
          </div>
          <div style="
            width:24px; height:24px; border-radius:7px; flex-shrink:0;
            border:2px solid ${checked ? "#22c55e" : "rgba(255,255,255,0.2)"};
            background:${checked ? "#22c55e" : "transparent"};
            display:flex; align-items:center; justify-content:center;
            font-size:0.75rem; color:white; font-weight:900;
          ">${checked ? "✓" : ""}</div>
        </div>
      `;
    }

    return `
      ${sectionHeader("Morning Routine", "Follow exact order — sequence matters.")}
      <div style="padding:10px 14px; border-radius:10px; background:rgba(251,191,36,0.08); border:1px solid rgba(251,191,36,0.2); color:#fcd34d; font-size:0.82rem; margin-bottom:12px;">
        ☀️ Vitamin C is <strong>AM only</strong> — GHK-Cu is <strong>PM only</strong>. Never layer them together.
      </div>
      ${renderChecklist(amRoutine)}

      ${sectionHeader("Night Routine", "Follow exact order — sequence matters.")}
      ${scheduleBanner(SAL_DAYS, "Salicylic Acid")}
      ${renderChecklist(pmBase)}
      ${isSalDay ? renderChecklist(pmSal) : ""}
      ${renderChecklist(pmAlways)}

      ${sectionHeader("Morning Supplements")}
      ${renderChecklist(suppAM)}

      ${sectionHeader("Before Bed")}
      ${renderChecklist(suppPM)}

      ${sectionHeader("Grooming")}
      ${(() => {
        const hc = haircutStatus();
        return `
          <div style="display:grid; gap:8px;">

            <!-- Haircut tracker -->
            <div style="
              padding:16px; border-radius:14px;
              border:1px solid ${hc.due ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.08)"};
              background:${hc.due ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.03)"};
            ">
              <div style="display:flex; align-items:center; gap:14px;">
                <div style="
                  width:42px; height:42px; border-radius:12px; flex-shrink:0;
                  background:${hc.due ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.06)"};
                  border:1px solid ${hc.due ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.1)"};
                  display:flex; align-items:center; justify-content:center; font-size:1.3rem;
                ">✂️</div>
                <div style="flex:1; min-width:0;">
                  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-weight:800; font-size:0.95rem;">Haircut</span>
                    <span style="font-size:0.7rem; padding:2px 7px; border-radius:20px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.25); color:#a78bfa; font-weight:700;">Every 2-3 wks</span>
                    ${hc.due ? `<span style="font-size:0.72rem; color:#fcd34d; font-weight:800;">⚠️ Overdue</span>` : ""}
                  </div>
                  <div style="font-size:0.8rem; color:#6b7280; margin-top:3px;">
                    ${hc.days !== null
                      ? `${hc.due ? "⏰" : "✅"} Last cut ${hc.days} days ago (${hc.last})`
                      : "Not logged yet — tap to mark after your next cut"}
                  </div>
                </div>
                <button onclick="lmSetLastHaircut()" style="
                  padding:8px 14px; border-radius:20px; flex-shrink:0;
                  border:1px solid ${hc.due ? "rgba(245,158,11,0.5)" : "rgba(99,102,241,0.4)"};
                  background:${hc.due ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.12)"};
                  color:${hc.due ? "#fcd34d" : "#a78bfa"};
                  font-size:0.8rem; font-weight:800; cursor:pointer; white-space:nowrap;
                ">Mark Today</button>
              </div>
            </div>

            <!-- Daily dental -->
            ${groomCheck("lm_teeth_brush", "🪥", "Electric Toothbrush", "2 minutes · twice daily · morning + night", "Daily")}
            ${groomCheck("lm_teeth_floss", "🦷", "Floss", "Every night before bed — non-negotiable for gum health", "Nightly")}

            <!-- Weekly upkeep -->
            ${groomCheck("lm_nails", "💅", "Nails", "Trim + clean underneath · weekly · people notice", "Weekly")}
            ${groomCheck("lm_facial_hair", "🪒", "Facial Hair", "Shave clean or maintain beard shape — no weak stubble", "Weekly")}

          </div>
        `;
      })()}
    `;
  }

  window.lmSetLastHaircut = function() {
    localStorage.setItem("lm_haircut_last", JSON.stringify(todayKey()));
    renderLooksmaxxing();
  };

  // ─── TAB 3: CONDITIONING ─────────────────────────────────────────────────

  function renderConditioningTab() {
    const sprintLog = safeParse(STORE_SPRINT, []);
    const lastSprint = sprintLog.length ? sprintLog[sprintLog.length - 1] : null;
    const lastDate   = lastSprint ? new Date(lastSprint.date + "T12:00:00") : null;
    const now        = new Date();
    const hoursSince = lastDate ? (now - lastDate) / 3600000 : 999;
    const tooSoon    = hoursSince < 48;

    const { isToday: isSprintDay, nextDay: nextSprintDay } = scheduleStatus(SPRINT_DAYS);
    const sprintLabels = SPRINT_DAYS.map(d => DAY_NAMES[d]).join(" / ");

    const weekSprints = sprintLog.filter(s => (now - new Date(s.date + "T12:00:00")) / 86400000 <= 7).length;

    const feelMap = { 5:"💪 Crushed it", 4:"✅ Solid session", 3:"😐 Got through it", 2:"😓 Tough day", 1:"💀 Barely survived" };

    return `
      ${sectionHeader("Stationary Bike Sprints", "Tue / Fri / Sun — 48hr minimum recovery between sessions.")}

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
        <div style="padding:14px; border-radius:14px; ${isSprintDay && !tooSoon ? "background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.25);" : "background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);"}">
          <div style="font-size:0.72rem; color:#6b7280; margin-bottom:4px; letter-spacing:0.04em;">SCHEDULE</div>
          <div style="font-weight:900; color:${isSprintDay ? "#86efac" : "#9ca3af"};">${isSprintDay ? "✅ Sprint Day" : `⏭️ Next: ${nextSprintDay}`}</div>
          <div style="font-size:0.75rem; color:#6b7280; margin-top:3px;">${sprintLabels}</div>
        </div>
        <div style="padding:14px; border-radius:14px; ${tooSoon ? "background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25);" : "background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);"}">
          <div style="font-size:0.72rem; color:#6b7280; margin-bottom:4px; letter-spacing:0.04em;">RECOVERY</div>
          <div style="font-weight:900; color:${tooSoon ? "#fca5a5" : "#86efac"};">${tooSoon ? `⛔ ${Math.ceil(48 - hoursSince)}h left` : "✅ Ready"}</div>
          <div style="font-size:0.75rem; color:#6b7280; margin-top:3px;">${lastSprint ? `Last: ${lastSprint.date}` : "No sessions yet"}</div>
        </div>
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-radius:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); margin-bottom:16px;">
        <span style="font-size:0.85rem; color:#9ca3af;">This week's sessions</span>
        <div style="display:flex; gap:8px; align-items:center;">
          ${[0,1,2].map(i => `
            <div style="width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.78rem; font-weight:900; background:${i < weekSprints ? "linear-gradient(135deg,rgba(99,102,241,0.85),rgba(236,72,153,0.7))" : "rgba(255,255,255,0.06)"}; border:1px solid ${i < weekSprints ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.1)"}; color:${i < weekSprints ? "white" : "#4b5563"};">${i < weekSprints ? "✓" : i+1}</div>
          `).join("")}
          <span style="font-weight:900; font-size:0.9rem; color:${weekSprints >= 3 ? "#22c55e" : "#9ca3af"}; margin-left:4px;">${weekSprints}/3</span>
        </div>
      </div>

      ${warningCard("Warm up 5min easy pedaling first. Legs heavy or fatigued? Skip — go tomorrow.")}

      ${sectionHeader("Log a Session")}
      ${tooSoon ? `<div style="color:#fca5a5; font-size:0.85rem; margin-bottom:12px; font-weight:700;">⛔ Recovery window active — ${Math.ceil(48 - hoursSince)}h remaining.</div>` : ""}

      <div style="display:grid; gap:10px; margin-bottom:16px; ${tooSoon ? "opacity:0.4; pointer-events:none;" : ""}">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <div style="font-size:0.78rem; color:#6b7280; margin-bottom:6px;">Duration (minutes)</div>
            <input id="lmSprintDuration" type="number" min="5" max="60" placeholder="e.g. 20"
              style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:white; outline:none; box-sizing:border-box;" />
          </div>
          <div>
            <div style="font-size:0.78rem; color:#6b7280; margin-bottom:6px;">Avg Resistance (1-20)</div>
            <input id="lmSprintResistance" type="number" min="1" max="20" placeholder="e.g. 12"
              style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:white; outline:none; box-sizing:border-box;" />
          </div>
        </div>
        <div>
          <div style="font-size:0.78rem; color:#6b7280; margin-bottom:6px;">How did it feel?</div>
          <select id="lmSprintFeel" style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:white; outline:none;">
            <option value="5">💪 Crushed it</option>
            <option value="4">✅ Solid session</option>
            <option value="3">😐 Got through it</option>
            <option value="2">😓 Tough day</option>
            <option value="1">💀 Barely survived</option>
          </select>
        </div>
        <button onclick="lmLogSprint()" style="padding:13px; border-radius:12px; font-weight:900; font-size:0.95rem; border:none; cursor:pointer; width:100%; background:linear-gradient(135deg,rgba(99,102,241,0.9),rgba(236,72,153,0.8)); color:white;">Log Session</button>
      </div>

      ${sectionHeader("Session History")}
      ${sprintLog.length === 0
        ? `<div style="color:#6b7280; font-size:0.9rem;">No sessions logged yet.</div>`
        : `<div style="display:grid; gap:8px;">
            ${[...sprintLog].reverse().slice(0,10).map((s, i) => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-radius:12px; flex-wrap:wrap; gap:8px; background:${i===0?"rgba(99,102,241,0.07)":"rgba(255,255,255,0.03)"}; border:1px solid ${i===0?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.07)"};">
                <div>
                  <div style="font-weight:800;">${s.date}</div>
                  <div style="font-size:0.78rem; color:#6b7280; margin-top:2px;">${[s.duration?`${s.duration}min`:"", s.resistance?`Resistance ${s.resistance}`:""].filter(Boolean).join(" · ")}</div>
                </div>
                <div style="font-size:0.85rem; color:#9ca3af;">${feelMap[s.feel]||""}</div>
              </div>
            `).join("")}
          </div>`
      }
    `;
  }

  window.lmLogSprint = function() {
    const log  = safeParse(STORE_SPRINT, []);
    const last = log.length ? new Date(log[log.length-1].date + "T12:00:00") : null;
    if (last && (new Date() - last) / 3600000 < 48) {
      alert(`⛔ Recovery window active. ${Math.ceil(48 - (new Date()-last)/3600000)}h remaining.`);
      return;
    }
    log.push({
      date:       todayKey(),
      duration:   document.getElementById("lmSprintDuration")?.value  || null,
      resistance: document.getElementById("lmSprintResistance")?.value || null,
      feel:       Number(document.getElementById("lmSprintFeel")?.value),
    });
    localStorage.setItem(STORE_SPRINT, JSON.stringify(log));
    renderLooksmaxxing();
  };

  // ─── TAB 4: PROGRESS ──────────────────────────────────────────────────────

  function renderProgressTab() {
    const neckLog     = safeParse(STORE_NECK, []);
    const weightLog   = safeParse(STORE_WEIGHT, []);
    const savedHeight = safeParse(STORE_HEIGHT, null);
    const notes       = safeParse(STORE_NOTES, {});
    const weekKey     = (() => { const d = new Date(); d.setDate(d.getDate()-d.getDay()); return todayKey(d); })();
    const currentNote = notes[weekKey] || "";
    const latestWeight = weightLog.length ? weightLog[weightLog.length-1].lbs : null;

    function calcBMI(lbs, h) { return (!lbs||!h) ? null : ((lbs/(h*h))*703).toFixed(1); }
    function bmiMeta(b) {
      const n = parseFloat(b);
      if (n < 18.5) return { text:"Underweight", color:"#60a5fa" };
      if (n < 25)   return { text:"Normal",       color:"#22c55e" };
      if (n < 30)   return { text:"Overweight",   color:"#f59e0b" };
      return               { text:"Obese",         color:"#ef4444" };
    }
    const bmi  = calcBMI(latestWeight, savedHeight);
    const meta = bmi ? bmiMeta(bmi) : null;

    function logRow(entry, i, arr, vk, unit, higherBetter) {
      const prev = arr[i+1];
      const raw  = prev ? entry[vk] - prev[vk] : null;
      const diff = raw !== null ? raw.toFixed(1) : null;
      const good = diff !== null ? (higherBetter ? raw > 0 : raw < 0) : false;
      const neutral = diff !== null && parseFloat(diff) === 0;
      const color = diff === null ? "#9ca3af" : neutral ? "#9ca3af" : good ? "#22c55e" : "#ef4444";
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-radius:12px; background:${i===0?"rgba(99,102,241,0.08)":"rgba(255,255,255,0.03)"}; border:1px solid ${i===0?"rgba(99,102,241,0.25)":"rgba(255,255,255,0.07)"};">
          <div>
            <span style="font-weight:900; font-size:1.05rem;">${entry[vk]} ${unit}</span>
            <span style="color:#6b7280; font-size:0.82rem; margin-left:8px;">${entry.date}</span>
          </div>
          ${diff!==null ? `<span style="font-weight:800; font-size:0.85rem; color:${color};">${parseFloat(diff)>0?"+":""}${diff} ${unit}</span>` : `<span style="color:#4b5563; font-size:0.8rem;">baseline</span>`}
        </div>
      `;
    }

    function ftIn(n) { return `${Math.floor(n/12)}ft ${Math.round(n%12)}in`; }

    return `
      ${sectionHeader("Height", "Set once — used for BMI.")}
      <div style="display:flex; gap:10px; margin-bottom:8px; flex-wrap:wrap;">
        <input id="lmHeightIn" type="number" step="0.5" min="48" max="96" value="${savedHeight||""}" placeholder="Total inches (77 = 6ft 5in)"
          style="flex:1; min-width:180px; padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:white; outline:none;" />
        <button onclick="lmSaveHeight()" style="padding:10px 20px; border-radius:10px; font-weight:800; background:linear-gradient(135deg,rgba(99,102,241,0.9),rgba(236,72,153,0.8)); border:none; color:white; cursor:pointer;">Save</button>
      </div>
      ${savedHeight ? `<div style="color:#6b7280; font-size:0.82rem; margin-bottom:16px;">${savedHeight}" = ${ftIn(savedHeight)}</div>` : `<div style="margin-bottom:16px;"></div>`}

      ${sectionHeader("Weight & BMI")}
      ${bmi ? `
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px;">
          <div style="padding:14px; border-radius:14px; background:rgba(99,102,241,0.10); border:1px solid rgba(99,102,241,0.25); text-align:center;">
            <div style="font-size:1.4rem; font-weight:900;">${latestWeight}</div>
            <div style="color:#9ca3af; font-size:0.78rem;">lbs</div>
          </div>
          <div style="padding:14px; border-radius:14px; background:rgba(236,72,153,0.08); border:1px solid rgba(236,72,153,0.2); text-align:center;">
            <div style="font-size:1.4rem; font-weight:900; color:${meta.color};">${bmi}</div>
            <div style="color:#9ca3af; font-size:0.78rem;">BMI</div>
          </div>
          <div style="padding:14px; border-radius:14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); text-align:center;">
            <div style="font-size:0.95rem; font-weight:900; color:${meta.color}; padding-top:6px;">${meta.text}</div>
            <div style="color:#9ca3af; font-size:0.78rem;">Category</div>
          </div>
        </div>` : ""}
      <div style="display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
        <input id="lmWeightLbs" type="number" step="0.5" min="80" max="400" placeholder="Weight in lbs"
          style="flex:1; min-width:160px; padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:white; outline:none;" />
        <button onclick="lmLogWeight()" style="padding:10px 20px; border-radius:10px; font-weight:800; background:linear-gradient(135deg,rgba(99,102,241,0.9),rgba(236,72,153,0.8)); border:none; color:white; cursor:pointer;">Log</button>
      </div>
      ${weightLog.length===0 ? `<div style="color:#6b7280; font-size:0.9rem; margin-bottom:20px;">No entries yet.</div>` : `<div style="display:grid; gap:8px; margin-bottom:20px;">${[...weightLog].reverse().slice(0,10).map((e,i,a)=>logRow(e,i,a,"lbs","lbs",false)).join("")}</div>`}

      ${sectionHeader("Neck Measurement", "Goal: 17+ inches.")}
      <div style="display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
        <input id="lmNeckInches" type="number" step="0.25" min="10" max="25" placeholder="Neck in inches (e.g. 15.5)"
          style="flex:1; min-width:160px; padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:white; outline:none;" />
        <button onclick="lmLogNeck()" style="padding:10px 20px; border-radius:10px; font-weight:800; background:linear-gradient(135deg,rgba(99,102,241,0.9),rgba(236,72,153,0.8)); border:none; color:white; cursor:pointer;">Log</button>
      </div>
      ${neckLog.length===0 ? `<div style="color:#6b7280; font-size:0.9rem; margin-bottom:20px;">No measurements yet.</div>` : `<div style="display:grid; gap:8px; margin-bottom:20px;">${[...neckLog].reverse().slice(0,10).map((e,i,a)=>logRow(e,i,a,"inches",'"',true)).join("")}</div>`}

      ${sectionHeader("Weekly Notes")}
      <textarea id="lmWeeklyNote" placeholder="What worked? What didn't? What to adjust next week?"
        style="width:100%; min-height:120px; padding:12px; border-radius:12px; resize:vertical; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); color:white; outline:none; font-size:0.9rem; line-height:1.5; margin-bottom:20px; box-sizing:border-box;"
        oninput="lmSaveNote(this.value)"
      >${currentNote}</textarea>

      ${sectionHeader("This Week's Protocol Completion")}
      ${renderWeekSummary()}
    `;
  }

  function renderWeekSummary() {
    const allItems = [
      // Facial & neck
      "lm_neck_iso","lm_mewing","lm_jaw_gum","lm_jaw_device","lm_cheek_lifts","lm_chin_tucks","lm_face_massage",
      // AM skincare
      "lm_am_cleanser","lm_am_ice","lm_am_caffeine","lm_am_vitc","lm_am_hyaluronic","lm_am_moisturizer","lm_am_spf",
      // PM skincare
      "lm_pm_cleanser","lm_pm_niacinamide","lm_pm_ghkcu","lm_pm_moisturizer",
      // Supplements
      "lm_supp_vitd","lm_supp_enclomiphene","lm_supp_creatine","lm_supp_beetroot","lm_supp_algaeoil",
      "lm_supp_magnesium","lm_supp_zinc","lm_supp_boron",
      // Grooming
      "lm_teeth_brush","lm_teeth_floss",
    ];
    const data = getCompletions();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i);
      const k = todayKey(d);
      const done = allItems.filter(id => data?.[k]?.[id]).length;
      days.push({ label:["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()], pct:Math.round((done/allItems.length)*100), k });
    }
    return `
      <div style="display:flex; gap:8px; align-items:flex-end; height:80px; margin-bottom:8px;">
        ${days.map(d => {
          const isToday = d.k === todayKey();
          const color = d.pct>=75?"#22c55e":d.pct>=50?"#eab308":d.pct>0?"#f97316":"rgba(255,255,255,0.1)";
          return `
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;">
              <div style="font-size:0.72rem; font-weight:800; color:#9ca3af;">${d.pct>0?d.pct+"%":""}</div>
              <div style="width:100%; border-radius:6px; height:${Math.max(6,d.pct*0.48)}px; background:${color}; border:${isToday?"1px solid rgba(167,139,250,0.6)":"none"};"></div>
              <div style="font-size:0.72rem; color:${isToday?"#a78bfa":"#6b7280"}; font-weight:${isToday?"900":"400"};">${d.label}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  // ─── DATA HANDLERS ────────────────────────────────────────────────────────

  window.lmLogNeck = function() {
    const val = parseFloat(document.getElementById("lmNeckInches")?.value);
    if (!val||val<10||val>25) return alert("Enter neck measurement in inches (10-25).");
    const log = safeParse(STORE_NECK, []);
    log.push({ date:todayKey(), inches:val });
    localStorage.setItem(STORE_NECK, JSON.stringify(log));
    renderLooksmaxxing();
  };

  window.lmLogWeight = function() {
    const val = parseFloat(document.getElementById("lmWeightLbs")?.value);
    if (!val||val<80||val>400) return alert("Enter weight in lbs (80-400).");
    const log = safeParse(STORE_WEIGHT, []);
    log.push({ date:todayKey(), lbs:val });
    localStorage.setItem(STORE_WEIGHT, JSON.stringify(log));
    renderLooksmaxxing();
  };

  window.lmSaveHeight = function() {
    const val = parseFloat(document.getElementById("lmHeightIn")?.value);
    if (!val||val<48||val>96) return alert("Enter height in total inches (48-96). e.g. 77 = 6ft 5in.");
    localStorage.setItem(STORE_HEIGHT, JSON.stringify(val));
    renderLooksmaxxing();
  };

  window.lmSaveNote = function(val) {
    const notes = safeParse(STORE_NOTES, {});
    const d = new Date(); d.setDate(d.getDate()-d.getDay());
    notes[todayKey(d)] = val;
    localStorage.setItem(STORE_NOTES, JSON.stringify(notes));
  };

  // ─── TAB BAR + MAIN RENDER ────────────────────────────────────────────────

  const TABS = [
    { id:"facial",       label:"💪 Facial & Neck" },
    { id:"skin",         label:"✨ Skin & Grooming" },
    { id:"conditioning", label:"🚴 Conditioning" },
    { id:"progress",     label:"📈 Progress" },
  ];

  window.lmSetTab = function(id) { activeTab = id; renderLooksmaxxing(); };

  function renderLooksmaxxing() {
    const container = document.getElementById("looksMaxxingContainer");
    if (!container) return;

    const tabContent = { facial:renderFacialTab, skin:renderSkinTab, conditioning:renderConditioningTab, progress:renderProgressTab };

    container.innerHTML = `
      <div style="padding:4px 0;">
        <h2 style="font-size:1.5rem; font-weight:900; margin-bottom:6px; background:linear-gradient(135deg,#e5e7eb,#a78bfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Looksmaxxing</h2>
        <div style="color:#6b7280; font-size:0.85rem; margin-bottom:20px;">Daily protocol for facial structure, skin & conditioning.</div>
        <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; margin-bottom:20px;">
          ${TABS.map(t => `
            <button onclick="lmSetTab('${t.id}')" style="padding:9px 14px; border-radius:20px; cursor:pointer; white-space:nowrap; font-weight:800; font-size:0.85rem; transition:all 0.15s; border:1px solid ${activeTab===t.id?"rgba(99,102,241,0.5)":"rgba(255,255,255,0.1)"}; background:${activeTab===t.id?"linear-gradient(135deg,rgba(99,102,241,0.8),rgba(236,72,153,0.7))":"rgba(255,255,255,0.04)"}; color:${activeTab===t.id?"white":"#9ca3af"};">${t.label}</button>
          `).join("")}
        </div>
        <div id="lmTabContent">${(tabContent[activeTab]||tabContent.facial)()}</div>
      </div>
    `;
  }

  window.renderLooksmaxxing = renderLooksmaxxing;
  if (App) { App.features.looksmaxxing = { render:renderLooksmaxxing }; App.on("looksmaxxing", renderLooksmaxxing); }

})();
