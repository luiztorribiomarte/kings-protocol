/* features/insights.js — KINGS PROTOCOL
   All insight logic preserved exactly.
   UI: horizontal scrolling cards instead of stacked list.
*/

(function () {
  "use strict";

  function pad(n) { return String(n).padStart(2,"0"); }
  function localKey(d=new Date()) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function getPastDays(n) {
    const out=[],now=new Date();
    for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); out.push(d); }
    return out;
  }
  function safeParse(key,fallback) {
    try{ return JSON.parse(localStorage.getItem(key)||"null")??fallback; }catch{ return fallback; }
  }

  function getHabitPct(dayKey) {
    const habits=safeParse("habits",[]),completions=safeParse("habitCompletions",{});
    if(!habits.length) return null;
    const done=habits.filter(h=>completions?.[dayKey]?.[h.id]).length;
    return Math.round((done/habits.length)*100);
  }
  function getEnergy(dayKey) { return safeParse("moodData",{})?.[dayKey]?.energy??null; }
  function getSleep(dayKey)  { return safeParse("moodData",{})?.[dayKey]?.sleep??null; }
  function getTaskPct(dayKey) {
    const planner=safeParse("weeklyPlannerData",{}); let best=null;
    for(const wk of Object.keys(planner)){
      const dd=planner[wk]?.days?.[dayKey];
      if(dd&&Array.isArray(dd.tasks)&&dd.tasks.length){
        const done=dd.tasks.filter(x=>x?.done).length;
        const pct=Math.round((done/dd.tasks.length)*100);
        if(best===null||pct>best) best=pct;
      }
    }
    return best;
  }
  function workoutDone(dayKey) {
    const list=safeParse("kp_workouts_v2",[]);
    if(!Array.isArray(list)) return false;
    for(const w of list){
      if(w.status!=="completed") continue;
      for(const ex of w.exercises||[])
        for(const s of ex.sets||[])
          if(String(s?.date||"").split("T")[0]===dayKey) return true;
    }
    return false;
  }

  // ── INSIGHT GENERATORS (all preserved) ───────────────────────────────────

  function insightHabitStreak(days) {
    let streak=0;
    for(let i=days.length-1;i>=0;i--){
      const pct=getHabitPct(localKey(days[i]));
      if(pct!==null&&pct>=80) streak++;
      else break;
    }
    if(streak>=3) return { icon:"🔥",type:"positive",title:`${streak}-Day Habit Streak`,body:`You've hit 80%+ habits for ${streak} days in a row. Keep the chain alive.` };
    if(streak===0){
      const yesterday=getHabitPct(localKey(days[days.length-2]));
      if(yesterday!==null&&yesterday>=80) return { icon:"⚡",type:"warning",title:"Streak Reset Today",body:"You had momentum going — today's habits slipped. Still time to check a few off." };
    }
    return null;
  }

  function insightEnergyVsHabits(days) {
    const pairs=days.map(d=>({e:getEnergy(localKey(d)),h:getHabitPct(localKey(d))})).filter(p=>p.e!==null&&p.h!==null);
    if(pairs.length<4) return null;
    const hiE=pairs.filter(p=>p.e>=7),loE=pairs.filter(p=>p.e<=4);
    if(hiE.length>=2&&loE.length>=1){
      const hiAvg=Math.round(hiE.reduce((s,p)=>s+p.h,0)/hiE.length);
      const loAvg=Math.round(loE.reduce((s,p)=>s+p.h,0)/loE.length);
      if(hiAvg-loAvg>=20) return { icon:"📊",type:"insight",title:"Energy Drives Output",body:`High-energy days: ${hiAvg}% habits. Low-energy days: ${loAvg}%. Guard your energy.` };
    }
    return null;
  }

  function insightLowHabitsThisWeek(days) {
    const scores=days.slice(-7).map(d=>getHabitPct(localKey(d))).filter(v=>v!==null);
    if(scores.length<4) return null;
    const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    if(avg<40) return { icon:"⚠️",type:"warning",title:"Recovery Needed",body:`${avg}% avg habit completion this week. Find one anchor habit and rebuild from there.` };
    if(avg>=75) return { icon:"👑",type:"positive",title:"Strong Week",body:`${avg}% average habit completion. You're operating at a high level.` };
    return null;
  }

  function insightSleepImpact(days) {
    const pairs=days.map(d=>({sleep:getSleep(localKey(d)),energy:getEnergy(localKey(d))})).filter(p=>p.sleep!==null&&p.energy!==null);
    if(pairs.length<3) return null;
    const good=pairs.filter(p=>p.sleep>=7),bad=pairs.filter(p=>p.sleep<6);
    if(good.length>=2&&bad.length>=1){
      const gAvg=(good.reduce((s,p)=>s+p.energy,0)/good.length).toFixed(1);
      const bAvg=(bad.reduce((s,p)=>s+p.energy,0)/bad.length).toFixed(1);
      if(Number(gAvg)-Number(bAvg)>=1.5) return { icon:"🛌",type:"insight",title:"Sleep = Energy",body:`7h+ sleep: avg energy ${gAvg}/10. Under 6h: ${bAvg}/10. Sleep is your top lever.` };
    }
    const recentSleep=getSleep(localKey(days[days.length-1]));
    if(recentSleep!==null&&recentSleep<6) return { icon:"😴",type:"warning",title:"Low Sleep Last Night",body:`You logged ${recentSleep}h. Prioritize an earlier bedtime tonight.` };
    return null;
  }

  function insightWorkoutConsistency(days) {
    const last7=days.slice(-7).map(d=>workoutDone(localKey(d)));
    const count=last7.filter(Boolean).length;
    if(!count) return null;
    if(count>=5) return { icon:"💪",type:"positive",title:`${count}/7 Workouts This Week`,body:"Elite consistency. Most people don't get to 3." };
    if(count>=3) return { icon:"💪",type:"insight",title:`${count}/7 Workouts This Week`,body:"Solid base. Can you squeeze one more in before the week ends?" };
    return null;
  }

  function insightTaskCompletion(days) {
    const pct=getTaskPct(localKey(days[days.length-1]));
    if(pct===null) return null;
    if(pct===100) return { icon:"✅",type:"positive",title:"All Tasks Done Today",body:"100% task completion. Plan tomorrow's tasks now while you're locked in." };
    if(pct>=75) return { icon:"🎯",type:"positive",title:`${pct}% Tasks Complete`,body:"Almost there. Finish the last few to close the day strong." };
    if(pct>0&&pct<40) return { icon:"🎯",type:"warning",title:`${pct}% Tasks Complete`,body:"Most tasks are still open. Pick the highest-impact one and focus." };
    return null;
  }

  function insightEnergyTrend(days) {
    const last7=days.slice(-7).map(d=>getEnergy(localKey(d))).filter(v=>v!==null);
    if(last7.length<4) return null;
    const half=Math.floor(last7.length/2);
    const aF=last7.slice(0,half).reduce((a,b)=>a+b,0)/half;
    const aS=last7.slice(half).reduce((a,b)=>a+b,0)/(last7.length-half);
    const diff=aS-aF;
    if(diff>=1.5) return { icon:"📈",type:"positive",title:"Energy Trending Up",body:`From ${aF.toFixed(1)} → ${aS.toFixed(1)} avg this week. Whatever you're doing, keep it.` };
    if(diff<=-1.5) return { icon:"📉",type:"warning",title:"Energy Trending Down",body:`From ${aF.toFixed(1)} → ${aS.toFixed(1)} avg. Check sleep, hydration, recovery.` };
    return null;
  }

  function insightBestDay(days) {
    const scored=days.slice(-14).map(d=>{
      const k=localKey(d);
      return { k,score:(getHabitPct(k)??0)*0.6+(getEnergy(k)??0)*4 };
    }).filter(x=>x.score>0);
    if(scored.length<5) return null;
    scored.sort((a,b)=>b.score-a.score);
    if(scored[0].k===localKey(days[days.length-1])) return { icon:"🏆",type:"positive",title:"Best Day in 2 Weeks",body:"Today is shaping up to be your strongest day in the last 14. Finish strong." };
    return null;
  }

  function insightNoDataYet() {
    return { icon:"📝",type:"neutral",title:"Start Logging",body:"Check off habits and log energy each day. Personalized patterns appear after a few days." };
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  function renderInsightsWidget() {
    const el=document.getElementById("insightsWidget"); if(!el) return;
    const days=getPastDays(14);

    const generators=[
      ()=>insightBestDay(days),
      ()=>insightHabitStreak(days),
      ()=>insightEnergyVsHabits(days),
      ()=>insightSleepImpact(days),
      ()=>insightWorkoutConsistency(days),
      ()=>insightTaskCompletion(days),
      ()=>insightEnergyTrend(days),
      ()=>insightLowHabitsThisWeek(days),
    ];

    const results=generators.map(g=>{ try{return g();}catch{return null;} }).filter(Boolean);
    if(!results.length) results.push(insightNoDataYet());

    // Horizontal scrolling cards
    el.innerHTML = `
      <div style="display:flex; gap:10px; overflow-x:auto; scrollbar-width:none; padding-bottom:4px;">
        ${results.map(ins=>{
          const typeMap={
            positive:"positive",
            warning:"warning",
            insight:"insight",
            neutral:"neutral",
          };
          return `
            <div class="kp-insight-card ${typeMap[ins.type]||"neutral"}">
              <div class="kp-insight-icon">${ins.icon}</div>
              <div class="kp-insight-title">${ins.title}</div>
              <div class="kp-insight-body">${ins.body}</div>
            </div>`;
        }).join("")}
      </div>
      <style>.kp-insights-scroll::-webkit-scrollbar{display:none;}</style>
    `;
  }

  window.renderInsightsWidget = renderInsightsWidget;

  const App=window.App;
  if(App) App.on("dashboard", renderInsightsWidget);
  window.addEventListener("habitsUpdated", renderInsightsWidget);
  window.addEventListener("moodUpdated",   renderInsightsWidget);

})();
