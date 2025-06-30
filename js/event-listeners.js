import { sendPlayerAction } from './api.js';
import { updateUI } from './ui.js';

const PLAYER_ID = 'player_001';

// 處理後端對行動的回應
function handleActionResponse(result) {
    console.log("[ACTION] 收到後端回應:", result);

    // 檢查後端是否回傳了下一個遊戲狀態
    if (result && result.next_gamestate) {
        // 使用新的遊戲狀態，來全面刷新整個介面！
        updateUI(result.next_gamestate);
    } else {
        // 如果沒有，可能是一個錯誤，顯示在畫面上
        const narrativeBox = document.getElementById('narrative-box');
        if (narrativeBox) {
            narrativeBox.innerHTML += `<p class="text-red-500 italic mt-4">錯誤: ${result.message || '未知的後端回應'}</p>`;
            narrativeBox.scrollTop = narrativeBox.scrollHeight;
        }
    }
}

export function setupActionListeners() {
    const actionsContainer = document.getElementById('actions-container');
    if (!actionsContainer) {
        console.error("[INIT] 錯誤：找不到 'actions-container'，無法設定行動監聽器。");
        return;
    }
    
    actionsContainer.addEventListener('click', async (event) => {
        const target = event.target;
        let actionData = null;

        // 處理選項按鈕點擊
        const actionButton = target.closest('.action-button');
        if (actionButton) {
            actionData = { type: 'option', value: actionButton.dataset.actionValue };
        } 
        // 處理手動輸入的確認按鈕
        else if (target.matches('#custom-action-submit')) {
            const input = document.getElementById('custom-action-input');
            if (input && input.value.trim() !== '') {
                actionData = { type: 'custom', value: input.value.trim() };
                input.value = '';
            }
        }

        if (actionData) {
            try {
                // 顯示一個“處理中”的提示
                const narrativeBox = document.getElementById('narrative-box');
                if (narrativeBox) {
                    narrativeBox.innerHTML += `<p class="text-gray-500 italic mt-4">處理中...</p>`;
                    narrativeBox.scrollTop = narrativeBox.scrollHeight;
                }

                // 發送行動並等待後端回應
                const result = await sendPlayerAction(PLAYER_ID, actionData);
                handleActionResponse(result);
            } catch (error) {
                console.error("[ACTION] 發送行動失敗:", error);
            }
        }
    });
}
