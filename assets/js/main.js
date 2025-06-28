// 在 main.js 的頂部或 initializeGame 函數中

// 從 localStorage 獲取當前遊戲的 session ID
const currentGameSessionId = localStorage.getItem('game_session_id');

if (!currentGameSessionId) {
    // 如果沒有 session ID，代表玩家沒有登入，將其導向登入頁面
    alert("請先登入或創建角色！");
    window.location.href = 'login.html';
}

// 在 handleActionSelect 函數中發送請求時，要附上 session_id
async function handleActionSelect(event) {
    // ...
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: currentGameSessionId, // <<-- 加上這一行
                player_action: {
                    id: actionId,
                    text: actionText.substring(3).trim()
                },
            }),
        });
        // ...
    } catch (error) {
        // ...
    }
}
