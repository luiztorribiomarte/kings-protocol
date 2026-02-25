/* features/insights.js
   Smart Insights — reads real data and surfaces varied, specific observations.
   Never shows the same generic message twice in a row.
   Checks: habits, energy/mood, tasks, streaks, sleep, workout, weekly patterns.
*/

(function () {
  "use strict";

  function pad(n) { return String(n).padStart(2, "0"); }

  function localKey(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function getPastDays(n) {
    const out = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      out.push(d);
    }
    return out;
  }

  function safeParse(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
  }

  // ─── DATA READERS ──────────────────────────────────────────────────────────

  function getHabitPct(dayKey) {
    const habits = safeParse("habits", []);
    const completions = safeParse("habitCompletions", {});
    if (!habits.length) return null;
    const done = habits.filter(h => completions?.[dayKey]?.[h.id]).length;
    return Math.round((done / habits.length) * 100);
  }

  function getEnergy(dayKey) {
    const m = safeParse("moodData", {});
    return m?.[dayKey]?.energy ?? null;
  }

  function getSleep(dayKey) {
    const m = safeParse("moodData", {});
    return m?.[dayKey]?.sleep ?? null;
  }

  function getTaskPct(dayKey) {
    const planner = safeParse("weeklyPlannerData", {});
    let best = null;
    for (const wk of Object.keys(planner)) {
      const dayData = planner[wk]?.days?.[dayKey];
      if (dayData && Array.isArray(dayData.tasks) && dayData.tasks.length) {
        const done = dayData.tasks.filter(x => x?.done).length;
        const pct = Math.round((done / dayData.tasks.length) * 100);
        if (best === null || pct > best) best = pct;
      }
    }
    return best;
  }

  function workoutDone(dayKey) {
    const list = safeParse("kp_workouts_v2", []);
    if (!Array.isArray(list)) return false;
    for (const w of list) {
      if (w.status !== "completed") continue;
      for (const ex of w.exercises || []) {
        for (const s of ex.sets || []) {
          if (String(s?.date || "").split("T")[0] === dayKey) return true;
        }
      }
    }
    return false;
  }

  // ─── INSIGHT GENERATORS ────────────────────────────────────────────────────
  // Each returns { icon, title, body, type } or null if condition not met.

  function insightHabitStreak(days) {
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      const pct = getHabitPct(localKey(days[i]));
      if (pct !== null && pct >= 80) streak++;
      else break;
    }
    if (streak >= 3) return {
      icon: "🔥", type: "positive",
      title: `${streak}-Day Habit Streak`,
      body: `You've hit 80%+ habits for ${streak} days in a row. Keep the chain alive.`
    };
    if (streak === 0) {
      // Check if had a streak recently that broke
      const yesterday = getHabitPct(localKey(days[days.length - 2]));
      if (yesterday !== null && yesterday >= 80) return {
        icon: "⚡", type: "warning",
        title: "Streak Reset Today",
        body: `You had momentum going — today's habits slipped. Still time to check a few off.`
      };
    }
    return null;
  }

  function insightEnergyVsHabits(days) {
    const pairs = days.map(d => {
      const k = localKey(d);
      return { e: getEnergy(k), h: getHabitPct(k) };
    }).filter(p => p.e !== null && p.h !== null);

    if (pairs.length < 4) return null;

    const hiEnergy = pairs.filter(p => p.e >= 7);
    const loEnergy = pairs.filter(p => p.e <= 4);

    if (hiEnergy.length >= 2 && loEnergy.length >= 1) {
      const hiAvg = Math.round(hiEnergy.reduce((s, p) => s + p.h, 0) / hiEnergy.length);
      const loAvg = Math.round(loEnergy.reduce((s, p) => s + p.h, 0) / loEnergy.length);
      const diff = hiAvg - loAvg;
      if (diff >= 20) return {
        icon: "📊", type: "insight",
        title: "Energy Drives Your Output",
        body: `On high-energy days you complete ${hiAvg}% of habits vs ${loAvg}% on low-energy days. Protecting your energy is protecting your protocol.`
      };
    }
    return null;
  }

  function insightLowHabitsThisWeek(days) {
    const weekDays = days.slice(-7);
    const scores = weekDays.map(d => getHabitPct(localKey(d))).filter(v => v !== null);
    if (scores.length < 4) return null;
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    if (avg < 40) return {
      icon: "⚠️", type: "warning",
      title: "Recovery Needed",
      body: `Your habit average this week is ${avg}%. Identify the one habit to anchor your day and build from there.`
    };
    if (avg >= 75) return {
      icon: "👑", type: "positive",
      title: "Strong Week",
      body: `${avg}% average habit completion this week. You're operating at a high level.`
    };
    return null;
  }

  function insightSleepImpact(days) {
    const pairs = days.map(d => {
      const k = localKey(d);
      const sleep = getSleep(k);
      const energy = getEnergy(k);
      return { sleep, energy };
    }).filter(p => p.sleep !== null && p.energy !== null);

    if (pairs.length < 3) return null;

    const goodSleep = pairs.filter(p => p.sleep >= 7);
    const badSleep = pairs.filter(p => p.sleep < 6);

    if (goodSleep.length >= 2 && badSleep.length >= 1) {
      const goodAvgE = (goodSleep.reduce((s, p) => s + p.energy, 0) / goodSleep.length).toFixed(1);
      const badAvgE = (badSleep.reduce((s, p) => s + p.energy, 0) / badSleep.length).toFixed(1);
      if (Number(goodAvgE) - Number(badAvgE) >= 1.5) return {
        icon: "🛌", type: "insight",
        title: "Sleep = Energy",
        body: `On nights you sleep 7h+, your energy averages ${goodAvgE}/10. Under 6h it drops to ${badAvgE}/10. Sleep is your top lever.`
      };
    }

    const recentSleep = getSleep(localKey(days[days.length - 1]));
    if (recentSleep !== null && recentSleep < 6) return {
      icon: "😴", type: "warning",
      title: "Low Sleep Last Night",
      body: `You logged ${recentSleep}h of sleep. Prioritize an earlier bedtime tonight — recovery is part of the protocol.`
    };

    return null;
  }

  function insightWorkoutConsistency(days) {
    const last7 = days.slice(-7).map(d => workoutDone(localKey(d)));
    const count = last7.filter(Boolean).length;
    if (count === 0) return null;
    if (count >= 5) return {
      icon: "💪", type: "positive",
      title: `${count}/7 Workouts This Week`,
      body: `Elite consistency. Most people don't even get to 3. Keep pushing.`
    };
    if (count >= 3) return {
      icon: "💪", type: "insight",
      title: `${count}/7 Workouts This Week`,
      body: `Solid base. Can you squeeze in one more session before the week ends?`
    };
    return null;
  }

  function insightTaskCompletion(days) {
    const today = localKey(days[days.length - 1]);
    const pct = getTaskPct(today);
    if (pct === null) return null;
    if (pct === 100) return {
      icon: "✅", type: "positive",
      title: "All Tasks Done Today",
      body: `100% task completion. That's a clean day. Plan tomorrow's tasks now while you're in the zone.`
    };
    if (pct >= 75) return {
      icon: "🎯", type: "positive",
      title: `${pct}% Tasks Complete`,
      body: `Almost there. Finish the last few to close the day strong.`
    };
    if (pct > 0 && pct < 40) return {
      icon: "🎯", type: "warning",
      title: `${pct}% Tasks Complete`,
      body: `Most of today's tasks are still open. Pick the highest-impact one and focus there first.`
    };
    return null;
  }

  function insightEnergyTrend(days) {
    const last7 = days.slice(-7).map(d => getEnergy(localKey(d))).filter(v => v !== null);
    if (last7.length < 4) return null;
    const first = last7.slice(0, Math.floor(last7.length / 2));
    const second = last7.slice(Math.floor(last7.length / 2));
    const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
    const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;
    const diff = avgSecond - avgFirst;
    if (diff >= 1.5) return {
      icon: "📈", type: "positive",
      title: "Energy Trending Up",
      body: `Your energy has been climbing over the past week — from ${avgFirst.toFixed(1)} to ${avgSecond.toFixed(1)} average. Whatever you're doing, keep doing it.`
    };
    if (diff <= -1.5) return {
      icon: "📉", type: "warning",
      title: "Energy Trending Down",
      body: `Your energy has dropped from ${avgFirst.toFixed(1)} to ${avgSecond.toFixed(1)} average this week. Check sleep, hydration, and workout recovery.`
    };
    return null;
  }

  function insightBestDay(days) {
    const scored = days.slice(-14).map(d => {
      const k = localKey(d);
      const h = getHabitPct(k) ?? 0;
      const e = getEnergy(k) ?? 0;
      return { k, d, score: h * 0.6 + e * 4 };
    }).filter(x => x.score > 0);

    if (scored.length < 5) return null;
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    const todayKey2 = localKey(days[days.length - 1]);
    if (best.k === todayKey2) return {
      icon: "🏆", type: "positive",
      title: "Best Day in 2 Weeks",
      body: `Today is shaping up to be your strongest day in the last 14 days. Finish strong.`
    };
    return null;
  }

  function insightNoDataYet() {
    return {
      icon: "📝", type: "neutral",
      title: "Start Logging to Unlock Insights",
      body: `Check off habits and log your energy level each day. After a few days, personalized patterns will appear here.`
    };
  }

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────

  function renderInsightsWidget() {
    const el = document.getElementById("insightsWidget");
    if (!el) return;

    const days = getPastDays(14);

    // Run all generators, collect non-null results
    const generators = [
      () => insightBestDay(days),
      () => insightHabitStreak(days),
      () => insightEnergyVsHabits(days),
      () => insightSleepImpact(days),
      () => insightWorkoutConsistency(days),
      () => insightTaskCompletion(days),
      () => insightEnergyTrend(days),
      () => insightLowHabitsThisWeek(days),
    ];

    const results = generators.map(g => { try { return g(); } catch { return null; } }).filter(Boolean);

    if (!results.length) {
      results.push(insightNoDataYet());
    }

    const colorMap = {
      positive: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)", icon: "#22c55e" },
      warning:  { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", icon: "#f59e0b" },
      insight:  { bg: "rgba(99,102,241,0.10)", border: "rgba(99,102,241,0.28)", icon: "#818cf8" },
      neutral:  { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.12)", icon: "#9ca3af" },
    };

    el.innerHTML = results.map(ins => {
      const c = colorMap[ins.type] || colorMap.neutral;
      return `
        <div style="
          display:flex; gap:14px; align-items:flex-start;
          padding:14px 16px;
          border-radius:14px;
          border:1px solid ${c.border};
          background:${c.bg};
          margin-bottom:10px;
        ">
          <div style="font-size:1.4rem; line-height:1; padding-top:2px;">${ins.icon}</div>
          <div>
            <div style="font-weight:900; color:white; margin-bottom:4px;">${ins.title}</div>
            <div style="color:rgba(255,255,255,0.72); font-size:0.9rem; line-height:1.45;">${ins.body}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  window.renderInsightsWidget = renderInsightsWidget;

  const App = window.App;
  if (App) {
    App.on("dashboard", renderInsightsWidget);
  }

  // Also re-render when habits or mood update
  window.addEventListener("habitsUpdated", renderInsightsWidget);
  window.addEventListener("moodUpdated", renderInsightsWidget);

})();
