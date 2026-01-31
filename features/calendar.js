// ============================================
// CALENDAR VIEW - Monthly Overview + Embedded Dashboard View
// ============================================

(function() {
  "use strict";

  function safeGetDayCompletion(dateStr) {
    try {
      if (typeof window.getDayCompletion === "function") {
        return window.getDayCompletion(dateStr);
      }
    } catch (e) {
      console.error("Error getting day completion:", e);
    }
    return { percent: 0, done: 0, total: 0 };
  }

  function getMonthDates(year, month) {
    const firstDay = new Date(year, month, 1);
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
    
    if (pct >= 80) return { bg: "rgba(34,197,94,0.2)", border: "rgba(34,197,94,0.5)", text: "Perfect" };
    if (pct >= 60) return { bg: "rgba(168,85,247,0.2)", border: "rgba(168,85,247,0.5)", text: "Solid" };
    if (pct >= 40) return { bg: "rgba(245,158,11,0.2)", border: "rgba(245,158,11,0.5)", text: "OK" };
    if (pct > 0) return { bg: "rgba(239,68,68,0.2)", border: "rgba(239,68,68,0.5)", text: "Weak" };
    return { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)", text: "No data" };
  }

  // ---------- EMBEDDED CALENDAR FOR DASHBOARD ----------
  function renderEmbeddedCalendar() {
    const container = document.getElementById("embeddedCalendar");
    if (!container) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const dates = getMonthDates(year, month);
    const firstDayOfWeek = dates[0].getDay();
    const monthName = dates[0].toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const html = `
      <div style="margin-bottom:12px; text-align:center; font-weight:800; color:#E5E7EB;">
        ${monthName}
      </div>
      
      <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px; margin-bottom:8px;">
        ${dayNames.map(day => `
          <div style="text-align:center; font-weight:700; color:#9CA3AF; font-size:0.8rem; padding:4px;">
            ${day}
          </div>
        `).join("")}
      </div>
      
      <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:4px;">
        ${Array(firstDayOfWeek).fill(null).map(() => `
          <div style="aspect-ratio:1; background:transparent;"></div>
        `).join("")}
        
        ${dates.map(date => {
          const dateStr = getDateString(date);
          const color = getDayColor(dateStr);
          const isToday = dateStr === getDateString(new Date());
          
          return `
            <div onclick="showDayDetails('${dateStr}')" style="
              aspect-ratio:1;
              display:flex;
              align-items:center;
              justify-content:center;
              border-radius:8px;
              border:2px solid ${isToday ? '#6366F1' : color.border};
              background:${color.bg};
              cursor:pointer;
              transition:transform 0.2s ease;
              font-weight:${isToday ? '900' : '600'};
              font-size:0.9rem;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              ${date.getDate()}
            </div>
          `;
        }).join("")}
      </div>
      
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:14px; padding:10px; border-radius:8px; background:rgba(255,255,255,0.02); font-size:0.8rem;">
        <div style="display:flex; align-items:center; gap:4px;">
          <div style="width:12px; height:12px; border-radius:3px; background:rgba(34,197,94,0.5);"></div>
          <span>80%+</span>
        </div>
        <div style="display:flex; align-items:center; gap:4px;">
          <div style="width:12px; height:12px; border-radius:3px; background:rgba(168,85,247,0.5);"></div>
          <span>60-79%</span>
        </div>
        <div style="display:flex; align-items:center; gap:4px;">
          <div style="width:12px; height:12px; border-radius:3px; background:rgba(245,158,11,0.5);"></div>
          <span>40-59%</span>
        </div>
        <div style="display:flex; align-items:center; gap:4px;">
          <div style="width:12px; height:12px; border-radius:3px; background:rgba(239,68,68,0.5);"></div>
          <span><40%</span>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  }

  // Day details function
  window.showDayDetails = function(dateStr) {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    
    const habitData = safeGetDayCompletion(dateStr);
    
    const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
    const dayMood = moodData[dateStr];
    
    const todoHistory = JSON.parse(localStorage.getItem("todoHistory") || "{}");
    const dayTasks = todoHistory[dateStr];
    
    const habits = JSON.parse(localStorage.getItem("habits") || "[]");
    const habitCompletions = JSON.parse(localStorage.getItem("habitCompletions") || "{}");
    
    const html = `
      <h2>${dayName}</h2>
      
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:14px; margin-bottom:20px;">
        <div style="padding:14px; border-radius:12px; background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.3); text-align:center;">
          <div style="font-size:2rem; font-weight:900;">${habitData.percent}%</div>
          <div style="color:#9CA3AF; font-size:0.9rem;">Habits</div>
          <div style="color:#E5E7EB; font-size:0.85rem; margin-top:4px;">${habitData.done}/${habitData.total}</div>
        </div>
        
        <div style="padding:14px; border-radius:12px; background:rgba(236,72,153,0.1); border:1px solid rgba(236,72,153,0.3); text-align:center;">
          <div style="font-size:2rem; font-weight:900;">${dayMood?.energy || '—'}</div>
          <div style="color:#9CA3AF; font-size:0.9rem;">Energy</div>
          <div style="font-size:1.5rem; margin-top:4px;">${dayMood?.mood || '—'}</div>
        </div>
        
        <div style="padding:14px; border-radius:12px; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); text-align:center;">
          <div style="font-size:2rem; font-weight:900;">${dayTasks?.percent || 0}%</div>
          <div style="color:#9CA3AF; font-size:0.9rem;">Tasks</div>
          <div style="color:#E5E7EB; font-size:0.85rem; margin-top:4px;">${dayTasks?.completed || 0}/${dayTasks?.total || 0}</div>
        </div>
      </div>
      
      ${habits.length > 0 ? `
        <div style="margin-bottom:20px;">
          <div style="font-weight:800; margin-bottom:10px;">Habits Completed</div>
          <div style="display:grid; gap:6px;">
            ${habits.map(habit => {
              const done = habitCompletions[dateStr]?.[habit.id];
              return `
                <div style="display:flex; align-items:center; gap:8px; padding:8px; border-radius:8px; background:rgba(255,255,255,0.03);">
                  <div style="font-size:1.2rem;">${done ? '✅' : '○'}</div>
                  <div>${habit.icon} ${habit.name}</div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      ` : ''}
      
      ${dayTasks?.tasks ? `
        <div>
          <div style="font-weight:800; margin-bottom:10px;">Tasks</div>
          <div style="display:grid; gap:6px;">
            ${dayTasks.tasks.map(task => `
              <div style="display:flex; align-items:center; gap:8px; padding:8px; border-radius:8px; background:rgba(255,255,255,0.03);">
                <div style="font-size:1.2rem;">${task.done ? '✅' : '○'}</div>
                <div style="${task.done ? 'text-decoration:line-through; color:#6B7280;' : ''}">${task.text}</div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ''}
    `;
    
    window.openModal(html);
  };

  // Export for use
  window.renderEmbeddedCalendar = renderEmbeddedCalendar;

  // Auto-render on dashboard
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderEmbeddedCalendar);
  } else {
    renderEmbeddedCalendar();
  }

  console.log("Calendar View loaded");
})();
