// js/main.js

// 從其他模組引入初始化函式
import { initThemeSwitcher } from './theme.js';
import { initDashboard } from './dashboard.js';
import { initModals } from './modals.js';

// --- 全域設定 ---
const API_BASE_URL = "https://md-server-main.onrender.com/api/v1";

// --- 核心功能函式 ---

/**
 * 從後端 API 獲取完整的遊戲狀態
 * @param {string} playerId - 玩家的 ID
 * @returns {Promise<object|null>} 遊戲狀態物件，或在失敗時返回 null
 */
async function fetchGameState(playerId) {
    console.log(`正在從 API 獲取玩家 ${playerId} 的遊戲狀態...`);
    try {
        const response = await fetch(`${API_BASE_URL}/game/state/${playerId}`);
        if (!response.ok) {
            // 如果伺服器回應不成功 (例如 404, 500)，拋出錯誤
            throw new Error(`伺服器錯誤: ${response.status} ${response.statusText}`);
        }
        const gameState = await response.json();
        console.log("成功獲取遊戲狀態:", gameState);
        return gameState;
    } catch (error) {
        console.error("獲取遊戲狀態失敗:", error);
        // 可以在此處更新 UI 顯示錯誤訊息
        const narrativeBox = document.getElementById('narrative-box');
        if(narrativeBox) narrativeBox.innerHTML = `<p class="text-red-500">無法連接到遊戲伺服器，請檢查後端服務是否正在運行，或稍後再試。</p>`;
        return null;
    }
}

/**
 * 主更新函式：根據遊戲狀態更新整個 UI
 * @param {object} gameState - 從後端獲取的完整遊戲狀態物件
 */
function updateUI(gameState) {
    if (!gameState) return;

    // 分別呼叫各個部分的更新函式
    updateSceneInfo(gameState.player, gameState.world);
    updateNarrative(gameState.world); // 假設氛圍和敘述有關
    updateDashboard(gameState.player, gameState.world);
    // ... 未來還會有更新行動選項、彈出視窗內容的函式
}

/**
 * 更新場景資訊 (在場角色、現場氛圍)
 * @param {object} player - 玩家資料物件
 * @param {object} world - 世界資料物件
 */
function updateSceneInfo(player, world) {
    const charactersContainer = document.getElementById('characters-present-container');
    const atmosphereContainer = document.getElementById('scene-atmosphere-container');

    // 這裡我們先用假資料，未來會由 AI 動態提供
    if (charactersContainer) {
        charactersContainer.innerHTML = `
            <div class="bg-[var(--bg-tertiary)] flex items-center gap-1.5 py-1 px-2.5 rounded-full"><span class="text-base">😊</span><p class="text-xs font-normal">小溪</p></div>
        `;
    }
    if (atmosphereContainer) {
        atmosphereContainer.innerHTML = `<div class="card py-2 px-4"><p class="font-bold text-center text-teal-500">和緩</p></div>`;
    }
}

/**
 * 更新故事敘述
 * @param {object} world - 世界資料物件
 */
function updateNarrative(world) {
    const narrativeBox = document.getElementById('narrative-box');
    if (narrativeBox) {
        // 這裡我們先用靜態文字，未來會由 AI 動態提供
        narrativeBox.innerHTML = `<p>你在一間簡陋的茅屋中醒來。目前時間是 ${new Date(world.currentTime).toLocaleString()}，天氣${world.currentWeather}。</p>`;
    }
}

/**
 * 更新儀表板 (右側邊欄)
 * @param {object} player - 玩家資料物件
 * @param {object} world - 世界資料物件
 */
function updateDashboard(player, world) {
    // 更新玩家狀態條
    const statusBarContainer = document.getElementById('player-status-bars-container');
    if (statusBarContainer) {
        statusBarContainer.innerHTML = `
            <div class="card">
                <div class="flex justify-between items-center"><h3 class="font-bold">健康</h3><span class="text-green-500 font-semibold">${player.status.health}</span></div>
                <div class="w-full bg-[var(--bg-tertiary)] rounded-full h-2.5 mt-2"><div class="bg-green-500 h-2.5 rounded-full" style="width: ${player.status.health}%"></div></div>
            </div>
            <div class="card">
                <div class="flex justify-between items-center"><h3 class="font-bold">飢餓</h3><span class="text-yellow-500 font-semibold">${player.status.hunger}</span></div>
                <div class="w-full bg-[var(--bg-tertiary)] rounded-full h-2.5 mt-2"><div class="bg-yellow-500 h-2.5 rounded-full" style="width: ${player.status.hunger}%"></div></div>
            </div>
        `;
    }

    // 更新世界資訊卡片
    const worldInfoContainer = document.getElementById('world-info-cards-container');
    if (worldInfoContainer) {
        worldInfoContainer.innerHTML = `
            <div class="card text-center"><h3 class="font-bold text-lg">時間</h3><p class="text-[var(--text-secondary)] text-sm">${new Date(world.currentTime).toLocaleTimeString()}</p></div>
            <div class="card text-center"><h3 class="font-bold text-lg">地點</h3><p class="text-[var(--text-secondary)] text-sm">${player.location}</p></div>
            <div class="card text-center"><h3 class="font-bold text-lg">天氣</h3><p class="text-[var(--text-secondary)] text-sm">${world.currentWeather}, ${world.currentTemperature}°C</p></div>
            <div class="card !p-3">
                <h3 class="font-bold text-center text-lg mb-1">所屬</h3>
                <div class="text-center text-sm text-[var(--text-secondary)]">
                    <p>${player.faction.name}</p>
                    <p>首領: ${player.faction.leader}</p>
                    <p>規模: ${player.faction.scale}</p>
                </div>
            </div>
        `;
    }

    // 清空任務列表 (未來會從玩家資料中讀取)
    const questBox = document.getElementById('quest-box');
    if(questBox) questBox.innerHTML = '';
}


// --- 應用程式主入口 ---

/**
 * 函數：用來載入 HTML 元件內容
 * @param {string} url - 元件的 HTML 檔案路徑
 * @param {string} containerId - 要插入內容的容器 ID
 * @param {boolean} append - 是否為附加模式 (用於儀表板)
 */
async function loadComponent(url, containerId, append = false) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not load ${url}`);
        const text = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            if (append) {
                container.innerHTML += text;
            } else {
                container.innerHTML = text;
            }
        }
    } catch (error) {
        console.error('Failed to load component:', error);
    }
}

/**
 * 遊戲主啟動函式
 */
async function main() {
    // 1. 平行載入所有靜態 HTML 元件
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

    // 2. 初始化所有靜態 UI 功能 (主題切換、拖曳等)
    initThemeSwitcher();
    initDashboard();
    initModals();

    // 3. 從後端獲取初始遊戲狀態
    const gameState = await fetchGameState('player_001'); // 使用固定的玩家 ID 進行測試

    // 4. 使用獲取到的真實資料更新整個 UI
    updateUI(gameState);

    console.log("遊戲介面已初始化並與後端同步完畢。");
}


// 當整個頁面結構載入完成後，執行我們的遊戲主啟動函式
document.addEventListener('DOMContentLoaded', main);

