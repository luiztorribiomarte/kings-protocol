/* features/looksmaxxing.js — KINGS PROTOCOL
   5 tabs: Facial & Neck | Skin & Grooming | Posture | Conditioning | Progress
   All data saved to localStorage under looksmaxxCompletions[dateKey][itemId]
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

  // ─── STORAGE HELPERS ──────────────────────────────────────────────────────

  function pad(n) { return String(n).padStart(2, "0"); }

  function todayKey(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function safeParse(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  }

  function getCompletions() { return safeParse(STORE_COMPLETIONS, {}); }
  function saveCompletions(data) { localStorage.setItem(STORE_COMPLETIONS, JSON.stringify(data)); }

  function isChecked(itemId, dateKey = todayKey()) {
    return !!(getCompletions()?.[dateKey]?.[itemId]);
  }

  function toggleItem(itemId, dateKey = todayKey()) {
    const data = getCompletions();
    if (!data[dateKey]) data[dateKey] = {};
    data[dateKey][itemId] = !data[dateKey][itemId];
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
      const k = todayKey(d);
      if (data?.[k]?.[itemId]) streak++;
      else break;
    }
    return streak;
  }

  function getWeekCount(itemId) {
    const data = getCompletions();
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (data?.[todayKey(d)]?.[itemId]) count++;
    }
    return count;
  }

  // ─── CHECKLIST RENDERER ───────────────────────────────────────────────────

  function renderChecklist(items, dateKey = todayKey()) {
    return items.map(item => {
      const checked = isChecked(item.id, dateKey);
      const streak = getStreak(item.id);
      const freq = item.freq || "";
      const weekCount = item.weeklyTarget ? getWeekCount(item.id) : null;

      return `
        <div onclick="lmToggle('${item.id}')" style="
          display:flex; align-items:flex-start; gap:14px;
          padding:14px 16px; border-radius:14px; cursor:pointer;
          border:1px solid ${checked ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"};
          background:${checked ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)"};
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
              ${freq ? `<span style="font-size:0.72rem; padding:2px 8px; border-radius:20px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.25); color:#a78bfa; font-weight:700;">${freq}</span>` : ""}
              ${streak >= 3 ? `<span style="font-size:0.72rem; color:#f59e0b; font-weight:800;">🔥 ${streak}d</span>` : ""}
              ${weekCount !== null ? `<span style="font-size:0.72rem; color:#9ca3af;">${weekCount}/${item.weeklyTarget}x this week</span>` : ""}
            </div>
            ${item.detail ? `<div style="font-size:0.82rem; color:#6b7280; margin-top:3px; line-height:1.4;">${item.detail}</div>` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  // ─── SECTION HEADER ───────────────────────────────────────────────────────

  function sectionHeader(title, subtitle = "") {
    return `
      <div style="margin:20px 0 12px;">
        <div style="font-weight:900; font-size:1rem; color:#e5e7eb; letter-spacing:0.04em; text-transform:uppercase;">${title}</div>
        ${subtitle ? `<div style="font-size:0.82rem; color:#6b7280; margin-top:2px;">${subtitle}</div>` : ""}
      </div>
    `;
  }

  function warningCard(text) {
    return `
      <div style="padding:12px 14px; border-radius:12px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); color:#fcd34d; font-size:0.85rem; font-weight:700; margin-bottom:12px;">
        ⚠️ ${text}
      </div>
    `;
  }

  function infoCard(text) {
    return `
      <div style="padding:12px 14px; border-radius:12px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2); color:#a78bfa; font-size:0.85rem; line-height:1.5; margin-bottom:12px;">
        💡 ${text}
      </div>
    `;
  }

  // ─── TAB 1: FACIAL & NECK ─────────────────────────────────────────────────

  function renderFacialTab() {
    const neckWeighted = [
      { id: "lm_neck_curls",    name: "Weighted Neck Curls", detail: "4 directions · 4×15 reps", freq: "3x/week", weeklyTarget: 3 },
      { id: "lm_neck_bridges",  name: "Neck Bridges",        detail: "3×30sec holds",            freq: "3x/week", weeklyTarget: 3 },
      { id: "lm_trap_shrugs",   name: "Trap Shrugs",         detail: "Heavy · 4×12",             freq: "2x/week", weeklyTarget: 2 },
    ];
    const neckDaily = [
      { id: "lm_neck_iso",      name: "Isometric Holds",     detail: "All 4 directions · 3×20sec each", freq: "Daily" },
    ];
    const facial = [
      { id: "lm_mewing_am",     name: "Mewing — Morning",    detail: "3×5min conscious sessions. Tongue on roof of mouth.", freq: "Daily" },
      { id: "lm_mewing_pm",     name: "Mewing — Night",      detail: "3×5min before sleep.", freq: "Daily" },
      { id: "lm_jaw_gum",       name: "Jaw Gum Chewing",     detail: "Hard gum (Falim/mastic) · 30min · alternate sides", freq: "Daily" },
      { id: "lm_jaw_clench",    name: "Jaw Clenching",       detail: "50 hard clenches morning + night (builds masseter)", freq: "Daily" },
      { id: "lm_cheek_lifts",   name: "Cheek Lifts",         detail: "Smile wide, eyes neutral · 3×20 reps", freq: "Daily" },
      { id: "lm_chin_tucks",    name: "Chin Tucks",          detail: "3×15 (fixes forward head, sharpens jawline)", freq: "Daily" },
      { id: "lm_face_massage",  name: "Face Massage",        detail: "5min lymphatic drainage · nightly", freq: "Daily" },
    ];
    const debloat = [
      { id: "lm_sodium",        name: "Low Sodium",          detail: "Under 2000mg today", freq: "Daily" },
      { id: "lm_water",         name: "High Water Intake",   detail: "Gallon+ of water today", freq: "Daily" },
      { id: "lm_sleep_elev",    name: "Sleep Elevated",      detail: "2 pillows minimum (prevents fluid retention in face)", freq: "Daily" },
      { id: "lm_ice_face",      name: "Ice Rolling — AM",    detail: "Ice cube wrapped in cloth · 2-3min · morning only", freq: "Daily" },
      { id: "lm_black_coffee",  name: "Black Coffee AM",     detail: "Natural diuretic · no sugar", freq: "Daily" },
    ];

    // Neck recovery warning
    const neckYest = ["lm_neck_curls","lm_neck_bridges"].some(id => {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
      return isChecked(id, todayKey(yesterday));
    });

    return `
      ${sectionHeader("Neck Training", "Goal: 17+ inch neck. Build thickness from all angles.")}
      ${neckYest ? warningCard("You trained neck yesterday — today skip weighted work, do isometrics only.") : ""}
      ${renderChecklist(neckWeighted)}
      ${renderChecklist(neckDaily)}

      ${sectionHeader("Facial Exercises", "Morning & Night — non-negotiable for structure over time.")}
      ${infoCard("These work best with low body fat (under 12%). Stay lean to reveal structure.")}
      ${renderChecklist(facial)}

      ${sectionHeader("De-Bloating Protocol", "Daily habits that reduce facial puffiness.")}
      ${renderChecklist(debloat)}
    `;
  }

  // ─── TAB 2: SKIN & GROOMING ───────────────────────────────────────────────

  function renderSkinTab() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    // Salicylic on Mon(1), Wed(3), Fri(5)
    const isSalicylicDay = [1, 3, 5].includes(dayOfWeek);
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    const morningRoutine = [
      { id: "lm_am_cleanser",   name: "Cleanser",            detail: "The Ordinary — gentle wash, pat dry", freq: "AM" },
      { id: "lm_am_vitc",       name: "Vitamin C Serum",     detail: "The Ordinary — wait 5min to absorb. Antioxidant protection all day.", freq: "AM" },
      { id: "lm_am_moisturizer",name: "Moisturizer",         detail: "The Ordinary — lightweight, good under SPF", freq: "AM" },
      { id: "lm_am_ice",        name: "Ice Cube",            detail: "Wrapped in cloth · 2-3min · de-puffs, tightens pores. Morning ONLY.", freq: "AM" },
    ];

    const nightBase = [
      { id: "lm_pm_cleanser",   name: "Cleanser",            detail: "The Ordinary — double cleanse if wore sunscreen", freq: "PM" },
    ];
    const nightSalicylic = [
      { id: "lm_pm_salicylic",  name: "Salicylic Acid",      detail: "The Ordinary — unclogs pores while you sleep. 3x/week ONLY or you'll strip barrier.", freq: "Mon/Wed/Fri", weeklyTarget: 3 },
    ];
    const nightAlways = [
      { id: "lm_pm_tallow",     name: "Beef Tallow Moisturizer", detail: "Last step only. Heavy + occlusive = seals everything in overnight. Nighttime ONLY — too heavy for AM.", freq: "PM" },
      { id: "lm_pm_guasha",     name: "Gua Sha",             detail: "5min after tallow (tallow = glide medium). Promotes lymphatic drainage, defines jawline.", freq: "PM" },
    ];

    const supplements = [
      { id: "lm_supp_zinc",     name: "Zinc 50mg",           detail: "Reduces acne, supports immune", freq: "Daily" },
      { id: "lm_supp_omega",    name: "Omega-3 2-3g",        detail: "Reduces skin inflammation", freq: "Daily" },
      { id: "lm_supp_collagen", name: "Collagen 10g",        detail: "Skin elasticity and joint health", freq: "Daily" },
      { id: "lm_supp_vitd",     name: "Vitamin D 5000IU",    detail: "Most people are deficient", freq: "Daily" },
    ];

    const grooming = [
      { id: "lm_teeth_brush",   name: "Electric Toothbrush", detail: "2x daily, 2min each", freq: "Daily" },
      { id: "lm_teeth_floss",   name: "Floss",               detail: "Every night before bed", freq: "Daily" },
      { id: "lm_nails",         name: "Nails Check",         detail: "Trim weekly, clean under them", freq: "Weekly" },
    ];

    return `
      ${sectionHeader("Morning Routine", "In this exact order — sequence matters.")}
      <div style="padding:10px 14px; border-radius:10px; background:rgba(251,191,36,0.08); border:1px solid rgba(251,191,36,0.2); color:#fcd34d; font-size:0.82rem; margin-bottom:12px;">
        ☀️ <strong>Vitamin C is always AM only.</strong> Never use at night.
      </div>
      ${renderChecklist(morningRoutine)}

      ${sectionHeader("Night Routine", "In this exact order — sequence matters.")}
      ${isSalicylicDay
        ? `<div style="padding:10px 14px; border-radius:10px; background:rgba(99,102,241,0.10); border:1px solid rgba(99,102,241,0.25); color:#a78bfa; font-size:0.82rem; margin-bottom:12px;">✅ <strong>Today (${dayNames[dayOfWeek]}) is a Salicylic Acid day.</strong></div>`
        : `<div style="padding:10px 14px; border-radius:10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:#6b7280; font-size:0.82rem; margin-bottom:12px;">⏭️ <strong>No Salicylic today (${dayNames[dayOfWeek]}).</strong> Next: ${dayOfWeek < 1 ? "Mon" : dayOfWeek < 3 ? "Wed" : dayOfWeek < 5 ? "Fri" : "Mon"}.</div>`
      }
      ${renderChecklist(nightBase)}
      ${isSalicylicDay ? renderChecklist(nightSalicylic) : ""}
      ${renderChecklist(nightAlways)}

      ${sectionHeader("Daily Supplements")}
      ${renderChecklist(supplements)}

      ${sectionHeader("Grooming")}
      ${infoCard("Haircut every 2-3 weeks ($40-60, show reference photos). Eyebrows shaped professionally once, maintain. Facial hair: shave daily or commit to full beard — no weak stubble.")}
      ${renderChecklist(grooming)}
    `;
  }

  // ─── TAB 3: POSTURE ───────────────────────────────────────────────────────

  function renderPostureTab() {
    const drills = [
      { id: "lm_post_wall_am",   name: "Wall Angels — Morning",   detail: "3×15 · opens chest, strengthens upper back", freq: "Daily" },
      { id: "lm_post_tucks_am",  name: "Chin Tucks — Morning",    detail: "3×15 · fixes forward head posture", freq: "Daily" },
      { id: "lm_post_hangs_am",  name: "Dead Hangs — Morning",    detail: "3×30sec · decompresses spine", freq: "Daily" },
      { id: "lm_post_bands_am",  name: "Band Pull-Aparts — AM",   detail: "3×20 · activates rear delts", freq: "Daily" },
      { id: "lm_post_thoracic",  name: "Thoracic Extensions",     detail: "3×10 on foam roller · opens rounded upper back", freq: "Daily" },
      { id: "lm_post_wall_pm",   name: "Wall Angels — Night",     detail: "3×15 · repeat before bed", freq: "Daily" },
      { id: "lm_post_tucks_pm",  name: "Chin Tucks — Night",      detail: "3×15 · before bed", freq: "Daily" },
      { id: "lm_post_hangs_pm",  name: "Dead Hangs — Night",      detail: "3×30sec · before bed", freq: "Daily" },
    ];

    const cues = [
      "Shoulders back and down — imagine back pockets pulling shoulder blades together",
      "Chin slightly tucked — not forward jutting",
      "Core engaged at all times — like someone's about to punch you",
      "Walk tall — you're 6'5\". Own it. No slouching to fit in.",
    ];

    return `
      ${sectionHeader("Daily Posture Drills", "10min morning + 10min night. Non-negotiable.")}
      ${warningCard("Poor posture kills aesthetics. At 6'5\" you probably slouch. Fix this IMMEDIATELY.")}
      ${renderChecklist(drills)}

      ${sectionHeader("All-Day Posture Cues", "Keep these in mind every moment.")}
      <div style="display:grid; gap:8px;">
        ${cues.map((c, i) => `
          <div style="
            display:flex; gap:12px; align-items:flex-start;
            padding:12px 14px; border-radius:12px;
            background:rgba(255,255,255,0.03);
            border:1px solid rgba(255,255,255,0.07);
          ">
            <div style="
              width:24px; height:24px; border-radius:50%; flex-shrink:0;
              background:linear-gradient(135deg,rgba(99,102,241,0.6),rgba(236,72,153,0.5));
              display:flex; align-items:center; justify-content:center;
              font-size:0.72rem; font-weight:900; color:white;
            ">${i+1}</div>
            <div style="color:#d1d5db; font-size:0.9rem; line-height:1.45;">${c}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  // ─── TAB 4: CONDITIONING ─────────────────────────────────────────────────

  function renderConditioningTab() {
    const sprintLog = safeParse(STORE_SPRINT, []);

    // Check last sprint date for 48hr rule
    const lastSprint = sprintLog.length ? sprintLog[sprintLog.length - 1] : null;
    const lastSprintDate = lastSprint ? new Date(lastSprint.date) : null;
    const now = new Date();
    const hoursSinceLast = lastSprintDate ? (now - lastSprintDate) / 3600000 : 999;
    const tooSoon = hoursSinceLast < 48;

    // Count this week's sessions
    const weekSprints = sprintLog.filter(s => {
      const d = new Date(s.date);
      const diff = (now - d) / 86400000;
      return diff <= 7;
    }).length;

    const protocols = [
      { id: "tabata",    name: "Tabata",         detail: "20sec all-out / 10sec rest × 8 rounds = 4min. Rest 2min. Repeat 2-3x.", icon: "⚡" },
      { id: "intervals", name: "Hill Intervals",  detail: "30sec hard resistance / 90sec easy × 8 rounds.", icon: "🏔️" },
      { id: "maxsprint", name: "Max Sprints",     detail: "10sec absolute max / 50sec rest × 10 rounds.", icon: "🚀" },
      { id: "steady",    name: "Steady Power",    detail: "20min at 75-80% max effort. Lower intensity, good for recovery days.", icon: "🔄" },
    ];

    return `
      ${sectionHeader("Stationary Bike Conditioning", "2-3x per week MAX. 48hr minimum between sessions.")}

      <!-- Status banner -->
      <div style="
        padding:14px 16px; border-radius:14px; margin-bottom:16px;
        ${tooSoon
          ? "background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3);"
          : "background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.25);"
        }
        display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;
      ">
        <div>
          <div style="font-weight:900; color:${tooSoon ? "#fca5a5" : "#86efac"};">
            ${tooSoon ? "⛔ Recovery Window Active" : "✅ Ready to Sprint"}
          </div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-top:2px;">
            ${tooSoon
              ? `Last session ${Math.round(hoursSinceLast)}h ago. Wait ${Math.ceil(48 - hoursSinceLast)}h more.`
              : lastSprint ? `Last session: ${lastSprint.date} — fully recovered.` : "No sessions logged yet."
            }
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:1.4rem; font-weight:900; color:${weekSprints >= 3 ? "#22c55e" : weekSprints >= 2 ? "#eab308" : "#9ca3af"};">
            ${weekSprints}/3
          </div>
          <div style="font-size:0.75rem; color:#6b7280;">sessions this week</div>
        </div>
      </div>

      ${warningCard("Always warm up 5min easy pedaling before sprints. If legs feel heavy or fatigued — skip and go tomorrow.")}

      ${sectionHeader("Protocols — Pick One Per Session")}
      <div style="display:grid; gap:10px; margin-bottom:20px;">
        ${protocols.map(p => `
          <div style="
            padding:14px 16px; border-radius:14px;
            border:1px solid rgba(255,255,255,0.08);
            background:rgba(255,255,255,0.03);
          ">
            <div style="font-weight:900; font-size:0.95rem; margin-bottom:4px;">${p.icon} ${p.name}</div>
            <div style="font-size:0.85rem; color:#9ca3af; line-height:1.4;">${p.detail}</div>
          </div>
        `).join("")}
      </div>

      ${sectionHeader("Log a Session")}
      ${tooSoon ? `<div style="color:#fca5a5; font-size:0.85rem; margin-bottom:12px;">⛔ Logging disabled — still in recovery window.</div>` : ""}
      <div style="display:grid; gap:10px; margin-bottom:12px;">
        <select id="lmSprintProtocol" style="
          padding:10px 12px; border-radius:10px;
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.05); color:white; outline:none;
          ${tooSoon ? "opacity:0.4; pointer-events:none;" : ""}
        ">
          ${protocols.map(p => `<option value="${p.id}">${p.name}</option>`).join("")}
        </select>
        <div style="display:flex; gap:10px;">
          <input id="lmSprintResistance" type="number" min="1" max="20" placeholder="Resistance level (1-20)"
            style="
              flex:1; padding:10px 12px; border-radius:10px;
              border:1px solid rgba(255,255,255,0.12);
              background:rgba(255,255,255,0.05); color:white; outline:none;
              ${tooSoon ? "opacity:0.4; pointer-events:none;" : ""}
            "
          />
          <select id="lmSprintFeel" style="
            flex:1; padding:10px 12px; border-radius:10px;
            border:1px solid rgba(255,255,255,0.12);
            background:rgba(255,255,255,0.05); color:white; outline:none;
            ${tooSoon ? "opacity:0.4; pointer-events:none;" : ""}
          ">
            <option value="5">💪 Crushed it</option>
            <option value="4">✅ Solid session</option>
            <option value="3">😐 Got through it</option>
            <option value="2">😓 Tough day</option>
            <option value="1">💀 Barely survived</option>
          </select>
        </div>
        <button onclick="lmLogSprint()" style="
          padding:12px; border-radius:12px; font-weight:900;
          border:none; cursor:pointer; font-size:0.95rem;
          background:${tooSoon ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,rgba(99,102,241,0.9),rgba(236,72,153,0.8))"};
          color:${tooSoon ? "#6b7280" : "white"};
          ${tooSoon ? "pointer-events:none;" : ""}
        ">Log Session</button>
      </div>

      ${sectionHeader("Recent Sessions")}
      ${sprintLog.length === 0
        ? `<div style="color:#6b7280; font-size:0.9rem;">No sessions logged yet.</div>`
        : `<div style="display:grid; gap:8px;">
            ${[...sprintLog].reverse().slice(0, 8).map(s => {
              const feelLabels = { 5:"💪 Crushed it", 4:"✅ Solid", 3:"😐 Got through it", 2:"😓 Tough", 1:"💀 Barely survived" };
              const protocolNames = { tabata:"Tabata", intervals:"Hill Intervals", maxsprint:"Max Sprints", steady:"Steady Power" };
              return `
                <div style="
                  display:flex; justify-content:space-between; align-items:center;
                  padding:12px 14px; border-radius:12px;
                  background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
                  flex-wrap:wrap; gap:8px;
                ">
                  <div>
                    <div style="font-weight:800; font-size:0.9rem;">${protocolNames[s.protocol] || s.protocol}</div>
                    <div style="font-size:0.78rem; color:#6b7280; margin-top:2px;">${s.date} · Resistance ${s.resistance || "—"}</div>
                  </div>
                  <div style="font-size:0.85rem; color:#9ca3af;">${feelLabels[s.feel] || ""}</div>
                </div>
              `;
            }).join("")}
          </div>`
      }
    `;
  }

  window.lmLogSprint = function() {
    const protocol   = document.getElementById("lmSprintProtocol")?.value;
    const resistance = document.getElementById("lmSprintResistance")?.value;
    const feel       = document.getElementById("lmSprintFeel")?.value;

    const log = safeParse(STORE_SPRINT, []);

    // Check 48hr rule
    const last = log.length ? new Date(log[log.length-1].date) : null;
    const hoursSince = last ? (new Date() - last) / 3600000 : 999;
    if (hoursSince < 48) {
      alert(`⛔ Recovery window active. ${Math.ceil(48 - hoursSince)} hours remaining.`);
      return;
    }

    log.push({
      date: todayKey(),
      protocol,
      resistance: resistance || null,
      feel: Number(feel),
    });

    localStorage.setItem(STORE_SPRINT, JSON.stringify(log));
    renderLooksmaxxing();
  };

  // ─── TAB 5: PROGRESS ──────────────────────────────────────────────────────

  function renderProgressTab() {
    const neckLog     = safeParse(STORE_NECK, []);
    const weightLog   = safeParse(STORE_WEIGHT, []);
    const savedHeight = safeParse(STORE_HEIGHT, null);  // stored in inches
    const notes       = safeParse(STORE_NOTES, {});
    const weekKey     = (() => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay());
      return todayKey(d);
    })();
    const currentNote  = notes[weekKey] || "";
    const latestWeight = weightLog.length ? weightLog[weightLog.length - 1].lbs : null;

    // BMI = (lbs / inches²) × 703
    function calcBMI(lbs, heightIn) {
      if (!lbs || !heightIn) return null;
      return ((lbs / (heightIn * heightIn)) * 703).toFixed(1);
    }
    function bmiLabel(b) {
      if (!b) return "";
      const n = parseFloat(b);
      if (n < 18.5) return { text: "Underweight", color: "#60a5fa" };
      if (n < 25)   return { text: "Normal",      color: "#22c55e" };
      if (n < 30)   return { text: "Overweight",  color: "#f59e0b" };
      return               { text: "Obese",        color: "#ef4444" };
    }

    const currentBMI   = calcBMI(latestWeight, savedHeight);
    const bmiMeta      = bmiLabel(currentBMI);

    // Reusable log row renderer
    function logRow(entry, i, arr, valKey, unit, higherIsBetter) {
      const prev = arr[i + 1];
      const raw  = prev ? (entry[valKey] - prev[valKey]) : null;
      const diff = raw !== null ? raw.toFixed(1) : null;
      const improved = raw !== null ? (higherIsBetter ? raw > 0 : raw < 0) : false;
      const neutral  = raw !== null && parseFloat(diff) === 0;
      const diffColor = diff === null ? "#9ca3af" : neutral ? "#9ca3af" : improved ? "#22c55e" : "#ef4444";

      return `
        <div style="
          display:flex; justify-content:space-between; align-items:center;
          padding:12px 14px; border-radius:12px;
          background:${i === 0 ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)"};
          border:1px solid ${i === 0 ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.07)"};
        ">
          <div>
            <span style="font-weight:900; font-size:1.05rem;">${entry[valKey]} ${unit}</span>
            <span style="color:#6b7280; font-size:0.82rem; margin-left:8px;">${entry.date}</span>
          </div>
          ${diff !== null
            ? `<span style="font-weight:800; font-size:0.85rem; color:${diffColor};">${parseFloat(diff) > 0 ? "+" : ""}${diff} ${unit}</span>`
            : `<span style="color:#4b5563; font-size:0.8rem;">baseline</span>`}
        </div>
      `;
    }

    // Height display helper
    function inchesToFtIn(inches) {
      const ft = Math.floor(inches / 12);
      const ins = Math.round(inches % 12);
      return `${ft}ft ${ins}in`;
    }

    return `
      ${sectionHeader("Height", "Set once — used for BMI. You're 6'5\" = 77 inches.")}
      <div style="display:flex; gap:10px; margin-bottom:8px; flex-wrap:wrap; align-items:center;">
        <input id="lmHeightIn" type="number" step="0.5" min="48" max="96"
          value="${savedHeight || ""}"
          placeholder="Height in total inches (e.g. 77)"
          style="
            flex:1; min-width:200px; padding:10px 12px; border-radius:10px;
            border:1px solid rgba(255,255,255,0.12);
            background:rgba(255,255,255,0.05); color:white; outline:none;
          "
        />
        <button onclick="lmSaveHeight()" style="
          padding:10px 20px; border-radius:10px; font-weight:800;
          background:linear-gradient(135deg,rgba(99,102,241,0.9),rgba(236,72,153,0.8));
          border:none; color:white; cursor:pointer;
        ">Save</button>
      </div>
      ${savedHeight ? `<div style="color:#6b7280; font-size:0.82rem; margin-bottom:16px;">Saved: ${savedHeight}" = ${inchesToFtIn(savedHeight)}</div>` : `<div style="margin-bottom:16px;"></div>`}

      ${sectionHeader("Weight & BMI", "Log in lbs. BMI auto-calculates once height is set.")}

      ${(latestWeight && currentBMI) ? `
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px;">
          <div style="padding:14px; border-radius:14px; background:rgba(99,102,241,0.10); border:1px solid rgba(99,102,241,0.25); text-align:center;">
            <div style="font-size:1.4rem; font-weight:900;">${latestWeight}</div>
            <div style="color:#9ca3af; font-size:0.78rem; margin-top:2px;">lbs</div>
          </div>
          <div style="padding:14px; border-radius:14px; background:rgba(236,72,153,0.08); border:1px solid rgba(236,72,153,0.2); text-align:center;">
            <div style="font-size:1.4rem; font-weight:900; color:${bmiMeta.color};">${currentBMI}</div>
            <div style="color:#9ca3af; font-size:0.78rem; margin-top:2px;">BMI</div>
          </div>
          <div style="padding:14px; border-radius:14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); text-align:center;">
            <div style="font-size:1rem; font-weight:900; color:${bmiMeta.color}; padding-top:4px;">${bmiMeta.text}</div>
            <div style="color:#9ca3af; font-size:0.78rem; margin-top:2px;">Category</div>
          </div>
        </div>
      ` : ""}

      <div style="display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
        <input id="lmWeightLbs" type="number" step="0.5" min="80" max="400"
          placeholder="Weight in lbs (e.g. 185)"
          style="
            flex:1; min-width:160px; padding:10px 12px; border-radius:10px;
            border:1px solid rgba(255,255,255,0.12);
            background:rgba(255,255,255,0.05); color:white; outline:none;
          "
        />
        <button onclick="lmLogWeight()" style="
          padding:10px 20px; border-radius:10px; font-weight:800;
          background:linear-gradient(135deg,rgba(99,102,241,0.9),rgba(236,72,153,0.8));
          border:none; color:white; cursor:pointer;
        ">Log</button>
      </div>
      ${weightLog.length === 0
        ? `<div style="color:#6b7280; font-size:0.9rem; margin-bottom:20px;">No entries yet.</div>`
        : `<div style="display:grid; gap:8px; margin-bottom:20px;">
            ${[...weightLog].reverse().slice(0, 10).map((e, i, arr) => logRow(e, i, arr, "lbs", "lbs", false)).join("")}
          </div>`
      }

      ${sectionHeader("Neck Measurement", "Goal: 17+ inches. Track weekly.")}
      <div style="display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
        <input id="lmNeckInches" type="number" step="0.25" min="10" max="25"
          placeholder="Neck in inches (e.g. 15.5)"
          style="
            flex:1; min-width:160px; padding:10px 12px; border-radius:10px;
            border:1px solid rgba(255,255,255,0.12);
            background:rgba(255,255,255,0.05); color:white; outline:none;
          "
        />
        <button onclick="lmLogNeck()" style="
          padding:10px 20px; border-radius:10px; font-weight:800;
          background:linear-gradient(135deg,rgba(99,102,241,0.9),rgba(236,72,153,0.8));
          border:none; color:white; cursor:pointer;
        ">Log</button>
      </div>
      ${neckLog.length === 0
        ? `<div style="color:#6b7280; font-size:0.9rem; margin-bottom:20px;">No measurements yet.</div>`
        : `<div style="display:grid; gap:8px; margin-bottom:20px;">
            ${[...neckLog].reverse().slice(0, 10).map((e, i, arr) => logRow(e, i, arr, "inches", '"', true)).join("")}
          </div>`
      }

      ${sectionHeader("Weekly Notes", "What worked? What didn't? What to adjust next week?")}
      <textarea id="lmWeeklyNote" placeholder="Write your weekly reflection here..."
        style="
          width:100%; min-height:120px; padding:12px; border-radius:12px; resize:vertical;
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.04); color:white; outline:none;
          font-size:0.9rem; line-height:1.5; margin-bottom:20px;
        "
        oninput="lmSaveNote(this.value)"
      >${currentNote}</textarea>

      ${sectionHeader("This Week's Completion")}
      ${renderWeekSummary()}
    `;
  }

  function renderWeekSummary() {
    const allItems = [
      "lm_neck_iso","lm_mewing_am","lm_mewing_pm","lm_jaw_gum","lm_jaw_clench",
      "lm_cheek_lifts","lm_chin_tucks","lm_face_massage","lm_sodium","lm_water",
      "lm_am_cleanser","lm_am_vitc","lm_am_moisturizer","lm_pm_cleanser","lm_pm_tallow","lm_pm_guasha",
      "lm_supp_zinc","lm_supp_omega","lm_supp_collagen","lm_supp_vitd",
      "lm_post_wall_am","lm_post_tucks_am","lm_post_hangs_am","lm_teeth_brush","lm_teeth_floss",
    ];
    const data = getCompletions();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = todayKey(d);
      const done = allItems.filter(id => data?.[k]?.[id]).length;
      const pct = Math.round((done / allItems.length) * 100);
      days.push({ label: ["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()], date: d.getDate(), pct, k });
    }

    return `
      <div style="display:flex; gap:8px; align-items:flex-end; height:80px; margin-bottom:8px;">
        ${days.map(d => {
          const isToday = d.k === todayKey();
          const color = d.pct >= 75 ? "#22c55e" : d.pct >= 50 ? "#eab308" : d.pct > 0 ? "#f97316" : "rgba(255,255,255,0.1)";
          return `
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;">
              <div style="font-size:0.72rem; font-weight:800; color:#9ca3af;">${d.pct > 0 ? d.pct + "%" : ""}</div>
              <div style="
                width:100%; border-radius:6px;
                height:${Math.max(6, d.pct * 0.48)}px;
                background:${color};
                border:${isToday ? "1px solid rgba(167,139,250,0.6)" : "none"};
              "></div>
              <div style="font-size:0.72rem; color:${isToday ? "#a78bfa" : "#6b7280"}; font-weight:${isToday ? "900" : "400"};">${d.label}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  window.lmLogNeck = function() {
    const val = parseFloat(document.getElementById("lmNeckInches")?.value);
    if (!val || val < 10 || val > 25) return alert("Enter a valid neck measurement in inches (10-25).");
    const log = safeParse(STORE_NECK, []);
    log.push({ date: todayKey(), inches: val });
    localStorage.setItem(STORE_NECK, JSON.stringify(log));
    renderLooksmaxxing();
  };

  window.lmLogWeight = function() {
    const val = parseFloat(document.getElementById("lmWeightLbs")?.value);
    if (!val || val < 80 || val > 400) return alert("Enter a valid weight in lbs (80-400).");
    const log = safeParse(STORE_WEIGHT, []);
    log.push({ date: todayKey(), lbs: val });
    localStorage.setItem(STORE_WEIGHT, JSON.stringify(log));
    renderLooksmaxxing();
  };

  window.lmSaveHeight = function() {
    const val = parseFloat(document.getElementById("lmHeightIn")?.value);
    if (!val || val < 48 || val > 96) return alert("Enter height in inches (48-96). e.g. 77 for 6ft 5in.");
    localStorage.setItem(STORE_HEIGHT, JSON.stringify(val));
    renderLooksmaxxing();
  };

  window.lmSaveNote = function(val) {
    const notes = safeParse(STORE_NOTES, {});
    const d = new Date(); d.setDate(d.getDate() - d.getDay());
    notes[todayKey(d)] = val;
    localStorage.setItem(STORE_NOTES, JSON.stringify(notes));
  };

  // ─── TAB BAR ─────────────────────────────────────────────────────────────

  const TABS = [
    { id: "facial",       label: "💪 Facial & Neck" },
    { id: "skin",         label: "✨ Skin & Grooming" },
    { id: "posture",      label: "🧍 Posture" },
    { id: "conditioning", label: "🚴 Conditioning" },
    { id: "progress",     label: "📈 Progress" },
  ];

  window.lmSetTab = function(id) {
    activeTab = id;
    renderLooksmaxxing();
  };

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────

  function renderLooksmaxxing() {
    const container = document.getElementById("looksMaxxingContainer");
    if (!container) return;

    const tabContent = {
      facial:       renderFacialTab,
      skin:         renderSkinTab,
      posture:      renderPostureTab,
      conditioning: renderConditioningTab,
      progress:     renderProgressTab,
    };

    const tabBar = `
      <div style="
        display:flex; gap:6px; overflow-x:auto; padding-bottom:4px;
        scrollbar-width:none; margin-bottom:20px;
      ">
        ${TABS.map(t => `
          <button onclick="lmSetTab('${t.id}')" style="
            padding:9px 14px; border-radius:20px; cursor:pointer; white-space:nowrap;
            font-weight:800; font-size:0.85rem; transition:all 0.15s;
            border:1px solid ${activeTab === t.id ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"};
            background:${activeTab === t.id
              ? "linear-gradient(135deg,rgba(99,102,241,0.8),rgba(236,72,153,0.7))"
              : "rgba(255,255,255,0.04)"};
            color:${activeTab === t.id ? "white" : "#9ca3af"};
          ">${t.label}</button>
        `).join("")}
      </div>
    `;

    container.innerHTML = `
      <div style="padding:4px 0;">
        <h2 style="
          font-size:1.5rem; font-weight:900; margin-bottom:6px;
          background:linear-gradient(135deg,#e5e7eb,#a78bfa);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;
        ">Looksmaxxing</h2>
        <div style="color:#6b7280; font-size:0.85rem; margin-bottom:20px;">
          Daily protocol for facial structure, skin, posture & conditioning.
        </div>
        ${tabBar}
        <div id="lmTabContent">
          ${(tabContent[activeTab] || tabContent.facial)()}
        </div>
      </div>
    `;
  }

  window.renderLooksmaxxing = renderLooksmaxxing;

  if (App) {
    App.features.looksmaxxing = { render: renderLooksmaxxing };
    App.on("looksmaxxing", renderLooksmaxxing);
  }

})();
