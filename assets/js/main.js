// 檔案: assets/js/main.js
// 版本: 4.0 - 遊戲時間驅動的UI與主題

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

// 窄版頂部元素
const hpBar = document.getElementById('hp-bar'), mpBar = document.getElementById('mp-bar');
const hpText = document.getElementById('hp-text'), mpText = document.getElementById('mp-text');
const mobileTime = document.getElementById('game-time-clock-mobile');
const mobileWeather = document.getElementById('weather-info-mobile');
const mobileStatusBtn = document.getElementById('status-btn-mobile');
const mobileInventoryBtn = document.getElementById('inventory-btn-mobile');
const mobileMapBtn = document.getElementById('map-btn-mobile');

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

/**
 * 根據遊戲內時辰設定亮色/暗色主題
 * @param {string} gameTimestamp - 遊戲時間戳, e.g., "第一天 辰時一刻"
 */
function setThemeByGameTime(gameTimestamp) {
    if (!gameTimestamp) return;
    const match = gameTimestamp.match(/([子丑寅卯辰巳午未申酉戌亥])時/);
    if (!match) return;

    const hourChar = match[1];
    const nightHours = ['戌', '亥', '子', '丑', '寅']; // 晚上7點到凌晨5點

    if (nightHours.includes(hourChar)) {
        document.body.classList.remove('theme-light');
    } else {
        document.body.classList.add('theme-light');
    }
}

/**
 * 將遊戲時間戳轉換為易讀格式
 * @param {string} gameTimestamp - 遊戲時間戳, e.g., "第一天 辰時一刻"
 * @returns {{ full: string, short: string, readable: string }}
 */
function getReadableTime(gameTimestamp) {
    if (!gameTimestamp) return { full: "---", short: "--時--刻", readable: "" };

    const timePart = gameTimestamp.split(' ')[1] || ''; // "辰時一刻"
    const hourMap = {
        '子': '23:00-01:00', '丑': '01:00-03:00', '寅': '03:00-05:00',
        '卯': '05:00-07:00', '辰': '07:00-09:00', '巳': '09:00-11:00',
        '午': '11:00-13:00', '未': '13:00-15:00', '申': '15:00-17:00',
        '酉': '17:00-19:00', '戌': '19:00-21:00', '亥': '21:00-23:00'
    };
    const keMap = { '初刻': 0, '一刻': 15, '二刻': 30, '三刻': 45 };

    const hourMatch = timePart.match(/([子丑寅卯辰巳午未申酉戌亥])時/);
    const keMatch = timePart.match(/(初刻|一刻|二刻|三刻)/);

    let readable = "";
    if (hourMatch) {
        const startHour = parseInt(hourMap[hourMatch[1]].split('-')[0], 10);
        let approximateMinute = 0;
        if (keMatch) {
            approximateMinute = keMap[keMatch[1]];
        }
        const totalMinutes = startHour * 60 + approximateMinute;
        const displayHour = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
        const displayMinute = String(totalMinutes % 60).padStart(2, '0');
        readable = `(約 ${displayHour}:${displayMinute})`;
    }
    
    return {
        full: gameTimestamp,
        short: timePart || "--時--刻",
        readable: readable
    };
}

function updateUI(data) {
    if (data.state) latestGameState = data.state;
    const { narrative, state } = data;
    const { pc_data = {}, world = {}, metadata = {}, npcs = {}, locations = {} } = state;
    const { core_status = {}, basic_info = {} } = pc_data;
    const gameTimestamp = metadata?.game_timestamp;

    // --- 更新時間與主題 ---
    setThemeByGameTime(gameTimestamp);
    const timeInfo = getReadableTime(gameTimestamp);

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
    if(mobileTime) mobileTime.textContent = timeInfo.short;
    if(mobileWeather) mobileWeather.textContent = `${weatherEmoji} ${world.temperature ?? '--'}°C`;

    // 寬版
    if(sideInfoTime) sideInfoTime.textContent = timeInfo.full;
    if(sideInfoTimeReadable) sideInfoTimeReadable.textContent = timeInfo.readable;
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
                li.className = 'narrative-entity text-entity-npc';
                li.dataset.entityId = npc.id;
                li.dataset.entityType = 'npc';
                // 優先顯示姓名 (alias)，若無則顯示稱號 (name)
                li.textContent = npc.alias || npc.name; 
                sideSceneCharactersList.appendChild(li);
            });
        } else {
            sideSceneCharactersList.innerHTML = '<li>此地似乎空無一人。</li>';
        }
    }
    
    // --- 渲染主敘事區與選項 ---
    const optionsRegex = /<options>([\s\S]*?)<\/options>/;
    let optionsContent = '';
    let narrativeHtml = "";

    (narrative || []).forEach(part => {
        if (!part.content) return;
        if (part.type === 'text') {
            let processedContent = part.content.replace(/\n/g, '<br>');
            if (optionsRegex.test(processedContent)) {
                optionsContent = processedContent.match(optionsRegex)[1].trim();
                processedContent = processedContent.replace(optionsRegex, '').trim();
            }
            narrativeHtml += processedContent;
        } else {
            narrativeHtml += `<span class="narrative-entity ${part.color_class || ''}" data-entity-id="${part.id}" data-entity-type="${part.type}">${part.text}</span>`;
        }
    });

    if (narrativeHtml.trim()) {
        const p = document.createElement('p');
        p.innerHTML = narrativeHtml;
        narrativeLog.appendChild(p);
    }
    
    actionOptionsContainer.innerHTML = '';
    if (optionsContent) {
        promptQuestion.style.display = 'block';
        customActionForm.style.display = 'flex';
        promptQuestion.textContent = "接下來你打算？";
        
        const options = optionsContent.replace(/<br>/g, '\n').split('\n').filter(line => line.trim().match(/^[A-C]\./));
        options.forEach(opt => {
            const button = document.createElement('button');
            const actionId = opt.substring(0, 1);
            button.dataset.actionId = actionId;
            button.textContent = opt.substring(2).trim(); // 移除 "A. "
            button.addEventListener('click', handleActionSelect);
            actionOptionsContainer.appendChild(button);
        });
    } else {
        promptQuestion.style.display = 'none';
        customActionForm.style.display = 'none';
    }

    narrativeLog.scrollTop = narrativeLog.scrollHeight;
}


async function handleEntityClick(event) {
    const target = event.target.closest('.narrative-entity');
    if (!target) return;

    const { entityId, entityType } = target.dataset;
    if (!entityId || !entityType) return;
    
    modalTitle.textContent = target.textContent;
    modalBody.innerHTML = '<div class="loading-spinner"></div><p>正在查詢資料...</p>';
    modal.classList.remove('hidden');

    try {
        const response = await fetch(ENTITY_INFO_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentGameSessionId,
                entity_id: entityId,
                entity_type: entityType
            }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || "查詢失敗");
        }
        
        const entityData = result.data;
        modalTitle.textContent = entityData.alias || entityData.name || target.textContent;

        let contentHtml = '<div class="info-grid">';
        if (entityType === 'npc') {
            if (entityData.name) contentHtml += `<strong>稱號:</strong><span>${entityData.name}</span>`;
            if (entityData.alias) contentHtml += `<strong>姓名:</strong><span>${entityData.alias}</span>`;
            if (entityData.mood) contentHtml += `<strong>心情:</strong><span>${entityData.mood}</span>`;
        } else if (entityType === 'item') {
            contentHtml += `<strong>名稱:</strong><span>${entityData.name || '未知'}</span>`;
            if (entityData.type) contentHtml += `<strong>類型:</strong><span>${entityData.type}</span>`;
        }
        contentHtml += '</div>';

        if (entityData.description) {
            contentHtml += `<p class="description-text">"${entityData.description}"</p>`;
        }
        modalBody.innerHTML = contentHtml;

    } catch (error) {
        modalBody.innerHTML = `<p style="color: var(--hp-color);">查詢失敗: ${error.message}</p>`;
    }
}


async function handleActionSelect(event) {
    const button = event.currentTarget;
    const actionText = button.dataset.actionId === 'CUSTOM' ? button.textContent : button.textContent;
    
    showLoading("AI 正在運算中，請稍候...");
    actionOptionsContainer.innerHTML = '';
    promptQuestion.style.display = 'none';
    customActionForm.style.display = 'none';

    try {
        const response = await fetch(TURN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentGameSessionId,
                player_action: {
                    id: button.dataset.actionId,
                    text: actionText
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP 錯誤: ${response.status}`);
        }

        const data = await response.json();
        if (data.narrative && data.state) {
            updateUI(data);
        } else {
            throw new Error("AI 回應格式不正確。");
        }

    } catch (error) {
        narrativeLog.innerHTML += `<p style="color: var(--hp-color);">與伺服器連線失敗: ${error.message}</p>`;
    } finally {
        hideLoading();
    }
}

function handleCustomActionSubmit(event) {
    event.preventDefault();
    const actionText = customActionInput.value.trim();
    if (!actionText) return;
    customActionInput.value = '';

    const customButton = {
        dataset: { actionId: 'CUSTOM' },
        textContent: actionText
    };
    handleActionSelect({ currentTarget: customButton });
}

function handleModalClose() {
    modal.classList.add('hidden');
}

async function initializeGame() {
    if (!currentGameSessionId) {
        window.location.href = 'login.html';
        return;
    }
    
    showLoading("正在載入您的江湖傳說...");
    narrativeLog.innerHTML = `<p style="color: var(--text-secondary)"> connecting to server...</p>`;
    
    try {
        // 獲取前情提要
        const summaryResponse = await fetch(SUMMARY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentGameSessionId })
        });
        const summaryResult = await summaryResponse.json();
        if (!summaryResponse.ok) throw new Error(summaryResult.error);
        
        const summaryP = document.createElement('p');
        summaryP.style.fontStyle = 'italic';
        summaryP.style.color = 'var(--text-secondary)';
        summaryP.innerHTML = summaryResult.summary.replace(/\n/g, '<br>');
        narrativeLog.innerHTML = ''; // 清空 connecting
        narrativeLog.appendChild(summaryP);
        
        // 獲取第一個回合
        const turnResponse = await fetch(TURN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentGameSessionId,
                player_action: { id: 'START', text: '繼續旅程' }
            })
        });
        const turnResult = await turnResponse.json();
        if (!turnResponse.ok) throw new Error(turnResult.error);
        
        updateUI(turnResult);

    } catch (error) {
        narrativeLog.innerHTML = `<p style="color: var(--hp-color);">遊戲初始化失敗: ${error.message}</p>`;
    } finally {
        hideLoading();
    }

    // --- 事件監聽 ---
    customActionForm.addEventListener('submit', handleCustomActionSubmit);
    narrativeLog.addEventListener('click', handleEntityClick);
    modalCloseBtn.addEventListener('click', handleModalClose);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) handleModalClose();
    });
    if(sideSceneCharactersList) sideSceneCharactersList.addEventListener('click', handleEntityClick);
}

// --- 遊戲啟動 ---
document.addEventListener('DOMContentLoaded', initializeGame);
