// main.js - v1.2 - 遊戲主邏輯與 UI 控制器 (整合迷霧系統與距離顯示)

// ------------------- 設定 -------------------
const BACKEND_URL = "https://md-server-main.onrender.com/api/generate_turn";

// ------------------- DOM 元素獲取 -------------------
const narrativeLog = document.getElementById('narrative-log');
const actionOptionsContainer = document.getElementById('action-options');
const promptQuestion = document.getElementById('prompt-question');

// 即時資訊欄元素
const infoRoundEl = document.getElementById('info-round');
const infoTimeEl = document.getElementById('info-time');
const infoLocationEl = document.getElementById('info-location');
const infoWeatherEl = document.getElementById('info-weather');

// 玩家資料面板元素
const playerNameEl = document.getElementById('player-name');
const playerStatusEl = document.getElementById('player-status');
const playerHpEl = document.getElementById('player-hp');
const playerMpEl = document.getElementById('player-mp');

// 場景與地區面板元素
const sceneCharactersList = document.getElementById('scene-characters-list');
const areaInfoContentEl = document.getElementById('area-info-content');


// ------------------- 核心功能函數 -------------------

/**
 * [新] 解析 AI 回傳的完整文字敘述 v1.2
 */
function parseNarrative(rawText) {
    const gameState = {
        header: { round: '?', time: '未知', location: '未知', weather: '未知', present: [] },
        title: "劇情發展",
        narrative: "...",
        playerStatus: {},
        scene: { characters: [] },
        areaInfo: {}, // 儲存地區資訊
        actionOptions: []
    };

    const lines = rawText.split('\n').filter(line => line.trim() !== '');
    
    // 解析頂部 Header
    gameState.header.round = (lines.find(l => l.startsWith('🎲')) || '').replace('🎲 回合：', '').trim();
    gameState.header.time = (lines.find(l => l.startsWith('🕐')) || '').replace('🕐 時間：', '').trim();
    gameState.header.location = (lines.find(l => l.startsWith('📍')) || '').replace('📍 地點：', '').trim();
    gameState.header.weather = (lines.find(l => l.startsWith('🌦️')) || '').replace('🌦️ 天氣：', '').trim();
    
    // 解析主敘述和標題
    const mainNarrativeSection = rawText.match(/【\*\*(.*?)\*\*】([\s\S]*?)---/);
    if(mainNarrativeSection) {
        gameState.title = mainNarrativeSection[1];
        // 移除所有 *** 分隔的區塊，只保留主敘述
        gameState.narrative = mainNarrativeSection[2].split('***')[0].trim();
    } else {
        // 備用解析方案
        const narrativeParts = rawText.split('---');
        if (narrativeParts.length > 1) gameState.narrative = narrativeParts[1].split('***')[0].trim();
    }
    
    // [核心升級] 解析主敘述中的角色及其距離
    const entityRegex = /【([^】]+)】\s*\((約?[\d\.]+m)\)/g;
    let match;
    while ((match = entityRegex.exec(gameState.narrative)) !== null) {
        gameState.scene.characters.push({ name: match[1], distance: match[2] });
    }
    
    // 解析狀態速覽
    const statusSection = lines.find(s => s.startsWith("📑 **狀態速覽**"));
    if (statusSection) {
        const statusLine = statusSection.split('\n')[1] || "";
        const statusMatch = statusLine.match(/❤️ HP: (.*?)\s*\|.*💪 STA: (.*?)\s*\|.*🧠 MP: (.*?)\s*\|.*✨ SAN: (.*)/);
        if (statusMatch) {
            gameState.playerStatus = {
                hp: statusMatch[1].trim(),
                sta: statusMatch[2].trim(),
                mp: statusMatch[3].trim(),
                san: statusMatch[4].trim()
            };
        }
    }
    
    // 解析行動選項
    const optionsIndex = lines.findIndex(l => l.startsWith('**你現在打算：**'));
    if (optionsIndex > -1) {
        for (let i = optionsIndex + 1; i < lines.length; i++) {
            const optionMatch = lines[i].match(/^([A-Z])\.\s*(.*)/);
            if (optionMatch) {
                gameState.actionOptions.push({ id: optionMatch[1], text: optionMatch[2].trim() });
            }
        }
    }
    
    return gameState;
}


/**
 * [新] 更新所有 UI 面板的數據 v1.2
 */
function updateUI(rawNarrative) {
    const newState = parseNarrative(rawNarrative);

    // 1. 更新即時資訊欄
    infoRoundEl.textContent = newState.header.round || '---';
    infoTimeEl.textContent = newState.header.time || '---';
    infoLocationEl.textContent = newState.header.location || '---';
    infoWeatherEl.textContent = newState.header.weather || '---';
    
    // 2. 更新主敘事窗口
    narrativeLog.innerHTML = `<h3>${newState.title}</h3><p>${newState.narrative.replace(/\n/g, '<br>')}</p>`;
    narrativeLog.scrollTop = narrativeLog.scrollHeight; 
    
    // 3. 更新玩家狀態面板
    if (Object.keys(newState.playerStatus).length > 0) {
        playerHpEl.textContent = newState.playerStatus.hp || '--/--';
        playerMpEl.textContent = newState.playerStatus.mp || '--/--';
    }
    
    // 4. 更新場景角色與距離
    sceneCharactersList.innerHTML = '';
    if (newState.scene.characters.length > 0) {
        newState.scene.characters.forEach(char => {
            const li = document.createElement('li');
            li.innerHTML = `${char.name} <span class="distance">(${char.distance})</span>`;
            sceneCharactersList.appendChild(li);
        });
    } else {
        sceneCharactersList.innerHTML = '<li>可視範圍內無人。</li>';
    }

    // [未來擴充] 5. 更新地區資訊 (迷霧系統)
    // 這裡的邏輯需要後端在回傳 narrative 的同時，也回傳一份更新後的 worldState
    // 假設後端回傳格式為 { narrative: "...", worldState: {...} }
    // if (worldState.area_info) {
    //     areaInfoContentEl.innerHTML = ''; // 清空
    //     for (const [key, info] of Object.entries(worldState.area_info)) {
    //          const p = document.createElement('p');
    //          p.innerHTML = `<strong>${info.label}:</strong> <span>${info.is_known ? info.value : '未知'}</span>`;
    //          areaInfoContentEl.appendChild(p);
    //     }
    // }

    // 6. 更新行動選項
    promptQuestion.textContent = "你現在打算：";
    actionOptionsContainer.innerHTML = '';
    if (newState.actionOptions.length > 0) {
        newState.actionOptions.forEach(option => {
            const button = document.createElement('button');
            button.textContent = `${option.id}. ${option.text}`;
            button.dataset.actionId = option.id;
            button.addEventListener('click', handleActionSelect);
            actionOptionsContainer.appendChild(button);
        });
    } else {
        promptQuestion.textContent = "劇情在此告一段落...";
    }
}

/**
 * 處理玩家選擇的行動
 */
async function handleActionSelect(event) {
    const actionId = event.target.dataset.actionId;
    const actionText = event.target.textContent;

    const p = document.createElement('p');
    p.innerHTML = `<strong>> ${actionText}</strong>`;
    p.classList.add('player-prompt');
    narrativeLog.appendChild(p);
    narrativeLog.scrollTop = narrativeLog.scrollHeight;

    promptQuestion.textContent = "AI 正在運算中，請稍候...";
    actionOptionsContainer.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_action: { id: actionId, text: actionText.substring(3).trim() },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `伺服器錯誤: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.narrative) {
            updateUI(data.narrative);
        } else {
            throw new Error("AI 回應格式不正確。");
        }

    } catch (error) {
        console.error("請求失敗:", error);
        promptQuestion.textContent = "發生錯誤！";
        actionOptionsContainer.innerHTML = `<p style="color: red;">與伺服器連線失敗: ${error.message}</p><button onclick="location.reload()">重新載入</button>`;
    }
}

/**
 * 遊戲初始化函數
 */
function initializeGame() {
    console.log("遊戲初始化...");
    
    narrativeLog.innerHTML = `<h2>文字江湖：黑風寨崛起</h2><p>一個基於深度模擬與 AI 驅動的武俠世界。</p><p>你的每一個選擇，都將銘刻在這個世界的歷史之中。</p>`;
    promptQuestion.textContent = "準備好開始你的傳奇了嗎？";
    actionOptionsContainer.innerHTML = '<button id="start-game-btn">始動</button>';
    
    document.getElementById('start-game-btn').addEventListener('click', (e) => {
         handleActionSelect({ target: { dataset: { actionId: 'START' }, textContent: 'A. 始動' } });
    });

    playerNameEl.textContent = "阿宅";
    // 清空動態列表
    sceneCharactersList.innerHTML = '<li>---</li>';
    areaInfoContentEl.innerHTML = '<p>地區資訊：<span>未知</span></p>';
}

// 當 DOM 載入完成後，啟動遊戲
document.addEventListener('DOMContentLoaded', initializeGame);
