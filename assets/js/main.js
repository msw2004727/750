// main.js - 遊戲主邏輯入口

// ------------------- 模組導入 (未來) -------------------
// 為了簡化初始設置，這裡先將功能寫在一起，未來可拆分。
// import { updatePlayerPanel } from './ui/player-panel.js';
// import { updateScenePanel } from './ui/scene-panel.js';
// import { fetchInitialGameState, sendAction } from './services/game-state-service.js';

// ------------------- DOM 元素獲取 -------------------
const narrativeLog = document.getElementById('narrative-log');
const actionOptionsContainer = document.getElementById('action-options');

// 玩家資料面板元素
const playerNameEl = document.getElementById('player-name');
const playerStatusEl = document.getElementById('player-status');
const playerHpEl = document.getElementById('player-hp');
const playerMpEl = document.getElementById('player-mp');
const playerCoordXEl = document.getElementById('player-coord-x');
const playerCoordYEl = document.getElementById('player-coord-y');

// 其他面板元素
const sceneCharactersList = document.getElementById('scene-characters-list');
const nearbyFacilitiesList = document.getElementById('nearby-facilities-list');
const areaNameEl = document.getElementById('area-name');
// ... 其他地區資訊元素 ...

// ------------------- 遊戲狀態 (假數據) -------------------
// 在真正連接 Firebase 前，我們先用假數據模擬
let currentGameState = {
    pc_data: {
        basic_info: { name: "阿宅" },
        conditions: { notes: "良好" },
        core_status: {
            hp: { current: 100, max: 100 },
            mp: { current: 50, max: 50 },
        },
    },
    map_data: {
        locations: [
            { id: "some_location_id", coordinates: { x: 10, y: 15 } }
        ]
    },
    narrative: {
        log: [
            { type: 'system', content: '你睜開雙眼，發現自己身處於陰暗而陌生的巷弄之中。' },
            { type: 'system', content: '一個位於山腳下的純樸小鎮，鎮上居民大多以務農和採集為生。一條清澈的小溪穿鎮而過，為此地帶來了無限生機。' },
            { type: 'player', content: '> 始動' }
        ],
        options: [
            { id: 'A', text: '檢查自身狀況' },
            { id: 'B', text: '觀察四周環境' },
            { id: 'C', text: '尋找水源' },
        ]
    },
    scene: {
        characters: [{ id: 'npc_li_si_01', name: '李四嫂 (路標)', status: '遠處走過' }],
        facilities: [{ id: 'well_01', name: '一口古井' }]
    },
    area: {
        name: '清溪鎮',
        size: '15000平方公尺',
        population: '約127人',
        leader: '卓不凡 (鎮長)',
        security: '正常',
        prosperity: '普通',
        products: '稻米、草藥、基礎礦石'
    }
};

// ------------------- 核心功能函數 -------------------

/**
 * 更新所有 UI 面板的數據
 * @param {object} gameState - 最新的遊戲狀態物件
 */
function updateUI(gameState) {
    // 更新玩家資料
    playerNameEl.textContent = gameState.pc_data.basic_info.name;
    playerStatusEl.textContent = gameState.pc_data.conditions.notes;
    playerHpEl.textContent = `${gameState.pc_data.core_status.hp.current}/${gameState.pc_data.core_status.hp.max}`;
    playerMpEl.textContent = `${gameState.pc_data.core_status.mp.current}/${gameState.pc_data.core_status.mp.max}`;
    playerCoordXEl.textContent = gameState.map_data.locations[0].coordinates.x;
    playerCoordYEl.textContent = gameState.map_data.locations[0].coordinates.y;

    // 更新場景角色
    sceneCharactersList.innerHTML = ''; // 清空
    gameState.scene.characters.forEach(char => {
        const li = document.createElement('li');
        li.textContent = `${char.name} - ${char.status}`;
        li.dataset.id = char.id;
        sceneCharactersList.appendChild(li);
    });
    
    // 更新附近設施
    nearbyFacilitiesList.innerHTML = ''; // 清空
    gameState.scene.facilities.forEach(fac => {
        const li = document.createElement('li');
        li.textContent = fac.name;
        li.dataset.id = fac.id;
        nearbyFacilitiesList.appendChild(li);
    });

    // 更新地區資訊
    areaNameEl.textContent = gameState.area.name;
    // ... 更新其他地區資訊 ...

    // 更新劇情日誌
    narrativeLog.innerHTML = ''; // 清空
    gameState.narrative.log.forEach(entry => {
        const p = document.createElement('p');
        p.textContent = entry.content;
        if (entry.type === 'player') {
            p.classList.add('player-prompt');
        }
        narrativeLog.appendChild(p);
    });
    // 自動滾動到底部
    narrativeLog.scrollTop = narrativeLog.scrollHeight;


    // 更新行動選項
    actionOptionsContainer.innerHTML = ''; // 清空
    gameState.narrative.options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = `${option.id}. ${option.text}`;
        button.dataset.actionId = option.id;
        button.addEventListener('click', handleActionSelect);
        actionOptionsContainer.appendChild(button);
    });
}

/**
 * 處理玩家選擇的行動
 * @param {Event} event - 點擊事件
 */
function handleActionSelect(event) {
    const actionId = event.target.dataset.actionId;
    console.log(`玩家選擇了行動: ${actionId}`);

    // 顯示玩家的選擇
    const p = document.createElement('p');
    p.textContent = `> ${event.target.textContent}`;
    p.classList.add('player-prompt');
    narrativeLog.appendChild(p);
    
    // 禁用所有按鈕，顯示等待狀態
    actionOptionsContainer.innerHTML = '<p>AI 正在運算中...</p>';
    
    // **核心：在這裡發送 actionId 到後端 (Firebase Cloud Function)**
    // 後端接收到後，會根據所有模組規則運算下一回合的 gameState
    // 然後我們再接收新的 gameState 來更新 UI
    // sendAction(actionId).then(newGameState => {
    //    currentGameState = newGameState;
    //    updateUI(currentGameState);
    // });
    
    // 為了演示，我們這裡用 setTimeout 模擬一個延遲後返回的假數據
    setTimeout(() => {
        // 模擬 AI 回應
        currentGameState.narrative.log.push({ type: 'system', content: `你選擇了「${event.target.textContent}」。AI正在處理你的決定...` });
        currentGameState.narrative.options = [
             { id: 'A', text: '選項更新了' },
             { id: 'B', text: '這是新的選項' },
        ];
        updateUI(currentGameState);
    }, 1500);
}


// ------------------- 遊戲初始化 -------------------
function initializeGame() {
    console.log("遊戲初始化...");
    // 在真實情境下，這裡會是從 Firebase 獲取初始或最後的遊戲狀態
    // fetchInitialGameState().then(initialState => {
    //    currentGameState = initialState;
    //    updateUI(currentGameState);
    // });
    
    // 目前使用假數據來初始化 UI
    updateUI(currentGameState);
}

// 當 DOM 載入完成後，啟動遊戲
document.addEventListener('DOMContentLoaded', initializeGame);
