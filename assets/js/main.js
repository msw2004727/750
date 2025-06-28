// 檔案: assets/js/main.js
// 版本: 2.5 - 美化資訊彈窗(Modal)的顯示方式

// ------------------- 設定 -------------------
const API_BASE_URL = "https://md-server-main.onrender.com";
const TURN_URL = `${API_BASE_URL}/api/generate_turn`;
const ENTITY_INFO_URL = `${API_BASE_URL}/api/get_entity_info`;
const currentGameSessionId = localStorage.getItem('game_session_id');

// ------------------- DOM 元素獲取 -------------------
const narrativeLog = document.getElementById('narrative-log');
const actionOptionsContainer = document.getElementById('action-options');
const promptQuestion = document.getElementById('prompt-question');
const infoRound = document.getElementById('info-round');
const infoTime = document.getElementById('info-time');
const infoLocation = document.getElementById('info-location');
const playerName = document.getElementById('player-name');
const playerHp = document.getElementById('player-hp');
const playerMp = document.getElementById('player-mp');
const sceneCharactersList = document.getElementById('scene-characters-list');

// Modal 相關元素
const modal = document.getElementById('entity-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body'); // 直接獲取 body 容器


// ------------------- 核心功能函數 -------------------

function updateUI(data) {
    // ... (此函數與版本 2.4 完全相同，此處省略以保持簡潔)
    const { narrative, state } = data;
    if (state) {
        infoRound.textContent = state.metadata?.round ?? '---';
        infoTime.textContent = state.metadata?.game_timestamp ?? '---';
        infoLocation.textContent = state.world?.player_current_location_name ?? '---';
        const pc_data = state.pc_data;
        if (pc_data) {
            playerName.textContent = pc_data.basic_info?.name ?? '---';
            playerHp.textContent = `${pc_data.core_status?.hp?.current ?? '--'}/${pc_data.core_status?.hp?.max ?? '--'}`;
            playerMp.textContent = `${pc_data.core_status?.mp?.current ?? '--'}/${pc_data.core_status?.mp?.max ?? '--'}`;
        }
    }
    actionOptionsContainer.innerHTML = '';
    promptQuestion.textContent = '...';
    const optionsRegex = /<options>([\s\S]*?)<\/options>/;
    let optionsContent = '';
    let narrativeParts = narrative;
    const lastPart = narrative[narrative.length - 1];
    if (lastPart.type === 'text' && optionsRegex.test(lastPart.content)) {
        const match = lastPart.content.match(optionsRegex);
        optionsContent = match[1].trim();
        lastPart.content = lastPart.content.replace(optionsRegex, '').trim();
    }
    const p = document.createElement('p');
    narrativeParts.forEach(part => {
        if (part.type === 'text') {
            p.appendChild(document.createTextNode(part.content));
        } else {
            const span = document.createElement('span');
            span.className = `narrative-entity ${part.color_class}`;
            span.textContent = part.text;
            span.dataset.entityId = part.id;
            span.dataset.entityType = part.type;
            p.appendChild(span);
        }
    });
    narrativeLog.appendChild(p);
    if (optionsContent) {
        promptQuestion.textContent = "接下來你打算？";
        const options = optionsContent.split('\n').filter(line => line.trim() !== '');
        options.forEach(opt => {
            const button = document.createElement('button');
            const actionId = opt.substring(0, 1);
            button.dataset.actionId = actionId;
            button.textContent = opt;
            button.addEventListener('click', handleActionSelect);
            actionOptionsContainer.appendChild(button);
        });
    } else {
        promptQuestion.textContent = "劇情正在發展中...";
    }
    narrativeLog.scrollTop = narrativeLog.scrollHeight;
}

async function handleActionSelect(event) {
    // ... (此函數與版本 2.4 完全相同，此處省略以保持簡潔)
    const actionId = event.target.dataset.actionId;
    const actionText = event.target.textContent;
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
                player_action: { id: actionId, text: actionText.substring(3).trim() },
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

// 【核心修改】處理點擊實體的函數，重寫內容渲染邏輯
async function handleEntityClick(event) {
    const target = event.target;
    if (!target.classList.contains('narrative-entity')) {
        return;
    }

    const { entityId, entityType } = target.dataset;

    modal.classList.remove('hidden');
    modalTitle.textContent = target.textContent;
    modalBody.innerHTML = '<div class="loading-spinner"></div><p>正在從江湖密卷中查詢資料...</p>'; // 載入中狀態

    try {
        const response = await fetch(ENTITY_INFO_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentGameSessionId, entity_id: entityId, entity_type: entityType }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || "查詢失敗");
        }

        const entityData = result.data;
        modalTitle.textContent = entityData.name || target.textContent;
        
        // --- 創建精美的內容版面 ---
        let contentHtml = '<div class="info-grid">';

        // 根據不同實體類型，顯示不同資訊
        if (entityType === 'npc') {
            contentHtml += `<strong>稱號:</strong><span>${entityData.name || '未知'}</span>`;
            
            if (entityData.mood) {
                // 根據心情給予不同顏色
                let moodColorClass = "mood-text-neutral";
                const positiveMoods = ["開心", "友好", "興奮", "尊敬"];
                const negativeMoods = ["憤怒", "憂慮", "敵對", "輕蔑"];
                if (positiveMoods.includes(entityData.mood)) moodColorClass = "mood-text-positive";
                if (negativeMoods.includes(entityData.mood)) moodColorClass = "mood-text-negative";
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

        // 描述永遠放在最下方
        if (entityData.description) {
            contentHtml += `<p class="description-text">"${entityData.description}"</p>`;
        }

        modalBody.innerHTML = contentHtml;

    } catch (error) {
        modalBody.innerHTML = `<p>查詢失敗: ${error.message}</p>`;
    }
}

function initializeGame() {
    // ... (此函數與版本 2.4 完全相同，此處省略)
    if (!currentGameSessionId) {
        alert("偵測到您尚未登入，將為您導向登入頁面。");
        window.location.href = 'login.html';
        return;
    }
    narrativeLog.innerHTML = `<h2>文字江湖</h2><p>正在載入您的江湖傳說...</p>`;
    promptQuestion.textContent = "準備開始您的冒險...";
    actionOptionsContainer.innerHTML = '<button id="start-game-btn">載入遊戲 / 始動</button>';
    document.getElementById('start-game-btn').addEventListener('click', (e) => {
         handleActionSelect({ target: { dataset: { actionId: 'START' }, textContent: 'A. 載入遊戲 / 始動' } });
    });
    narrativeLog.addEventListener('click', handleEntityClick);
    modalCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeGame);
