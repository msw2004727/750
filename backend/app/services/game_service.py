import json
import datetime
from app.core.firebase_config import db
from app.models.action import PlayerAction
from app.services.ai_service import ai_service
from app.services.prompt_generator import generate_prompt
# 匯入 Firebase 的欄位更新工具
from google.cloud.firestore_v1.field_path import FieldPath

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
    def get_location_data(location_id: str):
        """根據地點 ID 獲取地點資料"""
        if not location_id:
            return None
        location_ref = db.collection('locations').document(location_id)
        location_doc = location_ref.get()
        if location_doc.exists:
            return location_doc.to_dict()
        return None

    @staticmethod
    def process_player_action(player_id: str, action: PlayerAction):
        """
        處理玩家行動、呼叫 AI、解析回應、更新資料庫，並回傳新的遊戲狀態。
        """
        print(f"接收到玩家 {player_id} 的行動: {action.value}")
        
        player_data = GameService.get_player_data(player_id)
        world_data = GameService.get_world_state()
        location_id = player_data.get('location') if player_data else None
        location_data = GameService.get_location_data(location_id) if location_id else {}

        if not all([player_data, world_data, location_data]):
            return {"status": "error", "message": "無法獲取完整的遊戲、玩家或地點資料。"}

        # 1. 生成 Prompt
        prompt = generate_prompt(player_data, world_data, location_data, action.model_dump())
        
        # 2. 呼叫 AI
        ai_raw_response = ai_service.generate_narrative(prompt)

        # 3. 解析 AI 回應
        try:
            ai_content_str = ai_raw_response['choices'][0]['message']['content']
            ai_data = json.loads(ai_content_str)
            print(f"[PARSER] 成功解析 AI JSON: {ai_data}")
            
            # --- 關鍵新增：更新世界狀態 ---
            world_changes = ai_data.get("world_changes", {})
            if world_changes:
                world_ref = db.collection('worlds').document('main_world')
                updates = {}
                # 處理時間推進
                time_passed = world_changes.get("time_passed_hours", 0)
                if time_passed > 0:
                    # 使用 FieldValue.increment 來原子化地增加時間，更安全
                    # 這裡我們先用簡單的讀取和寫入方式
                    current_time = world_data.get('currentTime')
                    if isinstance(current_time, datetime.datetime):
                        new_time = current_time + datetime.timedelta(hours=time_passed)
                        updates['currentTime'] = new_time
                        print(f"[DB_UPDATE] 時間推進 {time_passed} 小時，新時間: {new_time.isoformat()}")

                # 處理溫度變化
                temp_change = world_changes.get("temperature_change", 0)
                if temp_change != 0:
                    current_temp = world_data.get('currentTemperature', 20)
                    new_temp = current_temp + temp_change
                    updates['currentTemperature'] = new_temp
                    print(f"[DB_UPDATE] 溫度變化 {temp_change}°C，新溫度: {new_temp}")
                
                # 如果有需要更新的欄位，則執行更新
                if updates:
                    world_ref.update(updates)

        except (json.JSONDecodeError, KeyError, IndexError, TypeError) as e:
            print(f"[ERROR] 解析或處理 AI 回應失敗: {e}")
            return {
                "status": "ai_response_error",
                "message": f"AI 回應處理失敗: {e}",
                "next_gamestate": None
            }
        
        # 4. 重新獲取更新後的新遊戲狀態
        new_player_data = GameService.get_player_data(player_id)
        new_world_data = GameService.get_world_state()

        # 5. 組合新的遊戲狀態，並加入 AI 生成的內容
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
