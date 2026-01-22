// ============================================
// MOOD MODULE (Energy + Mood + History Graph + Habit Correlation + Insights + Pattern Highlights)
// ============================================

let moodData = {};
let moodChartInstance = null;

// ---------- Utilities ----------
function getDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDayKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m - 1), d);
}

function getPastDays(n = 7) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d);
  }
  return out;
}

function saveMoodData() {
  localStorage.setItem("moodData", JSON.stringify(moodData));
}

function getMoodScore(emoji) {
  const map = {
    "🙂": 7,
    "💪": 8,
    "😴": 4,
    "😤": 3,
    "🧘": 9
  };
  return map[emoji] ?? null;
}

function getRangeKeys(range) {
  if (range === "all") {
    const keys = Object.keys(moodData || {}).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
    keys.sort((a, b) => parseDayKey(a) - parseDayKey(b));
    return keys.length ? keys : getRangeKeys("7");
  }
  const days = range === "30" ? 30 : 7;
  return getPastDays(days).map(getDayKey);
}

// ---------- Habit correlation helper ----------
function getHabitCompletionForDay(dayKey) {
  try {
    if (typeof getDayCompletion === "function") {
      return getDayCompletion(dayKey);
    }
  } catch {}

  try {
    const hd = window.habitData;
    const hl = window.habitsList;

    let total = 0;
    if (Array.isArray(hl)) total = hl.length;

    const dayObj = (hd && typeof hd === "object") ? hd[dayKey] : null;
    if (!dayObj || typeof dayObj !== "object") {
      return { done: 0, total: total || 0, percent: 0 };
    }

    const done = Object.values(dayObj).filter(Boolean).length;
    const denom = total || Object.keys(dayObj).length || 0;
    const percent = denom ? Math.round((done / denom) * 100) : 0;

    return { done, total: denom, percent };
  } catch {
    return { done: 0, total: 0, percent: 0 };
  }
}

// ---------- Insight helper ----------
function computeMoodHabitInsights(keys, energyValues, habitStats) {
  const hi = [];
  const lo = [];

  for (let i = 0; i < keys.length; i++) {
    const e = energyValues[i];
    const hs = habitStats[i];
    if (e == null) continue;
    if (!hs || !hs.total) continue;

    if (e >= 7) hi.push(hs.percent);
    if (e <= 4) lo.push(hs.percent);
  }

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const avgHi = avg(hi);
  const avgLo = avg(lo);

  let line1 = "";
  let line2 = "";

  if (avgHi != null && hi.length >= 2) {
    line1 = `On high-energy days (7–10), you averaged ${avgHi}% habit completion.`;
  } else if (avgHi != null && hi.length === 1) {
    line1 = `You had 1 high-energy day (7–10) in this range: ${avgHi}% habit completion.`;
  }

  if (avgLo != null && lo.length >= 2) {
    line2 = `On low-energy days (1–4), you averaged ${avgLo}% completion.`;
  } else if (avgLo != null && lo.length === 1) {
    line2 = `You had 1 low-energy day (1–4) in this range: ${avgLo}% completion.`;
  }

  let compare = "";
  if (avgHi != null && avgLo != null) {
    const diff = avgHi - avgLo;
    const abs = Math.abs(diff);
    if (abs >= 5) {
      compare = diff > 0
        ? `That’s ${abs} points higher when your energy is high.`
        : `That’s ${abs} points higher when your energy is low.`;
    } else {
      compare = `Your completion stays pretty consistent across energy levels.`;
    }
  }

  if (!line1 && !line2) {
    return {
      title: "Insight",
      body: "Log a few more days of energy + habits to unlock patterns here.",
      compare: ""
    };
  }

  return {
    title: "Insight",
    body: [line1, line2].filter(Boolean).join(" "),
    compare
  };
}

function renderMoodInsight(insight) {
  const el = document.getElementById("moodInsight");
  if (!el) return;

  el.innerHTML = `
    <div style="
      margin-top:12px;
      padding:14px 14px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,0.14);
      background: linear-gradient(135deg, rgba(99,102,241,0.18), rgba(236,72,153,0.10));
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
    ">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div style="font-weight:900; color:white;">🧠 ${insight.title}</div>
        <div style="color:rgba(255,255,255,0.55); font-size:0.85rem;">auto</div>
      </div>
      <div style="margin-top:8px; color:rgba(255,255,255,0.85); line-height:1.35;">
        ${insight.body}
      </div>
      ${insight.compare ? `<div style="margin-top:8px; color:rgba(255,255,255,0.75);">${insight.compare}</div>` : ""}
    </div>
  `;
}

// ---------- Pattern highlights ----------
function getDayBadge(energy, habitPercent) {
  if (energy == null) return null;

  if (energy >= 7 && habitPercent >= 80) {
    return {
      icon: "👑",
      label: "Perfect day",
      style: "border:1px solid rgba(34,197,94,0.45); background:rgba(34,197,94,0.08);"
    };
  }

  if (energy >= 7 && habitPercent < 50) {
    return {
      icon: "⚠️",
      label: "High energy / low habits",
      style: "border:1px solid rgba(245,158,11,0.5); background:rgba(245,158,11,0.10);"
    };
  }

  if (energy <= 4) {
    return {
      icon: "🧊",
      label: "Low energy day",
      style: "border:1px solid rgba(59,130,246,0.40); background:rgba(59,130,246,0.08);"
    };
  }

  return null;
}

// ---------- Init ----------
function initMoodData() {
  const saved = localStorage.getItem("moodData");
  if (saved) {
    try {
      moodData = JSON.parse(saved) || {};
    } catch {
      moodData = {};
    }
  } else {
    moodData = {};
  }
}

// ---------- Actions ----------
function setTodayEnergy(val) {
  const v = Number(val);
  const key = getDayKey();
  if (!moodData[key]) moodData[key] = { energy: 5, mood: "🙂" };

  moodData[key].energy = Math.min(10, Math.max(1, v));
  saveMoodData();
  renderMoodTracker();
}

function setTodayMood(emoji) {
  const key = getDayKey();
  if (!moodData[key]) moodData[key] = { energy: 5, mood: "🙂" };

  moodData[key].mood = emoji;
  saveMoodData();
  renderMoodTracker();
}

// ---------- Graph Modal ----------
function openMoodGraph(range = "7") {
  const title = range === "30" ? "Last 30 Days" : range === "all" ? "All Time" : "Last 7 Days";

  const html = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px;">
      <div style="font-size:1.15rem; font-weight:900; color:white;">📈 Mood History (${title})</div>
      <div style="display:flex; gap:8px; align-items:center;">
        <div style="color:#9ca3af; font-size:0.9rem;">Range</div>
        <select id="moodRangeSelect"
          style="padding:8px 10px; border-radius:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); color:white; outline:none;"
        >
          <option value="7" ${range === "7" ? "selected" : ""}>7 days</option>
          <option value="30" ${range === "30" ? "selected" : ""}>30 days</option>
          <option value="all" ${range === "all" ? "selected" : ""}>All time</option>
        </select>
      </div>
    </div>

    <div style="color:#9ca3af; font-size:0.9rem; margin-bottom:12px;">
      Energy is plotted (1–10). Tooltip shows mood + habit completion for that day.
    </div>

    <div style="width:100%; height:320px;">
      <canvas id="moodChartCanvas" height="320"></canvas>
    </div>

    <div id="moodInsight"></div>

    <div id="moodEmojiRow" style="
      margin-top:12px;
      display:grid;
      gap:8px;
      grid-template-columns: repeat(auto-fit, minmax(44px, 1fr));
      align-items:center;
      text-align:center;
      opacity:0.95;
    "></div>
  `;

  if (typeof openModal === "function") openModal(html);
  else {
    alert("Modal system not found. Make sure app.js openModal() exists.");
    return;
  }

  const select = document.getElementById("moodRangeSelect");
  if (select) select.onchange = () => openMoodGraph(select.value);

  setTimeout(() => renderMoodChart(range), 0);
}

function renderMoodChart(range) {
  const canvas = document.getElementById("moodChartCanvas");
  if (!canvas) return;

  if (moodChartInstance) {
    try { moodChartInstance.destroy(); } catch {}
    moodChartInstance = null;
  }

  if (typeof Chart === "undefined") {
    console.error("Chart.js not found. Make sure your HTML loads it.");
    return;
  }

  const keys = getRangeKeys(range);
  const labels = keys.map(k => {
    const d = parseDayKey(k);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const energyValues = keys.map(k => moodData?.[k]?.energy ?? null);
  const moodEmojis = keys.map(k => moodData?.[k]?.mood ?? "—");
  const moodScores = keys.map(k => {
    const em = moodData?.[k]?.mood;
    const s = getMoodScore(em);
    return s ?? null;
  });

  const habitStats = keys.map(k => getHabitCompletionForDay(k));

  const insight = computeMoodHabitInsights(keys, energyValues, habitStats);
  renderMoodInsight(insight);

  const emojiRow = document.getElementById("moodEmojiRow");
  if (emojiRow) {
    emojiRow.innerHTML = keys.map((k, i) => {
      const hs = habitStats[i];
      const habitsLine = (hs && hs.total) ? `${hs.done}/${hs.total}` : "—";
      const habitPct = (hs && hs.total) ? hs.percent : 0;

      const badge = getDayBadge(energyValues[i], habitPct);

      return `
        <div style="
          padding:10px 8px;
          border-radius:14px;
          border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.05);
          ${badge ? badge.style : ""}
        " title="${badge ? badge.label : ""}">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div style="font-size:0.72rem; color:#9ca3af; font-weight:800;">${labels[i]}</div>
            ${badge ? `<div style="font-size:0.95rem;">${badge.icon}</div>` : `<div style="width:16px;"></div>`}
          </div>

          <div style="font-size:1.2rem; margin-top:6px;">${moodEmojis[i]}</div>
          <div style="font-size:0.85rem; margin-top:6px; color:#e5e7eb;">Energy: ${energyValues[i] ?? "—"}</div>
          <div style="font-size:0.8rem; margin-top:6px; color:#9ca3af;">Habits: ${habitsLine}</div>
        </div>
      `;
    }).join("");
  }

  const ctx = canvas.getContext("2d");
  moodChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Energy (1–10)",
          data: energyValues,
          tension: 0.35,
          spanGaps: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3
        },
        {
          label: "Mood Score (optional)",
          data: moodScores,
          tension: 0.35,
          spanGaps: true,
          pointRadius: 0,
          borderWidth: 2,
          hidden: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "rgba(255,255,255,0.8)" } },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              const idx = items?.[0]?.dataIndex ?? 0;
              const k = keys[idx];
              const em = moodEmojis[idx];
              const hs = habitStats[idx];

              const habitsLine =
                (hs && hs.total)
                  ? `Habits: ${hs.done}/${hs.total} (${hs.percent}%)`
                  : "Habits: —";

              return [
                `Mood: ${em}`,
                habitsLine,
                `Date: ${k}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "rgba(255,255,255,0.65)" },
          grid: { color: "rgba(255,255,255,0.08)" }
        },
        y: {
          min: 1,
          max: 10,
          ticks: { stepSize: 1, color: "rgba(255,255,255,0.65)" },
          grid: { color: "rgba(255,255,255,0.08)" }
        }
      }
    }
  });
}

// ---------- Render ----------
function renderMoodTracker() {
  const container = document.getElementById("moodTracker");
  if (!container) return;

  const key = getDayKey();
  const today = moodData[key] || { energy: 5, mood: "🙂" };
  const energy = today.energy ?? 5;
  const mood = today.mood ?? "🙂";

  const moods = ["🙂", "💪", "😴", "😤", "🧘"];

  let html = `
    <div style="display:flex; gap:16px; align-items:stretch; flex-wrap:wrap;">
      <div style="
        flex:1;
        min-width:280px;
        padding:18px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.16);
        background:linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
      ">
        <div style="font-weight:800; font-size:1.05rem; margin-bottom:10px;">Today</div>

        <div style="color:#9ca3af; margin-bottom:6px;">
          ⚡ Energy Level: <span style="color:#fff; font-weight:800;">${energy}/10</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value="${energy}"
          oninput="setTodayEnergy(this.value)"
          style="width:100%; margin:8px 0 14px;"
        />

        <div style="color:#9ca3af; margin-bottom:8px;">😊 Mood</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          ${moods.map((em) => {
            const active = em === mood;
            return `
              <button
                onclick="setTodayMood('${em}')"
                style="
                  padding:10px 12px;
                  border-radius:12px;
                  border:1px solid ${active ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.16)"};
                  background:${active ? "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(236,72,153,0.9))" : "rgba(255,255,255,0.06)"};
                  color:white;
                  cursor:pointer;
                  font-size:1.05rem;
                  line-height:1;
                  box-shadow:${active ? "0 10px 30px rgba(0,0,0,0.35)" : "none"};
                "
                aria-label="Mood ${em}"
              >${em}</button>
            `;
          }).join("")}
        </div>
      </div>

      <div
        onclick="openMoodGraph('7')"
        style="
          flex:1;
          min-width:340px;
          padding:18px;
          border-radius:16px;
          border:1px solid rgba(255,255,255,0.16);
          background:linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
          cursor:pointer;
        "
        title="Click to view chart"
      >
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
          <div style="font-weight:800; font-size:1.05rem;">Past 7 Days</div>
          <div style="color:#9ca3af; font-size:0.85rem;">Click to view chart</div>
        </div>

        <div style="
          display:grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap:10px;
          align-items:start;
        ">
          ${getPastDays(7).map((d) => {
            const k = getDayKey(d);
            const entry = moodData[k] || null;
            const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
            const isToday = k === key;

            const hs = getHabitCompletionForDay(k);
            const badge = getDayBadge(entry?.energy ?? null, hs?.total ? hs.percent : 0);

            return `
              <div style="
                text-align:center;
                padding:10px 8px;
                border-radius:14px;
                border:1px solid rgba(255,255,255,0.12);
                background:${isToday ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)"};
                ${badge ? badge.style : ""}
              " title="${badge ? badge.label : ""}">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <div style="font-size:0.78rem; color:#9ca3af; font-weight:800;">${dayLabel}</div>
                  ${badge ? `<div style="font-size:0.95rem;">${badge.icon}</div>` : `<div style="width:16px;"></div>`}
                </div>

                <div style="font-size:1.25rem; margin-top:6px;">
                  ${entry?.mood ? entry.mood : "—"}
                </div>
                <div style="margin-top:6px; font-size:0.85rem; color:#e5e7eb;">
                  ${entry?.energy ? `${entry.energy}` : "—"}
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <div style="margin-top:10px; color:#6b7280; font-size:0.82rem;">
          Badges: 👑 perfect day • ⚠️ high energy/low habits • 🧊 low energy
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// ---------- Boot (fixes “empty mood section”) ----------
(function bootMoodModule() {
  function safeRender() {
    try {
      // always reload latest stored data before rendering
      initMoodData();
      renderMoodTracker();
    } catch (e) {
      console.error("Mood render failed:", e);
    }
  }

  // render on initial load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeRender);
  } else {
    safeRender();
  }

  // re-render when returning to dashboard via showPage(...)
  try {
    if (typeof window.showPage === "function" && !window.showPage.__moodWrapped) {
      const originalShowPage = window.showPage;

      const wrapped = function(pageId) {
        const res = originalShowPage.apply(this, arguments);

        // your nav uses showPage('dashboard')
        if (pageId === "dashboard" || pageId === "dashboardPage") {
          setTimeout(safeRender, 0);
        }
        return res;
      };

      wrapped.__moodWrapped = true;
      window.showPage = wrapped;
    }
  } catch (e) {
    console.error("Mood showPage wrap failed:", e);
  }

  // if another tab updates moodData
  window.addEventListener("storage", (e) => {
    if (e.key === "moodData") safeRender();
  });
})();
