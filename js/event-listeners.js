import { sendPlayerAction } from './api.js';
import { updateUI } from './ui.js';

const PLAYER_ID = 'player_001';

// 處理後端對行動的回應
function handleActionResponse(result) {
    console.log("[ACTION] 收到後端回應:", result);
    // 啟用所有按鈕
    document.querySelectorAll('button, input').forEach(el => el.disabled = false);

    // 檢查後端是否回傳了下一個遊戲狀態
    if (result && result.next_gamestate) {
        // 使用新的遊戲狀態，來全面刷新整個介面！
        updateUI(result.next_gamestate);
    } else {
        // 如果沒有，可能是一個錯誤，顯示在畫面上
        const narrativeBox = document.getElementById('narrative-box');
        if (narrativeBox) {
            const errorElement = narrativeBox.querySelector('.processing-text');
            if(errorElement) {
                errorElement.innerHTML = `<span class="text-red-500">錯誤: ${result.message || '未知的後端回應'}</span>`;
            } else {
                narrativeBox.innerHTML += `<p class="text-red-500 italic mt-4">錯誤: ${result.message || '未知的後端回應'}</p>`;
            }
            narrativeBox.scrollTop = narrativeBox.scrollHeight;
        }
    }
}

// 處理玩家發出的行動
async function handlePlayerAction(actionData) {
     if (actionData) {
        try {
            // 禁用所有按鈕和輸入框，防止重複點擊
            document.querySelectorAll('button, input').forEach(el => el.disabled = true);

            // 顯示一個“處理中”的提示
            const narrativeBox = document.getElementById('narrative-box');
            if (narrativeBox) {
                // 移除舊的提示（如果有的話）
                const oldProcessing = narrativeBox.querySelector('.processing-text');
                if (oldProcessing) oldProcessing.remove();
                
                // 加入新的提示
                narrativeBox.innerHTML += `<p class="text-gray-500 italic mt-4 processing-text">處理中...</p>`;
                narrativeBox.scrollTop = narrativeBox.scrollHeight;
            }

            // 發送行動並等待後端回應
            const result = await sendPlayerAction(PLAYER_ID, actionData);
            handleActionResponse(result);
        } catch (error) {
            console.error("[ACTION] 發送行動失敗:", error);
            handleActionResponse({ message: error.message }); // 將網路錯誤也顯示出來
        }
    }
}


export function setupActionListeners() {
    const mainContainer = document.querySelector('body');
    const contextMenu = document.getElementById('context-menu');
    if (!mainContainer || !contextMenu) {
        console.error("[INIT] 錯誤：找不到監聽容器或 context-menu，無法設定監聽器。");
        return;
    }
    
    // 使用事件委派監聽整個 body 的點擊事件
    mainContainer.addEventListener('click', async (event) => {
        const target = event.target;
        let actionData = null;

        // 檢查是否點擊了「選項按鈕」或「手動輸入按鈕」
        const actionButton = target.closest('.action-button');
        if (actionButton) {
            actionData = { type: 'option', value: actionButton.dataset.actionValue };
        } 
        else if (target.matches('#custom-action-submit')) {
            const input = document.getElementById('custom-action-input');
            if (input && input.value.trim() !== '') {
                actionData = { type: 'custom', value: input.value.trim() };
                input.value = '';
            }
        }
        // (新) 檢查是否點擊了「彈出選單中的按鈕」
        else if(target.closest('.context-menu-button')) {
            event.preventDefault();
            const button = target.closest('.context-menu-button');
            actionData = {
                type: button.dataset.actionType, // 例如 'item_action'
                value: button.dataset.actionValue, // 例如 'pickup'
                target_id: button.dataset.targetId // 例如 'item_rusty_sword'
            };
            contextMenu.classList.add('hidden'); // 點擊後隱藏選單
        }
        
        // 如果有任何有效的行動資料，就執行它
        if(actionData){
            handlePlayerAction(actionData);
            return; // 執行完畢，返回
        }

        // --- (新) 處理互動元素的點擊 ---
        const interactiveElement = target.closest('.interactive-element');
        if (interactiveElement) {
            event.preventDefault(); // 防止<a>標籤跳轉
            const type = interactiveElement.dataset.interactiveType;
            const id = interactiveElement.dataset.interactiveId;

            // 根據類型決定選單內容
            let menuContent = '';
            if (type === 'item') { // 場景中的物品
                menuContent = `
                    <button class="context-menu-button" data-action-type="item_action" data-action-value="pickup" data-target-id="${id}">撿起</button>
                    <button class="context-menu-button" data-action-type="item_action" data-action-value="examine" data-target-id="${id}">查看</button>
                `;
            } else if (type === 'inv_item') { // 背包中的物品
                 menuContent = `
                    <button class="context-menu-button" data-action-type="item_action" data-action-value="drop" data-target-id="${id}">丟棄</button>
                    <button class="context-menu-button" data-action-type="item_action" data-action-value="examine" data-target-id="${id}">查看</button>
                `;
            }
            // 未來可以增加對 'npc' 等類型的處理
            
            if(menuContent) {
                contextMenu.innerHTML = menuContent;
                // 定位選單到點擊位置
                contextMenu.style.left = `${event.pageX}px`;
                contextMenu.style.top = `${event.pageY + 5}px`;
                contextMenu.classList.remove('hidden');
            }
        } else {
            // 如果點擊的不是互動元素，也不是選單本身，就隱藏選單
            if(!target.closest('#context-menu')) {
                contextMenu.classList.add('hidden');
            }
        }
    });
}
