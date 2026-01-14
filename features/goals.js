// ============================================
// GOALS MODULE - Goal tracking & management
// ============================================

let goalsData = [];

// ============================================
// INITIALIZATION
// ============================================

function initGoalsData() {
    const saved = localStorage.getItem('goalsData');
    if (saved) {
        goalsData = JSON.parse(saved);
    }
}

function saveGoalsData() {
    localStorage.setItem('goalsData', JSON.stringify(goalsData));
}

// ============================================
// GOAL MANAGEMENT
// ============================================

function addGoal() {
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #D4AF37, #B8941E); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">➕ Add New Goal</h2>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #F4E5B8;">Goal Title</label>
            <input type="text" id="goalTitle" placeholder="e.g., Reach 25K subscribers" style="width: 100%; padding: 15px; border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 12px; font-size: 16px; background: rgba(255, 255, 255, 0.1); color: white;" autofocus>
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #F4E5B8;">Target Number <span style="font-weight: 400; color: #9CA3AF;">(optional)</span></label>
            <input type="number" id="goalTarget" placeholder="e.g., 25000" style="width: 100%; padding: 15px; border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 12px; font-size: 16px; background: rgba(255, 255, 255, 0.1); color: white;">
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #F4E5B8;">Current Progress <span style="font-weight: 400; color: #9CA3AF;">(optional)</span></label>
            <input type="number" id="goalCurrent" placeholder="e.g., 750" style="width: 100%; padding: 15px; border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 12px; font-size: 16px; background: rgba(255, 255, 255, 0.1); color: white;">
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #F4E5B8;">Deadline <span style="font-weight: 400; color: #9CA3AF;">(optional)</span></label>
            <input type="date" id="goalDeadline" style="width: 100%; padding: 15px; border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 12px; font-size: 16px; background: rgba(255, 255, 255, 0.1); color: white;">
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: flex-end;">
            <button onclick="closeModal()" style="background: rgba(255, 255, 255, 0.1); color: white; border: 2px solid rgba(255, 255, 255, 0.3); padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer;">Cancel</button>
            <button onclick="saveNewGoal()" style="background: linear-gradient(135deg, #D4AF37, #B8941E); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);">Add Goal</button>
        </div>
    `;
}

function saveNewGoal() {
    const title = document.getElementById('goalTitle')?.value.trim();
    const targetInput = document.getElementById('goalTarget')?.value;
    const currentInput = document.getElementById('goalCurrent')?.value;
    const deadline = document.getElementById('goalDeadline')?.value;
    
    if (!title) {
        alert('Please enter a goal title');
        return;
    }
    
    const target = targetInput ? parseFloat(targetInput) : null;
    const current = currentInput ? parseFloat(currentInput) : 0;
    
    const newGoal = {
        id: Date.now(),
        title: title,
        target: target,
        current: current,
        deadline: deadline || null,
        history: current > 0 ? [{ date: new Date().toISOString(), value: current }] : []
    };
    
    goalsData.push(newGoal);
    saveGoalsData();
    renderGoals();
    closeModal();
}

function updateGoalProgress(goalId) {
    const goal = goalsData.find(g => g.id === goalId);
    if (!goal) return;
    
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #D4AF37, #B8941E); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">📊 Update Progress</h2>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #F4E5B8;">${goal.title}</label>
            <input type="number" id="newProgress" placeholder="Enter new value" value="${goal.current}" style="width: 100%; padding: 15px; border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 12px; font-size: 16px; background: rgba(255, 255, 255, 0.1); color: white;" autofocus>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: flex-end;">
            <button onclick="closeModal()" style="background: rgba(255, 255, 255, 0.1); color: white; border: 2px solid rgba(255, 255, 255, 0.3); padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer;">Cancel</button>
            <button onclick="saveProgressUpdate(${goalId})" style="background: linear-gradient(135deg, #D4AF37, #F4E5B8); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);">Update</button>
        </div>
    `;
}

function saveProgressUpdate(goalId) {
    const newValue = parseFloat(document.getElementById('newProgress')?.value);
    
    if (isNaN(newValue)) {
        alert('Please enter a valid number');
        return;
    }
    
    const goal = goalsData.find(g => g.id === goalId);
    if (goal) {
        goal.current = newValue;
        goal.history.push({
            date: new Date().toISOString(),
            value: newValue
        });
        saveGoalsData();
        renderGoals();
        closeModal();
    }
}

function deleteGoal(goalId) {
    if (!confirm('Delete this goal? This cannot be undone.')) {
        return;
    }
    
    goalsData = goalsData.filter(g => g.id !== goalId);
    saveGoalsData();
    renderGoals();
}

function renderGoals() {
    const container = document.getElementById('goalsGrid');
    if (!container) return;
    
    if (goalsData.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(255, 255, 255, 0.05); border-radius: 16px; border: 2px dashed rgba(139, 92, 246, 0.3);">
                <div style="font-size: 48px; margin-bottom: 15px;">🎯</div>
                <div style="font-size: 18px; font-weight: 600; color: #F4E5B8; margin-bottom: 10px;">No goals yet!</div>
                <div style="font-size: 14px; color: #9CA3AF;">Click "Add New Goal" to get started</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    goalsData.forEach(goal => {
        const hasTarget = goal.target !== null && goal.target !== undefined;
        const percentage = hasTarget && goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
        
        html += `
            <div class="goal-card" onclick="showGoalChart(${goal.id})" style="cursor: pointer; transition: transform 0.2s; position: relative;">
                <div class="goal-cover">📈</div>
                <div class="goal-content">
                    <div class="goal-title">${goal.title}</div>
                    <span class="property-pill">In Progress</span>
                    ${hasTarget ? `
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%;"></div>
                        </div>
                        <div class="progress-text">${goal.current.toLocaleString()} / ${goal.target.toLocaleString()} (${percentage}%)</div>
                    ` : `
                        <div style="font-size: 14px; color: #9CA3AF; margin-top: 10px;">Non-measurable goal</div>
                    `}
                    ${goal.deadline ? `<div style="font-size: 12px; color: #D4AF37; margin-top: 8px;">📅 ${goal.deadline}</div>` : ''}
                </div>
                <button onclick="event.stopPropagation(); deleteGoal(${goal.id})" style="position: absolute; top: 10px; right: 10px; background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 2px solid #EF4444; border-radius: 50%; width: 32px; height: 32px; font-size: 16px; cursor: pointer; font-weight: 700;">✕</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function showGoalChart(goalId) {
    const goal = goalsData.find(g => g.id === goalId);
    if (!goal) return;
    
    const modalContent = createModal();
    
    if (!goal.target || goal.history.length === 0) {
        modalContent.innerHTML = `
            <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #D4AF37, #B8941E); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${goal.title}</h2>
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 15px;">📊</div>
                <div style="font-size: 16px; color: #9CA3AF;">This is a non-measurable goal or has no progress data yet.</div>
            </div>
            <button onclick="updateGoalProgress(${goalId})" style="width: 100%; background: linear-gradient(135deg, #D4AF37, #F4E5B8); color: white; border: none; padding: 15px; border-radius: 50px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4); margin-top: 20px;">Update Progress</button>
        `;
        return;
    }
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #D4AF37, #B8941E); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${goal.title}</h2>
        
        <canvas id="goalChart" style="max-height: 400px; margin-bottom: 20px;"></canvas>
        
        <button onclick="updateGoalProgress(${goalId})" style="width: 100%; background: linear-gradient(135deg, #D4AF37, #F4E5B8); color: white; border: none; padding: 15px; border-radius: 50px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);">Update Progress</button>
    `;
    
    renderGoalChart(goal);
}

function renderGoalChart(goal) {
    const canvas = document.getElementById('goalChart');
    if (!canvas) return;
    
    const labels = goal.history.map(h => new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const data = goal.history.map(h => h.value);
    
    if (window.goalChartInstance) {
        window.goalChartInstance.destroy();
    }
    
    window.goalChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Progress',
                    data: data,
                    borderColor: '#D4AF37',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Target',
                    data: Array(labels.length).fill(goal.target),
                    borderColor: '#D4AF37',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#ffffff' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}
