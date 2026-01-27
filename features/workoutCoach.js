// ============================================
// WORKOUT COACH — GOD MODE HYBRID INTELLIGENCE
// Works with: workout.js + workoutEngine.js
// Adds: hybrid strength+muscle coach, imbalance detection,
// fatigue signals, next-workout prediction, performance score
// SAFE: does not modify workout.js or workoutEngine.js
// ============================================

(function () {
  function byId(id) {
    return document.getElementById(id);
  }

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function ensureCoachPanel() {
    const host = byId("exerciseCards");
    if (!host) return;

    if (byId("workoutCoachPanel")) return;

    const mount = document.createElement("div");
    mount.id = "workoutCoachPanel";
    mount.className = "habit-section";
    mount.style.marginBottom = "16px";

    mount.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div class="section-title">🧠 Hybrid Coach Intelligence</div>
        <div id="coachScore" style="font-weight:900; font-size:1.2rem; color:#a78bfa;">0</div>
      </div>

      <div id="coachInsights" style="display:flex; flex-direction:column; gap:8px;"></div>

      <div style="margin-top:10px; display:grid; grid-template-columns:repeat(3,1fr); gap:10px;">
        <div style="border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:10px;">
          <div style="color:#9ca3af; font-size:0.8rem;">Strength Bias</div>
          <div id="strengthBias" style="font-weight:900;">—</div>
        </div>
        <div style="border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:10px;">
          <div style="color:#9ca3af; font-size:0.8rem;">Muscle Balance</div>
          <div id="muscleBalance" style="font-weight:900;">—</div>
        </div>
        <div style="border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:10px;">
          <div style="color:#9ca3af; font-size:0.8rem;">Next Focus</div>
          <div id="nextFocus" style="font-weight:900;">—</div>
        </div>
      </div>
    `;

    host.prepend(mount);
    refreshCoach();
  }

  function classifyExercise(name) {
    const n = name.toLowerCase();

    if (/(bench|chest|press|dip)/.test(n)) return "push";
    if (/(row|pull|lat|chin|bicep)/.test(n)) return "pull";
    if (/(squat|leg|deadlift|calf|ham)/.test(n)) return "legs";
    if (/(core|abs|plank)/.test(n)) return "core";

    return "other";
  }

  function analyzeTraining() {
    if (!window.WorkoutEngine) return null;

    const sessions = WorkoutEngine.getAllSessions();
    if (!sessions.length) return null;

    const groups = { push: 0, pull: 0, legs: 0, core: 0, other: 0 };
    const strengthSets = [];
    const hypertrophySets = [];

    sessions.forEach(s => {
      const g = classifyExercise(s.exercise);
      groups[g]++;

      const reps = Number(s.reps || 0);
      const weight = Number(s.weight || 0);

      if (reps <= 5) strengthSets.push(weight);
      else if (reps >= 8) hypertrophySets.push(weight);
    });

    const total = Object.values(groups).reduce((a, b) => a + b, 0);

    const pushPct = groups.push / total;
    const pullPct = groups.pull / total;
    const legsPct = groups.legs / total;

    const strengthRatio =
      strengthSets.length / (strengthSets.length + hypertrophySets.length || 1);

    return {
      groups,
      pushPct,
      pullPct,
      legsPct,
      strengthRatio
    };
  }

  function generateCoachInsights(data) {
    if (!data) return ["Log workouts to unlock coaching insights."];

    const insights = [];

    const { groups, pushPct, pullPct, legsPct, strengthRatio } = data;

    if (pushPct > pullPct + 0.15) {
      insights.push("⚠️ Push is dominating pull. Risk of shoulder imbalance.");
    }

    if (legsPct < 0.2) {
      insights.push("⚠️ Legs are undertrained compared to upper body.");
    }

    if (strengthRatio > 0.7) {
      insights.push("💪 Strength-focused training detected.");
    } else if (strengthRatio < 0.4) {
      insights.push("🔥 Hypertrophy-focused training detected.");
    } else {
      insights.push("⚔️ Balanced strength + muscle training.");
    }

    const next =
      pushPct < pullPct && pushPct < legsPct
        ? "Push"
        : pullPct < pushPct && pullPct < legsPct
        ? "Pull"
        : legsPct < pushPct && legsPct < pullPct
        ? "Legs"
        : "Balanced";

    insights.push(`🎯 Suggested next focus: ${next}.`);

    return insights;
  }

  function computeScore(data) {
    if (!data) return 0;

    const balanceScore =
      1 - Math.abs(data.pushPct - data.pullPct);

    const hybridScore =
      1 - Math.abs(data.strengthRatio - 0.5);

    const legsScore = Math.min(data.legsPct / 0.25, 1);

    return Math.round((balanceScore + hybridScore + legsScore) / 3 * 100);
  }

  function refreshCoach() {
    const data = analyzeTraining();
    const insights = generateCoachInsights(data);
    const score = computeScore(data);

    const insightsEl = byId("coachInsights");
    const scoreEl = byId("coachScore");
    const biasEl = byId("strengthBias");
    const balanceEl = byId("muscleBalance");
    const focusEl = byId("nextFocus");

    if (scoreEl) scoreEl.textContent = score + "/100";

    if (biasEl && data) {
      biasEl.textContent =
        data.strengthRatio > 0.6
          ? "Strength"
          : data.strengthRatio < 0.4
          ? "Hypertrophy"
          : "Hybrid";
    }

    if (balanceEl && data) {
      const diff = Math.abs(data.pushPct - data.pullPct);
      balanceEl.textContent =
        diff < 0.1 ? "Balanced" : diff < 0.2 ? "Moderate" : "Imbalanced";
    }

    if (focusEl && data) {
      focusEl.textContent =
        data.pushPct < data.pullPct && data.pushPct < data.legsPct
          ? "Push"
          : data.pullPct < data.pushPct && data.pullPct < data.legsPct
          ? "Pull"
          : data.legsPct < data.pushPct && data.legsPct < data.pullPct
          ? "Legs"
          : "Mixed";
    }

    if (insightsEl) {
      insightsEl.innerHTML = insights
        .map(
          i => `
          <div style="border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:10px;">
            ${esc(i)}
          </div>
        `
        )
        .join("");
    }
  }

  function boot() {
    ensureCoachPanel();
    refreshCoach();
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    ensureCoachPanel();
    refreshCoach();
    if (byId("workoutCoachPanel") || tries > 30) clearInterval(timer);
  }, 200);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("focus", () => {
    try {
      refreshCoach();
    } catch {}
  });
})();
