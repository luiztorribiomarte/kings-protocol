/* features/deadlines.js — KINGS PROTOCOL
   Rebuilt March 30, 2026. One goal: 100K by September 1, 2026.
   155 days. No excuses.
*/

(function () {
  "use strict";

  const App   = window.App;
  const STORE = "kpDeadlines_v2"; // fresh key — clean slate

  // ── STORAGE ───────────────────────────────────────────────────────────────

  function safeParse(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  }

  function getData() {
    return safeParse(STORE, {
      goalDate:        "2026-09-01",
      subGoal:         100000,
      currentSubs:     750,
      startSubs:       750,
      startDate:       "2026-03-30",

      // Weekly sub snapshots for growth chart: [{ week, subs }]
      weeklySnapshots: [],

      // Video log: [{ date, title, subs_at_post, views }]
      videoLog: [],

      // Custom deadlines: [{ title, date }]
      customDeadlines: [],
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
  function formatDate(dateStr) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric"
    });
  }

  // ── PACE CALCULATIONS ─────────────────────────────────────────────────────

  function getPace(data) {
    const daysLeft  = Math.max(0, daysUntil(data.goalDate));
    const weeksLeft = Math.max(0.1, daysLeft / 7);

    const subsNeeded  = Math.max(0, data.subGoal - data.currentSubs);
    const subsPerWeek = Math.ceil(subsNeeded / weeksLeft);
    const subsPerDay  = Math.ceil(subsNeeded / Math.max(1, daysLeft));
    const subPct      = Math.min(100, +((data.currentSubs / data.subGoal) * 100).toFixed(2));

    // Days elapsed since start
    const startDate   = new Date(data.startDate + "T00:00:00");
    const today       = new Date(); today.setHours(0,0,0,0);
    const daysElapsed = Math.max(1, Math.ceil((today - startDate) / 86400000));
    const totalDays   = daysElapsed + daysLeft;

    // Linear expected pace
    const expectedNow = Math.round(
      data.startSubs + ((data.subGoal - data.startSubs) * (daysElapsed / totalDays))
    );
    const onTrack  = data.currentSubs >= expectedNow;
    const gap      = Math.abs(data.currentSubs - expectedNow);

    // Actual growth rate
    const growthTotal   = Math.max(0, data.currentSubs - data.startSubs);
    const growthPerDay  = daysElapsed > 1 ? +(growthTotal / daysElapsed).toFixed(1) : 0;

    // At current rate, projected finish date
    let projectedDaysToGoal = null;
    if (growthPerDay > 0) {
      projectedDaysToGoal = Math.ceil(subsNeeded / growthPerDay);
    }

    // Videos this month
    const thisMonth     = todayKey().slice(0, 7);
    const vidsThisMonth = (data.videoLog || []).filter(v => v.date.startsWith(thisMonth)).length;
    const vidsTotal     = (data.videoLog || []).length;

    return {
      daysLeft, weeksLeft, subsNeeded, subsPerWeek, subsPerDay, subPct,
      expectedNow, onTrack, gap, growthTotal, growthPerDay,
      projectedDaysToGoal, vidsThisMonth, vidsTotal, daysElapsed
    };
  }

  // ── MILESTONES ────────────────────────────────────────────────────────────

  const MILESTONES = [1000, 5000, 10000, 25000, 50000, 75000, 100000];

  function getMilestones(currentSubs) {
    return MILESTONES.map(m => {
      const done   = currentSubs >= m;
      const isNext = !done && MILESTONES.filter(x => x > currentSubs && x < m).length === 0;
      const pct    = Math.min(100, Math.round((currentSubs / m) * 100));
      const label  = m >= 1000 ? `${m >= 1000 ? m/1000 + "K" : m}` : String(m);
      return { m, done, isNext, pct, label };
    });
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  function renderDeadlines() {
    const container = document.getElementById("deadlinesContainer");
    if (!container) return;

    const data       = getData();
    const p          = getPace(data);
    const milestones = getMilestones(data.currentSubs);
    const recentVids = [...(data.videoLog || [])].reverse().slice(0, 10);

    const urgencyColor  = p.daysLeft <= 30 ? "#ef4444" : p.daysLeft <= 60 ? "#f97316" : "#f97316";
    const onTrackColor  = p.onTrack ? "#22c55e" : "#ef4444";
    const onTrackBg     = p.onTrack ? "rgba(34,197,94,0.08)"  : "rgba(239,68,68,0.08)";
    const onTrackBorder = p.onTrack ? "rgba(34,197,94,0.25)"  : "rgba(239,68,68,0.25)";

    // Projected finish label
    let projLabel = "—";
    if (p.growthPerDay > 0 && p.projectedDaysToGoal !== null) {
      const projDate = new Date();
      projDate.setDate(projDate.getDate() + p.projectedDaysToGoal);
      projLabel = projDate > new Date(data.goalDate)
        ? `<span style="color:#ef4444;">Miss — ${formatDate(todayKey(projDate))}</span>`
        : `<span style="color:#22c55e;">On pace — ${formatDate(todayKey(projDate))}</span>`;
    } else if (p.growthPerDay === 0) {
      projLabel = `<span style="color:#6b7280;">No growth logged yet</span>`;
    }

    container.innerHTML = `<div style="padding:4px 0;">

      <!-- HEADER -->
      <div style="margin-bottom:20px;">
        <h2 style="font-size:1.5rem; font-weight:900; margin-bottom:4px;
          background:linear-gradient(135deg,#f97316,#ec4899);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
          100K. September 1.
        </h2>
        <div style="color:#6b7280; font-size:0.85rem;">
          Started March 30, 2026 · ${p.daysElapsed} day${p.daysElapsed !== 1 ? "s" : ""} in · ${p.daysLeft} days left
        </div>
      </div>

      <!-- MAIN COUNTDOWN -->
      <div style="padding:24px; border-radius:20px; margin-bottom:14px; position:relative; overflow:hidden;
        border:1px solid rgba(249,115,22,0.3);
        background:linear-gradient(160deg,rgba(249,115,22,0.07),rgba(236,72,153,0.05));">
        <div style="position:absolute; right:-8px; top:-16px; font-size:9rem; font-weight:900; line-height:1;
          color:rgba(249,115,22,0.05); user-select:none; pointer-events:none; letter-spacing:-0.04em;">
          ${p.daysLeft}
        </div>
        <div style="position:relative;">
          <div style="font-size:0.72rem; font-weight:900; letter-spacing:0.12em; color:#f97316; text-transform:uppercase; margin-bottom:8px;">
            Time Remaining
          </div>
          <div style="display:flex; align-items:baseline; gap:10px; margin-bottom:4px;">
            <span style="font-size:4rem; font-weight:900; line-height:1; color:white; letter-spacing:-0.02em;">${p.daysLeft}</span>
            <span style="font-size:1rem; color:#9ca3af; font-weight:700;">days · ${Math.floor(p.weeksLeft)} weeks</span>
          </div>
          <div style="color:#6b7280; font-size:0.85rem; margin-bottom:20px;">Deadline: ${formatDate(data.goalDate)}</div>

          <!-- Sub count + progress -->
          <div style="margin-bottom:14px;">
            <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px;">
              <div>
                <span style="font-size:2.2rem; font-weight:900; color:white;">${data.currentSubs.toLocaleString()}</span>
                <span style="font-size:0.9rem; color:#6b7280; font-weight:600; margin-left:8px;">/ 100,000 subscribers</span>
              </div>
              <span style="font-size:0.85rem; font-weight:900; color:#f97316;">${p.subPct}%</span>
            </div>
            <div style="height:8px; border-radius:8px; background:rgba(255,255,255,0.07); overflow:hidden;">
              <div style="height:100%; width:${p.subPct}%;
                background:linear-gradient(90deg,#f97316,#ec4899);
                border-radius:8px; transition:width 0.6s ease;
                box-shadow:0 0 10px rgba(249,115,22,0.4);">
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:6px;">
              <span style="font-size:0.72rem; color:#6b7280;">${p.subsNeeded.toLocaleString()} to go</span>
              <span style="font-size:0.72rem; color:#6b7280;">${data.subGoal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- PACE REALITY CHECK -->
      <div style="padding:16px; border-radius:16px; margin-bottom:14px;
        border:1px solid ${onTrackBorder}; background:${onTrackBg};">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
          <div style="font-weight:900; font-size:0.95rem; color:${onTrackColor};">
            ${p.onTrack ? "✅ On Track" : "⚠️ Behind Pace"}
          </div>
          <div style="font-size:0.78rem; color:#6b7280;">
            Expected by now: <strong style="color:#9ca3af;">${p.expectedNow.toLocaleString()}</strong> subs
            · you're <strong style="color:${onTrackColor};">${p.onTrack ? "+" : "-"}${p.gap.toLocaleString()}</strong>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px;">
          <div style="text-align:center; padding:14px 10px; border-radius:12px;
            background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);">
            <div style="font-size:1.5rem; font-weight:900; color:white; line-height:1;">${p.subsPerWeek.toLocaleString()}</div>
            <div style="font-size:0.7rem; color:#9ca3af; margin-top:5px; line-height:1.3;">subs needed<br>per week</div>
          </div>
          <div style="text-align:center; padding:14px 10px; border-radius:12px;
            background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);">
            <div style="font-size:1.5rem; font-weight:900; color:white; line-height:1;">${p.subsPerDay.toLocaleString()}</div>
            <div style="font-size:0.7rem; color:#9ca3af; margin-top:5px; line-height:1.3;">subs needed<br>per day</div>
          </div>
          <div style="text-align:center; padding:14px 10px; border-radius:12px;
            background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);">
            <div style="font-size:1.5rem; font-weight:900; color:${p.growthPerDay > 0 ? "#a78bfa" : "#4b5563"}; line-height:1;">
              ${p.growthPerDay > 0 ? "+" + p.growthPerDay : "—"}
            </div>
            <div style="font-size:0.7rem; color:#9ca3af; margin-top:5px; line-height:1.3;">actual subs<br>per day</div>
          </div>
        </div>
        <div style="margin-top:12px; padding:10px 14px; border-radius:10px;
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06);
          font-size:0.82rem; color:#9ca3af;">
          📈 At current rate: ${projLabel}
        </div>
      </div>

      <!-- UPDATE SUBS -->
      <div style="padding:16px; border-radius:16px; margin-bottom:14px;
        border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);">
        <div style="font-weight:900; font-size:0.88rem; color:#e5e7eb;
          text-transform:uppercase; letter-spacing:0.06em; margin-bottom:12px;">
          Update Subscriber Count
        </div>
        <div style="display:flex; gap:10px; align-items:stretch;">
          <input id="dlSubInput" type="number" value="${data.currentSubs}" min="0" max="10000000"
            placeholder="Current subscribers"
            onkeydown="if(event.key==='Enter') dlSaveNumbers()"
            style="flex:1; padding:12px 14px; border-radius:12px; font-size:1.1rem; font-weight:800;
              border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.06);
              color:white; outline:none;" />
          <button onclick="dlSaveNumbers()" style="padding:12px 20px; border-radius:12px;
            border:none; cursor:pointer; font-weight:900; font-size:0.9rem; color:white; white-space:nowrap;
            background:linear-gradient(135deg,rgba(249,115,22,0.9),rgba(236,72,153,0.8));">
            Save
          </button>
        </div>
        ${p.growthTotal > 0 ? `
          <div style="margin-top:10px; font-size:0.8rem; color:#6b7280;">
            +${p.growthTotal.toLocaleString()} subscribers since March 30 · ${p.daysElapsed} days · avg ${p.growthPerDay}/day
          </div>` : `
          <div style="margin-top:10px; font-size:0.8rem; color:#4b5563;">
            Update your count each time you check YouTube Studio.
          </div>`}
      </div>

      <!-- MILESTONE LADDER -->
      <div style="padding:16px; border-radius:16px; margin-bottom:14px;
        border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);">
        <div style="font-weight:900; font-size:0.88rem; color:#e5e7eb;
          text-transform:uppercase; letter-spacing:0.06em; margin-bottom:14px;">
          Milestone Ladder
        </div>
        <div style="display:grid; gap:8px;">
          ${milestones.map(ms => `
            <div style="display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:12px;
              border:1px solid ${ms.done ? "rgba(34,197,94,0.3)" : ms.isNext ? "rgba(249,115,22,0.35)" : "rgba(255,255,255,0.06)"};
              background:${ms.done ? "rgba(34,197,94,0.06)" : ms.isNext ? "rgba(249,115,22,0.07)" : "rgba(255,255,255,0.02)"};">
              <div style="width:34px; height:34px; border-radius:10px; flex-shrink:0;
                display:flex; align-items:center; justify-content:center; font-size:1rem;
                background:${ms.done ? "rgba(34,197,94,0.15)" : ms.isNext ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.04)"};
                border:1px solid ${ms.done ? "rgba(34,197,94,0.3)" : ms.isNext ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.08)"};">
                ${ms.done ? "✅" : ms.isNext ? "🎯" : "○"}
              </div>
              <div style="flex:1; min-width:0;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                  <span style="font-weight:800; font-size:0.9rem;
                    color:${ms.done ? "#86efac" : ms.isNext ? "#fb923c" : "#6b7280"};">
                    ${ms.label}
                  </span>
                  <span style="font-size:0.75rem; color:#6b7280;">
                    ${ms.done
                      ? "Achieved ✓"
                      : ms.isNext
                        ? `${(ms.m - data.currentSubs).toLocaleString()} away`
                        : ""}
                  </span>
                </div>
                <div style="height:3px; border-radius:3px; background:rgba(255,255,255,0.06); overflow:hidden;">
                  <div style="height:100%; width:${ms.pct}%; border-radius:3px; transition:width 0.5s;
                    background:${ms.done ? "#22c55e" : ms.isNext ? "linear-gradient(90deg,#f97316,#ec4899)" : "rgba(255,255,255,0.12)"};">
                  </div>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- VIDEO OUTPUT -->
      <div style="padding:16px; border-radius:16px; margin-bottom:14px;
        border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div style="font-weight:900; font-size:0.88rem; color:#e5e7eb;
            text-transform:uppercase; letter-spacing:0.06em;">
            Video Output
          </div>
          <button onclick="dlAddVideoModal()" style="padding:6px 14px; border-radius:20px;
            font-weight:800; font-size:0.78rem; cursor:pointer;
            border:1px solid rgba(167,139,250,0.4); background:rgba(167,139,250,0.1); color:#a78bfa;">
            + Log Video
          </button>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px;">
          <div style="padding:12px; border-radius:12px; text-align:center;
            background:rgba(167,139,250,0.08); border:1px solid rgba(167,139,250,0.2);">
            <div style="font-size:1.6rem; font-weight:900; color:white;">${p.vidsThisMonth}</div>
            <div style="font-size:0.72rem; color:#9ca3af; margin-top:3px;">this month</div>
          </div>
          <div style="padding:12px; border-radius:12px; text-align:center;
            background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:1.6rem; font-weight:900; color:white;">${p.vidsTotal}</div>
            <div style="font-size:0.72rem; color:#9ca3af; margin-top:3px;">total logged</div>
          </div>
        </div>
        ${recentVids.length === 0
          ? `<div style="color:#4b5563; font-size:0.85rem; padding:8px 0;">
              No videos logged yet. Every video is a lottery ticket.
            </div>`
          : `<div style="display:grid; gap:7px;">
              ${recentVids.map((v, i) => `
                <div style="display:flex; align-items:center; gap:10px; padding:11px 13px;
                  border-radius:12px;
                  border:1px solid ${i === 0 ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.06)"};
                  background:${i === 0 ? "rgba(167,139,250,0.07)" : "rgba(255,255,255,0.02)"};">
                  <div style="width:32px; height:32px; border-radius:9px; flex-shrink:0;
                    background:rgba(167,139,250,0.12); border:1px solid rgba(167,139,250,0.2);
                    display:flex; align-items:center; justify-content:center; font-size:0.95rem;">🎬</div>
                  <div style="flex:1; min-width:0;">
                    <div style="font-weight:800; font-size:0.87rem; color:#e5e7eb;
                      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.title}</div>
                    <div style="font-size:0.73rem; color:#6b7280; margin-top:2px;">
                      ${v.date}
                      ${v.subs_at_post ? ` · ${v.subs_at_post.toLocaleString()} subs` : ""}
                      ${v.views ? ` · ${Number(v.views).toLocaleString()} views` : ""}
                    </div>
                  </div>
                  <button onclick="dlDeleteVideo(${(data.videoLog||[]).length - 1 - i})" style="
                    width:26px; height:26px; border-radius:50%; flex-shrink:0;
                    border:1px solid rgba(239,68,68,0.2); background:rgba(239,68,68,0.06);
                    color:#ef4444; cursor:pointer; font-size:0.78rem;
                    display:flex; align-items:center; justify-content:center;">✕</button>
                </div>
              `).join("")}
            </div>`
        }
      </div>

      <!-- CUSTOM DEADLINES -->
      <div style="padding:16px; border-radius:16px; margin-bottom:14px;
        border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="font-weight:900; font-size:0.88rem; color:#e5e7eb;
            text-transform:uppercase; letter-spacing:0.06em;">
            Upload Schedule
          </div>
          <button onclick="dlAddCustomModal()" style="padding:6px 14px; border-radius:20px;
            font-weight:800; font-size:0.78rem; cursor:pointer;
            border:1px solid rgba(249,115,22,0.4); background:rgba(249,115,22,0.1); color:#fb923c;">
            + Add
          </button>
        </div>
        ${(data.customDeadlines || []).length === 0
          ? `<div style="color:#4b5563; font-size:0.85rem;">
              No upload deadlines set. Add target dates for your next videos.
            </div>`
          : `<div style="display:grid; gap:7px;">
              ${[...(data.customDeadlines || [])]
                .sort((a,b) => a.date.localeCompare(b.date))
                .map((cd, i) => {
                  const days    = daysUntil(cd.date);
                  const overdue = days < 0;
                  const urgent  = days >= 0 && days <= 3;
                  const clr     = overdue ? "#ef4444" : urgent ? "#f97316" : "#a78bfa";
                  const bg      = overdue ? "rgba(239,68,68,0.07)" : urgent ? "rgba(249,115,22,0.07)" : "rgba(255,255,255,0.02)";
                  const bdr     = overdue ? "rgba(239,68,68,0.25)" : urgent ? "rgba(249,115,22,0.25)" : "rgba(255,255,255,0.07)";
                  return `
                    <div style="display:flex; align-items:center; gap:10px; padding:12px 13px;
                      border-radius:12px; border:1px solid ${bdr}; background:${bg};">
                      <div style="flex:1;">
                        <div style="font-weight:800; font-size:0.88rem; color:#e5e7eb;">${cd.title}</div>
                        <div style="font-size:0.75rem; color:#6b7280; margin-top:2px;">${formatDate(cd.date)}</div>
                      </div>
                      <div style="font-weight:900; font-size:1rem; color:${clr}; flex-shrink:0;">
                        ${overdue ? `${Math.abs(days)}d late` : days === 0 ? "TODAY" : `${days}d`}
                      </div>
                      <button onclick="dlDeleteCustom(${i})" style="width:26px; height:26px; border-radius:50%;
                        border:1px solid rgba(239,68,68,0.2); background:rgba(239,68,68,0.06);
                        color:#ef4444; cursor:pointer; font-size:0.78rem;
                        display:flex; align-items:center; justify-content:center; flex-shrink:0;">✕</button>
                    </div>`;
                }).join("")}
            </div>`
        }
      </div>

      <!-- ACCOUNTABILITY FOOTER -->
      <div style="padding:18px; border-radius:16px; margin-bottom:8px;
        border:1px solid rgba(249,115,22,0.15);
        background:rgba(249,115,22,0.04); text-align:center;">
        <div style="font-size:0.88rem; font-weight:900; color:#f97316; margin-bottom:6px; letter-spacing:0.02em;">
          ${p.daysLeft} days. ${p.subsNeeded.toLocaleString()} subscribers.
        </div>
        <div style="font-size:0.78rem; color:#6b7280; line-height:1.6;">
          You need ${p.subsPerWeek.toLocaleString()} subs/week · ${p.subsPerDay.toLocaleString()} subs/day.<br>
          That doesn't come from consistency alone — it comes from videos that break out.<br>
          <span style="color:#9ca3af;">Post. Optimize. Repeat. The window is open.</span>
        </div>
      </div>

    </div>`;
  }

  // ── MODALS ────────────────────────────────────────────────────────────────

  window.dlSaveNumbers = function() {
    const data = getData();
    const subs = parseInt(document.getElementById("dlSubInput")?.value);
    if (isNaN(subs) || subs < 0) return alert("Enter a valid subscriber count.");
    data.currentSubs = subs;
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
          <input id="dlVTitle" placeholder="e.g. The Fall of the Roman Empire" class="form-input" style="width:100%;" />
        </div>
        <div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Date Posted</div>
          <input id="dlVDate" type="date" class="form-input" style="width:100%;" value="${todayKey()}" />
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Subs at Time of Post</div>
            <input id="dlVSubs" type="number" placeholder="${data.currentSubs}" class="form-input" style="width:100%;" />
          </div>
          <div>
            <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Views (optional)</div>
            <input id="dlVViews" type="number" placeholder="0" class="form-input" style="width:100%;" />
          </div>
        </div>
        <button onclick="dlSaveVideo()" class="form-submit" style="margin-top:4px;">Log Video</button>
      </div>
    `);
  };

  window.dlSaveVideo = function() {
    const title = (document.getElementById("dlVTitle")?.value || "").trim();
    const date  = document.getElementById("dlVDate")?.value;
    const subs  = parseInt(document.getElementById("dlVSubs")?.value  || "0");
    const views = parseInt(document.getElementById("dlVViews")?.value || "0");
    if (!title) return alert("Enter the video title.");
    if (!date)  return alert("Pick the date posted.");
    const data = getData();
    data.videoLog = data.videoLog || [];
    data.videoLog.push({
      title,
      date,
      subs_at_post: isNaN(subs)  ? null : subs,
      views:        isNaN(views) ? null : views,
    });
    saveData(data);
    window.closeModal?.();
    renderDeadlines();
  };

  window.dlDeleteVideo = function(index) {
    if (!confirm("Remove this video?")) return;
    const data = getData();
    data.videoLog.splice(index, 1);
    saveData(data);
    renderDeadlines();
  };

  window.dlAddCustomModal = function() {
    window.openModal(`
      <h2 style="margin-bottom:16px;">Add Upload Deadline</h2>
      <div style="display:grid; gap:12px;">
        <div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Title</div>
          <input id="dlCTitle" placeholder="e.g. Cold War Ep.2 upload" class="form-input" style="width:100%;" />
        </div>
        <div>
          <div style="font-size:0.82rem; color:#9ca3af; margin-bottom:6px;">Target Date</div>
          <input id="dlCDate" type="date" class="form-input" style="width:100%;" />
        </div>
        <button onclick="dlSaveCustom()" class="form-submit" style="margin-top:4px;">Add</button>
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

  // ── WIRE UP ───────────────────────────────────────────────────────────────

  window.renderDeadlines = renderDeadlines;

  if (App) {
    App.features.deadlines = { render: renderDeadlines };
    App.on("deadlines", renderDeadlines);
  }

})();
