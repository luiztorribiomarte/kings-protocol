// ============================================
// CORE APP.JS - Main initialization & utilities
// ============================================
// All feature modules are loaded separately

let notificationsOn = true;
let timerInterval = null;
let timerSeconds = 1500;
let timerMode = 'focus';

// ============================================
// MODAL SYSTEM
// ============================================

function createModal() {
    const overlay = document.createElement('div');
    overlay.id = 'modalOverlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;';
    
    const content = document.createElement('div');
    content.style.cssText = 'background: linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(236, 72, 153, 0.95)); border: 2px solid rgba(139, 92, 246, 0.8); border-radius: 20px; padding: 30px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; position: relative;';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.onclick = closeModal;
    closeBtn.style.cssText = 'position: absolute; top: 15px; right: 15px; background: rgba(255, 255, 255, 0.2); border: 2px solid white; color: white; font-size: 28px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-weight: 700; line-height: 1;';
    
    content.appendChild(closeBtn);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
    };
    
    return content;
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.remove();
}

// ============================================
// NAVIGATION
// ============================================

function showPage(pageName) {
    // 1) Hide all pages (your HTML uses class="page")
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // 2) Deactivate all tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // 3) Activate the selected page
    const pageEl = document.getElementById(pageName + 'Page');
    if (!pageEl) {
        console.error(`Page not found: ${pageName}Page`);
        return;
    }
    pageEl.classList.add('active');

    // 4) Activate the correct tab
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

    const tabIndex = pageIndex[pageName];
    if (tabIndex === undefined || !tabs[tabIndex]) {
        console.error(`Tab not found for page: ${pageName}`);
        return;
    }
    tabs[tabIndex].classList.add('active');

    // 5) Render page-specific content
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
// FOCUS TIMER
// ============================================

function setTimerMode(mode) {
    timerMode = mode;
    document.querySelectorAll('.timer-mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (mode === 'short') timerSeconds = 300;
    else if (mode === 'focus') timerSeconds = 1500;
    else if (mode === 'long') timerSeconds = 900;
    
    resetTimer();
}

function startTimer() {
    if (timerInterval) return;
    
    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            if (notificationsOn && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('Timer Complete!', {
                    body: timerMode === 'focus' ? 'Great work! Time for a break.' : 'Break over! Back to focus.',
                    icon: '🔥'
                });
            }
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    
    if (timerMode === 'short') timerSeconds = 300;
    else if (timerMode === 'focus') timerSeconds = 1500;
    else if (timerMode === 'long') timerSeconds = 900;
    
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    const display = document.getElementById('timerDisplay');
    if (display) {
        display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// ============================================
// NOTIFICATIONS
// ============================================

function toggleNotifications() {
    notificationsOn = !notificationsOn;
    const toggle = document.getElementById('notifToggle');
    const status = document.getElementById('notifStatus');
    
    if (toggle) {
        toggle.classList.toggle('active');
    }
    
    if (status) {
        status.textContent = notificationsOn ? 'ON' : 'OFF';
    }
    
    if (notificationsOn && 'Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
}

// ============================================
// PLAYLIST
// ============================================

function loadPlaylist() {
    const url = document.getElementById('playlistUrl')?.value;
    if (!url) {
        alert('Please paste a playlist URL');
        return;
    }
    
    const frame = document.getElementById('playlistFrame');
    const toggle = document.getElementById('playlistToggle');
    
    let embedUrl = '';
    if (url.includes('spotify')) {
        const playlistId = url.split('/playlist/')[1]?.split('?')[0];
        embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
    } else if (url.includes('youtube')) {
        const playlistId = url.split('list=')[1]?.split('&')[0];
        embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
    }
    
    if (embedUrl && frame) {
        frame.innerHTML = `<iframe src="${embedUrl}" width="100%" height="380" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
        frame.style.display = 'block';
        if (toggle) toggle.style.display = 'inline-block';
    }
}

function togglePlaylist() {
    const frame = document.getElementById('playlistFrame');
    if (frame) {
        frame.style.display = frame.style.display === 'none' ? 'block' : 'none';
    }
}

// ============================================
// LIVE CLOCK WITH GEOLOCATION
// ============================================

function updateClock() {
    const now = new Date();
    
    // Format time (12-hour format with AM/PM)
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const timeString = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    
    // Format date
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', options);
    
    // Update display
    const clockElement = document.getElementById('liveClock');
    const dateElement = document.getElementById('liveDate');
    
    if (clockElement) clockElement.textContent = timeString;
    if (dateElement) dateElement.textContent = dateString;
}

function updateLocation() {
    const locationElement = document.getElementById('clockLocation');
    
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                try {
                    // Use OpenStreetMap's Nominatim API (free, no key required)
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
                    const data = await response.json();
                    
                    // Get city/neighborhood
                    const city = data.address.city || 
                                data.address.town || 
                                data.address.village || 
                                data.address.suburb || 
                                data.address.neighbourhood || 
                                data.address.county ||
                                'Unknown';
                    
                    if (locationElement) {
                        locationElement.textContent = city;
                    }
                    
                    // Save location to localStorage
                    localStorage.setItem('userLocation', city);
                } catch (error) {
                    console.error('Error getting location name:', error);
                    if (locationElement) {
                        locationElement.textContent = 'New York';
                    }
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                // Try to use saved location
                const savedLocation = localStorage.getItem('userLocation');
                if (locationElement) {
                    locationElement.textContent = savedLocation || 'New York';
                }
            }
        );
    } else {
        // Geolocation not supported, use saved or default
        const savedLocation = localStorage.getItem('userLocation');
        if (locationElement) {
            locationElement.textContent = savedLocation || 'New York';
        }
    }
}

// ============================================
// API FETCHING
// ============================================

function fetchYouTubeStats() {
    // Placeholder - implement with YouTube API
    console.log('YouTube stats would be fetched here');
}

function fetchWeather() {
    // Placeholder - implement with weather API  
    console.log('Weather would be fetched here');
}

// ============================================
// DATA EXPORT
// ============================================

function exportData() {
    const data = {
        habitData: habitData,
        goalsData: goalsData,
        moodData: moodData,
        workoutData: workoutData,
        habitsList: habitsList,
        lifetimePushups: lifetimePushups,
        lifetimePullups: lifetimePullups,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kings-protocol-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

// ============================================
// MODE SWITCHING
// ============================================

function switchToZenMode() {
    document.body.classList.remove('fire-mode');
    document.body.classList.add('zen-mode');
    document.getElementById('pageIcon').textContent = '🧘';
    document.getElementById('zenModeBtn').classList.add('active');
    document.getElementById('fireModeBtn').classList.remove('active');
}

function switchToFireMode() {
    document.body.classList.remove('zen-mode');
    document.body.classList.add('fire-mode');
    document.getElementById('pageIcon').textContent = '🔥';
    document.getElementById('fireModeBtn').classList.add('active');
    document.getElementById('zenModeBtn').classList.remove('active');
}

// ============================================
// INITIALIZATION
// ============================================

// Wait for DOM and all scripts to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    initHabitData();
    initGoalsData();
    initMoodData();
    initHabitsList();
    initWorkoutData();
    initJournalData();
    initVisionBoardData();
    initContentData();
    initReadingListData();

    // Render initial views
    renderHabitGrid();
    renderMoodTracker();
    updateStreakDisplay();
    fetchYouTubeStats();
    fetchWeather();

    // Initialize and update clock
    updateClock();
    setInterval(updateClock, 1000); // Update every second

    // Get user location
    updateLocation();

    // Set up intervals
    setInterval(fetchYouTubeStats, 300000);
    setInterval(fetchWeather, 1800000);
});
