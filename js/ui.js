// js/ui.js
import { 
    updateSceneInfo, 
    updateNarrative, 
    updateActions, 
    updateDashboard, 
    updateModals 
} from './render.js';

/**
 * 主更新函式：協調所有 UI 的更新
 * @param {object} gameState - 從後端獲取的完整遊戲狀態物件
 */
export function updateUI(gameState) {
    if (!gameState) { 
        console.error("[UI] gameState 為空，停止更新。"); 
        return; 
    }
    console.log("[UI] 開始全面更新介面，傳入的 gameState:", gameState);
    
    // 使用 requestAnimationFrame 確保流暢的畫面更新
    requestAnimationFrame(() => {
        // (新) 將 gameState.scene_characters 傳遞給 updateSceneInfo 函式
        updateSceneInfo(gameState.player, gameState.narrative, gameState.scene_characters);
        
        // 其他更新函式保持不變
        updateNarrative(gameState.world, gameState.narrative);
        updateActions(gameState.narrative ? gameState.narrative.options : []);
        updateDashboard(gameState.player, gameState.world);
        updateModals(gameState.player);
        
        console.log("[UI] 所有介面更新函式執行完畢。");
    });
}
