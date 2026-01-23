// ============================================
// KINGS PROTOCOL — APP.JS (STABLE ARCHITECTURE)
// Keeps all existing globals so nothing breaks
// Adds an internal APP namespace to prevent collisions
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
    // calls a global function if it exists
    try {
      const fn = window[fnName];
      if (typeof fn === "function") return fn(...args);
    } catch {}
    return null;
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
      // habits module name has varied; try both safely
      APP.utils.safeCall("renderHabitGrid");
      APP.utils.safeCall("renderHabits");
      APP.todos.render();
      APP.lifeScore.render();
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
   TODOS (keeps global addTodo/toggleTodo/deleteTodo working)
------------------------------------------------ */
APP.todos = {
  key: "todos",
  list: [],
  load() {
    try {
      APP.todos.list = JSON.parse(localStorage.getItem(APP.todos.key)) || [];
    } catch {
      APP.todos.list = [];
    }
  },
  save() {
    localStorage.setItem(APP.todos.key, JSON.stringify(APP.todos.list));
  },
  add() {
    const input = document.getElementById("todoInput");
    if (!input || !input.value.trim()) return;

    APP.todos.list.push({ text: input.value.trim(), done: false });
    input.value = "";
    APP.todos.save();
    APP.todos.render();
    APP.lifeScore.render();
  },
  toggle(index) {
    if (!APP.todos.list[index]) return;
    APP.todos.list[index].done = !APP.todos.list[index].done;
    APP.todos.save();
    APP.todos.render();
    APP.lifeScore.render();
  },
  remove(index) {
    if (index < 0 || index >= APP.todos.list.length) return;
    APP.todos.list.splice(index, 1);
    APP.todos.save();
    APP.todos.render();
    APP.lifeScore.render();
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
let todos = []; // maintained for backward compatibility (lifeScore uses APP.todos now)

function addTodo() {
  return APP.todos.add();
}
function toggleTodo(index) {
  return APP.todos.toggle(index);
}
function deleteTodo(index) {
  return APP.todos.remove(index);
}
function saveTodos() {
  // kept so nothing breaks if something else calls it
  return APP.todos.save();
}
function renderTodos() {
  // kept so nothing breaks if something else calls it
  return APP.todos.render();
}

/* ------------------------------------------------
   LIFE SCORE (keeps global renderLifeScore working)
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

    // TODO SCORE (use APP.todos source of truth)
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
    if (totalScore >= 80) {
      status = "Dominating";
      color = "green";
    } else if (totalScore >= 60) {
      status = "Solid";
      color = "yellow";
    } else if (totalScore >= 40) {
      status = "Recovering";
      color = "yellow";
    }

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
   BOOT (single, stable init)
------------------------------------------------ */
APP.boot = {
  started: false,
  start() {
    if (APP.boot.started) return;
    APP.boot.started = true;

    // init clock
    APP.clock.start();

    // load todos first (life score depends on it)
    APP.todos.load();

    // keep backward compatibility variable updated
    todos = APP.todos.list;

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

    // render todos + life score on load
    APP.todos.render();
    APP.lifeScore.render();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  APP.boot.start();
});
