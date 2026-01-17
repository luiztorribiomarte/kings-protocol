// ============================================
// HABITS MODULE (SAFE EXTENSION)
// ============================================

let habits = JSON.parse(localStorage.getItem('habits')) || [];
let habitLog = JSON.parse(localStorage.getItem('habitLog')) || {};
let bestStreak = parseInt(localStorage.getItem('bestStreak')) || 0;

// --------------------------------------------
// EXISTING RENDER (UNCHANGED STRUCTURE)
// --------------------------------------------
function renderHabits() {
    const grid = document.getElementById('habitGrid');
    if (!grid) return;

    const today = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        days.push(d);
    }

    let html = `
        <table class="habit-table">
            <thead>
                <tr>
                    <th>Habit</th>
                    ${days.map(d => `
                        <th>${d.toLocaleDateString('en-US', { weekday: 'short' })}<br>${d.getDate()}</th>
                    `).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    habits.forEach(habit => {
        html += `
            <tr>
                <td class="habit-name clickable-habit" data-habit-id="${habit.id}">
                    ${habit.name}
                </td>
                ${days.map(d => {
                    const dateKey = d.toISOString().slice(0, 10);
                    const done = habitLog[dateKey]?.[habit.id];
                    return `
                        <td>
                            <span class="habit-dot ${done ? 'done' : ''}"
                                onclick="toggleHabit('${habit.id}', '${dateKey}')">
                            </span>
                        </td>
                    `;
                }).join('')}
            </tr>
        `;
    });

    html += `</tbody></table>`;
    grid.innerHTML = html;

    attachHabitClickHandlers();
    updateStats();
}

// --------------------------------------------
// TOGGLE (UNCHANGED)
// --------------------------------------------
function toggleHabit(habitId, date) {
    if (!habitLog[date]) habitLog[date] = {};
    habitLog[date][habitId] = !habitLog[date][habitId];
    localStorage.setItem('habitLog', JSON.stringify(habitLog));
    renderHabits();
}

// --------------------------------------------
// NEW: CLICK → HISTORY CHART
// --------------------------------------------
function attachHabitClickHandlers() {
    document.querySelectorAll('.clickable-habit').forEach(el => {
        el.style.cursor = 'pointer';
        el.onclick = () => openHabitHistory(el.dataset.habitId, el.innerText);
    });
}

function openHabitHistory(habitId, habitName) {
    openModal(`
        <h2 style="margin-bottom:12px;">${habitName}</h2>

        <div style="display:flex; gap:8px; margin-bottom:12px;">
            <button onclick="renderHabitChart('${habitId}', 7)">7 Days</button>
            <button onclick="renderHabitChart('${habitId}', 30)">30 Days</button>
            <button onclick="renderHabitChart('${habitId}', 'all')">All Time</button>
        </div>

        <canvas id="habitChart" height="120"></canvas>
    `);

    renderHabitChart(habitId, 7);
}

let habitChart = null;

function renderHabitChart(habitId, range) {
    const ctx = document.getElementById('habitChart');
    if (!ctx) return;

    const data = getHabitHistory(habitId, range);

    if (habitChart) habitChart.destroy();

    habitChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139,92,246,0.25)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    min: 0,
                    max: 1,
                    ticks: {
                        callback: v => v ? 'Done' : 'Missed'
                    }
                }
            }
        }
    });
}

function getHabitHistory(habitId, range) {
    const entries = Object.entries(habitLog);
    const sliced = range === 'all' ? entries : entries.slice(-range);

    return {
        labels: sliced.map(([d]) => d),
        values: sliced.map(([, v]) => v?.[habitId] ? 1 : 0)
    };
}

// --------------------------------------------
// INIT
// --------------------------------------------
renderHabits();
