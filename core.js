(function () {
  "use strict";

  window.App = window.App || {
    features: {},
    events: {},
    on(page, fn) {
      if (!this.events[page]) this.events[page] = [];
      this.events[page].push(fn);
    },
    trigger(page) {
      (this.events[page] || []).forEach((fn) => {
        try { fn(); } catch {}
      });
    }
  };

  window.showPage = function (page) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".nav-tab").forEach((b) => b.classList.remove("active"));

    const map = {
      dashboard: 1,
      workout: 2,
      looksmaxxing: 3,
      visionBoard: 4,
      content: 5,
      books: 6
    };

    const pageId = page + "Page";
    const el = document.getElementById(pageId);
    if (el) el.classList.add("active");

    const tab = document.querySelector(`.nav-tab:nth-child(${map[page]})`);
    if (tab) tab.classList.add("active");

    localStorage.setItem("currentPage", page);
    window.App.trigger(page);

    if (page === "dashboard") {
      window.renderSchedule?.();
      window.renderLifeScore?.();
      window.renderWeeklyGraph?.();
      window.renderDNAProfile?.();
      window.renderMoodTracker?.();
      window.renderHabits?.();
      window.renderInsightsWidget?.();
      window.renderEmbeddedCalendar?.();
    }
  };

  function pad(n) { return String(n).padStart(2, "0"); }
  function todayKey(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function parseKey(k) {
    const [y, m, d] = String(k || "").split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  }
  function esc(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  const STORE = "weeklyPlannerData";
  let kpPlanner = safeObj(localStorage.getItem(STORE), {});
  let selected = todayKey();

  function safeObj(raw, fallback) {
    try {
      const v = JSON.parse(raw || "null");
      return v && typeof v === "object" ? v : fallback;
    } catch {
      return fallback;
    }
  }

  function savePlanner() {
    localStorage.setItem(STORE, JSON.stringify(kpPlanner));
  }

  function weekStartKey(dayK) {
    const d = parseKey(dayK);
    d.setDate(d.getDate() - d.getDay());
    return todayKey(d);
  }

  function ensureDay(dayK) {
    const ws = weekStartKey(dayK);
    if (!kpPlanner[ws]) kpPlanner[ws] = { days: {} };
    if (!kpPlanner[ws].days[dayK]) kpPlanner[ws].days[dayK] = { intentions: "", tasks: [] };
  }

  function getDay(dayK) {
    ensureDay(dayK);
    const ws = weekStartKey(dayK);
    return kpPlanner[ws].days[dayK];
  }

  function completion(dayK) {
    const day = getDay(dayK);
    const t = Array.isArray(day.tasks) ? day.tasks : [];
    const done = t.filter((x) => x && x.done).length;
    return t.length ? Math.round((done / t.length) * 100) : 0;
  }

  function sortTasks(tasks) {
    const toKey = (t) => {
      const s = String(t?.start || "");
      const e = String(t?.end || "");
      const has = s || e ? "0" : "1";
      return `${has}|${s || "99:99"}|${e || "99:99"}|${String(t?.text || "").toLowerCase()}`;
    };
    tasks.sort((a, b) => toKey(a).localeCompare(toKey(b)));
  }

  window.selectPlannerDay = function (k) {
    selected = /^\d{4}-\d{2}-\d{2}$/.test(String(k)) ? k : todayKey();
    renderPlanner();
  };

  window.setPlannerIntentions = function (value) {
    const day = getDay(selected);
    day.intentions = String(value || "");
    savePlanner();
    window.renderLifeScore?.();
  };

  window.addPlannerTask = function () {
    const textEl = document.getElementById("plannerTask");
    const startEl = document.getElementById("plannerStart");
    const endEl = document.getElementById("plannerEnd");

    const text = (textEl?.value || "").trim();
    const start = (startEl?.value || "").trim();
    const end = (endEl?.value || "").trim();

    if (!text) return;

    const day = getDay(selected);
    const tasks = Array.isArray(day.tasks) ? day.tasks : (day.tasks = []);

    tasks.push({
      text,
      start: start || "",
      end: end || "",
      done: false
    });

    sortTasks(tasks);

    if (textEl) textEl.value = "";
    if (startEl) startEl.value = "";
    if (endEl) endEl.value = "";

    savePlanner();
    renderPlanner();
    window.renderLifeScore?.();
  };

  window.togglePlannerTask = function (i) {
    const day = getDay(selected);
    const tasks = Array.isArray(day.tasks) ? day.tasks : [];
    if (!tasks[i]) return;
    tasks[i].done = !tasks[i].done;
    savePlanner();
    renderPlanner();
    window.renderLifeScore?.();
  };

  window.deletePlannerTask = function (i) {
    const day = getDay(selected);
    const tasks = Array.isArray(day.tasks) ? day.tasks : [];
    tasks.splice(i, 1);
    savePlanner();
    renderPlanner();
    window.renderLifeScore?.();
  };

  window.renderSchedule = function () {
    renderPlanner();
  };

  let dragFromIndex = null;

  function renderPlanner() {
    const box = document.getElementById("scheduleContainer");
    if (!box) return;

    ensureDay(selected);

    const ws = weekStartKey(selected);
    const base = parseKey(ws);
    const days = [...Array(7)].map((_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return todayKey(d);
    });

    const day = getDay(selected);
    const tasks = Array.isArray(day.tasks) ? day.tasks : (day.tasks = []);
    const pct = completion(selected);

    box.innerHTML = `
      <div style="
        padding:16px;
        border-radius:16px;
        border:1px solid rgba(255,255,255,0.14);
        background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
      ">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;">
          <div style="font-weight:900; font-size:1.05rem;">Weekly Planner</div>
          <div style="color:#9CA3AF; font-size:0.85rem;">${pct}%</div>
        </div>

        <div style="color:#E5E7EB; font-weight:800; margin-bottom:10px;">
          ${selected}
          <span style="color:#9CA3AF; font-weight:700; margin-left:8px;">• ${pct}%</span>
        </div>

        <div style="margin-bottom:12px;">
          <div style="color:#9CA3AF; font-size:0.85rem; margin-bottom:6px;">Intentions</div>
          <textarea id="plannerIntentions" class="form-input"
            style="min-height:90px; width:100%; resize:vertical;"
            placeholder="Write your intention for this day..."
          >${esc(day.intentions || "")}</textarea>
        </div>

        <div style="display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
          <input id="plannerStart" type="time" class="form-input" style="width:120px;" />
          <input id="plannerEnd" type="time" class="form-input" style="width:120px;" />
          <input id="plannerTask" class="form-input" placeholder="Task..." style="flex:1; min-width:220px;" />
          <button class="form-submit" onclick="addPlannerTask()">Add</button>
        </div>

        <div style="color:#9CA3AF; font-size:0.82rem; margin-bottom:10px;">
          Drag tasks to reorder. Time is optional (start/end).
        </div>

        <div id="plannerTasks"></div>

        <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:6px; margin-top:14px;">
          ${days.map((d) => {
            const isActive = d === selected;
            const isToday = d === todayKey();
            const bg = isActive
              ? "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(236,72,153,0.75))"
              : "rgba(255,255,255,0.05)";
            const border = isToday ? "2px solid rgba(99,102,241,0.9)" : "1px solid rgba(255,255,255,0.14)";
            const dt = parseKey(d);
            const name = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dt.getDay()];
            const num = dt.getDate();
            const p = completion(d);

            return `
              <div data-day="${d}"
                style="
                  cursor:pointer;
                  padding:10px 8px;
                  border-radius:14px;
                  border:${border};
                  background:${bg};
                  text-align:center;
                  transition:transform 0.12s ease;
                "
                onmouseover="this.style.transform='scale(1.03)'"
                onmouseout="this.style.transform='scale(1)'"
                title="${d}"
              >
                <div style="font-weight:900; font-size:0.82rem; color:${isActive ? "white" : "#9CA3AF"};">${name}</div>
                <div style="font-weight:900; font-size:1.05rem; margin-top:2px; color:${isActive ? "white" : "#E5E7EB"};">${num}</div>
                <div style="margin-top:6px; font-size:0.72rem; color:${isActive ? "rgba(255,255,255,0.9)" : "#9CA3AF"};">${p}%</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    const intent = document.getElementById("plannerIntentions");
    if (intent) {
      intent.addEventListener("input", (e) => window.setPlannerIntentions(e.target.value));
    }

    const grid = box.querySelector('[style*="grid-template-columns: repeat(7"]')?.parentElement;
    box.querySelectorAll("[data-day]").forEach((btn) => {
      btn.addEventListener("click", () => window.selectPlannerDay(btn.dataset.day));
    });

    const list = document.getElementById("plannerTasks");
    if (!list) return;

    if (!tasks.length) {
      list.innerHTML = `<div style="color:#9CA3AF;">No tasks for this day yet.</div>`;
      return;
    }

    list.innerHTML = tasks.map((t, i) => {
      const timeLabel = t.start && t.end ? `${esc(t.start)}–${esc(t.end)}` : (t.start ? esc(t.start) : (t.end ? esc(t.end) : ""));
      const timeCell = timeLabel ? timeLabel : "";

      return `
        <div class="kp-task" draggable="true" data-index="${i}"
          style="
            display:flex;
            gap:12px;
            align-items:center;
            margin-bottom:8px;
            padding:10px;
            border-radius:10px;
            border:1px solid rgba(255,255,255,0.1);
            background:${t.done ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.02)"};
          "
        >
          <div style="width:88px; font-weight:900; color:#6366F1;">${timeCell}</div>

          <span
            style="cursor:pointer; flex:1; ${t.done ? "text-decoration:line-through; color:#6B7280;" : "color:#E5E7EB;"}"
            onclick="togglePlannerTask(${i})"
          >${esc(t.text)}</span>

          <button onclick="deletePlannerTask(${i})" style="background:none; border:none; color:#EF4444; cursor:pointer;">✕</button>
        </div>
      `;
    }).join("");

    list.querySelectorAll(".kp-task").forEach((row) => {
      row.addEventListener("dragstart", (e) => {
        dragFromIndex = Number(row.dataset.index);
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", String(dragFromIndex)); } catch {}
        row.style.opacity = "0.6";
      });

      row.addEventListener("dragend", () => {
        row.style.opacity = "1";
        dragFromIndex = null;
      });

      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      row.addEventListener("drop", (e) => {
        e.preventDefault();
        const to = Number(row.dataset.index);
        const from = dragFromIndex;

        if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return;

        const dayObj = getDay(selected);
        const arr = Array.isArray(dayObj.tasks) ? dayObj.tasks : [];
        const item = arr.splice(from, 1)[0];
        arr.splice(to, 0, item);

        savePlanner();
        renderPlanner();
        window.renderLifeScore?.();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    selected = todayKey();

    const lastPage = localStorage.getItem("currentPage") || "dashboard";
    window.showPage(lastPage);

    window.initHabitsData?.();
    window.initMoodData?.();

    renderPlanner();

    window.renderLifeScore?.();
    window.renderWeeklyGraph?.();
    window.renderDNAProfile?.();
  });
})();
