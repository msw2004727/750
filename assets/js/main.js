// 檔案: assets/js/main.js
// 版本: 5.3 (儀表板佈局版)
// 描述: 重構UI更新邏輯，將提示資訊分離到儀表板，並啟用所有可收摺面板。

// --- 設定與 API URL ---
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
const logoutBtn = document.getElementById('logout-btn-corner');

// 新佈局元素
const roundTitleEl = document.getElementById('round-title');
const systemPromptBox = document.getElementById('system-prompt-box');
const perceptionPromptBox = document.getElementById('perception-prompt-box');
const coreSituationBox = document.getElementById('core-situation-box');

// 角色狀態
const sidePlayerName = document.getElementById('player-name');
const sideHpBar = document.getElementById('hp-bar-side');
const sideMpBar = document.getElementById('mp-bar-side');
const sidePlayerHp = document.getElementById('player-hp');
const sidePlayerMp = document.getElementById('player-mp');

// 世界狀態
const sideInfoLocation = document.getElementById('info-location');
const sideInfoTime = document.getElementById('info-time');
const sideInfoTimeReadable = document.getElementById('info-time-readable');
const sideWeather = document.getElementById('weather-info-desktop');
const sideTemp = document.getElementById('temperature-info');
const sideHumidity = document.getElementById('humidity-info');

// 右側邊欄
const sideSceneCharactersList = document.getElementById('scene-characters-list');
const sceneDesc = document.getElementById('scene-desc');
const sceneSize = document.getElementById('scene-size');
const scenePopulation = document.getElementById('scene-population');

// Modal 相關元素
const modal = document.getElementById('info-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

let latestGameState = {};

// --- 核心功能函數 ---

function showLoading(text) {
    if (loadingOverlay) {
        loadingText.textContent = text;
        loadingOverlay.classList.remove('hidden');
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

function getReadableTime(gameTimestamp) {
    if (!gameTimestamp) return { full: "---", readable: "" };
    const timePart = gameTimestamp.split(' ')[1] || '';
    const hourMap = { '子':'23-01', '丑':'01-03', '寅':'03-05', '卯':'05-07', '辰':'07-09', '巳':'09-11', '午':'11-13', '未':'13-15', '申':'15-17', '酉':'17-19', '戌':'19-21', '亥':'21-23' };
    const hourMatch = timePart.match(/([子丑寅卯辰巳午未申酉戌亥])時/);
    let readable = "";
    if (hourMatch && hourMap[hourMatch[1]]) {
        readable = `(約 ${hourMap[hourMatch[1]]}時)`;
    }
    return { full: gameTimestamp, readable: readable };
}


function updateUI(data) {
    const { narrative, state } = data;
    const { pc_data = {}, world = {}, metadata = {} } = state;
    const { npcs = {}, locations = {} } = pc_data; // 修正: npcs 和 locations 可能在 pc_data 之外

    // --- 更新角色狀態 ---
    if(sidePlayerName) sidePlayerName.textContent = pc_data.basic_info?.name ?? '---';
    const hpPercent = (pc_data.core_status?.hp?.current / pc_data.core_status?.hp?.max) * 100 || 0;
    const mpPercent = (pc_data.core_status?.mp?.current / pc_data.core_status?.mp?.max) * 100 || 0;
    if(sideHpBar) sideHpBar.style.width = `${hpPercent}%`;
    if(sideMpBar) sideMpBar.style.width = `${mpPercent}%`;
    if(sidePlayerHp) sidePlayerHp.textContent = `${pc_data.core_status?.hp?.current ?? '--'}/${pc_data.core_status?.hp?.max ?? '--'}`;
    if(sidePlayerMp) sidePlayerMp.textContent = `${pc_data.core_status?.mp?.current ?? '--'}/${pc_data.core_status?.mp?.max ?? '--'}`;

    // --- 更新世界狀態 ---
    const timeInfo = getReadableTime(metadata?.game_timestamp);
    if(sideInfoLocation) sideInfoLocation.textContent = world.player_current_location_name ?? '未知';
    if(sideInfoTime) sideInfoTime.textContent = timeInfo.full;
    if(sideInfoTimeReadable) sideInfoTimeReadable.textContent = timeInfo.readable;
    const weatherEmojiMap = { "晴": "☀️", "陰": "☁️", "雨": "🌧️", "雪": "❄️", "霧": "🌫️" };
    if(sideWeather) sideWeather.textContent = `${weatherEmojiMap[world.weather] || ''} ${world.weather || ''}`;
    if(sideTemp) sideTemp.textContent = world.temperature ?? '--';
    if(sideHumidity) sideHumidity.textContent = world.humidity ?? '--';

    // --- 更新右側邊欄 ---
    if(sideSceneCharactersList){
        const playerLocationId = world.player_current_location_id;
        const charactersInScene = Object.values(state.npcs || {}).filter(npc => npc.current_location_id === playerLocationId);
        sideSceneCharactersList.innerHTML = charactersInScene.length > 0
            ? charactersInScene.map(npc => `<li class="narrative-entity" data-entity-type="npc" data-entity-id="${npc.id}">${npc.alias || npc.name}</li>`).join('')
            : '<li>此地空無一人。</li>';
    }
    const currentLocation = state.locations ? state.locations[world.player_current_location_id] : {};
    if (currentLocation) {
        if(sceneDesc) sceneDesc.textContent = currentLocation.description || "探索中...";
        if(sceneSize) sceneSize.textContent = currentLocation.size || "未知";
        if(scenePopulation) scenePopulation.textContent = currentLocation.population || "未知";
    }

    // --- 核心修改：分離並渲染劇情與提示 ---
    let fullNarrativeText = (narrative || []).map(part => part.content || part.text).join('\n');
    
    const optionsRegex = /<options>([\s\S]*?)<\/options>/;
    const optionsMatch = fullNarrativeText.match(optionsRegex);
    const optionsContent = optionsMatch ? optionsMatch[1].trim() : '';
    fullNarrativeText = fullNarrativeText.replace(optionsRegex, '').trim();

    const prompts = {
        system: { regex: /\[【⚙️ 系統提示】([\s\S]*?)\]/g, el: systemPromptBox },
        perception: { regex: /\[【🧠 感知提示】([\s\S]*?)\]/g, el: perceptionPromptBox },
        situation: { regex: /【\*\*核心處境\*\*】([\s\S]*)/g, el: coreSituationBox }
    };

    for (const key in prompts) {
        const { regex, el } = prompts[key];
        const matches = [...fullNarrativeText.matchAll(regex)];
        if (matches.length > 0 && el) {
            el.innerHTML = matches.map(match => match[1].trim()).join('<br>');
            el.classList.remove('hidden');
            fullNarrativeText = fullNarrativeText.replace(regex, '');
        } else if (el) {
            el.classList.add('hidden');
        }
    }
    
    const titleRegex = /【\*\*(.*?)\*\*】/;
    const titleMatch = fullNarrativeText.match(titleRegex);
    if (roundTitleEl && titleMatch) {
        roundTitleEl.textContent = `回合 ${metadata.round || '??'}: ${titleMatch[1]}`;
        fullNarrativeText = fullNarrativeText.replace(titleRegex, '').trim();
    } else if (roundTitleEl) {
        roundTitleEl.textContent = `回合 ${metadata.round || '??'}`;
    }

    if(narrativeLog) {
        narrativeLog.innerHTML = `<p>${fullNarrativeText.trim().replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
    }

    if (actionOptionsContainer) {
        actionOptionsContainer.innerHTML = '';
        promptQuestion.style.display = 'block';
        if (optionsContent) {
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
    const actionText = button.dataset.actionId === 'CUSTOM' ? button.textContent : button.textContent;
    showLoading("AI 正在運算中...");

    try {
        const response = await fetch(TURN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentGameSessionId,
                player_action: { id: button.dataset.actionId, text: actionText }
            })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP 錯誤: ${response.status}`);
        }
        const data = await response.json();
        updateUI(data);
    } catch (error) {
        if(narrativeLog) narrativeLog.innerHTML += `<p style="color:red;">錯誤: ${error.message}</p>`;
    } finally {
        hideLoading();
    }
}

function handleCustomActionSubmit(event) {
    event.preventDefault();
    const actionText = customActionInput.value.trim();
    if (!actionText) return;
    handleActionSelect({ currentTarget: { dataset: {actionId: 'CUSTOM'}, textContent: actionText } });
    customActionInput.value = '';
}

function handleLogout() {
    if (confirm("確定要退出江湖嗎？")) {
        localStorage.removeItem('game_session_id');
        window.location.href = 'login.html';
    }
}

function toggleCollapse(event) {
    const title = event.currentTarget;
    const content = title.nextElementSibling;
    if (content && content.classList.contains('collapsible-content')) {
        title.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
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
    if(customActionForm) customActionForm.addEventListener('submit', handleCustomActionSubmit);
    document.querySelectorAll('.collapsible-title').forEach(title => {
        title.addEventListener('click', toggleCollapse);
        // 預設收合
        title.classList.add('collapsed');
        title.nextElementSibling.classList.add('collapsed');
    });
    
    // 初始載入
    showLoading("載入江湖傳說...");
    try {
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
