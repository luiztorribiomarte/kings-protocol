/* =========================================================
   MAIN CORE — WEEKLY PLANNER UPGRADE
========================================================= */

(function () {
  "use strict";

  window.App = window.App || {
    features: {},
    events: {},
    on(page, fn) {
      if (!this.events[page]) this.events[page] = [];
      this.events[page].push(fn);
    },
    trigger(page) {
      (this.events[page] || []).forEach(fn => {
        try { fn(); } catch(e){}
      });
    }
  };

  function escapeHtml(str){
    return String(str||"")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }
  window.escapeHtml = escapeHtml;

  function pad2(n){ return String(n).padStart(2,"0"); }

  function toLocalISODate(d=new Date()){
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }

  function parseLocalISODate(k){
    const [y,m,d]=k.split("-").map(Number);
    return new Date(y,m-1,d);
  }

  function getTodayKey(){ return toLocalISODate(new Date()); }

  /* ================= WEEKLY PLANNER ================= */

  const KEY="weeklyPlannerData";
  const SEL="weeklyPlannerSelectedDay";

  let plannerData={};
  let selectedDay=null;

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

  function ensureDay(dayKey){
    const ws=getWeekStartKey(parseLocalISODate(dayKey));
    if(!plannerData[ws]) plannerData[ws]={days:{}};
    if(!plannerData[ws].days[dayKey])
      plannerData[ws].days[dayKey]={intentions:"",items:[]};
  }

  function savePlanner(){
    localStorage.setItem(KEY,JSON.stringify(plannerData));
    localStorage.setItem(SEL,selectedDay);
  }

  function loadPlanner(){
    plannerData=safeParse(localStorage.getItem(KEY),{});
    selectedDay=localStorage.getItem(SEL)||getTodayKey();
    selectedDay=getTodayKey();
    ensureDay(selectedDay);
  }

  function setSelected(dayKey){
    selectedDay=dayKey;
    ensureDay(dayKey);
    savePlanner();
    renderPlanner();
    window.renderLifeScore?.();
    window.renderDNAProfile?.();
    window.renderWeeklyGraph?.();
  }

  function getCompletion(dayKey){
    ensureDay(dayKey);
    const ws=getWeekStartKey(parseLocalISODate(dayKey));
    const items=plannerData[ws].days[dayKey].items;
    const done=items.filter(i=>i.done).length;
    return {
      done,
      total:items.length,
      percent:items.length?Math.round(done/items.length*100):0
    };
  }

  window.getPlannerCompletionForDay=getCompletion;

  function addTask(){
    const taskInput=document.getElementById("plannerTask");
    const timeInput=document.getElementById("plannerTime");
    if(!taskInput||!taskInput.value.trim()) return;

    ensureDay(selectedDay);
    const ws=getWeekStartKey(parseLocalISODate(selectedDay));
    const day=plannerData[ws].days[selectedDay];

    day.items.push({
      task:taskInput.value.trim(),
      time:(timeInput?.value||""),
      done:false
    });

    day.items.sort((a,b)=>String(a.time).localeCompare(String(b.time)));

    taskInput.value="";
    if(timeInput) timeInput.value="";

    savePlanner();
    renderPlanner();
    window.renderLifeScore?.();
    window.renderDNAProfile?.();
    window.renderWeeklyGraph?.();
  }

  function toggleTask(i){
    const ws=getWeekStartKey(parseLocalISODate(selectedDay));
    const day=plannerData[ws].days[selectedDay];
    day.items[i].done=!day.items[i].done;
    savePlanner();
    renderPlanner();
    window.renderLifeScore?.();
  }

  function deleteTask(i){
    const ws=getWeekStartKey(parseLocalISODate(selectedDay));
    plannerData[ws].days[selectedDay].items.splice(i,1);
    savePlanner();
    renderPlanner();
    window.renderLifeScore?.();
  }

  function renderPlanner(){

    const container=document.getElementById("scheduleContainer");
    if(!container) return;

    const today=getTodayKey();
    ensureDay(selectedDay);

    const ws=getWeekStartKey(parseLocalISODate(selectedDay));
    const start=parseLocalISODate(ws);

    const week=[];
    for(let i=0;i<7;i++){
      const d=new Date(start);
      d.setDate(start.getDate()+i);
      week.push(d);
    }

    const dayData=plannerData[ws].days[selectedDay];
    const completion=getCompletion(selectedDay);
    const names=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    container.innerHTML=`
      <div style="padding:16px">

        <div style="font-weight:900">Weekly Planner</div>
        <div style="color:#9CA3AF;margin-bottom:8px">
          ${selectedDay} • ${completion.percent}%
        </div>

        <textarea
          class="form-input"
          style="width:100%;min-height:70px;margin-bottom:10px"
          oninput="
            plannerData['${ws}'].days['${selectedDay}'].intentions=this.value;
            savePlanner();
          "
        >${escapeHtml(dayData.intentions)}</textarea>

        <div style="display:flex;gap:8px;margin-bottom:10px">
          <input id="plannerTime" type="time" class="form-input" style="width:110px"/>
          <input id="plannerTask" class="form-input" style="flex:1" placeholder="Add task..."/>
          <button class="form-submit" onclick="addTask()">Add</button>
        </div>

        <div id="taskList"></div>

        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:12px">
          ${week.map((d,i)=>{
            const dk=toLocalISODate(d);
            const isToday=dk===today;
            const isActive=dk===selectedDay;
            const pct=getCompletion(dk).percent;
            return`
              <div onclick="setSelected('${dk}')"
                style="
                  cursor:pointer;
                  padding:8px;
                  border-radius:10px;
                  border:${isToday?"2px solid #6366F1":"1px solid rgba(255,255,255,0.15)"};
                  background:${isActive?"rgba(99,102,241,0.25)":"rgba(255,255,255,0.05)"};
                  text-align:center;">
                <div style="font-size:0.8rem;color:#9CA3AF">${names[i]}</div>
                <div style="font-weight:900">${d.getDate()}</div>
                <div style="font-size:0.7rem;color:#9CA3AF">${pct}%</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    const list=document.getElementById("taskList");
    if(!list) return;

    if(!dayData.items.length){
      list.innerHTML=`<div style="color:#9CA3AF">No tasks yet.</div>`;
      return;
    }

    list.innerHTML="";
    dayData.items.forEach((item,i)=>{
      const row=document.createElement("div");
      row.style.display="flex";
      row.style.gap="10px";
      row.style.alignItems="center";
      row.style.marginBottom="6px";

      row.innerHTML=`
        <div style="min-width:60px;color:#6366F1;font-weight:900">${escapeHtml(item.time||"")}</div>
        <span onclick="toggleTask(${i})"
          style="flex:1;cursor:pointer;
          ${item.done?"text-decoration:line-through;color:#6B7280;":"color:#E5E7EB;"}">
          ${escapeHtml(item.task)}
        </span>
        <button onclick="deleteTask(${i})"
          style="background:none;border:none;color:#EF4444;cursor:pointer">✕</button>
      `;
      list.appendChild(row);
    });
  }

  window.setSelected=setSelected;
  window.addTask=addTask;
  window.toggleTask=toggleTask;
  window.deleteTask=deleteTask;
  window.renderSchedule=renderPlanner;

  document.addEventListener("DOMContentLoaded",()=>{
    loadPlanner();
    showPage(localStorage.getItem("currentPage")||"dashboard");
    renderPlanner();
  });

})();
