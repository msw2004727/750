// 檔案: assets/js/main.js
// 版本: 3.3 - 日夜主題，天氣系統，別名顯示

// --- 設定與 API URL (與之前相同) ---
const API_BASE_URL = "https://md-server-main.onrender.com";
const TURN_URL = `${API_BASE_URL}/api/generate_turn`;
const ENTITY_INFO_URL = `${API_BASE_URL}/api/get_entity_info`;
const SUMMARY_URL = `${API_BASE_URL}/api/get_summary`;
const currentGameSessionId = localStorage.getItem('game_session_id');

// --- DOM 元素獲取 ---
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const narrativeLog = document.getElementById('narrative-log');
const actionOptionsContainer = document.getElementById('action-options');
const promptQuestion = document.getElementById('prompt-question');
const customActionForm = document.getElementById('custom-action-form');

// 窄版頂部元素
const hpBar = document.getElementById('hp-bar'), mpBar = document.getElementById('mp-bar');
const hpText = document.getElementById('hp-text'), mpText = document.getElementById('mp-text');
const mobileTime = document.getElementById('real-time-clock-mobile');
const mobileWeather = document.getElementById('weather-info-mobile');
const mobileStatusBtn = document.getElementById('status-btn-mobile');
const mobileInventoryBtn = document.getElementById('inventory-btn-mobile');
const mobileMapBtn = document.getElementById('map-btn-mobile');

// 寬版側邊欄元素
const desktopTime = document.getElementById('real-time-clock-desktop');
const sideInfoTime = document.getElementById('info-time');
const sideInfoLocation = document.getElementById('info-location');
const sideWeather = document.getElementById('weather-info-desktop');
const sideTemp = document.getElementById('temperature-info');
const sideHumidity = document.getElementById('humidity-info');
const sidePlayerName = document.getElementById('player-name');
const sidePlayerHp = document.getElementById('player-hp');
const sidePlayerMp = document.getElementById('player-mp');
const sideSceneCharactersList = document.getElementById('scene-characters-list');

// Modal 相關元素
const modal = document.getElementById('info-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

let latestGameState = {};

// --- 核心功能函數 ---
function showLoading(text) { if (loadingOverlay) { loadingText.textContent = text; loadingOverlay.classList.remove('hidden'); } }
function hideLoading() { if (loadingOverlay) loadingOverlay.classList.add('hidden'); }

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    if (mobileTime) mobileTime.textContent = `${hours}:${minutes}`;
    if (desktopTime) desktopTime.textContent = `${hours}:${minutes}:${seconds}`;
}

function setTheme() {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 19) { // 早上7點到晚上7點為白天
        document.body.classList.add('theme-light');
        document.body.classList.remove('theme-dark');
    } else {
        document.body.classList.add('theme-dark');
        document.body.classList.remove('theme-light');
    }
}

function updateUI(data) {
    if (data.state) latestGameState = data.state;
    const { narrative, state } = data;
    const { pc_data = {}, world = {}, metadata = {}, npcs = {}, locations = {} } = state;
    const { core_status = {}, basic_info = {} } = pc_data;

    // --- 更新所有 UI 元素 ---
    const hpPercent = (core_status.hp?.current / core_status.hp?.max) * 100 || 0;
    const mpPercent = (core_status.mp?.current / core_status.mp?.max) * 100 || 0;
    const weatherEmojiMap = { "晴": "☀️", "陰": "☁️", "雨": "🌧️", "雪": "❄️", "霧": "🌫️" };
    const weatherEmoji = weatherEmojiMap[world.weather] || world.weather || '';
    
    // 窄版
    if(hpBar) hpBar.style.width = `${hpPercent}%`;
    if(mpBar) mpBar.style.width = `${mpPercent}%`;
    if(hpText) hpText.textContent = `${core_status.hp?.current ?? '--'}/${core_status.hp?.max ?? '--'}`;
    if(mpText) mpText.textContent = `${core_status.mp?.current ?? '--'}/${core_status.mp?.max ?? '--'}`;
    if(mobileWeather) mobileWeather.textContent = `${weatherEmoji} ${world.temperature ?? '--'}°C`;

    // 寬版
    if(sideInfoTime) sideInfoTime.textContent = metadata.game_timestamp ?? '---';
    if(sideInfoLocation) sideInfoLocation.textContent = world.player_current_location_name ?? '未知';
    if(sideWeather) sideWeather.textContent = `${weatherEmoji} ${world.weather || ''}`;
    if(sideTemp) sideTemp.textContent = `${world.temperature ?? '--'} °C`;
    if(sideHumidity) sideHumidity.textContent = `${world.humidity ?? '--'} %`;
    if(sidePlayerName) sidePlayerName.textContent = basic_info.name ?? '---';
    if(sidePlayerHp) sidePlayerHp.textContent = `${core_status.hp?.current ?? '--'}/${core_status.hp?.max ?? '--'}`;
    if(sidePlayerMp) sidePlayerMp.textContent = `${core_status.mp?.current ?? '--'}/${core_status.mp?.max ?? '--'}`;
    
    if(sideSceneCharactersList){
        const playerLocationId = world.player_current_location_id;
        const charactersInScene = Object.values(npcs).filter(npc => npc.current_location_id === playerLocationId);
        sideSceneCharactersList.innerHTML = '';
        if (charactersInScene.length > 0) {
            charactersInScene.forEach(npc => {
                const li = document.createElement('li');
                li.textContent = npc.name;
                li.className = 'narrative-entity text-entity-npc';
                li.dataset.entityId = npc.id; li.dataset.entityType = 'npc';
                sideSceneCharactersList.appendChild(li);
            });
        } else { sideSceneCharactersList.innerHTML = '<li>此地似乎空無一人。</li>'; }
    }
    
    // --- 渲染主敘事區與選項 ---
    const optionsRegex = /<options>([\s\S]*?)<\/options>/;
    let optionsContent = '';
    (narrative || []).forEach(part => {
        if (part.type === 'text' && optionsRegex.test(part.content)) {
            optionsContent = part.content.match(optionsRegex)[1].trim();
            part.content = part.content.replace(optionsRegex, '').trim();
        }
    });
    
    const p = document.createElement('p');
    (narrative || []).forEach(part => {
        if (!part.content) return;
        if (part.type === 'text') {
            p.appendChild(document.createTextNode(part.content));
        } else {
            const span = document.createElement('span');
            span.className = `narrative-entity ${part.color_class || ''}`;
            span.textContent = part.text;
            span.dataset.entityId = part.id; span.dataset.entityType = part.type;
            p.appendChild(span);
        }
    });
    if(p.hasChildNodes()) narrativeLog.appendChild(p);

    actionOptionsContainer.innerHTML = '';
    if (optionsContent) {
        promptQuestion.textContent = "接下來你打算？";
        const emojiMap = { 'A': '🤔', 'B': '🗺️', 'C': '🗣️' };
        const options = optionsContent.split('\n').filter(line => line.trim() !== '').slice(0, 3);
        options.forEach(opt => {
            const button = document.createElement('button');
            const actionId = opt.substring(0, 1);
            button.dataset.actionId = actionId;
            button.innerHTML = `<span class="emoji">${emojiMap[actionId] || '👉'}</span><span>${opt}</span>`;
            button.addEventListener('click', handleActionSelect);
            actionOptionsContainer.appendChild(button);
        });
    } else { promptQuestion.textContent = "劇情正在發展中..."; }
    narrativeLog.scrollTop = narrativeLog.scrollHeight;
}

// 【核心修改】彈窗顯示別名
async function handleEntityClick(event) {
    const target = event.target.closest('.narrative-entity');
    if (!target) return;
    const { entityId, entityType } = target.dataset;
    showInfoModal(target.textContent, '<div class="loading-spinner"></div><p>正在查詢資料...</p>');
    try {
        const response = await fetch(ENTITY_INFO_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: currentGameSessionId, entity_id: entityId, entity_type: entityType }), });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "查詢失敗");
        const entityData = result.data;
        modalTitle.textContent = entityData.name || target.textContent;
        let contentHtml = '<div class="info-grid">';
        if (entityType === 'npc') {
            contentHtml += `<strong>稱號:</strong><span>${entityData.name || '未知'}</span>`;
            if (entityData.alias) contentHtml += `<strong>姓名:</strong><span>${entityData.alias}</span>`; // 顯示別名
            if (entityData.mood) {
                let moodColorClass = "mood-text-neutral";
                if (["開心", "友好", "興奮", "尊敬"].includes(entityData.mood)) moodColorClass = "mood-text-positive";
                if (["憤怒", "憂慮", "敵對", "輕蔑"].includes(entityData.mood)) moodColorClass = "mood-text-negative";
                contentHtml += `<strong>心情:</strong><span class="${moodColorClass}">${entityData.mood}</span>`;
            }
        } else if (entityType === 'item') {
            contentHtml += `<strong>名稱:</strong><span>${entityData.name || '未知'}</span>`;
            if (entityData.type) contentHtml += `<strong>類型:</strong><span>${entityData.type}</span>`;
        }
        contentHtml += '</div>';
        if (entityData.description) contentHtml += `<p class="description-text">"${entityData.description}"</p>`;
        modalBody.innerHTML = contentHtml;
    } catch (error) { modalBody.innerHTML = `<p>查詢失敗: ${error.message}</p>`; }
}

// 其他事件處理與初始化函數
async function handleActionSelect(event) {
    const button = event.currentTarget;
    showLoading("AI 正在運算中，請稍候...");
    try {
        const response = await fetch(TURN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: currentGameSessionId, player_action: { id: button.dataset.actionId, text: button.textContent.replace(/^[^\w]+/, '').trim() } }) });
        if (!response.ok) { const e = await response.json(); throw new Error(e.error); }
        const data = await response.json();
        if (data.narrative && data.state) updateUI(data);
        else throw new Error("AI 回應格式不正確。");
    } catch (error) { promptQuestion.textContent = "發生錯誤！"; actionOptionsContainer.innerHTML = `<p style="color: red;">與伺服器連線失敗: ${error.message}</p>`; } finally { hideLoading(); }
}
function handleCustomActionSubmit(event) {
    event.preventDefault();
    const actionText = customActionInput.value.trim();
    if (!actionText) return;
    customActionInput.value = '';
    handleActionSelect({ currentTarget: { dataset: { actionId: 'CUSTOM' }, textContent: `> ${actionText}` } });
}
function handleStatusBtnClick() { /* ... */ }
function handleInventoryBtnClick() { /* ... */ }
function handleMapBtnClick() { /* ... */ }
async function initializeGame() {
    if (!currentGameSessionId) { window.location.href = 'login.html'; return; }
    setTheme();
    updateClock();
    setInterval(updateClock, 1000);
    showLoading("正在載入您的江湖傳說...");
    narrativeLog.innerHTML = `<h2>文字江湖</h2>`;
    try {
        const summaryResponse = await fetch(SUMMARY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: currentGameSessionId }) });
        const summaryResult = await summaryResponse.json();
        if (!summaryResponse.ok) throw new Error(summaryResult.error);
        const summaryP = document.createElement('p');
        summaryP.style.fontStyle = 'italic'; summaryP.style.color = 'var(--text-secondary)';
        summaryP.textContent = summaryResult.summary;
        narrativeLog.appendChild(summaryP);
        const turnResponse = await fetch(TURN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: currentGameSessionId, player_action: { id: 'START' } }) });
        const turnResult = await turnResponse.json();
        if (!turnResponse.ok) throw new Error(turnResult.error);
        updateUI(turnResult);
    } catch (error) { actionOptionsContainer.innerHTML = `<p style="color: red;">遊戲初始化失敗: ${error.message}</p>`; } finally { hideLoading(); }
    customActionForm.addEventListener('submit', handleCustomActionSubmit);
    narrativeLog.addEventListener('click', handleEntityClick);
    modalCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    if(sideSceneCharactersList) sideSceneCharactersList.addEventListener('click', handleEntityClick);
    if(mobileStatusBtn) mobileStatusBtn.addEventListener('click', handleStatusBtnClick);
    if(mobileInventoryBtn) mobileInventoryBtn.addEventListener('click', handleInventoryBtnClick);
    if(mobileMapBtn) mobileMapBtn.addEventListener('click', handleMapBtnClick);
}

document.addEventListener('DOMContentLoaded', initializeGame);
