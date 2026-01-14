// ============================================
// CONTENT TRACKER MODULE - YouTube content tracking
// ============================================

let contentData = {
    subscriberCount: 750,
    videosThisMonth: 0,
    hoursLogged: 0,
    ideas: [],
    notes: ''
};

// ============================================
// INITIALIZATION
// ============================================

function initContentData() {
    const saved = localStorage.getItem('contentData');
    if (saved) {
        contentData = JSON.parse(saved);
    }
}

function saveContentData() {
    localStorage.setItem('contentData', JSON.stringify(contentData));
}

// ============================================
// CONTENT TRACKER RENDERING
// ============================================

function renderContentTracker() {
    const container = document.getElementById('contentTrackerContainer');
    if (!container) return;
    
    container.innerHTML = `
        <!-- Stats Cards -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
            <!-- Subscribers -->
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #262626 100%); border: 1px solid #3a3a3a; border-radius: 16px; padding: 25px; text-align: center;">
                <div style="font-size: 14px; color: #6B7280; margin-bottom: 10px; text-transform: uppercase;">📺 Subscribers</div>
                <div style="font-size: 48px; font-weight: 900; color: #ffffff; margin-bottom: 15px;">${contentData.subscriberCount.toLocaleString()}</div>
                <button onclick="updateSubscribers()" style="width: 100%; background: #ffffff; color: #000000; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px;">Update Count</button>
            </div>
            
            <!-- Videos This Month -->
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #262626 100%); border: 1px solid #3a3a3a; border-radius: 16px; padding: 25px; text-align: center;">
                <div style="font-size: 14px; color: #6B7280; margin-bottom: 10px; text-transform: uppercase;">🎬 Videos This Month</div>
                <div style="font-size: 48px; font-weight: 900; color: #ffffff; margin-bottom: 15px;">${contentData.videosThisMonth}</div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="changeVideos(1)" style="flex: 1; background: #ffffff; color: #000000; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 18px;">+</button>
                    <button onclick="changeVideos(-1)" style="flex: 1; background: #262626; color: #ffffff; border: 1px solid #3a3a3a; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 18px;">−</button>
                </div>
            </div>
            
            <!-- Hours Logged -->
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #262626 100%); border: 1px solid #3a3a3a; border-radius: 16px; padding: 25px; text-align: center;">
                <div style="font-size: 14px; color: #6B7280; margin-bottom: 10px; text-transform: uppercase;">⏱️ Hours Logged</div>
                <div style="font-size: 48px; font-weight: 900; color: #ffffff; margin-bottom: 15px;">${contentData.hoursLogged}</div>
                <button onclick="logHours()" style="width: 100%; background: #ffffff; color: #000000; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px;">Log Hours</button>
            </div>
        </div>

        <!-- Video Ideas -->
        <div style="background: #0d0d0d; border: 1px solid #262626; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="font-size: 20px; font-weight: 700; color: #ffffff;">💡 Video Ideas</h3>
                <button onclick="addVideoIdea()" style="background: #ffffff; color: #000000; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px;">+ Add Idea</button>
            </div>
            
            <div id="videoIdeasList">
                ${renderVideoIdeas()}
            </div>
        </div>

        <!-- Notes Section -->
        <div style="background: #0d0d0d; border: 1px solid #262626; border-radius: 16px; padding: 30px;">
            <h3 style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 20px;">📝 Content Notes</h3>
            <textarea 
                id="contentNotes"
                onchange="saveContentNotes(this.value)"
                placeholder="Upload schedule, ideas, research notes, scripts in progress..."
                style="width: 100%; min-height: 200px; padding: 20px; border: 1px solid #3a3a3a; border-radius: 12px; font-size: 15px; background: #1a1a1a; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; resize: vertical;"
            >${contentData.notes}</textarea>
            <div style="font-size: 12px; color: #6B7280; margin-top: 10px;">Auto-saves as you type</div>
        </div>
    `;
}

function renderVideoIdeas() {
    if (contentData.ideas.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; background: #1a1a1a; border: 2px dashed #3a3a3a; border-radius: 12px;">
                <div style="font-size: 32px; margin-bottom: 10px;">💡</div>
                <div style="font-size: 14px; color: #6B7280;">No video ideas yet. Click "Add Idea" to get started!</div>
            </div>
        `;
    }
    
    return contentData.ideas.map((idea, index) => `
        <div style="background: #1a1a1a; border: 1px solid #3a3a3a; border-radius: 12px; padding: 20px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 5px;">${idea.title}</div>
                ${idea.description ? `<div style="font-size: 14px; color: #9CA3AF;">${idea.description}</div>` : ''}
            </div>
            <button onclick="deleteVideoIdea(${index})" style="background: rgba(255, 255, 255, 0.1); color: #ffffff; border: 1px solid #3a3a3a; border-radius: 8px; padding: 8px 16px; font-weight: 600; cursor: pointer; font-size: 13px;">Delete</button>
        </div>
    `).join('');
}

// ============================================
// CONTENT ACTIONS
// ============================================

function updateSubscribers() {
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 25px; color: #ffffff;">📺 Update Subscriber Count</h2>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #9CA3AF;">Current Subscribers</label>
            <input type="number" 
                   id="subscriberInput" 
                   value="${contentData.subscriberCount}" 
                   placeholder="750"
                   style="width: 100%; padding: 15px; border: 1px solid #3a3a3a; border-radius: 12px; font-size: 18px; background: #1a1a1a; color: white; font-weight: 700;">
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: flex-end;">
            <button onclick="closeModal()" style="background: #262626; color: white; border: 1px solid #3a3a3a; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;">Cancel</button>
            <button onclick="saveSubscribers()" style="background: #ffffff; color: #000000; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;">Save</button>
        </div>
    `;
}

function saveSubscribers() {
    const input = document.getElementById('subscriberInput');
    const count = parseInt(input?.value);
    
    if (isNaN(count) || count < 0) {
        alert('Please enter a valid number');
        return;
    }
    
    contentData.subscriberCount = count;
    saveContentData();
    renderContentTracker();
    closeModal();
}

function changeVideos(amount) {
    contentData.videosThisMonth = Math.max(0, contentData.videosThisMonth + amount);
    saveContentData();
    renderContentTracker();
}

function logHours() {
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 25px; color: #ffffff;">⏱️ Log Content Hours</h2>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #9CA3AF;">Hours to Add</label>
            <input type="number" 
                   id="hoursInput" 
                   placeholder="0"
                   step="0.5"
                   style="width: 100%; padding: 15px; border: 1px solid #3a3a3a; border-radius: 12px; font-size: 18px; background: #1a1a1a; color: white; font-weight: 700;">
            <div style="font-size: 12px; color: #6B7280; margin-top: 8px;">Current total: ${contentData.hoursLogged} hours</div>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: flex-end;">
            <button onclick="closeModal()" style="background: #262626; color: white; border: 1px solid #3a3a3a; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;">Cancel</button>
            <button onclick="saveHours()" style="background: #ffffff; color: #000000; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;">Add Hours</button>
        </div>
    `;
}

function saveHours() {
    const input = document.getElementById('hoursInput');
    const hours = parseFloat(input?.value);
    
    if (isNaN(hours) || hours <= 0) {
        alert('Please enter a valid number');
        return;
    }
    
    contentData.hoursLogged += hours;
    saveContentData();
    renderContentTracker();
    closeModal();
}

function addVideoIdea() {
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 25px; color: #ffffff;">💡 Add Video Idea</h2>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #9CA3AF;">Video Title</label>
            <input type="text" 
                   id="ideaTitle" 
                   placeholder="e.g., Top 10 Military Strategies"
                   style="width: 100%; padding: 15px; border: 1px solid #3a3a3a; border-radius: 12px; font-size: 15px; background: #1a1a1a; color: white;" autofocus>
        </div>
        
        <div style="margin-bottom: 25px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #9CA3AF;">Description (Optional)</label>
            <textarea 
                id="ideaDescription" 
                placeholder="Brief notes, angle, research needed..."
                style="width: 100%; min-height: 100px; padding: 15px; border: 1px solid #3a3a3a; border-radius: 12px; font-size: 15px; background: #1a1a1a; color: white; resize: vertical;"></textarea>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: flex-end;">
            <button onclick="closeModal()" style="background: #262626; color: white; border: 1px solid #3a3a3a; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;">Cancel</button>
            <button onclick="saveVideoIdea()" style="background: #ffffff; color: #000000; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;">Add Idea</button>
        </div>
    `;
}

function saveVideoIdea() {
    const title = document.getElementById('ideaTitle')?.value.trim();
    const description = document.getElementById('ideaDescription')?.value.trim();
    
    if (!title) {
        alert('Please enter a video title');
        return;
    }
    
    contentData.ideas.push({
        title: title,
        description: description,
        addedDate: new Date().toISOString()
    });
    
    saveContentData();
    renderContentTracker();
    closeModal();
}

function deleteVideoIdea(index) {
    if (!confirm('Delete this video idea?')) {
        return;
    }
    
    contentData.ideas.splice(index, 1);
    saveContentData();
    renderContentTracker();
}

function saveContentNotes(value) {
    contentData.notes = value;
    saveContentData();
}
