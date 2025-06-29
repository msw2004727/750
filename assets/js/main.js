// 檔案: assets/js/main.js
// 版本: 5.2 (陣圖佈局版)
// 描述: 適配新的 Grid 佈局 HTML 結構，並增加渲染氛圍面板的邏輯。

// --- 設定與 API URL ---
const API_BASE_URL = "https://md-server-main.onrender.com";
const TURN_URL = `${API_BASE_URL}/api/generate_turn`;
const ENTITY_INFO_URL = `${API_BASE_URL}/api/get_entity_info`;
const SUMMARY_URL = `${API_BASE_URL}/api/get_summary`;
const currentGameSessionId = localStorage.getItem('game_session_id');

// --- DOM 元素獲取 ---
const loadingOverlay = document.getElementById('loading-overlay');
const narrativeLog = document.getElementById('narrative-log');
const actionOptionsContainer = document.getElementById('action-options');
const promptQuestion = document.getElementById('prompt-question');
const customActionForm = document.getElementById('custom-action-form');
const customActionInput = document.getElementById('custom-action-input');
const logoutBtn = document.getElementById('logout-btn-corner');

// 新佈局元素
const roundTitleEl = document.getElementById('round-title');
const roundAtmosphereEl = document.getElementById('round-atmosphere');
const sideHpBar = document.getElementById('hp-bar-side');
const sideMpBar = document.getElementById('mp-bar-side');
const sidePlayerHp = document.getElementById('player-hp');
const sidePlayerMp = document.getElementById('player-mp');
const sidePlayerName = document.getElementById('player-name');
const sideInfoLocation = document.getElementById('info-location');
const sideInfoTime = document.getElementById('info-time');
const sideInfoTimeReadable = document.getElementById('info-time-readable');
const sideWeather = document.getElementById('weather-info-desktop');
const sideTemp = document.getElementById('temperature-info');
const sideSceneCharactersList = document.getElementById('scene-characters-list');
const sceneDesc = document.getElementById('scene-desc');
const sceneSize = document.getElementById('scene-size');
const scenePopulation = document.getElementById('scene-population');

// Modal 相關元素
const modal = document.getElementById('info-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

// --- 核心功能函數 ---

function showLoading(text) {
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}
function hideLoading() {
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

function processNarrativeContent(content) {
    // 省略提示標籤等處理，專注於氛圍提取
    return content;
}

function updateUI(data) {
    const { narrative, state } = data;
    const { pc_data = {}, world = {}, metadata = {}, npcs = {}, locations = {} } = state;

    // --- 更新角色與世界狀態面板 ---
    if(sidePlayerName) sidePlayerName.textContent = pc_data.basic_info?.name ?? '---';
    const hpPercent = (pc_data.core_status?.hp?.current / pc_data.core_status?.hp?.max) * 100 || 0;
    const mpPercent = (pc_data.core_status?.mp?.current / pc_data.core_status?.mp?.max) * 100 || 0;
    if(sideHpBar) sideHpBar.style.width = `${hpPercent}%`;
    if(sideMpBar) sideMpBar.style.width = `${mpPercent}%`;
    if(sidePlayerHp) sidePlayerHp.textContent = `${pc_data.core_status?.hp?.current ?? '--'}/${pc_data.core_status?.hp?.max ?? '--'}`;
    if(sidePlayerMp) sidePlayerMp.textContent = `${pc_data.core_status?.mp?.current ?? '--'}/${pc_data.core_status?.mp?.max ?? '--'}`;
    
    if(sideInfoLocation) sideInfoLocation.textContent = world.player_current_location_name ?? '未知';
    if(sideInfoTime) sideInfoTime.textContent = metadata?.game_timestamp ?? '---';
    
    const weatherEmojiMap = { "晴": "☀️", "陰": "☁️", "雨": "🌧️", "雪": "❄️", "霧": "🌫️" };
    if(sideWeather) sideWeather.textContent = `${weatherEmojiMap[world.weather] || ''} ${world.weather || ''}`;
    if(sideTemp) sideTemp.textContent = `${world.temperature ?? '--'} °C`;
    
    // --- 更新右側邊欄 ---
    const playerLocationId = world.player_current_location_id;
    if(sideSceneCharactersList){
        const charactersInScene = Object.values(npcs).filter(npc => npc.current_location_id === playerLocationId);
        sideSceneCharactersList.innerHTML = charactersInScene.length > 0
            ? charactersInScene.map(npc => `<li class="narrative-entity" data-entity-type="npc" data-entity-id="${npc.id}">${npc.alias || npc.name}</li>`).join('')
            : '<li>此地空無一人。</li>';
    }
    const currentLocation = locations[playerLocationId] || {};
    if(sceneDesc) sceneDesc.textContent = currentLocation.description || "探索中...";
    if(sceneSize) sceneSize.textContent = currentLocation.size || "未知";
    if(scenePopulation) scenePopulation.textContent = currentLocation.population || "未知";

    // --- 更新劇情與氛圍 ---
    let fullNarrativeText = (narrative || []).map(part => part.content || part.text).join('');
    const optionsRegex = /<options>([\s\S]*?)<\/options>/;
    const optionsMatch = fullNarrativeText.match(optionsRegex);
    const optionsContent = optionsMatch ? optionsMatch[1].trim() : '';
    fullNarrativeText = fullNarrativeText.replace(optionsRegex, '').trim();

    // 提取標題和氛圍
    const titleRegex = /【\*\*(.*?)\*\*】/;
    const titleMatch = fullNarrativeText.match(titleRegex);
    if (roundTitleEl && titleMatch) {
        roundTitleEl.textContent = `回合 ${metadata.round || '??'}: ${titleMatch[1]}`;
        fullNarrativeText = fullNarrativeText.replace(titleRegex, '').trim();
    } else if (roundTitleEl) {
        roundTitleEl.textContent = `回合 ${metadata.round || '??'}`;
    }

    // 將第一段非空文字作為氛圍
    const firstParagraph = fullNarrativeText.split('\n').find(line => line.trim() !== '');
    if (roundAtmosphereEl && firstParagraph) {
        roundAtmosphereEl.textContent = firstParagraph;
    }

    // 渲染主劇情文字
    if(narrativeLog) {
        narrativeLog.innerHTML = `<p>${fullNarrativeText.replace(/\n/g, '</p><p>')}</p>`;
    }

    // --- 更新選項 ---
    if (actionOptionsContainer) {
        actionOptionsContainer.innerHTML = '';
        if (optionsContent) {
            promptQuestion.style.display = 'block';
            const optionLineRegex = /^(?:[A-Z]|\d+)\..*$/m;
            const options = optionsContent.split('\n').filter(line => line.trim().match(optionLineRegex));
            options.forEach(opt => {
                const match = opt.trim().match(/^(?:([A-Z])|(\d+))\.\s*(.*)/);
                if(match){
                    const button = document.createElement('button');
                    button.dataset.actionId = match[1] || match[2];
                    button.textContent = match[3];
                    button.addEventListener('click', handleActionSelect);
                    actionOptionsContainer.appendChild(button);
                }
            });
        } else {
             promptQuestion.style.display = 'none';
        }
    }
}

async function handleActionSelect(event) {
    const button = event.currentTarget;
    showLoading("AI 運算中...");

    try {
        const response = await fetch(TURN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentGameSessionId,
                player_action: { id: button.dataset.actionId, text: button.textContent }
            })
        });
        if (!response.ok) throw new Error((await response.json()).error);
        const data = await response.json();
        updateUI(data);
    } catch (error) {
        if(narrativeLog) narrativeLog.innerHTML += `<p style="color:red;">錯誤: ${error.message}</p>`;
    } finally {
        hideLoading();
    }
}

function handleLogout() {
    if (confirm("確定要退出江湖嗎？")) {
        localStorage.removeItem('game_session_id');
        window.location.href = 'login.html';
    }
}

// --- 遊戲啟動 ---
document.addEventListener('DOMContentLoaded', async () => {
    if (!currentGameSessionId) {
        window.location.href = 'login.html';
        return;
    }
    
    // 事件監聽
    if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if(customActionForm) customActionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if(!customActionInput.value.trim()) return;
        handleActionSelect({ currentTarget: { dataset: {actionId: 'CUSTOM'}, textContent: customActionInput.value } });
        customActionInput.value = '';
    });
    
    // 初始載入
    showLoading("載入江湖傳說...");
    try {
        // 先獲取一次前情提要
        const summaryResponse = await fetch(SUMMARY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentGameSessionId })
        });
        const summaryResult = await summaryResponse.json();
        if (summaryResponse.ok && roundAtmosphereEl) {
             roundAtmosphereEl.textContent = summaryResult.summary;
        }

        // 獲取第一回合數據
        const turnResponse = await fetch(TURN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentGameSessionId,
                player_action: { id: 'START', text: '繼續旅程' }
            })
        });
        if (!turnResponse.ok) throw new Error((await turnResponse.json()).error);
        const turnResult = await turnResponse.json();
        updateUI(turnResult);

    } catch (error) {
        if(narrativeLog) narrativeLog.innerHTML = `<p style="color:red;">遊戲載入失敗: ${error.message}</p>`;
    } finally {
        hideLoading();
    }
});
