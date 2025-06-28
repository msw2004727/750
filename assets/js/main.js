// main.js - v1.1 - 遊戲主邏輯與 UI 控制器 (整合即時資訊欄)

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

// 場景角色與設施面板元素
const sceneCharactersList = document.getElementById('scene-characters-list');
const nearbyFacilitiesList = document.getElementById('nearby-facilities-list');

// ------------------- 核心功能函數 -------------------

/**
 * 解析 AI 回傳的完整文字敘述，並將其轉換為結構化的遊戲狀態物件
 * @param {string} rawText - 從後端收到的完整文字回應
 * @returns {object} 一個結構化的遊戲狀態物件
 */
function parseNarrative(rawText) {
    const gameState = {
        header: {
            round: '---',
            time: '---',
            location: '---',
            weather: '---',
            present: []
        },
        title: "劇情摘要",
        narrative: "無法解析劇情...",
        playerStatus: {},
        actionOptions: []
    };

    const lines = rawText.split('\n').filter(line => line.trim() !== '');
    
    let currentSection = 'header'; // header, narrative, options, other
    let narrativeLines = [];

    for (const line of lines) {
        if (line.startsWith('---')) continue;
        if (line.startsWith('***')) continue;

        if (line.startsWith('🎲 回合：')) {
            gameState.header.round = line.replace('🎲 回合：', '').trim();
            continue;
        }
        if (line.startsWith('🕐 時間：')) {
            gameState.header.time = line.replace('🕐 時間：', '').trim();
            continue;
        }
        if (line.startsWith('📍 地點：')) {
            gameState.header.location = line.replace('📍 地點：', '').trim();
            continue;
        }
        if (line.startsWith('🌦️ 天氣：')) {
            gameState.header.weather = line.replace('🌦️ 天氣：', '').trim();
            continue;
        }
        if (line.startsWith('👥 在場：')) {
            gameState.header.present = line.replace('👥 在場：', '').split(',').map(s => s.trim());
            continue;
        }

        if (line.startsWith('【**')) {
            gameState.title = line.match(/【\*\*(.*?)\*\*】/)?.[1] || "劇情摘要";
            currentSection = 'narrative';
            continue;
        }
        
        if (line.startsWith('**你現在打算：**')) {
            currentSection = 'options';
            continue;
        }

        if (line.startsWith('📑 **狀態速覽**')) {
            currentSection = 'status';
            continue;
        }

        switch (currentSection) {
            case 'narrative':
                // 忽略可選提示區塊
                if (!line.startsWith('[【') && !line.startsWith('---')) {
                    narrativeLines.push(line);
                }
                break;
            case 'options':
                const optionMatch = line.match(/^([A-Z])\.\s*(.*)/);
                if (optionMatch) {
                    gameState.actionOptions.push({ id: optionMatch[1], text: optionMatch[2].trim() });
                }
                break;
            case 'status':
                 // 使用正則表達式從單行中解析多個狀態值
                 const statusMatch = line.match(/❤️ HP: (.*?)\s*\|.*💪 STA: (.*?)\s*\|.*🧠 MP: (.*?)\s*\|.*✨ SAN: (.*)/);
                 if(statusMatch) {
                     gameState.playerStatus.hp = statusMatch[1].trim();
                     gameState.playerStatus.sta = statusMatch[2].trim();
                     gameState.playerStatus.mp = statusMatch[3].trim();
                     gameState.playerStatus.san = statusMatch[4].trim();
                 }
                 const conditionMatch = line.match(/🤕 狀態: (.*)/);
                 if(conditionMatch) {
                     gameState.playerStatus.status = conditionMatch[1].trim();
                 }
                 break;
        }
    }

    gameState.narrative = narrativeLines.join('\n');
    return gameState;
}


/**
 * 更新所有 UI 面板的數據
 * @param {string} rawNarrative - 從後端收到的完整文字回應
 */
function updateUI(rawNarrative) {
    const newState = parseNarrative(rawNarrative);

    // 1. 更新即時資訊欄
    infoRoundEl.textContent = newState.header.round;
    infoTimeEl.textContent = newState.header.time;
    infoLocationEl.textContent = newState.header.location;
    infoWeatherEl.textContent = newState.header.weather;
    
    // 2. 更新主敘事窗口
    narrativeLog.innerHTML = `<h3>${newState.title}</h3><p>${newState.narrative.replace(/\n/g, '<br>')}</p>`;
    narrativeLog.scrollTop = narrativeLog.scrollHeight; 
    
    // 3. 更新玩家狀態面板
    if (Object.keys(newState.playerStatus).length > 0) {
        playerHpEl.textContent = newState.playerStatus.hp || '--/--';
        playerMpEl.textContent = newState.playerStatus.mp || '--/--';
        playerStatusEl.textContent = newState.playerStatus.status || '良好';
    }
    
    // 4. 更新場景角色
    if(newState.header.present.length > 0) {
        sceneCharactersList.innerHTML = ''; // 清空
        newState.header.present.forEach(charName => {
            const li = document.createElement('li');
            li.textContent = charName;
            sceneCharactersList.appendChild(li);
        });
    } else {
        sceneCharactersList.innerHTML = '<li>此處無人。</li>';
    }

    // 5. 更新行動選項
    promptQuestion.textContent = "你現在打算：";
    actionOptionsContainer.innerHTML = ''; // 清空
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
 * @param {Event} event - 點擊事件
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
                player_action: {
                    id: actionId,
                    text: actionText.substring(3).trim()
                },
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
    
    narrativeLog.innerHTML = `
        <h2>文字江湖：黑風寨崛起</h2>
        <p>一個基於深度模擬與 AI 驅動的武俠世界。</p>
        <p>你的每一個選擇，都將銘刻在這個世界的歷史之中。</p>
    `;
    promptQuestion.textContent = "準備好開始你的傳奇了嗎？";
    actionOptionsContainer.innerHTML = '<button id="start-game-btn">始動</button>';
    
    document.getElementById('start-game-btn').addEventListener('click', (e) => {
         handleActionSelect({ target: { dataset: { actionId: 'START' }, textContent: 'A. 始動' } });
    });

    playerNameEl.textContent = "阿宅";
}

// 當 DOM 載入完成後，啟動遊戲
document.addEventListener('DOMContentLoaded', initializeGame);
