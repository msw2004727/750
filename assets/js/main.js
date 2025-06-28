// 檔案: assets/js/main.js
// 版本: 2.8 - BUG修復與UI美化(按鈕Emoji)

// ------------------- 設定 -------------------
const API_BASE_URL = "https://md-server-main.onrender.com";
const TURN_URL = `${API_BASE_URL}/api/generate_turn`;
const ENTITY_INFO_URL = `${API_BASE_URL}/api/get_entity_info`;
const currentGameSessionId = localStorage.getItem('game_session_id');

// ------------------- DOM 元素獲取 -------------------
// ... (與上一版相同)
const narrativeLog = document.getElementById('narrative-log');
const actionOptionsContainer = document.getElementById('action-options');
const promptQuestion = document.getElementById('prompt-question');
const customActionForm = document.getElementById('custom-action-form');
const customActionInput = document.getElementById('custom-action-input');
const infoRound = document.getElementById('info-round');
const infoTime = document.getElementById('info-time');
const infoLocation = document.getElementById('info-location');
const playerName = document.getElementById('player-name');
const playerHp = document.getElementById('player-hp');
const playerMp = document.getElementById('player-mp');
const sceneCharactersList = document.getElementById('scene-characters-list');
const modal = document.getElementById('entity-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');


// ------------------- 核心功能函數 -------------------

function updateUI(data) {
    const { narrative, state } = data;
    if (state) {
        // ... (更新側邊欄資訊的邏輯與上一版相同)
        const metadata = state.metadata || {};
        const world = state.world || {};
        infoRound.textContent = metadata.round ?? '---';
        infoTime.textContent = metadata.game_timestamp ?? '---';
        infoLocation.textContent = world.player_current_location_name ?? '---';
        const pc_data = state.pc_data;
        if (pc_data) {
            playerName.textContent = pc_data.basic_info?.name ?? '---';
            playerHp.textContent = `${pc_data.core_status?.hp?.current ?? '--'}/${pc_data.core_status?.hp?.max ?? '--'}`;
            playerMp.textContent = `${pc_data.core_status?.mp?.current ?? '--'}/${pc_data.core_status?.mp?.max ?? '--'}`;
        }
        sceneCharactersList.innerHTML = '';
        const allNpcs = state.npcs || {};
        const playerLocation = world.player_current_location_name;
        const charactersInScene = Object.values(allNpcs).filter(npc => npc.current_location_name === playerLocation);
        if (charactersInScene.length > 0) {
            charactersInScene.forEach(npc => {
                const li = document.createElement('li');
                li.textContent = npc.name;
                li.className = 'narrative-entity text-entity-npc';
                li.dataset.entityId = npc.id;
                li.dataset.entityType = 'npc';
                sceneCharactersList.appendChild(li);
            });
        } else {
            sceneCharactersList.innerHTML = '<li>此地似乎空無一人。</li>';
        }
    }
    
    // --- 敘事區渲染邏輯 (與上一版相同) ---
    const optionsRegex = /<options>([\s\S]*?)<\/options>/;
    let optionsContent = '';
    // 遍歷 narrative 陣列來安全地移除 options
    for (let i = narrative.length - 1; i >= 0; i--) {
        const part = narrative[i];
        if (part.type === 'text' && optionsRegex.test(part.content)) {
            const match = part.content.match(optionsRegex);
            optionsContent = match[1].trim();
            part.content = part.content.replace(optionsRegex, '').trim();
            if (part.content === '') { // 如果移除後為空，則刪除這個物件
                narrative.splice(i, 1);
            }
            break; // 找到並處理後就跳出
        }
    }
    
    const p = document.createElement('p');
    narrative.forEach(part => {
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
    
    // --- 【核心修改】行動選項渲染邏輯 ---
    actionOptionsContainer.innerHTML = '';
    if (optionsContent) {
        promptQuestion.textContent = "接下來你打算？";
        // 定義 emoji 映射表
        const emojiMap = {
            'A': '🤔', 'B': '🗺️', 'C': '🗣️', 'D': '⚔️',
            '1': '1️⃣', '2': '2️⃣', '3': '3️⃣', '4': '4️⃣'
        };
        const options = optionsContent.split('\n').filter(line => line.trim() !== '');
        
        options.forEach(opt => {
            const button = document.createElement('button');
            const actionId = opt.substring(0, 1);
            const emoji = emojiMap[actionId] || '👉'; // 如果沒有對應的emoji，使用預設值
            
            button.dataset.actionId = actionId;
            // 格式: emoji + 選項文字
            button.innerHTML = `<span class="emoji">${emoji}</span><span>${opt}</span>`;
            button.addEventListener('click', handleActionSelect);
            actionOptionsContainer.appendChild(button);
        });
    } else {
        promptQuestion.textContent = "劇情正在發展中...";
    }

    narrativeLog.scrollTop = narrativeLog.scrollHeight;
}


async function handleActionSelect(event) {
    // 使用 .currentTarget 來確保事件綁定在按鈕上
    const button = event.currentTarget;
    const actionId = button.dataset.actionId;
    // 直接取用按鈕的完整文字，而不是從 event.target
    const actionText = button.textContent;

    const playerPromptP = document.createElement('p');
    // 顯示時，也包含 emoji
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
                player_action: {
                    id: actionId,
                    // 【核心修改】更穩健地提取純文字
                    text: actionText.replace(/^[^\w]+/, '').trim() // 移除開頭所有非文字字元
                },
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
    // ... (此函數與版本 2.7 完全相同)
    const target = event.target.closest('.narrative-entity'); // 更穩健的目標選擇
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
    // ... (此函數與版本 2.7 完全相同)
    event.preventDefault();
    const actionText = customActionInput.value.trim();
    if (!actionText) return;
    customActionInput.value = '';
    handleActionSelect({
        currentTarget: { // 使用 currentTarget 以匹配 handleActionSelect 的期望
            dataset: { actionId: 'CUSTOM' },
            textContent: `> ${actionText}`
        }
    });
}

function initializeGame() {
    if (!currentGameSessionId) {
        alert("偵測到您尚未登入，將為您導向登入頁面。");
        window.location.href = 'login.html';
        return;
    }
    narrativeLog.innerHTML = `<h2>文字江湖</h2><p>正在載入您的江湖傳說...</p>`;
    promptQuestion.textContent = "準備開始您的冒險...";
    actionOptionsContainer.innerHTML = '<button id="start-game-btn">載入遊戲 / 始動</button>';
    document.getElementById('start-game-btn').addEventListener('click', (e) => {
         handleActionSelect({ currentTarget: e.currentTarget, target: e.target, textContent: e.target.textContent, dataset: e.target.dataset });
    });
    customActionForm.addEventListener('submit', handleCustomActionSubmit);
    sceneCharactersList.addEventListener('click', handleEntityClick);
    narrativeLog.addEventListener('click', handleEntityClick);
    modalCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeGame);
