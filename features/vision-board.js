// ============================================
// VISION BOARD MODULE
// ============================================

let visionBoardData = [];

// Initialize vision board data
function initVisionBoardData() {
    const saved = localStorage.getItem('visionBoardData');
    if (saved) {
        visionBoardData = JSON.parse(saved);
    } else {
        // Initialize with 6 empty cards
        visionBoardData = [
            { id: '1', imageUrl: '', affirmation: 'I AM a millionaire by 30' },
            { id: '2', imageUrl: '', affirmation: 'I AM the best version of myself' },
            { id: '3', imageUrl: '', affirmation: 'I AM a successful YouTuber' },
            { id: '4', imageUrl: '', affirmation: 'I AM healthy and strong' },
            { id: '5', imageUrl: '', affirmation: 'I AM living my dream life' },
            { id: '6', imageUrl: '', affirmation: 'I AM abundant and grateful' }
        ];
        saveVisionBoardData();
    }
}

// Save vision board data
function saveVisionBoardData() {
    localStorage.setItem('visionBoardData', JSON.stringify(visionBoardData));
}

// Render vision board
function renderVisionBoard() {
    const container = document.getElementById('visionBoardContainer');
    if (!container) return;

    let html = '<div class="section-title" style="margin-bottom: 20px;">🖼️ Vision Board</div>';
    html += '<div style="margin-bottom: 20px; color: #9CA3AF;">Click any card to add/edit image and affirmation</div>';
    
    html += '<div class="vision-grid">';
    
    visionBoardData.forEach((card, index) => {
        html += `
            <div class="vision-card" onclick="editVisionCard(${index})">
                ${card.imageUrl ? 
                    `<img src="${card.imageUrl}" alt="Vision ${index + 1}">` :
                    `<div style="font-size: 3em; color: rgba(255,255,255,0.3);">+</div>`
                }
                ${card.affirmation ? 
                    `<div class="vision-affirmation">${card.affirmation}</div>` :
                    ''
                }
            </div>
        `;
    });
    
    html += '</div>';
    
    html += '<div style="margin-top: 30px; text-align: center;">';
    html += '<button onclick="clearAllVisionCards()" style="padding: 10px 20px; background: rgba(255,50,50,0.2); border: 1px solid rgba(255,50,50,0.3); border-radius: 8px; color: #ff9999; cursor: pointer;">Clear All Cards</button>';
    html += '</div>';
    
    container.innerHTML = html;
}

// Edit vision card
function editVisionCard(index) {
    const card = visionBoardData[index];
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) return;

    let html = `<h2 style="color: white; margin-bottom: 20px;">Edit Vision Card ${index + 1}</h2>`;
    
    // Current image preview
    if (card.imageUrl) {
        html += `
            <div style="margin-bottom: 20px;">
                <div style="color: #9CA3AF; margin-bottom: 10px;">Current Image:</div>
                <img src="${card.imageUrl}" style="width: 100%; border-radius: 8px; max-height: 200px; object-fit: cover;">
            </div>
        `;
    }
    
    html += '<div class="form-group">';
    html += '<label>Image URL</label>';
    html += `<input type="text" id="visionImageUrl" class="form-input" placeholder="Paste image URL here" value="${card.imageUrl}">`;
    html += '<div style="color: #6B7280; font-size: 0.85em; margin-top: 5px;">Right-click any image online → "Copy Image Address"</div>';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label>Affirmation</label>';
    html += `<input type="text" id="visionAffirmation" class="form-input" placeholder="I AM..." value="${card.affirmation}">`;
    html += '</div>';
    
    html += '<div class="form-actions">';
    html += `<button onclick="saveVisionCard(${index})" class="form-submit">Save</button>`;
    html += `<button onclick="deleteVisionCard(${index})" style="padding: 12px 24px; background: rgba(255,50,50,0.2); border: 1px solid rgba(255,50,50,0.3); border-radius: 8px; color: #ff9999; cursor: pointer;">Delete</button>`;
    html += '<button onclick="closeModal()" class="form-cancel">Cancel</button>';
    html += '</div>';

    modalBody.innerHTML = html;
    modal.style.display = 'flex';
}

// Save vision card
function saveVisionCard(index) {
    const imageUrl = document.getElementById('visionImageUrl').value.trim();
    const affirmation = document.getElementById('visionAffirmation').value.trim();
    
    if (!imageUrl && !affirmation) {
        alert('Please add at least an image URL or affirmation');
        return;
    }
    
    visionBoardData[index].imageUrl = imageUrl;
    visionBoardData[index].affirmation = affirmation;
    
    saveVisionBoardData();
    closeModal();
    renderVisionBoard();
}

// Delete vision card
function deleteVisionCard(index) {
    if (!confirm('Clear this vision card?')) {
        return;
    }
    
    visionBoardData[index].imageUrl = '';
    visionBoardData[index].affirmation = '';
    
    saveVisionBoardData();
    closeModal();
    renderVisionBoard();
}

// Clear all vision cards
function clearAllVisionCards() {
    if (!confirm('Are you sure you want to clear all vision cards? This cannot be undone.')) {
        return;
    }
    
    visionBoardData = [
        { id: '1', imageUrl: '', affirmation: 'I AM a millionaire by 30' },
        { id: '2', imageUrl: '', affirmation: 'I AM the best version of myself' },
        { id: '3', imageUrl: '', affirmation: 'I AM a successful YouTuber' },
        { id: '4', imageUrl: '', affirmation: 'I AM healthy and strong' },
        { id: '5', imageUrl: '', affirmation: 'I AM living my dream life' },
        { id: '6', imageUrl: '', affirmation: 'I AM abundant and grateful' }
    ];
    
    saveVisionBoardData();
    renderVisionBoard();
}
