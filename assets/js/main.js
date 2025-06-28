// 檔案: assets/js/main.js
// 版本: 2.3 - 實現結構化敘事渲染與UI面板更新

// ------------------- 設定 -------------------
const BACKEND_URL = "https://md-server-main.onrender.com/api/generate_turn";
const currentGameSessionId = localStorage.getItem('game_session_id');

// ------------------- DOM 元素獲取 -------------------
const narrativeLog = document.getElementById('narrative-log');
const actionOptionsContainer = document.getElementById('action-options');
const promptQuestion = document.getElementById('prompt-question');

// UI 面板元素
const infoRound = document.getElementById('info-round');
const infoTime = document.getElementById('info-time');
const infoLocation = document.getElementById('info-location');
const playerName = document.getElementById('player-name');
const playerHp = document.getElementById('player-hp');
const playerMp = document.getElementById('player-mp');
const sceneCharactersList = document.getElementById('scene-characters-list');


// ------------------- 核心功能函數 -------------------

/**
 * 【核心改造】更新整個遊戲介面 (UI)
 * @param {object} data - 從後端接收到的完整響應數據，包含 narrative 和 state
 */
function updateUI(data) {
    const { narrative, state } = data;

    // 1. 更新側邊欄的玩家與世界資訊
    if (state) {
        // 世界資訊
        infoRound.textContent = state.metadata?.round ?? '---';
        infoTime.textContent = state.metadata?.game_timestamp ?? '---';
        infoLocation.textContent = state.world?.player_current_location_name ?? '---';
        
        // 玩家資訊
        const pc_data = state.pc_data;
        if (pc_data) {
            playerName.textContent = pc_data.basic_info?.name ?? '---';
            playerHp.textContent = `${pc_data.core_status?.hp?.current ?? '--'}/${pc_data.core_status?.hp?.max ?? '--'}`;
            playerMp.textContent = `${pc_data.core_status?.mp?.current ?? '--'}/${pc_data.core_status?.mp?.max ?? '--'}`;
        }
    }

    // 2. 處理並渲染主敘事區塊
    // 先清空舊的行動選項
    actionOptionsContainer.innerHTML = '';
    promptQuestion.textContent = '...';

    // 從 narrative 陣列中分離出 <options>
    const optionsRegex = /<options>([\s\S]*?)<\/options>/;
    let optionsContent = '';
    let narrativeParts = narrative;

    // 在 narrative 的最後一個元素中尋找 options
    const lastPart = narrative[narrative.length - 1];
    if (lastPart.type === 'text' && optionsRegex.test(lastPart.content)) {
        const match = lastPart.content.match(optionsRegex);
        optionsContent = match[1].trim();
        // 從原文中移除 options
        lastPart.content = lastPart.content.replace(optionsRegex, '').trim();
    }
    
    // 建立一個段落 <p> 來容納本次的敘事
    const p = document.createElement('p');

    narrativeParts.forEach(part => {
        if (part.type === 'text') {
            // 如果是純文字，直接附加
            p.appendChild(document.createTextNode(part.content));
        } else {
            // 如果是實體 (npc, item, etc.)
            const span = document.createElement('span');
            span.className = `narrative-entity ${part.color_class}`;
            span.textContent = part.text;
            span.dataset.entityId = part.id; // 將ID存入data屬性，備用
            span.dataset.entityType = part.type;
            p.appendChild(span);
        }
    });

    narrativeLog.appendChild(p);
    
    // 3. 渲染行動選項
    if (optionsContent) {
        promptQuestion.textContent = "接下來你打算？";
        const options = optionsContent.split('\n').filter(line => line.trim() !== '');
        options.forEach(opt => {
            const button = document.createElement('button');
            const actionId = opt.substring(0, 1);
            button.dataset.actionId = actionId;
            button.textContent = opt;
            button.addEventListener('click', handleActionSelect);
            actionOptionsContainer.appendChild(button);
        });
    } else {
        promptQuestion.textContent = "劇情正在發展中...";
    }

    // 保持滾動條在最底部
    narrativeLog.scrollTop = narrativeLog.scrollHeight;
}


/**
 * 處理玩家選擇的行動
 */
async function handleActionSelect(event) {
    const actionId = event.target.dataset.actionId;
    const actionText = event.target.textContent;

    const playerPromptP = document.createElement('p');
    playerPromptP.innerHTML = `<strong>> ${actionText}</strong>`;
    playerPromptP.classList.add('player-prompt');
    narrativeLog.appendChild(playerPromptP);
    narrativeLog.scrollTop = narrativeLog.scrollHeight;
    
    promptQuestion.textContent = "AI 正在運算中，請稍候...";
    actionOptionsContainer.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentGameSessionId,
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
        
        if (data.narrative && data.state) {
            // 使用新的UI更新函數
            updateUI(data);
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
    console.log("正在初始化遊戲...");

    if (!currentGameSessionId) {
        alert("偵測到您尚未登入，將為您導向登入頁面。");
        window.location.href = 'login.html';
        return;
    }
    
    console.log(`已載入存檔 ID: ${currentGameSessionId}`);

    narrativeLog.innerHTML = `<h2>文字江湖</h2><p>正在載入您的江湖傳說...</p>`;
    promptQuestion.textContent = "準備開始您的冒險...";
    actionOptionsContainer.innerHTML = '<button id="start-game-btn">載入遊戲 / 始動</button>';
    
    document.getElementById('start-game-btn').addEventListener('click', (e) => {
         handleActionSelect({ target: { dataset: { actionId: 'START' }, textContent: 'A. 載入遊戲 / 始動' } });
    });
}

document.addEventListener('DOMContentLoaded', initializeGame);
