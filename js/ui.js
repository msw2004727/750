// js/ui.js

/**
 * 主更新函式：協調所有 UI 的更新
 * @param {object} gameState - 從後端獲取的完整遊戲狀態物件
 */
export function updateUI(gameState) {
    console.log("[UI] 開始全面更新介面...");
    if (!gameState) {
        console.error("[UI] gameState 為空，停止更新。");
        return;
    }
    
    // 使用 requestAnimationFrame 確保 DOM 已準備就緒
    requestAnimationFrame(() => {
        // 更新主畫面資訊
        updateSceneInfo(gameState.player);
        updateNarrative(gameState.world);
        updateActions(gameState.player.actions); // 'actions' 目前是假定欄位

        // 更新儀表板
        updateDashboard(gameState.player, gameState.world);

        // 更新所有彈出視窗的內容
        updateModals(gameState.player);

        console.log("[UI] 所有介面更新函式執行完畢。");
    });
}


// ===================================================================
// "私有"輔助函式 (Private Helper Functions)
// ===================================================================

/**
 * 更新場景資訊 (在場角色、氛圍)
 * @param {object} player 
 */
function updateSceneInfo(player) {
    // 註：這部分內容最終將由 AI 的回應動態決定
    const charactersContainer = document.getElementById('characters-present-container');
    if (charactersContainer) {
        // 範例資料
        charactersContainer.innerHTML = `
            <div class="bg-[var(--bg-tertiary)] flex items-center gap-1.5 py-1 px-2.5 rounded-full"><span class="text-base">😊</span><p class="text-xs font-normal">小溪</p></div>
        `;
    }
    const atmosphereContainer = document.getElementById('scene-atmosphere-container');
    if (atmosphereContainer) {
        // 範例資料
        atmosphereContainer.innerHTML = `<div class="card py-2 px-4"><p class="font-bold text-center text-teal-500">和緩</p></div>`;
    }
}


/**
 * 更新故事敘述
 * @param {object} world 
 */
function updateNarrative(world) {
    const container = document.getElementById('narrative-box');
    if (!container) return;

    if (world.error) {
        container.innerHTML = `<p class="text-red-500">錯誤: ${world.error}</p>`;
    } else {
        // 註：這裡的文字未來會由 AI 的回應動態決定
        container.innerHTML = `<p>你身處於你的茅屋。目前時間是 ${new Date(world.currentTime).toLocaleString()}，天氣${world.currentWeather}。</p>`;
    }
}

/**
 * 更新玩家的行動選項
 * @param {Array} actions - 玩家可選的行動列表
 */
function updateActions(actions) {
    const container = document.getElementById('options-container');
    if (!container) return;
    
    // 註：這裡的選項未來會由 AI 的回應動態決定
    container.innerHTML = `
        <button class="action-button" data-action-type="option" data-action-value="1">1. 四處張望，看看有什麼特別的。</button>
        <button class="action-button" data-action-type="option" data-action-value="2">2. 躺下休息片刻。</button>
    `;
}

/**
 * 更新儀表板所有面板
 * @param {object} player 
 * @param {object} world 
 */
function updateDashboard(player, world) {
    // 更新狀態條
    const statusBarContainer = document.getElementById('player-status-bars-container');
    if (statusBarContainer) {
        statusBarContainer.innerHTML = `
            <div class="card"><div class="flex justify-between items-center"><h3 class="font-bold">健康</h3><span class="text-green-500 font-semibold">${player.status.health}</span></div><div class="w-full bg-[var(--bg-tertiary)] rounded-full h-2.5 mt-2"><div class="bg-green-500 h-2.5 rounded-full" style="width: ${player.status.health}%"></div></div></div>
            <div class="card"><div class="flex justify-between items-center"><h3 class="font-bold">飢餓</h3><span class="text-yellow-500 font-semibold">${player.status.hunger}</span></div><div class="w-full bg-[var(--bg-tertiary)] rounded-full h-2.5 mt-2"><div class="bg-yellow-500 h-2.5 rounded-full" style="width: ${player.status.hunger}%"></div></div></div>
        `;
    }
    
    // 更新世界資訊
    const worldInfoContainer = document.getElementById('world-info-cards-container');
    if (worldInfoContainer) {
        worldInfoContainer.innerHTML = `
            <div class="card text-center"><h3 class="font-bold text-lg">時間</h3><p class="text-[var(--text-secondary)] text-sm">${new Date(world.currentTime).toLocaleTimeString()}</p></div>
            <div class="card text-center"><h3 class="font-bold text-lg">地點</h3><p class="text-[var(--text-secondary)] text-sm">${player.location}</p></div>
            <div class="card text-center"><h3 class="font-bold text-lg">天氣</h3><p class="text-[var(--text-secondary)] text-sm">${world.currentWeather}, ${world.currentTemperature}°C</p></div>
            <div class="card !p-3"><h3 class="font-bold text-center text-lg mb-1">所屬</h3><div class="text-center text-sm text-[var(--text-secondary)]"><p>${player.faction.name}</p><p>首領: ${player.faction.leader}</p><p>規模: ${player.faction.scale}</p></div></div>
        `;
    }

    // 更新任務列表
    const questBox = document.getElementById('quest-box');
    if(questBox) {
        // 註：任務列表的資料未來應來自 gameState.player.quests
        const mockQuests = [
            { title: "初來乍到", desc: "搞清楚自己在哪裡...", objectives: [{text: "與部落的人交談", completed: true}, {text: "了解部落的現況", completed: false}] }
        ];
        questBox.innerHTML = mockQuests.map(q => `
            <div class="card">
                <h3 class="font-bold text-yellow-500">${q.title}</h3>
                <p class="text-sm text-[var(--text-secondary)] mt-1">${q.desc}</p>
                <ul class="list-disc list-inside text-sm mt-2 space-y-1">
                    ${q.objectives.map(o => `<li class="${o.completed ? 'text-green-500' : ''}">${o.completed ? `<s>${o.text}</s> (完成)` : o.text}</li>`).join('')}
                </ul>
            </div>
        `).join('');
    }
}

/**
 * 更新所有彈出視窗的內容
 * @param {object} player 
 */
function updateModals(player) {
    // 更新數值彈窗
    const statsContainer = document.getElementById('stats-modal-content');
    if (statsContainer) {
        const attr = player.attributes;
        statsContainer.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="card"><h4 class="text-lg font-bold text-[var(--accent-color)]">力量 (${attr.strength})</h4><p class="text-sm text-[var(--text-secondary)] mt-1">影響物理傷害、負重能力與部份需要體力的行動成功率。</p></div>
                <div class="card"><h4 class="text-lg font-bold text-[var(--accent-color)]">智力 (${attr.intelligence})</h4><p class="text-sm text-[var(--text-secondary)] mt-1">影響學習速度、觀察力、說服能力與使用複雜道具的成功率。</p></div>
                <div class="card"><h4 class="text-lg font-bold text-[var(--accent-color)]">敏捷 (${attr.agility})</h4><p class="text-sm text-[var(--text-secondary)] mt-1">影響戰鬥中的閃避與命中率、行動速度與進行潛行等精細操作的成功率。</p></div>
                <div class="card"><h4 class="text-lg font-bold text-[var(--accent-color)]">幸運 (${attr.luck})</h4><p class="text-sm text-[var(--text-secondary)] mt-1">一個神秘的數值，似乎會影響隨機事件的結果、物品掉落率與爆擊機率。</p></div>
            </div>
        `;
    }

    // 更新記憶彈窗
    const memoryContainer = document.getElementById('memory-modal-content');
    if(memoryContainer) {
        // 註：記憶列表的資料未來應來自 gameState.player.memories
        const mockMemories = [
            { time: "大荒曆3年，春15日", title: "在河邊醒來", desc: "你在黑石部落旁的河邊被人發現，失去了所有記憶。" },
            { time: "大荒曆3年，春15日", title: "與小溪的初次見面", desc: "一位名叫小溪的少女在你醒來時照顧你。" },
        ];
        memoryContainer.querySelector('ul').innerHTML = mockMemories.map(m => `
            <li class="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <p class="font-bold">${m.title}</p>
                <p class="text-sm text-[var(--text-secondary)]">${m.time} - ${m.desc}</p>
            </li>
        `).join('');
    }

    // 更新人脈彈窗
    const networkContainer = document.getElementById('network-modal-content');
    if(networkContainer) {
        // 註：人脈列表的資料未來應來自 gameState.player.relationships
        const mockRelationships = [
            { name: "小溪", title: "獸皮少女", affinity: 25, status: "友善", desc: "她似乎對你的到來充滿好奇。" },
            { name: "烈風", title: "獵首", affinity: -15, status: "警惕", desc: "他把你視為對部落的威脅。" }
        ];
        networkContainer.innerHTML = mockRelationships.map(r => `
            <div class="card">
                <div class="flex justify-between items-center">
                    <h3 class="font-bold">${r.name} (${r.title})</h3>
                    <span class="${r.affinity > 0 ? 'text-blue-500' : 'text-red-500'} font-semibold">${r.status} (${r.affinity})</span>
                </div>
                <p class="text-sm text-[var(--text-secondary)] mt-1">${r.desc}</p>
            </div>
        `).join('');
    }

    // 更新裝備彈窗
    const equipmentContainer = document.getElementById('equipment-modal-content');
    if(equipmentContainer) {
        // 註：裝備列表的資料未來應來自 gameState.player.inventory
        const mockInventory = [
            { name: "奇怪的石頭", desc: "一顆在河邊撿到的、發出微光的石頭。", icon: "石" },
            { name: "破舊的布衣", desc: "身上僅有的衣物，看不出原本的材質。", icon: "衣" }
        ];
        equipmentContainer.innerHTML = mockInventory.map(i => `
            <div class="card flex items-center space-x-4">
                <div class="w-12 h-12 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center font-bold text-xl">${i.icon}</div>
                <div><h3 class="font-bold">${i.name}</h3><p class="text-sm text-[var(--text-secondary)]">${i.desc}</p></div>
            </div>
        `).join('');
    }
}
