// 檔案: assets/js/main.js
// 版本: 5.0 (江湖煥新版)
// 描述: 全面適配新的 HTML 結構與 CSS 樣式，並實現使用者要求的新功能。
//      - 實現分隔線與提示標籤的動態渲染
//      - 修正登出按鈕與可收合面板的滾動軸問題
//      - 更新所有 DOM 元素選擇器以匹配新版面

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

// 窄版頂部元素
const hpBar = document.getElementById('hp-bar'), mpBar = document.getElementById('mp-bar');
const hpText = document.getElementById('hp-text'), mpText = document.getElementById('mp-text');
const mobileTime = document.getElementById('game-time-clock-mobile');
const mobileWeather = document.getElementById('weather-info-mobile');

// 寬版側邊欄元素
const sideHpBar = document.getElementById('hp-bar-side');
const sideMpBar = document.getElementById('mp-bar-side');
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

// 地區資訊 DOM
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

function setThemeByGameTime(gameTimestamp) {
    if (!gameTimestamp) return;
    const match = gameTimestamp.match(/([子丑寅卯辰巳午未申酉戌亥])時/);
    if (!match) return;
    const hourChar = match[1];
    const nightHours = ['戌', '亥', '子', '丑', '寅'];
    if (nightHours.includes(hourChar)) {
        document.body.classList.remove('theme-light');
    } else {
        document.body.classList.add('theme-light');
    }
}

function getReadableTime(gameTimestamp) {
    if (!gameTimestamp) return { full: "---", short: "--時--刻", readable: "" };
    const timePart = gameTimestamp.split(' ')[1] || '';
    const hourMap = {
        '子': '23:00-01:00', '丑': '01:00-03:00', '寅': '03:00-05:00', '卯': '05:00-07:00',
        '辰': '07:00-09:00', '巳': '09:00-11:00', '午': '11:00-13:00', '未': '13:00-15:00',
        '申': '15:00-17:00', '酉': '17:00-19:00', '戌': '19:00-21:00', '亥': '21:00-23:00'
    };
    const hourMatch = timePart.match(/([子丑寅卯辰巳午未申酉戌亥])時/);
    let readable = "";
    if (hourMatch && hourMap[hourMatch[1]]) {
        readable = `(約 ${hourMap[hourMatch[1]]})`;
    }
    return { full: gameTimestamp, short: timePart || "--時--刻", readable: readable };
}

/**
 * 新增：處理文字內容，將特殊標記轉換為 HTML
 * @param {string} content - 原始文字內容
 * @returns {string} - 處理後的 HTML 字串
 */
function processNarrativeContent(content) {
    let processed = content.replace(/\n/g, '<br>');

    // 轉換提示標籤，例如 [手工檢定][精細操作]
    processed = processed.replace(/\[([^\]]+)\]\[([^\]]+)\]/g, '<span class="hint-tag">$1</span><span class="hint-tag">$2</span>');
    processed = processed.replace(/\[([^[\]]+)\]/g, (match, p1) => {
        // 避免轉換已經處理過的 <tag> 或 【】
        if (p1.startsWith('<') || p1.startsWith('【')) {
            return match;
        }
        return `<span class="hint-tag">${p1}</span>`;
    });

    // 轉換分隔線標記，例如 【**本回合標題**】
    processed = processed.replace(/(【\*\*?.[^】]+?\*\*?】)/g, '<hr>$1');

    return processed;
}


function updateUI(data, isFromCache = false) {
    if (data.state) latestGameState = data.state;
    if (!isFromCache) {
        sessionStorage.setItem('cachedGameState', JSON.stringify(data));
    }

    const { narrative, state } = data;
    const { pc_data = {}, world = {}, metadata = {}, npcs = {}, locations = {} } = state;
    const { core_status = {}, basic_info = {} } = pc_data;
    const gameTimestamp = metadata?.game_timestamp;

    setThemeByGameTime(gameTimestamp);
    const timeInfo = getReadableTime(gameTimestamp);

    // --- 更新狀態條 ---
    const hpPercent = (core_status.hp?.current / core_status.hp?.max) * 100 || 0;
    const mpPercent = (core_status.mp?.current / core_status.mp?.max) * 100 || 0;
    const hpValues = `${core_status.hp?.current ?? '--'}/${core_status.hp?.max ?? '--'}`;
    const mpValues = `${core_status.mp?.current ?? '--'}/${core_status.mp?.max ?? '--'}`;
    
    // 窄版
    if(hpBar) hpBar.style.width = `${hpPercent}%`;
    if(mpBar) mpBar.style.width = `${mpPercent}%`;
    if(hpText) hpText.textContent = hpValues;
    if(mpText) mpText.textContent = mpValues;
    
    // 寬版
    if(sideHpBar) sideHpBar.style.width = `${hpPercent}%`;
    if(sideMpBar) sideMpBar.style.width = `${mpPercent}%`;
    if(sidePlayerHp) sidePlayerHp.textContent = hpValues;
    if(sidePlayerMp) sidePlayerMp.textContent = mpValues;

    // --- 更新環境資訊 ---
    const weatherEmojiMap = { "晴": "☀️", "陰": "☁️", "雨": "🌧️", "雪": "❄️", "霧": "🌫️" };
    const weatherEmoji = weatherEmojiMap[world.weather] || '';
    
    if(mobileTime) mobileTime.textContent = timeInfo.short;
    if(mobileWeather) mobileWeather.textContent = `${weatherEmoji} ${world.temperature ?? '--'}°C`;
    
    if(sideInfoTime) sideInfoTime.textContent = timeInfo.full;
    if(sideInfoTimeReadable) sideInfoTimeReadable.textContent = timeInfo.readable;
    if(sideInfoLocation) sideInfoLocation.textContent = world.player_current_location_name ?? '未知';
    if(sideWeather) sideWeather.textContent = `${weatherEmoji} ${world.weather || ''}`;
    if(sideTemp) sideTemp.textContent = `${world.temperature ?? '--'} °C`;
    if(sideHumidity) sideHumidity.textContent = `${world.humidity ?? '--'} %`;

    // --- 更新玩家與場景資訊 ---
    if(sidePlayerName) sidePlayerName.textContent = basic_info.name ?? '---';

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
                li.textContent = npc.alias || npc.name; 
                sideSceneCharactersList.appendChild(li);
            });
        } else {
            sideSceneCharactersList.innerHTML = '<li>此地似乎空無一人。</li>';
        }
    }
    const currentLocation = locations[world.player_current_location_id] || {};
    if (sceneDesc) sceneDesc.textContent = currentLocation.description || "探索中...";
    if (sceneSize) sceneSize.textContent = currentLocation.size || "未知";
    if (scenePopulation) scenePopulation.textContent = currentLocation.population || "未知";
    if (sceneEconomy) sceneEconomy.textContent = currentLocation.economy || "未知";
    if (sceneSpecialty) sceneSpecialty.textContent = currentLocation.specialty || "未知";
    if (sceneFaction) sceneFaction.textContent = currentLocation.faction || "未知";
    if (sceneReligion) sceneReligion.textContent = currentLocation.religion || "未知";

    // --- 更新劇情日誌與選項 ---
    if (!isFromCache) {
        const optionsRegex = /<options>([\s\S]*?)<\/options>/;
        let optionsContent = '';
        let narrativeHtml = "";

        (narrative || []).forEach(part => {
            const content = part.content || part.text || '';
            if (part.type === 'text') {
                let processedContent = content;
                if (optionsRegex.test(processedContent)) {
                    optionsContent = processedContent.match(optionsRegex)[1].trim();
                    processedContent = processedContent.replace(optionsRegex, '').trim();
                }
                narrativeHtml += processNarrativeContent(processedContent);
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
        promptQuestion.style.display = 'block';
        customActionForm.style.display = 'flex';

        if (optionsContent) {
            promptQuestion.textContent = "接下來你打算？";
            const optionLineRegex = /^(?:[A-Z]|\d+)\..*$/m;
            const options = optionsContent.replace(/<br\s*\/?>/g, '\n').split('\n').filter(line => line.trim().match(optionLineRegex));

            // 如果AI給出的選項少於3個，則補充預設選項
            while (options.length > 0 && options.length < 3) {
                 const defaultOptions = [
                    'D. 仔細觀察四周的環境。',
                    'E. 檢查一下自身的身體狀況。',
                    'F. 原地休息，恢復體力。'
                 ];
                 if (!options.some(o => o.includes('觀察'))) options.push(defaultOptions[0]);
                 else if (!options.some(o => o.includes('檢查'))) options.push(defaultOptions[1]);
                 else options.push(defaultOptions[2]);
            }
            
            options.forEach(opt => {
                const match = opt.trim().match(/^(?:([A-Z])|(\d+))\.\s*(.*)/);
                if (match) {
                    const button = document.createElement('button');
                    button.dataset.actionId = match[1] || match[2];
                    button.textContent = match[3];
                    button.addEventListener('click', handleActionSelect);
                    actionOptionsContainer.appendChild(button);
                }
            });
        } else {
            promptQuestion.innerHTML = "劇情暫告一段落，你可以嘗試：";
            const defaultOptions = [
                { id: 'A', text: '仔細觀察四周的環境。' },
                { id: 'B', text: '檢查一下自身的身體狀況。' },
                { id: 'C', text: '原地休息，恢復體力。' }
            ];
            defaultOptions.forEach(opt => {
                const button = document.createElement('button');
                button.dataset.actionId = opt.id;
                button.textContent = opt.text;
                button.addEventListener('click', handleActionSelect);
                actionOptionsContainer.appendChild(button);
            });
        }
        narrativeLog.scrollTop = narrativeLog.scrollHeight;
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
        narrativeLog.innerHTML += `<p style="color: var(--danger-color);">與伺服器連線失敗: ${error.message}</p>`;
        // 恢復操作選項
        promptQuestion.style.display = 'block';
        customActionForm.style.display = 'flex';
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
        modalBody.innerHTML = `<p style="color: var(--danger-color);">查詢失敗: ${error.message}</p>`;
    }
}

function handleModalClose() {
    modal.classList.add('hidden');
}

function handleLogout() {
    if (confirm("確定要退出江湖，返回登入畫面嗎？")) {
        localStorage.removeItem('game_session_id');
        sessionStorage.removeItem('cachedGameState');
        window.location.href = 'login.html';
    }
}

/**
 * 修正：處理可收合面板的展開與收合
 */
function toggleCollapse(event) {
    const title = event.currentTarget;
    const content = title.nextElementSibling;
    if (content && content.classList.contains('collapsible-content')) {
        const isCollapsed = content.classList.contains('collapsed');
        title.classList.toggle('collapsed', !isCollapsed);
        content.classList.toggle('collapsed', !isCollapsed);
        
        // 為了讓滾動條正常工作，我們在展開後添加 'expanded' class
        // 使用 setTimeout 確保在 max-height 動畫完成後再添加
        if (isCollapsed) { // 如果是從收合到展開
            setTimeout(() => {
                content.classList.add('expanded');
            }, 300); // 動畫時間 0.4s
        } else { // 如果是從展開到收合
            content.classList.remove('expanded');
        }
    }
}

async function initializeGame() {
    if (!currentGameSessionId) {
        window.location.href = 'login.html';
        return;
    }

    // --- 事件監聽 ---
    customActionForm.addEventListener('submit', handleCustomActionSubmit);
    narrativeLog.addEventListener('click', handleEntityClick);
    modalCloseBtn.addEventListener('click', handleModalClose);
    modal.addEventListener('click', (e) => { if (e.target === modal) handleModalClose(); });
    if (sideSceneCharactersList) sideSceneCharactersList.addEventListener('click', handleEntityClick);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    document.querySelectorAll('.collapsible-title').forEach(title => {
        title.addEventListener('click', toggleCollapse);
        const content = title.nextElementSibling;
        if (content && !content.classList.contains('expanded')) {
            title.classList.add('collapsed');
            content.classList.add('collapsed');
        }
    });

    const contactsBtn = document.getElementById('contacts-btn');
    const attributesBtn = document.getElementById('attributes-btn');
    const inventoryBtn = document.getElementById('inventory-btn');
    if(contactsBtn) contactsBtn.addEventListener('click', () => alert('「人脈」功能開發中...'));
    if(attributesBtn) attributesBtn.addEventListener('click', () => alert('「數值」功能開發中...'));
    if(inventoryBtn) inventoryBtn.addEventListener('click', () => alert('「行囊」功能開發中...'));
    
    // 窄版按鈕
    const statusBtnMobile = document.getElementById('status-btn-mobile');
    const inventoryBtnMobile = document.getElementById('inventory-btn-mobile');
    const mapBtnMobile = document.getElementById('map-btn-mobile');
    if(statusBtnMobile) statusBtnMobile.addEventListener('click', () => alert('「狀態」功能開發中...'));
    if(inventoryBtnMobile) inventoryBtnMobile.addEventListener('click', () => alert('「行囊」功能開發中...'));
    if(mapBtnMobile) mapBtnMobile.addEventListener('click', () => alert('「地區」功能開發中...'));


    // --- 頁面載入邏輯 ---
    const cachedData = sessionStorage.getItem('cachedGameState');
    if (cachedData) {
        try {
            const parsedData = JSON.parse(cachedData);
            narrativeLog.innerHTML = parsedData.state?.narrative_log?.map(line => `<p>${processNarrativeContent(line)}</p>`).join('') || '';
            updateUI(parsedData, true);
            narrativeLog.scrollTop = narrativeLog.scrollHeight;
        } catch (e) {
            console.error("解析快取失敗:", e);
            sessionStorage.removeItem('cachedGameState');
        }
    }
    
    if (!cachedData) {
        showLoading("正在載入您的江湖傳說...");
        narrativeLog.innerHTML = `<p style="color: var(--text-secondary)">正在連接伺服器...</p>`;
    }
    
    try {
        const isFirstLoad = !cachedData;
        const playerAction = isFirstLoad ? { id: 'START', text: '繼續旅程' } : { id: 'REFRESH', text: '刷新頁面' };
        
        if (isFirstLoad) {
            const summaryResponse = await fetch(SUMMARY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: currentGameSessionId })
            });
            const summaryResult = await summaryResponse.json();
            if (!summaryResponse.ok) throw new Error(summaryResult.error || "獲取前情提要失敗");
            
            const summaryP = document.createElement('p');
            summaryP.style.fontStyle = 'italic';
            summaryP.style.color = 'var(--text-secondary)';
            summaryP.innerHTML = summaryResult.summary.replace(/\n/g, '<br>');
            narrativeLog.innerHTML = '';
            narrativeLog.appendChild(summaryP);
        }

        const turnResponse = await fetch(TURN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentGameSessionId,
                player_action: playerAction
            })
        });
        const turnResult = await turnResponse.json();
        if (!turnResponse.ok) throw new Error(turnResult.error || "獲取回合數據失敗");
        
        if (isFirstLoad || !cachedData) {
            updateUI(turnResult);
        } else {
            latestGameState = turnResult.state;
            sessionStorage.setItem('cachedGameState', JSON.stringify(turnResult));
            updateUI(turnResult, true);
        }
    } catch (error) {
        narrativeLog.innerHTML += `<p style="color: var(--danger-color);">遊戲載入失敗: ${error.message}</p>`;
    } finally {
        hideLoading();
    }
}

// --- 遊戲啟動 ---
document.addEventListener('DOMContentLoaded', initializeGame);
