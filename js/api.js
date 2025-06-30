const API_BASE_URL = "https://md-server-main.onrender.com/api/v1";

/**
 * 從後端 API 獲取完整的遊戲狀態
 * @param {string} playerId - 玩家的 ID
 * @returns {Promise<object|null>} 遊戲狀態物件
 */
export async function fetchGameState(playerId) {
    console.log(`[API] 正在獲取玩家 ${playerId} 的遊戲狀態...`);
    const response = await fetch(`${API_BASE_URL}/game/state/${playerId}`);
    if (!response.ok) {
        throw new Error(`伺服器錯誤: ${response.status}`);
    }
    return response.json();
}

/**
 * 將玩家的行動發送到後端
 * @param {string} playerId - 玩家 ID
 * @param {object} actionData - 行動資料物件 {type, value}
 * @returns {Promise<object>} 後端的回應
 */
export async function sendPlayerAction(playerId, actionData) {
    console.log(`[API] 正在發送行動給玩家 ${playerId}:`, actionData);
    const response = await fetch(`${API_BASE_URL}/game/action/${playerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionData),
    });
    if (!response.ok) {
        throw new Error(`伺服器錯誤: ${response.status}`);
    }
    return response.json();
}
