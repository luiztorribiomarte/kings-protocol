/* features/mood.js — KINGS PROTOCOL
   All logic preserved exactly. Visual layer updated to match new design system.
*/

(function () {
  "use strict";

  const App = window.App;
  let moodData = {};
  let moodChartInstance = null;

  function getDayKey(date=new Date()) {
    const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }
  function parseDayKey(key) { const [y,m,d]=key.split("-").map(Number); return new Date(y,m-1,d); }
  function getPastDays(n=7) {
    const out=[],now=new Date();
    for(let i=n-1;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);out.push(d);}
    return out;
  }
  function saveMoodData() { localStorage.setItem("moodData",JSON.stringify(moodData)); window.dispatchEvent(new Event("moodUpdated")); }
  function getMoodScore(emoji) { return {"🙂":7,"💪":8,"😴":4,"😤":3,"🧘":9}[emoji]??null; }

  function getRangeKeys(range) {
    if(range==="all"){
      const keys=Object.keys(moodData||{}).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k));
      keys.sort((a,b)=>parseDayKey(a)-parseDayKey(b));
      return keys.length?keys:getRangeKeys("7");
    }
    return getPastDays(range==="30"?30:7).map(getDayKey);
  }

  function getHabitCompletionForDay(dayKey) {
    try { if(typeof window.getDayCompletion==="function") return window.getDayCompletion(dayKey); } catch {}
    return {done:0,total:0,percent:0};
  }

  function energyColor(val) {
    const v=Number(val);
    if(v<=3) return "#C8282A"; if(v<=5) return "#f97316"; if(v<=7) return "#F59E0B"; return "#22C55E";
  }

  function getHighEnergyStreak() {
    let streak=0; const today=new Date();
    for(let i=0;i<365;i++){
      const d=new Date(today); d.setDate(today.getDate()-i);
      const e=moodData[getDayKey(d)]?.energy??null;
      if(e!==null&&e>=7) streak++; else break;
    }
    return streak;
  }

  function getWeeklyAvgEnergy() {
    const vals=getPastDays(7).map(getDayKey).map(k=>moodData[k]?.energy??null).filter(v=>v!==null);
    return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):null;
  }

  // ── MIGRATION (preserved) ─────────────────────────────────────────────────
  function isYYYYMMDD(k){return /^\d{4}-\d{2}-\d{2}$/.test(String(k));}
  function toLocalDayKeyFromAny(rawKey){
    const k=String(rawKey).trim(); if(!k) return null;
    if(isYYYYMMDD(k)) return k;
    if(/^\d{4}\/\d{2}\/\d{2}$/.test(k)){const[y,m,d]=k.split("/").map(Number);const dt=new Date(y,m-1,d);if(!isNaN(dt.getTime()))return getDayKey(dt);}
    if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(k)){const[mm,dd,yy]=k.split("/").map(Number);const dt=new Date(yy,mm-1,dd);if(!isNaN(dt.getTime()))return getDayKey(dt);}
    if(/^\d{10,13}$/.test(k)){const dt=new Date(Number(k));if(!isNaN(dt.getTime()))return getDayKey(dt);}
    const parsed=Date.parse(k); if(!isNaN(parsed)) return getDayKey(new Date(parsed));
    return null;
  }
  function normalizeEntry(entry){
    if(!entry||typeof entry!=="object") return null;
    const out={};
    if("energy"in entry){const e=Number(entry.energy);out.energy=Number.isFinite(e)?Math.min(10,Math.max(1,e)):null;}
    if("mood"in entry){out.mood=typeof entry.mood==="string"&&entry.mood.trim()?entry.mood:null;}
    if("sleep"in entry){const s=Number(entry.sleep);out.sleep=Number.isFinite(s)?Math.min(24,Math.max(0,s)):null;}
    if("why"in entry){out.why=typeof entry.why==="string"?entry.why:null;}
    if(out.energy==null&&out.mood==null) return null;
    if(out.energy==null) out.energy=5;
    if(out.mood==null) out.mood="🙂";
    return out;
  }
  function migrateMoodData(raw){
    if(!raw||typeof raw!=="object") return {};
    const migrated={};
    const keys=Object.keys(raw);
    for(const oldKey of keys){
      const newKey=toLocalDayKeyFromAny(oldKey); if(!newKey) continue;
      const cleaned=normalizeEntry(raw[oldKey]); if(!cleaned) continue;
      if(!migrated[newKey]){migrated[newKey]=cleaned;}
      else{
        const a=migrated[newKey],b=cleaned;
        migrated[newKey]={energy:(typeof a.energy==="number"?a.energy:b.energy),mood:(a.mood?a.mood:b.mood),sleep:a.sleep??b.sleep??null,why:a.why??b.why??null};
        if(isYYYYMMDD(oldKey)&&typeof b.energy==="number") migrated[newKey].energy=b.energy;
        if(isYYYYMMDD(oldKey)&&b.mood) migrated[newKey].mood=b.mood;
      }
    }
    for(const k of keys){if(!isYYYYMMDD(k)) continue;const cleaned=normalizeEntry(raw[k]);if(!cleaned) continue;migrated[k]=cleaned;}
    return migrated;
  }

  function initMoodData(){
    const saved=localStorage.getItem("moodData");
    if(saved){try{moodData=migrateMoodData(JSON.parse(saved)||{});saveMoodData();}catch{moodData={};}}
    else moodData={};
  }

  // ── SETTERS ───────────────────────────────────────────────────────────────
  function setTodayEnergy(val){
    const v=Number(val),key=getDayKey();
    if(!moodData[key]) moodData[key]={energy:5,mood:"🙂"};
    moodData[key].energy=Math.min(10,Math.max(1,v));
    saveMoodData();
    const slider=document.getElementById("energySlider");
    const label=document.getElementById("energyLabel");
    const color=energyColor(v);
    if(slider){const pct=((v-1)/9)*100;slider.style.background=`linear-gradient(to right,${color} 0%,${color} ${pct}%,rgba(255,255,255,0.1) ${pct}%,rgba(255,255,255,0.1) 100%)`;}
    if(label){label.textContent=`${v}/10`;label.style.color=color;}
    renderSparkline();
    if(typeof window.renderLifeScore==="function") window.renderLifeScore();
    setTimeout(()=>window.updateHeroBand?.(),100);
  }
  function setTodayMood(emoji){
    const key=getDayKey();
    if(!moodData[key]) moodData[key]={energy:5,mood:"🙂"};
    moodData[key].mood=emoji; saveMoodData(); renderMoodTracker();
  }
  window.setTodaySleep=function(val){
    const v=parseFloat(val),key=getDayKey();
    if(!moodData[key]) moodData[key]={energy:5,mood:"🙂"};
    moodData[key].sleep=isNaN(v)?null:Math.min(24,Math.max(0,v));
    saveMoodData();
    if(typeof window.renderLifeScore==="function") window.renderLifeScore();
  };
  window.setTodayWhy=function(val){
    const key=getDayKey();
    if(!moodData[key]) moodData[key]={energy:5,mood:"🙂"};
    moodData[key].why=String(val||"").trim(); saveMoodData();
  };

  // ── SPARKLINE ─────────────────────────────────────────────────────────────
  function renderSparkline(){
    const el=document.getElementById("moodSparkline"); if(!el) return;
    const days=getPastDays(7),key=getDayKey();
    el.innerHTML=days.map(d=>{
      const k=getDayKey(d);
      const entry=moodData[k]||null;
      const e=entry?.energy??null;
      const mood=entry?.mood??null;
      const isToday=k===key;
      const pct=e!==null?Math.round((e/10)*100):0;
      const color=e!==null?energyColor(e):"rgba(255,255,255,0.08)";
      const dayLabel=d.toLocaleDateString("en-US",{weekday:"short"});
      const dateNum=d.getDate();
      const hs=getHabitCompletionForDay(k);
      const badge=getDayBadge(e,hs?.total?hs.percent:0);
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;min-width:0;"
          title="${badge?badge.label:(e!==null?`Energy: ${e}/10`:'No data')}">
          <div style="font-size:0.62rem;font-weight:800;color:${isToday?"var(--text)":"var(--muted)"};white-space:nowrap;font-family:'JetBrains Mono',monospace;">
            ${dayLabel.slice(0,2)}<br><span style="color:${isToday?"var(--gold)":"var(--muted2)"}">${dateNum}</span>
          </div>
          <div style="width:100%;height:52px;background:rgba(255,255,255,0.04);border-radius:5px;overflow:hidden;display:flex;align-items:flex-end;
            border:1px solid ${isToday?"var(--gold-border)":"var(--border)"};">
            <div style="width:100%;height:${pct}%;background:${e!==null?`linear-gradient(to top,${color},${color}99)`:"transparent"};
              transition:height 0.3s ease;border-radius:3px 3px 0 0;"></div>
          </div>
          <div style="font-size:0.9rem;line-height:1;">${mood??(e!==null?"":'·')}</div>
          <div style="font-size:0.72rem;font-weight:800;color:${e!==null?color:"var(--muted2)"};">${e!==null?e:"—"}</div>
          ${badge?`<div style="font-size:0.75rem;">${badge.icon}</div>`:""}
        </div>`;
    }).join("");
  }

  function getDayBadge(energy,habitPercent){
    if(energy==null) return null;
    if(energy>=7&&habitPercent>=80) return {icon:"👑",label:"Perfect day"};
    if(energy>=7&&habitPercent<50)  return {icon:"⚠️",label:"High energy / low habits"};
    if(energy<=4)                   return {icon:"🧊",label:"Low energy day"};
    return null;
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  function renderMoodTracker(){
    const container=document.getElementById("moodTracker"); if(!container) return;
    const key=getDayKey();
    const today=moodData[key]||{energy:5,mood:"🙂"};
    const energy=today.energy??5, mood=today.mood??"🙂", sleep=today.sleep??"", why=today.why??"";
    const moods=["🙂","💪","😴","😤","🧘"];
    const moodLabels={"🙂":"Good","💪":"Pumped","😴":"Tired","😤":"Stressed","🧘":"Calm"};
    const color=energyColor(energy);
    const sliderPct=((energy-1)/9)*100;
    const weekAvg=getWeeklyAvgEnergy();
    const heStreak=getHighEnergyStreak();

    container.innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-radius:10px;overflow:hidden;border:1px solid var(--border);">

        <!-- LEFT: Input panel -->
        <div style="padding:18px;background:var(--bg2);border-right:1px solid var(--border);">
          <div style="font-family:'JetBrains Mono',monospace;font-size:0.68rem;font-weight:700;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;margin-bottom:14px;">Today</div>

          <!-- Energy slider -->
          <div style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
              <div style="font-size:0.78rem;color:var(--muted);">⚡ Energy</div>
              <div id="energyLabel" style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:0.88rem;color:${color};">${energy}/10</div>
            </div>
            <input id="energySlider" type="range" min="1" max="10" value="${energy}"
              oninput="setTodayEnergy(this.value)"
              style="width:100%;height:4px;border-radius:4px;outline:none;-webkit-appearance:none;appearance:none;cursor:pointer;
                background:linear-gradient(to right,${color} 0%,${color} ${sliderPct}%,rgba(255,255,255,0.1) ${sliderPct}%,rgba(255,255,255,0.1) 100%);" />
            <style>
              #energySlider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:white;cursor:pointer;box-shadow:0 0 0 3px ${color}55,0 2px 8px rgba(0,0,0,0.4);transition:box-shadow 0.15s;}
              #energySlider::-webkit-slider-thumb:hover{box-shadow:0 0 0 5px ${color}44,0 2px 8px rgba(0,0,0,0.4);}
            </style>
          </div>

          <!-- Mood buttons -->
          <div style="margin-bottom:14px;">
            <div style="font-size:0.78rem;color:var(--muted);margin-bottom:7px;">😊 Mood</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;">
              ${moods.map(em=>{
                const active=em===mood;
                return `<button onclick="setTodayMood('${em}')" title="${moodLabels[em]}"
                  style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 8px;border-radius:8px;cursor:pointer;
                  border:1px solid ${active?"var(--gold-border)":"var(--border)"};
                  background:${active?"var(--gold-dim)":"transparent"};color:white;transition:all 0.12s;">
                  <span style="font-size:1.1rem;line-height:1;">${em}</span>
                  <span style="font-size:0.58rem;color:${active?"var(--gold)":"var(--muted)"};font-weight:700;letter-spacing:0.02em;">${moodLabels[em]}</span>
                </button>`;
              }).join("")}
            </div>
          </div>

          <!-- Sleep -->
          <div style="margin-bottom:12px;">
            <div style="font-size:0.78rem;color:var(--muted);margin-bottom:6px;">🛌 Sleep (hrs)</div>
            <input type="number" min="0" max="24" step="0.5" value="${sleep}" placeholder="e.g. 7.5"
              onchange="setTodaySleep(this.value)"
              class="kp-input" style="font-size:0.85rem;" />
          </div>

          <!-- Why -->
          <div>
            <div style="font-size:0.78rem;color:var(--muted);margin-bottom:6px;">📝 Driver</div>
            <input type="text" value="${why.replace(/"/g,"&quot;")}" placeholder="What drove today?"
              onchange="setTodayWhy(this.value)"
              class="kp-input" style="font-size:0.82rem;" />
          </div>
        </div>

        <!-- RIGHT: Sparkline panel -->
        <div style="padding:18px;background:var(--bg2);cursor:pointer;" onclick="openMoodGraph('7')" title="Tap for full chart">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;gap:6px;flex-wrap:wrap;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:0.68rem;font-weight:700;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;">7 Days</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${weekAvg!==null?`<div style="padding:3px 8px;border-radius:20px;background:rgba(255,255,255,0.04);border:1px solid var(--border);font-size:0.72rem;font-weight:800;color:${energyColor(parseFloat(weekAvg))};font-family:'JetBrains Mono',monospace;">avg ${weekAvg}</div>`:""}
              ${heStreak>0?`<div style="padding:3px 8px;border-radius:20px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);font-size:0.72rem;font-weight:800;color:#22C55E;">🔥 ${heStreak}d</div>`:""}
            </div>
          </div>
          <div id="moodSparkline" style="display:flex;gap:5px;align-items:flex-end;height:120px;"></div>
          <div style="margin-top:8px;font-size:0.68rem;color:var(--muted2);font-family:'JetBrains Mono',monospace;letter-spacing:0.04em;">tap for full chart</div>
        </div>

      </div>
    `;

    renderSparkline();
  }

  // ── MOOD GRAPH MODAL (all logic preserved) ────────────────────────────────
  function computeMoodHabitInsights(keys,energyValues,habitStats){
    const hi=[],lo=[];
    for(let i=0;i<keys.length;i++){
      const e=energyValues[i],hs=habitStats[i];
      if(e==null||!hs||!hs.total) continue;
      if(e>=7) hi.push(hs.percent); if(e<=4) lo.push(hs.percent);
    }
    const avg=arr=>arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):null;
    const avgHi=avg(hi),avgLo=avg(lo);
    let line1="",line2="";
    if(avgHi!=null&&hi.length>=2) line1=`On high-energy days (7–10), you averaged ${avgHi}% habit completion.`;
    else if(avgHi!=null) line1=`You had 1 high-energy day (7–10): ${avgHi}% habit completion.`;
    if(avgLo!=null&&lo.length>=2) line2=`On low-energy days (1–4), you averaged ${avgLo}% completion.`;
    else if(avgLo!=null) line2=`You had 1 low-energy day (1–4): ${avgLo}% completion.`;
    let compare="";
    if(avgHi!=null&&avgLo!=null){const diff=avgHi-avgLo,abs=Math.abs(diff);compare=abs>=5?(diff>0?`That's ${abs} points higher when your energy is high.`:`That's ${abs} points higher when your energy is low.`):"Your completion stays consistent across energy levels.";}
    if(!line1&&!line2) return {title:"Insight",body:"Log a few more days to unlock patterns.",compare:""};
    return {title:"Insight",body:[line1,line2].filter(Boolean).join(" "),compare};
  }

  function renderMoodInsight(insight){
    const el=document.getElementById("moodInsight"); if(!el) return;
    el.innerHTML=`<div style="margin-top:12px;padding:14px;border-radius:10px;border:1px solid var(--gold-border);background:var(--gold-dim);">
      <div style="font-weight:900;color:var(--gold);margin-bottom:6px;font-size:0.85rem;">🧠 ${insight.title}</div>
      <div style="color:var(--text);font-size:0.82rem;line-height:1.4;">${insight.body}</div>
      ${insight.compare?`<div style="margin-top:6px;color:rgba(255,255,255,0.7);font-size:0.8rem;">${insight.compare}</div>`:""}
    </div>`;
  }

  function openMoodGraph(range="7"){
    const title=range==="30"?"Last 30 Days":range==="all"?"All Time":"Last 7 Days";
    window.openModal(`
      <h2>Mood History</h2>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap;">
        <div style="font-size:0.82rem;color:var(--muted);">Range</div>
        <select id="moodRangeSelect" class="form-input" style="width:auto;">
          <option value="7" ${range==="7"?"selected":""}>7 days</option>
          <option value="30" ${range==="30"?"selected":""}>30 days</option>
          <option value="all" ${range==="all"?"selected":""}>All time</option>
        </select>
      </div>
      <div style="font-size:0.8rem;color:var(--muted);margin-bottom:12px;">Energy (1–10). Tooltip shows mood + habits.</div>
      <div style="height:300px;"><canvas id="moodChartCanvas" height="300"></canvas></div>
      <div id="moodInsight"></div>
      <div id="moodEmojiRow" style="margin-top:12px;display:grid;gap:6px;grid-template-columns:repeat(auto-fit,minmax(44px,1fr));"></div>
    `);
    const sel=document.getElementById("moodRangeSelect");
    if(sel) sel.onchange=()=>openMoodGraph(sel.value);
    setTimeout(()=>renderMoodChart(range),0);
  }

  function renderMoodChart(range){
    const canvas=document.getElementById("moodChartCanvas"); if(!canvas) return;
    if(moodChartInstance){try{moodChartInstance.destroy();}catch{} moodChartInstance=null;}
    if(typeof Chart==="undefined") return;
    const keys=getRangeKeys(range);
    const labels=keys.map(k=>parseDayKey(k).toLocaleDateString("en-US",{month:"short",day:"numeric"}));
    const energyValues=keys.map(k=>moodData?.[k]?.energy??null);
    const moodEmojis=keys.map(k=>moodData?.[k]?.mood??"—");
    const moodScores=keys.map(k=>getMoodScore(moodData?.[k]?.mood)??null);
    const sleepValues=keys.map(k=>moodData?.[k]?.sleep??null);
    const habitStats=keys.map(k=>getHabitCompletionForDay(k));
    renderMoodInsight(computeMoodHabitInsights(keys,energyValues,habitStats));
    const emojiRow=document.getElementById("moodEmojiRow");
    if(emojiRow){
      emojiRow.innerHTML=keys.map((k,i)=>{
        const hs=habitStats[i],habitsLine=hs&&hs.total?`${hs.done}/${hs.total}`:"—";
        const badge=getDayBadge(energyValues[i],hs&&hs.total?hs.percent:0);
        const why=moodData?.[k]?.why||null;
        return `<div style="padding:9px 7px;border-radius:9px;border:1px solid var(--border);background:var(--bg3);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:0.65rem;color:var(--muted);font-family:'JetBrains Mono',monospace;">${labels[i]}</div>
            ${badge?`<div style="font-size:0.85rem;">${badge.icon}</div>`:"<div style='width:14px;'></div>"}
          </div>
          <div style="font-size:1.1rem;margin-top:5px;">${moodEmojis[i]}</div>
          <div style="font-size:0.78rem;margin-top:3px;color:${energyColor(energyValues[i]??5)};font-weight:800;">⚡${energyValues[i]??"—"}</div>
          ${sleepValues[i]!==null?`<div style="font-size:0.72rem;color:var(--muted);">🛌${sleepValues[i]}h</div>`:""}
          <div style="font-size:0.72rem;color:var(--muted2);">${habitsLine}</div>
          ${why?`<div style="font-size:0.68rem;color:var(--gold);font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:72px;">${why}</div>`:""}
        </div>`;
      }).join("");
    }
    moodChartInstance=new Chart(canvas.getContext("2d"),{
      type:"line",
      data:{labels,datasets:[
        {label:"Energy (1–10)",data:energyValues,tension:0.35,spanGaps:true,pointRadius:4,pointHoverRadius:6,borderWidth:3,borderColor:"#D4A853",backgroundColor:"rgba(212,168,83,0.1)"},
        {label:"Sleep (hrs)",data:sleepValues,tension:0.35,spanGaps:true,pointRadius:3,borderWidth:2,hidden:false,yAxisID:"y2",borderColor:"#2B5AA0"},
        {label:"Mood Score",data:moodScores,tension:0.35,spanGaps:true,pointRadius:0,borderWidth:2,hidden:true,borderColor:"#C8282A"}
      ]},
      options:{
        responsive:true,maintainAspectRatio:false,
        interaction:{mode:"index",intersect:false},
        plugins:{
          legend:{labels:{color:"rgba(255,255,255,0.7)",font:{family:"DM Sans"}}},
          tooltip:{callbacks:{afterBody:(items)=>{
            const idx=items?.[0]?.dataIndex??0,k=keys[idx];
            const hs=habitStats[idx],habitsLine=hs&&hs.total?`Habits: ${hs.done}/${hs.total} (${hs.percent}%)`:"Habits: —";
            const sl=sleepValues[idx],why=moodData?.[k]?.why||null;
            return[`Mood: ${moodEmojis[idx]}`,habitsLine,sl!==null?`Sleep: ${sl}h`:"Sleep: —",...(why?[`Note: ${why}`]:[]),`Date: ${k}`];
          }}}
        },
        scales:{
          x:{ticks:{color:"rgba(255,255,255,0.5)",font:{family:"JetBrains Mono",size:11}},grid:{color:"rgba(255,255,255,0.05)"}},
          y:{min:1,max:10,ticks:{stepSize:1,color:"rgba(255,255,255,0.5)",font:{family:"JetBrains Mono",size:11}},grid:{color:"rgba(255,255,255,0.05)"}},
          y2:{position:"right",min:0,max:12,ticks:{color:"rgba(255,255,255,0.3)",stepSize:2},grid:{display:false}}
        }
      }
    });
  }

  window.initMoodData       = initMoodData;
  window.renderMoodTracker  = renderMoodTracker;
  window.setTodayEnergy     = setTodayEnergy;
  window.setTodayMood       = setTodayMood;
  window.openMoodGraph      = openMoodGraph;

  Object.defineProperty(window,"moodData",{get:()=>moodData,configurable:true});

  initMoodData();

  if(App){
    App.features.mood={init:initMoodData,render:renderMoodTracker};
    App.on("dashboard",()=>{initMoodData();renderMoodTracker();});
  }

  console.log("Mood module v2 loaded");
})();
