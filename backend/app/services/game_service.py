# app/services/game_service.py
from app.core.firebase_config import db
from app.models.action import PlayerAction # 匯入我們剛才建立的模型

class GameService:
    @staticmethod
    def get_player_data(player_id: str):
        player_ref = db.collection('players').document(player_id)
        player_doc = player_ref.get()
        if player_doc.exists:
            return player_doc.to_dict()
        return None

    @staticmethod
    def get_world_state():
        world_ref = db.collection('worlds').document('main_world')
        world_doc = world_ref.get()
        if world_doc.exists:
            return world_doc.to_dict()
        return None

    # --- 新增的方法 ---
    @staticmethod
    def process_player_action(player_id: str, action: PlayerAction):
        """
        處理玩家的行動指令。
        目前這只是一個基礎框架，未來會在這裡呼叫 AI。
        """
        print(f"接收到玩家 {player_id} 的行動: ")
        print(f"  - 類型: {action.type}")
        print(f"  - 內容: {action.value}")
        
        # TODO: 未來這一步會將遊戲狀態和玩家行動組裝成 Prompt，並呼叫 AI
        
        # 目前，我們先回傳一個簡單的確認訊息和下一步的假資料
        # 這一步的目的是驗證後端確實收到了前端的指令
        response_data = {
            "status": "action_received",
            "message": f"已收到行動 '{action.value}'，正在處理...",
            "next_gamestate": None # 未來這裡會回傳 AI 生成的下一個遊戲狀態
        }
        return response_data

game_service = GameService()
