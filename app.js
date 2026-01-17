// ============================================
// CORE APP.JS
// Dashboard initialization + utilities
// Adds: Real weather + city + feels-like + nudges + DAILY BRIEF (varied)
// ============================================

let notificationsOn = true;

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
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

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

    if (tabs[indexMap[pageName]]) {
        tabs[indexMap[pageName]].classList.add('active');
    }

    // Render page modules when needed
    if (pageName === 'journal' && typeof renderJournalPage === 'function') renderJournalPage();
    if (pageName === 'visionBoard' && typeof renderVisionBoard === 'function') renderVisionBoard();
    if (pageName === 'content' && typeof renderContentTracker === 'function') renderContentTracker();
    if (pageName === 'books' && typeof renderReadingList === 'function') renderReadingList();
    if (pageName === 'goalsHabits' && typeof renderGoals === 'function') renderGoals();
    if (pageName === 'workout' && typeof renderExerciseCards === 'function') renderExerciseCards();

    // Update daily brief whenever switching pages (safe + cheap)
    if (pageName === 'dashboard') {
        ensureDailyBriefUI();
        updateDailyBrief();
    }
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
    const date = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

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
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`
        );
        const data = await res.json();

        const a = data.address || {};
        const city =
            a.city ||
            a.town ||
            a.village ||
            a.suburb ||
            a.neighbourhood ||
            a.county ||
            'Your Area';

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
// WEATHER (REAL-TIME + FEELS LIKE + ICON + NUDGE)
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

function getWeatherType(code) {
    if (code === 0) return 'clear';
    if (code === 1 || code === 2) return 'partly';
    if (code === 3) return 'cloudy';
    if (code === 45 || code === 48) return 'fog';
    if ([51, 53, 55, 56, 57].includes(code)) return 'drizzle';
    if ([61, 63, 65, 66, 67].includes(code)) return 'rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
    if ([95, 96, 99].includes(code)) return 'storm';
    return 'other';
}

function getWeatherWidgetNudge({ code, tempF, feelsF }) {
    const cold = tempF <= 35;
    const hot = tempF >= 85;
    const rainy = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67].includes(code);
    const snow = [71, 73, 75, 77, 85, 86].includes(code);
    const storm = [95, 96, 99].includes(code);
    const fog = (code === 45 || code === 48);

    const delta = (feelsF != null && tempF != null) ? (feelsF - tempF) : 0;

    if (storm) return 'Stormy: keep it “indoor strong” (habits + mobility).';
    if (snow) return 'Snowy: warm up extra + keep steps safe.';
    if (rainy) return 'Rainy: perfect focus day—lock habits early.';
    if (fog) return 'Low visibility: slow morning, sharp plan.';
    if (hot) return 'Hot: hydrate + train earlier if possible.';
    if (cold) return 'Cold: bundle up—momentum beats motivation.';

    if (Math.abs(delta) >= 8) {
        return delta < 0 ? 'Feels colder than it looks—warm up longer.' : 'Feels warmer—pace yourself today.';
    }

    return 'Good day to stack small wins—start with the easiest habit.';
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
        const nudge = getWeatherWidgetNudge({ code, tempF, feelsF });

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

        localStorage.setItem('lastWeather', JSON.stringify({
            city,
            tempF,
            feelsF,
            code,
            type: getWeatherType(code),
            at: new Date().toISOString()
        }));

        // Update daily brief right after we get fresh weather
        updateDailyBrief();
    } catch (err) {
        console.error('Weather fetch failed', err);
        // fall back silently (daily brief can still use lastWeather if saved)
        updateDailyBrief();
    }
}

function initWeatherAndCity() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const { latitude, longitude } = pos.coords;

            const city = await reverseGeocodeCity(latitude, longitude);
            await fetchWeather(latitude, longitude, city);

            // refresh every 10 minutes
            setInterval(() => fetchWeather(latitude, longitude, city), 10 * 60 * 1000);
        },
        () => {
            console.warn('Location denied. Weather/city unavailable.');
            const savedCity = localStorage.getItem('userCity') || 'Your Area';
            const clockLoc = document.getElementById('currentLocation');
            if (clockLoc) clockLoc.textContent = savedCity;

            // Still update daily brief with whatever data exists
            updateDailyBrief();
        }
    );
}

// ============================================
// DAILY BRIEF (ALWAYS DIFFERENT EACH DAY)
// Uses: weather + mood + habits + streak
// Tone: disciplined + encouraging
// Short: one line
// ============================================

function todayKeyLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// deterministic “random” based on date (stable all day)
function seededRand(seedStr) {
    // simple hash -> 0..1
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    // xorshift
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    const n = (h >>> 0) / 4294967295;
    return n;
}

function pickVaried(list, seedStr, memoryKey) {
    const memRaw = localStorage.getItem(memoryKey);
    let mem = [];
    try { mem = memRaw ? JSON.parse(memRaw) : []; } catch { mem = []; }

    const day = todayKeyLocal();
    // reset memory weekly-ish to keep things fresh forever
    // keep last 7 picks
    mem = Array.isArray(mem) ? mem.slice(-7) : [];

    // choose index; try avoid repeating recent
    const r = seededRand(seedStr);
    let idx = Math.floor(r * list.length);
    let tries = 0;
    while (mem.includes(idx) && tries < 10) {
        idx = (idx + 1) % list.length;
        tries++;
    }

    // store (only once per day)
    const dayMemKey = `${memoryKey}:${day}`;
    if (!localStorage.getItem(dayMemKey)) {
        mem.push(idx);
        localStorage.setItem(memoryKey, JSON.stringify(mem));
        localStorage.setItem(dayMemKey, '1');
    }

    return list[idx];
}

function getMoodToday() {
    try {
        const md = JSON.parse(localStorage.getItem('moodData') || '{}');
        const k = todayKeyLocal();
        return md && md[k] ? md[k] : null;
    } catch {
        return null;
    }
}

function getHabitToday() {
    // Prefer habits.js helper if it exists
    try {
        if (typeof getDayCompletion === 'function') {
            return getDayCompletion(todayKeyLocal()); // {done,total,percent}
        }
    } catch {}

    // fallback: attempt to compute
    try {
        const hd = window.habitData;
        const hl = window.habitsList;
        const k = todayKeyLocal();
        const dayObj = hd && hd[k] ? hd[k] : null;

        const total = Array.isArray(hl) ? hl.length : (dayObj ? Object.keys(dayObj).length : 0);
        const done = dayObj ? Object.values(dayObj).filter(Boolean).length : 0;
        const percent = total ? Math.round((done / total) * 100) : 0;

        return { done, total, percent };
    } catch {
        return { done: 0, total: 0, percent: 0 };
    }
}

function getStreakSnapshot() {
    // Try multiple likely storage keys (safe)
    const candidates = ['currentStreak', 'streak', 'streakNumber'];
    for (const k of candidates) {
        const v = localStorage.getItem(k);
        if (v && !isNaN(Number(v))) return Number(v);
    }
    // Try DOM if available
    const el = document.getElementById('streakNumber');
    if (el && !isNaN(Number(el.textContent))) return Number(el.textContent);
    return null;
}

function ensureDailyBriefUI() {
    const dash = document.getElementById('dashboardPage');
    if (!dash) return;

    // If already exists, done
    if (document.getElementById('dailyBriefCard')) return;

    // Insert near top of dashboard, right below stats grid if possible
    const statsGrid = dash.querySelector('.stats-grid');
    const card = document.createElement('div');
    card.id = 'dailyBriefCard';
    card.style.cssText = `
        margin-top: 14px;
        padding: 14px 16px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.16);
        background: linear-gradient(135deg, rgba(99,102,241,0.18), rgba(236,72,153,0.10));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
    `;

    card.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; min-width:0;">
            <div style="font-size:1.15rem;">🗣️</div>
            <div style="min-width:0;">
                <div style="font-weight:900; color:white; line-height:1;">Daily Brief</div>
                <div id="dailyBriefText" style="margin-top:6px; color:rgba(255,255,255,0.88); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    Loading...
                </div>
            </div>
        </div>
        <button
            onclick="updateDailyBrief(true)"
            style="
                padding:8px 12px;
                border-radius:12px;
                background: rgba(255,255,255,0.10);
                border: 1px solid rgba(255,255,255,0.18);
                color: rgba(255,255,255,0.9);
                cursor: pointer;
                font-weight: 800;
                flex:0 0 auto;
            "
            title="Refresh today's brief (still stays different day-to-day)"
        >↻</button>
    `;

    if (statsGrid && statsGrid.parentNode) {
        statsGrid.parentNode.insertBefore(card, statsGrid.nextSibling);
    } else {
        dash.insertBefore(card, dash.firstChild);
    }
}

function buildDailyBriefMessage(forceRefresh = false) {
    const day = todayKeyLocal();

    // Cache so it stays stable all day (unless you press refresh)
    const cacheKey = 'dailyBriefCache';
    if (!forceRefresh) {
        try {
            const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
            if (cached && cached.day === day && cached.text) return cached.text;
        } catch {}
    }

    // Data inputs
    let weather = null;
    try { weather = JSON.parse(localStorage.getItem('lastWeather') || 'null'); } catch { weather = null; }

    const mood = getMoodToday();              // {energy,mood}
    const habits = getHabitToday();           // {done,total,percent}
    const streak = getStreakSnapshot();       // number or null

    const city = (weather && weather.city) ? weather.city : (localStorage.getItem('userCity') || 'your area');
    const wType = weather ? weather.type : 'unknown';
    const tempF = weather ? weather.tempF : null;
    const feelsF = weather ? weather.feelsF : null;

    // Build a “context tag” so messages vary by conditions too
    const ctxParts = [
        day,
        wType,
        String(tempF ?? ''),
        String(feelsF ?? ''),
        String(mood?.energy ?? ''),
        String(mood?.mood ?? ''),
        String(habits?.percent ?? ''),
        String(streak ?? '')
    ];
    const seedBase = ctxParts.join('|');

    // Parts library (disciplined + encouraging)
    const openers = [
        "No excuses—just execution.",
        "Discipline first. Feelings second.",
        "Win the morning, win the day.",
        "Start clean. Stay sharp.",
        "You’re in control today."
    ];

    const weatherLines = {
        clear: [
            `Clear skies in ${city}. Move early and build momentum.`,
            `It’s clear out—use it. One hard win before noon.`,
            `Sun’s up. Lock the first habit fast.`
        ],
        partly: [
            `Mixed skies in ${city}. Keep the plan simple and ruthless.`,
            `Not perfect weather—perfect discipline test.`,
            `Stay steady today. Momentum > mood.`
        ],
        cloudy: [
            `Overcast in ${city}. Quiet day—strong work.`,
            `Cloudy outside. Inside is where the wins happen.`,
            `Low drama weather. High output day.`
        ],
        fog: [
            `Foggy in ${city}. Slow start, sharp finish.`,
            `Low visibility—high clarity. Stick to the checklist.`,
            `Fog day: do the basics brutally well.`
        ],
        drizzle: [
            `Wet outside. Perfect focus conditions inside.`,
            `Drizzle day: lock habits early, then coast.`,
            `Rain-lite means distractions are low—capitalize.`
        ],
        rain: [
            `Rain in ${city}. This is an indoor advantage day.`,
            `Rainy day: protect energy, hit the essentials.`,
            `Let the weather slow others down—not you.`
        ],
        snow: [
            `Snow in ${city}. Warm up longer, then dominate the basics.`,
            `Snow day: safe steps, strong habits.`,
            `Cold outside—discipline keeps you warm.`
        ],
        storm: [
            `Storm conditions. Keep it tight: habits + mobility + focus.`,
            `Storm day: control what you can. Execute the plan.`,
            `Bad weather, good discipline. Stay locked in.`
        ],
        other: [
            `Weather’s doing its thing. You do yours.`,
            `No matter the conditions—stack wins.`,
            `Stay consistent. That’s the flex.`
        ],
        unknown: [
            `Quick check-in: stack one win immediately.`,
            `Today is built from small wins—start now.`,
            `Lock one habit right away.`
        ]
    };

    const moodLines = [
        () => {
            if (!mood) return "Log energy + mood—data makes you dangerous.";
            const e = Number(mood.energy);
            if (e >= 8) return `Energy is high (${e}/10). Don’t waste it—hit the hardest habit first.`;
            if (e >= 6) return `Energy is decent (${e}/10). Stay disciplined and stack clean reps.`;
            if (e >= 4) return `Energy is low-ish (${e}/10). Shrink the task, don’t skip it.`;
            return `Energy is low (${e}/10). Minimum standard day—keep the streak alive.`;
        },
        () => {
            if (!mood) return "No mood logged yet—one tap and your patterns get clearer.";
            const em = mood.mood ? mood.mood : "—";
            return `Mood check: ${em}. Don’t negotiate—execute one clean win.`;
        }
    ];

    const habitLines = [
        () => {
            if (!habits || !habits.total) return "Habits decide the day. Start with the easiest one.";
            if (habits.percent >= 80) return `You’re already at ${habits.done}/${habits.total}. Finish strong—close the loop.`;
            if (habits.percent >= 50) return `You’re at ${habits.done}/${habits.total}. Keep pressure—one more habit now.`;
            if (habits.done > 0) return `You’ve started (${habits.done}/${habits.total}). Don’t break momentum.`;
            return `Zero logged yet. Do one habit immediately—then the day opens up.`;
        },
        () => {
            if (!habits || !habits.total) return "Make today measurable. Touch the habit grid once.";
            return `Target: +1 habit in the next 10 minutes.`;
        }
    ];

    const streakLines = [
        () => {
            if (streak == null) return "Protect consistency. That’s the whole game.";
            if (streak >= 14) return `${streak}-day streak. Stay cold—no sloppy misses.`;
            if (streak >= 7) return `${streak}-day streak. Keep it alive—minimum standard counts.`;
            if (streak >= 3) return `${streak}-day streak. Momentum is building—don’t blink.`;
            return `Streak is ${streak}. Start stacking days.`;
        }
    ];

    // Choose which “angle” today gets so it doesn’t repeat
    const angle = pickVaried(
        ["weatherFirst", "moodFirst", "habitFirst", "streakFirst", "hybrid"],
        seedBase + "|angle",
        "dailyBriefAngleMem"
    );

    const opener = pickVaried(openers, seedBase + "|opener", "dailyBriefOpenerMem");
    const wLine = pickVaried((weatherLines[wType] || weatherLines.unknown), seedBase + "|weather", "dailyBriefWeatherMem");
    const mLine = pickVaried(moodLines.map(fn => fn()), seedBase + "|mood", "dailyBriefMoodMem");
    const hLine = pickVaried(habitLines.map(fn => fn()), seedBase + "|habits", "dailyBriefHabitsMem");
    const sLine = pickVaried(streakLines.map(fn => fn()), seedBase + "|streak", "dailyBriefStreakMem");

    // Build a SHORT, single-line sentence (disciplined + encouraging)
    // We rotate structure so it doesn’t feel templated.
    let text = "";
    if (angle === "weatherFirst") text = `${opener} ${wLine}`;
    else if (angle === "moodFirst") text = `${opener} ${mLine}`;
    else if (angle === "habitFirst") text = `${opener} ${hLine}`;
    else if (angle === "streakFirst") text = `${opener} ${sLine}`;
    else text = `${opener} ${wLine} ${pickVaried([hLine, mLine, sLine], seedBase + "|hybridTail", "dailyBriefTailMem")}`;

    // Cache it for the day
    localStorage.setItem('dailyBriefCache', JSON.stringify({ day, text }));

    return text;
}

function updateDailyBrief(forceRefresh = false) {
    ensureDailyBriefUI();

    const el = document.getElementById('dailyBriefText');
    if (!el) return;

    const msg = buildDailyBriefMessage(forceRefresh);

    el.textContent = msg;
    el.title = msg; // so you can see full message on hover if it truncates
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Init modules
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
    if (typeof updateStreakDisplay === 'function') updateStreakDisplay();

    // Clock
    updateClock();
    setInterval(updateClock, 1000);

    // Weather + city
    initWeatherAndCity();

    // Daily Brief (shows immediately, then gets smarter when weather loads)
    ensureDailyBriefUI();
    updateDailyBrief();
});
