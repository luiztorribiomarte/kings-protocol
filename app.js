// ============================================
// CORE APP.JS - Main initialization & utilities
// ============================================

let notificationsOn = true;
let timerInterval = null;
let timerSeconds = 1500;
let timerMode = 'focus';

// Chart instances (so we can destroy/re-render cleanly)
let habitsChartInstance = null;

// ============================================
// MODAL SYSTEM
// ============================================

function closeModal(e) {
    const modal = document.getElementById('modal');
    if (!modal) return;

    if (!e || e.target === modal) {
        modal.style.display = 'none';
    }
}

function openModal(html) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;

    body.innerHTML = html;
    modal.style.display = 'flex';
}

// ============================================
// NAVIGATION
// ============================================

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const pageEl = document.getElementById(page + 'Page');
    if (pageEl) pageEl.classList.add('active');

    const tabs = document.querySelectorAll('.nav-tab');
    const map = {
        dashboard: 0,
        goalsHabits: 1,
        workout: 2,
        journal: 3,
        visionBoard: 4,
        content: 5,
        books: 6,
        settings: 7
    };

    if (tabs[map[page]]) tabs[map[page]].classList.add('active');

    if (page === 'goalsHabits' && typeof renderGoals === 'function') {
        renderGoals();
        if (typeof updateHabitAnalytics === 'function') updateHabitAnalytics();
    }

    if (page === 'workout' && typeof renderExerciseCards === 'function') {
        renderExerciseCards();
    }

    if (page === 'journal' && typeof renderJournalPage === 'function') {
        renderJournalPage();
    }

    if (page === 'visionBoard' && typeof renderVisionBoard === 'function') {
        renderVisionBoard();
    }

    if (page === 'content' && typeof renderContentTracker === 'function') {
        renderContentTracker();
    }

    if (page === 'books' && typeof renderReadingList === 'function') {
        renderReadingList();
    }
}

// ============================================
// TIMER
// ============================================

function startTimer(minutes) {
    if (typeof minutes === 'number') {
        timerSeconds = minutes * 60;
        timerMode = minutes === 25 ? 'focus' : minutes === 5 ? 'short' : 'long';
        updateTimerDisplay();
    }

    if (timerInterval) return;

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();

        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;

            if (notificationsOn && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('Timer Complete!', {
                    body: timerMode === 'focus' ? 'Time to rest.' : 'Back to focus.',
                });
            }
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerSeconds = 1500;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const el = document.getElementById('timerDisplay');
    if (!el) return;
    const m = Math.floor(timerSeconds / 60);
    const s = timerSeconds % 60;
    el.textContent = `${m}:${String(s).padStart(2, '0')}`;
}

// ============================================
// PLAYLIST
// ============================================

function loadPlaylist() {
    const input = document.getElementById('playlistUrl');
    const player = document.getElementById('playlistPlayer');
    if (!input || !player) return;

    const url = input.value;
    let embed = '';

    if (url.includes('spotify')) {
        const id = url.split('/playlist/')[1]?.split('?')[0];
        if (id) embed = `https://open.spotify.com/embed/playlist/${id}`;
    }

    if (url.includes('youtube')) {
        const id = url.split('list=')[1]?.split('&')[0];
        if (id) embed = `https://www.youtube.com/embed/videoseries?list=${id}`;
    }

    if (!embed) {
        alert('Invalid playlist URL');
        return;
    }

    player.innerHTML = `<iframe src="${embed}" width="100%" height="380" loading="lazy"></iframe>`;
}

// ============================================
// CLOCK + LOCATION (matches your HTML ids)
// ============================================

function updateClock() {
    const now = new Date();
    const h = now.getHours() % 12 || 12;
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';

    const timeEl = document.getElementById('currentTime');
    const dateEl = document.getElementById('currentDate');

    if (timeEl) timeEl.textContent = `${h}:${m} ${ampm}`;
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function updateLocation() {
    const el = document.getElementById('currentLocation');
    const cached = localStorage.getItem('userLocation');
    if (cached && el) el.textContent = cached;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async pos => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
            );
            const data = await res.json();
            const city =
                data.address.city ||
                data.address.town ||
                data.address.village ||
                data.address.county ||
                'Unknown';

            localStorage.setItem('userLocation', city);
            if (el) el.textContent = city;
        } catch {}
    });
}

// ============================================
// MODE TOGGLE
// ============================================

function toggleMode() {
    const body = document.body;
    const icon = document.getElementById('modeIcon');
    const text = document.getElementById('modeText');

    if (body.classList.contains('fire-mode')) {
        body.classList.remove('fire-mode');
        body.classList.add('zen-mode');
        if (icon) icon.textContent = '🧘';
        if (text) text.textContent = 'Zen Mode';
    } else {
        body.classList.remove('zen-mode');
        body.classList.add('fire-mode');
        if (icon) icon.textContent = '🔥';
        if (text) text.textContent = 'Fire Mode';
    }
}

// ============================================
// DAILY HABITS CHART (CLICK SECTION -> MODAL)
// ============================================

function getLocalDayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parseDayKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, (m - 1), d);
}

function getRangeDayKeys(range) {
    if (range === 'all') {
        // Best effort: use whatever dates exist in habitData
        const keys = habitData && typeof habitData === 'object'
            ? Object.keys(habitData).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k))
            : [];
        keys.sort((a, b) => parseDayKey(a) - parseDayKey(b));
        return keys.length ? keys : getRangeDayKeys('7');
    }

    const days = range === '30' ? 30 : 7;
    const out = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        out.push(getLocalDayKey(d));
    }
    return out;
}

function getHabitsTotalCount() {
    // Best effort: habitsList might exist as array
    if (Array.isArray(window.habitsList) && window.habitsList.length) return window.habitsList.length;

    // If habitsList is object map
    if (window.habitsList && typeof window.habitsList === 'object') {
        const keys = Object.keys(window.habitsList);
        if (keys.length) return keys.length;
    }

    // Fallback: infer from any day inside habitData
    if (window.habitData && typeof window.habitData === 'object') {
        const anyKey = Object.keys(window.habitData).find(k => typeof window.habitData[k] === 'object');
        if (anyKey) return Object.keys(window.habitData[anyKey]).length;
    }

    return 0;
}

function getDayCompletion(dayKey) {
    // Returns { done, total, percent }
    const total = getHabitsTotalCount();

    // Common shape: habitData[dayKey] = { habitId/name: true/false }
    if (window.habitData && typeof window.habitData === 'object' && window.habitData[dayKey] && typeof window.habitData[dayKey] === 'object') {
        const values = Object.values(window.habitData[dayKey]);
        const done = values.filter(Boolean).length;
        const denom = total || values.length || 0;
        const percent = denom ? Math.round((done / denom) * 100) : 0;
        return { done, total: denom, percent };
    }

    // If no data stored for this day
    return { done: 0, total: total || 0, percent: 0 };
}

function openHabitsGraph(range = '7') {
    const title = range === '30' ? 'Last 30 Days' : range === 'all' ? 'All Time' : 'Last 7 Days';

    const html = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px;">
        <div style="font-size:1.15rem; font-weight:900; color:white;">📈 Habit Completion (${title})</div>
        <div style="display:flex; gap:8px; align-items:center;">
          <div style="color:#9ca3af; font-size:0.9rem;">Range</div>
          <select id="habitsRangeSelect"
            style="padding:8px 10px; border-radius:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); color:white; outline:none;"
          >
            <option value="7" ${range === '7' ? 'selected' : ''}>7 days</option>
            <option value="30" ${range === '30' ? 'selected' : ''}>30 days</option>
            <option value="all" ${range === 'all' ? 'selected' : ''}>All time</option>
          </select>
        </div>
      </div>

      <div style="color:#9ca3af; font-size:0.9rem; margin-bottom:12px;">
        Line shows your daily completion %. Hover a point to see “done / total”.
      </div>

      <div style="width:100%; height:320px;">
        <canvas id="habitsChartCanvas" height="320"></canvas>
      </div>
    `;

    if (typeof openModal === 'function') openModal(html);
    else return;

    const select = document.getElementById('habitsRangeSelect');
    if (select) select.onchange = () => openHabitsGraph(select.value);

    setTimeout(() => renderHabitsChart(range), 0);
}

function renderHabitsChart(range) {
    const canvas = document.getElementById('habitsChartCanvas');
    if (!canvas) return;

    if (habitsChartInstance) {
        try { habitsChartInstance.destroy(); } catch (e) {}
        habitsChartInstance = null;
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js not found. (You already load it in HTML, so this should not happen.)');
        return;
    }

    const keys = getRangeDayKeys(range);
    const labels = keys.map(k => {
        const d = parseDayKey(k);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const dayStats = keys.map(k => getDayCompletion(k));
    const percents = dayStats.map(s => s.total ? s.percent : null);

    const ctx = canvas.getContext('2d');
    habitsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Completion %',
                data: percents,
                tension: 0.35,
                spanGaps: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: 'rgba(255,255,255,0.8)' } },
                tooltip: {
                    callbacks: {
                        afterBody: (items) => {
                            const idx = items?.[0]?.dataIndex ?? 0;
                            const s = dayStats[idx];
                            const k = keys[idx];
                            return [
                                `Done: ${s.done} / ${s.total}`,
                                `Date: ${k}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: 'rgba(255,255,255,0.65)' },
                    grid: { color: 'rgba(255,255,255,0.08)' }
                },
                y: {
                    min: 0,
                    max: 100,
                    ticks: { stepSize: 10, color: 'rgba(255,255,255,0.65)' },
                    grid: { color: 'rgba(255,255,255,0.08)' }
                }
            }
        }
    });
}

function attachHabitsChartClick() {
    const grid = document.getElementById('habitGrid');
    if (!grid) return;

    const section = grid.closest('.habit-section');
    if (!section) return;

    const titleRow = section.querySelector('.section-title');
    if (!titleRow) return;

    // Avoid adding multiple listeners
    if (titleRow.dataset.habitsChartBound === '1') return;
    titleRow.dataset.habitsChartBound = '1';

    titleRow.style.cursor = 'pointer';
    titleRow.title = 'Click to view habit chart';

    titleRow.addEventListener('click', (e) => {
        // If they click "Manage Habits" button, do NOT open chart
        const target = e.target;
        if (target && target.tagName === 'BUTTON') return;
        openHabitsGraph('7');
    });
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    if (typeof initHabitData === 'function') initHabitData();
    if (typeof initGoalsData === 'function') initGoalsData();
    if (typeof initMoodData === 'function') initMoodData();
    if (typeof initHabitsList === 'function') initHabitsList();
    if (typeof initWorkoutData === 'function') initWorkoutData();
    if (typeof initJournalData === 'function') initJournalData();
    if (typeof initVisionBoardData === 'function') initVisionBoardData();
    if (typeof initContentData === 'function') initContentData();
    if (typeof initReadingListData === 'function') initReadingListData();

    if (typeof renderHabitGrid === 'function') renderHabitGrid();
    if (typeof renderMoodTracker === 'function') renderMoodTracker();
    if (typeof updateStreakDisplay === 'function') updateStreakDisplay();

    updateClock();
    updateLocation();
    setInterval(updateClock, 1000);

    // After habit grid renders, bind chart click
    setTimeout(attachHabitsChartClick, 50);
});
