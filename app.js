// ===============================
// GLOBAL PAGE NAVIGATION
// ===============================
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));

    if (page === 'dashboard') {
        document.getElementById('dashboardPage').classList.add('active');
        document.querySelector('.nav-tab:nth-child(1)').classList.add('active');

        // 🔁 Re-render dashboard-specific modules
        if (typeof renderMood === 'function') renderMood();
        if (typeof renderHabits === 'function') renderHabits();
        if (typeof renderTodos === 'function') renderTodos();

    } else if (page === 'goalsHabits') {
        document.getElementById('goalsHabitsPage').classList.add('active');
        document.querySelector('.nav-tab:nth-child(2)').classList.add('active');
        if (typeof renderGoals === 'function') renderGoals();

    } else if (page === 'workout') {
        document.getElementById('workoutPage').classList.add('active');
        document.querySelector('.nav-tab:nth-child(3)').classList.add('active');
        if (typeof renderExerciseCards === 'function') renderExerciseCards();

    } else if (page === 'journal') {
        document.getElementById('journalPage').classList.add('active');
        document.querySelector('.nav-tab:nth-child(4)').classList.add('active');

    } else if (page === 'visionBoard') {
        document.getElementById('visionBoardPage').classList.add('active');
        document.querySelector('.nav-tab:nth-child(5)').classList.add('active');

    } else if (page === 'content') {
        document.getElementById('contentPage').classList.add('active');
        document.querySelector('.nav-tab:nth-child(6)').classList.add('active');

    } else if (page === 'books') {
        document.getElementById('booksPage').classList.add('active');
        document.querySelector('.nav-tab:nth-child(7)').classList.add('active');

    } else if (page === 'settings') {
        document.getElementById('settingsPage').classList.add('active');
        document.querySelector('.nav-tab:nth-child(8)').classList.add('active');
    }
}

// ===============================
// TIME + DATE
// ===============================
function updateTime() {
    const now = new Date();
    const timeEl = document.getElementById('currentTime');
    const dateEl = document.getElementById('currentDate');

    if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (dateEl) {
        dateEl.textContent = now.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }
}

setInterval(updateTime, 1000);
updateTime();

// ===============================
// TODO LIST (DASHBOARD)
// ===============================
let todos = JSON.parse(localStorage.getItem('todos')) || [];

function addTodo() {
    const input = document.getElementById('todoInput');
    if (!input || !input.value.trim()) return;

    todos.push({
        text: input.value.trim(),
        done: false
    });

    input.value = '';
    saveTodos();
    renderTodos();
}

function toggleTodo(index) {
    todos[index].done = !todos[index].done;
    saveTodos();
    renderTodos();
}

function deleteTodo(index) {
    todos.splice(index, 1);
    saveTodos();
    renderTodos();
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function renderTodos() {
    const list = document.getElementById('todoList');
    if (!list) return;

    list.innerHTML = '';

    if (!todos.length) {
        list.innerHTML = `<div style="color:#9CA3AF;">No tasks yet.</div>`;
        return;
    }

    todos.forEach((todo, i) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.marginBottom = '6px';

        row.innerHTML = `
            <span style="cursor:pointer; ${todo.done ? 'text-decoration:line-through; color:#6B7280;' : ''}"
                  onclick="toggleTodo(${i})">
                ${todo.text}
            </span>
            <button onclick="deleteTodo(${i})" style="background:none; border:none; color:#EF4444; cursor:pointer;">✕</button>
        `;

        list.appendChild(row);
    });
}

// ===============================
// INITIAL LOAD
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    showPage('dashboard');

    if (typeof initHabits === 'function') initHabits();
    if (typeof initGoalsData === 'function') initGoalsData();
    if (typeof initWorkoutData === 'function') initWorkoutData();
    if (typeof initMood === 'function') initMood();

    renderTodos();
});
// ============================================
// APP BOOT: ensure modules render reliably
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  // Mood (Energy & Mood)
  try {
    if (typeof initMoodData === "function") initMoodData();

    // Only render mood if the dashboard mood container exists
    const moodEl = document.getElementById("moodTracker");
    if (moodEl && typeof renderMoodTracker === "function") {
      renderMoodTracker();
      console.log("[Kings Protocol] Mood module rendered.");
    }
  } catch (err) {
    console.warn("[Kings Protocol] Mood module failed to render:", err);
  }
});
