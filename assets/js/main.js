// main.js - v1.2 - 遊戲主邏輯與 UI 控制器 (整合迷霧系統與距離顯示)

// ... (DOM 元素獲取部分與之前相同) ...
const BACKEND_URL = "https://md-server-main.onrender.com/api/generate_turn";
// ... (其他 DOM 元素) ...
const areaPopulationEl = document.getElementById('area-population'); // 範例
const areaSecurityEl = document.getElementById('area-security'); // 範例

/**
 * [新] 解析 AI 回傳的完整文字敘述 v1.2
 */
function parseNarrative(rawText) {
    const gameState = {
        header: {},
        title: "",
        narrative: "",
        playerStatus: {},
        scene: { characters: [], facilities: [] },
        actionOptions: []
    };

    // 基礎解析 (與之前版本類似)
    // ...
    const headerMatch = rawText.match(/🎲 回合：(.*?)\n🕐 時間：(.*?)\n📍 地點：(.*?)\n🌦️ 天氣：(.*?)\n👥 在場：(.*?)\n/s);
    if (headerMatch) {
        gameState.header = {
            round: headerMatch[1].trim(),
            time: headerMatch[2].trim(),
            location: headerMatch[3].trim(),
            weather: headerMatch[4].trim(),
        };
    }
    
    const mainNarrativeSection = rawText.match(/【\*\*(.*?)\*\*】([\s\S]*?)---/);
    if(mainNarrativeSection) {
        gameState.title = mainNarrativeSection[1];
        gameState.narrative = mainNarrativeSection[2].trim();
    } else {
        gameState.narrative = rawText.split('---')[1] || rawText;
    }
    
    // [核心升級] 解析主敘述中的角色/設施及其距離
    const entityRegex = /【([^】]+)】\s*\((約?[\d\.]+m)\)/g;
    let match;
    while ((match = entityRegex.exec(gameState.narrative)) !== null) {
        // 判斷是人物還是設施 (簡易判斷，可優化)
        // 假設: 兩個字或三個字的名字通常是人
        const name = match[1];
        const distance = match[2];
        if (name.length <= 4) { // 簡易判斷
             gameState.scene.characters.push({ name, distance });
        } else {
             gameState.scene.facilities.push({ name, distance });
        }
    }
    
    // ... 解析狀態速覽和行動選項 (與之前版本類似) ...

    return gameState;
}


/**
 * [新] 更新所有 UI 面板的數據 v1.2
 * @param {string} rawNarrative - 從後端收到的完整文字回應
 * @param {object} worldState - 從後端額外收到的、用於渲染迷霧系統的完整世界狀態 (未來擴充)
 */
function updateUI(rawNarrative, worldState) {
    const newState = parseNarrative(rawNarrative);

    // 1. 更新即時資訊欄
    // ... (與之前相同) ...
    infoRoundEl.textContent = newState.header.round;
    // ...

    // 2. 更新主敘事窗口
    narrativeLog.innerHTML = `<h3>${newState.title}</h3><p>${newState.narrative.replace(/\n/g, '<br>')}</p>`;
    
    // [核心升級] 3. 更新場景角色與設施面板 (帶距離)
    sceneCharactersList.innerHTML = '';
    if (newState.scene.characters.length > 0) {
        newState.scene.characters.forEach(char => {
            const li = document.createElement('li');
            li.innerHTML = `${char.name} <span class="distance">(${char.distance})</span>`;
            sceneCharactersList.appendChild(li);
        });
    } else {
        sceneCharactersList.innerHTML = '<li>可視範圍內無人。</li>';
    }

    nearbyFacilitiesList.innerHTML = '';
    if (newState.scene.facilities.length > 0) {
        newState.scene.facilities.forEach(fac => {
            const li = document.createElement('li');
            li.innerHTML = `${fac.name} <span class="distance">(${fac.distance})</span>`;
            nearbyFacilitiesList.appendChild(li);
        });
    } else {
        nearbyFacilitiesList.innerHTML = '<li>附近無特殊設施。</li>';
    }

    // [核心升級] 4. 更新地區資訊 (迷霧系統)
    // 註: 這裡需要後端將相關的 worldState 一起傳回
    // if (worldState && worldState.locations) {
    //     const currentLoc = worldState.locations[worldState.world.player_current_location_id];
    //     areaPopulationEl.textContent = currentLoc.population.is_known ? currentLoc.population.value : '未知';
    //     areaSecurityEl.textContent = currentLoc.security_level.is_known ? currentLoc.security_level.value : '未知';
    // }

    // ... (其他UI更新與之前相同) ...
}

// ... (handleActionSelect 和 initializeGame 函數與之前版本大致相同) ...
