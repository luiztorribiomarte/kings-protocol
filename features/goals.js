// ============================================
// GOALS MODULE
// ============================================

let goalsData = [];

// Initialize goals data
function initGoalsData() {
    const saved = localStorage.getItem('goalsData');
    if (saved) {
        goalsData = JSON.parse(saved);
    }
}

// Save goals data
function saveGoalsData() {
    localStorage.setItem('goalsData', JSON.stringify(goalsData));
}

// Render goals
function renderGoals() {
    const container = document.getElementById('goalsGrid');
    if (!container) return;

    if (goalsData.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #6B7280; padding: 40px;">No goals yet. Click "➕ Add New Goal" to get started!</div>';
        return;
    }

    let html = '';
    goalsData.forEach(goal => {
        const progress = goal.target ? Math.round((goal.current / goal.target) * 100) : 0;
        
        html += `
            <div class="goal-card" onclick="showGoalDetails('${goal.id}')">
                <div class="goal-title">${goal.title}</div>
                ${goal.target ? `
                    <div class="goal-progress">
                        <div class="goal-progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                    <div class="goal-stats">
                        <span>${goal.current || 0} / ${goal.target}</span>
                        <span>${progress}%</span>
                    </div>
                ` : `
                    <div style="color: #9CA3AF; margin-top: 10px;">Non-measurable goal</div>
                `}
                ${goal.deadline ? `<div style="color: #6B7280; margin-top: 10px; font-size: 0.85em;">📅 ${goal.deadline}</div>` : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}

// Open add goal modal
function openAddGoal() {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) return;

    let html = '<h2 style="color: white; margin-bottom: 20px;">Add New Goal</h2>';
    html += '<div class="form-group">';
    html += '<label>Goal Title *</label>';
    html += '<input type="text" id="goalTitle" class="form-input" placeholder="e.g., Reach 25K YouTube Subscribers">';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label>Target Number (Optional)</label>';
    html += '<input type="number" id="goalTarget" class="form-input" placeholder="e.g., 25000">';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label>Current Progress (Optional)</label>';
    html += '<input type="number" id="goalCurrent" class="form-input" placeholder="e.g., 750">';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label>Deadline (Optional)</label>';
    html += '<input type="text" id="goalDeadline" class="form-input" placeholder="e.g., May 2026">';
    html += '</div>';
    
    html += '<div class="form-actions">';
    html += '<button onclick="saveNewGoal()" class="form-submit">Add Goal</button>';
    html += '<button onclick="closeModal()" class="form-cancel">Cancel</button>';
    html += '</div>';

    modalBody.innerHTML = html;
    modal.style.display = 'flex';
}

// Save new goal
function saveNewGoal() {
    const title = document.getElementById('goalTitle').value.trim();
    const target = document.getElementById('goalTarget').value;
    const current = document.getElementById('goalCurrent').value;
    const deadline = document.getElementById('goalDeadline').value.trim();

    if (!title) {
        alert('Please enter a goal title');
        return;
    }

    const goal = {
        id: Date.now().toString(),
        title,
        target: target ? parseInt(target) : null,
        current: current ? parseInt(current) : 0,
        deadline: deadline || null,
        createdAt: new Date().toISOString(),
        history: []
    };

    goalsData.push(goal);
    saveGoalsData();
    closeModal();
    renderGoals();
}

// Show goal details
function showGoalDetails(goalId) {
    const goal = goalsData.find(g => g.id === goalId);
    if (!goal) return;

    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) return;

    const progress = goal.target ? Math.round((goal.current / goal.target) * 100) : 0;

    let html = `<h2 style="color: white; margin-bottom: 20px;">${goal.title}</h2>`;
    
    if (goal.target) {
        html += `
            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-size: 3em; color: white; font-weight: bold; margin-bottom: 10px;">${progress}%</div>
                <div class="goal-progress" style="margin-bottom: 10px;">
                    <div class="goal-progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                </div>
                <div style="color: #9CA3AF;">${goal.current} / ${goal.target}</div>
            </div>
        `;
    }

    if (goal.deadline) {
        html += `<div style="color: #9CA3AF; margin-bottom: 20px;">📅 Deadline: ${goal.deadline}</div>`;
    }

    html += '<div style="display: flex; gap: 10px; margin-bottom: 10px;">';
    html += `<button onclick="updateGoalProgress('${goalId}')" class="form-submit">Update Progress</button>`;
    html += `<button onclick="editGoal('${goalId}')" class="form-submit">Edit</button>`;
    html += '</div>';
    
    html += '<div style="display: flex; gap: 10px;">';
    html += `<button onclick="deleteGoal('${goalId}')" class="form-cancel" style="background: rgba(255,50,50,0.2); border-color: rgba(255,50,50,0.3); color: #ff9999;">Delete Goal</button>`;
    html += '<button onclick="closeModal()" class="form-cancel">Close</button>';
    html += '</div>';

    modalBody.innerHTML = html;
    modal.style.display = 'flex';
}

// Update goal progress
function updateGoalProgress(goalId) {
    const goal = goalsData.find(g => g.id === goalId);
    if (!goal) return;

    const modalBody = document.getElementById('modalBody');

    let html = `<h2 style="color: white; margin-bottom: 20px;">Update Progress</h2>`;
    html += `<div style="color: #9CA3AF; margin-bottom: 20px;">${goal.title}</div>`;
    
    html += '<div class="form-group">';
    html += '<label>Current Progress</label>';
    html += `<input type="number" id="newProgress" class="form-input" value="${goal.current || 0}" placeholder="Enter current progress">`;
    html += '</div>';
    
    html += '<div class="form-actions">';
    html += `<button onclick="saveGoalProgress('${goalId}')" class="form-submit">Update</button>`;
    html += `<button onclick="showGoalDetails('${goalId}')" class="form-cancel">Cancel</button>`;
    html += '</div>';

    modalBody.innerHTML = html;
}

// Save goal progress
function saveGoalProgress(goalId) {
    const goal = goalsData.find(g => g.id === goalId);
    if (!goal) return;

    const newProgress = parseInt(document.getElementById('newProgress').value);
    
    if (isNaN(newProgress)) {
        alert('Please enter a valid number');
        return;
    }

    goal.current = newProgress;
    goal.history.push({
        date: new Date().toISOString(),
        value: newProgress
    });

    saveGoalsData();
    renderGoals();
    showGoalDetails(goalId);
}

// Edit goal
function editGoal(goalId) {
    const goal = goalsData.find(g => g.id === goalId);
    if (!goal) return;

    const modalBody = document.getElementById('modalBody');

    let html = '<h2 style="color: white; margin-bottom: 20px;">Edit Goal</h2>';
    
    html += '<div class="form-group">';
    html += '<label>Goal Title</label>';
    html += `<input type="text" id="editGoalTitle" class="form-input" value="${goal.title}">`;
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label>Target Number</label>';
    html += `<input type="number" id="editGoalTarget" class="form-input" value="${goal.target || ''}">`;
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label>Deadline</label>';
    html += `<input type="text" id="editGoalDeadline" class="form-input" value="${goal.deadline || ''}">`;
    html += '</div>';
    
    html += '<div class="form-actions">';
    html += `<button onclick="saveEditedGoal('${goalId}')" class="form-submit">Save Changes</button>`;
    html += `<button onclick="showGoalDetails('${goalId}')" class="form-cancel">Cancel</button>`;
    html += '</div>';

    modalBody.innerHTML = html;
}

// Save edited goal
function saveEditedGoal(goalId) {
    const goal = goalsData.find(g => g.id === goalId);
    if (!goal) return;

    const title = document.getElementById('editGoalTitle').value.trim();
    const target = document.getElementById('editGoalTarget').value;
    const deadline = document.getElementById('editGoalDeadline').value.trim();

    if (!title) {
        alert('Please enter a goal title');
        return;
    }

    goal.title = title;
    goal.target = target ? parseInt(target) : null;
    goal.deadline = deadline || null;

    saveGoalsData();
    renderGoals();
    showGoalDetails(goalId);
}

// Delete goal
function deleteGoal(goalId) {
    if (!confirm('Are you sure you want to delete this goal?')) {
        return;
    }

    const index = goalsData.findIndex(g => g.id === goalId);
    if (index !== -1) {
        goalsData.splice(index, 1);
        saveGoalsData();
        renderGoals();
        closeModal();
    }
}
