/* features/deadlines.js — KINGS PROTOCOL
   Deadlines page: countdown to May 2026 goal, subscriber + income milestones,
   weekly pace tracker, input targets, video log.
*/

(function () {
  "use strict";

  const App = window.App;

  // ── STORAGE ───────────────────────────────────────────────────────────────
  const STORE = "kpDeadlines";

  function safeParse(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  }

  function getData() {
    return safeParse(STORE, {
      // Main goal
      goalDate:        "2026-05-01",
      subGoal:         25000,
      incomeGoal:      15000,

      // Current actuals (manually updated)
      currentSubs:     750,
      currentIncome:   0,

      // Sub-milestones (manually checked off)
      subMilestones:   [1000, 2500, 5000, 10000, 15000, 20000, 25000],
      checkedMilestones: [],

      // Custom deadlines
      customDeadlines: [],

      // Videos posted log: [{ date, title, subs_at_post }]
      videoLog: [],
    });
  }

  function saveData(d) {
    localStorage.setItem(STORE, JSON.stringify(d));
  }

  // ── DATE HELPERS ──────────────────────────────────────────────────────────

  function pad(n) { return String(n).padStart(2, "0"); }
  function todayKey(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function daysUntil(dateStr) {
    const target = new Date(dateStr + "T00:00:00");
    const today  = new Date(); today.setHours(0,0,0,0);
    return Math.ceil((target - today) / 86400000);
  }

  function weeksBetween(d1, d2) {
    return Math.max(1, Math.ceil((new Date(d2) - new Date(d1)) / (7 * 86400000)));
  }

  function formatDate(dateStr) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });
  }

  // ── PACE CALCULATIONS ─────────────────────────────────────────────────────

  function getPace(data) {
    const today      = todayKey();
    const goalDate   = data.goalDate;
    const daysLeft   = Math.max(0, daysUntil(goalDate));
    const weeksLeft  = Math.max(1, daysLeft / 7);

    // Subs needed
    const subsNeeded   = Math.max(0, data.subGoal - data.currentSubs);
    const subsPerWeek  = Math.ceil(subsNeeded / weeksLeft);
    const subsPerDay   = Math.ceil(subsNeeded / Math.max(1, daysLeft));

    // Income needed
    const incomeNeeded = Math.max(0, data.incomeGoal - data.currentIncome);

    // Progress pct
    const subPct    = Math.min(100, Math.round((data.currentSubs / data.subGoal) * 100));
    const incomePct = Math.min(100, Math.round((data.currentIncome / data.incomeGoal) * 100));

    // Videos logged this month
    const thisMonth = today.slice(0, 7);
    const vidsThisMonth = (data.videoLog || []).filter(v => v.date.startsWith(thisMonth)).length;

    // On track? — expected subs by now
    const startSubs = 750;
    const totalDaysInGoal = Math.max(1, weeksBetween("2026-01-01", goalDate) * 7);
    const daysPassed = Math.max(0, Math.ceil((new Date() - new Date("2026-01-01")) / 86400000));
    const expectedSubsByNow = Math.round(startSubs + ((data.subGoal - startSubs) * (daysPassed / totalDaysInGoal)));
    const onTrack = data.currentSubs >= expectedSubsByNow;
    const gap = Math.abs(data.currentSubs - expectedSubsByNow);

    return { daysLeft, weeksLeft, subsNeeded, subsPerWeek, subsPerDay, incomeNeeded, subPct, incomePct, vidsThisMonth, onTrack, gap, expectedSubsByNow };
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  function renderDeadlines() {
    const container = document.getElementById("deadlinesContainer");
    if (!container) return;

    const data = getData();
    const p    = getPace(data);

    // Colors
    const onTrackColor  = p.onTrack ? "#22c55e" : "#ef4444";
    const onTrackBg     = p.onTrack ? "rgba(34,197,94,0.08)"  : "rgba(239,68,68,0.08)";
    const onTrackBorder = p.onTrack ? "rgba(34,197,94,0.3)"   : "rgba(239,68,68,0.3)";
    const onTrackLabel  = p.onTrack ? "✅ On Track" : "⚠️ Behind Pace";

    // Sub milestone progress
    const milestoneBars = (data.subMilestones || []).map(m => {
      const done     = data.currentSubs >= m || (data.checkedMilestones || []).includes(m);
      const isNext   = !done && data.currentSubs < m && (data.subMilestones || []).filter(x => x > data.currentSubs && x < m).length === 0;
      const pct      = Math.min(100, Math.round((data.currentSubs / m) * 100));
      const kLabel   = m >= 1000 ? `${m/1000}K` : m;
      return { m, done, isNext, pct, kLabel };
    });

    // Video log (last 8)
    const recentVideos = [...(data.videoLog || [])].reverse().slice(0, 8);

    container.innerHTML = `
      <div style="padding:4px 0;">

        <!-- PAGE HEADER -->
        <div style="margin-bottom:24px;">
          <h2 style="
            font-size:1.5rem; font-weight:900; margin-bottom:4px;
            background:linear-gradient(135deg,#e5e7eb,#f97316);
            -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          ">Deadlines</h2>
          <div style="color:#6b7280; font-size:0.85rem;">May 2026. Lock in or fall off.</div>
        </div>

        <!-- MAIN COUNTDOWN ─────────────────────────────────────────────── -->
        <div style="
          padding:24px; border-radius:20px; margin-bottom:16px;
          border:1px solid rgba(249,115,22,0.3);
          background:linear-gradient(160deg,rgba(249,115,22,0.08),rgba(236,72,153,0.06));
          position:relative; overflow:hidden;
        ">
          <!-- Background number -->
          <div style="
            position:absolute; right:-10px; top:-20px;
            font-size:8rem; font-weight:900; line-height:1;
            color:rgba(249,115,22,0.06); user-select:none; pointer-events:none;
            letter-spacing:-0.04em;
          ">${p.daysLeft}</div>

          <div style="position:relative;">
            <div style="font-size:0.75rem; font-weight:800; letter-spacing:0.1em; color:#f97316; text-transform:uppercase; margin-bottom:8px;">
              Main Deadline
            </div>
            <div style="display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; margin-bottom:4px;">
              <span style="font-size:3.5rem; font-weight:900; line-height:1; color:white;">${p.daysLeft}</span>
              <span style="font-size:1.1rem; color:#9ca3af; font-weight:700;">days left</span>
            </div>
            <div style="color:#6b7280; font-size:0.85rem; margin-bottom:16px;">${formatDate(data.goalDate)}</div>

            <!-- Twin goals -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div style="padding:14px; border-radius:14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
                <div style="font-size:0.72rem; color:#6b7280; letter-spacing:0.06em; margin-bottom:6px;">SUBSCRIBERS</div>
                <div style="font-size:1.6rem; font-weight:900; color:white;">${data.currentSubs.toLocaleString()}</div>
                <div style="font-size:0.8rem; color:#f97316; font-weight:700;">of ${data.subGoal.toLocaleString()} goal</div>
                <div style="height:4px; border-radius:4px; background:rgba(255,255,255,0.08); margin-top:10px; overflow:hidden;">
                  <div style="height:100%; width:${p.subPct}%; background:linear-gradient(90deg,#f97316,#ec4899); border-radius:4px; transition:width 0.5s;"></div>
                </div>
                <div style="font-size:0.72rem; color:#6b7280; margin-top:4px;">${p.subPct}% there</div>
              </div>
              <div style="padding:14px; border-radius:14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
                <div style="font-size:0.72rem; color:#6b7280; letter-spacing:0.06em; margin-bottom:6px;">MONTHLY INCOME</div>
                <div style="font-size:1.6rem; font-weight:900; color:white;">$${data.currentIncome.toLocaleString()}</div>
                <div style="font-size:0.8rem; color:#a78bfa; font-weight:700;">of $${data.incomeGoal.toLocaleString()} goal</div>
                <div style="height:4px; border-radius:4px; background:rgba(255,255,255,0.08); margin-top:10px; overflow:hidden;">
                  <div style="height:100%; width:${p.incomePct}%; background:linear-gradient(90deg,#a78bfa,#ec4899); border-radius:4px; transition:width 0.5s;"></div>
                </div>
                <div style="font-size:0.72rem; color:#6b7280; margin-top:4px;">${p.incomePct}% there</div>
              </div>
            </div>
          </div>
        </div>

        <!-- PACE CARD ───────────────────────────────────────────────────── -->
        <div style="
          padding:16px; border-radius:16px; margin-bottom:16px;
          border:1px solid ${onTrackBorder}; background:${onTrackBg};
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
            <div style="font-weight:900; font-size:0.95rem; color:${onTrackColor};">${onTrackLabel}</div>
            <div style="font-size:0.8rem; color:#6b7280;">Expected by now: ${p.expectedSubsByNow.toLocaleString()} subs</div>
          </div>
          <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px;">
            <div style="text-align:center; padding:12px; border-radius:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);">
              <div style="font-size:1.4rem; font-weight:900; color:white;">${p.subsPerWeek.toLocaleString()}</div>
              <div style="font-size:0.72rem; color:#9ca3af; margin-top:3px;">subs / week needed</div>
            </div>
            <div style="text-align:center; padding:12px; border-radius:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);">
              <div style="font-size:1.4rem; font-weight:900; color:white;">${p.subsPerDay.toLocaleString()}</div>
              <div style="font-size:0.72rem; color:#9ca3af; margin-top:3px;">subs / day needed</div>
            </div>
            <div style="text-align:center; padding:12px; border-radius:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);">
              <div style="font-size:1.4rem; font-weight:900; color:${p.onTrack ? "#22c55e" : "#ef4444"};">${p.onTrack ? "+" : "-"}${p.gap.toLocaleString()}</div>
              <div style="font-size:0.72rem; color:#9ca3af; margin-top:3px;">vs expected pace</div>
            </div>
          </div>
        </div>

        <!-- UPDATE NUMBERS ──────────────────────────────────────────────── -->
        <div style="
          padding:16px; border-radius:16px; margin-bottom:16px;
          border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);
        ">
          <div style="font-weight:900; font-size:0.9rem; color:#e5e7eb; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:12px;">
            Update Numbers
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <div style="font-size:0.78rem; color:#6b7280; margin-bottom:6px;">Current Subscribers</div>
              <div style="display:flex; gap:8px;">
                <input id="dlSubInput" type="number" value="${data.currentSubs}" min="0"
                  style="flex:1; padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:white; outline:none; font-size:0.95rem;"
                  onkeydown="if(event.key==='Enter') dlSaveSubs()" />
              </div>
            </div>
            <div>
              <div style="font-size:0.78rem; color:#6b7280; margin-bottom:6px;">Monthly Income ($)</div>
              <div style="display:flex; gap:8px;">
                <input id="dlIncomeInput" type="number" value="${data.currentIncome}" min="0"
                  style="flex:1; padding:10px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:white; outline:none; font-size:0.95rem;"
                  onkeydown="if(event.key==='Enter') dlSaveIncome()" />
              </div>
            </div>
          </div>
          <button onclick="dlSaveNumbers()" style="
            width:100%; margin-top:12px; padding:12px;
            border-radius:12px; border:none; cursor:pointer;
            font-weight:900; font-size:0.95rem; color:white;
            background:linear-gradient(135deg,rgba(249,115,22,0.9),rgba(236,72,153,0.8));
          ">Save Numbers</button>
        </div>

        <!-- SUBSCRIBER MILESTONES ───────────────────────────────────────── -->
        <div style="
          padding:16px; border-radius:16px; margin-bottom:16px;
          border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);
        ">
          <div style="font-weight:900; font-size:0.9rem; color:#e5e7eb; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:14px;">
            Subscriber Milestones
          </div>
          <div style="display:grid; gap:8px;">
            ${milestoneBars.map(ms => `
              <div style="
                display:flex; align-items:center; gap:12px;
                padding:12px 14px; border-radius:12px;
                border:1px solid ${ms.done ? "rgba(34,197,94,0.3)" : ms.isNext ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.07)"};
                background:${ms.done ? "rgba(34,197,94,0.06)" : ms.isNext ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.02)"};
              ">
                <div style="
                  width:36px; height:36px; border-radius:10px; flex-shrink:0;
                  display:flex; align-items:center; justify-content:center;
                  font-size:1.1rem;
                  background:${ms.done ? "rgba(34,197,94,0.15)" : ms.isNext ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.05)"};
                  border:1px solid ${ms.done ? "rgba(34,197,94,0.3)" : ms.isNext ? "rgba(249,115,22,0.25)" : "rgba(255,255,255,0.1)"};
                ">${ms.done ? "✅" : ms.isNext ? "🎯" : "○"}</div>
                <div style="flex:1; min-width:0;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <span style="font-weight:800; font-size:0.9rem; color:${ms.done ? "#86efac" : ms.isNext ? "#fb923c" : "#9ca3af"};">${ms.kLabel} subscribers</span>
                    <span style="font-size:0.75rem; color:#6b7280;">${ms.done ? "Done ✓" : ms.isNext ? `${(ms.m - data.currentSubs).toLocaleString()} away` : ""}</span>
                  </div>
                  <div style="height:3px; border-radius:3px; background:rgba(255,255,255,0.07); overflow:hidden;">
                    <div style="
                      height:100%; width:${ms.pct}%;
                      background:${ms.done ? "#22c55e" : ms.isNext ? "linear-gradient(90deg,#f97316,#ec4899)" : "rgba(255,255,255,0.15)"};
                      border-radius:3px; transition:width 0.5s;
                    "></div>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- CUSTOM DEADLINES ────────────────────────────────────────────── -->
        <div style="
          padding:16px; border-radius:16px; margin-bottom:16px;
          border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <div style="font-weight:900; font-size:0.9rem; color:#e5e7eb; text-transform:uppercase; letter-spacing:0.05em;">Custom Deadlines</div>
            <button onclick="dlAddCustomModal()" style="
              padding:6px 14px; border-radius:20px; font-weight:800; font-size:0.8rem;
              border:1px solid rgba(249,115,22,0.4); background:rgba(249,115,22,0.1);
              color:#fb923c; cursor:pointer;
            ">+ Add</button>
          </div>
          ${(data.customDeadlines || []).length === 0
            ? `<div style="color:#4b5563; font-size:0.85rem;">No custom deadlines yet. Add video release dates, milestones, events.</div>`
            : `<div style="display:grid; gap:8px;">
                ${[...(data.customDeadlines || [])].sort((a,b) => a.date.localeCompare(b.date)).map((cd, i) => {
                  const days = daysUntil(cd.date);
                  const overdue = days < 0;
                  const urgent  = days >= 0 && days <= 3;
                  const color   = overdue ? "#ef4444" : urgent ? "#f97316" : "#a78bfa";
                  const bg      = overdue ? "rgba(239,68,68,0.08)" : urgent ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.03)";
                  const border  = overdue ? "rgba(239,68,68,0.3)" : urgent ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.08)";
                  return `
                    <div style="
                      display:flex; align-items:center; gap:12px; padding:12px 14px;
                      border-radius:12px; border:1px solid ${border}; background:${bg};
                    ">
                      <div style="flex:1;">
                        <div style="font-weight:800; font-size:0.9rem; color:#e5e7eb;">${cd.title}</div>
                        <div style="font-size:0.78rem; color:#6b7280; margin-top:2px;">${formatDate(cd.date)}</div>
                      </div>
                      <div style="text-align:right; flex-shrink:0;">
                        <div style="font-weight:900; font-size:1rem; color:${color};">
                          ${overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "TODAY" : `${days}d`}
                        </div>
                      </div>
                      <button onclick="dlDeleteCustom(${i})" style="
                        width:28px; height:28px; border-radius:50%; flex-shrink:0;
                        border:1px solid rgba(239,68,68,0.25); background:rgba(239,68,68,0.08);
                        color:#ef4444; cursor:pointer; font-size:0.85rem;
                        display:flex; align-items:center; justify-content:center;
                      ">✕</button>
                    </div>
                  `;
                }).join("")}
              </div>`
          }
        </div>

        <!-- VIDEO LOG ───────────────────────────────────────────────────── -->
        <div style="
          padding:16px; border-radius:16px; margin-bottom:16px;
          border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);
        ">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <div>
              <div style="font-weight:900; font-size:0.9rem; color:#e5e7eb; text-transform:uppercase; letter-spacing:0.05em;">Videos Posted</div>
              <div style="font-size:0.78rem; color:#6b7280; margin-top:2px;">${p.vidsThisMonth} this month</div>
            </div>
            <button onclick="dlAddVideoModal()" style="
              padding:6px 14px; border-radius:20px; font-weight:800; font-size:0.8rem;
              border:1px solid rgba(167,139,250,0.4); background:rgba(167,139,250,0.1);
              color:#a78bfa; cursor:pointer;
            ">+ Log Video</button>
          </div>
          ${recentVideos.length === 0
            ? `<div style="color:#4b5563; font-size:0.85rem;">No videos logged yet. Every video you post is an asset.</div>`
            : `<div style="display:grid; gap:8px;">
                ${recentVideos.map((v, i) => `
                  <div style="
                    display:flex; align-items:center; gap:12px; padding:12px 14px;
                    border-radius:12px; border:1px solid rgba(255,255,255,0.07);
                    background:${i === 0 ? "rgba(167,139,250,0.06)" : "rgba(255,255,255,0.02)"};
                  ">
                    <div style="
                      width:36px; height:36px; border-radius:10px; flex-shrink:0;
                      background:rgba(167,139,250,0.12); border:1px solid rgba(167,139,250,0.25);
                      display:flex; align-items:center; justify-content:center; font-size:1.1rem;
                    ">🎬</div>
                    <div style="flex:1; min-width:0;">
                      <div style="font-weight:800; font-size:0.88rem; color:#e5e7eb; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.title}</div>
                      <div style="font-size:0.75rem; color:#6b7280; margin-top:2px;">${v.date}${v.subs_at_post ? ` · ${v.subs_at_post.toLocaleString()} subs at post` : ""}</div>
                    </div>
                    ${i === 0 ? `<span style="font-size:0.7rem; padding:2px 8px; border-radius:20px; background:rgba(167,139,250,0.15); border:1px solid rgba(167,139,250,0.3); color:#a78bfa; font-weight:800; flex-shrink:0;">Latest</span>` : ""}
                  </div>
                `).join("")}
              </div>`
          }
        </div>

        <!-- MOTIVATION FOOTER ───────────────────────────────────────────── -->
        <div style="
          padding:16px; border-radius:16px; margin-bottom:8px;
          border:1px solid rgba(255,255,255,0.06);
          background:rgba(255,255,255,0.02);
          text-align:center;
        ">
          <div style="font-size:0.82rem; color:#4b5563; line-height:1.6;">
            ${p.daysLeft} days. ${p.subsNeeded.toLocaleString()} subscribers.
            ${p.subsPerWeek} per week. ${p.subsPerDay} per day.<br>
            <span style="color:#6b7280;">The math is clear. The question is execution.</span>
          </div>
        </div>

      </div>
    `;
  }

  // ── MODALS ────────────────────────────────────────────────────────────────

  window.dlSaveNumbers = function() {
    const data  = getData();
    const subs  = parseInt(document.getElementById("dlSubInput")?.value  || data.currentSubs);
    const income = parseFloat(document.getElementById("dlIncomeInput")?.value || data.currentIncome);
    if (isNaN(subs) || subs < 0) return alert("Enter a valid subscriber count.");
    data.currentSubs   = subs;
    data.currentIncome = isNaN(income) ? data.currentIncome : income;
    saveData(data);
    renderDeadlines();
  };

  window.dlAddCustomModal = function() {
    window.openModal(`
      <h2 style="margin-bottom:16px;">Add Deadline</h2>
      <div style="display:grid; gap:12px;">
        <div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Title</div>
          <input id="dlCTitle" placeholder="e.g. Upload Episode 3" class="form-input" style="width:100%;" />
        </div>
        <div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Date</div>
          <input id="dlCDate" type="date" class="form-input" style="width:100%;" />
        </div>
        <button onclick="dlSaveCustom()" class="form-submit" style="margin-top:4px;">Add Deadline</button>
      </div>
    `);
  };

  window.dlSaveCustom = function() {
    const title = (document.getElementById("dlCTitle")?.value || "").trim();
    const date  = document.getElementById("dlCDate")?.value;
    if (!title) return alert("Enter a title.");
    if (!date)  return alert("Pick a date.");
    const data = getData();
    data.customDeadlines = data.customDeadlines || [];
    data.customDeadlines.push({ title, date });
    saveData(data);
    window.closeModal?.();
    renderDeadlines();
  };

  window.dlDeleteCustom = function(index) {
    if (!confirm("Remove this deadline?")) return;
    const data = getData();
    data.customDeadlines.splice(index, 1);
    saveData(data);
    renderDeadlines();
  };

  window.dlAddVideoModal = function() {
    const data = getData();
    window.openModal(`
      <h2 style="margin-bottom:16px;">Log a Video</h2>
      <div style="display:grid; gap:12px;">
        <div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Video Title</div>
          <input id="dlVTitle" placeholder="e.g. How Napoleon Conquered Europe" class="form-input" style="width:100%;" />
        </div>
        <div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Date Posted</div>
          <input id="dlVDate" type="date" class="form-input" style="width:100%;" value="${todayKey()}" />
        </div>
        <div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Subs at Time of Post</div>
          <input id="dlVSubs" type="number" placeholder="${data.currentSubs}" class="form-input" style="width:100%;" />
        </div>
        <button onclick="dlSaveVideo()" class="form-submit" style="margin-top:4px;">Log Video</button>
      </div>
    `);
  };

  window.dlSaveVideo = function() {
    const title = (document.getElementById("dlVTitle")?.value || "").trim();
    const date  = document.getElementById("dlVDate")?.value;
    const subs  = parseInt(document.getElementById("dlVSubs")?.value || "0");
    if (!title) return alert("Enter the video title.");
    if (!date)  return alert("Pick the date posted.");
    const data = getData();
    data.videoLog = data.videoLog || [];
    data.videoLog.push({ title, date, subs_at_post: isNaN(subs) ? null : subs });
    saveData(data);
    window.closeModal?.();
    renderDeadlines();
  };

  // ── WIRE UP ───────────────────────────────────────────────────────────────

  window.renderDeadlines = renderDeadlines;

  if (App) {
    App.features.deadlines = { render: renderDeadlines };
    App.on("deadlines", renderDeadlines);
  }

})();
