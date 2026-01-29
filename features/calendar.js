// ============================================
// CALENDAR VIEW - Elite Performance Calendar (Dashboard + Modal)
// ============================================

function safeGetDayCompletion(dateStr) {
  try {
    if (typeof getDayCompletion === "function") {
      return getDayCompletion(dateStr);
    }
  } catch (e) {
    console.error("Error getting day completion:", e);
  }
  return { percent: 0, done: 0, total: 0 };
}

function getMonthDates(year, month) {
  const lastDay = new Date(year, month + 1, 0);
  const dates = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    dates.push(new Date(year, month, d));
  }
  return dates;
}

function getDateString(date) {
  return date.toISOString().split("T")[0];
}

// 🔥 streak calculation
function getDayStreak(dateStr) {
  let streak = 0;
  let d = new Date(dateStr);

  while (true) {
    const key = getDateString(d);
    const pct = safeGetDayCompletion(key).percent;
    if (pct >= 80) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

function getDayColor(dateStr) {
  const pct = safeGetDayCompletion(dateStr).percent;

  if (pct >= 80) return { bg: "rgba(34,197,94,0.28)", border: "rgba(34,197,94,0.75)" };
  if (pct >= 60) return { bg: "rgba(168,85,247,0.24)", border: "rgba(168,85,247,0.65)" };
  if (pct >= 40) return { bg: "rgba(245,158,11,0.24)", border: "rgba(245,158,11,0.65)" };
  if (pct > 0) return { bg: "rgba(239,68,68,0.22)", border: "rgba(239,68,68,0.65)" };
  return { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.12)" };
}

function getDayBadge(dateStr) {
  const pct = safeGetDayCompletion(dateStr).percent;
  const streak = getDayStreak(dateStr);

  if (pct >= 80 && streak >= 3) return "🔥";
  if (pct >= 90) return "👑";
  if (pct > 0 && pct < 40) return "🧊";
  return "";
}

// ============================================
// 📊 MONTHLY SCORE BAR
// ============================================

function getMonthScore(year, month) {
  const dates = getMonthDates(year, month);
  let total = 0;
  let count = 0;

  dates.forEach(d => {
    const pct = safeGetDayCompletion(getDateString(d)).percent;
    if (pct > 0) {
      total += pct;
      count++;
    }
  });

  return count ? Math.round(total / count) : 0;
}

// ============================================
// 🔥 DASHBOARD MINI CALENDAR
// ============================================

function renderDashboardCalendar() {
  const container = document.getElementById("dashboardCalendar");
  if (!container) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dates = getMonthDates(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const monthScore = getMonthScore(year, month);

  let html = `
    <div class="habit-section">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div class="section-title">📅 Monthly Performance</div>
        <button onclick="openCalendar()" class="form-submit" style="padding:4px 10px; font-size:0.85rem;">
          Expand
        </button>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div style="font-weight:700; color:#E5E7EB;">${monthName}</div>
        <div style="
          padding:4px 10px;
          border-radius:999px;
          background:rgba(99,102,241,0.15);
          border:1px solid rgba(99,102,241,0.35);
          font-size:0.85rem;
          font-weight:800;
        ">
          ${monthScore}% avg
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:6px; font-size:0.7rem; color:#9CA3AF; margin-bottom:6px;">
        ${["S","M","T","W","T","F","S"].map(d=>`<div style="text-align:center;">${d}</div>`).join("")}
      </div>

      <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:6px;">
        ${Array(firstDayOfWeek).fill("").map(()=>`<div></div>`).join("")}

        ${dates.map(date => {
          const dateStr = getDateString(date);
          const pct = safeGetDayCompletion(dateStr).percent;
          const color = getDayColor(dateStr);
          const isToday = dateStr === getDateString(new Date());
          const badge = getDayBadge(dateStr);
          const streak = getDayStreak(dateStr);

          return `
            <div 
              title="${dateStr} • ${pct}% • streak: ${streak}"
              onclick="showDayDetails('${dateStr}')"
              style="
                height:44px;
                border-radius:12px;
                border:2px solid ${isToday ? "#6366F1" : color.border};
                background:${color.bg};
                display:flex;
                flex-direction:column;
                justify-content:center;
                align-items:center;
                font-size:0.85rem;
                font-weight:800;
                cursor:pointer;
                transition:0.15s;
                position:relative;
              "
              onmouseover="this.style.transform='scale(1.06)'"
              onmouseout="this.style.transform='scale(1)'"
            >
              <div>${date.getDate()}</div>
              <div style="font-size:0.65rem; opacity:0.75;">${pct ? pct + "%" : ""}</div>
              ${badge ? `<div style="position:absolute; top:2px; right:4px; font-size:0.8rem;">${badge}</div>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// ============================================
// 🧠 FULL MODAL CALENDAR (UNCHANGED STRUCTURE, ENHANCED DATA)
// ============================================

let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth();

function renderCalendar(year, month) {
  const dates = getMonthDates(year, month);
  const firstDayOfWeek = dates[0].getDay();
  const monthName = dates[0].toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const monthScore = getMonthScore(year, month);

  let html = `
    <h2>📅 Calendar View</h2>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
      <button onclick="changeMonth(-1)" class="form-submit" style="padding:8px 16px;">◄ Prev</button>
      <div style="font-size:1.2rem; font-weight:800;">${monthName}</div>
      <button onclick="changeMonth(1)" class="form-submit" style="padding:8px 16px;">Next ►</button>
    </div>

    <div style="
      margin-bottom:14px;
      padding:10px 14px;
      border-radius:12px;
      background:rgba(99,102,241,0.12);
      border:1px solid rgba(99,102,241,0.35);
      font-weight:800;
      text-align:center;
    ">
      Monthly Average: ${monthScore}%
    </div>

    <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:8px;">
      ${Array(firstDayOfWeek).fill("").map(()=>`<div></div>`).join("")}

      ${dates.map(date => {
        const dateStr = getDateString(date);
        const pct = safeGetDayCompletion(dateStr).percent;
        const color = getDayColor(dateStr);
        const isToday = dateStr === getDateString(new Date());
        const badge = getDayBadge(dateStr);

        return `
          <div onclick="showDayDetails('${dateStr}')" style="
            height:74px;
            border-radius:14px;
            border:2px solid ${isToday ? "#6366F1" : color.border};
            background:${color.bg};
            display:flex;
            flex-direction:column;
            justify-content:center;
            align-items:center;
            cursor:pointer;
            position:relative;
          ">
            <div style="font-weight:800;">${date.getDate()}</div>
            <div style="font-size:0.75rem; opacity:0.8;">${pct}%</div>
            ${badge ? `<div style="position:absolute; top:6px; right:8px; font-size:1rem;">${badge}</div>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;

  return html;
}

function openCalendar() {
  currentCalendarYear = new Date().getFullYear();
  currentCalendarMonth = new Date().getMonth();
  openModal(renderCalendar(currentCalendarYear, currentCalendarMonth));
}

function changeMonth(direction) {
  currentCalendarMonth += direction;
  if (currentCalendarMonth > 11) { currentCalendarMonth = 0; currentCalendarYear++; }
  if (currentCalendarMonth < 0) { currentCalendarMonth = 11; currentCalendarYear--; }
  document.getElementById("modalBody").innerHTML = renderCalendar(currentCalendarYear, currentCalendarMonth);
}

// ============================================
// 🔥 AUTO-RENDER ON DASHBOARD
// ============================================

(function bootDashboardCalendar() {
  function safeRender() {
    try {
      renderDashboardCalendar();
    } catch (e) {
      console.error("Dashboard calendar failed:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeRender);
  } else {
    safeRender();
  }

  if (typeof window.showPage === "function" && !window.showPage.__calendarWrapped) {
    const originalShowPage = window.showPage;
    window.showPage = function(page) {
      const res = originalShowPage.apply(this, arguments);
      if (page === "dashboard") setTimeout(safeRender, 0);
      return res;
    };
    window.showPage.__calendarWrapped = true;
  }
})();

console.log("Elite Calendar System loaded 🧠🔥");
