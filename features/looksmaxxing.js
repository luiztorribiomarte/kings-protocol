// ============================================
// LOOKSMAXXING MODULE
// Track appearance, routines, progress photos, measurements
// ============================================

let looksData = {
  routines: [],
  measurements: [],
  photos: [],
  goals: [],
  checkIns: []
};

// ---------- INIT ----------
function initLooksMaxxing() {
  const saved = localStorage.getItem("looksMaxxingData");
  if (saved) {
    try {
      looksData = JSON.parse(saved) || {
        routines: [],
        measurements: [],
        photos: [],
        goals: [],
        checkIns: []
      };
    } catch {
      looksData = {
        routines: [],
        measurements: [],
        photos: [],
        goals: [],
        checkIns: []
      };
    }
  }

  // Initialize default routines if empty
  if (!looksData.routines || looksData.routines.length === 0) {
    looksData.routines = [
      { id: "skincare_am", category: "Skincare", name: "Morning Routine", frequency: "daily", lastDone: null },
      { id: "skincare_pm", category: "Skincare", name: "Evening Routine", frequency: "daily", lastDone: null },
      { id: "haircut", category: "Grooming", name: "Haircut", frequency: "monthly", lastDone: null },
      { id: "beard", category: "Grooming", name: "Beard Trim", frequency: "weekly", lastDone: null },
      { id: "nails", category: "Grooming", name: "Nail Care", frequency: "weekly", lastDone: null },
      { id: "teeth", category: "Health", name: "Teeth Whitening", frequency: "monthly", lastDone: null },
      { id: "posture", category: "Fitness", name: "Posture Check", frequency: "daily", lastDone: null }
    ];
    saveLooksData();
  }

  // Initialize default goals if empty
  if (!looksData.goals || looksData.goals.length === 0) {
    looksData.goals = [
      { id: "weight", name: "Target Weight", current: 0, target: 0, unit: "lbs" },
      { id: "bodyfat", name: "Body Fat %", current: 0, target: 0, unit: "%" },
      { id: "muscle", name: "Muscle Mass", current: 0, target: 0, unit: "lbs" }
    ];
    saveLooksData();
  }
}

function saveLooksData() {
  localStorage.setItem("looksMaxxingData", JSON.stringify(looksData));
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

// ---------- MAIN RENDER ----------
function renderLooksMaxxing() {
  const container = document.getElementById("looksMaxxingContainer");
  if (!container) return;

  const html = `
    <div style="margin-bottom:24px;">
      <h2 style="margin:0 0 8px 0;">💎 LooksMaxxing Hub</h2>
      <p style="color:#9CA3AF; margin:0;">Track your appearance, routines, and physical progress</p>
    </div>

    <!-- Quick Stats -->
    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card" onclick="openProgressPhotos()">
        <div class="stat-value">${looksData.photos?.length || 0}</div>
        <div class="stat-label">Progress Photos</div>
      </div>
      <div class="stat-card" onclick="openMeasurements()">
        <div class="stat-value">${looksData.measurements?.length || 0}</div>
        <div class="stat-label">Measurements Logged</div>
      </div>
      <div class="stat-card" onclick="openCheckIns()">
        <div class="stat-value">${getThisWeekCheckIns()}</div>
        <div class="stat-label">Check-ins This Week</div>
      </div>
    </div>

    <!-- Goals Progress -->
    <div class="habit-section" style="margin-bottom:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div class="section-title">🎯 Body Goals</div>
        <button onclick="openEditGoals()" class="form-submit" style="padding:6px 12px;">Edit Goals</button>
      </div>
      <div id="goalsProgress"></div>
    </div>

    <!-- Daily Routines -->
    <div class="habit-section" style="margin-bottom:24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <div class="section-title">✨ Routines & Grooming</div>
        <button onclick="openManageRoutines()" class="form-submit" style="padding:6px 12px;">Manage</button>
      </div>
      <div id="routinesGrid"></div>
    </div>

    <!-- Action Buttons -->
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
      <button onclick="openProgressPhotos()" class="form-submit" style="width:100%; padding:14px;">
        📸 Progress Photos
      </button>
      <button onclick="openMeasurements()" class="form-submit" style="width:100%; padding:14px;">
        📏 Body Measurements
      </button>
      <button onclick="openCheckIns()" class="form-submit" style="width:100%; padding:14px;">
        📝 Weekly Check-in
      </button>
    </div>
  `;

  container.innerHTML = html;
  renderGoalsProgress();
  renderRoutinesGrid();
}

// ---------- GOALS PROGRESS ----------
function renderGoalsProgress() {
  const el = document.getElementById("goalsProgress");
  if (!el) return;

  if (!looksData.goals || looksData.goals.length === 0) {
    el.innerHTML = `<div style="color:#9CA3AF;">No goals set yet. Click "Edit Goals" to add some!</div>`;
    return;
  }

  const html = looksData.goals.map(goal => {
    const progress = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
    const remaining = goal.target - goal.current;
    const color = progress >= 100 ? "#22C55E" : progress >= 75 ? "#A78BFA" : progress >= 50 ? "#F59E0B" : "#EF4444";

    return `
      <div style="margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <div style="font-weight:700;">${goal.name}</div>
          <div style="color:${color}; font-weight:800;">
            ${goal.current} / ${goal.target} ${goal.unit}
            ${remaining > 0 ? `<span style="color:#9CA3AF; font-size:0.9rem;">(${Math.abs(remaining).toFixed(1)} to go)</span>` : ''}
          </div>
        </div>
        <div style="height:8px; border-radius:6px; background:rgba(255,255,255,0.1); overflow:hidden;">
          <div style="height:100%; width:${progress}%; background:${color}; transition:width 0.3s ease;"></div>
        </div>
      </div>
    `;
  }).join("");

  el.innerHTML = html;
}

function openEditGoals() {
  const html = `
    <h2>Edit Body Goals</h2>
    <div style="max-height:400px; overflow:auto;">
      ${looksData.goals.map((goal, i) => `
        <div style="padding:14px; margin-bottom:10px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03);">
          <div style="font-weight:700; margin-bottom:8px;">${goal.name}</div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:0.85rem; color:#9CA3AF;">Current</label>
              <input type="number" step="0.1" value="${goal.current}" 
                onchange="updateGoal(${i}, 'current', parseFloat(this.value))"
                class="form-input" />
            </div>
            <div>
              <label style="font-size:0.85rem; color:#9CA3AF;">Target</label>
              <input type="number" step="0.1" value="${goal.target}"
                onchange="updateGoal(${i}, 'target', parseFloat(this.value))"
                class="form-input" />
            </div>
          </div>
        </div>
      `).join("")}
    </div>
    <div style="margin-top:14px;">
      <button onclick="closeModal(); renderLooksMaxxing();" class="form-submit">Save & Close</button>
    </div>
  `;
  openModal(html);
}

function updateGoal(index, field, value) {
  looksData.goals[index][field] = value;
  saveLooksData();
  renderGoalsProgress();
}

// ---------- ROUTINES ----------
function renderRoutinesGrid() {
  const el = document.getElementById("routinesGrid");
  if (!el) return;

  const today = getTodayKey();
  const categories = [...new Set(looksData.routines.map(r => r.category))];

  const html = categories.map(cat => {
    const routines = looksData.routines.filter(r => r.category === cat);
    
    return `
      <div style="margin-bottom:18px;">
        <div style="font-weight:700; color:#A78BFA; margin-bottom:8px; font-size:0.9rem; text-transform:uppercase; letter-spacing:0.5px;">
          ${cat}
        </div>
        <div style="display:grid; gap:8px;">
          ${routines.map(routine => {
            const isDoneToday = routine.lastDone === today;
            const daysAgo = routine.lastDone ? Math.floor((Date.now() - new Date(routine.lastDone).getTime()) / (1000 * 60 * 60 * 24)) : null;
            
            return `
              <div onclick="markRoutineDone('${routine.id}')" style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                padding:12px;
                border-radius:10px;
                border:1px solid rgba(255,255,255,0.1);
                background:${isDoneToday ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)'};
                cursor:pointer;
                transition:all 0.2s ease;
              " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='${isDoneToday ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)'}'">
                <div>
                  <div style="font-weight:600;">${routine.name}</div>
                  <div style="font-size:0.85rem; color:#9CA3AF;">
                    ${routine.frequency} • ${daysAgo !== null ? `${daysAgo}d ago` : 'never done'}
                  </div>
                </div>
                <div style="font-size:1.3rem;">
                  ${isDoneToday ? '✅' : '○'}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");

  el.innerHTML = html;
}

function markRoutineDone(routineId) {
  const routine = looksData.routines.find(r => r.id === routineId);
  if (!routine) return;

  const today = getTodayKey();
  
  // Toggle: if already done today, unmark it
  if (routine.lastDone === today) {
    routine.lastDone = null;
  } else {
    routine.lastDone = today;
  }

  saveLooksData();
  renderRoutinesGrid();
}

function openManageRoutines() {
  const html = `
    <h2>Manage Routines</h2>
    
    <div style="margin-bottom:14px;">
      <input id="newRoutineName" placeholder="Routine name" class="form-input" style="margin-bottom:8px;" />
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        <select id="newRoutineCategory" class="form-input">
          <option>Skincare</option>
          <option>Grooming</option>
          <option>Fitness</option>
          <option>Health</option>
          <option>Style</option>
        </select>
        <select id="newRoutineFrequency" class="form-input">
          <option>daily</option>
          <option>weekly</option>
          <option>monthly</option>
        </select>
      </div>
      <button onclick="addRoutine()" class="form-submit" style="margin-top:8px; width:100%;">Add Routine</button>
    </div>

    <div style="max-height:300px; overflow:auto;">
      ${looksData.routines.map(r => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid rgba(255,255,255,0.1);">
          <div>
            <div style="font-weight:600;">${r.name}</div>
            <div style="font-size:0.85rem; color:#9CA3AF;">${r.category} • ${r.frequency}</div>
          </div>
          <button onclick="deleteRoutine('${r.id}')" style="color:#EF4444; background:none; border:none; cursor:pointer;">Delete</button>
        </div>
      `).join("")}
    </div>
  `;
  openModal(html);
}

function addRoutine() {
  const name = document.getElementById("newRoutineName")?.value.trim();
  const category = document.getElementById("newRoutineCategory")?.value;
  const frequency = document.getElementById("newRoutineFrequency")?.value;

  if (!name) return alert("Routine name required");

  looksData.routines.push({
    id: "routine_" + Date.now(),
    category,
    name,
    frequency,
    lastDone: null
  });

  saveLooksData();
  openManageRoutines();
  renderRoutinesGrid();
}

function deleteRoutine(id) {
  if (!confirm("Delete this routine?")) return;
  looksData.routines = looksData.routines.filter(r => r.id !== id);
  saveLooksData();
  openManageRoutines();
  renderRoutinesGrid();
}

// ---------- PROGRESS PHOTOS ----------
function openProgressPhotos() {
  const html = `
    <h2>📸 Progress Photos</h2>
    <p style="color:#9CA3AF; font-size:0.9rem;">Track visual progress over time</p>

    <div style="margin:14px 0; padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03);">
      <input type="file" id="photoUpload" accept="image/*" class="form-input" style="margin-bottom:8px;" />
      <input type="text" id="photoNote" placeholder="Note (optional - front, side, back, etc.)" class="form-input" style="margin-bottom:8px;" />
      <button onclick="addProgressPhoto()" class="form-submit" style="width:100%;">Add Photo</button>
    </div>

    <div style="max-height:400px; overflow:auto;">
      ${!looksData.photos || looksData.photos.length === 0 
        ? `<div style="color:#9CA3AF; text-align:center; padding:40px;">No photos yet. Upload your first progress photo!</div>`
        : looksData.photos.slice().reverse().map(photo => `
          <div style="margin-bottom:14px; padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03);">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <div>
                <div style="font-weight:700;">${new Date(photo.date).toLocaleDateString()}</div>
                ${photo.note ? `<div style="color:#9CA3AF; font-size:0.9rem;">${photo.note}</div>` : ''}
              </div>
              <button onclick="deletePhoto('${photo.id}')" style="color:#EF4444; background:none; border:none; cursor:pointer;">Delete</button>
            </div>
            ${photo.dataUrl ? `<img src="${photo.dataUrl}" style="width:100%; max-width:300px; border-radius:8px;" />` : ''}
          </div>
        `).join("")
      }
    </div>
  `;
  openModal(html);
}

function addProgressPhoto() {
  const fileInput = document.getElementById("photoUpload");
  const noteInput = document.getElementById("photoNote");
  
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    return alert("Please select a photo");
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    const photo = {
      id: "photo_" + Date.now(),
      date: getTodayKey(),
      note: noteInput?.value.trim() || "",
      dataUrl: e.target.result
    };

    if (!looksData.photos) looksData.photos = [];
    looksData.photos.push(photo);
    saveLooksData();
    openProgressPhotos();
    renderLooksMaxxing();
  };

  reader.readAsDataURL(file);
}

function deletePhoto(id) {
  if (!confirm("Delete this photo?")) return;
  looksData.photos = looksData.photos.filter(p => p.id !== id);
  saveLooksData();
  openProgressPhotos();
  renderLooksMaxxing();
}

// ---------- MEASUREMENTS ----------
function openMeasurements() {
  const html = `
    <h2>📏 Body Measurements</h2>
    
    <div style="margin:14px 0; padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03);">
      <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:8px; margin-bottom:8px;">
        <input type="number" id="measureWeight" placeholder="Weight (lbs)" class="form-input" step="0.1" />
        <input type="number" id="measureBodyFat" placeholder="Body Fat %" class="form-input" step="0.1" />
        <input type="number" id="measureChest" placeholder="Chest (in)" class="form-input" step="0.1" />
        <input type="number" id="measureWaist" placeholder="Waist (in)" class="form-input" step="0.1" />
        <input type="number" id="measureArms" placeholder="Arms (in)" class="form-input" step="0.1" />
        <input type="number" id="measureLegs" placeholder="Legs (in)" class="form-input" step="0.1" />
      </div>
      <button onclick="addMeasurement()" class="form-submit" style="width:100%;">Log Measurements</button>
    </div>

    <div style="max-height:400px; overflow:auto;">
      ${!looksData.measurements || looksData.measurements.length === 0
        ? `<div style="color:#9CA3AF; text-align:center; padding:40px;">No measurements yet. Log your first entry!</div>`
        : looksData.measurements.slice().reverse().map(m => `
          <div style="margin-bottom:12px; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03);">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <div style="font-weight:700;">${new Date(m.date).toLocaleDateString()}</div>
              <button onclick="deleteMeasurement('${m.id}')" style="color:#EF4444; background:none; border:none; cursor:pointer;">Delete</button>
            </div>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; font-size:0.9rem;">
              ${m.weight ? `<div>Weight: <strong>${m.weight} lbs</strong></div>` : ''}
              ${m.bodyFat ? `<div>BF: <strong>${m.bodyFat}%</strong></div>` : ''}
              ${m.chest ? `<div>Chest: <strong>${m.chest}"</strong></div>` : ''}
              ${m.waist ? `<div>Waist: <strong>${m.waist}"</strong></div>` : ''}
              ${m.arms ? `<div>Arms: <strong>${m.arms}"</strong></div>` : ''}
              ${m.legs ? `<div>Legs: <strong>${m.legs}"</strong></div>` : ''}
            </div>
          </div>
        `).join("")
      }
    </div>
  `;
  openModal(html);
}

function addMeasurement() {
  const measurement = {
    id: "measure_" + Date.now(),
    date: getTodayKey(),
    weight: parseFloat(document.getElementById("measureWeight")?.value) || null,
    bodyFat: parseFloat(document.getElementById("measureBodyFat")?.value) || null,
    chest: parseFloat(document.getElementById("measureChest")?.value) || null,
    waist: parseFloat(document.getElementById("measureWaist")?.value) || null,
    arms: parseFloat(document.getElementById("measureArms")?.value) || null,
    legs: parseFloat(document.getElementById("measureLegs")?.value) || null
  };

  // Only add if at least one field is filled
  const hasData = Object.values(measurement).some(v => v !== null && v !== "measure_" + Date.now() && v !== getTodayKey());
  if (!hasData) return alert("Please enter at least one measurement");

  if (!looksData.measurements) looksData.measurements = [];
  looksData.measurements.push(measurement);
  saveLooksData();
  openMeasurements();
  renderLooksMaxxing();
}

function deleteMeasurement(id) {
  if (!confirm("Delete this measurement?")) return;
  looksData.measurements = looksData.measurements.filter(m => m.id !== id);
  saveLooksData();
  openMeasurements();
  renderLooksMaxxing();
}

// ---------- CHECK-INS ----------
function getThisWeekCheckIns() {
  if (!looksData.checkIns) return 0;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return looksData.checkIns.filter(c => new Date(c.date) >= weekAgo).length;
}

function openCheckIns() {
  const html = `
    <h2>📝 Weekly Check-ins</h2>
    <p style="color:#9CA3AF; font-size:0.9rem;">Reflect on what's working and what needs adjustment</p>

    <div style="margin:14px 0; padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03);">
      <textarea id="checkInWins" placeholder="Wins this week..." class="form-input" rows="2" style="margin-bottom:8px;"></textarea>
      <textarea id="checkInChallenges" placeholder="Challenges faced..." class="form-input" rows="2" style="margin-bottom:8px;"></textarea>
      <textarea id="checkInFocus" placeholder="Focus for next week..." class="form-input" rows="2" style="margin-bottom:8px;"></textarea>
      <button onclick="addCheckIn()" class="form-submit" style="width:100%;">Submit Check-in</button>
    </div>

    <div style="max-height:400px; overflow:auto;">
      ${!looksData.checkIns || looksData.checkIns.length === 0
        ? `<div style="color:#9CA3AF; text-align:center; padding:40px;">No check-ins yet. Start your first weekly reflection!</div>`
        : looksData.checkIns.slice().reverse().map(c => `
          <div style="margin-bottom:14px; padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03);">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <div style="font-weight:700;">${new Date(c.date).toLocaleDateString()}</div>
              <button onclick="deleteCheckIn('${c.id}')" style="color:#EF4444; background:none; border:none; cursor:pointer;">Delete</button>
            </div>
            ${c.wins ? `<div style="margin-bottom:6px;"><strong>Wins:</strong> ${c.wins}</div>` : ''}
            ${c.challenges ? `<div style="margin-bottom:6px;"><strong>Challenges:</strong> ${c.challenges}</div>` : ''}
            ${c.focus ? `<div><strong>Focus:</strong> ${c.focus}</div>` : ''}
          </div>
        `).join("")
      }
    </div>
  `;
  openModal(html);
}

function addCheckIn() {
  const wins = document.getElementById("checkInWins")?.value.trim();
  const challenges = document.getElementById("checkInChallenges")?.value.trim();
  const focus = document.getElementById("checkInFocus")?.value.trim();

  if (!wins && !challenges && !focus) {
    return alert("Please fill in at least one field");
  }

  const checkIn = {
    id: "checkin_" + Date.now(),
    date: getTodayKey(),
    wins,
    challenges,
    focus
  };

  if (!looksData.checkIns) looksData.checkIns = [];
  looksData.checkIns.push(checkIn);
  saveLooksData();
  openCheckIns();
  renderLooksMaxxing();
}

function deleteCheckIn(id) {
  if (!confirm("Delete this check-in?")) return;
  looksData.checkIns = looksData.checkIns.filter(c => c.id !== id);
  saveLooksData();
  openCheckIns();
  renderLooksMaxxing();
}

// ---------- BOOT ----------
(function bootLooksMaxxing() {
  try {
    initLooksMaxxing();
    const container = document.getElementById("looksMaxxingContainer");
    if (container) renderLooksMaxxing();
  } catch (e) {
    console.error("LooksMaxxing init failed:", e);
  }
})();

console.log("LooksMaxxing module loaded");
