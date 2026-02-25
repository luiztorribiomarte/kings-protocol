/* features/mood.js — UPGRADED
   Additions:
   - Gradient energy slider (red → yellow → green) with live color
   - Sleep hours input (saved per day, feeds performance engine)
   - "Why" note field (one-line daily driver log)
   - Inline sparkline bars replacing static 7-day emoji grid
   - Weekly avg energy shown directly on the card
   - High-energy streak (consecutive days 7+)
   - All existing performance engine hooks preserved
*/

(function () {
  "use strict";

  const App = window.App;

  let moodData = {};
  let moodChartInstance = null;

  function getDayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseDayKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
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
    // Notify performance engine
    window.dispatchEvent(new Event("moodUpdated"));
  }

  function getMoodScore(emoji) {
    const map = { "🙂": 7, "💪": 8, "😴": 4, "😤": 3, "🧘": 9 };
    return map[emoji] ?? null;
  }

  function getRangeKeys(range) {
    if (range === "all") {
      const keys = Object.keys(moodData || {}).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k));
      keys.sort((a, b) => parseDayKey(a) - parseDayKey(b));
      return keys.length ? keys : getRangeKeys("7");
    }
    const days = range === "30" ? 30 : 7;
    return getPastDays(days).map(getDayKey);
  }

  function getHabitCompletionForDay(dayKey) {
    try {
      if (typeof window.getDayCompletion === "function") return window.getDayCompletion(dayKey);
    } catch {}
    return { done: 0, total: 0, percent: 0 };
  }

  // ─── NEW: energy color based on value 1–10 ───────────────────────────────
  function energyColor(val) {
    const v = Number(val);
    if (v <= 3) return "#ef4444";
    if (v <= 5) return "#f97316";
    if (v <= 7) return "#eab308";
    return "#22c55e";
  }

  // ─── NEW: high-energy streak (consecutive days ending today with energy ≥ 7) ─
  function getHighEnergyStreak() {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = getDayKey(d);
      const e = moodData[k]?.energy ?? null;
      if (e !== null && e >= 7) streak++;
      else break;
    }
    return streak;
  }

  // ─── NEW: weekly avg energy ──────────────────────────────────────────────
  function getWeeklyAvgEnergy() {
    const keys = getPastDays(7).map(getDayKey);
    const vals = keys.map(k => moodData[k]?.energy ?? null).filter(v => v !== null);
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }

  // ─── KEY NORMALIZATION / MIGRATION (unchanged) ───────────────────────────
  function isYYYYMMDD(k) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(k));
  }

  function toLocalDayKeyFromAny(rawKey) {
    const k = String(rawKey).trim();
    if (!k) return null;
    if (isYYYYMMDD(k)) return k;
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(k)) {
      const [y, m, d] = k.split("/").map(Number);
      const dt = new Date(y, m - 1, d);
      if (!isNaN(dt.getTime())) return getDayKey(dt);
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(k)) {
      const [mm, dd, yy] = k.split("/").map(Number);
      const dt = new Date(yy, mm - 1, dd);
      if (!isNaN(dt.getTime())) return getDayKey(dt);
    }
    if (/^\d{10,13}$/.test(k)) {
      const dt = new Date(Number(k));
      if (!isNaN(dt.getTime())) return getDayKey(dt);
    }
    const parsed = Date.parse(k);
    if (!isNaN(parsed)) return getDayKey(new Date(parsed));
    return null;
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const out = {};
    if ("energy" in entry) {
      const e = Number(entry.energy);
      out.energy = Number.isFinite(e) ? Math.min(10, Math.max(1, e)) : null;
    }
    if ("mood" in entry) {
      out.mood = typeof entry.mood === "string" && entry.mood.trim() ? entry.mood : null;
    }
    if ("sleep" in entry) {
      const s = Number(entry.sleep);
      out.sleep = Number.isFinite(s) ? Math.min(24, Math.max(0, s)) : null;
    }
    if ("why" in entry) {
      out.why = typeof entry.why === "string" ? entry.why : null;
    }
    if (out.energy == null && out.mood == null) return null;
    if (out.energy == null) out.energy = 5;
    if (out.mood == null) out.mood = "🙂";
    return out;
  }

  function migrateMoodData(raw) {
    if (!raw || typeof raw !== "object") return {};
    const migrated = {};
    const keys = Object.keys(raw);
    for (const oldKey of keys) {
      const newKey = toLocalDayKeyFromAny(oldKey);
      if (!newKey) continue;
      const cleaned = normalizeEntry(raw[oldKey]);
      if (!cleaned) continue;
      if (!migrated[newKey]) {
        migrated[newKey] = cleaned;
      } else {
        const a = migrated[newKey];
        const b = cleaned;
        migrated[newKey] = {
          energy: (typeof a.energy === "number" ? a.energy : b.energy),
          mood: (a.mood ? a.mood : b.mood),
          sleep: a.sleep ?? b.sleep ?? null,
          why: a.why ?? b.why ?? null,
        };
        if (isYYYYMMDD(oldKey) && typeof b.energy === "number") migrated[newKey].energy = b.energy;
        if (isYYYYMMDD(oldKey) && b.mood) migrated[newKey].mood = b.mood;
      }
    }
    for (const k of keys) {
      if (!isYYYYMMDD(k)) continue;
      const cleaned = normalizeEntry(raw[k]);
      if (!cleaned) continue;
      migrated[k] = cleaned;
    }
    return migrated;
  }

  function initMoodData() {
    const saved = localStorage.getItem("moodData");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        moodData = migrateMoodData(parsed || {});
        saveMoodData();
      } catch {
        moodData = {};
      }
    } else {
      moodData = {};
    }
  }

  // ─── SETTERS ─────────────────────────────────────────────────────────────

  function setTodayEnergy(val) {
    const v = Number(val);
    const key = getDayKey();
    if (!moodData[key]) moodData[key] = { energy: 5, mood: "🙂" };
    moodData[key].energy = Math.min(10, Math.max(1, v));
    saveMoodData();
    // Update slider track color live without full re-render
    const slider = document.getElementById("energySlider");
    const label = document.getElementById("energyLabel");
    const color = energyColor(v);
    if (slider) {
      const pct = ((v - 1) / 9) * 100;
      slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(255,255,255,0.15) ${pct}%, rgba(255,255,255,0.15) 100%)`;
    }
    if (label) {
      label.textContent = `${v}/10`;
      label.style.color = color;
    }
    // Update sparkline live
    renderSparkline();
    if (typeof window.renderLifeScore === "function") window.renderLifeScore();
  }

  function setTodayMood(emoji) {
    const key = getDayKey();
    if (!moodData[key]) moodData[key] = { energy: 5, mood: "🙂" };
    moodData[key].mood = emoji;
    saveMoodData();
    renderMoodTracker();
  }

  // ─── NEW: sleep setter ────────────────────────────────────────────────────
  window.setTodaySleep = function(val) {
    const v = parseFloat(val);
    const key = getDayKey();
    if (!moodData[key]) moodData[key] = { energy: 5, mood: "🙂" };
    moodData[key].sleep = isNaN(v) ? null : Math.min(24, Math.max(0, v));
    saveMoodData();
    if (typeof window.renderLifeScore === "function") window.renderLifeScore();
  };

  // ─── NEW: why setter ──────────────────────────────────────────────────────
  window.setTodayWhy = function(val) {
    const key = getDayKey();
    if (!moodData[key]) moodData[key] = { energy: 5, mood: "🙂" };
    moodData[key].why = String(val || "").trim();
    saveMoodData();
  };

  // ─── NEW: sparkline renderer (inline 7-day energy bars) ──────────────────
  function renderSparkline() {
    const el = document.getElementById("moodSparkline");
    if (!el) return;

    const days = getPastDays(7);
    const key = getDayKey();
    const maxE = 10;

    el.innerHTML = days.map((d) => {
      const k = getDayKey(d);
      const entry = moodData[k] || null;
      const e = entry?.energy ?? null;
      const mood = entry?.mood ?? null;
      const isToday = k === key;
      const pct = e !== null ? Math.round((e / maxE) * 100) : 0;
      const color = e !== null ? energyColor(e) : "rgba(255,255,255,0.12)";
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
      const dateNum = d.getDate();

      const hs = getHabitCompletionForDay(k);
      const badge = getDayBadge(e, hs?.total ? hs.percent : 0);

      return `
        <div style="
          display:flex; flex-direction:column; align-items:center; gap:4px;
          flex:1; min-width:0;
        " title="${badge ? badge.label : (e !== null ? `Energy: ${e}/10` : 'No data')}">
          <div style="
            font-size:0.72rem; font-weight:800; color:${isToday ? '#e5e7eb' : '#6b7280'};
            white-space:nowrap;
          ">${dayLabel}<br><span style="color:${isToday ? '#a78bfa' : '#4b5563'}">${dateNum}</span></div>

          <!-- Bar -->
          <div style="
            width:100%; height:56px;
            background:rgba(255,255,255,0.06);
            border-radius:6px; overflow:hidden;
            display:flex; align-items:flex-end;
            border:1px solid ${isToday ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.08)'};
          ">
            <div style="
              width:100%;
              height:${pct}%;
              background:${e !== null
                ? `linear-gradient(to top, ${color}, ${color}99)`
                : 'transparent'};
              transition:height 0.3s ease;
              border-radius:4px 4px 0 0;
            "></div>
          </div>

          <!-- Emoji + number -->
          <div style="font-size:1rem; line-height:1;">${mood ?? (e !== null ? '' : '·')}</div>
          <div style="font-size:0.78rem; font-weight:800; color:${e !== null ? color : '#374151'};">
            ${e !== null ? e : '—'}
          </div>
          ${badge ? `<div style="font-size:0.8rem;">${badge.icon}</div>` : ''}
        </div>
      `;
    }).join("");
  }

  function getDayBadge(energy, habitPercent) {
    if (energy == null) return null;
    if (energy >= 7 && habitPercent >= 80) return { icon: "👑", label: "Perfect day", style: "border:1px solid rgba(34,197,94,0.45); background:rgba(34,197,94,0.08);" };
    if (energy >= 7 && habitPercent < 50) return { icon: "⚠️", label: "High energy / low habits", style: "border:1px solid rgba(245,158,11,0.5); background:rgba(245,158,11,0.10);" };
    if (energy <= 4) return { icon: "🧊", label: "Low energy day", style: "border:1px solid rgba(59,130,246,0.40); background:rgba(59,130,246,0.08);" };
    return null;
  }

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────
  function renderMoodTracker() {
    const container = document.getElementById("moodTracker");
    if (!container) return;

    const key = getDayKey();
    const today = moodData[key] || { energy: 5, mood: "🙂" };
    const energy = today.energy ?? 5;
    const mood = today.mood ?? "🙂";
    const sleep = today.sleep ?? "";
    const why = today.why ?? "";
    const moods = ["🙂", "💪", "😴", "😤", "🧘"];
    const moodLabels = { "🙂": "Good", "💪": "Pumped", "😴": "Tired", "😤": "Stressed", "🧘": "Calm" };

    const color = energyColor(energy);
    const sliderPct = ((energy - 1) / 9) * 100;
    const weekAvg = getWeeklyAvgEnergy();
    const heStreak = getHighEnergyStreak();

    container.innerHTML = `
      <div style="display:flex; gap:16px; align-items:stretch; flex-wrap:wrap;">

        <!-- LEFT: Today's input panel -->
        <div style="
          flex:1; min-width:280px; padding:20px;
          border-radius:16px;
          border:1px solid rgba(255,255,255,0.12);
          background:linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
        ">
          <div style="font-weight:900; font-size:1.05rem; margin-bottom:16px; color:#e5e7eb;">Today</div>

          <!-- Energy -->
          <div style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <div style="color:#9ca3af; font-size:0.9rem;">⚡ Energy Level</div>
              <div id="energyLabel" style="font-weight:900; font-size:1.1rem; color:${color};">${energy}/10</div>
            </div>
            <input
              id="energySlider"
              type="range" min="1" max="10" value="${energy}"
              oninput="setTodayEnergy(this.value)"
              style="
                width:100%; height:6px; border-radius:4px; outline:none;
                -webkit-appearance:none; appearance:none; cursor:pointer;
                background:linear-gradient(to right, ${color} 0%, ${color} ${sliderPct}%, rgba(255,255,255,0.15) ${sliderPct}%, rgba(255,255,255,0.15) 100%);
              "
            />
            <style>
              #energySlider::-webkit-slider-thumb {
                -webkit-appearance:none; appearance:none;
                width:18px; height:18px; border-radius:50%;
                background:white; cursor:pointer;
                box-shadow:0 0 0 3px ${color}66, 0 2px 8px rgba(0,0,0,0.4);
                transition: box-shadow 0.15s;
              }
              #energySlider::-webkit-slider-thumb:hover {
                box-shadow:0 0 0 5px ${color}44, 0 2px 8px rgba(0,0,0,0.4);
              }
            </style>
          </div>

          <!-- Mood buttons -->
          <div style="margin-bottom:16px;">
            <div style="color:#9ca3af; font-size:0.9rem; margin-bottom:8px;">😊 Mood</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${moods.map((em) => {
                const active = em === mood;
                return `
                  <button onclick="setTodayMood('${em}')" title="${moodLabels[em]}"
                    style="
                      display:flex; flex-direction:column; align-items:center; gap:3px;
                      padding:8px 10px; border-radius:12px; cursor:pointer;
                      border:1px solid ${active ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)'};
                      background:${active
                        ? `linear-gradient(135deg, rgba(99,102,241,0.85), rgba(236,72,153,0.85))`
                        : 'rgba(255,255,255,0.05)'};
                      color:white;
                      box-shadow:${active ? '0 6px 20px rgba(0,0,0,0.3)' : 'none'};
                      transition:all 0.15s;
                    "
                  >
                    <span style="font-size:1.2rem; line-height:1;">${em}</span>
                    <span style="font-size:0.65rem; color:${active ? 'rgba(255,255,255,0.9)' : '#6b7280'}; font-weight:700; letter-spacing:0.02em;">${moodLabels[em]}</span>
                  </button>
                `;
              }).join("")}
            </div>
          </div>

          <!-- Sleep -->
          <div style="margin-bottom:14px;">
            <div style="color:#9ca3af; font-size:0.9rem; margin-bottom:6px;">🛌 Sleep Hours</div>
            <input
              type="number" min="0" max="24" step="0.5"
              value="${sleep}"
              placeholder="e.g. 7.5"
              onchange="setTodaySleep(this.value)"
              style="
                width:100%; padding:10px 12px; border-radius:10px;
                border:1px solid rgba(255,255,255,0.12);
                background:rgba(255,255,255,0.05);
                color:white; outline:none; font-size:0.95rem;
              "
            />
          </div>

          <!-- Why -->
          <div>
            <div style="color:#9ca3af; font-size:0.9rem; margin-bottom:6px;">📝 What drove today?</div>
            <input
              type="text"
              value="${why.replace(/"/g, '&quot;')}"
              placeholder="e.g. great workout, bad sleep, deep focus..."
              onchange="setTodayWhy(this.value)"
              style="
                width:100%; padding:10px 12px; border-radius:10px;
                border:1px solid rgba(255,255,255,0.12);
                background:rgba(255,255,255,0.05);
                color:white; outline:none; font-size:0.9rem;
              "
            />
          </div>
        </div>

        <!-- RIGHT: 7-day sparkline panel -->
        <div style="
          flex:1.2; min-width:320px; padding:20px;
          border-radius:16px;
          border:1px solid rgba(255,255,255,0.12);
          background:linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
          cursor:pointer;
        " onclick="openMoodGraph('7')" title="Click to view full chart">

          <!-- Header row -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
            <div style="font-weight:900; font-size:1.05rem; color:#e5e7eb;">Past 7 Days</div>
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
              ${weekAvg !== null ? `
                <div style="
                  padding:4px 10px; border-radius:20px;
                  background:rgba(255,255,255,0.06);
                  border:1px solid rgba(255,255,255,0.1);
                  font-size:0.82rem; font-weight:800;
                  color:${energyColor(parseFloat(weekAvg))};
                ">avg ${weekAvg}</div>
              ` : ''}
              ${heStreak > 0 ? `
                <div style="
                  padding:4px 10px; border-radius:20px;
                  background:rgba(34,197,94,0.1);
                  border:1px solid rgba(34,197,94,0.3);
                  font-size:0.82rem; font-weight:800; color:#22c55e;
                ">🔥 ${heStreak}d streak</div>
              ` : ''}
              <div style="color:#6b7280; font-size:0.8rem;">tap for chart</div>
            </div>
          </div>

          <!-- Sparkline bars -->
          <div id="moodSparkline" style="display:flex; gap:6px; align-items:flex-end; height:130px;"></div>

          <!-- Legend -->
          <div style="margin-top:12px; color:#4b5563; font-size:0.78rem;">
            👑 perfect day &nbsp;•&nbsp; ⚠️ high energy / low habits &nbsp;•&nbsp; 🧊 low energy
          </div>
        </div>

      </div>
    `;

    renderSparkline();
  }

  // ─── MOOD GRAPH MODAL (unchanged) ────────────────────────────────────────
  function computeMoodHabitInsights(keys, energyValues, habitStats) {
    const hi = [], lo = [];
    for (let i = 0; i < keys.length; i++) {
      const e = energyValues[i];
      const hs = habitStats[i];
      if (e == null || !hs || !hs.total) continue;
      if (e >= 7) hi.push(hs.percent);
      if (e <= 4) lo.push(hs.percent);
    }
    const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const avgHi = avg(hi), avgLo = avg(lo);
    let line1 = "", line2 = "";
    if (avgHi != null && hi.length >= 2) line1 = `On high-energy days (7–10), you averaged ${avgHi}% habit completion.`;
    else if (avgHi != null) line1 = `You had 1 high-energy day (7–10): ${avgHi}% habit completion.`;
    if (avgLo != null && lo.length >= 2) line2 = `On low-energy days (1–4), you averaged ${avgLo}% completion.`;
    else if (avgLo != null) line2 = `You had 1 low-energy day (1–4): ${avgLo}% completion.`;
    let compare = "";
    if (avgHi != null && avgLo != null) {
      const diff = avgHi - avgLo, abs = Math.abs(diff);
      compare = abs >= 5
        ? (diff > 0 ? `That's ${abs} points higher when your energy is high.` : `That's ${abs} points higher when your energy is low.`)
        : `Your completion stays pretty consistent across energy levels.`;
    }
    if (!line1 && !line2) return { title: "Insight", body: "Log a few more days of energy + habits to unlock patterns here.", compare: "" };
    return { title: "Insight", body: [line1, line2].filter(Boolean).join(" "), compare };
  }

  function renderMoodInsight(insight) {
    const el = document.getElementById("moodInsight");
    if (!el) return;
    el.innerHTML = `
      <div style="margin-top:12px; padding:14px; border-radius:14px; border:1px solid rgba(255,255,255,0.14); background:linear-gradient(135deg, rgba(99,102,241,0.18), rgba(236,72,153,0.10));">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="font-weight:900; color:white;">🧠 ${insight.title}</div>
          <div style="color:rgba(255,255,255,0.55); font-size:0.85rem;">auto</div>
        </div>
        <div style="margin-top:8px; color:rgba(255,255,255,0.85); line-height:1.35;">${insight.body}</div>
        ${insight.compare ? `<div style="margin-top:8px; color:rgba(255,255,255,0.75);">${insight.compare}</div>` : ""}
      </div>
    `;
  }

  function openMoodGraph(range = "7") {
    const title = range === "30" ? "Last 30 Days" : range === "all" ? "All Time" : "Last 7 Days";
    const html = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px;">
        <div style="font-size:1.15rem; font-weight:900; color:white;">📈 Mood History (${title})</div>
        <div style="display:flex; gap:8px; align-items:center;">
          <div style="color:#9ca3af; font-size:0.9rem;">Range</div>
          <select id="moodRangeSelect" style="padding:8px 10px; border-radius:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); color:white; outline:none;">
            <option value="7" ${range === "7" ? "selected" : ""}>7 days</option>
            <option value="30" ${range === "30" ? "selected" : ""}>30 days</option>
            <option value="all" ${range === "all" ? "selected" : ""}>All time</option>
          </select>
        </div>
      </div>
      <div style="color:#9ca3af; font-size:0.9rem; margin-bottom:12px;">Energy is plotted (1–10). Tooltip shows mood + habit completion.</div>
      <div style="width:100%; height:320px;"><canvas id="moodChartCanvas" height="320"></canvas></div>
      <div id="moodInsight"></div>
      <div id="moodEmojiRow" style="margin-top:12px; display:grid; gap:8px; grid-template-columns:repeat(auto-fit, minmax(44px, 1fr));"></div>
    `;
    if (typeof window.openModal === "function") window.openModal(html);
    else return alert("Modal system not found.");
    const select = document.getElementById("moodRangeSelect");
    if (select) select.onchange = () => openMoodGraph(select.value);
    setTimeout(() => renderMoodChart(range), 0);
  }

  function renderMoodChart(range) {
    const canvas = document.getElementById("moodChartCanvas");
    if (!canvas) return;
    if (moodChartInstance) { try { moodChartInstance.destroy(); } catch {} moodChartInstance = null; }
    if (typeof Chart === "undefined") return;

    const keys = getRangeKeys(range);
    const labels = keys.map((k) => parseDayKey(k).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    const energyValues = keys.map((k) => moodData?.[k]?.energy ?? null);
    const moodEmojis = keys.map((k) => moodData?.[k]?.mood ?? "—");
    const moodScores = keys.map((k) => getMoodScore(moodData?.[k]?.mood) ?? null);
    const sleepValues = keys.map((k) => moodData?.[k]?.sleep ?? null);
    const habitStats = keys.map((k) => getHabitCompletionForDay(k));

    renderMoodInsight(computeMoodHabitInsights(keys, energyValues, habitStats));

    const emojiRow = document.getElementById("moodEmojiRow");
    if (emojiRow) {
      emojiRow.innerHTML = keys.map((k, i) => {
        const hs = habitStats[i];
        const habitsLine = hs && hs.total ? `${hs.done}/${hs.total}` : "—";
        const habitPct = hs && hs.total ? hs.percent : 0;
        const badge = getDayBadge(energyValues[i], habitPct);
        const why = moodData?.[k]?.why || null;
        return `
          <div style="padding:10px 8px; border-radius:14px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); ${badge ? badge.style : ""}" title="${badge ? badge.label : ""}">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <div style="font-size:0.72rem; color:#9ca3af; font-weight:800;">${labels[i]}</div>
              ${badge ? `<div style="font-size:0.95rem;">${badge.icon}</div>` : `<div style="width:16px;"></div>`}
            </div>
            <div style="font-size:1.2rem; margin-top:6px;">${moodEmojis[i]}</div>
            <div style="font-size:0.85rem; margin-top:4px; color:${energyColor(energyValues[i] ?? 5)}; font-weight:800;">⚡${energyValues[i] ?? "—"}</div>
            ${sleepValues[i] !== null ? `<div style="font-size:0.78rem; margin-top:2px; color:#9ca3af;">🛌${sleepValues[i]}h</div>` : ""}
            <div style="font-size:0.78rem; margin-top:2px; color:#6b7280;">Habits: ${habitsLine}</div>
            ${why ? `<div style="font-size:0.72rem; margin-top:4px; color:#a78bfa; font-style:italic; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80px;" title="${why}">${why}</div>` : ""}
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
          { label: "Energy (1–10)", data: energyValues, tension: 0.35, spanGaps: true, pointRadius: 4, pointHoverRadius: 6, borderWidth: 3 },
          { label: "Sleep (hrs)", data: sleepValues, tension: 0.35, spanGaps: true, pointRadius: 3, borderWidth: 2, hidden: false, yAxisID: "y2" },
          { label: "Mood Score", data: moodScores, tension: 0.35, spanGaps: true, pointRadius: 0, borderWidth: 2, hidden: true }
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
                const habitsLine = hs && hs.total ? `Habits: ${hs.done}/${hs.total} (${hs.percent}%)` : "Habits: —";
                const sl = sleepValues[idx];
                const why = moodData?.[k]?.why || null;
                return [
                  `Mood: ${em}`,
                  habitsLine,
                  sl !== null ? `Sleep: ${sl}h` : "Sleep: —",
                  ...(why ? [`Note: ${why}`] : []),
                  `Date: ${k}`
                ];
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: "rgba(255,255,255,0.65)" }, grid: { color: "rgba(255,255,255,0.08)" } },
          y: { min: 1, max: 10, ticks: { stepSize: 1, color: "rgba(255,255,255,0.65)" }, grid: { color: "rgba(255,255,255,0.08)" } },
          y2: { position: "right", min: 0, max: 12, ticks: { color: "rgba(255,255,255,0.4)", stepSize: 2 }, grid: { display: false } }
        }
      }
    });
  }

  // ─── EXPORTS ─────────────────────────────────────────────────────────────
  window.initMoodData = initMoodData;
  window.renderMoodTracker = renderMoodTracker;
  window.setTodayEnergy = setTodayEnergy;
  window.setTodayMood = setTodayMood;
  window.openMoodGraph = openMoodGraph;
  // moodData exposed for performance engine
  Object.defineProperty(window, "moodData", {
    get: () => moodData,
    configurable: true
  });

  initMoodData();

  if (App) {
    App.features.mood = { init: initMoodData, render: renderMoodTracker };
    App.on("dashboard", () => {
      initMoodData();
      renderMoodTracker();
    });
  }

  console.log("Mood module v2 loaded");
})();
