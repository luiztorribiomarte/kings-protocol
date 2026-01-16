// ============================================
// MOOD MODULE (Energy + Mood + Past 7 Days + Graph Modal)
// ============================================

// Stored shape:
// moodData = {
//   "YYYY-MM-DD": { energy: 5, mood: "😊" }
// }

let moodData = {};
let moodChartInstance = null;

// ---------- Utilities ----------
function getDayKey(date = new Date()) {
  // Local date key (not UTC) to avoid day-shift bugs
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDayKey(key) {
  // key: YYYY-MM-DD
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
  // For graph + “smarter” scoring (you can tweak these anytime)
  // Higher = better mood
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
  // Returns array of day keys to chart, ordered oldest -> newest
  if (range === "all") {
    const keys = Object.keys(moodData || {}).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
    keys.sort((a, b) => parseDayKey(a) - parseDayKey(b));
    return keys;
  }

  const days = range === "30" ? 30 : 7;
  return getPastDays(days).map(getDayKey);
}

// ---------- Init ----------
function initMoodData() {
  const saved = localStorage.getItem("moodData");
  if (saved) {
    try {
      moodData = JSON.parse(saved) || {};
    } catch (e) {
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
  // Build modal HTML
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
      Energy is plotted (1–10). Mood emoji shows in the tooltip and below each day.
    </div>

    <div style="width:100%; height:320px;">
      <canvas id="moodChartCanvas" height="320"></canvas>
    </div>

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

  // Use your app.js modal system if available
  if (typeof openModal === "function") openModal(html);
  else {
    // fallback: simple alert
    alert("Modal system not found. Make sure app.js openModal() exists.");
    return;
  }

  // Hook range change
  const select = document.getElementById("moodRangeSelect");
  if (select) {
    select.onchange = () => openMoodGraph(select.value);
  }

  // Render chart after modal exists
  setTimeout(() => renderMoodChart(range), 0);
}

function renderMoodChart(range) {
  const canvas = document.getElementById("moodChartCanvas");
  if (!canvas) return;

  // Destroy previous chart if any
  if (moodChartInstance) {
    try { moodChartInstance.destroy(); } catch (e) {}
    moodChartInstance = null;
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

  // Emoji row under chart
  const emojiRow = document.getElementById("moodEmojiRow");
  if (emojiRow) {
    emojiRow.innerHTML = keys.map((k, i) => `
      <div style="
        padding:10px 8px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.12);
        background:rgba(255,255,255,0.05);
      ">
        <div style="font-size:0.72rem; color:#9ca3af; font-weight:800;">${labels[i]}</div>
        <div style="font-size:1.2rem; margin-top:6px;">${moodEmojis[i]}</div>
        <div style="font-size:0.85rem; margin-top:6px; color:#e5e7eb;">${energyValues[i] ?? "—"}</div>
      </div>
    `).join("");
  }

  // Chart.js required
  if (typeof Chart === "undefined") {
    console.error("Chart.js not found. Make sure your HTML loads it.");
    return;
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
          // Optional 2nd line: mood score (hidden by default but available)
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
        legend: {
          labels: { color: "rgba(255,255,255,0.8)" }
        },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              // Show emoji + day key in tooltip
              const idx = items?.[0]?.dataIndex ?? 0;
              const k = keys[idx];
              const em = moodEmojis[idx];
              return [`Mood: ${em}`, `Date: ${k}`];
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

  // Parent: two boxes side-by-side
  let html = `
    <div style="display:flex; gap:16px; align-items:stretch; flex-wrap:wrap;">
      <!-- LEFT: Today -->
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

        <div style="color:#9ca3af; margin-bottom:6px;">⚡ Energy Level: <span style="color:#fff; font-weight:800;">${energy}/10</span></div>
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

      <!-- RIGHT: Past 7 Days (CLICKABLE) -->
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

            return `
              <div style="
                text-align:center;
                padding:10px 8px;
                border-radius:14px;
                border:1px solid rgba(255,255,255,0.12);
                background:${isToday ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)"};
              ">
                <div style="font-size:0.78rem; color:#9ca3af; font-weight:800;">${dayLabel}</div>
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
          Tip: Click this box to open charts. Today is highlighted.
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}
