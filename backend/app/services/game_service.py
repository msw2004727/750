import json
from app.core.firebase_config import db
from app.models.action import PlayerAction
from app.services.ai_service import ai_service

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

        # 準備一個更詳細的 Prompt
        prompt = f"目前情境：天氣{world_data.get('currentWeather')}，玩家 {player_data.get('name', '')} 位於 {player_data.get('location')}。玩家執行了行動: '{action.value}'。請根據此行動生成接下來的劇情發展。"
        
        # --- 1. 呼叫 AI 服務 ---
        ai_raw_response = ai_service.generate_narrative(prompt)

        # --- 2. 解析 AI 回應 ---
        try:
            # 從 AI 回應中提取 JSON 內容
            ai_content_str = ai_raw_response['choices'][0]['message']['content']
            ai_data = json.loads(ai_content_str)
            print(f"[PARSER] 成功解析 AI JSON: {ai_data}")
            
            # TODO: 根據 ai_data 的內容更新資料庫
            # 例如：db.collection('worlds').document('main_world').update({"currentTime": ...})

        except (json.JSONDecodeError, KeyError, IndexError, TypeError) as e:
            print(f"[ERROR] 解析 AI 回應失敗: {e}")
            # 如果解析失敗，回傳一個錯誤狀態
            return {
                "status": "ai_response_parse_error",
                "message": f"AI 回應格式錯誤，無法處理。錯誤: {e}",
                "next_gamestate": None
            }
        
        # --- 3. 獲取更新後的新遊戲狀態 ---
        # 注意：在真正更新資料庫後，這裡獲取到的就會是全新的狀態
        new_player_data = GameService.get_player_data(player_id)
        new_world_data = GameService.get_world_state()

        # --- 4. 組合新的遊戲狀態，並加入 AI 生成的敘述和選項 ---
        next_gamestate = {
            "player": new_player_data,
            "world": new_world_data,
            "narrative": { # <-- 將 AI 的內容加入
                "description": ai_data.get("story_description", "AI 沒有提供故事描述。"),
                "options": ai_data.get("options", [])
            }
        }
        
        return {
            "status": "action_processed",
            "message": "已成功處理玩家行動並生成新劇情。",
            "next_gamestate": next_gamestate # <-- 將全新的遊戲狀態回傳給前端
        }

game_service = GameService()
