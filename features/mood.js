// ============================================
// MOOD MODULE (Energy + Mood + Past 7 Days)
// ============================================

// Stored shape:
// moodData = {
//   "YYYY-MM-DD": { energy: 5, mood: "😊" }
// }

let moodData = {};

// ---------- Utilities ----------
function getDayKey(date = new Date()) {
  // Local date key (not UTC) to avoid day-shift bugs
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
    <div style="
      display:flex;
      gap:16px;
      align-items:stretch;
      flex-wrap:wrap;
    ">
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
          ${moods
            .map((em) => {
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
            })
            .join("")}
        </div>
      </div>

      <!-- RIGHT: Past 7 Days -->
      <div style="
        flex:1;
        min-width:340px;
        padding:18px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.16);
        background:linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
      ">
        <div style="font-weight:800; font-size:1.05rem; margin-bottom:10px;">Past 7 Days</div>

        <div style="
          display:grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap:10px;
          align-items:start;
        ">
          ${getPastDays(7)
            .map((d) => {
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
            })
            .join("")}
        </div>

        <div style="margin-top:10px; color:#6b7280; font-size:0.82rem;">
          Tip: Today is highlighted. Past days are read-only.
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}
