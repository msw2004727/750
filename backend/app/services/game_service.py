import json
from app.core.firebase_config import db
from app.models.action import PlayerAction
from app.services.ai_service import ai_service
from app.services.prompt_generator import generate_prompt

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
        """
        處理玩家行動、呼叫 AI、解析回應，並回傳新的遊戲狀態。
        """
        print(f"接收到玩家 {player_id} 的行動: {action.value}")
        
        player_data = GameService.get_player_data(player_id)
        world_data = GameService.get_world_state()

        if not player_data or not world_data:
            return {"status": "error", "message": "無法獲取遊戲或玩家資料。"}

        # --- 1. 使用新的生成器建立 Prompt ---
        prompt = generate_prompt(player_data, world_data, action.model_dump())
        
        # --- 2. 呼叫 AI 服務 ---
        ai_raw_response = ai_service.generate_narrative(prompt)

        # --- 3. 解析 AI 回應 ---
        try:
            ai_content_str = ai_raw_response['choices'][0]['message']['content']
            ai_data = json.loads(ai_content_str)
            print(f"[PARSER] 成功解析 AI JSON: {ai_data}")
            
            # TODO: 根據 ai_data.world_changes 的內容更新資料庫

        except (json.JSONDecodeError, KeyError, IndexError, TypeError) as e:
            print(f"[ERROR] 解析 AI 回應失敗: {e}")
            return {
                "status": "ai_response_parse_error",
                "message": f"AI 回應格式錯誤，無法處理。錯誤: {e}",
                "next_gamestate": None
            }
        
        # --- 4. 獲取更新後的新遊戲狀態 ---
        new_player_data = GameService.get_player_data(player_id)
        new_world_data = GameService.get_world_state()

        # --- 5. 組合新的遊戲狀態，並加入 AI 生成的內容 ---
        next_gamestate = {
            "player": new_player_data,
            "world": new_world_data,
            "narrative": {
                "description": ai_data.get("story_description", "AI沒有提供故事描述。"),
                "options": ai_data.get("options", []),
                "atmosphere": ai_data.get("atmosphere", "未知")
            }
        }
        
        return {
            "status": "action_processed",
            "message": "已成功處理玩家行動並生成新劇情。",
            "next_gamestate": next_gamestate
        }

game_service = GameService()
