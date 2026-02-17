/* =========================================================
   MAIN CORE (MERGED + FIXED)
========================================================= */

(function () {
  "use strict";

  /* ================= APP CONTROLLER ================= */

  window.App = window.App || {
    features: {},
    events: {},
    on(page, fn) {
      if (!this.events[page]) this.events[page] = [];
      this.events[page].push(fn);
    },
    trigger(page) {
      (this.events[page] || []).forEach(fn => {
        try { fn(); } catch(e){ console.error(e); }
      });
    }
  };

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }
  window.escapeHtml = escapeHtml;

  /* ================= TIME ================= */

  function pad2(n){ return String(n).padStart(2,"0"); }

  function toLocalISODate(d=new Date()){
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }

  function parseLocalISODate(k){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(k)) return new Date();
    const [y,m,d]=k.split("-").map(Number);
    return new Date(y,m-1,d);
  }

  function getTodayKey(){
    return toLocalISODate(new Date());
  }

  function updateTime(){
    const now=new Date();

    const t=document.getElementById("currentTime");
    const d=document.getElementById("currentDate");

    if(t) t.textContent=now.toLocaleTimeString([],{
      hour:"2-digit",minute:"2-digit"
    });

    if(d) d.textContent=now.toLocaleDateString(undefined,{
      weekday:"short",month:"short",day:"numeric"
    });
  }

  setInterval(updateTime,1000);
  updateTime();

  /* ================= NAV ================= */

  function showPage(page){

    document.querySelectorAll(".page")
      .forEach(p=>p.classList.remove("active"));

    document.querySelectorAll(".nav-tab")
      .forEach(b=>b.classList.remove("active"));

    const el=document.getElementById(page+"Page");
    if(el) el.classList.add("active");

    const tabs=[...document.querySelectorAll(".nav-tab")];
    const tab=tabs.find(t=>(t.getAttribute("onclick")||"").includes(page));
    if(tab) tab.classList.add("active");

    localStorage.setItem("currentPage",page);

    if(page==="dashboard"){
      window.renderMoodTracker?.();
      window.renderHabits?.();
      window.renderSchedule?.();
      window.renderLifeScore?.();
      window.renderWeeklyGraph?.();
      window.renderDNAProfile?.();
      window.renderInsightsWidget?.();
      window.renderEmbeddedCalendar?.();
    }

    window.App.trigger(page);
  }

  window.showPage=showPage;


  /* ================= WEEKLY PLANNER ================= */

  const WEEKLY_PLANNER_KEY="weeklyPlannerData";
  const WEEKLY_SELECTED_KEY="weeklyPlannerSelectedDay";

  let weeklyPlannerData={};
  let weeklyPlannerSelectedDay=null;


  function safeParse(raw,fallback){
    try{ return JSON.parse(raw)||fallback; }
    catch{ return fallback; }
  }


  function getWeekStartKey(date){
    const d=new Date(date);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate()-d.getDay());
    return toLocalISODate(d);
  }


  function ensurePlannerDay(dayKey){

    const ws=getWeekStartKey(parseLocalISODate(dayKey));

    if(!weeklyPlannerData[ws])
      weeklyPlannerData[ws]={days:{}};

    if(!weeklyPlannerData[ws].days[dayKey])
      weeklyPlannerData[ws].days[dayKey]={intentions:"",items:[]};
  }


  function savePlanner(){
    localStorage.setItem(WEEKLY_PLANNER_KEY,JSON.stringify(weeklyPlannerData));
    localStorage.setItem(WEEKLY_SELECTED_KEY,weeklyPlannerSelectedDay);
  }


  function loadWeeklyPlanner(){

    weeklyPlannerData=safeParse(
      localStorage.getItem(WEEKLY_PLANNER_KEY),{}
    );

    const today=getTodayKey();

    weeklyPlannerSelectedDay=
      localStorage.getItem(WEEKLY_SELECTED_KEY) || today;

    if(weeklyPlannerSelectedDay!==today){
      weeklyPlannerSelectedDay=today;
    }

    ensurePlannerDay(weeklyPlannerSelectedDay);
  }


  function setWeeklyPlannerSelectedDay(dayKey){

    weeklyPlannerSelectedDay=dayKey;

    ensurePlannerDay(dayKey);

    savePlanner();

    renderWeeklyPlanner();

    window.renderLifeScore?.();
    window.renderDNAProfile?.();
    window.renderWeeklyGraph?.();
  }


  function getPlannerCompletionForDay(dayKey){

    ensurePlannerDay(dayKey);

    const ws=getWeekStartKey(parseLocalISODate(dayKey));

    const items=
      weeklyPlannerData?.[ws]?.days?.[dayKey]?.items || [];

    const done=items.filter(i=>i.done).length;

    return{
      done,
      total:items.length,
      percent:items.length?
        Math.round((done/items.length)*100):0
    };
  }

  window.getPlannerCompletionForDay=getPlannerCompletionForDay;


  function renderWeeklyPlanner(){

    const container=document.getElementById("scheduleContainer");
    if(!container) return;

    const today=getTodayKey();
    const selected=weeklyPlannerSelectedDay||today;

    ensurePlannerDay(selected);

    const ws=getWeekStartKey(parseLocalISODate(selected));

    const start=parseLocalISODate(ws);

    const week=[];

    for(let i=0;i<7;i++){
      const d=new Date(start);
      d.setDate(start.getDate()+i);
      week.push(d);
    }

    const data=weeklyPlannerData[ws].days[selected];

    const completion=getPlannerCompletionForDay(selected);

    const names=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];


    container.innerHTML=`

      <div style="padding:16px">

        <div style="font-weight:900">Weekly Planner</div>

        <div style="color:#9CA3AF;margin-bottom:8px">
          ${selected} • ${completion.percent}%
        </div>

        <textarea
          class="form-input"
          style="width:100%;min-height:80px"
          oninput="
            weeklyPlannerData['${ws}']
            .days['${selected}']
            .intentions=this.value;
            savePlanner();
          "
        >${escapeHtml(data.intentions)}</textarea>


        <div style="
          margin-top:12px;
          display:grid;
          grid-template-columns:repeat(7,1fr);
          gap:6px">

          ${week.map((d,i)=>{

            const dk=toLocalISODate(d);

            const isToday=dk===today;
            const isActive=dk===selected;

            const pct=getPlannerCompletionForDay(dk).percent;

            return`

            <div
              onclick="setWeeklyPlannerSelectedDay('${dk}')"
              style="
                cursor:pointer;
                padding:8px;
                border-radius:10px;
                border:${isToday?
                  "2px solid #6366F1":
                  "1px solid rgba(255,255,255,0.15)"};

                background:${isActive?
                  "rgba(99,102,241,0.25)":
                  "rgba(255,255,255,0.05)"};

                text-align:center;
              "
            >

              <div style="font-size:0.8rem;color:#9CA3AF">
                ${names[i]}
              </div>

              <div style="font-weight:900">
                ${d.getDate()}
              </div>

              <div style="font-size:0.7rem;color:#9CA3AF">
                ${pct}%
              </div>

            </div>
            `;
          }).join("")}

        </div>

      </div>
    `;
  }


  window.setWeeklyPlannerSelectedDay=setWeeklyPlannerSelectedDay;
  window.renderWeeklyPlanner=renderWeeklyPlanner;


  /* ================= SCHEDULE ================= */

  function renderSchedule(){
    renderWeeklyPlanner();
  }

  window.renderSchedule=renderSchedule;


  /* ================= BOOT ================= */

  document.addEventListener("DOMContentLoaded",()=>{

    loadWeeklyPlanner();

    window.initHabitsData?.();
    window.initMoodData?.();

    const last=localStorage.getItem("currentPage")||"dashboard";
    showPage(last);

    renderSchedule();

    window.renderLifeScore?.();
    window.renderWeeklyGraph?.();
    window.renderDNAProfile?.();

  });

})();
