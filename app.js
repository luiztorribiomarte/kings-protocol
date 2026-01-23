// ============================================
// KINGS PROTOCOL — APP.JS (STABLE ARCHITECTURE)
// Keeps all existing globals so nothing breaks
// Adds internal APP namespace to prevent collisions
// Adds Weekly Performance chart (Habits + Energy + Tasks)
// ============================================

/* ------------------------------------------------
   APP NAMESPACE (internal)
------------------------------------------------ */
window.APP = window.APP || {};

APP.utils = {
  qs(sel, root = document) {
    return root.querySelector(sel);
  },
  qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  },
  safeCall(fnName, ...args) {
    try {
      const fn = window[fnName];
      if (typeof fn === "function") return fn(...args);
    } catch {}
    return null;
  },
  dayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },
  pastDays(n = 7) {
    const out = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      out.push(d);
    }
    return out;
  }
};

/* ------------------------------------------------
   MODAL (keeps global openModal/closeModal working)
------------------------------------------------ */
APP.modal = {
  open(html) {
    const modal = document.getElementById("modal");
    const body = document.getElementById("modalBody");
    if (!modal || !body) return;

    body.innerHTML = html;
    modal.style.display = "flex";
  },
  close(event) {
    const modal = document.getElementById("modal");
    if (!modal) return;

    if (!event || event.target === modal) {
      modal.style.display = "none";
      const body = document.getElementById("modalBody");
      if (body) body.innerHTML = "";
    }
  }
};

// ✅ Keep your existing global functions (so nothing breaks)
function openModal(html) {
  return APP.modal.open(html);
}
function closeModal(event) {
  return APP.modal.close(event);
}

/* ------------------------------------------------
   NAVIGATION (keeps global showPage working)
------------------------------------------------ */
APP.nav = {
  show(page) {
    APP.utils.qsa(".page").forEach(p => p.classList.remove("active"));
    APP.utils.qsa(".nav-tab").forEach(b => b.classList.remove("active"));

    const pageMap = {
      dashboard: { id: "dashboardPage", tabIndex: 1 },
      goalsHabits: { id: "goalsHabitsPage", tabIndex: 2 },
      workout: { id: "workoutPage", tabIndex: 3 },
      journal: { id: "journalPage", tabIndex: 4 },
      visionBoard: { id: "visionBoardPage", tabIndex: 5 },
      content: { id: "contentPage", tabIndex: 6 },
      books: { id: "booksPage", tabIndex: 7 },
      settings: { id: "settingsPage", tabIndex: 8 }
    };

    const cfg = pageMap[page];
    if (!cfg) return;

    const el = document.getElementById(cfg.id);
    if (el) el.classList.add("active");

    const tab = APP.utils.qs(`.nav-tab:nth-child(${cfg.tabIndex})`);
    if (tab) tab.classList.add("active");

    // Dashboard renders
    if (page === "dashboard") {
      APP.utils.safeCall("renderMoodTracker");
      // habits module name may vary; try both safely
      APP.utils.safeCall("renderHabitGrid");
      APP.utils.safeCall("renderHabits");
      APP.todos.render();
      APP.lifeScore.render();
      APP.weeklyPerformance.render();
    }

    if (page === "goalsHabits") APP.utils.safeCall("renderGoals");
    if (page === "workout") APP.utils.safeCall("renderExerciseCards");
    if (page === "journal") APP.utils.safeCall("renderJournalPage");
    if (page === "visionBoard") APP.utils.safeCall("renderVisionBoard");
    if (page === "content") APP.utils.safeCall("renderContentTracker");
    if (page === "books") APP.utils.safeCall("renderReadingList");
  }
};

function showPage(page) {
  return APP.nav.show(page);
}

/* ------------------------------------------------
   CLOCK
------------------------------------------------ */
APP.clock = {
  started: false,
  tick() {
    const now = new Date();
    const timeEl = document.getElementById("currentTime");
    const dateEl = document.getElementById("currentDate");

    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
      });
    }
  },
  start() {
    if (APP.clock.started) return;
    APP.clock.started = true;
    APP.clock.tick();
    setInterval(APP.clock.tick, 1000);
  }
};

/* ------------------------------------------------
   TODOS + DAILY SNAPSHOT HISTORY
------------------------------------------------ */
APP.todos = {
  key: "todos",
  historyKey: "todoHistory",
  list: [],
  history: {},

  load() {
    try {
      APP.todos.list = JSON.parse(localStorage.getItem(APP.todos.key)) || [];
    } catch {
      APP.todos.list = [];
    }

    try {
      APP.todos.history = JSON.parse(localStorage.getItem(APP.todos.historyKey)) || {};
    } catch {
      APP.todos.history = {};
    }
  },

  save() {
    localStorage.setItem(APP.todos.key, JSON.stringify(APP.todos.list));
    APP.todos.saveTodaySnapshot();
  },

  saveTodaySnapshot() {
    const day = APP.utils.dayKey();
    const total = APP.todos.list.length;
    const done = APP.todos.list.filter(t => t.done).length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    APP.todos.history[day] = { done, total, percent, updatedAt: new Date().toISOString() };
    localStorage.setItem(APP.todos.historyKey, JSON.stringify(APP.todos.history));
  },

  add() {
    const input = document.getElementById("todoInput");
    if (!input || !input.value.trim()) return;

    APP.todos.list.push({ text: input.value.trim(), done: false });
    input.value = "";
    APP.todos.save();
    APP.todos.render();
    APP.lifeScore.render();
    APP.weeklyPerformance.render();
  },

  toggle(index) {
    if (!APP.todos.list[index]) return;
    APP.todos.list[index].done = !APP.todos.list[index].done;
    APP.todos.save();
    APP.todos.render();
    APP.lifeScore.render();
    APP.weeklyPerformance.render();
  },

  remove(index) {
    if (index < 0 || index >= APP.todos.list.length) return;
    APP.todos.list.splice(index, 1);
    APP.todos.save();
    APP.todos.render();
    APP.lifeScore.render();
    APP.weeklyPerformance.render();
  },

  render() {
    const list = document.getElementById("todoList");
    if (!list) return;

    list.innerHTML = "";

    if (!APP.todos.list.length) {
      list.innerHTML = `<div style="color:#9CA3AF;">No tasks yet.</div>`;
      return;
    }

    APP.todos.list.forEach((todo, i) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.marginBottom = "6px";

      row.innerHTML = `
        <span style="cursor:pointer; ${todo.done ? "text-decoration:line-through; color:#6B7280;" : ""}"
              onclick="toggleTodo(${i})">
          ${todo.text}
        </span>
        <button onclick="deleteTodo(${i})"
          style="background:none; border:none; color:#EF4444; cursor:pointer;">
          ✕
        </button>
      `;

      list.appendChild(row);
    });
  }
};

// ✅ Keep your existing global functions
let todos = []; // backward compatibility (some code may reference it)

function addTodo() { return APP.todos.add(); }
function toggleTodo(index) { return APP.todos.toggle(index); }
function deleteTodo(index) { return APP.todos.remove(index); }
function saveTodos() { return APP.todos.save(); }
function renderTodos() { return APP.todos.render(); }

/* ------------------------------------------------
   LIFE SCORE
------------------------------------------------ */
APP.lifeScore = {
  animateNumber(el, start, end, duration = 800) {
    let startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const value = Math.floor(start + (end - start) * progress);
      el.textContent = value;
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  },

  render() {
    const containerId = "lifeScoreCard";
    let card = document.getElementById(containerId);

    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return;

    if (!card) {
      card = document.createElement("div");
      card.id = containerId;
      card.className = "habit-section";
      dashboard.prepend(card);
    }

    // HABITS SCORE
    let habitPercent = 0;
    if (typeof getDayCompletion === "function") {
      const today = new Date().toISOString().split("T")[0];
      const data = getDayCompletion(today);
      habitPercent = data.percent || 0;
    }
    const habitScore = Math.round((habitPercent / 100) * 50);

    // MOOD SCORE
    let energyScore = 0;
    try {
      const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
      const todayKey = new Date().toISOString().split("T")[0];
      const energy = moodData[todayKey]?.energy || 5;
      energyScore = Math.round((energy / 10) * 25);
    } catch {}

    // TODO SCORE
    const totalTodos = APP.todos.list.length;
    const completedTodos = APP.todos.list.filter(t => t.done).length;
    const todoScore = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 20);

    // STREAK BONUS
    let streakBonus = 0;
    try {
      const streak = parseInt(localStorage.getItem("currentStreak") || "0");
      streakBonus = Math.min(5, streak);
    } catch {}

    const totalScore = habitScore + energyScore + todoScore + streakBonus;

    let status = "Slipping";
    let color = "red";
    if (totalScore >= 80) { status = "Dominating"; color = "green"; }
    else if (totalScore >= 60) { status = "Solid"; color = "yellow"; }
    else if (totalScore >= 40) { status = "Recovering"; color = "yellow"; }

    const glowClass =
      color === "green" ? "life-glow-green" :
      color === "yellow" ? "life-glow-yellow" :
      "life-glow-red";

    const angle = Math.round((totalScore / 100) * 360);

    card.innerHTML = `
      <div class="section-title">👑 Life Score</div>

      <div class="life-score-wrap">
        <div class="life-ring ${glowClass} life-pulse"
          style="background: conic-gradient(
            ${color === "green" ? "#22c55e" : color === "yellow" ? "#eab308" : "#ef4444"} ${angle}deg,
            rgba(255,255,255,0.08) ${angle}deg
          );">
          <span id="lifeScoreNumber">0</span>
        </div>

        <div>
          <div style="font-size:1.1rem; font-weight:800;">Status: ${status}</div>
          <div class="life-score-details">
            Habits: ${habitScore}/50<br>
            Energy: ${energyScore}/25<br>
            Tasks: ${todoScore}/20<br>
            Streak: +${streakBonus}
          </div>
        </div>
      </div>
    `;

    const numEl = document.getElementById("lifeScoreNumber");
    if (numEl) APP.lifeScore.animateNumber(numEl, 0, totalScore);
  }
};

// ✅ Keep your existing global functions
function animateNumber(el, start, end, duration = 800) {
  return APP.lifeScore.animateNumber(el, start, end, duration);
}
function renderLifeScore() {
  return APP.lifeScore.render();
}

/* ------------------------------------------------
   WEEKLY PERFORMANCE (NEW)
   - Habits % (0-100)
   - Energy scaled to % (energy*10)
   - Tasks % (from daily todoHistory snapshots)
------------------------------------------------ */
APP.weeklyPerformance = {
  chart: null,

  ensureCard() {
    const id = "weeklyPerformanceCard";
    let card = document.getElementById(id);

    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return null;

    if (!card) {
      card = document.createElement("div");
      card.id = id;
      card.className = "habit-section";

      // place it right under Life Score if possible
      const life = document.getElementById("lifeScoreCard");
      if (life && life.nextSibling) dashboard.insertBefore(card, life.nextSibling);
      else dashboard.prepend(card);
    }

    card.innerHTML = `
      <div class="section-title">📈 Weekly Performance</div>
      <div style="color:#9CA3AF; font-size:0.9rem; margin-bottom:10px;">
        Habits %, Energy (scaled), Tasks %
      </div>
      <div style="width:100%; height:260px;">
        <canvas id="weeklyPerformanceCanvas" height="260"></canvas>
      </div>
    `;

    return card;
  },

  getHabitsPercent(dayKey) {
    // dayKey is YYYY-MM-DD
    try {
      if (typeof getDayCompletion === "function") {
        const data = getDayCompletion(dayKey);
        return typeof data?.percent === "number" ? data.percent : null;
      }
    } catch {}
    return null;
  },

  getEnergyScaled(dayKey) {
    // moodData stores energy 1-10; scale to 0-100
    try {
      const moodData = JSON.parse(localStorage.getItem("moodData") || "{}");
      const energy = moodData?.[dayKey]?.energy;
      if (typeof energy === "number") return Math.round(energy * 10);
    } catch {}
    return null;
  },

  getTasksPercent(dayKey) {
    try {
      const hist = APP.todos.history || {};
      const entry = hist[dayKey];
      if (entry && typeof entry.percent === "number") return entry.percent;
    } catch {}
    return null;
  },

  render() {
    const card = APP.weeklyPerformance.ensureCard();
    if (!card) return;

    const canvas = document.getElementById("weeklyPerformanceCanvas");
    if (!canvas) return;

    if (typeof Chart === "undefined") {
      // Chart.js not loaded — fail gracefully
      console.warn("[Kings Protocol] Chart.js not found for Weekly Performance.");
      return;
    }

    // destroy previous
    if (APP.weeklyPerformance.chart) {
      try { APP.weeklyPerformance.chart.destroy(); } catch {}
      APP.weeklyPerformance.chart = null;
    }

    const days = APP.utils.pastDays(7).map(d => APP.utils.dayKey(d));
    const labels = days.map(k => {
      const dt = new Date(k + "T00:00:00");
      return dt.toLocaleDateString("en-US", { weekday: "short" });
    });

    const habits = days.map(k => APP.weeklyPerformance.getHabitsPercent(k));
    const energy = days.map(k => APP.weeklyPerformance.getEnergyScaled(k));
    const tasks = days.map(k => APP.weeklyPerformance.getTasksPercent(k));

    const ctx = canvas.getContext("2d");
    APP.weeklyPerformance.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Habits %",
            data: habits,
            tension: 0.35,
            spanGaps: true,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: "Energy (x10)",
            data: energy,
            tension: 0.35,
            spanGaps: true,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: "Tasks %",
            data: tasks,
            tension: 0.35,
            spanGaps: true,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6
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
                const k = days[idx];
                return [`Date: ${k}`];
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
            min: 0,
            max: 100,
            ticks: { stepSize: 20, color: "rgba(255,255,255,0.65)" },
            grid: { color: "rgba(255,255,255,0.08)" }
          }
        }
      }
    });
  }
};

/* ------------------------------------------------
   BOOT (single, stable init)
------------------------------------------------ */
APP.boot = {
  started: false,
  start() {
    if (APP.boot.started) return;
    APP.boot.started = true;

    APP.clock.start();

    // load todos + history first (weekly chart + life score depend on it)
    APP.todos.load();
    todos = APP.todos.list; // backward compatibility

    // module init (safe)
    if (typeof initHabits === "function") initHabits();
    if (typeof initGoalsData === "function") initGoalsData();
    if (typeof initWorkoutData === "function") initWorkoutData();
    if (typeof initMoodData === "function") initMoodData();

    // start on dashboard
    APP.nav.show("dashboard");

    // ensure mood renders if container exists
    const moodEl = document.getElementById("moodTracker");
    if (moodEl && typeof renderMoodTracker === "function") renderMoodTracker();

    // render todos + scores + chart
    APP.todos.render();
    APP.lifeScore.render();
    APP.weeklyPerformance.render();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  APP.boot.start();
});
