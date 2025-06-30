// js/render.js
import { formatSongDynastyTime } from './utils.js';

/**
 * 更新場景資訊 (在場角色、氛圍)
 * @param {object} player 
 * @param {object} narrative 
 */
export function updateSceneInfo(player, narrative) {
    const charactersContainer = document.getElementById('characters-present-container');
    if (charactersContainer) {
        // TODO: 未來這裡的資料應來自 narrative.characters
        // 範例資料，未來會由 gameState 提供
        charactersContainer.innerHTML = `
            <div class="bg-[var(--bg-tertiary)] flex items-center gap-1.5 py-1 px-2.5 rounded-full"><span class="text-base">😊</span><p class="text-xs font-normal">小溪</p></div>
        `;
    }
    const atmosphereContainer = document.getElementById('scene-atmosphere-container');
    if (atmosphereContainer) {
        const atmosphere = narrative ? narrative.atmosphere : "未知";
        atmosphereContainer.innerHTML = `<div class="card py-2 px-4"><p class="font-bold text-center text-teal-500">${atmosphere}</p></div>`;
    }
}

/**
 * 更新故事敘述
 * @param {object} world 
 * @param {object} narrative 
 */
export function updateNarrative(world, narrative) {
    const container = document.getElementById('narrative-box');
    if (!container) return;

    if (world.error) {
        container.innerHTML = `<p class="text-red-500">錯誤: ${world.error}</p>`;
    } else {
        const description = narrative ? narrative.description : `你身處於你的茅屋。`;
        container.innerHTML = `<p>${description}</p>`;
        container.scrollTop = container.scrollHeight;
    }
}

/**
 * 更新玩家的行動選項
 * @param {Array} options - 玩家可選的行動列表
 */
export function updateActions(options) {
    const container = document.getElementById('options-container');
    if (!container) return;
    
    if (options && options.length > 0) {
        container.innerHTML = options.map((option_text, index) => {
            return `<button class="action-button" data-action-type="option" data-action-value="${option_text}">${index + 1}. ${option_text}</button>`;
        }).join('');
    } else {
        container.innerHTML = `<p class="text-gray-500 text-center italic">沒有可執行的動作。</p>`;
    }
}

/**
 * 更新儀表板所有面板
 * @param {object} player 
 * @param {object} world 
 */
export function updateDashboard(player, world) {
    const statusBarContainer = document.getElementById('player-status-bars-container');
    if (statusBarContainer) {
        statusBarContainer.innerHTML = `
            <div class="card"><div class="flex justify-between items-center"><h3 class="font-bold">健康</h3><span class="text-green-500 font-semibold">${player.status.health}</span></div><div class="w-full bg-[var(--bg-tertiary)] rounded-full h-2.5 mt-2"><div class="bg-green-500 h-2.5 rounded-full" style="width: ${player.status.health}%"></div></div></div>
            <div class="card"><div class="flex justify-between items-center"><h3 class="font-bold">飢餓</h3><span class="text-yellow-500 font-semibold">${player.status.hunger}</span></div><div class="w-full bg-[var(--bg-tertiary)] rounded-full h-2.5 mt-2"><div class="bg-yellow-500 h-2.5 rounded-full" style="width: ${player.status.hunger}%"></div></div></div>
        `;
    }
    
    const worldInfoContainer = document.getElementById('world-info-cards-container');
    if (worldInfoContainer) {
        const timeValue = world.currentTime.value || world.currentTime;
        const timeString = formatSongDynastyTime(timeValue);
        
        worldInfoContainer.innerHTML = `
            <div class="card text-center"><h3 class="font-bold text-lg">時間</h3><p class="text-[var(--text-secondary)] text-sm">${timeString}</p></div>
            <div class="card text-center"><h3 class="font-bold text-lg">地點</h3><p class="text-[var(--text-secondary)] text-sm">${player.location_name || player.location}</p></div>
            <div class="card text-center"><h3 class="font-bold text-lg">天氣</h3><p class="text-[var(--text-secondary)] text-sm">${world.currentWeather}, ${world.currentTemperature}°C</p></div>
            <div class="card !p-3"><h3 class="font-bold text-center text-lg mb-1">所屬</h3><div class="text-center text-sm text-[var(--text-secondary)]"><p>${player.faction.name}</p><p>首領: ${player.faction.leader}</p><p>規模: ${player.faction.scale}</p></div></div>
        `;
    }

    const questBox = document.getElementById('quest-box');
    if(questBox) {
        questBox.innerHTML = ''; 
    }
}

/**
 * 更新所有彈出視窗的內容
 * @param {object} player 
 */
export function updateModals(player) {
    const statsContainer = document.getElementById('stats-modal-content');
    if (statsContainer) {
        const attr = player.attributes;
        statsContainer.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div class="card"><h4 class="text-lg font-bold text-[var(--accent-color)]">力量 (${attr.strength})</h4><p class="text-sm text-[var(--text-secondary)] mt-1">影響物理傷害、負重能力與部份需要體力的行動成功率。</p></div><div class="card"><h4 class="text-lg font-bold text-[var(--accent-color)]">智力 (${attr.intelligence})</h4><p class="text-sm text-[var(--text-secondary)] mt-1">影響學習速度、觀察力、說服能力與使用複雜道具的成功率。</p></div><div class="card"><h4 class="text-lg font-bold text-[var(--accent-color)]">敏捷 (${attr.agility})</h4><p class="text-sm text-[var(--text-secondary)] mt-1">影響戰鬥中的閃避與命中率、行動速度與進行潛行等精細操作的成功率。</p></div><div class="card"><h4 class="text-lg font-bold text-[var(--accent-color)]">幸運 (${attr.luck})</h4><p class="text-sm text-[var(--text-secondary)] mt-1">一個神秘的數值，似乎會影響隨機事件的結果、物品掉落率與爆擊機率。</p></div></div>`;
    }

    const networkContainer = document.getElementById('network-modal-content');
    if(networkContainer) {
        const relationships = player.relationships || [];
        if (relationships.length > 0) {
            networkContainer.innerHTML = relationships.map(r => `
                <div class="card">
                    <div class="flex justify-between items-center">
                        <h3 class="font-bold">${r.name} (${r.title})</h3>
                        <span class="${r.affinity >= 0 ? 'text-blue-500' : 'text-red-500'} font-semibold">${r.status} (${r.affinity})</span>
                    </div>
                    ${r.unlocked_backstory && r.unlocked_backstory.length > 0 ? 
                        `<ul class="list-disc list-inside text-sm mt-2 text-[var(--text-secondary)]">
                            ${r.unlocked_backstory.map(story => `<li>${story}</li>`).join('')}
                        </ul>` 
                        : '<p class="text-sm text-gray-500 italic mt-1">你對此人知之甚少。</p>'
                    }
                </div>
            `).join('');
        } else {
            networkContainer.innerHTML = '<p class="text-gray-500 italic">目前沒有任何人脈關係。</p>';
        }
    }

    const equipmentContainer = document.getElementById('equipment-modal-content');
    if(equipmentContainer) {
        const inventory = player.inventory || [];
        if (inventory.length > 0) {
            equipmentContainer.innerHTML = inventory.map(i => `
                <div class="card flex items-center space-x-4">
                    <div class="w-12 h-12 bg-[var(--bg-tertiary)] rounded-lg flex items-center justify-center font-bold text-xl">${i.name.charAt(0)}</div>
                    <div>
                        <h3 class="font-bold">${i.name} (x${i.quantity}) ${i.identified ? '' : '<span class="text-sm text-red-500">(未鑑定)</span>'}</h3>
                        <p class="text-sm text-[var(--text-secondary)]">${i.description}</p>
                    </div>
                </div>
            `).join('');
        } else {
            equipmentContainer.innerHTML = '<p class="text-gray-500 italic">你的背包空空如也。</p>';
        }
    }
    
    const memoryContainer = document.getElementById('memory-modal-content');
    if(memoryContainer) {
        memoryContainer.querySelector('ul').innerHTML = '<li class="text-gray-500 italic">暫無記憶...</li>';
    }
}
