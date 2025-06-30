import json
import datetime
from app.core.firebase_config import db
from app.models.action import PlayerAction
from app.services.ai_service import ai_service
from app.services.prompt_generator import generate_prompt

class GameService:
    @staticmethod
    def get_player_data(player_id: str):
        """從 Firestore 獲取指定玩家的資料，並包含其子集合的內容"""
        player_ref = db.collection('players').document(player_id)
        player_doc = player_ref.get()

        if not player_doc.exists:
            return None
        
        player_data = player_doc.to_dict()

        # 1. 讀取 inventory 子集合
        inventory_list = []
        inventory_docs = player_ref.collection('inventory').stream()
        for doc in inventory_docs:
            item_id = doc.id
            item_info_doc = db.collection('items').document(item_id).get()
            if item_info_doc.exists:
                item_data = item_info_doc.to_dict()
                inventory_list.append({
                    "id": item_id,
                    "name": item_data.get('name'),
                    "description": item_data.get('description'),
                    "quantity": doc.to_dict().get('quantity')
                })
        player_data['inventory'] = inventory_list
        print(f"[DB_READ] 讀取到 {len(inventory_list)} 件物品。")

        # 2. 讀取 relationships 子集合
        relationships_list = []
        relationship_docs = player_ref.collection('relationships').stream()
        for doc in relationship_docs:
            npc_id = doc.id
            npc_info_doc = db.collection('npcs').document(npc_id).get()
            if npc_info_doc.exists:
                npc_data = npc_info_doc.to_dict()
                relationship_data = doc.to_dict()
                relationships_list.append({
                    "id": npc_id,
                    "name": npc_data.get('name'),
                    "title": npc_data.get('title'),
                    "affinity": relationship_data.get('affinity'),
                    "status": relationship_data.get('status')
                })
        player_data['relationships'] = relationships_list
        print(f"[DB_READ] 讀取到 {len(relationships_list)} 條人脈關係。")

        return player_data

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
        """處理玩家行動、呼叫 AI、解析回應、更新資料庫，並回傳新的遊戲狀態。"""
        print(f"接收到玩家 {player_id} 的行動: {action.value}")
        
        player_data = GameService.get_player_data(player_id)
        world_data = GameService.get_world_state()
        location_id = player_data.get('location') if player_data else None
        location_data = GameService.get_location_data(location_id) if location_id else {}

        if not all([player_data, world_data, location_data]):
            return {"status": "error", "message": "無法獲取完整的遊戲、玩家或地點資料。"}

        prompt = generate_prompt(player_data, world_data, location_data, action.model_dump())
        ai_raw_response = ai_service.generate_narrative(prompt)

        try:
            ai_content_str = ai_raw_response['choices'][0]['message']['content']
            ai_data = json.loads(ai_content_str)
            print(f"[PARSER] 成功解析 AI JSON: {ai_data}")
            
            world_changes = ai_data.get("world_changes", {})
            if world_changes:
                world_ref = db.collection('worlds').document('main_world')
                updates = {}
                time_unit = world_changes.get("time_unit", "minutes")
                time_amount = world_changes.get("time_amount", 0)
                if time_amount > 0:
                    current_time = world_data.get('currentTime')
                    if isinstance(current_time, datetime.datetime):
                        delta = datetime.timedelta()
                        if time_unit == "minutes": delta = datetime.timedelta(minutes=time_amount)
                        elif time_unit == "hours": delta = datetime.timedelta(hours=time_amount)
                        elif time_unit == "days": delta = datetime.timedelta(days=time_amount)
                        if delta.total_seconds() > 0:
                            new_time = current_time + delta
                            updates['currentTime'] = new_time
                            print(f"[DB_UPDATE] 時間推進 {time_amount} {time_unit}，新時間: {new_time.isoformat()}")
                
                temp_change = world_changes.get("temperature_change", 0)
                if temp_change != 0:
                    current_temp = world_data.get('currentTemperature', 20)
                    new_temp = current_temp + temp_change
                    updates['currentTemperature'] = new_temp
                    print(f"[DB_UPDATE] 溫度變化 {temp_change}°C，新溫度: {new_temp}")
                
                if updates:
                    world_ref.update(updates)

        except (json.JSONDecodeError, KeyError, IndexError, TypeError) as e:
            print(f"[ERROR] 解析或處理 AI 回應失敗: {e}")
            return {"status": "ai_response_error", "message": f"AI 回應處理失敗: {e}", "next_gamestate": None}
        
        new_player_data = GameService.get_player_data(player_id)
        new_world_data = GameService.get_world_state()

        next_gamestate = {
            "player": new_player_data,
            "world": new_world_data,
            "narrative": {
                "description": ai_data.get("story_description", "AI沒有提供故事描述。"),
                "options": ai_data.get("options", []),
                "atmosphere": ai_data.get("atmosphere", "未知")
            }
        }
        
        return {"status": "action_processed", "message": "已成功處理玩家行動並生成新劇情。", "next_gamestate": next_gamestate}

game_service = GameService()
