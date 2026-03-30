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
      (this.events[page] || []).forEach((fn) => { try { fn(); } catch {} });
    }
  };

  window.showPage = function (page) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".kp-nav-btn").forEach((b) => b.classList.remove("active"));

    const map = { dashboard:1, workout:2, looksmaxxing:3, content:4, books:5, deadlines:6 };

    const el = document.getElementById(page + "Page");
    if (el) el.classList.add("active");

    const tab = document.querySelector(`.kp-nav-btn:nth-child(${map[page]})`);
    if (tab) tab.classList.add("active");

    localStorage.setItem("currentPage", page);
    window.App.trigger(page);

    if (page === "dashboard") {
      window.renderSchedule?.();
      window.renderLifeScore?.();
      window.renderWeeklyGraph?.();
      window.renderDNAProfile?.();
      window.renderMoodTracker?.();
      window.renderHabits?.();
      window.renderInsightsWidget?.();
      setTimeout(() => window.updateHeroBand?.(), 400);
    }
  };

  // ── HELPERS ───────────────────────────────────────────────────────────────

  function pad(n) { return String(n).padStart(2, "0"); }
  function todayKey(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function parseKey(k) {
    const [y,m,d] = String(k||"").split("-").map(Number);
    return new Date(y,(m||1)-1,d||1,0,0,0,0);
  }
  function esc(s) {
    return String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  }

  // ── PLANNER ───────────────────────────────────────────────────────────────

  const STORE = "weeklyPlannerData";
  let kpPlanner = safeObj(localStorage.getItem(STORE), {});
  let selected  = todayKey();

  function safeObj(raw, fallback) {
    try { const v=JSON.parse(raw||"null"); return v&&typeof v==="object"?v:fallback; }
    catch { return fallback; }
  }

  function savePlanner() { localStorage.setItem(STORE, JSON.stringify(kpPlanner)); }

  function weekStartKey(dayK) {
    const d=parseKey(dayK); d.setDate(d.getDate()-d.getDay()); return todayKey(d);
  }

  function ensureDay(dayK) {
    const ws=weekStartKey(dayK);
    if(!kpPlanner[ws]) kpPlanner[ws]={days:{}};
    if(!kpPlanner[ws].days[dayK]) kpPlanner[ws].days[dayK]={intentions:"",tasks:[]};
  }

  function getDay(dayK) { ensureDay(dayK); return kpPlanner[weekStartKey(dayK)].days[dayK]; }

  function completion(dayK) {
    const t=Array.isArray(getDay(dayK).tasks)?getDay(dayK).tasks:[];
    const done=t.filter(x=>x&&x.done).length;
    return t.length?Math.round((done/t.length)*100):0;
  }

  function sortTasks(tasks) {
    tasks.sort((a,b)=>{
      const sk=(t)=>{
        const s=String(t?.start||""),e=String(t?.end||"");
        const has=s||e?"0":"1";
        return `${has}|${s||"99:99"}|${e||"99:99"}|${String(t?.text||"").toLowerCase()}`;
      };
      return sk(a).localeCompare(sk(b));
    });
  }

  window.selectPlannerDay = function(k) {
    selected=/^\d{4}-\d{2}-\d{2}$/.test(String(k))?k:todayKey();
    renderPlanner();
  };

  window.setPlannerIntentions = function(value) {
    getDay(selected).intentions=String(value||"");
    savePlanner();
    window.renderLifeScore?.();
  };

  window.addPlannerTask = function() {
    const textEl =document.getElementById("plannerTask");
    const startEl=document.getElementById("plannerStart");
    const endEl  =document.getElementById("plannerEnd");
    const text =(textEl?.value||"").trim();
    const start=(startEl?.value||"").trim();
    const end  =(endEl?.value||"").trim();
    if(!text) return;
    const day=getDay(selected);
    const tasks=Array.isArray(day.tasks)?day.tasks:(day.tasks=[]);
    tasks.push({text,start:start||"",end:end||"",done:false});
    sortTasks(tasks);
    if(textEl) textEl.value="";
    if(startEl) startEl.value="";
    if(endEl) endEl.value="";
    savePlanner(); renderPlanner(); window.renderLifeScore?.();
  };

  window.togglePlannerTask = function(i) {
    const tasks=Array.isArray(getDay(selected).tasks)?getDay(selected).tasks:[];
    if(!tasks[i]) return;
    tasks[i].done=!tasks[i].done;
    savePlanner(); renderPlanner(); window.renderLifeScore?.();
  };

  window.deletePlannerTask = function(i) {
    const tasks=Array.isArray(getDay(selected).tasks)?getDay(selected).tasks:[];
    tasks.splice(i,1);
    savePlanner(); renderPlanner(); window.renderLifeScore?.();
  };

  window.renderSchedule = function() { renderPlanner(); };

  let dragFromIndex = null;

  function renderPlanner() {
    const box=document.getElementById("scheduleContainer"); if(!box) return;
    ensureDay(selected);

    const ws=weekStartKey(selected), base=parseKey(ws);
    const days=[...Array(7)].map((_,i)=>{
      const d=new Date(base); d.setDate(base.getDate()+i); return todayKey(d);
    });

    const day=getDay(selected);
    const tasks=Array.isArray(day.tasks)?day.tasks:(day.tasks=[]);
    const pct=completion(selected);
    const today=todayKey();

    box.innerHTML = `
      <div class="kp-card">

        <!-- Intentions -->
        <div style="margin-bottom:14px;">
          <textarea id="plannerIntentions" class="kp-input"
            style="min-height:72px; resize:none; font-size:0.85rem;"
            placeholder="Today's intention..."
          >${esc(day.intentions||"")}</textarea>
        </div>

        <!-- Add task row -->
        <div style="display:flex; gap:7px; flex-wrap:wrap; margin-bottom:12px;">
          <input id="plannerStart" type="time" class="kp-input" style="width:110px;" />
          <input id="plannerEnd"   type="time" class="kp-input" style="width:110px;" />
          <input id="plannerTask"  class="kp-input" placeholder="Add task..." style="flex:1; min-width:180px;" />
          <button class="kp-btn" onclick="addPlannerTask()">Add</button>
        </div>

        <!-- Task list -->
        <div id="plannerTasks" style="margin-bottom:14px;"></div>

        <!-- Day picker -->
        <div class="kp-planner-day-grid">
          ${days.map((d) => {
            const isActive=d===selected, isToday=d===today;
            const dt=parseKey(d);
            const name=["Su","Mo","Tu","We","Th","Fr","Sa"][dt.getDay()];
            const num=dt.getDate(), p=completion(d);
            return `
              <div data-day="${d}" class="kp-planner-day${isActive?" active":""}${isToday&&!isActive?" style='border-color:rgba(212,168,83,0.4);'":""}">
                <div class="kp-planner-day-name">${name}</div>
                <div class="kp-planner-day-num" style="${isToday&&!isActive?"color:var(--gold);":""}">${num}</div>
                <div class="kp-planner-day-pct">${p?p+"%":""}</div>
              </div>`;
          }).join("")}
        </div>

        <!-- Progress line -->
        <div style="margin-top:10px; display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <div style="font-size:0.72rem; color:var(--muted); font-family:'JetBrains Mono',monospace;">
            ${selected}
          </div>
          <div style="font-size:0.72rem; color:var(--gold); font-family:'JetBrains Mono',monospace; font-weight:700;">
            ${pct}%
          </div>
        </div>
        <div style="height:2px; border-radius:2px; background:rgba(255,255,255,0.06); margin-top:5px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:var(--gold); border-radius:2px; transition:width 0.4s;"></div>
        </div>
      </div>
    `;

    // Intentions listener
    const intent=document.getElementById("plannerIntentions");
    if(intent) intent.addEventListener("input",(e)=>window.setPlannerIntentions(e.target.value));

    // Day click
    box.querySelectorAll("[data-day]").forEach(btn=>{
      btn.addEventListener("click",()=>window.selectPlannerDay(btn.dataset.day));
    });

    // Task list
    const list=document.getElementById("plannerTasks");
    if(!list) return;

    if(!tasks.length) {
      list.innerHTML=`<div style="font-size:0.82rem;color:var(--muted);padding:4px 0;">No tasks yet.</div>`;
      return;
    }

    list.innerHTML=tasks.map((t,i)=>{
      const timeLabel=t.start&&t.end
        ?`${esc(t.start)}–${esc(t.end)}`
        :(t.start?esc(t.start):(t.end?esc(t.end):""));
      return `
        <div class="kp-task-row${t.done?" done":""}" draggable="true" data-index="${i}">
          <span class="drag-handle">⠿</span>
          <span class="kp-task-time">${timeLabel}</span>
          <span class="kp-task-text" onclick="togglePlannerTask(${i})" style="cursor:pointer;">${esc(t.text)}</span>
          <button class="kp-task-del" onclick="deletePlannerTask(${i})">✕</button>
        </div>`;
    }).join("");

    // Drag to reorder
    list.querySelectorAll(".kp-task-row").forEach(row=>{
      row.addEventListener("dragstart",(e)=>{
        dragFromIndex=Number(row.dataset.index);
        e.dataTransfer.effectAllowed="move";
        try{e.dataTransfer.setData("text/plain",String(dragFromIndex));}catch{}
        row.style.opacity="0.5";
      });
      row.addEventListener("dragend",()=>{ row.style.opacity="1"; dragFromIndex=null; });
      row.addEventListener("dragover",(e)=>{ e.preventDefault(); e.dataTransfer.dropEffect="move"; });
      row.addEventListener("drop",(e)=>{
        e.preventDefault();
        const to=Number(row.dataset.index), from=dragFromIndex;
        if(!Number.isFinite(from)||!Number.isFinite(to)||from===to) return;
        const dayObj=getDay(selected);
        const arr=Array.isArray(dayObj.tasks)?dayObj.tasks:[];
        const item=arr.splice(from,1)[0]; arr.splice(to,0,item);
        savePlanner(); renderPlanner(); window.renderLifeScore?.();
      });
    });
  }

  // ── BOOT ──────────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded",()=>{
    selected=todayKey();
    const lastPage=localStorage.getItem("currentPage")||"dashboard";
    window.showPage(lastPage);
    window.initHabitsData?.();
    window.initMoodData?.();
    renderPlanner();
    window.renderLifeScore?.();
    window.renderWeeklyGraph?.();
    window.renderDNAProfile?.();
    setTimeout(()=>window.updateHeroBand?.(), 500);
  });

})();
