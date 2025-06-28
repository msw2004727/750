// 檔案: assets/js/main.js
// 版本: 1.3 - 整合 session ID 與登入驗證

// ------------------- 設定 -------------------
const BACKEND_URL = "https://md-server-main.onrender.com/api/generate_turn";

// [核心升級] 從 localStorage 讀取 session ID
const currentGameSessionId = localStorage.getItem('game_session_id');

// ------------------- DOM 元素獲取 -------------------
// ... (與 v1.2 相同，此處省略) ...
const narrativeLog = document.getElementById('narrative-log');
const actionOptionsContainer = document.getElementById('action-options');
const promptQuestion = document.getElementById('prompt-question');
// ...等等...

// ------------------- 核心功能函數 -------------------

// parseNarrative 函數與 v1.2 相同，此處省略...
function parseNarrative(rawText) {
    // ...
    return {}; // 返回解析後的 gameState
}

// updateUI 函數與 v1.2 相同，此處省略...
function updateUI(rawNarrative) {
    // ...
}

/**
 * [核心升級] 處理玩家選擇的行動 (附帶 session_id)
 */
async function handleActionSelect(event) {
    const actionId = event.target.dataset.actionId;
    const actionText = event.target.textContent;

    // ... (UI 更新邏輯與 v1.2 相同) ...
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
                session_id: currentGameSessionId, // <<-- 核心：附上當前玩家的 session ID
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
 * [核心升級] 遊戲初始化函數 (包含登入驗證)
 */
function initializeGame() {
    console.log("正在初始化遊戲...");

    // [核心] 檢查玩家是否已登入
    if (!currentGameSessionId) {
        alert("偵測到您尚未登入，將為您導向登入頁面。");
        window.location.href = 'login.html';
        return; // 終止後續執行
    }
    
    console.log(`已載入存檔 ID: ${currentGameSessionId}`);

    narrativeLog.innerHTML = `<h2>文字江湖：黑風寨崛起</h2><p>正在載入您的江湖傳說...</p>`;
    promptQuestion.textContent = "準備開始您的冒險...";
    actionOptionsContainer.innerHTML = '<button id="start-game-btn">載入遊戲 / 始動</button>';
    
    document.getElementById('start-game-btn').addEventListener('click', (e) => {
         // "始動" 會發送第一個請求，後端會根據 session_id 載入正確的存檔並回傳第一回合內容
         handleActionSelect({ target: { dataset: { actionId: 'START' }, textContent: 'A. 載入遊戲 / 始動' } });
    });
}

// 當 DOM 載入完成後，啟動遊戲
document.addEventListener('DOMContentLoaded', initializeGame);
