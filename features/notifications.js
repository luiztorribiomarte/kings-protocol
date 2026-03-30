/* features/notifications.js — KINGS PROTOCOL
   Two daily banners:
   - 6 AM  Morning Briefing  → everything scheduled for today
   - 8 PM  Evening Check-in  → only what's still NOT done
   Supplement IDs updated to match current looksmaxxing protocol.
   Sprint days: Tue(2) / Fri(5) / Sun(0).
*/

(function () {
  "use strict";

  const STORE_DISMISSED = "kpNotifDismissed";

  function pad(n) { return String(n).padStart(2,"0"); }
  function todayKey(d=new Date()) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function safeParse(key,fallback) {
    try{ return JSON.parse(localStorage.getItem(key)||"null")??fallback; }catch{ return fallback; }
  }

  const NOW   = new Date();
  const HOUR  = NOW.getHours();
  const DOW   = NOW.getDay();
  const TODAY = todayKey();

  function getWindow() {
    if(HOUR>=6 &&HOUR<12) return "morning";
    if(HOUR>=20&&HOUR<24) return "evening";
    return null;
  }

  function getDismissed() { return safeParse(STORE_DISMISSED,{}); }
  function isDismissedToday(w) { return getDismissed()[w]===TODAY; }
  function dismissWindow(w) { const d=getDismissed(); d[w]=TODAY; localStorage.setItem(STORE_DISMISSED,JSON.stringify(d)); }

  // ── DATA ──────────────────────────────────────────────────────────────────

  function lmDone(id) { return !!(safeParse("looksmaxxCompletions",{})?.[TODAY]?.[id]); }
  function habitDoneById(id) { return !!(safeParse("habitCompletions",{})?.[TODAY]?.[id]); }
  function findHabit(fragment) { return safeParse("habits",[]).find(h=>h.name.toLowerCase().includes(fragment.toLowerCase())); }
  function habitDoneByName(fragment) { const h=findHabit(fragment); return h?habitDoneById(h.id):false; }

  function sprintDoneToday() {
    const log=safeParse("looksmaxxSprintLog",[]);
    return log.length>0&&log[log.length-1].date===TODAY;
  }
  function workoutDoneToday() {
    const list=safeParse("kp_workouts_v2",[]);
    if(!Array.isArray(list)) return false;
    for(const w of list){
      if(w.status!=="completed") continue;
      for(const ex of w.exercises||[])
        for(const s of ex.sets||[])
          if(String(s?.date||"").split("T")[0]===TODAY) return true;
    }
    return false;
  }

  // ── ITEM DEFINITIONS ──────────────────────────────────────────────────────

  function buildAllItems() {
    const isNeckDay   = [1,3,5].includes(DOW);
    const isSprintDay = [2,5,0].includes(DOW); // Tue / Fri / Sun
    const isSalDay    = [1,3,5].includes(DOW);
    const DOW_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const items       = [];

    // Morning protocol
    items.push({
      icon:"🌅", title:"Wake Up & Morning Sunlight",
      detail:"Get outside within 30min of waking. Sets your circadian rhythm.",
      page:"dashboard", scheduled:true,
      done:()=>habitDoneByName("sunlight")||habitDoneByName("sun")||habitDoneByName("wake"),
    });
    items.push({
      icon:"✨", title:"Morning Skin Routine",
      detail:"Cleanser → Ice → Caffeine Eye → Vitamin C → Hyaluronic → Moisturizer → SPF.",
      page:"looksmaxxing", scheduled:true,
      done:()=>lmDone("lm_am_cleanser")&&lmDone("lm_am_vitc")&&lmDone("lm_am_spf"),
    });
    items.push({
      icon:"💊", title:"Morning Supplements",
      detail:"Vitamin D · Enclomiphene · Creatine · Beetroot · Algae Oil.",
      page:"looksmaxxing", scheduled:true,
      done:()=>lmDone("lm_supp_vitd")&&lmDone("lm_supp_enclomiphene")&&lmDone("lm_supp_creatine")&&lmDone("lm_supp_beetroot")&&lmDone("lm_supp_algaeoil"),
    });

    // Training
    items.push({
      icon:"🏋️", title:"Workout",
      detail:"Push/Pull/Legs — log your session.",
      page:"workout", scheduled:true,
      done:()=>workoutDoneToday()||habitDoneByName("work out")||habitDoneByName("workout")||habitDoneByName("morning exercise"),
    });
    if(isNeckDay) items.push({
      icon:"💪", title:`Neck Training — ${DOW_NAMES[DOW]}`,
      detail:"Weighted curls · Neck bridges · Trap shrugs. Heavy.",
      page:"looksmaxxing", scheduled:true,
      done:()=>lmDone("lm_neck_curls")&&lmDone("lm_neck_bridges"),
    });
    if(isSprintDay) items.push({
      icon:"🚴", title:`Sprint Day — ${DOW_NAMES[DOW]}`,
      detail:"Stationary bike. 48hr rule — don't skip.",
      page:"looksmaxxing", scheduled:true,
      done:()=>sprintDoneToday(),
    });

    // Neck isometrics daily
    items.push({
      icon:"🦾", title:"Neck Isometrics",
      detail:"All 4 directions · 3×20sec each. Daily.",
      page:"looksmaxxing", scheduled:true,
      done:()=>lmDone("lm_neck_iso"),
    });

    // Facial
    items.push({
      icon:"😮", title:"Mewing + Jaw Work",
      detail:"Mewing all day · Mastic gum 30min · Chin tucks · Jawliner.",
      page:"looksmaxxing", scheduled:true,
      done:()=>lmDone("lm_mewing")&&lmDone("lm_jaw_gum")&&lmDone("lm_chin_tucks"),
    });

    // Mind
    const readHabit=findHabit("read");
    if(readHabit) items.push({ icon:"📖", title:"Read Today", detail:`${readHabit.icon} ${readHabit.name}`, page:"books", scheduled:true, done:()=>habitDoneById(readHabit.id) });
    const meditateHabit=findHabit("meditat");
    if(meditateHabit) items.push({ icon:"🧘", title:"Meditation", detail:`${meditateHabit.icon} ${meditateHabit.name}`, page:"dashboard", scheduled:true, done:()=>habitDoneById(meditateHabit.id) });
    const journalHabit=findHabit("journal")||findHabit("reflect");
    if(journalHabit) items.push({ icon:"📝", title:"Journal / Reflect", detail:`${journalHabit.icon} ${journalHabit.name}`, page:"dashboard", scheduled:true, done:()=>habitDoneById(journalHabit.id) });

    // YouTube
    const ytHabit=findHabit("youtube")||findHabit("content");
    if(ytHabit) items.push({ icon:"🎬", title:"YouTube Work", detail:`${ytHabit.icon} ${ytHabit.name} — 2hr minimum.`, page:"content", scheduled:true, done:()=>habitDoneById(ytHabit.id) });

    // Evening
    items.push({
      icon:"🌙", title:"Night Skin Routine",
      detail:isSalDay?"Cleanser → Salicylic → Niacinamide → GHK-Cu → Moisturizer.":"Cleanser → Niacinamide → GHK-Cu → Moisturizer.",
      page:"looksmaxxing", scheduled:true,
      done:()=>lmDone("lm_pm_cleanser")&&lmDone("lm_pm_ghkcu")&&lmDone("lm_pm_moisturizer"),
    });
    items.push({
      icon:"💤", title:"Night Supplements",
      detail:"Magnesium Glycinate · Zinc (EOD) · Boron (EOD).",
      page:"looksmaxxing", scheduled:true,
      done:()=>lmDone("lm_supp_magnesium"),
    });
    items.push({
      icon:"🦷", title:"Dental + Grooming",
      detail:"Electric toothbrush + floss. Face massage before sleep.",
      page:"looksmaxxing", scheduled:true,
      done:()=>lmDone("lm_teeth_brush")&&lmDone("lm_teeth_floss"),
    });

    return items;
  }

  // ── BANNER ────────────────────────────────────────────────────────────────

  function renderBanner(windowName, items) {
    document.getElementById("kpNotifBanner")?.remove();
    if(!items.length) return;

    const isMorning = windowName==="morning";
    const title     = isMorning?"☀️ Morning Briefing":"🌙 Evening Check-in";
    const subtitle  = isMorning?"Everything on your plate today.":"Still not done — close the day strong.";

    if(!document.getElementById("kpNotifStyles")){
      const style=document.createElement("style");
      style.id="kpNotifStyles";
      style.textContent=`
        @keyframes kpSlideUp{from{opacity:0;transform:translateX(-50%) translateY(24px) scale(0.97);}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}}
        @keyframes kpSlideDown{from{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}to{opacity:0;transform:translateX(-50%) translateY(24px) scale(0.97);}}
        #kpNotifBanner .kpNRow:hover{background:rgba(255,255,255,0.05)!important;}
        #kpNotifDismiss:hover{background:rgba(255,255,255,0.1)!important;}
      `;
      document.head.appendChild(style);
    }

    const ac = isMorning?"#D4A853":"#a78bfa";
    const ab = isMorning?"rgba(212,168,83,0.3)":"rgba(167,139,250,0.3)";
    const ag = isMorning?"rgba(212,168,83,0.07)":"rgba(167,139,250,0.07)";

    const banner=document.createElement("div");
    banner.id="kpNotifBanner";
    banner.style.cssText=`
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      width:min(460px,calc(100vw - 28px));z-index:9999;
      border-radius:14px;border:1px solid ${ab};
      background:rgba(8,10,15,0.97);
      backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
      box-shadow:0 16px 48px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.06);
      font-family:'DM Sans',sans-serif;
      animation:kpSlideUp 0.35s cubic-bezier(0.34,1.4,0.64,1) both;overflow:hidden;
    `;

    const rows=items.map(item=>{
      const done=item.done();
      return `
        <div class="kpNRow" onclick="kpNotifGo('${item.page}')" style="
          display:flex;align-items:center;gap:12px;padding:11px 16px;cursor:pointer;
          border-top:1px solid rgba(255,255,255,0.05);background:transparent;transition:background 0.12s;">
          <div style="width:36px;height:36px;border-radius:8px;flex-shrink:0;
            background:${done?"rgba(34,197,94,0.1)":"rgba(255,255,255,0.05)"};
            border:1px solid ${done?"rgba(34,197,94,0.25)":"rgba(255,255,255,0.08)"};
            display:flex;align-items:center;justify-content:center;font-size:1rem;">
            ${item.icon}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:800;font-size:0.87rem;color:${done?"#86efac":"var(--text,#E8E6E0)"};">
              ${done?"✓ ":""}${item.title}
            </div>
            <div style="font-size:0.74rem;color:rgba(255,255,255,0.35);margin-top:2px;line-height:1.3;">${item.detail}</div>
          </div>
          ${!done?`<div style="font-size:0.7rem;font-weight:800;color:${ac};white-space:nowrap;flex-shrink:0;">Go →</div>`:""}
        </div>`;
    }).join("");

    banner.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:13px 16px 11px;background:${ag};border-bottom:1px solid ${ab};">
        <div>
          <div style="font-weight:900;font-size:0.95rem;color:${ac};">${title}</div>
          <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);margin-top:2px;">${subtitle}</div>
        </div>
        <button id="kpNotifDismiss" style="width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);font-size:0.8rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.12s;">✕</button>
      </div>
      <div style="max-height:52vh;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent;">${rows}</div>
      <div style="padding:9px 16px;text-align:center;font-size:0.68rem;color:rgba(255,255,255,0.2);border-top:1px solid rgba(255,255,255,0.04);font-family:'JetBrains Mono',monospace;letter-spacing:0.04em;">
        tap to navigate · ✕ to dismiss
      </div>
    `;
    document.body.appendChild(banner);
    document.getElementById("kpNotifDismiss").addEventListener("click",()=>closeBanner(windowName));
  }

  function closeBanner(windowName){
    const banner=document.getElementById("kpNotifBanner"); if(!banner) return;
    banner.style.animation="kpSlideDown 0.25s ease forwards";
    setTimeout(()=>banner.remove(),260);
    dismissWindow(windowName);
  }

  window.kpNotifGo=function(page){
    const win=getWindow(); if(win) closeBanner(win);
    setTimeout(()=>{ if(typeof window.showPage==="function") window.showPage(page); },150);
  };

  // ── MAIN LOGIC ────────────────────────────────────────────────────────────

  function evaluate(){
    const win=getWindow(); if(!win) return;
    if(isDismissedToday(win)) return;
    const allItems=buildAllItems();
    const visibleItems=win==="morning"
      ? allItems.filter(item=>item.scheduled)
      : allItems.filter(item=>!item.done());
    if(!visibleItems.length) return;
    renderBanner(win,visibleItems);
  }

  function init(){
    if(window.App) window.App.on("dashboard",()=>setTimeout(evaluate,700));
    window.addEventListener("habitsUpdated",()=>{
      const banner=document.getElementById("kpNotifBanner"); if(!banner) return;
      const win=getWindow(); if(win==="evening"){
        const undone=buildAllItems().filter(item=>!item.done());
        if(!undone.length){banner.style.animation="kpSlideDown 0.25s ease forwards";setTimeout(()=>banner.remove(),260);}
      }
    });
  }

  init();
  window.renderNotifications=evaluate;

})();
