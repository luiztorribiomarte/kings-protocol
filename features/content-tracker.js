// ============================================
// CONTENT TRACKER MODULE
// ============================================

let contentData = {
    subscribers: 0,
    videosThisMonth: 0,
    hoursLogged: 0,
    videoIdeas: [],
    notes: ''
};

// Initialize content data
function initContentData() {
    const saved = localStorage.getItem('contentData');
    if (saved) {
        contentData = JSON.parse(saved);
    }
}

// Save content data
function saveContentData() {
    localStorage.setItem('contentData', JSON.stringify(contentData));
}

// Render content tracker
function renderContentTracker() {
    const container = document.getElementById('contentContainer');
    if (!container) return;

    let html = '<div class="section-title" style="margin-bottom: 20px;">🎬 Content Tracker</div>';
    
    // Stats Cards
    html += '<div class="content-stats">';
    
    // Subscribers
    html += '<div class="content-stat-card">';
    html += '<div style="color: #9CA3AF; margin-bottom: 10px;">YouTube Subscribers</div>';
    html += `<div style="font-size: 2.5em; color: white; font-weight: bold; margin-bottom: 10px;">${contentData.subscribers.toLocaleString()}</div>`;
    html += '<div style="display: flex; gap: 5px;">';
    html += '<input type="number" id="subsInput" placeholder="Update count" style="flex: 1; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: white;">';
    html += '<button onclick="updateSubscribers()" style="padding: 8px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: white; cursor: pointer;">Update</button>';
    html += '</div>';
    html += '</div>';
    
    // Videos This Month
    html += '<div class="content-stat-card">';
    html += '<div style="color: #9CA3AF; margin-bottom: 10px;">Videos This Month</div>';
    html += `<div style="font-size: 2.5em; color: white; font-weight: bold; margin-bottom: 10px;">${contentData.videosThisMonth}</div>`;
    html += '<div style="display: flex; gap: 5px;">';
    html += '<button onclick="changeVideosCount(-1)" style="padding: 8px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: white; cursor: pointer; font-size: 1.2em;">-</button>';
    html += '<button onclick="changeVideosCount(1)" style="padding: 8px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: white; cursor: pointer; font-size: 1.2em;">+</button>';
    html += '</div>';
    html += '</div>';
    
    // Hours Logged
    html += '<div class="content-stat-card">';
    html += '<div style="color: #9CA3AF; margin-bottom: 10px;">Hours Logged</div>';
    html += `<div style="font-size: 2.5em; color: white; font-weight: bold; margin-bottom: 10px;">${contentData.hoursLogged}</div>`;
    html += '<div style="display: flex; gap: 5px;">';
    html += '<button onclick="changeHoursLogged(-1)" style="padding: 8px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: white; cursor: pointer; font-size: 1.2em;">-</button>';
    html += '<button onclick="changeHoursLogged(1)" style="padding: 8px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: white; cursor: pointer; font-size: 1.2em;">+</button>';
    html += '</div>';
    html += '</div>';
    
    html += '</div>';
    
    // Video Ideas
    html += '<div class="ideas-list" style="margin-top: 30px;">';
    html += '<div class="section-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">';
    html += '<span>💡 Video Ideas</span>';
    html += '<button onclick="addVideoIdea()" style="padding: 8px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; cursor: pointer;">➕ Add Idea</button>';
    html += '</div>';
    
    if (contentData.videoIdeas.length === 0) {
        html += '<div style="text-align: center; color: #6B7280; padding: 30px;">No video ideas yet. Click "Add Idea" to start!</div>';
    } else {
        contentData.videoIdeas.forEach((idea, index) => {
            html += '<div class="idea-item">';
            html += `<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">`;
            html += `<div style="flex: 1;"><strong style="color: white;">${idea.title}</strong></div>`;
            html += `<button onclick="deleteVideoIdea(${index})" style="padding: 4px 12px; background: rgba(255,50,50,0.2); border: 1px solid rgba(255,50,50,0.3); border-radius: 6px; color: #ff9999; cursor: pointer; font-size: 0.85em;">Delete</button>`;
            html += '</div>';
            if (idea.description) {
                html += `<div style="color: #9CA3AF; font-size: 0.9em;">${idea.description}</div>`;
            }
            html += '</div>';
        });
    }
    
    html += '</div>';
    
    // Notes Section
    html += '<div class="ideas-list" style="margin-top: 30px;">';
    html += '<div class="section-title" style="margin-bottom: 15px;">📝 Content Notes</div>';
    html += '<textarea id="contentNotes" placeholder="Upload schedule, research notes, script ideas, etc." style="width: 100%; min-height: 200px; padding: 15px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: white; font-family: inherit; resize: vertical;" onchange="saveContentNotes()">';
    html += contentData.notes;
    html += '</textarea>';
    html += '</div>';
    
    container.innerHTML = html;
}

// Update subscribers
function updateSubscribers() {
    const input = document.getElementById('subsInput');
    const value = parseInt(input.value);
    
    if (!value || value < 0) {
        alert('Please enter a valid number');
        return;
    }
    
    contentData.subscribers = value;
    saveContentData();
    input.value = '';
    renderContentTracker();
}

// Change videos count
function changeVideosCount(delta) {
    contentData.videosThisMonth = Math.max(0, contentData.videosThisMonth + delta);
    saveContentData();
    renderContentTracker();
}

// Change hours logged
function changeHoursLogged(delta) {
    contentData.hoursLogged = Math.max(0, contentData.hoursLogged + delta);
    saveContentData();
    renderContentTracker();
}

// Add video idea
function addVideoIdea() {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) return;

    let html = '<h2 style="color: white; margin-bottom: 20px;">Add Video Idea</h2>';
    
    html += '<div class="form-group">';
    html += '<label>Video Title *</label>';
    html += '<input type="text" id="ideaTitle" class="form-input" placeholder="e.g., Top 10 Ancient Civilizations">';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label>Description (Optional)</label>';
    html += '<textarea id="ideaDescription" class="form-input" rows="4" placeholder="Brief description, angle, or notes..."></textarea>';
    html += '</div>';
    
    html += '<div class="form-actions">';
    html += '<button onclick="saveVideoIdea()" class="form-submit">Add Idea</button>';
    html += '<button onclick="closeModal()" class="form-cancel">Cancel</button>';
    html += '</div>';

    modalBody.innerHTML = html;
    modal.style.display = 'flex';
}

// Save video idea
function saveVideoIdea() {
    const title = document.getElementById('ideaTitle').value.trim();
    const description = document.getElementById('ideaDescription').value.trim();
    
    if (!title) {
        alert('Please enter a video title');
        return;
    }
    
    contentData.videoIdeas.push({
        id: Date.now().toString(),
        title,
        description,
        createdAt: new Date().toISOString()
    });
    
    saveContentData();
    closeModal();
    renderContentTracker();
}

// Delete video idea
function deleteVideoIdea(index) {
    if (!confirm('Delete this video idea?')) {
        return;
    }
    
    contentData.videoIdeas.splice(index, 1);
    saveContentData();
    renderContentTracker();
}

// Save content notes
function saveContentNotes() {
    const notes = document.getElementById('contentNotes').value;
    contentData.notes = notes;
    saveContentData();
}
