// js/main.js

import { initThemeSwitcher } from './theme.js';
import { initDashboard } from './dashboard.js';
import { initModals } from './modals.js';

const API_BASE_URL = "https://md-server-main.onrender.com/api/v1";
const PLAYER_ID = 'player_001'; // 將玩家ID設為常數，方便管理

// --- API 呼叫函式 ---

async function fetchGameState(playerId) {
    console.log(`正在獲取玩家 ${playerId} 的遊戲狀態...`);
    try {
        const response = await fetch(`${API_BASE_URL}/game/state/${playerId}`);
        if (!response.ok) throw new Error(`伺服器錯誤: ${response.status}`);
        const gameState = await response.json();
        console.log("成功獲取遊戲狀態:", gameState);
        return gameState;
    } catch (error) {
        console.error("獲取遊戲狀態失敗:", error);
        updateNarrative({ error: error.message });
        return null;
    }
}

/**
 * 將玩家的行動發送到後端
 * @param {string} playerId - 玩家 ID
 * @param {object} actionData - 行動資料物件 {type, value}
 */
async function sendPlayerAction(playerId, actionData) {
    console.log(`正在發送行動給玩家 ${playerId}:`, actionData);
    try {
        const response = await fetch(`${API_BASE_URL}/game/action/${playerId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(actionData),
        });
        if (!response.ok) throw new Error(`伺服器錯誤: ${response.status}`);
        const result = await response.json();
        console.log("收到後端回應:", result);
        
        // TODO: 未來這裡會用 result.next_gamestate 來更新 UI
        // 目前我們先在敘述框顯示後端的回應訊息
        const narrativeBox = document.getElementById('narrative-box');
        if (narrativeBox) {
            narrativeBox.innerHTML += `<p class="text-blue-500 italic mt-4">${result.message}</p>`;
        }

    } catch (error) {
        console.error("發送行動失敗:", error);
    }
}


// --- UI 更新函式 ---

function updateUI(gameState) {
    if (!gameState) return;
    updateNarrative(gameState.world);
    updateActions(); // 更新行動選項
    updateDashboard(gameState.player, gameState.world);
}

function updateNarrative(world) {
    const narrativeBox = document.getElementById('narrative-box');
    if (!narrativeBox) return;
    
    if (world.error) {
        narrativeBox.innerHTML = `<p class="text-red-500">無法連接到遊戲伺服器: ${world.error}</p>`;
        return;
    }
    // 未來這裡的文字會由 AI 提供
    narrativeBox.innerHTML = `<p>你身處於你的茅屋。目前時間是 ${new Date(world.currentTime).toLocaleString()}，天氣${world.currentWeather}。</p>`;
}

function updateActions() {
    const optionsContainer = document.getElementById('options-container');
    if (!optionsContainer) return;
    // 顯示固定的假選項，未來這些選項會由 AI 動態生成
    optionsContainer.innerHTML = `
        <button class="action-button" data-action-type="option" data-action-value="1">1. 四處張望，看看有什麼特別的。</button>
        <button class="action-button" data-action-type="option" data-action-value="2">2. 躺下休息片刻。</button>
        <button class="action-button" data-action-type="option" data-action-value="3">3. 整理一下背包。</button>
    `;
}

function updateDashboard(player, world) {
    // ... (此函式內容不變，省略以保持簡潔)
}

// --- 事件處理 ---

function setupActionListeners() {
    const actionsContainer = document.getElementById('actions-container');
    if (!actionsContainer) return;

    // 使用事件委派來監聽所有行動的點擊
    actionsContainer.addEventListener('click', (event) => {
        const target = event.target;
        
        // 處理選項按鈕點擊
        if (target.matches('.action-button')) {
            const actionData = {
                type: target.dataset.actionType,
                value: target.dataset.actionValue,
            };
            sendPlayerAction(PLAYER_ID, actionData);
        }

        // 處理手動輸入的確認按鈕
        if (target.matches('#custom-action-submit')) {
            const input = document.getElementById('custom-action-input');
            if (input && input.value.trim() !== '') {
                const actionData = {
                    type: 'custom',
                    value: input.value.trim(),
                };
                sendPlayerAction(PLAYER_ID, actionData);
                input.value = ''; // 清空輸入框
            }
        }
    });
}


// --- 應用程式主入口 ---

async function loadComponent(url, containerId, append = false) { /* ... (此函式不變) */ }

async function main() {
    await Promise.all([ /* ... (此處不變) */ ]);
    
    initThemeSwitcher();
    initDashboard();
    initModals();
    setupActionListeners(); // 新增：初始化行動監聽器

    const gameState = await fetchGameState(PLAYER_ID);
    updateUI(gameState);

    console.log("遊戲介面已初始化並與後端同步完畢。");
}

document.addEventListener('DOMContentLoaded', main);
