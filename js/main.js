import { initThemeSwitcher } from './theme.js';
import { initDashboard } from './dashboard.js';
import { initModals } from './modals.js';
import { fetchGameState } from './api.js';
import { updateUI } from './ui.js';
import { setupActionListeners } from './event-listeners.js';

const PLAYER_ID = 'player_001';

async function loadComponent(url, containerId, append = false) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Could not load ${url}`);
        const text = await response.text();
        document.getElementById(containerId).innerHTML += append ? text : text;
    } catch (error) {
        console.error(`載入元件 ${url} 時發生錯誤:`, error);
    }
}

async function main() {
    console.log("[MAIN] 應用程式啟動。");

    // 1. 載入所有 HTML 骨架
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

    // 2. 初始化所有靜態 UI 功能
    initThemeSwitcher();
    initDashboard();
    initModals();
    setupActionListeners();

    // 3. 獲取初始遊戲狀態並更新畫面
    try {
        const gameState = await fetchGameState(PLAYER_ID);
        updateUI(gameState);
    } catch (error) {
        console.error("[MAIN] 初始化遊戲失敗:", error);
        // 可以在畫面上顯示一個全局的錯誤訊息
        document.body.innerHTML = `<div class="text-red-500 text-center p-8">遊戲載入失敗，請稍後再試。</div>`;
    }

    console.log("[MAIN] 遊戲初始化流程結束。");
}

document.addEventListener('DOMContentLoaded', main);
