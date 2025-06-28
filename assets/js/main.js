// 檔案: assets/js/main.js
// 版本: 3.0 - 全新手機版面UI邏輯

// ------------------- 設定 -------------------
const API_BASE_URL = "https://md-server-main.onrender.com";
const TURN_URL = `${API_BASE_URL}/api/generate_turn`;
const ENTITY_INFO_URL = `${API_BASE_URL}/api/get_entity_info`;
const SUMMARY_URL = `${API_BASE_URL}/api/get_summary`;
const currentGameSessionId = localStorage.getItem('game_session_id');

// ------------------- DOM 元素獲取 -------------------
const narrativeLog = document.getElementById('narrative-log');
const actionOptionsContainer = document.getElementById('action-options');
const promptQuestion = document.getElementById('prompt-question');
const customActionForm = document.getElementById('custom-action-form');
const customActionInput = document.getElementById('custom-action-input');

// 新的頂部按鈕
const statusBtn = document.getElementById('status-btn');
const inventoryBtn = document.getElementById('inventory-btn');
const mapBtn = document.getElementById('map-btn');

// 通用 Modal 元素
const modal = document.getElementById('info-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

// 用於儲存最新的遊戲狀態
let latestGameState = {};

// ------------------- 核心功能函數 -------------------

function updateUI(data) {
    const { narrative, state } = data;
    // 更新並儲存最新狀態
    if (state) {
        latestGameState = state;
    }

    // 渲染敘事和選項 (與舊版類似，但不再更新側邊欄)
    const optionsRegex = /<options>([\s\S]*?)<\/options>/;
    let optionsContent = '';
    for (let i = narrative.length - 1; i >= 0; i--) {
        const part = narrative[i];
        if (part.type === 'text' && optionsRegex.test(part.content)) {
            const match = part.content.match(optionsRegex);
            optionsContent = match[1].trim();
            part.content = part.content.replace(optionsRegex, '').trim();
            if (part.content === '') { narrative.splice(i, 1); }
            break;
        }
    }
    
    if (narrative.some(part => part.content && part.content.trim() !== '')) {
        const p = document.createElement('p');
        narrative.forEach(part => {
            if (part.type === 'text') {
                p.appendChild(document.createTextNode(part.content));
            } else {
                const span = document.createElement('span');
                span.className = `narrative-entity ${part.color_class || ''}`;
                span.textContent = part.text;
                span.dataset.entityId = part.id;
                span.dataset.entityType = part.type;
                p.appendChild(span);
            }
        });
        narrativeLog.appendChild(p);
    }
    
    actionOptionsContainer.innerHTML = '';
    if (optionsContent) {
        promptQuestion.textContent = "接下來你打算？";
        const emojiMap = { 'A': '🤔', 'B': '🗺️', 'C': '🗣️', 'D': '⚔️' };
        const options = optionsContent.split('\n').filter(line => line.trim() !== '').slice(0, 3);
        options.forEach(opt => {
            const button = document.createElement('button');
            const actionId = opt.substring(0, 1);
            const emoji = emojiMap[actionId] || '👉';
            button.dataset.actionId = actionId;
            button.innerHTML = `<span class="emoji">${emoji}</span><span>${opt}</span>`;
            button.addEventListener('click', handleActionSelect);
            actionOptionsContainer.appendChild(button);
        });
    } else {
        promptQuestion.textContent = "劇情正在發展中...";
    }

    narrativeLog.scrollTop = narrativeLog.scrollHeight;
}

// 【核心修改】顯示資訊彈窗的通用函數
function showInfoModal(title, contentHtml) {
    modalTitle.textContent = title;
    modalBody.innerHTML = contentHtml;
    modal.classList.remove('hidden');
}

// 處理點擊頂部「角色狀態」按鈕
function handleStatusBtnClick() {
    const pc_data = latestGameState.pc_data || {};
    const basic_info = pc_data.basic_info || {};
    const core_status = pc_data.core_status || {};

    let contentHtml = '<div class="info-grid">';
    contentHtml += `<strong>姓名:</strong><span>${basic_info.name || '---'}</span>`;
    contentHtml += `<strong>性別:</strong><span>${basic_info.gender || '---'}</span>`;
    contentHtml += `<strong>身高:</strong><span>${basic_info.height || '---'} cm</span>`;
    contentHtml += `<strong>體重:</strong><span>${basic_info.weight || '---'} kg</span>`;
    contentHtml += `<strong>氣血:</strong><span>${core_status.hp?.current}/${core_status.hp?.max}</span>`;
    contentHtml += `<strong>內力:</strong><span>${core_status.mp?.current}/${core_status.mp?.max}</span>`;
    contentHtml += `<strong>體力:</strong><span>${core_status.sta?.current}/${core_status.sta?.max}</span>`;
    contentHtml += '</div>';
    
    showInfoModal("角色狀態", contentHtml);
}

// 處理點擊頂部「行囊」按鈕 (背包)
function handleInventoryBtnClick() {
    const inventory = latestGameState.pc_data?.inventory?.carried || [];
    let contentHtml = '';

    if (inventory.length > 0) {
        inventory.forEach(item => {
            contentHtml += `<div class="info-grid" style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">`;
            contentHtml += `<strong>${item.name}</strong><span>${item.description || ''}</span>`;
            contentHtml += `</div>`;
        });
    } else {
        contentHtml = '<p>你的行囊空空如也。</p>';
    }
    
    showInfoModal("行囊", contentHtml);
}

// 處理點擊頂部「地區資訊」按鈕
function handleMapBtnClick() {
    const world = latestGameState.world || {};
    const locations = latestGameState.locations || {};
    const currentLocation = locations[world.player_current_location_id] || {};

    let contentHtml = `<p><strong>當前位置:</strong> ${world.player_current_location_name || '未知'}</p>`;
    contentHtml += `<p class="description-text">"${currentLocation.description || '你對此地一無所知...'}"</p>`;
    
    showInfoModal("地區資訊", contentHtml);
}


async function handleActionSelect(event) {
    const button = event.currentTarget;
    const actionId = button.dataset.actionId;
    const actionText = button.textContent;
    const playerPromptP = document.createElement('p');
    playerPromptP.innerHTML = `<strong>> ${actionText}</strong>`;
    playerPromptP.classList.add('player-prompt');
    narrativeLog.appendChild(playerPromptP);
    narrativeLog.scrollTop = narrativeLog.scrollHeight;
    promptQuestion.textContent = "AI 正在運算中，請稍候...";
    actionOptionsContainer.innerHTML = '<div class="loading-spinner"></div>';
    try {
        const response = await fetch(TURN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentGameSessionId,
                player_action: { id: actionId, text: actionText.replace(/^[^\w]+/, '').trim() },
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `伺服器錯誤: ${response.status}`);
        }
        const data = await response.json();
        if (data.narrative && data.state) {
            updateUI(data);
        } else {
            throw new Error("AI 回應格式不正確。");
        }
    } catch (error) {
        console.error("請求失敗:", error);
        promptQuestion.textContent = "發生錯誤！";
        actionOptionsContainer.innerHTML = `<p style="color: red;">與伺服器連線失敗: ${error.message}</p><button onclick="location.reload()">重新載入</button>`;
    }
}

async function handleEntityClick(event) {
    const target = event.target.closest('.narrative-entity');
    if (!target) return;
    const { entityId, entityType } = target.dataset;
    modal.classList.remove('hidden');
    modalTitle.textContent = target.textContent;
    modalBody.innerHTML = '<div class="loading-spinner"></div><p>正在從江湖密卷中查詢資料...</p>';
    try {
        const response = await fetch(ENTITY_INFO_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentGameSessionId, entity_id: entityId, entity_type: entityType }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "查詢失敗");
        const entityData = result.data;
        modalTitle.textContent = entityData.name || target.textContent;
        let contentHtml = '<div class="info-grid">';
        if (entityType === 'npc') {
            contentHtml += `<strong>稱號:</strong><span>${entityData.name || '未知'}</span>`;
            if (entityData.mood) {
                let moodColorClass = "mood-text-neutral";
                if (["開心", "友好", "興奮", "尊敬"].includes(entityData.mood)) moodColorClass = "mood-text-positive";
                if (["憤怒", "憂慮", "敵對", "輕蔑"].includes(entityData.mood)) moodColorClass = "mood-text-negative";
                contentHtml += `<strong>心情:</strong><span class="${moodColorClass}">${entityData.mood}</span>`;
            }
            if (entityData.relationship) {
                contentHtml += `<strong>好感:</strong><span>${entityData.relationship.friendliness || 0}</span>`;
                contentHtml += `<strong>敬意:</strong><span>${entityData.relationship.respect || 0}</span>`;
            }
        } else if (entityType === 'item') {
            contentHtml += `<strong>名稱:</strong><span>${entityData.name || '未知'}</span>`;
            if (entityData.type) contentHtml += `<strong>類型:</strong><span>${entityData.type}</span>`;
            if (entityData.damage) contentHtml += `<strong>威力:</strong><span>${entityData.damage}</span>`;
            if (entityData.weight) contentHtml += `<strong>重量:</strong><span>${entityData.weight}</span>`;
        }
        contentHtml += '</div>';
        if (entityData.description) contentHtml += `<p class="description-text">"${entityData.description}"</p>`;
        modalBody.innerHTML = contentHtml;
    } catch (error) {
        modalBody.innerHTML = `<p>查詢失敗: ${error.message}</p>`;
    }
}

function handleCustomActionSubmit(event) {
    event.preventDefault();
    const actionText = customActionInput.value.trim();
    if (!actionText) return;
    customActionInput.value = '';
    handleActionSelect({
        currentTarget: { dataset: { actionId: 'CUSTOM' }, textContent: `> ${actionText}` }
    });
}

async function initializeGame() {
    if (!currentGameSessionId) {
        alert("偵測到您尚未登入，將為您導向登入頁面。");
        window.location.href = 'login.html';
        return;
    }
    narrativeLog.innerHTML = `<h2>文字江湖</h2>`;
    promptQuestion.textContent = "準備開始您的冒險...";
    actionOptionsContainer.innerHTML = '<div class="loading-spinner"></div> <p>正在載入您的江湖傳說...</p>';
    try {
        const summaryResponse = await fetch(SUMMARY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentGameSessionId }),
        });
        const summaryResult = await summaryResponse.json();
        if (!summaryResponse.ok) throw new Error(summaryResult.error || "獲取前情提要失敗");
        
        const summaryP = document.createElement('p');
        summaryP.style.fontStyle = 'italic';
        summaryP.style.color = '#ccc';
        summaryP.textContent = summaryResult.summary;
        narrativeLog.appendChild(summaryP);
        
        const turnResponse = await fetch(TURN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentGameSessionId, player_action: { id: 'START' } }),
        });
        const turnResult = await turnResponse.json();
        if (!turnResponse.ok) throw new Error(turnResult.error || "載入遊戲回合失敗");
        updateUI(turnResult);
    } catch (error) {
        console.error("遊戲初始化失敗:", error);
        actionOptionsContainer.innerHTML = `<p style="color: red;">遊戲初始化失敗: ${error.message}</p><button onclick="location.reload()">重新載入</button>`;
    }
    
    // 綁定所有事件監聽
    customActionForm.addEventListener('submit', handleCustomActionSubmit);
    narrativeLog.addEventListener('click', handleEntityClick);
    modalCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
    
    // 【核心新增】為頂部按鈕綁定事件
    statusBtn.addEventListener('click', handleStatusBtnClick);
    inventoryBtn.addEventListener('click', handleInventoryBtnClick);
    mapBtn.addEventListener('click', handleMapBtnClick);
}

document.addEventListener('DOMContentLoaded', initializeGame);
