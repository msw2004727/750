// js/main.js

// 從其他模組引入初始化函式 (雖然目前為空，但保留結構)
import { initThemeSwitcher } from './theme.js';
import { initDashboard } from './dashboard.js';
import { initModals } from './modals.js';

// --- 全域設定 ---
const API_BASE_URL = "https://md-server-main.onrender.com/api/v1";
const PLAYER_ID = 'player_001'; // 將玩家ID設為常數，方便管理

// --- API 呼叫函式 ---

/**
 * 從後端 API 獲取完整的遊戲狀態
 * @param {string} playerId - 玩家的 ID
 * @returns {Promise<object|null>} 遊戲狀態物件，或在失敗時返回 null
 */
async function fetchGameState(playerId) {
    console.log(`[API] 正在獲取玩家 ${playerId} 的遊戲狀態...`);
    try {
        const response = await fetch(`${API_BASE_URL}/game/state/${playerId}`);
        if (!response.ok) {
            throw new Error(`伺服器錯誤: ${response.status} ${response.statusText}`);
        }
        const gameState = await response.json();
        console.log("[API] 成功獲取遊戲狀態:", gameState);
        return gameState;
    } catch (error) {
        console.error("[API] 獲取遊戲狀態失敗:", error);
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
    console.log(`[API] 正在發送行動給玩家 ${playerId}:`, actionData);
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
        console.log("[API] 收到後端回應:", result);
        
        const narrativeBox = document.getElementById('narrative-box');
        if (narrativeBox) {
            narrativeBox.innerHTML += `<p class="text-blue-500 italic mt-4">${result.message}</p>`;
        }

    } catch (error) {
        console.error("[API] 發送行動失敗:", error);
    }
}

// --- UI 更新函式 ---

/**
 * 主更新函式：根據遊戲狀態更新整個 UI
 * @param {object} gameState - 從後端獲取的完整遊戲狀態物件
 */
function updateUI(gameState) {
    console.log("[UI] 開始更新介面...");
    if (!gameState) {
        console.error("[UI] gameState 為空，停止更新。");
        return;
    }
    // 使用 requestAnimationFrame 確保 DOM 準備就緒
    requestAnimationFrame(() => {
        updateSceneInfo(gameState.player, gameState.world);
        updateNarrative(gameState.world);
        updateActions();
        updateDashboard(gameState.player, gameState.world);
        console.log("[UI] 介面更新函式執行完畢。");
    });
}

function updateSceneInfo(player, world) {
    const charactersContainer = document.getElementById('characters-present-container');
    const atmosphereContainer = document.getElementById('scene-atmosphere-container');

    if (charactersContainer) {
        // 範例資料，未來會由 gameState 提供
        charactersContainer.innerHTML = `
            <div class="bg-[var(--bg-tertiary)] flex items-center gap-1.5 py-1 px-2.5 rounded-full"><span class="text-base">😊</span><p class="text-xs font-normal">小溪</p></div>
        `;
    }
    if (atmosphereContainer) {
        // 範例資料
        atmosphereContainer.innerHTML = `<div class="card py-2 px-4"><p class="font-bold text-center text-teal-500">和緩</p></div>`;
    }
}

function updateNarrative(world) {
    const container = document.getElementById('narrative-box');
    if (!container) {
        console.error("[UI] 錯誤：找不到 ID 為 'narrative-box' 的容器！");
        return;
    }
    
    console.log("[UI] 找到 'narrative-box'，正在更新故事內容。");
    if (world.error) {
        container.innerHTML = `<p class="text-red-500">無法連接到遊戲伺服器: ${world.error}</p>`;
    } else {
        container.innerHTML = `<p>你身處於你的茅屋。目前時間是 ${new Date(world.currentTime).toLocaleString()}，天氣${world.currentWeather}。</p>`;
    }
}

function updateActions() {
    const container = document.getElementById('options-container');
    if (!container) {
        console.error("[UI] 錯誤：找不到 ID 為 'options-container' 的容器！");
        return;
    }
    console.log("[UI] 找到 'options-container'，正在更新選項。");
    container.innerHTML = `
        <button class="action-button" data-action-type="option" data-action-value="1">1. 四處張望，看看有什麼特別的。</button>
        <button class="action-button" data-action-type="option" data-action-value="2">2. 躺下休息片刻。</button>
    `;
}

function updateDashboard(player, world) {
    const statusBarContainer = document.getElementById('player-status-bars-container');
    if (statusBarContainer) {
        console.log("[UI] 找到 'player-status-bars-container'，正在更新狀態條。");
        statusBarContainer.innerHTML = `
            <div class="card"><div class="flex justify-between items-center"><h3 class="font-bold">健康</h3><span class="text-green-500 font-semibold">${player.status.health}</span></div><div class="w-full bg-[var(--bg-tertiary)] rounded-full h-2.5 mt-2"><div class="bg-green-500 h-2.5 rounded-full" style="width: ${player.status.health}%"></div></div></div>
            <div class="card"><div class="flex justify-between items-center"><h3 class="font-bold">飢餓</h3><span class="text-yellow-500 font-semibold">${player.status.hunger}</span></div><div class="w-full bg-[var(--bg-tertiary)] rounded-full h-2.5 mt-2"><div class="bg-yellow-500 h-2.5 rounded-full" style="width: ${player.status.hunger}%"></div></div></div>
        `;
    } else {
         console.error("[UI] 錯誤：找不到 ID 為 'player-status-bars-container' 的容器！");
    }

    const worldInfoContainer = document.getElementById('world-info-cards-container');
    if (worldInfoContainer) {
        console.log("[UI] 找到 'world-info-cards-container'，正在更新世界資訊。");
        worldInfoContainer.innerHTML = `
            <div class="card text-center"><h3 class="font-bold text-lg">時間</h3><p class="text-[var(--text-secondary)] text-sm">${new Date(world.currentTime).toLocaleTimeString()}</p></div>
            <div class="card text-center"><h3 class="font-bold text-lg">地點</h3><p class="text-[var(--text-secondary)] text-sm">${player.location}</p></div>
            <div class="card text-center"><h3 class="font-bold text-lg">天氣</h3><p class="text-[var(--text-secondary)] text-sm">${world.currentWeather}, ${world.currentTemperature}°C</p></div>
            <div class="card !p-3"><h3 class="font-bold text-center text-lg mb-1">所屬</h3><div class="text-center text-sm text-[var(--text-secondary)]"><p>${player.faction.name}</p><p>首領: ${player.faction.leader}</p><p>規模: ${player.faction.scale}</p></div></div>
        `;
    } else {
        console.error("[UI] 錯誤：找不到 ID 為 'world-info-cards-container' 的容器！");
    }

    // 清空任務列表 (未來會從玩家資料中讀取)
    const questBox = document.getElementById('quest-box');
    if(questBox) {
        questBox.innerHTML = '';
    } else {
        console.error("[UI] 錯誤：找不到 ID 為 'quest-box' 的容器！");
    }
}

// --- 事件處理 ---

function setupActionListeners() {
    const actionsContainer = document.getElementById('actions-container');
    if (!actionsContainer) {
        console.error("[INIT] 錯誤：找不到 'actions-container'，無法設定行動監聽器。");
        return;
    }
    
    actionsContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.matches('.action-button')) {
            const actionData = {
                type: target.dataset.actionType,
                value: target.dataset.actionValue,
            };
            sendPlayerAction(PLAYER_ID, actionData);
        }
        if (target.matches('#custom-action-submit')) {
            const input = document.getElementById('custom-action-input');
            if (input && input.value.trim() !== '') {
                sendPlayerAction(PLAYER_ID, { type: 'custom', value: input.value.trim() });
                input.value = '';
            }
        }
    });
}

// --- 應用程式主入口 ---

async function loadComponent(url, containerId, append = false) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not load ${url} - ${response.statusText}`);
        const text = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            if (append) container.innerHTML += text;
            else container.innerHTML = text;
        } else {
            console.error(`載入元件失敗: 找不到 ID 為 '${containerId}' 的容器。`);
        }
    } catch (error) {
        console.error(`載入元件 ${url} 時發生錯誤:`, error);
    }
}

async function main() {
    console.log("[MAIN] 應用程式啟動。");
    
    // 1. 載入所有 HTML 元件
    console.log("[MAIN] 開始載入所有 HTML 元件...");
    await Promise.all([
        loadComponent('components/header.html', 'header-container'),
        loadComponent('components/scene-info.html', 'scene-info-container'),
        loadComponent('components/narrative.html', 'narrative-container'),
        loadComponent('components/actions.html', 'actions-container'),
        loadComponent('components/panel-player.html', 'info-dashboard', true),
        loadComponent('components/panel-world.html', 'info-dashboard', true),
        loadComponent('components/panel-quests.html', 'info-dashboard', true),
        loadComponent('components/modals.html', 'modals-container')
    ]);
    console.log("[MAIN] 所有 HTML 元件載入完畢。");

    // 2. 初始化靜態 UI 功能
    console.log("[MAIN] 開始初始化 UI 功能...");
    initThemeSwitcher();
    initDashboard();
    initModals();
    setupActionListeners();
    console.log("[MAIN] UI 功能初始化完畢。");

    // 3. 獲取初始遊戲狀態
    const gameState = await fetchGameState(PLAYER_ID);

    // 4. 更新 UI
    if (gameState) {
        updateUI(gameState);
    } else {
        console.error("[MAIN] 無法獲取遊戲狀態，UI 將不會更新。");
    }

    console.log("[MAIN] 遊戲初始化流程結束。");
}

document.addEventListener('DOMContentLoaded', main);
