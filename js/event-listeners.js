import { sendPlayerAction } from './api.js';

const PLAYER_ID = 'player_001';

function handleActionResponse(result) {
    console.log("[API] 收到後端回應:", result);
    const narrativeBox = document.getElementById('narrative-box');
    if (narrativeBox) {
        narrativeBox.innerHTML += `<p class="text-blue-500 italic mt-4">${result.message}</p>`;
    }
    // TODO: 未來這裡應該是用 result.next_gamestate 來呼叫 ui.js 的 updateUI 函式
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

        if (target.matches('.action-button')) {
            actionData = { type: 'option', value: target.dataset.actionValue };
        } else if (target.matches('#custom-action-submit')) {
            const input = document.getElementById('custom-action-input');
            if (input && input.value.trim() !== '') {
                actionData = { type: 'custom', value: input.value.trim() };
                input.value = '';
            }
        }

        if (actionData) {
            try {
                const result = await sendPlayerAction(PLAYER_ID, actionData);
                handleActionResponse(result);
            } catch (error) {
                console.error("[ACTION] 發送行動失敗:", error);
            }
        }
    });
}
