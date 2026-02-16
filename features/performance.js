/* features/performance.js
   KINGS PROTOCOL — PERFORMANCE ENGINE (HABITS FIXED)

   Fix:
   - Reads LIVE habit grid if storage is stale
   - Prevents false 0% days
*/

(function () {
  "use strict";

  const WEIGHTS = {
    mood: 0.20,
    habits: 0.25,
    tasks: 0.20,
    workout: 0.20,
    reading: 0.15
  };

  const READING_GOAL_MINUTES = 20;
  const DEFAULT_RANGE = "7";

  function byId(id) {
    return document.getElementById(id);
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toLocalISODate(d = new Date()) {
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }

  function clamp(n,min,max){
    const x=Number(n);
    if(!Number.isFinite(x))return min;
    return Math.min(max,Math.max(min,x));
  }

  function safeParse(r,f){
    try{return JSON.parse(r)??f}catch{return f}
  }

  // -----------------------------
  // MOOD
  // -----------------------------
  function getMoodScore(dayKey){
    const m = window.moodData || safeParse(localStorage.getItem("moodData"),{});
    const v = m?.[dayKey];
    if(typeof v==="number") return clamp(v,0,10);
    if(v?.mood) return clamp(v.mood,0,10);
    return null;
  }

  // -----------------------------
  // HABITS (FIXED)
  // -----------------------------
  function getHabitsPercent(dayKey){

    // 1. Try official API first
    try{
      if(window.getDayCompletion){
        const r = window.getDayCompletion(dayKey);
        if(r && r.percent>0) return clamp(r.percent,0,100);
      }
    }catch{}

    // 2. LIVE GRID FALLBACK (today only)
    const today = toLocalISODate(new Date());
    if(dayKey !== today) return 0;

    try{
      const grid = document.getElementById("habitGrid");
      if(!grid) return 0;

      const checks = grid.querySelectorAll("input[type='checkbox']");
      if(!checks.length) return 0;

      let done=0;
      checks.forEach(c=>{
        if(c.checked) done++;
      });

      return Math.round((done/checks.length)*100);

    }catch{
      return 0;
    }
  }

  // -----------------------------
  // TASKS
  // -----------------------------
  function getTasksPercent(dayKey){
    let t=0,p=0;

    try{
      const h = window.todoHistory||safeParse(localStorage.getItem("todoHistory"),{});
      if(h?.[dayKey]?.percent) t=h[dayKey].percent;
    }catch{}

    try{
      if(window.getPlannerCompletionForDay){
        p=window.getPlannerCompletionForDay(dayKey)?.percent||0;
      }
    }catch{}

    return Math.max(t,p);
  }

  // -----------------------------
  // WORKOUT
  // -----------------------------
  function workoutDone(dayKey){
    const list = safeParse(localStorage.getItem("kp_workouts_v2"),[]);
    if(!Array.isArray(list))return false;

    for(const w of list){
      if(w.status!=="completed")continue;
      for(const ex of w.exercises||[]){
        for(const s of ex.sets||[]){
          if(String(s?.date||"").split("T")[0]===dayKey) return true;
        }
      }
    }
    return false;
  }

  // -----------------------------
  // READING
  // -----------------------------
  function getReadingMinutes(dayKey){
    const r = safeParse(localStorage.getItem("booksLog"),{});
    if(typeof r?.[dayKey]==="number") return r[dayKey];
    return 0;
  }

  // -----------------------------
  // SCORE
  // -----------------------------
  function computeDay(dayKey){

    const moodRaw = getMoodScore(dayKey);
    const mood = moodRaw===null?50:clamp(moodRaw*10,0,100);

    const habits = getHabitsPercent(dayKey);
    const tasks = getTasksPercent(dayKey);
    const workout = workoutDone(dayKey)?100:0;
    const readMin = getReadingMinutes(dayKey);
    const reading = clamp((readMin/READING_GOAL_MINUTES)*100,0,100);

    const score =
      mood*WEIGHTS.mood+
      habits*WEIGHTS.habits+
      tasks*WEIGHTS.tasks+
      workout*WEIGHTS.workout+
      reading*WEIGHTS.reading;

    return{
      date:dayKey,
      mood,
      habits,
      tasks,
      workout,
      reading,
      score:Math.round(score)
    };
  }

  // -----------------------------
  // SERIES
  // -----------------------------
  function buildSeries(n){
    const out=[];
    const today=new Date();

    for(let i=n-1;i>=0;i--){
      const d=new Date(today);
      d.setDate(today.getDate()-i);
      out.push(toLocalISODate(d));
    }

    const rows=out.map(k=>computeDay(k));

    return{
      keys:out,
      labels:out.map(k=>k.slice(5)),
      rows,
      scores:rows.map(r=>r.score)
    };
  }

  function streak(rows){
    let s=0;
    for(let i=rows.length-1;i>=0;i--){
      if(rows[i].score>=80)s++;
      else break;
    }
    return s;
  }

  // -----------------------------
  // UI
  // -----------------------------
  let chart=null;

  function ensureUI(){
    if(byId("kpPerformanceSection")) return;

    const dash=byId("dashboardPage");
    if(!dash)return;

    const box=document.createElement("div");
    box.className="habit-section";
    box.id="kpPerformanceSection";

    box.innerHTML=`
    <div class="section-title">📈 Performance Engine</div>

    <div class="stats-grid" style="margin-top:10px;">
      <div class="stat-card">
        <div id="kpToday" class="stat-value">--%</div>
        <div class="stat-label">Today</div>
      </div>

      <div class="stat-card">
        <div id="kpAvg" class="stat-value">--%</div>
        <div class="stat-label">7-day avg</div>
      </div>

      <div class="stat-card">
        <div id="kpStreak" class="stat-value">--</div>
        <div class="stat-label">Streak</div>
      </div>
    </div>

    <div style="height:260px;margin-top:10px;">
      <canvas id="kpChart"></canvas>
    </div>

    <div id="kpDNA" style="margin-top:10px;"></div>
    `;

    dash.appendChild(box);
  }

  function draw(){

    ensureUI();

    const s=buildSeries(7);
    const avg=Math.round(s.scores.reduce((a,b)=>a+b,0)/s.scores.length);
    const st=streak(s.rows);

    byId("kpToday").textContent=s.rows.at(-1).score+"%";
    byId("kpAvg").textContent=avg+"%";
    byId("kpStreak").textContent=st;

    if(chart){chart.destroy();chart=null;}

    if(window.Chart){

      chart=new Chart(byId("kpChart"),{
        type:"line",
        data:{
          labels:s.labels,
          datasets:[{
            data:s.scores,
            borderWidth:3,
            tension:.3
          }]
        },
        options:{
          responsive:true,
          maintainAspectRatio:false,
          scales:{
            y:{beginAtZero:true,max:100}
          }
        }
      });
    }

    const r=s.rows.at(-1);

    const weak=[
      ["habits",r.habits],
      ["tasks",r.tasks],
      ["mood",r.mood],
      ["workout",r.workout],
      ["reading",r.reading]
    ].sort((a,b)=>a[1]-b[1])[0];

    byId("kpDNA").innerHTML=`
      <div class="stat-card">
        <div class="stat-label">Productivity DNA</div>
        <div style="margin-top:6px">
          mood ${r.mood}% • habits ${r.habits}% • tasks ${r.tasks}% • workout ${r.workout?"yes":"no"} • reading ${r.reading}%
        </div>
        <div style="margin-top:6px;font-weight:800">
          Next lever: ${weak[0]}
        </div>
      </div>
    `;
  }

  // -----------------------------
  // PUBLIC
  // -----------------------------
  window.renderLifeScore=draw;
  window.renderWeeklyGraph=draw;
  window.renderDNAProfile=draw;
  window.renderDashboardTrendChart=draw;

  function boot(){

    draw();

    window.addEventListener("habitsUpdated",draw);
    window.addEventListener("storage",draw);

    document.addEventListener("visibilitychange",()=>{
      if(!document.hidden)draw();
    });

    setInterval(draw,8000);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot);
  }else{
    boot();
  }

})();
