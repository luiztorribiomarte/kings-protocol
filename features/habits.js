// ==============================
// HABITS SYSTEM
// ==============================

let habits = [];
let habitLog = {};
let bestStreak = 0;

// Load data
function loadHabits() {
    habits = JSON.parse(localStorage.getItem('habits')) || [];
    habitLog = JSON.parse(localStorage.getItem('habitLog')) || {};
    bestStreak = parseInt(localStorage.getItem('bestStreak')) || 0;
}

// Save data
function saveHabits() {
    localStorage.setItem('habits', JSON.stringify(habits));
    localStorage.setItem('habitLog', JSON.stringify(habitLog));
    localStorage.setItem('bestStreak', bestStreak);
}

// Render weekly habit grid
function renderHabits() {
    const grid = document.getElementById('habitGrid');
    if (!grid) return;

    const today = new Date();
    const week = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        week.push(d);
    }

    let html = `
        <table class="habit-table">
            <thead>
                <tr>
                    <th>Habit</th>
                    ${week.map(d => `<th>${d.toLocaleDateString('en-US', { weekday: 'short' })}<br>${d.getDate()}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    habits.forEach(habit => {
        html += `
            <tr>
                <td class="habit-name" data-habit-id="${habit.id}">${habit.name}</td>
                ${week.map(d => {
                    const dateKey = d.toISOString().slice(0, 10);
                    const checked = habitLog[dateKey]?.[habit.id];
                    return `
                        <td>
                            <span class="habit-dot ${checked ? 'done' : ''}"
                                  onclick="toggleHabit('${habit.id}', '${dateKey}')"></span>
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

// Toggle habit
function toggleHabit(habitId, date) {
    if (!habitLog[date]) habitLog[date] = {};
    habitLog[date][habitId] = !habitLog[date][habitId];
    saveHabits();
    renderHabits();
}

// ==============================
// HABIT CLICK → HISTORY GRAPH
// ==============================

function attachHabitClickHandlers() {
    document.querySelectorAll('.habit-name').forEach(el => {
        el.style.cursor = 'pointer';
        el.onclick = () => openHabitHistory(el.dataset.habitId, el.innerText);
    });
}

function openHabitHistory(habitId, habitName) {
    const html = `
        <h2 style="margin-bottom:16px;">${habitName}</h2>

        <div style="margin-bottom:12px; display:flex; gap:8px;">
            <button onclick="renderHabitChart('${habitId}', 7)">7 Days</button>
            <button onclick="renderHabitChart('${habitId}', 30)">30 Days</button>
            <button onclick="renderHabitChart('${habitId}', 'all')">All Time</button>
        </div>

        <canvas id="habitChart" height="120"></canvas>
    `;

    openModal(html);
    renderHabitChart(habitId, 7);
}

let habitChartInstance = null;

function renderHabitChart(habitId, range) {
    const canvas = document.getElementById('habitChart');
    if (!canvas) return;

    const history = getHabitHistory(habitId, range);

    if (habitChartInstance) habitChartInstance.destroy();

    habitChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: history.labels,
            datasets: [{
                label: 'Completion',
                data: history.values,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139,92,246,0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    min: 0,
                    max: 1,
                    ticks: {
                        callback: v => v === 1 ? 'Done' : 'Missed'
                    }
                }
            }
        }
    });
}

function getHabitHistory(habitId, range) {
    const entries = Object.entries(habitLog);
    const sliced = range === 'all' ? entries : entries.slice(-range);

    const labels = [];
    const values = [];

    sliced.forEach(([date, data]) => {
        labels.push(date);
        values.push(data?.[habitId] ? 1 : 0);
    });

    return { labels, values };
}

// ==============================
// STATS (unchanged)
// ==============================

function updateStats() {
    // existing stats logic remains untouched
}

// Init
loadHabits();
renderHabits();
