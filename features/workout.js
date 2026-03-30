/* features/workout.js — KINGS PROTOCOL
   Tab-based rewrite. 3 tabs:
   1. Train    — active workouts, today summary, preset quick-start
   2. Records  — PRs, strength progress chart
   3. History  — clean calendar + day detail
   All data logic preserved exactly from original.
*/

(function () {
  "use strict";

  const STORAGE_KEY  = "kp_workouts_v2";
  const UI_STATE_KEY = "kp_workouts_ui_v2";
  const MOUNT_ID     = "kpWorkoutMount_v2";

  let weeklyChart   = null;
  let exerciseChart = null;

  // ── HELPERS ───────────────────────────────────────────────────────────────

  function byId(id)         { return document.getElementById(id); }
  function safeParse(j, fb) { try { const v = JSON.parse(j); return v ?? fb; } catch { return fb; } }
  function save(k, v)       { localStorage.setItem(k, JSON.stringify(v)); }
  function load(k, fb)      { return safeParse(localStorage.getItem(k), fb); }
  function uid()            { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function esc(s)           { return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }
  function normStr(x)       { return String(x ?? "").trim(); }
  function lower(x)         { return normStr(x).toLowerCase(); }
  function clampNum(n,a,b)  { const x=Number(n); return Number.isFinite(x)?Math.min(b,Math.max(a,x)):a; }

  function todayISO() { return new Date().toISOString().split("T")[0]; }
  function dayKey(iso) { try { return String(iso||todayISO()).split("T")[0]; } catch { return todayISO(); } }
  function pad(n) { return String(n).padStart(2,"0"); }
  function localISO(y,m,d) { return `${y}-${pad(m+1)}-${pad(d)}`; }

  function formatDay(iso) {
    try { return new Date(iso+"T00:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"}); }
    catch { return iso; }
  }
  function formatFullDay(iso) {
    try { return new Date(iso+"T00:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"}); }
    catch { return iso; }
  }

  function estimate1RM(w, r) {
    const wn=Number(w||0), rn=Number(r||0);
    if(!wn||rn<1) return 0;
    return wn*(1+rn/30);
  }
  function calcSetVol(s)  { return Number(s?.weight||0)*Number(s?.reps||0); }
  function calcWktVol(w)  { return (w.exercises||[]).reduce((s,ex)=>(ex.sets||[]).reduce((a,set)=>a+calcSetVol(set),s),0); }

  // ── DATA MODEL ────────────────────────────────────────────────────────────

  function normalizeWorkouts(list) {
    if(!Array.isArray(list)) return [];
    return list.map(w => {
      const raw = normStr(w?.status||"current");
      const status = (raw==="planned"||raw==="current") ? "current" : raw==="completed" ? "completed" : "current";
      return {
        id:         w?.id||uid(),
        name:       normStr(w?.name||"Untitled")||"Untitled",
        type:       normStr(w?.type||""),
        status,
        createdAt:  Number(w?.createdAt||Date.now()),
        updatedAt:  Number(w?.updatedAt||Date.now()),
        exercises:  Array.isArray(w?.exercises) ? w.exercises.map(ex=>({
          id:        ex?.id||uid(),
          name:      normStr(ex?.name||"Exercise")||"Exercise",
          createdAt: Number(ex?.createdAt||Date.now()),
          updatedAt: Number(ex?.updatedAt||Date.now()),
          sets:      Array.isArray(ex?.sets) ? ex.sets.map(s=>({
            id:        s?.id||uid(),
            date:      dayKey(s?.date||todayISO()),
            weight:    Number(s?.weight||0),
            reps:      Number(s?.reps||0),
            createdAt: Number(s?.createdAt||Date.now()),
            updatedAt: Number(s?.updatedAt||Date.now()),
          })) : []
        })) : []
      };
    });
  }

  function loadWorkouts()    { return normalizeWorkouts(load(STORAGE_KEY,[])); }
  function saveWorkouts(wks) { save(STORAGE_KEY, wks); }

  function loadUI() {
    const now = new Date();
    const s = load(UI_STATE_KEY, {});
    if(!s||typeof s!=="object") return defaults(now);
    if(typeof s.searchQuery!=="string") s.searchQuery="";
    if(!s.collapsedWorkouts||typeof s.collapsedWorkouts!=="object") s.collapsedWorkouts={};
    const y=Number(s.calendarYear), m=Number(s.calendarMonth);
    s.calendarYear  = Number.isFinite(y)?clampNum(y,1970,2100):now.getFullYear();
    s.calendarMonth = Number.isFinite(m)?clampNum(m,0,11):now.getMonth();
    if(typeof s.calendarSelectedDay!=="string") s.calendarSelectedDay="";
    if(typeof s.exerciseChartExercise!=="string") s.exerciseChartExercise="";
    if(typeof s.exerciseChartMetric!=="string") s.exerciseChartMetric="1rm";
    if(typeof s.activeTab!=="string") s.activeTab="train";
    return s;
  }
  function defaults(now) {
    return { searchQuery:"", collapsedWorkouts:{}, calendarYear:now.getFullYear(), calendarMonth:now.getMonth(),
             calendarSelectedDay:"", exerciseChartExercise:"", exerciseChartMetric:"1rm", activeTab:"train" };
  }
  function saveUI(s) { save(UI_STATE_KEY, s); }

  // ── ANALYTICS ─────────────────────────────────────────────────────────────

  function flattenSets(workouts) {
    const out=[];
    (workouts||[]).forEach(w=>{
      (w?.exercises||[]).forEach(ex=>{
        (ex?.sets||[]).forEach(s=>{
          out.push({ workoutId:w?.id, workoutName:normStr(w?.name), exerciseName:normStr(ex?.name),
            date:dayKey(s?.date), weight:Number(s?.weight||0), reps:Number(s?.reps||0),
            volume:Number(s?.weight||0)*Number(s?.reps||0), est1rm:estimate1RM(s?.weight,s?.reps) });
        });
      });
    });
    return out.sort((a,b)=>new Date(a.date)-new Date(b.date));
  }

  function computePRs(workouts) {
    const pr={};
    flattenSets(workouts).forEach(s=>{
      const k=lower(s.exerciseName); if(!k) return;
      if(!pr[k]) { pr[k]={exerciseName:normStr(s.exerciseName),bestWeight:s.weight,bestVolume:s.volume,best1RM:Math.round(s.est1rm||0),date:s.date}; return; }
      if(s.weight>pr[k].bestWeight)          { pr[k].bestWeight=s.weight; pr[k].date=s.date; }
      if(s.volume>pr[k].bestVolume)          { pr[k].bestVolume=s.volume; }
      if(Math.round(s.est1rm||0)>pr[k].best1RM) { pr[k].best1RM=Math.round(s.est1rm||0); }
    });
    return Object.values(pr).sort((a,b)=>b.best1RM-a.best1RM);
  }

  function computeStreak(workouts) {
    const days=new Set(flattenSets(workouts).map(s=>s.date));
    let streak=0;
    for(let i=0;i<180;i++) {
      const d=new Date(); d.setDate(d.getDate()-i);
      if(days.has(d.toISOString().split("T")[0])) streak++;
      else break;
    }
    return streak;
  }

  function computeToday(workouts) {
    const t=todayISO(), sets=flattenSets(workouts).filter(s=>s.date===t);
    const byEx={};
    sets.forEach(s=>{ if(!byEx[s.exerciseName]) byEx[s.exerciseName]=[]; byEx[s.exerciseName].push(s); });
    return { totalSets:sets.length, exercises:Object.keys(byEx).sort(), byEx, volume:sets.reduce((a,s)=>a+s.volume,0) };
  }

  function computeDailySeries(workouts, range="7") {
    const sets=flattenSets(workouts); const today=new Date(); let keys=[];
    if(range==="all") { keys=[...new Set(sets.map(s=>s.date))].sort((a,b)=>new Date(a)-new Date(b)); if(!keys.length) return computeDailySeries(workouts,"7"); }
    else { const n=range==="30"?30:7; for(let i=n-1;i>=0;i--){const d=new Date(today);d.setDate(today.getDate()-i);keys.push(d.toISOString().split("T")[0]);} }
    const map={}; keys.forEach(k=>(map[k]={sets:0,volume:0}));
    sets.forEach(s=>{ if(!map[s.date]) return; map[s.date].sets++; map[s.date].volume+=s.volume; });
    return { keys, labels:keys.map(formatDay), sets:keys.map(k=>map[k].sets), volume:keys.map(k=>map[k].volume) };
  }

  function computeExSeries(workouts, exerciseName) {
    const ex=normStr(exerciseName); if(!ex) return null;
    const sets=flattenSets(workouts).filter(s=>lower(s.exerciseName)===lower(ex));
    if(!sets.length) return null;
    const byDay={};
    sets.forEach(s=>{
      if(!byDay[s.date]) byDay[s.date]={day:s.date,best1rm:0,bestWeight:0,volume:0};
      byDay[s.date].best1rm=Math.max(byDay[s.date].best1rm,s.est1rm||0);
      byDay[s.date].bestWeight=Math.max(byDay[s.date].bestWeight,s.weight||0);
      byDay[s.date].volume+=s.volume||0;
    });
    const days=Object.values(byDay).sort((a,b)=>new Date(a.day)-new Date(b.day));
    return { labels:days.map(d=>formatDay(d.day)), days, best1rm:days.map(d=>Math.round(d.best1rm||0)),
             bestWeight:days.map(d=>Math.round(d.bestWeight||0)), volume:days.map(d=>Math.round(d.volume||0)) };
  }

  function buildDayIndex(workouts) {
    const idx={};
    (workouts||[]).forEach(w=>{
      const byDate={};
      (w?.exercises||[]).forEach(ex=>{
        const exName=normStr(ex?.name)||"Exercise";
        (ex?.sets||[]).forEach(s=>{
          const d=dayKey(s?.date);
          if(!byDate[d]) byDate[d]=[];
          byDate[d].push({exerciseName:exName,setId:s?.id,weight:Number(s?.weight||0),reps:Number(s?.reps||0),date:d,volume:calcSetVol(s)});
        });
      });
      Object.keys(byDate).forEach(dk=>{
        const sets=byDate[dk]; const vol=sets.reduce((a,s)=>a+Number(s.volume||0),0);
        if(!idx[dk]) idx[dk]={workouts:[],totalSets:0,totalVolume:0};
        idx[dk].workouts.push({id:w?.id,name:normStr(w?.name)||"Untitled",type:normStr(w?.type||""),status:w?.status==="completed"?"completed":"current",sets});
        idx[dk].totalSets+=sets.length; idx[dk].totalVolume+=vol;
      });
    });
    return idx;
  }

  function getAllExNames(workouts) {
    const s=new Set();
    (workouts||[]).forEach(w=>(w?.exercises||[]).forEach(ex=>{const n=normStr(ex?.name);if(n)s.add(n);}));
    return [...s].sort((a,b)=>a.localeCompare(b));
  }

  function getLastWorkout(workouts) {
    return [...(workouts||[])].sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0))[0]||null;
  }

  // ── CORE ACTIONS ──────────────────────────────────────────────────────────

  function addWorkout(name, type) {
    const n=normStr(name); if(!n) return;
    const wks=loadWorkouts();
    wks.push({id:uid(),name:n,type:normStr(type),status:"current",createdAt:Date.now(),updatedAt:Date.now(),exercises:[]});
    saveWorkouts(wks); render();
  }

  function deleteWorkout(id) { saveWorkouts(loadWorkouts().filter(w=>w.id!==id)); render(); }

  function moveWorkout(id, status) {
    const next=status==="completed"?"completed":"current";
    const wks=loadWorkouts(); const w=wks.find(x=>x.id===id); if(!w) return;
    w.status=next; w.updatedAt=Date.now(); saveWorkouts(wks); render();
  }

  function addExercise(workoutId, name) {
    const n=normStr(name); if(!n) return;
    const wks=loadWorkouts(); const w=wks.find(x=>x.id===workoutId); if(!w) return;
    w.exercises.unshift({id:uid(),name:n,createdAt:Date.now(),updatedAt:Date.now(),sets:[]});
    w.updatedAt=Date.now(); saveWorkouts(wks); render();
  }

  function deleteExercise(wId, eId) {
    const wks=loadWorkouts(); const w=wks.find(x=>x.id===wId); if(!w) return;
    w.exercises=(w.exercises||[]).filter(e=>e.id!==eId); w.updatedAt=Date.now(); saveWorkouts(wks); render();
  }

  function renameExercise(wId, eId, name) {
    const n=normStr(name); if(!n) return;
    const wks=loadWorkouts(); const w=wks.find(x=>x.id===wId); if(!w) return;
    const ex=(w.exercises||[]).find(e=>e.id===eId); if(!ex) return;
    ex.name=n; ex.updatedAt=Date.now(); w.updatedAt=Date.now(); saveWorkouts(wks); render();
  }

  function addSet(wId, eId, weight, reps, dateISO) {
    const wn=clampNum(weight,0,5000), rn=clampNum(reps,0,200); if(!wn||!rn) return;
    const wks=loadWorkouts(); const w=wks.find(x=>x.id===wId); if(!w) return;
    const ex=(w.exercises||[]).find(e=>e.id===eId); if(!ex) return;
    const before=computePRs(wks);
    ex.sets.push({id:uid(),date:dayKey(dateISO||todayISO()),weight:wn,reps:rn,createdAt:Date.now(),updatedAt:Date.now()});
    ex.updatedAt=Date.now(); w.updatedAt=Date.now(); saveWorkouts(wks);
    const after=computePRs(loadWorkouts());
    const exL=lower(ex.name);
    const b=before.find(p=>lower(p.exerciseName)===exL), a=after.find(p=>lower(p.exerciseName)===exL);
    if(a&&(!b||a.best1RM>b.best1RM||a.bestWeight>b.bestWeight||a.bestVolume>b.bestVolume)) toast("🏆 New PR!");
    render();
  }

  function deleteSet(wId, eId, sId) {
    const wks=loadWorkouts(); const w=wks.find(x=>x.id===wId); if(!w) return;
    const ex=(w.exercises||[]).find(e=>e.id===eId); if(!ex) return;
    ex.sets=(ex.sets||[]).filter(s=>s.id!==sId); ex.updatedAt=Date.now(); w.updatedAt=Date.now(); saveWorkouts(wks); render();
  }

  function editSet(wId, eId, sId, weight, reps, dateISO) {
    const wn=clampNum(weight,0,5000), rn=clampNum(reps,0,200); if(!wn||!rn) return;
    const wks=loadWorkouts(); const w=wks.find(x=>x.id===wId); if(!w) return;
    const ex=(w.exercises||[]).find(e=>e.id===eId); if(!ex) return;
    const s=(ex.sets||[]).find(x=>x.id===sId); if(!s) return;
    s.weight=wn; s.reps=rn; s.date=dayKey(dateISO||s.date||todayISO()); s.updatedAt=Date.now();
    ex.updatedAt=Date.now(); w.updatedAt=Date.now(); saveWorkouts(wks); render();
  }

  function cloneLastWorkout() {
    const wks=loadWorkouts(); const last=getLastWorkout(wks);
    if(!last) { toast("No workout to clone"); return; }
    wks.push({ id:uid(), name:normStr(last.name)||"Untitled", type:normStr(last.type||""),
      status:"current", createdAt:Date.now(), updatedAt:Date.now(),
      exercises:(last.exercises||[]).map(ex=>({id:uid(),name:normStr(ex?.name||"Exercise"),createdAt:Date.now(),updatedAt:Date.now(),sets:[]}))
    });
    saveWorkouts(wks); render();
  }

  function toggleCollapse(wId) {
    const wks=loadWorkouts(); const w=wks.find(x=>x.id===wId); const status=w?.status||"current";
    const ui=loadUI(); ui.collapsedWorkouts=ui.collapsedWorkouts||{};
    const cur = typeof ui.collapsedWorkouts[wId]==="boolean" ? ui.collapsedWorkouts[wId] : status!=="current";
    ui.collapsedWorkouts[wId]=!cur; saveUI(ui); render();
  }

  function isCollapsed(wId, status) {
    const ui=loadUI(); const map=ui.collapsedWorkouts||{};
    return typeof map[wId]==="boolean" ? map[wId] : status!=="current";
  }

  // ── TOAST ─────────────────────────────────────────────────────────────────

  function toast(msg) {
    let host=byId("kpToastHost");
    if(!host) { host=document.createElement("div"); host.id="kpToastHost"; host.style.cssText="position:fixed;right:16px;bottom:80px;z-index:99999;display:flex;flex-direction:column;gap:8px;"; document.body.appendChild(host); }
    const el=document.createElement("div");
    el.style.cssText="background:rgba(10,10,16,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:10px 16px;color:white;font-weight:800;font-size:0.9rem;backdrop-filter:blur(12px);";
    el.textContent=msg; host.appendChild(el);
    setTimeout(()=>{ el.style.cssText+=";opacity:0;transition:opacity 0.25s;"; setTimeout(()=>el.remove(),300); },1800);
  }

  // ── MODAL ─────────────────────────────────────────────────────────────────

  function openModal(html) {
    if(typeof window.openModal==="function"&&window.openModal!==openModal){ window.openModal(html); return; }
    const m=byId("modal"),b=byId("modalBody"); if(!m||!b) return; b.innerHTML=html; m.style.display="flex";
  }
  function closeModal() {
    if(typeof window.closeModal==="function"&&window.closeModal!==closeModal){ window.closeModal(); return; }
    const m=byId("modal"); if(m) m.style.display="none";
  }

  // ── TAB SWITCH ────────────────────────────────────────────────────────────

  window.wktTab = function(tab) {
    const ui=loadUI(); ui.activeTab=tab; saveUI(ui); render();
  };

  // ── MAIN RENDER ───────────────────────────────────────────────────────────

  function render() {
    const host=byId("exerciseCards"); if(!host) return;
    let mount=byId(MOUNT_ID);
    if(!mount) { mount=document.createElement("div"); mount.id=MOUNT_ID; host.prepend(mount); }

    let wks=loadWorkouts();
    // migrate planned → current
    if(wks.some(w=>normStr(w?.status)==="planned")) {
      wks=wks.map(w=>({...w,status:w.status==="planned"?"current":w.status})); saveWorkouts(wks);
    }

    const ui   = loadUI();
    const tab  = ui.activeTab || "train";
    const streak = computeStreak(wks);
    const today  = computeToday(wks);
    const series7 = computeDailySeries(wks,"7");
    const weeklySets   = series7.sets.reduce((a,b)=>a+b,0);
    const weeklyVolume = series7.volume.reduce((a,b)=>a+b,0);

    const TABS = [
      { id:"train",   label:"🏋️ Train"   },
      { id:"records", label:"🏆 Records"  },
      { id:"history", label:"📅 History"  },
    ];

    mount.innerHTML = `<div style="padding:4px 0;">

      <!-- HEADER -->
      <div style="margin-bottom:20px;">
        <h2 style="font-size:1.5rem; font-weight:900; margin-bottom:6px;
          background:linear-gradient(135deg,#e5e7eb,#6366f1);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
          Workouts
        </h2>
        <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:center;">
          <span style="font-size:0.82rem; color:${streak>0?"#f59e0b":"#6b7280"};">
            ${streak>0?`🔥 ${streak}-day streak`:"No streak — train today"}
          </span>
          <span style="font-size:0.82rem; color:#6b7280;">${weeklySets} sets this week</span>
          <span style="font-size:0.82rem; color:#6b7280;">${Number(weeklyVolume).toLocaleString()} volume</span>
        </div>
      </div>

      <!-- TABS -->
      <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; margin-bottom:20px; align-items:center;">
        ${TABS.map(t=>`
          <button onclick="wktTab('${t.id}')" style="
            padding:9px 16px; border-radius:20px; cursor:pointer; white-space:nowrap;
            font-weight:800; font-size:0.85rem; transition:all 0.15s;
            border:1px solid ${tab===t.id?"rgba(99,102,241,0.5)":"rgba(255,255,255,0.1)"};
            background:${tab===t.id?"linear-gradient(135deg,rgba(99,102,241,0.85),rgba(167,139,250,0.75))":"rgba(255,255,255,0.04)"};
            color:${tab===t.id?"white":"#9ca3af"};">
            ${t.label}
          </button>
        `).join("")}
      </div>

      <!-- CONTENT -->
      <div id="wktTabContent">
        ${tab==="train"   ? renderTrainTab(wks, today, ui)   : ""}
        ${tab==="records" ? renderRecordsTab(wks, ui)        : ""}
        ${tab==="history" ? renderHistoryTab(wks, ui)        : ""}
      </div>

    </div>`;

    bindEvents();
    if(tab==="records") renderExChart(wks, ui);
  }

  // ── TAB 1: TRAIN ──────────────────────────────────────────────────────────

  function renderTrainTab(wks, today, ui) {
    const current   = wks.filter(w=>w.status==="current").sort((a,b)=>Number(b.updatedAt)-Number(a.updatedAt));
    const completed = wks.filter(w=>w.status==="completed").sort((a,b)=>Number(b.updatedAt)-Number(a.updatedAt));

    const PRESETS = ["Push","Pull","Legs","Upper","Lower","Cardio"];

    return `
      <!-- TODAY SUMMARY -->
      <div style="padding:16px; border-radius:16px; margin-bottom:14px;
        border:1px solid ${today.totalSets>0?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.08)"};
        background:${today.totalSets>0?"rgba(99,102,241,0.07)":"rgba(255,255,255,0.03)"};">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:${today.totalSets>0?12:0}px; flex-wrap:wrap; gap:8px;">
          <div style="font-weight:900; font-size:0.88rem; color:#e5e7eb; text-transform:uppercase; letter-spacing:0.06em;">
            Today — ${new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}
          </div>
          ${today.totalSets>0?`
            <div style="display:flex; gap:10px; font-size:0.8rem; color:#6b7280;">
              <span>${today.totalSets} sets</span>
              <span>${today.exercises.length} exercises</span>
              <span>${Number(today.volume).toLocaleString()} vol</span>
            </div>` : ""}
        </div>
        ${today.totalSets>0
          ? `<div style="display:grid; gap:6px;">
              ${today.exercises.map(ex=>{
                const arr=today.byEx[ex]||[]; const last=arr[arr.length-1];
                const vol=arr.reduce((a,s)=>a+s.volume,0);
                return `
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;
                    padding:10px 12px; border-radius:11px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);">
                    <div>
                      <div style="font-weight:800; font-size:0.88rem; color:#e5e7eb;">${esc(ex)}</div>
                      <div style="font-size:0.75rem; color:#6b7280; margin-top:2px;">
                        Latest: ${last.weight}×${last.reps}
                        · ${arr.length} set${arr.length!==1?"s":""}
                      </div>
                    </div>
                    <div style="font-weight:900; font-size:0.9rem; color:#a78bfa;">${Number(vol).toLocaleString()}</div>
                  </div>`;
              }).join("")}
            </div>`
          : `<div style="font-size:0.85rem; color:#4b5563;">No sets logged yet today. Start below.</div>`
        }
      </div>

      <!-- QUICK START -->
      <div style="padding:16px; border-radius:16px; margin-bottom:14px;
        border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);">
        <div style="font-weight:900; font-size:0.88rem; color:#e5e7eb; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:12px;">
          Quick Start
        </div>
        <div style="display:flex; gap:7px; flex-wrap:wrap; margin-bottom:12px;">
          ${PRESETS.map(p=>`
            <button data-action="preset" data-preset="${p}" style="
              padding:9px 16px; border-radius:20px; cursor:pointer; font-weight:800; font-size:0.85rem;
              border:1px solid rgba(99,102,241,0.3); background:rgba(99,102,241,0.09); color:#a78bfa;
              transition:all 0.15s;">
              ${p}
            </button>
          `).join("")}
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button data-action="openAddWorkout" style="padding:10px 18px; border-radius:12px;
            font-weight:800; font-size:0.85rem; border:none; cursor:pointer; color:white;
            background:linear-gradient(135deg,rgba(99,102,241,0.9),rgba(167,139,250,0.8));">
            + Custom Workout
          </button>
          <button data-action="cloneLast" style="padding:10px 18px; border-radius:12px;
            font-weight:800; font-size:0.85rem; cursor:pointer; color:#9ca3af;
            border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04);">
            Clone Last
          </button>
        </div>
      </div>

      <!-- ACTIVE WORKOUTS -->
      ${current.length ? `
        <div style="font-weight:900; font-size:0.88rem; color:#e5e7eb; text-transform:uppercase;
          letter-spacing:0.06em; margin-bottom:10px; margin-top:4px;">
          Active — ${current.length}
        </div>
        ${current.map(w=>renderWorkoutCard(w)).join("")}
      ` : ""}

      <!-- COMPLETED (collapsed list) -->
      ${completed.length ? `
        <div style="font-weight:900; font-size:0.88rem; color:#6b7280; text-transform:uppercase;
          letter-spacing:0.06em; margin:16px 0 10px;">
          Completed — ${completed.length}
        </div>
        ${completed.map(w=>renderWorkoutCard(w)).join("")}
      ` : ""}
    `;
  }

  function renderWorkoutCard(w) {
    const vol       = calcWktVol(w);
    const collapsed = isCollapsed(w.id, w.status);
    const isActive  = w.status==="current";

    return `
      <div style="border-radius:16px; margin-bottom:10px; overflow:hidden;
        border:1px solid ${isActive?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.07)"};
        background:${isActive?"rgba(99,102,241,0.05)":"rgba(255,255,255,0.02)"};">

        <!-- Card header -->
        <div style="padding:14px 16px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-weight:900; font-size:0.95rem; color:#e5e7eb;">${esc(w.name)}</span>
              ${w.type?`<span style="font-size:0.7rem; padding:2px 8px; border-radius:20px;
                background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#6b7280; font-weight:700;">${esc(w.type)}</span>`:""}
              ${isActive
                ? `<span style="font-size:0.7rem; padding:2px 8px; border-radius:20px;
                    background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.25); color:#86efac; font-weight:800;">Active</span>`
                : `<span style="font-size:0.7rem; padding:2px 8px; border-radius:20px;
                    background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#6b7280; font-weight:700;">Done</span>`}
            </div>
            <div style="font-size:0.75rem; color:#4b5563; margin-top:4px;">
              ${(w.exercises||[]).length} exercises · ${Number(vol).toLocaleString()} total vol
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; flex-shrink:0;">
            ${isActive?`<button data-action="addExercise" data-id="${w.id}" style="padding:6px 12px; border-radius:20px; font-size:0.78rem; font-weight:800; cursor:pointer; border:1px solid rgba(99,102,241,0.3); background:rgba(99,102,241,0.1); color:#a78bfa;">+ Exercise</button>`:""}
            ${isActive
              ? `<button data-action="moveWorkout" data-id="${w.id}" data-status="completed" style="padding:6px 12px; border-radius:20px; font-size:0.78rem; font-weight:800; cursor:pointer; border:1px solid rgba(34,197,94,0.3); background:rgba(34,197,94,0.07); color:#86efac;">Finish</button>`
              : `<button data-action="moveWorkout" data-id="${w.id}" data-status="current" style="padding:6px 12px; border-radius:20px; font-size:0.78rem; font-weight:800; cursor:pointer; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:#9ca3af;">Reopen</button>`}
            <button data-action="toggleCollapse" data-id="${w.id}" style="padding:6px 10px; border-radius:20px; font-size:0.78rem; font-weight:800; cursor:pointer; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#6b7280;">
              ${collapsed?"▸":"▾"}
            </button>
            <button data-action="deleteWorkout" data-id="${w.id}" style="padding:6px 10px; border-radius:20px; font-size:0.78rem; cursor:pointer; border:1px solid rgba(239,68,68,0.2); background:rgba(239,68,68,0.05); color:#ef4444;">✕</button>
          </div>
        </div>

        <!-- Exercises -->
        ${!collapsed ? `
          <div style="border-top:1px solid rgba(255,255,255,0.06); padding:12px 16px;">
            ${(w.exercises||[]).length
              ? (w.exercises||[]).map(ex=>renderExBlock(w, ex)).join("")
              : `<div style="font-size:0.85rem; color:#4b5563;">No exercises — tap + Exercise above.</div>`}
          </div>` : ""}
      </div>
    `;
  }

  function renderExBlock(w, ex) {
    const sets=[...(ex.sets||[])].sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
    return `
      <div style="margin-bottom:12px; padding:12px 14px; border-radius:13px;
        border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
          <span style="font-weight:800; font-size:0.9rem; color:#e5e7eb;">${esc(ex.name)}</span>
          <div style="display:flex; gap:6px;">
            <button data-action="renameExercise" data-w="${w.id}" data-e="${ex.id}"
              style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; cursor:pointer;
              border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#9ca3af;">Rename</button>
            <button data-action="deleteExercise" data-w="${w.id}" data-e="${ex.id}"
              style="padding:4px 10px; border-radius:20px; font-size:0.75rem; cursor:pointer;
              border:1px solid rgba(239,68,68,0.2); background:rgba(239,68,68,0.05); color:#ef4444;">✕</button>
          </div>
        </div>

        <!-- Add set row -->
        <div style="display:flex; gap:7px; flex-wrap:wrap; margin-bottom:${sets.length?10:0}px;">
          <input type="number" inputmode="decimal" placeholder="Weight" data-role="sw" data-w="${w.id}" data-e="${ex.id}"
            style="width:100px; padding:9px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.1);
            background:rgba(255,255,255,0.06); color:white; outline:none; font-size:0.9rem;" />
          <input type="number" inputmode="numeric" placeholder="Reps" data-role="sr" data-w="${w.id}" data-e="${ex.id}"
            style="width:80px; padding:9px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.1);
            background:rgba(255,255,255,0.06); color:white; outline:none; font-size:0.9rem;" />
          <input type="date" data-role="sd" data-w="${w.id}" data-e="${ex.id}" value="${todayISO()}"
            style="width:155px; padding:9px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.1);
            background:rgba(255,255,255,0.06); color:white; outline:none; font-size:0.9rem;" />
          <button data-action="addSet" data-w="${w.id}" data-e="${ex.id}"
            style="padding:9px 16px; border-radius:10px; font-weight:900; font-size:0.88rem;
            border:none; cursor:pointer; color:white;
            background:linear-gradient(135deg,rgba(99,102,241,0.9),rgba(167,139,250,0.8));">
            Log Set
          </button>
        </div>

        <!-- Set rows -->
        ${sets.map((s,i)=>{
          const vol=s.weight*s.reps; const one=Math.round(estimate1RM(s.weight,s.reps)||0);
          return `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;
              padding:9px 10px; border-radius:10px; margin-bottom:5px; flex-wrap:wrap;
              background:rgba(0,0,0,0.14); border:1px solid rgba(255,255,255,0.07);">
              <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                <span style="font-size:0.75rem; font-weight:900; color:#4b5563; width:22px;">#${i+1}</span>
                <span style="font-weight:900; color:#e5e7eb; font-size:0.9rem;">${s.weight}×${s.reps}</span>
                <span style="font-size:0.78rem; color:#6b7280;">vol ${Number(vol).toLocaleString()}</span>
                <span style="font-size:0.78rem; color:#a78bfa;">~${one}</span>
                <span style="font-size:0.75rem; color:#4b5563;">${formatDay(s.date)}</span>
              </div>
              <div style="display:flex; gap:5px;">
                <button data-action="editSet" data-w="${w.id}" data-e="${ex.id}" data-s="${s.id}"
                  style="padding:4px 9px; border-radius:8px; font-size:0.73rem; font-weight:700; cursor:pointer;
                  border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#9ca3af;">Edit</button>
                <button data-action="deleteSet" data-w="${w.id}" data-e="${ex.id}" data-s="${s.id}"
                  style="padding:4px 8px; border-radius:8px; font-size:0.73rem; cursor:pointer;
                  border:1px solid rgba(239,68,68,0.2); background:rgba(239,68,68,0.05); color:#ef4444;">✕</button>
              </div>
            </div>`;
        }).join("")}
      </div>`;
  }

  // ── TAB 2: RECORDS ────────────────────────────────────────────────────────

  function renderRecordsTab(wks, ui) {
    const prs    = computePRs(wks).slice(0, 12);
    const exList = getAllExNames(wks);

    return `
      <!-- PR TABLE -->
      <div style="padding:16px; border-radius:16px; margin-bottom:14px;
        border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);">
        <div style="font-weight:900; font-size:0.88rem; text-transform:uppercase; letter-spacing:0.06em;
          color:#e5e7eb; margin-bottom:14px;">Personal Records</div>
        ${prs.length
          ? `<div style="display:grid; gap:7px;">
              ${prs.map((p,i)=>`
                <div style="display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:12px;
                  border:1px solid ${i===0?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.07)"};
                  background:${i===0?"rgba(245,158,11,0.06)":"rgba(255,255,255,0.02)"};">
                  <div style="width:28px; height:28px; border-radius:8px; flex-shrink:0;
                    display:flex; align-items:center; justify-content:center; font-size:0.85rem;
                    background:${i===0?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.05)"};
                    border:1px solid ${i===0?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.1)"};">
                    ${i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
                  </div>
                  <div style="flex:1; min-width:0;">
                    <div style="font-weight:800; font-size:0.9rem; color:#e5e7eb;">${esc(p.exerciseName)}</div>
                    <div style="font-size:0.75rem; color:#6b7280; margin-top:3px; display:flex; gap:10px; flex-wrap:wrap;">
                      <span>1RM <strong style="color:#a78bfa;">${p.best1RM}</strong></span>
                      <span>Weight <strong style="color:#e5e7eb;">${p.bestWeight}</strong></span>
                      <span>Vol <strong style="color:#e5e7eb;">${Number(p.bestVolume).toLocaleString()}</strong></span>
                      <span style="color:#4b5563;">${formatDay(p.date)}</span>
                    </div>
                  </div>
                </div>
              `).join("")}
            </div>`
          : `<div style="color:#4b5563; font-size:0.85rem;">No data yet. Log sets to track PRs.</div>`}
      </div>

      <!-- STRENGTH CHART -->
      <div style="padding:16px; border-radius:16px; margin-bottom:14px;
        border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);">
        <div style="font-weight:900; font-size:0.88rem; text-transform:uppercase; letter-spacing:0.06em;
          color:#e5e7eb; margin-bottom:12px;">Strength Progress</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
          <select id="wktExSelect" class="form-input" style="flex:1; min-width:180px;">
            ${exList.length
              ? exList.map(n=>`<option value="${esc(n)}" ${n===ui.exerciseChartExercise?"selected":""}>${esc(n)}</option>`).join("")
              : `<option value="">No exercises yet</option>`}
          </select>
          <select id="wktMetricSelect" class="form-input" style="width:160px;">
            <option value="1rm"    ${ui.exerciseChartMetric==="1rm"    ?"selected":""}>Est. 1RM</option>
            <option value="weight" ${ui.exerciseChartMetric==="weight" ?"selected":""}>Best Weight</option>
            <option value="volume" ${ui.exerciseChartMetric==="volume" ?"selected":""}>Volume</option>
          </select>
        </div>
        <div style="height:260px;">
          <canvas id="wktExChart" height="260"></canvas>
        </div>
      </div>
    `;
  }

  function renderExChart(wks, ui) {
    if(typeof Chart==="undefined") return;
    const canvas=byId("wktExChart"); if(!canvas) return;
    const series=computeExSeries(wks, ui.exerciseChartExercise); if(!series) return;
    const data = ui.exerciseChartMetric==="weight" ? series.bestWeight
               : ui.exerciseChartMetric==="volume" ? series.volume
               : series.best1rm;
    const label = ui.exerciseChartMetric==="weight" ? "Best Weight"
                : ui.exerciseChartMetric==="volume" ? "Volume"
                : "Est. 1RM";
    if(exerciseChart) { try{exerciseChart.destroy();}catch{} exerciseChart=null; }
    exerciseChart=new Chart(canvas.getContext("2d"),{
      type:"line",
      data:{ labels:series.labels, datasets:[{label,data,tension:0.35,borderWidth:3,pointRadius:4,spanGaps:true}] },
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{legend:{labels:{color:"rgba(255,255,255,0.8)"}}},
        scales:{
          x:{ticks:{color:"rgba(255,255,255,0.55)"},grid:{color:"rgba(255,255,255,0.06)"}},
          y:{beginAtZero:true,ticks:{color:"rgba(255,255,255,0.55)"},grid:{color:"rgba(255,255,255,0.06)"}}
        }
      }
    });
  }

  // ── TAB 3: HISTORY ────────────────────────────────────────────────────────

  function renderHistoryTab(wks, ui) {
    const dayIdx = buildDayIndex(wks);
    const years  = [...new Set([...Object.keys(dayIdx).map(k=>Number(k.slice(0,4))),new Date().getFullYear()])].sort((a,b)=>b-a);
    const calYear  = years.includes(ui.calendarYear) ? ui.calendarYear : (years[0]||new Date().getFullYear());
    const calMonth = clampNum(ui.calendarMonth,0,11);
    const MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    return `
      <!-- YEAR + MONTH CONTROLS -->
      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
        <select id="wktCalYear" class="form-input" style="width:100px;">
          ${years.map(y=>`<option value="${y}" ${y===calYear?"selected":""}>${y}</option>`).join("")}
        </select>
        <div style="font-size:0.78rem; color:#4b5563; flex:1;">
          Green = trained · Red = no session
        </div>
      </div>

      <!-- MONTH PILLS -->
      <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; margin-bottom:14px;">
        ${MONTHS.map((mn,i)=>`
          <button data-action="calMonth" data-month="${i}" style="
            padding:7px 12px; border-radius:20px; cursor:pointer; white-space:nowrap;
            font-weight:800; font-size:0.82rem; transition:all 0.12s; flex-shrink:0;
            border:1px solid ${i===calMonth?"rgba(99,102,241,0.5)":"rgba(255,255,255,0.1)"};
            background:${i===calMonth?"linear-gradient(135deg,rgba(99,102,241,0.85),rgba(167,139,250,0.75))":"rgba(255,255,255,0.04)"};
            color:${i===calMonth?"white":"#9ca3af"};">
            ${mn}
          </button>
        `).join("")}
      </div>

      <!-- CALENDAR GRID -->
      <div style="border-radius:16px; border:1px solid rgba(255,255,255,0.08);
        background:rgba(255,255,255,0.03); padding:14px; margin-bottom:14px;">

        <!-- Weekday labels -->
        <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-bottom:6px;">
          ${["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>`
            <div style="text-align:center; font-size:0.72rem; font-weight:800; color:#4b5563; padding:4px 0;">${d}</div>
          `).join("")}
        </div>

        <!-- Day cells -->
        <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px;">
          ${renderCalGrid(calYear, calMonth, dayIdx, ui.calendarSelectedDay)}
        </div>
      </div>

      <!-- DAY DETAIL -->
      <div id="wktCalDetail">
        ${renderCalDetail(ui.calendarSelectedDay, dayIdx)}
      </div>
    `;
  }

  function renderCalGrid(year, month, dayIdx, selected) {
    const first      = new Date(year, month, 1);
    const startDow   = first.getDay();
    const daysInMonth= new Date(year, month+1, 0).getDate();
    const today      = todayISO();
    const cells      = [];

    for(let i=0;i<startDow;i++) cells.push({blank:true});
    for(let d=1;d<=daysInMonth;d++) {
      const iso=localISO(year,month,d);
      cells.push({blank:false,d,iso,has:!!dayIdx?.[iso]});
    }
    while(cells.length%7!==0) cells.push({blank:true});

    return cells.map(c=>{
      if(c.blank) return `<div style="aspect-ratio:1;"></div>`;
      const isSel   = c.iso===selected;
      const isToday = c.iso===today;
      const bg      = c.has ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.12)";
      const border  = isSel ? "2px solid white" : isToday ? "2px solid rgba(99,102,241,0.8)" : "1px solid transparent";
      const meta    = dayIdx?.[c.iso];
      return `
        <button data-action="calDay" data-day="${c.iso}"
          title="${c.iso}${meta?` · ${meta.totalSets} sets`:""}"
          style="aspect-ratio:1; border-radius:9px; cursor:pointer; font-weight:800; font-size:0.8rem;
          color:${c.has?"#86efac":isToday?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.2)"};
          background:${bg}; border:${border}; transition:all 0.1s;">
          ${c.d}
        </button>`;
    }).join("");
  }

  function renderCalDetail(selected, dayIdx) {
    if(!selected) return `<div style="font-size:0.85rem; color:#4b5563; padding:4px 0;">Tap a day to see what you trained.</div>`;
    const meta=dayIdx?.[selected];
    if(!meta) return `
      <div style="padding:14px 16px; border-radius:14px; border:1px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.02);">
        <div style="font-weight:800; color:#e5e7eb; margin-bottom:4px;">${formatFullDay(selected)}</div>
        <div style="font-size:0.85rem; color:#4b5563;">No session logged.</div>
      </div>`;

    return `
      <div style="padding:14px 16px; border-radius:14px; border:1px solid rgba(34,197,94,0.2); background:rgba(34,197,94,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div style="font-weight:900; color:#e5e7eb;">${formatFullDay(selected)}</div>
          <div style="font-size:0.78rem; color:#6b7280;">${meta.totalSets} sets · ${Number(meta.totalVolume).toLocaleString()} vol</div>
        </div>
        <div style="display:grid; gap:8px;">
          ${(meta.workouts||[]).map(w=>{
            const wVol=w.sets.reduce((a,s)=>a+Number(s.volume||0),0);
            const byEx={};
            w.sets.forEach(s=>{ if(!byEx[s.exerciseName]) byEx[s.exerciseName]=[]; byEx[s.exerciseName].push(s); });
            return `
              <div style="padding:12px 14px; border-radius:12px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                  <div>
                    <span style="font-weight:800; font-size:0.9rem; color:#e5e7eb;">${esc(w.name)}</span>
                    ${w.type?`<span style="font-size:0.72rem; color:#6b7280; margin-left:8px;">${esc(w.type)}</span>`:""}
                  </div>
                  <span style="font-size:0.75rem; color:#6b7280;">${w.sets.length} sets · ${Number(wVol).toLocaleString()}</span>
                </div>
                ${Object.keys(byEx).sort().map(exName=>{
                  const rows=byEx[exName];
                  return `
                    <div style="margin-bottom:6px;">
                      <div style="font-size:0.8rem; font-weight:800; color:#a78bfa; margin-bottom:3px;">${esc(exName)}</div>
                      <div style="font-size:0.78rem; color:#6b7280;">
                        ${rows.map(s=>`${s.weight}×${s.reps}`).join(" · ")}
                      </div>
                    </div>`;
                }).join("")}
              </div>`;
          }).join("")}
        </div>
      </div>`;
  }

  // ── EVENT BINDING ─────────────────────────────────────────────────────────

  function bindEvents() {
    const mount=byId(MOUNT_ID); if(!mount) return;

    mount.querySelectorAll("[data-action]").forEach(btn=>{
      btn.onclick = ()=>{
        const a=btn.dataset.action;
        if(a==="preset")         { addWorkout(btn.dataset.preset, btn.dataset.preset); return; }
        if(a==="openAddWorkout") { openAddWorkoutModal(); return; }
        if(a==="cloneLast")      { cloneLastWorkout(); return; }
        if(a==="toggleCollapse") { toggleCollapse(btn.dataset.id); return; }
        if(a==="deleteWorkout")  { deleteWorkout(btn.dataset.id); return; }
        if(a==="moveWorkout")    { moveWorkout(btn.dataset.id, btn.dataset.status); return; }
        if(a==="addExercise")    { openAddExModal(btn.dataset.id); return; }
        if(a==="deleteExercise") { deleteExercise(btn.dataset.w, btn.dataset.e); return; }
        if(a==="renameExercise") { openRenameExModal(btn.dataset.w, btn.dataset.e); return; }
        if(a==="addSet") {
          const wId=btn.dataset.w, eId=btn.dataset.e;
          const sw=mount.querySelector(`[data-role="sw"][data-w="${wId}"][data-e="${eId}"]`);
          const sr=mount.querySelector(`[data-role="sr"][data-w="${wId}"][data-e="${eId}"]`);
          const sd=mount.querySelector(`[data-role="sd"][data-w="${wId}"][data-e="${eId}"]`);
          addSet(wId, eId, sw?.value, sr?.value, sd?.value);
          if(sw) sw.value=""; if(sr) sr.value=""; return;
        }
        if(a==="deleteSet") { deleteSet(btn.dataset.w, btn.dataset.e, btn.dataset.s); return; }
        if(a==="editSet")   { openEditSetModal(btn.dataset.w, btn.dataset.e, btn.dataset.s); return; }
        if(a==="calMonth")  { const ui=loadUI(); ui.calendarMonth=Number(btn.dataset.month); saveUI(ui); render(); return; }
        if(a==="calDay")    { const ui=loadUI(); ui.calendarSelectedDay=btn.dataset.day; saveUI(ui); render(); return; }
      };
    });

    // Calendar year select
    const yrSel=byId("wktCalYear");
    if(yrSel) yrSel.onchange=()=>{ const ui=loadUI(); ui.calendarYear=Number(yrSel.value); saveUI(ui); render(); };

    // Chart selects
    const exSel=byId("wktExSelect");
    if(exSel) exSel.onchange=()=>{ const ui=loadUI(); ui.exerciseChartExercise=exSel.value; saveUI(ui); renderExChart(loadWorkouts(),ui); };
    const mSel=byId("wktMetricSelect");
    if(mSel) mSel.onchange=()=>{ const ui=loadUI(); ui.exerciseChartMetric=mSel.value; saveUI(ui); renderExChart(loadWorkouts(),ui); };
  }

  // ── MODALS ────────────────────────────────────────────────────────────────

  function openAddWorkoutModal() {
    const last=getLastWorkout(loadWorkouts());
    openModal(`
      <h2 style="margin-bottom:16px;">New Workout</h2>
      <div style="display:grid; gap:12px;">
        <div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Name *</div>
          <input id="wktAddName" class="form-input" style="width:100%;" placeholder="e.g. Push Day"
            value="${esc(last?.name||"")}" onkeydown="if(event.key==='Enter') wktSaveAdd()" />
        </div>
        <div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Type</div>
          <input id="wktAddType" class="form-input" style="width:100%;" placeholder="strength / hypertrophy / cardio"
            value="${esc(last?.type||"")}" />
        </div>
        <button onclick="wktSaveAdd()" class="form-submit" style="margin-top:4px;">Create Workout</button>
      </div>
    `);
  }

  window.wktSaveAdd = function() {
    const name=document.getElementById("wktAddName")?.value||"";
    const type=document.getElementById("wktAddType")?.value||"";
    addWorkout(name, type); closeModal();
  };

  function openAddExModal(wId) {
    openModal(`
      <h2 style="margin-bottom:16px;">Add Exercise</h2>
      <input id="wktAddEx" class="form-input" style="width:100%;" placeholder="e.g. Bench Press"
        onkeydown="if(event.key==='Enter') wktSaveEx('${wId}')" />
      <button onclick="wktSaveEx('${wId}')" class="form-submit" style="margin-top:12px; width:100%;">Add</button>
    `);
  }

  window.wktSaveEx = function(wId) {
    const name=document.getElementById("wktAddEx")?.value||"";
    addExercise(wId, name); closeModal();
  };

  function openRenameExModal(wId, eId) {
    const wks=loadWorkouts(); const w=wks.find(x=>x.id===wId); const ex=(w?.exercises||[]).find(e=>e.id===eId);
    openModal(`
      <h2 style="margin-bottom:16px;">Rename Exercise</h2>
      <input id="wktRenameEx" class="form-input" style="width:100%;" value="${esc(ex?.name||"")}"
        onkeydown="if(event.key==='Enter') wktSaveRename('${wId}','${eId}')" />
      <button onclick="wktSaveRename('${wId}','${eId}')" class="form-submit" style="margin-top:12px; width:100%;">Save</button>
    `);
  }

  window.wktSaveRename = function(wId, eId) {
    const name=document.getElementById("wktRenameEx")?.value||"";
    renameExercise(wId, eId, name); closeModal();
  };

  function openEditSetModal(wId, eId, sId) {
    const wks=loadWorkouts(); const w=wks.find(x=>x.id===wId); const ex=(w?.exercises||[]).find(e=>e.id===eId);
    const s=(ex?.sets||[]).find(x=>x.id===sId); if(!s) return;
    openModal(`
      <h2 style="margin-bottom:16px;">Edit Set</h2>
      <div style="display:grid; gap:10px;">
        <div><div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Date</div>
          <input id="wktEditDate" type="date" class="form-input" style="width:100%;" value="${esc(s.date||todayISO())}" /></div>
        <div><div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Weight</div>
          <input id="wktEditWeight" type="number" class="form-input" style="width:100%;" value="${s.weight||0}" /></div>
        <div><div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Reps</div>
          <input id="wktEditReps" type="number" class="form-input" style="width:100%;" value="${s.reps||0}" /></div>
        <button onclick="wktSaveEdit('${wId}','${eId}','${sId}')" class="form-submit" style="margin-top:4px;">Save</button>
      </div>
    `);
  }

  window.wktSaveEdit = function(wId, eId, sId) {
    const d=document.getElementById("wktEditDate")?.value||todayISO();
    const wt=document.getElementById("wktEditWeight")?.value||0;
    const r=document.getElementById("wktEditReps")?.value||0;
    editSet(wId, eId, sId, wt, r, d); closeModal();
  };

  // ── BOOT ──────────────────────────────────────────────────────────────────

  function isActive() { const p=byId("workoutPage"); return !!(p&&p.classList.contains("active")); }

  function boot() {
    if(typeof window.showPage==="function"&&!window.showPage.__kpWktWrapped) {
      const orig=window.showPage;
      window.showPage=function(page){ const r=orig.apply(this,arguments); if(page==="workout") setTimeout(render,50); return r; };
      window.showPage.__kpWktWrapped=true;
    }
    document.addEventListener("click",e=>{ if(e.target.closest?.(".nav-tab")) setTimeout(()=>{ if(isActive()) render(); },80); });
    setTimeout(()=>{ if(isActive()) render(); },120);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();

  window.KPWorkouts = { render, addWorkout, addExercise, addSet, moveWorkout, deleteWorkout, toggleCollapse, cloneLastWorkout };

})();
