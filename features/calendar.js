// ============================================
// CALENDAR VIEW - Monthly Overview with Day Details (DASHBOARD MODE)
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

function getDayColor(dateStr) {
  const pct = safeGetDayCompletion(dateStr).percent;
  if (pct >= 80) return { bg: "rgba(34,197,94,0.2)", border: "rgba(34,197,94,0.5)" };
  if (pct >= 60) return { bg: "rgba(168,85,247,0.2)", border: "rgba(168,85,247,0.5)" };
  if (pct >= 40) return { bg: "rgba(245,158,11,0.2)", border: "rgba(245,158,11,0.5)" };
  if (pct > 0) return { bg: "rgba(239,68,68,0.2)", border: "rgba(239,68,68,0.5)" };
  return { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)" };
}

let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth();

// ✅ NEW: Render calendar directly inside dashboard
function renderDashboardCalendar() {
  const container = document.getElementById("dashboardCalendar");
  if (!container) return;

  const dates = getMonthDates(currentCalendarYear, currentCalendarMonth);
  const firstDayOfWeek = dates[0].getDay();
  const monthName = dates[0].toLocaleDateString("en-US", { month: "long", year: "numeric" });

  let html = `
    <div style="
      padding:18px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,0.16);
      background:linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      margin-bottom:18px;
    ">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="font-weight:800; font-size:1.05rem;">📅 Calendar</div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button onclick="changeDashboardMonth(-1)" style="padding:4px 10px;">◄</button>
          <div style="font-weight:700;">${monthName}</div>
          <button onclick="changeDashboardMonth(1)" style="padding:4px 10px;">►</button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:6px; font-size:0.8rem; color:#9CA3AF; margin-bottom:6px;">
        ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>`<div style="text-align:center;">${d}</div>`).join("")}
      </div>

      <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:6px;">
        ${Array(firstDayOfWeek).fill("").map(()=>`<div></div>`).join("")}

        ${dates.map(date=>{
          const dateStr = getDateString(date);
          const color = getDayColor(dateStr);
          const isToday = dateStr === getDateString(new Date());

          return `
            <div onclick="showDayDetails('${dateStr}')" style="
              aspect-ratio:1;
              display:flex;
              align-items:center;
              justify-content:center;
              border-radius:10px;
              font-weight:700;
              cursor:pointer;
              border:2px solid ${isToday ? "#6366F1" : color.border};
              background:${color.bg};
              transition:transform 0.15s ease;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              ${date.getDate()}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function changeDashboardMonth(dir) {
  currentCalendarMonth += dir;
  if (currentCalendarMonth > 11) {
    currentCalendarMonth = 0;
    currentCalendarYear++;
  }
  if (currentCalendarMonth < 0) {
    currentCalendarMonth = 11;
    currentCalendarYear--;
  }
  renderDashboardCalendar();
}

// ✅ KEEP original modal calendar (unchanged so nothing breaks)
function openCalendar() {
  const html = renderCalendar(currentCalendarYear, currentCalendarMonth);
  openModal(html);
}

// ✅ AUTO RENDER on dashboard load
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(renderDashboardCalendar, 0);
});

console.log("Calendar View loaded (dashboard mode)");
