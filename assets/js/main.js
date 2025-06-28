// 檔案: assets/js/main.js
// 版本: 4.3 - 修正選項按鈕解析邏輯，兼容數字與字母列表

// --- 設定與 API URL (無變動) ---
const API_BASE_URL = "https://md-server-main.onrender.com";
const TURN_URL = `${API_BASE_URL}/api/generate_turn`;
const ENTITY_INFO_URL = `${API_BASE_URL}/api/get_entity_info`;
const SUMMARY_URL = `${API_BASE_URL}/api/get_summary`;
const currentGameSessionId = localStorage.getItem('game_session_id');

// --- DOM 元素獲取 (無變動) ---
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const narrativeLog = document.getElementById('narrative-log');
const actionOptionsContainer = document.getElementById('action-options');
const promptQuestion = document.getElementById('prompt-question');
const customActionForm = document.getElementById('custom-action-form');
const customActionInput = document.getElementById('custom-action-input');
const logoutBtn = document.getElementById('logout-btn-corner');
const hpBar = document.getElementById('hp-bar'), mpBar = document.getElementById('mp-bar');
const hpText = document.getElementById('hp-text'), mpText = document.getElementById('mp-text');
const mobileTime = document.getElementById('game-time-clock-mobile');
const mobileWeather = document.getElementById('weather-info-mobile');
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
const sceneDesc = document.getElementById('scene-desc');
const sceneSize = document.getElementById('scene-size');
const scenePopulation = document.getElementById('scene-population');
const sceneEconomy = document.getElementById('scene-economy');
const sceneSpecialty = document.getElementById('scene-specialty');
const sceneFaction = document.getElementById('scene-faction');
const sceneReligion = document.getElementById('scene-religion');
const modal = document.getElementById('info-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

let latestGameState = {};

// --- 核心功能函數 ---

function showLoading(text) {
    if (loadingOverlay) { loadingText.textContent = text; loadingOverlay.classList.remove('hidden'); }
}
function hideLoading() {
    if (loadingOverlay) { loadingOverlay.classList.add('hidden'); }
}
function setThemeByGameTime(gameTimestamp) {
    if (!gameTimestamp) return;
    const match = gameTimestamp.match(/([子丑寅卯辰巳午未申酉戌亥])時/);
    if (!match) return;
    const hourChar = match[1];
    const nightHours = ['戌', '亥', '子', '丑', '寅'];
    if (nightHours.includes(hourChar)) { document.body.classList.remove('theme-light'); } 
    else { document.body.classList.add('theme-light'); }
}
function getReadableTime(gameTimestamp) {
    if (!gameTimestamp) return { full: "---", short: "--時--刻", readable: "" };
    const timePart = gameTimestamp.split(' ')[1] || '';
    const hourMap = { '子': '23:00-01:00', '丑': '01:00-03:00', '寅': '03:00-05:00', '卯': '05:00-07:00', '辰': '07:00-09:00', '巳': '09:00-11:00', '午': '11:00-13:00', '未': '13:00-15:00', '申': '15:00-17:00', '酉': '17:00-19:00', '戌': '19:00-21:00', '亥': '21:00-23:00' };
    const keMap = { '初刻': 0, '一刻': 15, '二刻': 30, '三刻': 45 };
    const hourMatch = timePart.match(/([子丑寅卯辰巳午未申酉戌亥])時/);
    const keMatch = timePart.match(/(初刻|一刻|二刻|三刻)/);
    let readable = "";
    if (hourMatch) {
        const startHour = parseInt(hourMap[hourMatch[1]].split('-')[0], 10);
        let approximateMinute = keMatch ? keMap[keMatch[1]] : 0;
        const totalMinutes = startHour * 60 + approximateMinute;
        const displayHour = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
        const displayMinute = String(totalMinutes % 60).padStart(2, '0');
        readable = `(約 ${displayHour}:${displayMinute})`;
    }
    return { full: gameTimestamp, short: timePart || "--時--刻", readable: readable };
}

// 【核心修改】updateUI 函數
function updateUI(data, isFromCache = false) {
    if (data.state) latestGameState = data.state;
    if (!isFromCache) { sessionStorage.setItem('cachedGameState', JSON.stringify(data)); }

    const { narrative, state } = data;
    const { pc_data = {}, world = {}, metadata = {}, npcs = {}, locations = {} } = state;
    const { core_status = {}, basic_info = {} } = pc_data;
    const gameTimestamp = metadata?.game_timestamp;

    setThemeByGameTime(gameTimestamp);
    const timeInfo = getReadableTime(gameTimestamp);
    
    // --- 更新UI元素 (無變動) ---
    // (此處省略未變動的UI更新代碼以保持簡潔)
    const hpPercent = (core_status.hp?.current / core_status.hp?.max) * 100 || 0;
    const mpPercent = (core_status.mp?.current / core_status.mp?.max) * 100 || 0;
    const weatherEmojiMap = { "晴": "☀️", "陰": "☁️", "雨": "🌧️", "雪": "❄️", "霧": "🌫️" };
    const weatherEmoji = weatherEmojiMap[world.weather] || '';
    if(hpBar) hpBar.style.width = `${hpPercent}%`;
    if(mpBar) mpBar.style.width = `${mpPercent}%`;
    if(hpText) hpText.textContent = `${core_status.hp?.current ?? '--'}/${core_status.hp?.max ?? '--'}`;
    if(mpText) mpText.textContent = `${core_status.mp?.current ?? '--'}/${core_status.mp?.max ?? '--'}`;
    if(mobileTime) mobileTime.textContent = timeInfo.short;
    if(mobileWeather) mobileWeather.textContent = `${weatherEmoji} ${world.temperature ?? '--'}°C`;
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
    // --- UI更新結束 ---

    if (!isFromCache) {
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

            // 【修改】使用更靈活的正規表示式來解析選項
            const optionLineRegex = /^(?:[A-Z]|\d+)\..*$/m;
            const options = optionsContent.replace(/<br>/g, '\n').split('\n').filter(line => line.trim().match(optionLineRegex));

            options.forEach(opt => {
                const match = opt.trim().match(/^(?:([A-Z])|(\d+))\.\s*(.*)/);
                if (match) {
                    const actionId = match[1] || match[2]; // 優先使用字母，否則用數字
                    const textContent = match[3];
                    
                    const button = document.createElement('button');
                    button.dataset.actionId = actionId;
                    button.textContent = textContent;
                    button.addEventListener('click', handleActionSelect);
                    actionOptionsContainer.appendChild(button);
                }
            });
        } else {
            promptQuestion.style.display = 'none';
            customActionForm.style.display = 'none';
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
    } finally {
        hideLoading();
    }
}


function handleModalClose() { modal.classList.add('hidden'); }
function handleLogout() { if (confirm("確定要退出江湖，返回登入畫面嗎？")) { localStorage.removeItem('game_session_id'); sessionStorage.removeItem('cachedGameState'); window.location.href = 'login.html'; } }
function toggleCollapse(event) {
    const title = event.currentTarget;
    const content = title.nextElementSibling;
    if (content && content.classList.contains('collapsible-content')) { title.classList.toggle('collapsed'); content.classList.toggle('collapsed'); }
}
function handleCustomActionSubmit(event) { /* ... (無變動) ... */ }
async function handleEntityClick(event) { /* ... (無變動) ... */ }


// --- 遊戲初始化函數 (無變動) ---
async function initializeGame() {
    if (!currentGameSessionId) { window.location.href = 'login.html'; return; }

    // --- 事件監聽 ---
    customActionForm.addEventListener('submit', handleCustomActionSubmit);
    narrativeLog.addEventListener('click', handleEntityClick);
    modalCloseBtn.addEventListener('click', handleModalClose);
    modal.addEventListener('click', (e) => { if (e.target === modal) handleModalClose(); });
    if (sideSceneCharactersList) sideSceneCharactersList.addEventListener('click', handleEntityClick);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    document.querySelectorAll('.collapsible-title').forEach(title => {
        title.addEventListener('click', toggleCollapse);
        title.classList.add('collapsed');
        const content = title.nextElementSibling;
        if (content && content.classList.contains('collapsible-content')) { content.classList.add('collapsed'); }
    });
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
            const parsedData = JSON.parse(cachedData);
            narrativeLog.innerHTML = parsedData.state?.narrative_log?.map(line => `<p>${line.replace(/\n/g, '<br>')}</p>`).join('') || '';
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
            const summaryResponse = await fetch(SUMMARY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: currentGameSessionId }) });
            const summaryResult = await summaryResponse.json();
            if (!summaryResponse.ok) throw new Error(summaryResult.error || "獲取前情提要失敗");
            const summaryP = document.createElement('p');
            summaryP.style.fontStyle = 'italic';
            summaryP.style.color = 'var(--text-secondary)';
            summaryP.innerHTML = summaryResult.summary.replace(/\n/g, '<br>');
            narrativeLog.innerHTML = '';
            narrativeLog.appendChild(summaryP);
        }

        const turnResponse = await fetch(TURN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: currentGameSessionId, player_action: playerAction }) });
        const turnResult = await turnResponse.json();
        if (!turnResponse.ok) throw new Error(turnResult.error || "獲取回合數據失敗");
        
        if (isFirstLoad) { updateUI(turnResult); } 
        else {
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
