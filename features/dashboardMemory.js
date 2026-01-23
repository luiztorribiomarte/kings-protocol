// =====================================================
// Dashboard Memory Panel (SAFE ADD-ON)
// - Does NOT modify app.js
// - Does NOT override core functions
// - Only reads from localStorage + existing public funcs
// - Renders a "memory" summary on the Dashboard
// =====================================================

(function () {
  "use strict";

  const PANEL_ID = "dashboardMemoryCard";

  function $(id) {
    return document.getElementById(id);
  }

  function safeJSONParse(raw, fallback) {
    try {
      const val = JSON.parse(raw);
      return val ?? fallback;
    } catch {
      return fallback;
    }
  }

  function todayKey() {
    return new Date().toISOString().split("T")[0];
  }

  function formatDateTime(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return iso || "";
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getMoodSummary() {
    const moodData = safeJSONParse(localStorage.getItem("moodData") || "{}", {});
    const key = todayKey();
    const energy = moodData?.[key]?.energy;
    const mood = moodData?.[key]?.mood;

    const energyText = Number.isFinite(energy) ? `${energy}/10` : "—";
    const moodText = mood ? String(mood) : "—";

    return { energyText, moodText };
  }

  function getHabitsSummary() {
    let percent = null;
    try {
      if (typeof window.getDayCompletion === "function") {
        const data = window.getDayCompletion(todayKey());
        const p = data?.percent;
        if (Number.isFinite(p)) percent = p;
      }
    } catch {}
    return { percent: percent === null ? "—" : `${Math.round(percent)}%` };
  }

  function getTodosSummary() {
    const todos = safeJSONParse(localStorage.getItem("todos") || "[]", []);
    const total = Array.isArray(todos) ? todos.length : 0;
    const done = Array.isArray(todos) ? todos.filter(t => t && t.done).length : 0;
    return { total, done };
  }

  function getStreakSummary() {
    let streak = 0;
    try {
      streak = parseInt(localStorage.getItem("currentStreak") || "0", 10);
      if (!Number.isFinite(streak)) streak = 0;
    } catch {
      streak = 0;
    }
    return { streak };
  }

  function getLastJournalEntry() {
    const entries = safeJSONParse(localStorage.getItem("journalEntries") || "[]", []);
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const last = entries[entries.length - 1];
    if (!last) return null;

    const date = formatDateTime(last.date);
    const prompt = last.prompt ? String(last.prompt) : "";
    const text = last.text ? String(last.text) : "";

    return { date, prompt, text };
  }

  function ensurePanel() {
    const dashboard = $("dashboardPage");
    if (!dashboard) return null;

    let panel = $(PANEL_ID);
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "habit-section";

    // Insert after Life Score if possible, otherwise near top
    const life = $("lifeScoreCard");
    if (life && life.parentNode === dashboard) {
      if (life.nextSibling) {
        dashboard.insertBefore(panel, life.nextSibling);
      } else {
        dashboard.appendChild(panel);
      }
    } else {
      dashboard.prepend(panel);
    }

    return panel;
  }

  function renderDashboardMemory() {
    const dashboard = $("dashboardPage");
    if (!dashboard) return;

    // Only render when dashboard is active
    if (!dashboard.classList.contains("active")) return;

    const panel = ensurePanel();
    if (!panel) return;

    const mood = getMoodSummary();
    const habits = getHabitsSummary();
    const todos = getTodosSummary();
    const streak = getStreakSummary();
    const lastJournal = getLastJournalEntry();

    const journalHTML = lastJournal
      ? `
        <div style="margin-top:10px; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.18);">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
            <div style="color:#E5E7EB; font-weight:900;">Last Journal Entry</div>
            <div style="color:#9CA3AF; font-weight:800; font-size:0.85rem;">${escapeHtml(lastJournal.date)}</div>
          </div>
          ${lastJournal.prompt ? `<div style="margin-top:8px; color:#9CA3AF; font-weight:800;">Prompt: <span style="color:#E5E7EB; font-weight:800;">${escapeHtml(lastJournal.prompt)}</span></div>` : ""}
          <div style="margin-top:8px; color:#E5E7EB; line-height:1.45; white-space:pre-wrap;">${escapeHtml(lastJournal.text)}</div>
        </div>
      `
      : `
        <div style="margin-top:10px; color:#9CA3AF;">
          No journal entries yet. Save one in Journal.
        </div>
      `;

    panel.innerHTML = `
      <div class="section-title">🧠 Dashboard Memory</div>

      <div style="
        margin-top:10px;
        display:grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap:10px;
      ">
        <div style="padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.18);">
          <div style="color:#9CA3AF; font-weight:900;">Energy Today</div>
          <div style="margin-top:6px; color:#E5E7EB; font-weight:900; font-size:1.05rem;">${escapeHtml(mood.energyText)}</div>
        </div>

        <div style="padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.18);">
          <div style="color:#9CA3AF; font-weight:900;">Mood Today</div>
          <div style="margin-top:6px; color:#E5E7EB; font-weight:900; font-size:1.05rem;">${escapeHtml(mood.moodText)}</div>
        </div>

        <div style="padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.18);">
          <div style="color:#9CA3AF; font-weight:900;">Habits Today</div>
          <div style="margin-top:6px; color:#E5E7EB; font-weight:900; font-size:1.05rem;">${escapeHtml(habits.percent)}</div>
        </div>

        <div style="padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.18);">
          <div style="color:#9CA3AF; font-weight:900;">Tasks</div>
          <div style="margin-top:6px; color:#E5E7EB; font-weight:900; font-size:1.05rem;">${todos.done}/${todos.total}</div>
        </div>

        <div style="grid-column: 1 / -1; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.12); background:rgba(0,0,0,0.18);">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
            <div style="color:#9CA3AF; font-weight:900;">Streak</div>
            <div style="color:#E5E7EB; font-weight:900;">${streak.streak} days</div>
          </div>
          <div style="margin-top:8px; color:#9CA3AF; line-height:1.35;">
            This panel is read-only and safe. It never edits your core logic.
          </div>
        </div>
      </div>

      ${journalHTML}
    `;
  }

  // --- Safe auto-refresh without touching app.js ---
  function hookNavigationClicks() {
    // Re-render when tabs are clicked (after showPage runs)
    document.addEventListener("click", (e) => {
      const tab = e.target && e.target.closest ? e.target.closest(".nav-tab") : null;
      if (!tab) return;
      setTimeout(renderDashboardMemory, 50);
    });
  }

  function observeDashboardActivation() {
    const dashboard = $("dashboardPage");
    if (!dashboard || typeof MutationObserver === "undefined") return;

    const obs = new MutationObserver(() => {
      // if dashboard becomes active (or changes), attempt render
      renderDashboardMemory();
    });

    obs.observe(dashboard, { attributes: true, attributeFilter: ["class"] });
  }

  function boot() {
    hookNavigationClicks();
    observeDashboardActivation();

    // initial render
    setTimeout(renderDashboardMemory, 0);

    // periodic refresh (safe + lightweight)
    setInterval(() => {
      renderDashboardMemory();
    }, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
