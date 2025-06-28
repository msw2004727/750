// 檔案: assets/js/main.js
// 版本: 4.2 - 實現可收展面板與新按鈕功能

// --- 設定與 API URL (無變動) ---
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
const customActionInput = document.getElementById('custom-action-input');
const logoutBtn = document.getElementById('logout-btn-corner'); // 修改為新的按鈕ID

// 窄版頂部元素
const hpBar = document.getElementById('hp-bar'), mpBar = document.getElementById('mp-bar');
const hpText = document.getElementById('hp-text'), mpText = document.getElementById('mp-text');
const mobileTime = document.getElementById('game-time-clock-mobile');
const mobileWeather = document.getElementById('weather-info-mobile');

// 寬版側邊欄元素
const sideInfoTime = document.getElementById('info-time');
const sideInfoTimeReadable = document.getElementById('info-time-readable');
const sideInfoLocation = document.getElementById('info-location');
const sideWeather = document.getElementById('weather-info-desktop');
const sideTemp = document.getElementById('temperature-info');
const sideHumidity = document.getElementById('humidity-info');
const sidePlayerName = document.getElementById('player-name');
const sidePlayerHp = document.getElementById('player-hp');
const sidePlayerMp = document.getElementById('player-mp');
const sideSceneCharactersList = document.getElementById('scene-characters-list');

// 場景資訊 DOM
const sceneDesc = document.getElementById('scene-desc');
const sceneSize = document.getElementById('scene-size');
const scenePopulation = document.getElementById('scene-population');
const sceneEconomy = document.getElementById('scene-economy');
const sceneSpecialty = document.getElementById('scene-specialty');
const sceneFaction = document.getElementById('scene-faction');
const sceneReligion = document.getElementById('scene-religion');

// Modal 相關元素
const modal = document.getElementById('info-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

let latestGameState = {};

// --- 核心功能函數 ---

function showLoading(text) { /* ... (無變動) ... */ }
function hideLoading() { /* ... (無變動) ... */ }
function setThemeByGameTime(gameTimestamp) { /* ... (無變動) ... */ }
function getReadableTime(gameTimestamp) { /* ... (無變動) ... */ }

function updateUI(data, isFromCache = false) {
    if (data.state) latestGameState = data.state;
    if (!isFromCache) { sessionStorage.setItem('cachedGameState', JSON.stringify(data)); }

    const { narrative, state } = data;
    const { pc_data = {}, world = {}, metadata = {}, npcs = {}, locations = {} } = state;
    const { core_status = {}, basic_info = {} } = pc_data;
    const gameTimestamp = metadata?.game_timestamp;

    setThemeByGameTime(gameTimestamp);
    const timeInfo = getReadableTime(gameTimestamp);
    
    const hpPercent = (core_status.hp?.current / core_status.hp?.max) * 100 || 0;
    const mpPercent = (core_status.mp?.current / core_status.mp?.max) * 100 || 0;
    const weatherEmojiMap = { "晴": "☀️", "陰": "☁️", "雨": "🌧️", "雪": "❄️", "霧": "🌫️" };
    const weatherEmoji = weatherEmojiMap[world.weather] || '';

    // --- 更新UI元素 ---
    if(hpBar) hpBar.style.width = `${hpPercent}%`;
    if(mpBar) mpBar.style.width = `${mpPercent}%`;
    if(hpText) hpText.textContent = `${core_status.hp?.current ?? '--'}/${core_status.hp?.max ?? '--'}`;
    if(mpText) mpText.textContent = `${core_status.mp?.current ?? '--'}/${core_status.mp?.max ?? '--'}`;
    if(mobileTime) mobileTime.textContent = timeInfo.short;
    if(mobileWeather) mobileWeather.textContent = `${weatherEmoji} ${world.temperature ?? '--'}°C`;

    if(sideInfoTime) sideInfoTime.textContent = timeInfo.full;
    if(sideInfoTimeReadable) sideInfoTimeReadable.textContent = timeInfo.readable;
    if(sideInfoLocation) sideInfoLocation.textContent = world.player_current_location_name ?? '未知';
    
    // 【修改】更新橫向天氣資訊
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
                li.className = 'narrative-entity text-entity-npc';
                li.dataset.entityId = npc.id; li.dataset.entityType = 'npc';
                li.textContent = npc.alias || npc.name; 
                sideSceneCharactersList.appendChild(li);
            });
        } else { sideSceneCharactersList.innerHTML = '<li>此地似乎空無一人。</li>'; }
    }
    
    const currentLocation = locations[world.player_current_location_id] || {};
    if (sceneDesc) sceneDesc.textContent = currentLocation.description || "探索中...";
    if (sceneSize) sceneSize.textContent = currentLocation.size || "未知";
    if (scenePopulation) scenePopulation.textContent = currentLocation.population || "未知";
    if (sceneEconomy) sceneEconomy.textContent = currentLocation.economy || "未知";
    if (sceneSpecialty) sceneSpecialty.textContent = currentLocation.specialty || "未知";
    if (sceneFaction) sceneFaction.textContent = currentLocation.faction || "未知";
    if (sceneReligion) sceneReligion.textContent = currentLocation.religion || "未知";

    if (!isFromCache) {
        // ... (渲染敘事與選項邏輯，無變動) ...
    }
}

function handleModalClose() { modal.classList.add('hidden'); }

function handleLogout() {
    if (confirm("確定要退出江湖，返回登入畫面嗎？")) {
        localStorage.removeItem('game_session_id');
        sessionStorage.removeItem('cachedGameState');
        window.location.href = 'login.html';
    }
}

// 【新增】收展面板功能
function toggleCollapse(event) {
    const title = event.currentTarget;
    const content = title.nextElementSibling; // 獲取標題後面的內容元素
    if (content && content.classList.contains('collapsible-content')) {
        title.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
    }
}

// 【核心修改】遊戲初始化函數
async function initializeGame() {
    if (!currentGameSessionId) { window.location.href = 'login.html'; return; }

    // --- 事件監聽 ---
    customActionForm.addEventListener('submit', handleCustomActionSubmit);
    narrativeLog.addEventListener('click', handleEntityClick);
    modalCloseBtn.addEventListener('click', handleModalClose);
    modal.addEventListener('click', (e) => { if (e.target === modal) handleModalClose(); });
    if (sideSceneCharactersList) sideSceneCharactersList.addEventListener('click', handleEntityClick);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // 【新增】為可收展面板綁定事件
    document.querySelectorAll('.collapsible-title').forEach(title => {
        title.addEventListener('click', toggleCollapse);
        // 預設收合
        title.classList.add('collapsed');
        const content = title.nextElementSibling;
        if (content && content.classList.contains('collapsible-content')) {
            content.classList.add('collapsed');
        }
    });

    // 【新增】為玩家面板按鈕綁定事件
    const contactsBtn = document.getElementById('contacts-btn');
    const attributesBtn = document.getElementById('attributes-btn');
    const inventoryBtn = document.getElementById('inventory-btn');
    if(contactsBtn) contactsBtn.addEventListener('click', () => alert('「人脈」功能開發中...'));
    if(attributesBtn) attributesBtn.addEventListener('click', () => alert('「數值」功能開發中...'));
    if(inventoryBtn) inventoryBtn.addEventListener('click', () => alert('「行囊」功能開發中...'));


    // --- 頁面載入邏輯 (包含快取檢查) ---
    const cachedData = sessionStorage.getItem('cachedGameState');
    if (cachedData) {
        try {
            // ... (快取邏輯無變動) ...
        } catch (e) { /* ... */ }
    }
    
    // ... (後續載入邏輯無變動) ...
}

// --- 遊戲啟動 ---
document.addEventListener('DOMContentLoaded', initializeGame);
