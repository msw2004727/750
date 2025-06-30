from app.core.firebase_config import db
from app.models.action import PlayerAction
from app.services.ai_service import ai_service # <-- 匯入我們的 AI 服務

class GameService:
    @staticmethod
    def get_player_data(player_id: str):
        """從 Firestore 獲取指定玩家的資料"""
        player_ref = db.collection('players').document(player_id)
        player_doc = player_ref.get()
        if player_doc.exists:
            return player_doc.to_dict()
        return None

    @staticmethod
    def get_world_state():
        """從 Firestore 獲取目前的世界狀態"""
        world_ref = db.collection('worlds').document('main_world')
        world_doc = world_ref.get()
        if world_doc.exists:
            return world_doc.to_dict()
        return None

    @staticmethod
    def process_player_action(player_id: str, action: PlayerAction):
        print(f"接收到玩家 {player_id} 的行動: {action.value}")
        
        # 1. 從資料庫獲取當前的遊戲狀態
        player_data = GameService.get_player_data(player_id)
        world_data = GameService.get_world_state()

        # 2. 建立 Prompt (這是 Prompt 工程的核心)
        # TODO: 建立一個更詳細的 Prompt，包含所有情境資訊
        prompt = f"玩家 {player_data.get('name', '')} 執行了行動: '{action.value}'。請根據此行動生成接下來的劇情。"

        # 3. 呼叫 AI 服務
        ai_response = ai_service.generate_narrative(prompt)

        # 4. 解析 AI 回應並更新資料庫
        # TODO: 撰寫解析邏輯，並將變化寫回 Firestore

        # 5. 回傳結果給前端
        # 目前，我們先直接回傳 AI 的原始回應來進行測試
        return {
            "status": "action_processed_by_ai",
            "message": "AI 已處理您的行動。",
            "ai_response": ai_response, # 將 AI 的回應傳給前端
            "next_gamestate": None
        }

game_service = GameService()
