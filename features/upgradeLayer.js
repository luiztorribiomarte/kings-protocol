/* ==========================================
   UPGRADE LAYER (SAFE EXTENSION SYSTEM)
   This file NEVER replaces core logic.
   It only EXTENDS features safely.
========================================== */

window.UpgradeLayer = {
  log(msg) {
    if (window.DEBUG_MODE) console.log("UPGRADE:", msg);
  },

  safe(fn, name = "anonymous") {
    try {
      fn();
      this.log(name + " loaded");
    } catch (e) {
      console.warn("Upgrade failed:", name, e);
    }
  }
};

/* ==========================================
   LIFE SCORE EXTENSIONS (SAFE)
========================================== */

UpgradeLayer.safe(function () {
  const originalRenderLifeScore = window.renderLifeScore;

  if (!originalRenderLifeScore) return;

  window.renderLifeScore = function () {
    // run original life score first
    originalRenderLifeScore();

    // then extend it safely
    const card = document.getElementById("lifeScoreCard");
    if (!card) return;

    let weeklyBox = document.getElementById("weeklyPerformanceBox");
    if (!weeklyBox) {
      weeklyBox = document.createElement("div");
      weeklyBox.id = "weeklyPerformanceBox";
      weeklyBox.style.marginTop = "14px";
      weeklyBox.style.padding = "12px";
      weeklyBox.style.border = "1px solid rgba(255,255,255,0.1)";
      weeklyBox.style.borderRadius = "12px";
      weeklyBox.style.background = "rgba(255,255,255,0.03)";
      card.appendChild(weeklyBox);
    }

    if (typeof getDayCompletionPercent !== "function") return;

    const weekDates = getWeekDates(new Date());
    const percents = weekDates.map(d =>
      Math.round(getDayCompletionPercent(getDateString(d)) * 100)
    );

    const avg = Math.round(
      percents.reduce((a, b) => a + b, 0) / percents.length
    );

    weeklyBox.innerHTML = `
      <div style="font-weight:700; margin-bottom:6px;">📊 Weekly Performance</div>
      <div style="font-size:0.9rem; opacity:0.85;">
        ${percents.join("% • ")}% <br>
        <strong>Average:</strong> ${avg}%
      </div>
    `;
  };
}, "LifeScoreExtension");

/* ==========================================
   FUTURE UPGRADES GO BELOW THIS LINE
   (we will add features here only)
========================================== */
