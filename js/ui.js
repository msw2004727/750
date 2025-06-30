/**
 * 主更新函式：根據遊戲狀態更新整個 UI
 * @param {object} gameState - 從後端獲取的完整遊戲狀態物件
 */
export function updateUI(gameState) {
    console.log("[UI] 開始更新介面...");
    if (!gameState) {
        console.error("[UI] gameState 為空，停止更新。");
        return;
    }
    
    // 使用 requestAnimationFrame 確保 DOM 準備就緒
    requestAnimationFrame(() => {
        updateNarrative(gameState.world);
        updateActions(gameState.player.actions); // 假設未來選項會從 gameState 來
        updateDashboard(gameState.player, gameState.world);
        // ... 其他 UI 更新 ...
        console.log("[UI] 介面更新函式執行完畢。");
    });
}

// --- 以下是私有的輔助函式，不需要 export ---

function updateNarrative(world) {
    const container = document.getElementById('narrative-box');
    if (!container) return;

    if (world.error) {
        container.innerHTML = `<p class="text-red-500">錯誤: ${world.error}</p>`;
    } else {
        container.innerHTML = `<p>你身處於你的茅屋。目前時間是 ${new Date(world.currentTime).toLocaleString()}，天氣${world.currentWeather}。</p>`;
    }
}

function updateActions(actions) {
    const container = document.getElementById('options-container');
    if (!container) return;
    
    // 範例：顯示固定的假選項
    container.innerHTML = `
        <button class="action-button" data-action-type="option" data-action-value="1">1. 四處張望，看看有什麼特別的。</button>
        <button class="action-button" data-action-type="option" data-action-value="2">2. 躺下休息片刻。</button>
    `;
}

function updateDashboard(player, world) {
    const statusBarContainer = document.getElementById('player-status-bars-container');
    if (statusBarContainer) {
        statusBarContainer.innerHTML = `
            <div class="card"><div class="flex justify-between items-center"><h3 class="font-bold">健康</h3><span class="text-green-500 font-semibold">${player.status.health}</span></div><div class="w-full bg-[var(--bg-tertiary)] rounded-full h-2.5 mt-2"><div class="bg-green-500 h-2.5 rounded-full" style="width: ${player.status.health}%"></div></div></div>
            <div class="card"><div class="flex justify-between items-center"><h3 class="font-bold">飢餓</h3><span class="text-yellow-500 font-semibold">${player.status.hunger}</span></div><div class="w-full bg-[var(--bg-tertiary)] rounded-full h-2.5 mt-2"><div class="bg-yellow-500 h-2.5 rounded-full" style="width: ${player.status.hunger}%"></div></div></div>
        `;
    }
    // ... 其他 Dashboard 更新邏輯 ...
}

// 可以在此檔案底部繼續添加其他只與UI相關的函式，例如 updateModals, updateInventory 等
