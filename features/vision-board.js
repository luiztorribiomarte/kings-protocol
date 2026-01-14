// ============================================
// VISION BOARD MODULE - Visual goal manifestation
// ============================================

let visionBoardData = {
    images: [null, null, null, null, null, null],
    quotes: [
        "I AM a millionaire by 30",
        "I AM the best version of myself",
        "I AM living my dream life",
        "I AM achieving greatness daily",
        "I AM unstoppable",
        "I AM manifesting my destiny"
    ]
};

// ============================================
// INITIALIZATION
// ============================================

function initVisionBoardData() {
    const saved = localStorage.getItem('visionBoardData');
    if (saved) {
        visionBoardData = JSON.parse(saved);
    }
}

function saveVisionBoardData() {
    localStorage.setItem('visionBoardData', JSON.stringify(visionBoardData));
}

// ============================================
// VISION BOARD RENDERING
// ============================================

function renderVisionBoard() {
    const container = document.getElementById('visionBoardContainer');
    if (!container) return;
    
    container.innerHTML = `
        <!-- Instructions -->
        <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2)); border: 2px solid rgba(139, 92, 246, 0.5); border-radius: 16px; padding: 20px; margin-bottom: 30px;">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 10px; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">✨ Create Your Vision</h3>
            <p style="font-size: 14px; color: #9CA3AF; line-height: 1.6;">
                Click any card to add an image URL. Add images that represent your goals, dreams, and the life you're manifesting. Each card has an affirmation you can customize.
            </p>
        </div>

        <!-- Vision Board Grid (2 rows × 3 columns) -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
            ${visionBoardData.images.map((image, index) => renderVisionCard(image, index)).join('')}
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 15px; justify-content: center;">
            <button onclick="clearAllVisionBoard()" style="background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 2px solid #EF4444; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer;">🗑️ Clear All</button>
        </div>
    `;
}

function renderVisionCard(image, index) {
    const quote = visionBoardData.quotes[index] || "Click to add affirmation";
    
    return `
        <div onclick="openVisionCardModal(${index})" 
             style="position: relative; aspect-ratio: 4/3; border-radius: 16px; overflow: hidden; cursor: pointer; background: ${image ? `url('${image}')` : 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.3))'} center/cover; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); transition: transform 0.3s;"
             onmouseover="this.style.transform='scale(1.05)'"
             onmouseout="this.style.transform='scale(1)'">
            
            ${!image ? `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(236, 72, 153, 0.8)); border: 3px dashed rgba(255, 255, 255, 0.5);">
                    <div style="font-size: 48px; margin-bottom: 10px;">➕</div>
                    <div style="font-size: 14px; font-weight: 600; color: white;">Add Vision</div>
                </div>
            ` : ''}
            
            <!-- Quote Overlay -->
            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent); padding: 20px 15px 15px; color: white;">
                <div style="font-size: 14px; font-weight: 700; text-align: center; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);">${quote}</div>
            </div>
            
            ${image ? `
                <button onclick="event.stopPropagation(); deleteVisionCard(${index})" 
                        style="position: absolute; top: 10px; right: 10px; background: rgba(239, 68, 68, 0.9); color: white; border: none; border-radius: 50%; width: 36px; height: 36px; font-size: 18px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);">✕</button>
            ` : ''}
        </div>
    `;
}

// ============================================
// MODAL & ACTIONS
// ============================================

function openVisionCardModal(index) {
    const image = visionBoardData.images[index];
    const quote = visionBoardData.quotes[index];
    
    const modalContent = createModal();
    
    modalContent.innerHTML = `
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 25px; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">✨ Vision Card ${index + 1}</h2>
        
        <!-- Image Preview -->
        ${image ? `
            <div style="margin-bottom: 20px;">
                <img src="${image}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 12px; border: 2px solid rgba(139, 92, 246, 0.4);">
            </div>
        ` : ''}
        
        <!-- Image URL Input -->
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #A78BFA;">🖼️ Image URL</label>
            <input type="text" 
                   id="visionImageUrl" 
                   value="${image || ''}" 
                   placeholder="Paste image URL (e.g., https://example.com/image.jpg)"
                   style="width: 100%; padding: 15px; border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 12px; font-size: 15px; background: rgba(255, 255, 255, 0.1); color: white;">
            <div style="font-size: 12px; color: #9CA3AF; margin-top: 8px;">💡 Tip: Right-click any image online → Copy Image Address</div>
        </div>
        
        <!-- Quote Input -->
        <div style="margin-bottom: 25px;">
            <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: #A78BFA;">💬 Affirmation / Quote</label>
            <input type="text" 
                   id="visionQuote" 
                   value="${quote}" 
                   placeholder="I AM..."
                   style="width: 100%; padding: 15px; border: 2px solid rgba(139, 92, 246, 0.4); border-radius: 12px; font-size: 15px; background: rgba(255, 255, 255, 0.1); color: white;">
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 15px; justify-content: flex-end;">
            <button onclick="closeModal()" style="background: rgba(255, 255, 255, 0.1); color: white; border: 2px solid rgba(255, 255, 255, 0.3); padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer;">Cancel</button>
            <button onclick="saveVisionCard(${index})" style="background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);">Save Vision</button>
        </div>
    `;
}

function saveVisionCard(index) {
    const imageUrl = document.getElementById('visionImageUrl')?.value.trim();
    const quote = document.getElementById('visionQuote')?.value.trim();
    
    if (!imageUrl && !quote) {
        alert('Please add an image URL or quote');
        return;
    }
    
    visionBoardData.images[index] = imageUrl || null;
    visionBoardData.quotes[index] = quote || visionBoardData.quotes[index];
    
    saveVisionBoardData();
    renderVisionBoard();
    closeModal();
}

function deleteVisionCard(index) {
    if (!confirm('Remove this vision card?')) {
        return;
    }
    
    visionBoardData.images[index] = null;
    saveVisionBoardData();
    renderVisionBoard();
}

function clearAllVisionBoard() {
    if (!confirm('Clear your entire vision board? This cannot be undone.')) {
        return;
    }
    
    visionBoardData.images = [null, null, null, null, null, null];
    saveVisionBoardData();
    renderVisionBoard();
}
