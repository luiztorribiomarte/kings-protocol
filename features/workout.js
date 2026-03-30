/* features/workout.js — KINGS PROTOCOL
   Heavy Duty PPL / Upper Lower Split
   3 tabs: Today | Log | Progress
   - Today: shows today's program, warm-up sets, working set logger
   - Log: session history calendar
   - Progress: PRs + strength chart per exercise
*/

(function () {
  "use strict";

  const STORAGE_KEY  = "kp_workouts_v2";
  const UI_KEY       = "kp_workout_ui";
  const MOUNT_ID     = "kpWorkoutMount";

  let exerciseChart = null;

  // ── HELPERS ───────────────────────────────────────────────────────────────

  function byId(id)         { return document.getElementById(id); }
  function save(k, v)       { localStorage.setItem(k, JSON.stringify(v)); }
  function load(k, fb)      { try { return JSON.parse(localStorage.getItem(k) || "null") ?? fb; } catch { return fb; } }
  function uid()            { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function esc(s)           { return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
  function pad(n)           { return String(n).padStart(2,"0"); }
  function todayISO()       { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function dayOfWeek()      { return new Date().getDay(); } // 0=Sun
  function clamp(n,a,b)     { const x=Number(n); return Number.isFinite(x)?Math.min(b,Math.max(a,x)):a; }
  function fmtDate(iso)     {
    try { return new Date(iso+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}); }
    catch { return iso; }
  }
  function estimate1RM(w,r) { const wn=Number(w||0),rn=Number(r||0); if(!wn||rn<1) return 0; return Math.round(wn*(1+rn/30)); }

  // ── PROGRAM DEFINITION ────────────────────────────────────────────────────
  // The full Heavy Duty PPL / Upper Lower program

  const PROGRAM = {
    0: { // Sunday
      label: "Core + Grip",
      type:  "core",
      note:  "Recovery day. Core and grip work only.",
      exercises: [
        { name:"Ab Roller",               sets:[{type:"work",reps:"8–12",notes:"3 sets"}], isCore:true },
        { name:"Bicycle Crunches",        sets:[{type:"work",reps:"15–20 each side",notes:"3 sets"}], isCore:true },
        { name:"Reverse Crunch",          sets:[{type:"work",reps:"12–15",notes:"3 sets"}], isCore:true },
        { name:"Barbell Wrist Curl",      sets:[{type:"work",reps:"to failure",notes:"1 set"}], isGrip:true },
        { name:"Barbell Reverse Wrist Curl",sets:[{type:"work",reps:"to failure",notes:"1 set"}], isGrip:true },
      ]
    },
    1: { // Monday
      label: "Push + Neck + Grip",
      type:  "push",
      note:  "3–5 min rest between exercises. Working set to absolute failure.",
      exercises: [
        { name:"Flat Barbell Bench Press",   sets:[{type:"warmup",pct:50,reps:6},{type:"warmup",pct:70,reps:4},{type:"warmup",pct:85,reps:2},{type:"work",reps:"failure"}] },
        { name:"Incline Barbell Bench Press",sets:[{type:"warmup",pct:70,reps:3},{type:"work",reps:"failure"}] },
        { name:"Barbell Overhead Press",     sets:[{type:"warmup",pct:50,reps:5},{type:"warmup",pct:75,reps:3},{type:"work",reps:"failure"}] },
        { name:"Lateral Raise",              sets:[{type:"warmup",label:"light",reps:8},{type:"work",reps:"failure"}] },
        { name:"Weighted Dips",              sets:[{type:"warmup",label:"BW",reps:5},{type:"work",reps:"failure"}] },
        { name:"Neck Bridge",                sets:[{type:"work",reps:"30 sec",notes:"2 sets"}], isNeck:true },
        { name:"Plate Neck Curl",            sets:[{type:"work",reps:"15",notes:"1 set"}], isNeck:true },
        { name:"Barbell Wrist Curl",         sets:[{type:"work",reps:"to failure",notes:"1 set"}], isGrip:true },
        { name:"Barbell Reverse Wrist Curl", sets:[{type:"work",reps:"to failure",notes:"1 set"}], isGrip:true },
      ]
    },
    2: { // Tuesday
      label: "Pull + Forearms + Sprints",
      type:  "pull",
      note:  "Sprints BEFORE session — never after. 6–8 × 40m, full rest between each.",
      hasSprints: true,
      exercises: [
        { name:"Barbell Row",             sets:[{type:"warmup",pct:50,reps:6},{type:"warmup",pct:70,reps:4},{type:"warmup",pct:85,reps:2},{type:"work",reps:"failure"}] },
        { name:"Barbell Shrug",           sets:[{type:"warmup",pct:60,reps:8},{type:"work",reps:"failure"}] },
        { name:"Dumbbell Rear Delt Fly",  sets:[{type:"warmup",label:"light",reps:8},{type:"work",reps:"failure"}] },
        { name:"EZ Bar Curl",             sets:[{type:"warmup",pct:50,reps:6},{type:"warmup",pct:75,reps:3},{type:"work",reps:"failure"}] },
        { name:"Hammer Curl",             sets:[{type:"warmup",label:"light",reps:5},{type:"work",reps:"failure"}] },
        { name:"Neck Bridge",             sets:[{type:"work",reps:"30 sec",notes:"2 sets"}], isNeck:true },
        { name:"Plate Neck Curl",         sets:[{type:"work",reps:"15",notes:"1 set"}], isNeck:true },
        { name:"Barbell Wrist Curl",      sets:[{type:"work",reps:"to failure",notes:"1 set"}], isGrip:true },
        { name:"Barbell Reverse Wrist Curl",sets:[{type:"work",reps:"to failure",notes:"1 set"}], isGrip:true },
      ]
    },
    3: { // Wednesday
      label: "Legs + Core + Grip",
      type:  "legs",
      note:  "3–5 min rest between exercises. Working set to absolute failure.",
      exercises: [
        { name:"Barbell Back Squat",      sets:[{type:"warmup",pct:50,reps:6},{type:"warmup",pct:70,reps:4},{type:"warmup",pct:85,reps:2},{type:"work",reps:"failure"}] },
        { name:"Romanian Deadlift",       sets:[{type:"warmup",pct:50,reps:5},{type:"warmup",pct:75,reps:3},{type:"work",reps:"failure"}] },
        { name:"Leg Extension",           sets:[{type:"warmup",label:"light",reps:8},{type:"work",reps:"failure"}] },
        { name:"Hamstring Curl",          sets:[{type:"warmup",label:"light",reps:8},{type:"work",reps:"failure"}] },
        { name:"Standing Calf Raise",     sets:[{type:"warmup",label:"light",reps:10},{type:"work",reps:"failure"}] },
        { name:"Ab Roller",               sets:[{type:"work",reps:"8–12",notes:"3 sets"}], isCore:true },
        { name:"Bicycle Crunches",        sets:[{type:"work",reps:"15–20 each side",notes:"3 sets"}], isCore:true },
        { name:"Reverse Crunch",          sets:[{type:"work",reps:"12–15",notes:"3 sets"}], isCore:true },
        { name:"Barbell Wrist Curl",      sets:[{type:"work",reps:"to failure",notes:"1 set"}], isGrip:true },
        { name:"Barbell Reverse Wrist Curl",sets:[{type:"work",reps:"to failure",notes:"1 set"}], isGrip:true },
      ]
    },
    4: { // Thursday
      label: "Upper + Sprints",
      type:  "upper",
      note:  "Sprints BEFORE session — never after. 6–8 × 40m, full rest between each.",
      hasSprints: true,
      exercises: [
        { name:"Incline Barbell Bench Press",sets:[{type:"warmup",pct:50,reps:6},{type:"warmup",pct:70,reps:4},{type:"warmup",pct:85,reps:2},{type:"work",reps:"failure"}] },
        { name:"Barbell Row",             sets:[{type:"warmup",pct:50,reps:6},{type:"warmup",pct:70,reps:4},{type:"warmup",pct:85,reps:2},{type:"work",reps:"failure"}] },
        { name:"Dumbbell Shoulder Press", sets:[{type:"warmup",pct:50,reps:5},{type:"warmup",pct:75,reps:3},{type:"work",reps:"failure"}] },
        { name:"Dumbbell Rear Delt Fly",  sets:[{type:"warmup",label:"light",reps:8},{type:"work",reps:"failure"}] },
        { name:"Tricep Extension",        sets:[{type:"warmup",label:"light",reps:8},{type:"work",reps:"failure"}] },
        { name:"Preacher Curl",           sets:[{type:"warmup",pct:50,reps:6},{type:"warmup",pct:75,reps:3},{type:"work",reps:"failure"}] },
      ]
    },
    5: { // Friday
      label: "Lower + Core",
      type:  "lower",
      note:  "3–5 min rest between exercises. Working set to absolute failure.",
      exercises: [
        { name:"Barbell Lunges",          sets:[{type:"warmup",label:"light",reps:5},{type:"warmup",label:"mod",reps:3},{type:"work",reps:"failure each leg"}] },
        { name:"Leg Extension",           sets:[{type:"warmup",label:"light",reps:8},{type:"work",reps:"failure"}] },
        { name:"Romanian Deadlift",       sets:[{type:"warmup",pct:50,reps:5},{type:"warmup",pct:75,reps:3},{type:"work",reps:"failure"}] },
        { name:"Seated Calf Raise",       sets:[{type:"warmup",label:"light",reps:10},{type:"work",reps:"failure"}] },
        { name:"Ab Roller",               sets:[{type:"work",reps:"8–12",notes:"3 sets"}], isCore:true },
        { name:"Bicycle Crunches",        sets:[{type:"work",reps:"15–20 each side",notes:"3 sets"}], isCore:true },
        { name:"Reverse Crunch",          sets:[{type:"work",reps:"12–15",notes:"3 sets"}], isCore:true },
      ]
    },
    6: { // Saturday
      label: "Sprints Only",
      type:  "sprints",
      note:  "Maximum effort every sprint. Full rest between each — walk back, 90 sec minimum.",
      hasSprints: true,
      sprintsOnly: true,
      exercises: []
    },
  };

  const DAILY_WORK = [
    { name:"Pushups",           sets:[{type:"work",reps:"to failure",notes:"morning"}] },
    { name:"Negative Pull-Ups", sets:[{type:"work",reps:"to failure",notes:"morning"}] },
  ];

  const TYPE_COLOR = {
    push:    "rgba(99,102,241,0.12)",
    pull:    "rgba(236,72,153,0.10)",
    legs:    "rgba(34,197,94,0.08)",
    upper:   "rgba(167,139,250,0.10)",
    lower:   "rgba(245,158,11,0.08)",
    sprints: "rgba(239,68,68,0.08)",
    core:    "rgba(59,130,246,0.08)",
  };
  const TYPE_BORDER = {
    push:    "rgba(99,102,241,0.3)",
    pull:    "rgba(236,72,153,0.3)",
    legs:    "rgba(34,197,94,0.25)",
    upper:   "rgba(167,139,250,0.3)",
    lower:   "rgba(245,158,11,0.25)",
    sprints: "rgba(239,68,68,0.3)",
    core:    "rgba(59,130,246,0.25)",
  };
  const TYPE_ACCENT = {
    push:    "#a78bfa", pull:"#ec4899", legs:"#22c55e",
    upper:   "#c4b5fd", lower:"#fbbf24", sprints:"#f87171", core:"#60a5fa",
  };

  // ── DATA ──────────────────────────────────────────────────────────────────
  // Session log: [{ id, date, dayLabel, type, exercises:[{name, warmupSets:[{w,r}], workSet:{w,r}, notes}], sprintCount, notes }]

  function loadLog()      { return load(STORAGE_KEY, []); }
  function saveLog(l)     { save(STORAGE_KEY, l); }
  function loadUI()       { return load(UI_KEY, { activeTab:"today", calYear:new Date().getFullYear(), calMonth:new Date().getMonth(), calDay:"", chartExercise:"", chartMetric:"1rm" }); }
  function saveUI(u)      { save(UI_KEY, u); }

  // ── PR CALCULATIONS ───────────────────────────────────────────────────────

  function computePRs() {
    const log = loadLog();
    const prs = {};
    log.forEach(session => {
      (session.exercises || []).forEach(ex => {
        const ws = ex.workSet;
        if (!ws || !ws.w || !ws.r) return;
        const key = ex.name.toLowerCase();
        const e1rm = estimate1RM(ws.w, ws.r);
        if (!prs[key]) prs[key] = { name: ex.name, bestWeight: ws.w, best1RM: e1rm, date: session.date };
        if (ws.w > prs[key].bestWeight) { prs[key].bestWeight = ws.w; prs[key].date = session.date; }
        if (e1rm > prs[key].best1RM)    { prs[key].best1RM = e1rm; }
      });
    });
    return Object.values(prs).sort((a,b) => b.best1RM - a.best1RM);
  }

  function computeExerciseSeries(exerciseName) {
    const log = loadLog();
    const key = exerciseName.toLowerCase();
    const byDay = {};
    log.forEach(s => {
      const ex = (s.exercises||[]).find(e=>e.name.toLowerCase()===key);
      if (!ex?.workSet?.w) return;
      const ws = ex.workSet;
      if (!byDay[s.date]) byDay[s.date] = { date:s.date, best1rm:0, bestWeight:0 };
      const e1rm = estimate1RM(ws.w, ws.r);
      byDay[s.date].best1rm    = Math.max(byDay[s.date].best1rm, e1rm);
      byDay[s.date].bestWeight = Math.max(byDay[s.date].bestWeight, ws.w);
    });
    const days = Object.values(byDay).sort((a,b)=>a.date.localeCompare(b.date));
    return { labels:days.map(d=>fmtDate(d.date)), days, best1rm:days.map(d=>d.best1rm), bestWeight:days.map(d=>d.bestWeight) };
  }

  function computeStreak() {
    const log = loadLog();
    const days = new Set(log.map(s=>s.date));
    let streak=0;
    const d=new Date();
    while(true){
      const k=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      if(days.has(k)){streak++;d.setDate(d.getDate()-1);}
      else break;
    }
    return streak;
  }

  function getLastSession(exerciseName) {
    const log = [...loadLog()].reverse();
    const key = exerciseName.toLowerCase();
    for (const s of log) {
      const ex = (s.exercises||[]).find(e=>e.name.toLowerCase()===key);
      if (ex?.workSet?.w) return { date:s.date, ...ex.workSet };
    }
    return null;
  }

  function getAllExerciseNames() {
    const log = loadLog();
    const names = new Set();
    log.forEach(s=>(s.exercises||[]).forEach(e=>{ if(e.workSet?.w) names.add(e.name); }));
    return [...names].sort();
  }

  // ── MODAL ─────────────────────────────────────────────────────────────────
  function openModal(html) {
    if(typeof window.openModal==="function"&&window.openModal!==openModal){window.openModal(html);return;}
    const m=byId("modal"),b=byId("modalBody");if(!m||!b)return;b.innerHTML=html;m.style.display="flex";
  }
  function closeModal() {
    if(typeof window.closeModal==="function"&&window.closeModal!==closeModal){window.closeModal();return;}
    const m=byId("modal");if(m)m.style.display="none";
  }

  // ── TOAST ─────────────────────────────────────────────────────────────────
  function toast(msg) {
    let h=byId("kpToastHost");
    if(!h){h=document.createElement("div");h.id="kpToastHost";h.style.cssText="position:fixed;right:16px;bottom:80px;z-index:99999;display:flex;flex-direction:column;gap:8px;";document.body.appendChild(h);}
    const el=document.createElement("div");
    el.style.cssText="background:rgba(10,11,16,0.95);border:1px solid rgba(99,102,241,0.4);border-radius:12px;padding:10px 16px;color:white;font-weight:800;font-size:0.9rem;backdrop-filter:blur(12px);";
    el.textContent=msg;h.appendChild(el);
    setTimeout(()=>{el.style.cssText+=";opacity:0;transition:opacity 0.25s;";setTimeout(()=>el.remove(),300);},2000);
  }

  // ── TAB STATE ─────────────────────────────────────────────────────────────
  window.wktTab = function(tab) { const ui=loadUI(); ui.activeTab=tab; saveUI(ui); render(); };

  // ── SESSION LOGGER ────────────────────────────────────────────────────────
  // In-progress session stored in memory (cleared on page reload — intentional)
  let inProgress = null; // { date, dayOfWeek, exercises:[{name, warmupSets:[], workSet:null, done:false}], sprintCount:0, notes:"" }

  function startSession(dow) {
    const prog = PROGRAM[dow];
    if (!prog) return;
    inProgress = {
      date:       todayISO(),
      dayOfWeek:  dow,
      exercises:  prog.exercises.filter(e=>!e.isCore&&!e.isGrip&&!e.isNeck).map(e=>({
        name:       e.name,
        warmupSets: [],
        workSet:    null,
        coreNote:   "",
        done:       false,
      })),
      coreExercises: prog.exercises.filter(e=>e.isCore||e.isGrip||e.isNeck).map(e=>({
        name: e.name, done: false
      })),
      sprintCount: 0,
      notes: "",
    };
    render();
  }

  function saveSession() {
    if (!inProgress) return;
    const log = loadLog();
    const prog = PROGRAM[inProgress.dayOfWeek];
    log.push({
      id:        uid(),
      date:      inProgress.date,
      dayLabel:  prog?.label || "Session",
      type:      prog?.type  || "workout",
      exercises: inProgress.exercises.map(e=>({ name:e.name, warmupSets:e.warmupSets, workSet:e.workSet })),
      sprintCount: inProgress.sprintCount,
      notes:     inProgress.notes,
    });
    saveLog(log);
    toast("✅ Session saved!");
    inProgress = null;
    render();
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────────────

  function render() {
    const host = byId("exerciseCards"); if(!host) return;
    let mount = byId(MOUNT_ID);
    if(!mount){mount=document.createElement("div");mount.id=MOUNT_ID;host.prepend(mount);}

    const ui     = loadUI();
    const tab    = ui.activeTab || "today";
    const streak = computeStreak();
    const log    = loadLog();
    const dow    = dayOfWeek();
    const prog   = PROGRAM[dow];

    const TABS=[
      {id:"today",  label:"🏋️ Today"},
      {id:"log",    label:"📅 History"},
      {id:"progress",label:"🏆 Progress"},
    ];

    mount.innerHTML=`<div style="padding:4px 0;">

      <!-- HEADER -->
      <div style="margin-bottom:20px;">
        <h2 style="font-size:1.5rem;font-weight:900;margin-bottom:6px;background:linear-gradient(135deg,#e5e7eb,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
          Workouts
        </h2>
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
          <span style="font-size:0.82rem;color:${streak>0?"#f59e0b":"#6b7280"};">
            ${streak>0?`🔥 ${streak}-day streak`:"No streak — train today"}
          </span>
          <span style="font-size:0.82rem;color:#6b7280;">${log.length} sessions logged</span>
        </div>
      </div>

      <!-- TABS -->
      <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;margin-bottom:20px;">
        ${TABS.map(t=>`
          <button onclick="wktTab('${t.id}')" style="padding:9px 16px;border-radius:20px;cursor:pointer;white-space:nowrap;font-weight:800;font-size:0.85rem;transition:all 0.15s;
            border:1px solid ${tab===t.id?"rgba(99,102,241,0.5)":"rgba(255,255,255,0.1)"};
            background:${tab===t.id?"linear-gradient(135deg,rgba(99,102,241,0.85),rgba(167,139,250,0.75))":"rgba(255,255,255,0.04)"};
            color:${tab===t.id?"white":"#9ca3af"};">
            ${t.label}
          </button>
        `).join("")}
      </div>

      <!-- CONTENT -->
      <div id="wktContent">
        ${tab==="today"    ? renderTodayTab(dow, prog)  : ""}
        ${tab==="log"      ? renderLogTab(ui)            : ""}
        ${tab==="progress" ? renderProgressTab(ui)       : ""}
      </div>
    </div>`;

    bindEvents();
    if(tab==="progress") renderExChart(ui);
  }

  // ── TAB 1: TODAY ──────────────────────────────────────────────────────────

  function renderTodayTab(dow, prog) {
    const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const today = todayISO();
    const todayLog = loadLog().filter(s=>s.date===today);
    const alreadyLogged = todayLog.length > 0;

    // Daily morning work
    const morningBlock = `
      <div style="padding:14px 16px;border-radius:14px;margin-bottom:12px;
        border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.03);">
        <div style="font-size:0.7rem;font-weight:900;letter-spacing:0.1em;color:#6b7280;text-transform:uppercase;margin-bottom:10px;">
          ☀️ Morning — Every Day
        </div>
        ${DAILY_WORK.map(e=>`
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <div style="width:6px;height:6px;border-radius:50%;background:#a78bfa;flex-shrink:0;"></div>
            <span style="font-weight:700;font-size:0.88rem;">${esc(e.name)}</span>
            <span style="font-size:0.78rem;color:#6b7280;margin-left:auto;">${e.sets[0].reps}</span>
          </div>`).join("")}
      </div>`;

    // Sprint-only day
    if (prog?.sprintsOnly) {
      return morningBlock + renderSprintBlock(prog) + (inProgress ? renderActiveSession() : renderStartButton(dow, prog, alreadyLogged));
    }

    // Rest — shouldn't happen with 7-day program but just in case
    if (!prog) {
      return `${morningBlock}<div style="text-align:center;padding:40px 20px;color:#6b7280;">Rest day. Recover well.</div>`;
    }

    const color  = TYPE_COLOR[prog.type]  || "rgba(255,255,255,0.03)";
    const border = TYPE_BORDER[prog.type] || "rgba(255,255,255,0.08)";
    const accent = TYPE_ACCENT[prog.type] || "#a78bfa";

    return `
      ${morningBlock}

      <!-- Today's session card -->
      <div style="padding:20px;border-radius:16px;margin-bottom:14px;border:1px solid ${border};background:${color};">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
          <div>
            <div style="font-size:0.7rem;font-weight:900;letter-spacing:0.1em;color:${accent};text-transform:uppercase;margin-bottom:4px;">
              ${DAY_NAMES[dow]} · ${esc(prog.label)}
            </div>
            ${prog.hasSprints?`<div style="font-size:0.78rem;font-weight:800;color:#f87171;margin-bottom:4px;">⚡ Sprints FIRST — before lifting</div>`:""}
            <div style="font-size:0.78rem;color:#6b7280;line-height:1.4;">${esc(prog.note)}</div>
          </div>
          ${alreadyLogged?`<span style="font-size:0.72rem;padding:3px 10px;border-radius:20px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);color:#86efac;font-weight:800;">✓ Logged Today</span>`:""}
        </div>

        <!-- Exercise list -->
        ${renderExerciseList(prog)}
      </div>

      <!-- Sprint block if needed -->
      ${prog.hasSprints ? renderSprintBlock(prog) : ""}

      <!-- Active session or start button -->
      ${inProgress ? renderActiveSession() : renderStartButton(dow, prog, alreadyLogged)}
    `;
  }

  function renderExerciseList(prog) {
    const mainExercises = prog.exercises.filter(e=>!e.isCore&&!e.isGrip&&!e.isNeck);
    const accessories   = prog.exercises.filter(e=>e.isCore||e.isGrip||e.isNeck);

    let html = "";

    if (mainExercises.length) {
      html += `<div style="display:grid;gap:8px;margin-bottom:${accessories.length?12:0}px;">`;
      mainExercises.forEach((ex, i) => {
        const last = getLastSession(ex.name);
        const warmups = ex.sets.filter(s=>s.type==="warmup");
        const workSet = ex.sets.find(s=>s.type==="work");
        html += `
          <div style="padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.03);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">
              <div>
                <span style="font-weight:800;font-size:0.9rem;color:#e5e7eb;">${i+1}. ${esc(ex.name)}</span>
                ${last?`<div style="font-size:0.75rem;color:#6b7280;margin-top:3px;">Last: ${last.w}lbs × ${last.r} · ${fmtDate(last.date)}</div>`:"<div style='font-size:0.75rem;color:#4b5563;margin-top:3px;'>No history yet</div>"}
              </div>
              <div style="text-align:right;flex-shrink:0;">
                ${warmups.map(s=>`<div style="font-size:0.72rem;color:#4b5563;line-height:1.5;">${s.pct?s.pct+"%":s.label||"light"} × ${s.reps}</div>`).join("")}
                <div style="font-size:0.75rem;font-weight:800;color:#a78bfa;margin-top:2px;">1 × ${workSet?.reps||"failure"}</div>
              </div>
            </div>
          </div>`;
      });
      html += `</div>`;
    }

    if (accessories.length) {
      html += `<div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;display:grid;gap:6px;">`;
      accessories.forEach(ex => {
        const tag = ex.isNeck?"Neck":ex.isGrip?"Grip":"Core";
        const tagColor = ex.isNeck?"#a78bfa":ex.isGrip?"#fbbf24":"#60a5fa";
        html += `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);background:rgba(255,255,255,0.02);">
            <span style="font-size:0.68rem;padding:2px 7px;border-radius:20px;background:rgba(255,255,255,0.06);color:${tagColor};font-weight:800;flex-shrink:0;">${tag}</span>
            <span style="font-size:0.85rem;font-weight:600;color:#9ca3af;">${esc(ex.name)}</span>
            <span style="font-size:0.75rem;color:#4b5563;margin-left:auto;">${ex.sets[0]?.reps||""}</span>
          </div>`;
      });
      html += `</div>`;
    }

    return html;
  }

  function renderSprintBlock(prog) {
    return `
      <div style="padding:16px;border-radius:14px;margin-bottom:14px;
        border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.06);">
        <div style="font-weight:900;font-size:0.88rem;color:#f87171;margin-bottom:8px;">⚡ Sprint Protocol</div>
        <div style="display:grid;gap:5px;font-size:0.82rem;color:#9ca3af;">
          <div>• 6–8 × 40 meter sprints</div>
          <div>• Maximum effort every single sprint</div>
          <div>• Full rest between — walk back, 90 sec minimum</div>
          <div>• Never sprint after lifting</div>
        </div>
        ${inProgress!==null?`
          <div style="margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="font-size:0.82rem;color:#9ca3af;">Sprints completed:</div>
            <div style="display:flex;gap:6px;">
              ${[6,7,8].map(n=>`
                <button onclick="wktSetSprints(${n})" style="padding:6px 12px;border-radius:8px;font-weight:800;font-size:0.82rem;cursor:pointer;
                  border:1px solid ${inProgress.sprintCount===n?"rgba(239,68,68,0.5)":"rgba(255,255,255,0.1)"};
                  background:${inProgress.sprintCount===n?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.04)"};
                  color:${inProgress.sprintCount===n?"#f87171":"#9ca3af"};">${n}</button>
              `).join("")}
            </div>
          </div>` : ""}
      </div>`;
  }

  function renderStartButton(dow, prog, alreadyLogged) {
    return `
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button onclick="wktStartSession(${dow})" style="flex:1;min-width:200px;padding:14px 20px;border-radius:14px;
          font-weight:900;font-size:0.95rem;border:none;cursor:pointer;color:white;
          background:linear-gradient(135deg,rgba(99,102,241,0.9),rgba(167,139,250,0.8));">
          ${alreadyLogged?"➕ Log Another Session":"▶ Start Session"}
        </button>
        ${alreadyLogged?"":`<button onclick="wktQuickLogModal(${dow})" style="padding:14px 20px;border-radius:14px;
          font-weight:800;font-size:0.9rem;cursor:pointer;color:#9ca3af;
          border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);">
          Quick Log
        </button>`}
      </div>`;
  }

  function renderActiveSession() {
    if (!inProgress) return "";
    const prog = PROGRAM[inProgress.dayOfWeek];

    return `
      <div style="padding:20px;border-radius:16px;border:1px solid rgba(99,102,241,0.35);background:rgba(99,102,241,0.07);">
        <div style="font-weight:900;font-size:0.95rem;color:#a78bfa;margin-bottom:16px;">
          🔴 Session in Progress
        </div>

        ${inProgress.exercises.map((ex, i) => {
          const progEx = prog?.exercises?.find(e=>e.name===ex.name);
          const warmups = progEx?.sets?.filter(s=>s.type==="warmup") || [];
          const last = getLastSession(ex.name);

          return `
            <div style="padding:14px;border-radius:12px;margin-bottom:10px;
              border:1px solid ${ex.done?"rgba(34,197,94,0.25)":"rgba(255,255,255,0.08)"};
              background:${ex.done?"rgba(34,197,94,0.06)":"rgba(255,255,255,0.03)"};">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
                <span style="font-weight:800;font-size:0.9rem;color:${ex.done?"#86efac":"#e5e7eb"};">${i+1}. ${esc(ex.name)}</span>
                ${ex.done?`<span style="font-size:0.72rem;color:#86efac;font-weight:800;">✓ Done</span>`:""}
              </div>

              ${!ex.done?`
                <!-- Warm-up reference -->
                ${warmups.length?`
                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                    ${warmups.map(s=>`<span style="font-size:0.72rem;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,0.06);color:#6b7280;">
                      ${s.pct?s.pct+"%":s.label||"light"} × ${s.reps}
                    </span>`).join("")}
                  </div>`:""}

                ${last?`<div style="font-size:0.75rem;color:#6b7280;margin-bottom:10px;">Last: <strong style="color:#a78bfa;">${last.w}lbs × ${last.r}</strong> — beat this</div>`:""}

                <!-- Working set inputs -->
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  <div>
                    <div style="font-size:0.7rem;color:#6b7280;margin-bottom:4px;">Weight (lbs)</div>
                    <input type="number" id="wktW_${i}" min="0" step="2.5" placeholder="${last?.w||0}"
                      style="width:100px;padding:9px 10px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:white;outline:none;font-size:0.9rem;" />
                  </div>
                  <div>
                    <div style="font-size:0.7rem;color:#6b7280;margin-bottom:4px;">Reps</div>
                    <input type="number" id="wktR_${i}" min="1" placeholder="${last?.r||""}"
                      style="width:80px;padding:9px 10px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:white;outline:none;font-size:0.9rem;" />
                  </div>
                  <button onclick="wktLogSet(${i})" style="margin-top:18px;padding:9px 18px;border-radius:9px;
                    border:none;cursor:pointer;font-weight:900;color:white;font-size:0.88rem;
                    background:linear-gradient(135deg,rgba(99,102,241,0.9),rgba(167,139,250,0.8));">
                    Log
                  </button>
                </div>
              `:ex.workSet?`
                <div style="font-size:0.88rem;color:#86efac;font-weight:800;">
                  ${ex.workSet.w} lbs × ${ex.workSet.r} reps
                  <span style="color:#6b7280;font-weight:400;margin-left:8px;">~${estimate1RM(ex.workSet.w,ex.workSet.r)} 1RM</span>
                </div>`:""}
            </div>`;
        }).join("")}

        <!-- Accessories checklist -->
        ${inProgress.coreExercises.length?`
          <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:12px;margin-top:4px;">
            <div style="font-size:0.72rem;font-weight:800;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;margin-bottom:8px;">Accessories</div>
            ${inProgress.coreExercises.map((ex,i)=>`
              <div onclick="wktToggleAccessory(${i})" style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;cursor:pointer;margin-bottom:6px;
                border:1px solid ${ex.done?"rgba(34,197,94,0.25)":"rgba(255,255,255,0.07)"};
                background:${ex.done?"rgba(34,197,94,0.06)":"rgba(255,255,255,0.02)"};">
                <div style="width:18px;height:18px;border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:900;
                  border:2px solid ${ex.done?"#22c55e":"rgba(255,255,255,0.2)"};background:${ex.done?"#22c55e":"transparent"};color:white;">
                  ${ex.done?"✓":""}
                </div>
                <span style="font-size:0.85rem;color:${ex.done?"#86efac":"#9ca3af"};">${esc(ex.name)}</span>
              </div>`).join("")}
          </div>`:""}

        <!-- Notes -->
        <div style="margin-top:12px;">
          <textarea id="wktSessionNotes" placeholder="Session notes (optional)..."
            style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#9ca3af;font-size:0.85rem;resize:none;min-height:60px;outline:none;"
            oninput="wktUpdateNotes(this.value)">${esc(inProgress.notes||"")}</textarea>
        </div>

        <!-- Save / Cancel -->
        <div style="display:flex;gap:10px;margin-top:14px;">
          <button onclick="wktSaveSession()" style="flex:1;padding:13px;border-radius:12px;font-weight:900;font-size:0.95rem;border:none;cursor:pointer;color:white;
            background:linear-gradient(135deg,rgba(34,197,94,0.9),rgba(22,197,94,0.8));">
            ✅ Save Session
          </button>
          <button onclick="wktCancelSession()" style="padding:13px 18px;border-radius:12px;font-weight:800;font-size:0.88rem;cursor:pointer;color:#9ca3af;
            border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);">
            Cancel
          </button>
        </div>
      </div>`;
  }

  // ── TAB 2: LOG / HISTORY ──────────────────────────────────────────────────

  function renderLogTab(ui) {
    const log = loadLog();
    if (!log.length) return `
      <div style="padding:40px 20px;text-align:center;border-radius:16px;border:1px dashed rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);">
        <div style="font-size:1.8rem;margin-bottom:10px;">📋</div>
        <div style="font-weight:800;color:#e5e7eb;margin-bottom:6px;">No sessions yet</div>
        <div style="font-size:0.85rem;color:#6b7280;">Log your first session from the Today tab.</div>
      </div>`;

    // Last 20 sessions, newest first
    const recent = [...log].reverse().slice(0, 20);

    return `
      <div style="display:grid;gap:8px;">
        ${recent.map((s,i)=>{
          const color  = TYPE_COLOR[s.type]  || "rgba(255,255,255,0.03)";
          const border = TYPE_BORDER[s.type] || "rgba(255,255,255,0.08)";
          const accent = TYPE_ACCENT[s.type] || "#a78bfa";
          const mainEx = (s.exercises||[]).filter(e=>e.workSet?.w);

          return `
            <div style="padding:14px 16px;border-radius:14px;border:1px solid ${border};background:${color};">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:${mainEx.length?10:0}px;">
                <div>
                  <div style="font-weight:900;font-size:0.9rem;color:#e5e7eb;">${esc(s.dayLabel)}</div>
                  <div style="font-size:0.75rem;color:#6b7280;margin-top:2px;">${fmtDate(s.date)}${s.sprintCount?` · ${s.sprintCount} sprints`:""}</div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;">
                  ${i===0?`<span style="font-size:0.7rem;padding:2px 8px;border-radius:20px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);color:#a78bfa;font-weight:800;">Latest</span>`:""}
                  <button onclick="wktDeleteSession('${s.id}')" style="width:24px;height:24px;border-radius:50%;border:1px solid rgba(239,68,68,0.2);background:rgba(239,68,68,0.05);color:#ef4444;cursor:pointer;font-size:0.75rem;display:flex;align-items:center;justify-content:center;">✕</button>
                </div>
              </div>
              ${mainEx.length?`
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  ${mainEx.map(e=>`
                    <div style="padding:5px 10px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);">
                      <div style="font-size:0.75rem;font-weight:700;color:#e5e7eb;">${esc(e.name)}</div>
                      <div style="font-size:0.72rem;color:${accent};">${e.workSet.w}lbs × ${e.workSet.r}</div>
                    </div>`).join("")}
                </div>`:""}
              ${s.notes?`<div style="margin-top:8px;font-size:0.78rem;color:#6b7280;font-style:italic;">${esc(s.notes)}</div>`:""}
            </div>`;
        }).join("")}
      </div>`;
  }

  // ── TAB 3: PROGRESS ───────────────────────────────────────────────────────

  function renderProgressTab(ui) {
    const prs    = computePRs();
    const exList = getAllExerciseNames();
    if (!ui.chartExercise && exList.length) ui.chartExercise = exList[0];

    return `
      <!-- PRs -->
      <div style="padding:16px;border-radius:16px;margin-bottom:14px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);">
        <div style="font-weight:900;font-size:0.88rem;text-transform:uppercase;letter-spacing:0.06em;color:#e5e7eb;margin-bottom:14px;">Personal Records</div>
        ${prs.length
          ? `<div style="display:grid;gap:7px;">
              ${prs.map((p,i)=>`
                <div style="display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:12px;
                  border:1px solid ${i===0?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.07)"};
                  background:${i===0?"rgba(245,158,11,0.06)":"rgba(255,255,255,0.02)"};">
                  <div style="width:28px;height:28px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:0.9rem;
                    background:${i===0?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.05)"};border:1px solid ${i===0?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.1)"};">
                    ${i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
                  </div>
                  <div style="flex:1;">
                    <div style="font-weight:800;font-size:0.88rem;color:#e5e7eb;">${esc(p.name)}</div>
                    <div style="font-size:0.75rem;color:#6b7280;margin-top:2px;display:flex;gap:10px;flex-wrap:wrap;">
                      <span>1RM <strong style="color:#a78bfa;">${p.best1RM}</strong></span>
                      <span>Best <strong style="color:#e5e7eb;">${p.bestWeight}lbs</strong></span>
                      <span style="color:#4b5563;">${fmtDate(p.date)}</span>
                    </div>
                  </div>
                </div>`).join("")}
            </div>`
          : `<div style="color:#4b5563;font-size:0.85rem;">Log sessions to start tracking PRs.</div>`}
      </div>

      <!-- Progress chart -->
      <div style="padding:16px;border-radius:16px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);">
        <div style="font-weight:900;font-size:0.88rem;text-transform:uppercase;letter-spacing:0.06em;color:#e5e7eb;margin-bottom:12px;">Strength Progress</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
          <select id="wktExSelect" class="form-input" style="flex:1;min-width:200px;">
            ${exList.length
              ? exList.map(n=>`<option value="${esc(n)}" ${n===ui.chartExercise?"selected":""}>${esc(n)}</option>`).join("")
              : `<option value="">No data yet</option>`}
          </select>
          <select id="wktMetricSelect" class="form-input" style="width:150px;">
            <option value="1rm"    ${ui.chartMetric==="1rm"   ?"selected":""}>Est. 1RM</option>
            <option value="weight" ${ui.chartMetric==="weight"?"selected":""}>Best Weight</option>
          </select>
        </div>
        <div style="height:240px;"><canvas id="wktExChart" height="240"></canvas></div>
      </div>
    `;
  }

  function renderExChart(ui) {
    if(typeof Chart==="undefined") return;
    const canvas=byId("wktExChart"); if(!canvas) return;
    if(exerciseChart){try{exerciseChart.destroy();}catch{} exerciseChart=null;}
    if(!ui.chartExercise) return;
    const series=computeExerciseSeries(ui.chartExercise); if(!series.days.length) return;
    const data  = ui.chartMetric==="weight" ? series.bestWeight : series.best1rm;
    const label = ui.chartMetric==="weight" ? "Best Weight (lbs)" : "Est. 1RM (lbs)";
    exerciseChart=new Chart(canvas.getContext("2d"),{
      type:"line",
      data:{labels:series.labels,datasets:[{label,data,tension:0.35,borderWidth:3,pointRadius:4,spanGaps:true,
        borderColor:"#6366f1",backgroundColor:"rgba(99,102,241,0.08)"}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{labels:{color:"rgba(255,255,255,0.7)"}}},
        scales:{
          x:{ticks:{color:"rgba(255,255,255,0.5)"},grid:{color:"rgba(255,255,255,0.05)"}},
          y:{beginAtZero:false,ticks:{color:"rgba(255,255,255,0.5)"},grid:{color:"rgba(255,255,255,0.05)"}}
        }
      }
    });
  }

  // ── BIND EVENTS ───────────────────────────────────────────────────────────

  function bindEvents() {
    const exSel=byId("wktExSelect");
    if(exSel) exSel.onchange=()=>{ const ui=loadUI(); ui.chartExercise=exSel.value; saveUI(ui); renderExChart(ui); };
    const mSel=byId("wktMetricSelect");
    if(mSel) mSel.onchange=()=>{ const ui=loadUI(); ui.chartMetric=mSel.value; saveUI(ui); renderExChart(loadUI()); };
  }

  // ── GLOBAL ACTIONS ────────────────────────────────────────────────────────

  window.wktStartSession = function(dow) {
    startSession(dow); render();
  };

  window.wktCancelSession = function() {
    if(!confirm("Cancel session? Unsaved data will be lost.")) return;
    inProgress=null; render();
  };

  window.wktLogSet = function(i) {
    if(!inProgress) return;
    const w = parseFloat(byId(`wktW_${i}`)?.value);
    const r = parseInt(byId(`wktR_${i}`)?.value);
    if(isNaN(w)||isNaN(r)||w<=0||r<=0){ toast("Enter weight and reps"); return; }

    const prev = getLastSession(inProgress.exercises[i].name);
    inProgress.exercises[i].workSet = { w, r };
    inProgress.exercises[i].done    = true;

    // PR check
    if(prev){
      const newE=estimate1RM(w,r), oldE=estimate1RM(prev.w,prev.r);
      if(newE>oldE||w>prev.w) toast(`🏆 New PR on ${inProgress.exercises[i].name}!`);
    }
    render();
  };

  window.wktToggleAccessory = function(i) {
    if(!inProgress||!inProgress.coreExercises[i]) return;
    inProgress.coreExercises[i].done=!inProgress.coreExercises[i].done;
    render();
  };

  window.wktSetSprints = function(n) {
    if(!inProgress) return;
    inProgress.sprintCount=n; render();
  };

  window.wktUpdateNotes = function(val) {
    if(!inProgress) return;
    inProgress.notes=val;
  };

  window.wktSaveSession = function() { saveSession(); };

  window.wktDeleteSession = function(id) {
    if(!confirm("Delete this session?")) return;
    const log=loadLog().filter(s=>s.id!==id); saveLog(log); render();
  };

  // Quick log modal — for logging without step-by-step
  window.wktQuickLogModal = function(dow) {
    const prog = PROGRAM[dow];
    if(!prog) return;
    const mainEx = prog.exercises.filter(e=>!e.isCore&&!e.isGrip&&!e.isNeck);

    openModal(`
      <h2 style="margin-bottom:16px;">Quick Log — ${esc(prog.label)}</h2>
      <div style="display:grid;gap:10px;margin-bottom:16px;">
        ${mainEx.map((ex,i)=>{
          const last=getLastSession(ex.name);
          return `
            <div style="padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);">
              <div style="font-weight:800;margin-bottom:6px;font-size:0.88rem;">${esc(ex.name)}</div>
              ${last?`<div style="font-size:0.75rem;color:#6b7280;margin-bottom:8px;">Last: ${last.w}lbs × ${last.r}</div>`:""}
              <div style="display:flex;gap:8px;">
                <input type="number" id="qlW_${i}" placeholder="lbs" value="${last?.w||""}" class="form-input" style="width:90px;" />
                <input type="number" id="qlR_${i}" placeholder="reps" value="${last?.r||""}" class="form-input" style="width:80px;" />
              </div>
            </div>`;
        }).join("")}
        ${prog.hasSprints?`
          <div style="padding:10px 14px;border-radius:10px;border:1px solid rgba(239,68,68,0.2);background:rgba(239,68,68,0.05);">
            <div style="font-weight:800;margin-bottom:6px;font-size:0.85rem;">Sprints completed</div>
            <div style="display:flex;gap:6px;">
              ${[6,7,8].map(n=>`<button id="qlSp_${n}" onclick="wktQlSprintSelect(${n})" style="padding:6px 12px;border-radius:8px;font-weight:800;font-size:0.82rem;cursor:pointer;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:#9ca3af;" class="qlSprintBtn">${n}</button>`).join("")}
            </div>
          </div>`:""
        }
      </div>
      <button onclick="wktSaveQuickLog(${dow},${mainEx.length})" class="form-submit" style="width:100%;">Save Session</button>
    `);
  };

  let qlSprintCount = 0;
  window.wktQlSprintSelect = function(n) {
    qlSprintCount=n;
    document.querySelectorAll(".qlSprintBtn").forEach(b=>{
      b.style.background=b.id===`qlSp_${n}`?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.06)";
      b.style.color=b.id===`qlSp_${n}`?"#f87171":"#9ca3af";
      b.style.borderColor=b.id===`qlSp_${n}`?"rgba(239,68,68,0.4)":"rgba(255,255,255,0.12)";
    });
  };

  window.wktSaveQuickLog = function(dow, exCount) {
    const prog = PROGRAM[dow];
    if(!prog) return;
    const mainEx = prog.exercises.filter(e=>!e.isCore&&!e.isGrip&&!e.isNeck);
    const exercises = [];
    for(let i=0;i<exCount;i++){
      const w=parseFloat(byId(`qlW_${i}`)?.value), r=parseInt(byId(`qlR_${i}`)?.value);
      if(w>0&&r>0) exercises.push({name:mainEx[i].name,warmupSets:[],workSet:{w,r}});
    }
    if(!exercises.length){toast("Enter at least one set");return;}
    const log=loadLog();
    log.push({id:uid(),date:todayISO(),dayLabel:prog.label,type:prog.type,exercises,sprintCount:qlSprintCount,notes:""});
    saveLog(log);
    closeModal();
    qlSprintCount=0;
    toast("✅ Session saved!");
    render();
  };

  // ── BOOT ──────────────────────────────────────────────────────────────────

  function isActive() { const p=byId("workoutPage"); return !!(p&&p.classList.contains("active")); }

  function boot() {
    if(typeof window.showPage==="function"&&!window.showPage.__kpWktWrapped2){
      const orig=window.showPage;
      window.showPage=function(page){ const r=orig.apply(this,arguments); if(page==="workout") setTimeout(render,50); return r; };
      window.showPage.__kpWktWrapped2=true;
    }
    document.addEventListener("click",e=>{ if(e.target.closest?.(".kp-nav-btn")) setTimeout(()=>{ if(isActive()) render(); },80); });
    setTimeout(()=>{ if(isActive()) render(); },120);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();

  window.KPWorkouts = { render };

})();
