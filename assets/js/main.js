// main.js - 遊戲主邏輯與 UI 控制器

// ------------------- 設定 -------------------
// 您的 Render 後端服務 URL
const BACKEND_URL = "https://md-server-main.onrender.com/api/generate_turn";

// ------------------- DOM 元素獲取 -------------------
const narrativeLog = document.getElementById('narrative-log');
const actionOptionsContainer = document.getElementById('action-options');
const promptQuestion = document.getElementById('prompt-question');

// 玩家資料面板元素
const playerNameEl = document.getElementById('player-name');
const playerStatusEl = document.getElementById('player-status');
const playerHpEl = document.getElementById('player-hp');
const playerMpEl = document.getElementById('player-mp');
const playerCoordXEl = document.getElementById('player-coord-x');
const playerCoordYEl = document.getElementById('player-coord-y');

// 場景角色面板元素
const sceneCharactersList = document.getElementById('scene-characters-list');

// 附近設施面板元素
const nearbyFacilitiesList = document.getElementById('nearby-facilities-list');

// 地區資訊面板元素
const areaNameEl = document.getElementById('area-name');
const areaSizeEl = document.getElementById('area-size');
const areaPopulationEl = document.getElementById('area-population');
const areaLeaderEl = document.getElementById('area-leader');
const areaSecurityEl = document.getElementById('area-security');
const areaProsperityEl = document.getElementById('area-prosperity');
const areaProductsEl = document.getElementById('area-products');


// ------------------- 核心功能函數 -------------------

/**
 * 解析 AI 回傳的完整文字敘述，並將其轉換為結構化的遊戲狀態物件
 * @param {string} rawText - 從後端收到的完整文字回應
 * @returns {object} 一個結構化的遊戲狀態物件
 */
function parseNarrative(rawText) {
    const gameState = {
        header: {},
        title: "",
        narrative: "",
        playerStatus: {},
        sceneCharacters: [],
        nearbyFacilities: [],
        areaInfo: {},
        actionOptions: []
    };

    // 使用正則表達式和字串分割來解析各區塊
    const sections = rawText.split(/---|\*\*\*/).map(s => s.trim()).filter(Boolean);

    // 基礎敘述部分
    const mainNarrativeSection = sections.find(s => s.startsWith("【**") && s.includes("】"));
    if (mainNarrativeSection) {
        gameState.title = mainNarrativeSection.match(/【\*\*(.*?)\*\*】/)?.[1] || "劇情摘要";
        // 提取標題之後到下一個分隔符前的所有內容作為主敘述
        const narrativeStartIndex = rawText.indexOf(mainNarrativeSection) + mainNarrativeSection.length;
        const narrativeEndIndex = rawText.indexOf("---", narrativeStartIndex);
        gameState.narrative = rawText.substring(narrativeStartIndex, narrativeEndIndex > -1 ? narrativeEndIndex : undefined).trim();
    } else {
        // 如果沒有標準標題，將第一部分視為敘述
        gameState.narrative = sections[0] || "無法解析劇情...";
    }
    
    // 解析狀態速覽
    const statusSection = sections.find(s => s.startsWith("📑 **狀態速覽**"));
    if (statusSection) {
        gameState.playerStatus.hp = statusSection.match(/❤️ HP: (.*?)\s*\|/)?.[1] || '--/--';
        gameState.playerStatus.sta = statusSection.match(/💪 STA: (.*?)\s*\|/)?.[1] || '--/--';
        gameState.playerStatus.mp = statusSection.match(/🧠 MP: (.*?)\s*\|/)?.[1] || '--/--';
        gameState.playerStatus.san = statusSection.match(/✨ SAN: (.*?)\s*$/m)?.[1] || '--/--';
        gameState.playerStatus.status = statusSection.match(/🤕 狀態: (.*?)\s*$/m)?.[1] || '良好';
    }

    // 解析行動選項
    const optionsSection = sections.find(s => s.startsWith('**你現在打算：**'));
    if (optionsSection) {
        const optionsRegex = /^([A-Z])\.\s*(.*)/gm;
        let match;
        while ((match = optionsRegex.exec(optionsSection)) !== null) {
            gameState.actionOptions.push({ id: match[1], text: match[2].trim() });
        }
    }

    // 這裡可以繼續添加對「場景角色」、「地區資訊」等其他區塊的解析邏輯
    // 範例：解析場景角色 (假設格式為【場景角色】\n李四 (狀態)\n王五 (狀態))
    const charSection = sections.find(s => s.startsWith("👥 **在場**"));
     if (charSection) {
        const charLines = charSection.replace("👥 **在場**", "").trim().split('\n');
        gameState.sceneCharacters = charLines.map(line => {
            const parts = line.split(/\s*-\s*|\s*\(\s*|\s*\)\s*/); // 用 ' - ' 或 '(' 分割
            return {
                id: `npc_${parts[0]}`, // 簡易生成ID
                name: parts[0] || '未知角色',
                status: parts[1] || '站立著'
            };
        });
    }

    return gameState;
}


/**
 * 更新所有 UI 面板的數據
 * @param {string} rawNarrative - 從後端收到的完整文字回應
 */
function updateUI(rawNarrative) {
    const newState = parseNarrative(rawNarrative);

    // 1. 更新主敘事窗口
    narrativeLog.innerHTML = `<h3>${newState.title}</h3><p>${newState.narrative.replace(/\n/g, '<br>')}</p>`;
    narrativeLog.scrollTop = narrativeLog.scrollHeight; // 自動滾動到底部

    // 2. 更新玩家狀態面板
    if (newState.playerStatus) {
        playerHpEl.textContent = newState.playerStatus.hp || '--/--';
        playerMpEl.textContent = newState.playerStatus.mp || '--/--';
        playerStatusEl.textContent = newState.playerStatus.status || '未知';
        // 可以在此處添加其他狀態值的更新...
    }
    
    // 3. 更新場景角色 (此為範例，實際格式需與AI約定)
    if(newState.sceneCharacters.length > 0) {
        sceneCharactersList.innerHTML = ''; // 清空
        newState.sceneCharacters.forEach(char => {
            const li = document.createElement('li');
            li.textContent = `${char.name} - ${char.status}`;
            li.dataset.id = char.id;
            sceneCharactersList.appendChild(li);
        });
    } else {
        sceneCharactersList.innerHTML = '<li>此處無人。</li>';
    }


    // 4. 更新行動選項
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
        actionOptionsContainer.innerHTML = '<p>劇情在此告一段落...</p>';
    }
}

/**
 * 處理玩家選擇的行動
 * @param {Event} event - 點擊事件
 */
async function handleActionSelect(event) {
    const actionId = event.target.dataset.actionId;
    const actionText = event.target.textContent;

    console.log(`玩家選擇了行動: ${actionId}`);

    // 在日誌中追加顯示玩家的選擇
    const p = document.createElement('p');
    p.innerHTML = `<strong>> ${actionText}</strong>`;
    p.classList.add('player-prompt');
    narrativeLog.appendChild(p);
    narrativeLog.scrollTop = narrativeLog.scrollHeight;

    // 禁用所有按鈕，顯示等待狀態
    promptQuestion.textContent = "AI 正在運算中，請稍候...";
    actionOptionsContainer.innerHTML = '<div class="loading-spinner"></div>';

    try {
        // 發送請求到 Render 後端
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_action: {
                    id: actionId,
                    text: actionText.substring(3).trim() // 去掉 "A. " 等前綴
                },
                // 未來可以在此處傳送整個遊戲狀態
                // current_game_state: window.currentGameState 
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `伺服器錯誤: ${response.status}`);
        }

        const data = await response.json();
        
        // 成功：用 AI 回傳的完整內容更新 UI
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
    
    // 顯示初始歡迎訊息和開始按鈕
    narrativeLog.innerHTML = `
        <h2>文字江湖：黑風寨崛起</h2>
        <p>一個基於深度模擬與 AI 驅動的武俠世界。</p>
        <p>你的每一個選擇，都將銘刻在這個世界的歷史之中。</p>
    `;
    promptQuestion.textContent = "準備好開始你的傳奇了嗎？";
    actionOptionsContainer.innerHTML = '<button id="start-game-btn">始動</button>';
    
    document.getElementById('start-game-btn').addEventListener('click', (e) => {
         handleActionSelect({ target: { dataset: { actionId: 'START' }, textContent: '始動' } });
    });

    // 這裡可以預先填充一些靜態資訊，或保持為 "---"
    playerNameEl.textContent = "阿宅";
}

// 當 DOM 載入完成後，啟動遊戲
document.addEventListener('DOMContentLoaded', initializeGame);
