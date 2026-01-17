// ============================================
// CORE APP.JS - Main initialization & utilities
// ============================================
// All feature modules are loaded separately

let notificationsOn = true;

// Timer state
let timerInterval = null;
let timerSeconds = 1500;
let timerMode = 'focus';

// ============================================
// MODAL SYSTEM (supports BOTH modal types)
// - Your HTML uses #modal / #modalBody
// - Some older code may use modalOverlay. We support both.
// ============================================

function closeModal() {
  // Close HTML modal if present
  const modal = document.getElementById('modal');
  if (modal) modal.style.display = 'none';

  // Close overlay modal if present
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.remove();
}

function createModal() {
  // Legacy overlay-style modal (kept so existing modules won’t break)
  const overlay = document.createElement('div');
  overlay.id = 'modalOverlay';
  overlay.style.cssText =
    'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;';

  const content = document.createElement('div');
  content.style.cssText =
    'background: linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(236, 72, 153, 0.95)); border: 2px solid rgba(139, 92, 246, 0.8); border-radius: 20px; padding: 30px; max-width: 700px; width: 92%; max-height: 90vh; overflow-y: auto; position: relative;';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.onclick = closeModal;
  closeBtn.style.cssText =
    'position: absolute; top: 15px; right: 15px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; color: white; font-size: 28px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-weight: 700; line-height: 1;';

  content.appendChild(closeBtn);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  return content;
}

// Helper: open the HTML modal (#modal) cleanly
function openHtmlModal(html) {
  const modal = document.getElementById('modal');
  const body = document.getElementById('modalBody');
  if (!modal || !body) return;

  body.innerHTML = html;
  modal.style.display = 'flex';
}

// ============================================
// NAVIGATION
// ============================================

function showPage(pageName) {
  // Your HTML uses .page (not .page-content)
  document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach((tab) => tab.classList.remove('active'));

  const pageEl = document.getElementById(pageName + 'Page');
  if (pageEl) pageEl.classList.add('active');

  // Tabs are in this order in your HTML
  const tabs = document.querySelectorAll('.nav-tab');
  const pageIndex = {
    dashboard: 0,
    goalsHabits: 1,
    workout: 2,
    journal: 3,
    visionBoard: 4,
    content: 5,
    books: 6,
    settings: 7
  };

  if (tabs[pageIndex[pageName]]) tabs[pageIndex[pageName]].classList.add('active');

  // Load page-specific data
  if (pageName === 'goalsHabits') {
    if (typeof renderGoals === 'function') renderGoals();
    if (typeof updateHabitAnalytics === 'function') updateHabitAnalytics();
  }

  if (pageName === 'workout') {
    if (typeof renderExerciseCards === 'function') renderExerciseCards();
  }

  if (pageName === 'journal') {
    if (typeof renderJournalPage === 'function') renderJournalPage();
  }

  if (pageName === 'visionBoard') {
    if (typeof renderVisionBoard === 'function') renderVisionBoard();
  }

  if (pageName === 'content') {
    if (typeof renderContentTracker === 'function') renderContentTracker();
  }

  if (pageName === 'books') {
    if (typeof renderReadingList === 'function') renderReadingList();
  }
}

// ============================================
// MODE SWITCHING (Fire / Zen)
// ============================================

function toggleMode() {
  if (document.body.classList.contains('fire-mode')) {
    document.body.classList.remove('fire-mode');
    document.body.classList.add('zen-mode');
    const icon = document.getElementById('modeIcon');
    const text = document.getElementById('modeText');
    if (icon) icon.textContent = '🧘';
    if (text) text.textContent = 'Zen Mode';
  } else {
    document.body.classList.remove('zen-mode');
    document.body.classList.add('fire-mode');
    const icon = document.getElementById('modeIcon');
    const text = document.getElementById('modeText');
    if (icon) icon.textContent = '🔥';
    if (text) text.textContent = 'Fire Mode';
  }
}

// ============================================
// FOCUS TIMER (matches your HTML buttons)
// startTimer(25) / startTimer(5) / startTimer(15)
// ============================================

function startTimer(minutes) {
  if (typeof minutes === 'number' && minutes > 0) {
    timerSeconds = minutes * 60;
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
          body: 'Time block complete. Reset and go again.',
          icon: '🔥'
        });
      }
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;

  // Default back to 25m if nothing else is set
  if (!timerSeconds || timerSeconds <= 0) timerSeconds = 1500;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  const display = document.getElementById('timerDisplay');
  if (display) display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// PLAYLIST (matches your HTML #playlistPlayer)
// ============================================

function loadPlaylist() {
  const url = document.getElementById('playlistUrl')?.value;
  if (!url) {
    alert('Please paste a playlist URL');
    return;
  }

  const player = document.getElementById('playlistPlayer');
  if (!player) return;

  let embedUrl = '';
  if (url.includes('spotify')) {
    const playlistId = url.split('/playlist/')[1]?.split('?')[0];
    if (playlistId) embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
  } else if (url.includes('youtube')) {
    const playlistId = url.split('list=')[1]?.split('&')[0];
    if (playlistId) embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
  }

  if (!embedUrl) {
    alert('That link does not look like a Spotify or YouTube playlist URL.');
    return;
  }

  player.innerHTML = `<iframe src="${embedUrl}" width="100%" height="380" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
}

// ============================================
// LIVE CLOCK (matches your HTML IDs)
// currentTime / currentDate / currentLocation
// ============================================

function updateClock() {
  const now = new Date();

  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  const timeString = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  const dateString = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const clockEl = document.getElementById('currentTime');
  const dateEl = document.getElementById('currentDate');

  if (clockEl) clockEl.textContent = timeString;
  if (dateEl) dateEl.textContent = dateString;
}

async function updateLocation() {
  const locationEl = document.getElementById('currentLocation');
  const savedCity = localStorage.getItem('userCity');

  if (!('geolocation' in navigator)) {
    if (locationEl) locationEl.textContent = savedCity || 'New York';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
        const data = await res.json();
        const a = data.address || {};
        const city = a.city || a.town || a.village || a.suburb || a.neighbourhood || a.county || 'Your Area';

        localStorage.setItem('userCity', city);
        if (locationEl) locationEl.textContent = city;

        // If you have weather enabled, refresh it too:
        if (typeof fetchWeather === 'function') {
          fetchWeather(lat, lon, city);
        }
      } catch (err) {
        console.error('Location reverse lookup failed:', err);
        if (locationEl) locationEl.textContent = savedCity || 'New York';
      }
    },
    () => {
      if (locationEl) locationEl.textContent = savedCity || 'New York';
    }
  );
}

// ============================================
// DAILY BRIEF (Talk-back) — short, varied, B + C tone
// - Uses weather + mood + streak if available
// - Changes daily but stays consistent for that day
// ============================================

function getTodayKey() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function seededPick(arr, seedNum) {
  if (!arr.length) return '';
  const idx = Math.abs(seedNum) % arr.length;
  return arr[idx];
}

// Simple daily seed so the same day = same line, next day = different
function dailySeedNumber() {
  const key = getTodayKey();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return hash;
}

// Reads whatever you already have for streak (if present)
function getCurrentStreakSafe() {
  const el = document.getElementById('currentStreak');
  const n = el ? parseInt(el.textContent, 10) : NaN;
  return Number.isFinite(n) ? n : 0;
}

// Reads mood/energy if your mood module stores it
function getMoodEnergySafe() {
  try {
    const moodSaved = localStorage.getItem('moodData');
    if (!moodSaved) return { energy: null, mood: null };
    const moodData = JSON.parse(moodSaved);

    // Try common shapes
    // moodData[todayKey] = { energy, moodEmoji }
    const tk = getTodayKey();
    const today = moodData[tk] || moodData.today || null;

    const energy = today?.energy ?? today?.energyLevel ?? null;
    const mood = today?.mood ?? today?.emoji ?? today?.moodEmoji ?? null;

    return { energy, mood };
  } catch {
    return { energy: null, mood: null };
  }
}

// Reads weather if stored (your weather module may store lastWeather)
function getWeatherSafe() {
  try {
    const w = localStorage.getItem('lastWeather');
    if (!w) return { tempF: null, feelsF: null, code: null, city: localStorage.getItem('userCity') || null };
    const data = JSON.parse(w);
    return {
      tempF: data.tempF ?? null,
      feelsF: data.feelsF ?? null,
      code: data.code ?? null,
      city: data.city ?? localStorage.getItem('userCity') || null
    };
  } catch {
    return { tempF: null, feelsF: null, code: null, city: localStorage.getItem('userCity') || null };
  }
}

function buildDailyBrief() {
  const seed = dailySeedNumber();
  const streak = getCurrentStreakSafe();
  const { energy, mood } = getMoodEnergySafe();
  const { tempF, feelsF } = getWeatherSafe();

  // Context tags
  const cold = typeof tempF === 'number' && tempF <= 35;
  const hot = typeof tempF === 'number' && tempF >= 85;
  const lowEnergy = typeof energy === 'number' && energy <= 4;
  const highEnergy = typeof energy === 'number' && energy >= 8;

  // Pools (short, B + C)
  const openersDirect = [
    'No excuses—just execution.',
    'Move first. Think later.',
    'Keep it simple. Do the work.',
    'Lock in early. Win the day.'
  ];

  const openersEncourage = [
    'One win starts momentum.',
    'Start small, finish strong.',
    'Consistency beats intensity.',
    'Stack easy wins, then push.'
  ];

  const weatherLines = [
    cold ? 'Cold outside—warm up and stay sharp.' : '',
    hot ? 'Heat day—hydrate and pace your output.' : '',
    (typeof feelsF === 'number' && typeof tempF === 'number' && feelsF < tempF - 8) ? 'Feels colder—protect your energy.' : '',
    (typeof feelsF === 'number' && typeof tempF === 'number' && feelsF > tempF + 8) ? 'Feels warmer—don’t gas out early.' : ''
  ].filter(Boolean);

  const streakLines = [
    streak === 0 ? 'Streak is 0. Start stacking days.' : '',
    streak > 0 && streak < 3 ? `Streak is ${streak}. Keep it alive.` : '',
    streak >= 3 ? `Streak is ${streak}. Protect it.` : ''
  ].filter(Boolean);

  const moodLines = [
    lowEnergy ? 'Low energy—minimums count today.' : '',
    highEnergy ? 'High energy—use it with control.' : '',
    mood ? `Mood check: ${mood}. Keep it moving.` : ''
  ].filter(Boolean);

  // Build 1–2 short lines total (you chose SHORT)
  const opener = seededPick([...openersDirect, ...openersEncourage], seed);
  const line2Pool = [...weatherLines, ...streakLines, ...moodLines];

  // Ensure variety: pick based on a different seed offset
  const line2 = line2Pool.length ? seededPick(line2Pool, seed * 7 + 13) : '';

  // Return as 1 or 2 lines (short)
  return line2 ? `${opener} ${line2}` : opener;
}

function renderDailyBriefCard() {
  // If a Daily Brief card already exists, update it.
  const existingText =
    document.getElementById('dailyBriefText') ||
    document.querySelector('[data-daily-brief-text]');

  const msg = buildDailyBrief();

  if (existingText) {
    existingText.textContent = msg;
    return;
  }

  // Otherwise, inject a Daily Brief card under the stat cards (dashboard)
  const dashboard = document.getElementById('dashboardPage');
  if (!dashboard) return;

  // Find the stats grid to insert after (best effort)
  const statsGrid = dashboard.querySelector('.stats-grid');
  if (!statsGrid) return;

  const wrapper = document.createElement('div');
  wrapper.style.marginTop = '16px';

  wrapper.innerHTML = `
    <div class="habit-section" style="padding:16px; border-radius:14px; background: rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12);">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <div>
          <div style="font-weight:700; color:white; margin-bottom:4px;">Daily Brief</div>
          <div id="dailyBriefText" data-daily-brief-text style="color:#d1d5db;">${msg}</div>
        </div>
        <button
          title="Refresh"
          onclick="renderDailyBriefCard()"
          style="border-radius:10px; padding:8px 10px; background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); color:white; cursor:pointer;"
        >↻</button>
      </div>
    </div>
  `;

  // Insert after stats grid
  statsGrid.parentNode.insertBefore(wrapper, statsGrid.nextSibling);
}

// ============================================
// ✅ HABIT STATS (recompute + update top cards)
// NOTE: If your habits.js hard-codes red in the HTML string,
// we will fix that in habits.js next.
// ============================================

function getWeekStartSaturday(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const daysSinceSat = (day - 6 + 7) % 7;
  d.setDate(d.getDate() - daysSinceSat);
  return d;
}

function fmtKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function safeJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function getHabitStore() {
  // Prefer global habitData if exists (habits.js)
  if (typeof habitData !== 'undefined' && habitData) return habitData;
  const saved = localStorage.getItem('habitData');
  return saved ? safeJSON(saved, {}) : {};
}

function getHabitsListSafe() {
  if (typeof habitsList !== 'undefined' && Array.isArray(habitsList)) return habitsList;
  const saved = localStorage.getItem('habitsList');
  const arr = saved ? safeJSON(saved, []) : [];
  return Array.isArray(arr) ? arr : [];
}

function isHabitCompleted(store, dateKey, habitName) {
  // Support multiple shapes
  if (store && store[dateKey] && typeof store[dateKey] === 'object') {
    if (store[dateKey][habitName] === true) return true;
  }
  if (store && store[habitName] && typeof store[habitName] === 'object') {
    if (store[habitName][dateKey] === true) return true;
  }
  if (store && store[dateKey] && Array.isArray(store[dateKey].completedHabits)) {
    return store[dateKey].completedHabits.includes(habitName);
  }
  return false;
}

function computeDayPercent(store, dateKey, habits) {
  const total = habits.length || 0;
  if (!total) return 0;

  let done = 0;
  for (const h of habits) {
    const name = typeof h === 'string' ? h : (h?.name || h?.title || String(h));
    if (isHabitCompleted(store, dateKey, name)) done++;
  }
  return Math.round((done / total) * 100);
}

function computeWeeklyCompletion(store, keys, habits) {
  const totalHabits = habits.length || 0;
  if (!totalHabits) return 0;

  let done = 0;
  let possible = keys.length * totalHabits;

  for (const k of keys) {
    for (const h of habits) {
      const name = typeof h === 'string' ? h : (h?.name || h?.title || String(h));
      if (isHabitCompleted(store, k, name)) done++;
    }
  }
  return Math.round((done / possible) * 100);
}

function computeCurrentStreakFromWeek(dayPercents) {
  let streak = 0;
  for (let i = dayPercents.length - 1; i >= 0; i--) {
    if (dayPercents[i] >= 80) streak++;
    else break;
  }
  return streak;
}

function updateTopStatCards({ daysAt80, weeklyCompletion, currentStreak }) {
  const daysEl = document.getElementById('daysAt80');
  const weeklyEl = document.getElementById('weeklyCompletion');
  const streakEl = document.getElementById('currentStreak');

  if (daysEl) daysEl.textContent = `${daysAt80}/7`;
  if (weeklyEl) weeklyEl.textContent = `${weeklyCompletion}%`;
  if (streakEl) streakEl.textContent = `${currentStreak}`;

  const streakNumber = document.getElementById('streakNumber');
  if (streakNumber) streakNumber.textContent = `${currentStreak}`;
}

// Best-effort: color Today’s Progress if it’s NOT hard-coded red.
// If habits.js hardcodes a red span, we’ll fix habits.js next.
function updateTodayProgressColor(todayPercent) {
  const all = Array.from(document.querySelectorAll('div, p, span'));
  const line = all.find((el) => el.textContent && el.textContent.includes("Today's Progress:"));
  if (!line) return;

  // Try to color only the percent portion if there is a span
  const span = line.querySelector('span');
  const target = span || line;

  target.style.color = todayPercent >= 80 ? '#22c55e' : '#ef4444';
  target.style.fontWeight = '700';
}

function recomputeAndUpdateHabitStats() {
  const store = getHabitStore();
  const habits = getHabitsListSafe();

  const weekStart = getWeekStartSaturday(new Date());
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    keys.push(fmtKey(d));
  }

  const dayPercents = keys.map((k) => computeDayPercent(store, k, habits));
  const daysAt80 = dayPercents.filter((p) => p >= 80).length;
  const weeklyCompletion = computeWeeklyCompletion(store, keys, habits);

  const todayKey = fmtKey(new Date());
  const todayIndex = keys.indexOf(todayKey);
  const todayPercent = todayIndex >= 0 ? dayPercents[todayIndex] : computeDayPercent(store, todayKey, habits);

  const currentStreak = computeCurrentStreakFromWeek(dayPercents);

  updateTopStatCards({ daysAt80, weeklyCompletion, currentStreak });
  updateTodayProgressColor(todayPercent);

  // Re-render brief since it can reference streak/mood/weather
  renderDailyBriefCard();
}

function attachHabitGridListener() {
  // Your grid container is #habitGrid
  const grid = document.getElementById('habitGrid');
  if (!grid) return;

  grid.addEventListener('click', () => {
    // let habits.js toggle/save first
    setTimeout(() => recomputeAndUpdateHabitStats(), 80);
  });
}

// ============================================
// PLACEHOLDERS (safe)
// ============================================

function fetchYouTubeStats() {
  console.log('YouTube stats would be fetched here');
}

function fetchWeather() {
  console.log('Weather would be fetched here');
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function () {
  // Initialize all modules (only if present)
  if (typeof initHabitData === 'function') initHabitData();
  if (typeof initGoalsData === 'function') initGoalsData();
  if (typeof initMoodData === 'function') initMoodData();
  if (typeof initHabitsList === 'function') initHabitsList();
  if (typeof initWorkoutData === 'function') initWorkoutData();
  if (typeof initJournalData === 'function') initJournalData();
  if (typeof initVisionBoardData === 'function') initVisionBoardData();
  if (typeof initContentData === 'function') initContentData();
  if (typeof initReadingListData === 'function') initReadingListData();

  // Render initial views
  if (typeof renderHabitGrid === 'function') renderHabitGrid();
  if (typeof renderMoodTracker === 'function') renderMoodTracker();

  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Location
  updateLocation();

  // Daily brief (talk-back)
  setTimeout(() => renderDailyBriefCard(), 150);

  // Habit stats hook
  attachHabitGridListener();
  setTimeout(() => recomputeAndUpdateHabitStats(), 300);

  // Background fetch placeholders
  fetchYouTubeStats();
  fetchWeather();
  setInterval(fetchYouTubeStats, 300000);
  setInterval(fetchWeather, 1800000);
});
