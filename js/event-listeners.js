import { sendPlayerAction } from './api.js';
import { updateUI } from './ui.js';

const PLAYER_ID = 'player_001';

// 處理後端對行動的回應
function handleActionResponse(result) {
    console.log("[ACTION] 收到後端回應:", result);
    const narrativeBox = document.getElementById('narrative-box');
    if (narrativeBox) {
        // 先顯示一個即時的反饋訊息
        narrativeBox.innerHTML += `<p class="text-blue-500 italic mt-4">${result.message}</p>`;
        narrativeBox.scrollTop = narrativeBox.scrollHeight; // 自動滾動到底部
    }

    // 未來，我們會用 result.next_gamestate 來全面更新 UI
    // if (result.next_gamestate) {
    //     updateUI(result.next_gamestate);
    // }
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
                // 發送行動並等待後端回應
                const result = await sendPlayerAction(PLAYER_ID, actionData);
                handleActionResponse(result);
            } catch (error) {
                console.error("[ACTION] 發送行動失敗:", error);
            }
        }
    });
}
