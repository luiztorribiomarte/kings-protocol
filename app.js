// ============================================
// CORE APP.JS
// ============================================

let notificationsOn = true;
let timerInterval = null;
let timerSeconds = 1500;
let timerMode = 'focus';

// ============================================
// MODAL SYSTEM
// ============================================

function openModal(html) {
  const overlay = document.getElementById('modal');
  const body = document.getElementById('modalBody');
  if (!overlay || !body) return;
  body.innerHTML = html;
  overlay.style.display = 'flex';
}

function closeModal() {
  const overlay = document.getElementById('modal');
  if (overlay) overlay.style.display = 'none';
}

// ============================================
// NAVIGATION
// ============================================

function showPage(pageName) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));

  const page = document.getElementById(pageName + 'Page');
  if (page) page.classList.add('active');

  const tabs = document.querySelectorAll('.nav-tab');
  const indexMap = {
    dashboard: 0,
    goalsHabits: 1,
    workout: 2,
    journal: 3,
    visionBoard: 4,
    content: 5,
    books: 6,
    settings: 7
  };

  if (tabs[indexMap[pageName]]) tabs[indexMap[pageName]].classList.add('active');

  // Render page modules (only when needed)
  if (pageName === 'journal' && typeof renderJournalPage === 'function') renderJournalPage();
  if (pageName === 'visionBoard' && typeof renderVisionBoard === 'function') renderVisionBoard();
  if (pageName === 'content' && typeof renderContentTracker === 'function') renderContentTracker();
  if (pageName === 'books' && typeof renderReadingList === 'function') renderReadingList();
  if (pageName === 'goalsHabits' && typeof renderGoals === 'function') renderGoals();
  if (pageName === 'workout' && typeof renderExerciseCards === 'function') renderExerciseCards();
}

// ============================================
// CLOCK (REAL TIME)
// ============================================

function updateClock() {
  const now = new Date();

  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  const time = `${hours}:${minutes} ${ampm}`;
  const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const timeEl = document.getElementById('currentTime');
  const dateEl = document.getElementById('currentDate');

  if (timeEl) timeEl.textContent = time;
  if (dateEl) dateEl.textContent = date;
}

// ============================================
// LOCATION (CITY NAME)
// ============================================

async function reverseGeocodeCity(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
    const data = await res.json();
    const a = data.address || {};
    const city =
      a.city || a.town || a.village || a.suburb || a.neighbourhood || a.county || 'Your Area';

    localStorage.setItem('userCity', city);

    const clockLoc = document.getElementById('currentLocation');
    if (clockLoc) clockLoc.textContent = city;

    return city;
  } catch (e) {
    console.warn('Reverse geocode failed:', e);
    const saved = localStorage.getItem('userCity') || 'Your Area';
    const clockLoc = document.getElementById('currentLocation');
    if (clockLoc) clockLoc.textContent = saved;
    return saved;
  }
}

// ============================================
// 🌦️ REAL-TIME WEATHER (Open-Meteo, no key)
// ============================================

function cToF(c) {
  return Math.round((c * 9) / 5 + 32);
}

function getWeatherIcon(code) {
  if (code === 0) return '☀️';
  if (code === 1 || code === 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
  if ([61, 63, 65, 66, 67].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌡️';
}

function getWeatherNudge({ code, tempF, feelsF }) {
  const cold = tempF <= 35;
  const hot = tempF >= 85;
  const rainy = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67].includes(code);
  const snow = [71, 73, 75, 77, 85, 86].includes(code);
  const storm = [95, 96, 99].includes(code);
  const fog = code === 45 || code === 48;
  const delta = feelsF != null && tempF != null ? feelsF - tempF : 0;

  if (storm) return 'Stormy: keep it indoor and execute.';
  if (snow) return 'Snow: warm up longer. Protect joints.';
  if (rainy) return 'Rain: focus day. Stack wins early.';
  if (fog) return 'Foggy: slow start, sharp plan.';
  if (hot) return 'Hot: hydrate and pace your training.';
  if (cold) return 'Cold: bundle up—momentum beats motivation.';
  if (Math.abs(delta) >= 8) return delta < 0 ? 'Feels colder—warm up more.' : 'Feels warmer—pace yourself.';
  return 'Good day to stack small wins.';
}

async function fetchWeather(lat, lon, cityLabel) {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weather_code` +
      `&temperature_unit=celsius` +
      `&timezone=auto`;

    const res = await fetch(url);
    const data = await res.json();
    const cur = data.current;
    if (!cur) return;

    const tempF = cToF(cur.temperature_2m);
    const feelsF = cToF(cur.apparent_temperature);
    const code = cur.weather_code;

    const icon = getWeatherIcon(code);
    const nudge = getWeatherNudge({ code, tempF, feelsF });
    const city = cityLabel || localStorage.getItem('userCity') || 'Your Area';

    const widget = document.getElementById('weatherWidget');
    if (widget) {
      widget.innerHTML = `
        <div class="widget-icon">${icon}</div>
        <div>
          <div class="widget-value">${tempF}°F <span style="font-size:0.55em; opacity:0.75;">(feels ${feelsF}°)</span></div>
          <div class="widget-label">${city}</div>
          <div class="widget-sublabel" style="opacity:0.75;">${nudge}</div>
        </div>
      `;
    }

    localStorage.setItem(
      'lastWeather',
      JSON.stringify({ city, tempF, feelsF, code, at: new Date().toISOString() })
    );
  } catch (err) {
    console.error('Weather fetch failed', err);
  }
}

function initWeatherAndCity() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      const city = await reverseGeocodeCity(latitude, longitude);
      await fetchWeather(latitude, longitude, city);
      setInterval(() => fetchWeather(latitude, longitude, city), 10 * 60 * 1000);
    },
    () => {
      console.warn('Location denied. Weather/city unavailable.');
      const savedCity = localStorage.getItem('userCity') || 'Your Area';
      const clockLoc = document.getElementById('currentLocation');
      if (clockLoc) clockLoc.textContent = savedCity;
    }
  );
}

// ============================================
// ✅ HABIT STATS FIX (80% logic + UI updates)
// ============================================

// Start of week = SATURDAY (matches your table: Sat..Fri)
function getWeekStartSaturday(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // JS: 0=Sun, 6=Sat
  const day = d.getDay();
  const daysSinceSat = (day - 6 + 7) % 7;
  d.setDate(d.getDate() - daysSinceSat);
  return d;
}

function fmtKey(d) {
  // YYYY-MM-DD
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function getHabitStore() {
  // Try global first if your habits.js defines them
  if (typeof habitData !== 'undefined' && habitData) return habitData;

  // Fallback to localStorage
  const saved = localStorage.getItem('habitData');
  return saved ? safeParse(saved, {}) : {};
}

function getHabitsListSafe() {
  if (typeof habitsList !== 'undefined' && Array.isArray(habitsList)) return habitsList;
  const saved = localStorage.getItem('habitsList');
  const arr = saved ? safeParse(saved, []) : [];
  return Array.isArray(arr) ? arr : [];
}

function isHabitCompleted(store, dateKey, habitName) {
  // Support multiple possible shapes, because projects evolve:
  // 1) store[dateKey][habitName] = true/false
  if (store && store[dateKey] && typeof store[dateKey] === 'object') {
    if (store[dateKey][habitName] === true) return true;
  }

  // 2) store[habitName][dateKey] = true/false
  if (store && store[habitName] && typeof store[habitName] === 'object') {
    if (store[habitName][dateKey] === true) return true;
  }

  // 3) store[dateKey] = { completedHabits: [...] }
  if (store && store[dateKey] && Array.isArray(store[dateKey].completedHabits)) {
    return store[dateKey].completedHabits.includes(habitName);
  }

  return false;
}

function computeDayPercent(store, dateKey, habits) {
  const total = habits.length || 0;
  if (total === 0) return 0;

  let done = 0;
  for (const h of habits) {
    const name = (typeof h === 'string') ? h : (h?.name || h?.title || String(h));
    if (isHabitCompleted(store, dateKey, name)) done++;
  }
  return Math.round((done / total) * 100);
}

function computeWeeklyCompletion(store, keys, habits) {
  const totalHabits = habits.length || 0;
  if (totalHabits === 0) return 0;

  let done = 0;
  let possible = keys.length * totalHabits;

  for (const k of keys) {
    for (const h of habits) {
      const name = (typeof h === 'string') ? h : (h?.name || h?.title || String(h));
      if (isHabitCompleted(store, k, name)) done++;
    }
  }
  return Math.round((done / possible) * 100);
}

function computeCurrentStreakFromWeek(dayPercents) {
  // Streak = consecutive days (ending today) where percent >= 80
  let streak = 0;
  for (let i = dayPercents.length - 1; i >= 0; i--) {
    if (dayPercents[i] >= 80) streak++;
    else break;
  }
  return streak;
}

function updateTodayProgressColor(percent) {
  // Your UI renders "Today's Progress: XX%" inside the habits section.
  // We target the first element that contains "Today's Progress:"
  const candidates = Array.from(document.querySelectorAll('div, p, span'));
  const el = candidates.find((x) => x.textContent && x.textContent.includes("Today's Progress:"));
  if (!el) return;

  // Make sure percent itself is styled
  // If your habits.js already wraps the percent in a span, we'll try to color it.
  const percentSpan = el.querySelector('span') || el;
  percentSpan.style.color = percent >= 80 ? '#22c55e' : '#ef4444';
  percentSpan.style.fontWeight = '700';
}

function updateTopStatCards({ daysAt80, weeklyCompletion, currentStreak }) {
  const daysEl = document.getElementById('daysAt80');
  const weeklyEl = document.getElementById('weeklyCompletion');
  const streakEl = document.getElementById('currentStreak');

  if (daysEl) daysEl.textContent = `${daysAt80}/7`;
  if (weeklyEl) weeklyEl.textContent = `${weeklyCompletion}%`;
  if (streakEl) streakEl.textContent = `${currentStreak}`;

  // If you also have the streak badge section:
  const streakNumber = document.getElementById('streakNumber');
  if (streakNumber) streakNumber.textContent = `${currentStreak}`;
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

  // Also refresh any streak display logic you may already have
  if (typeof updateStreakDisplay === 'function') {
    try { updateStreakDisplay(); } catch {}
  }
}

// Recompute after user clicks habit cells (works even if the habits module changes)
function attachHabitGridListener() {
  const grid = document.getElementById('habitGrid');
  if (!grid) return;

  grid.addEventListener('click', () => {
    // Let your habits.js toggle/save first, then we recompute
    setTimeout(() => recomputeAndUpdateHabitStats(), 50);
  });
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Init modules (only if present)
  if (typeof initHabitData === 'function') initHabitData();
  if (typeof initHabitsList === 'function') initHabitsList();
  if (typeof initMoodData === 'function') initMoodData();
  if (typeof initGoalsData === 'function') initGoalsData();
  if (typeof initWorkoutData === 'function') initWorkoutData();
  if (typeof initJournalData === 'function') initJournalData();
  if (typeof initVisionBoardData === 'function') initVisionBoardData();
  if (typeof initContentData === 'function') initContentData();
  if (typeof initReadingListData === 'function') initReadingListData();

  // Render dashboard modules
  if (typeof renderHabitGrid === 'function') renderHabitGrid();
  if (typeof renderMoodTracker === 'function') renderMoodTracker();

  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Weather + City
  initWeatherAndCity();

  // ✅ Stats fix
  attachHabitGridListener();
  setTimeout(() => recomputeAndUpdateHabitStats(), 200); // after initial render
});
