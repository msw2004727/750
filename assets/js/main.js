// 檔案: assets/js/main.js
// 版本: 3.1 - 實現響應式UI與狀態條

// ... 設定與 API URL (與之前相同) ...
const API_BASE_URL = "https://md-server-main.onrender.com";
const TURN_URL = `${API_BASE_URL}/api/generate_turn`;
const ENTITY_INFO_URL = `${API_BASE_URL}/api/get_entity_info`;
const SUMMARY_URL = `${API_BASE_URL}/api/get_summary`;
const currentGameSessionId = localStorage.getItem('game_session_id');

// --- DOM 元素獲取 ---
// 通用元素
const narrativeLog = document.getElementById('narrative-log');
const actionOptionsContainer = document.getElementById('action-options');
const promptQuestion = document.getElementById('prompt-question');
const customActionForm = document.getElementById('custom-action-form');
const customActionInput = document.getElementById('custom-action-input');
const modal = document.getElementById('info-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

// 窄版頂部元素
const hpBar = document.getElementById('hp-bar');
const mpBar = document.getElementById('mp-bar');
const hpText = document.getElementById('hp-text');
const mpText = document.getElementById('mp-text');
const mobileStatusBtn = document.getElementById('status-btn-mobile');
const mobileInventoryBtn = document.getElementById('inventory-btn-mobile');
const mobileMapBtn = document.getElementById('map-btn-mobile');

// 寬版側邊欄元素
const sideInfoRound = document.getElementById('info-round');
const sideInfoTime = document.getElementById('info-time');
const sideInfoLocation = document.getElementById('info-location');
const sidePlayerName = document.getElementById('player-name');
const sidePlayerHp = document.getElementById('player-hp');
const sidePlayerMp = document.getElementById('player-mp');
const sideSceneCharactersList = document.getElementById('scene-characters-list');
const sideAreaInfoContent = document.getElementById('area-info-content');

let latestGameState = {};

// ------------------- 核心功能函數 -------------------

function updateUI(data) {
    if (data.state) {
        latestGameState = data.state;
    }
    const state = latestGameState;
    const { narrative } = data;

    // --- 數據更新 ---
    const pc_data = state.pc_data || {};
    const core_status = pc_data.core_status || {};
    const world = state.world || {};
    const metadata = state.metadata || {};

    // 計算百分比
    const hpPercent = (core_status.hp?.current / core_status.hp?.max) * 100 || 0;
    const mpPercent = (core_status.mp?.current / core_status.mp?.max) * 100 || 0;

    // --- 渲染窄版頂部 UI ---
    hpBar.style.width = `${hpPercent}%`;
    mpBar.style.width = `${mpPercent}%`;
    hpText.textContent = `${core_status.hp?.current ?? '--'}/${core_status.hp?.max ?? '--'}`;
    mpText.textContent = `${core_status.mp?.current ?? '--'}/${core_status.mp?.max ?? '--'}`;
    
    // --- 渲染寬版側邊欄 UI ---
    sideInfoRound.textContent = metadata.round ?? '---';
    sideInfoTime.textContent = metadata.game_timestamp ?? '---';
    sideInfoLocation.textContent = world.player_current_location_name ?? '未知之地';
    sidePlayerName.textContent = pc_data.basic_info?.name ?? '---';
    sidePlayerHp.textContent = `${core_status.hp?.current ?? '--'}/${core_status.hp?.max ?? '--'}`;
    sidePlayerMp.textContent = `${core_status.mp?.current ?? '--'}/${core_status.mp?.max ?? '--'}`;

    // 更新場景角色與地區資訊 (寬版)
    const allNpcs = state.npcs || {};
    const playerLocationId = world.player_current_location_id;
    const charactersInScene = Object.values(allNpcs).filter(npc => npc.current_location_id === playerLocationId);
    sideSceneCharactersList.innerHTML = '';
    if (charactersInScene.length > 0) {
        charactersInScene.forEach(npc => {
            const li = document.createElement('li');
            li.textContent = npc.name;
            li.className = 'narrative-entity text-entity-npc';
            li.dataset.entityId = npc.id; li.dataset.entityType = 'npc';
            sideSceneCharactersList.appendChild(li);
        });
    } else {
        sideSceneCharactersList.innerHTML = '<li>此地似乎空無一人。</li>';
    }
    const currentLocationData = state.locations?.[playerLocationId];
    if (currentLocationData?.description) {
        sideAreaInfoContent.innerHTML = `<p>"${currentLocationData.description}"</p>`;
    } else {
        sideAreaInfoContent.innerHTML = '<p>"你對此地一無所知..."</p>';
    }

    // --- 渲染主敘事區與選項 (與之前相同) ---
    // ... (此處代碼與版本 2.12 完全相同，為簡潔省略)
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
    if (narrative.some(part => part.content?.trim())) {
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
            button.dataset.actionId = actionId;
            button.innerHTML = `<span class="emoji">${emojiMap[actionId] || '👉'}</span><span>${opt}</span>`;
            button.addEventListener('click', handleActionSelect);
            actionOptionsContainer.appendChild(button);
        });
    } else {
        promptQuestion.textContent = "劇情正在發展中...";
    }
    narrativeLog.scrollTop = narrativeLog.scrollHeight;
}

// ... 其他函數 (handleActionSelect, handleEntityClick, handleCustomActionSubmit, initializeGame) 與上一版類似，但綁定事件的對象有變 ...
// --- 事件處理 ---
function showInfoModal(title, contentHtml) {
    modalTitle.textContent = title;
    modalBody.innerHTML = contentHtml;
    modal.classList.remove('hidden');
}

function handleStatusBtnClick() {
    // ... (此函數與版本 3.0 完全相同)
}

function handleInventoryBtnClick() {
    // ... (此函數與版本 3.0 完全相同)
}

function handleMapBtnClick() {
    // ... (此函數與版本 3.0 完全相同)
}

async function handleActionSelect(event) {
    const button = event.currentTarget;
    const actionId = button.dataset.actionId;
    const actionText = button.textContent;
    // ... (後續 API 請求邏輯與之前相同)
}

async function handleEntityClick(event) {
    const target = event.target.closest('.narrative-entity');
    if (!target) return;
    // ... (後續 API 請求與 Modal 渲染邏輯與之前相同)
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
        window.location.href = 'login.html';
        return;
    }
    // ... (初始化載入前情提要與第一回合的邏輯與之前相同)
    
    // 綁定所有事件監聽
    customActionForm.addEventListener('submit', handleCustomActionSubmit);
    narrativeLog.addEventListener('click', handleEntityClick);
    modalCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    // 寬版側邊欄的實體點擊
    sideSceneCharactersList.addEventListener('click', handleEntityClick);
    
    // 窄版頂部按鈕的點擊
    mobileStatusBtn.addEventListener('click', handleStatusBtnClick);
    mobileInventoryBtn.addEventListener('click', handleInventoryBtnClick);
    mobileMapBtn.addEventListener('click', handleMapBtnClick);
}

document.addEventListener('DOMContentLoaded', initializeGame);
