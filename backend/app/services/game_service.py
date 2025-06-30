import json
import datetime
from app.core.firebase_config import db
from app.models.action import PlayerAction
from app.services.ai_service import ai_service
from app.services.prompt_generator import generate_prompt

class GameService:
    @staticmethod
    def get_player_data(player_id: str):
        player_ref = db.collection('players').document(player_id)
        player_doc = player_ref.get()
        if not player_doc.exists: return None
        player_data = player_doc.to_dict()

        # 讀取地點名稱並加入玩家資料
        location_id = player_data.get('location')
        location_data = GameService.get_location_data(location_id)
        player_data['location_name'] = location_data.get('name', '未知地點') if location_data else '未知地點'

        # --- 關鍵修改：根據玩家認知來組合資料 ---

        # 1. 讀取 inventory 子集合並判斷描述
        inventory_list = []
        inventory_docs = player_ref.collection('inventory').stream()
        for doc in inventory_docs:
            item_id = doc.id
            player_item_data = doc.to_dict()
            item_info_doc = db.collection('items').document(item_id).get()
            if item_info_doc.exists:
                item_data = item_info_doc.to_dict()
                is_identified = player_item_data.get('identified', False)
                inventory_list.append({
                    "id": item_id,
                    "name": item_data.get('name'),
                    "description": item_data.get('true_description') if is_identified else item_data.get('vague_description', '一件神秘的物品。'),
                    "quantity": player_item_data.get('quantity'),
                    "identified": is_identified
                })
        player_data['inventory'] = inventory_list

        # 2. 讀取 relationships 子集合並篩選背景故事
        relationships_list = []
        relationship_docs = player_ref.collection('relationships').stream()
        for doc in relationship_docs:
            npc_id = doc.id
            player_relationship_data = doc.to_dict()
            npc_info_doc = db.collection('npcs').document(npc_id).get()
            if npc_info_doc.exists:
                npc_data = npc_info_doc.to_dict()
                
                # 根據玩家解鎖的索引，提取對應的背景故事
                unlocked_indices = player_relationship_data.get('unlocked_backstory_indices', [])
                full_backstory = npc_data.get('backstory', [])
                unlocked_stories = [full_backstory[i] for i in unlocked_indices if i < len(full_backstory)]
                
                relationships_list.append({
                    "id": npc_id,
                    "name": npc_data.get('name'),
                    "title": npc_data.get('title'),
                    "affinity": player_relationship_data.get('affinity'),
                    "status": player_relationship_data.get('status'),
                    "unlocked_backstory": unlocked_stories
                })
        player_data['relationships'] = relationships_list
        return player_data

    # ... (get_world_state 和 get_location_data 保持不變) ...
    # ... (process_player_action 保持不變) ...

# (以下為精簡後的其他函式，確保檔案完整性)
    @staticmethod
    def get_world_state():
        world_ref = db.collection('worlds').document('main_world')
        world_doc = world_ref.get()
        return world_doc.to_dict() if world_doc.exists else None
    
    @staticmethod
    def get_location_data(location_id: str):
        if not location_id: return None
        location_ref = db.collection('locations').document(location_id)
        location_doc = location_ref.get()
        return location_doc.to_dict() if location_doc.exists else None
        
    @staticmethod
    def process_player_action(player_id: str, action: PlayerAction):
        player_data = GameService.get_player_data(player_id)
        world_data = GameService.get_world_state()
        location_data = GameService.get_location_data(player_data.get('location')) if player_data else {}
        if not all([player_data, world_data]): return {"status": "error"}
        prompt = generate_prompt(player_data, world_data, location_data, action.model_dump())
        ai_raw_response = ai_service.generate_narrative(prompt)
        try:
            ai_content_str = ai_raw_response['choices'][0]['message']['content']
            ai_data = json.loads(ai_content_str)
            world_changes = ai_data.get("world_changes", {})
            if world_changes:
                player_ref = db.collection('players').document(player_id)
                world_ref = db.collection('worlds').document('main_world')
                updates = {}
                time_unit = world_changes.get("time_unit", "minutes")
                time_amount = world_changes.get("time_amount", 0)
                if time_amount > 0 and isinstance(world_data['currentTime'], datetime.datetime):
                    delta = datetime.timedelta(minutes=time_amount) if time_unit == "minutes" else datetime.timedelta(hours=time_amount) if time_unit == "hours" else datetime.timedelta()
                    if delta.total_seconds() > 0:
                        new_time = world_data['currentTime'] + delta
                        updates['currentTime'] = new_time
                if updates: world_ref.update(updates)
        except Exception as e:
            print(f"[ERROR] 解析或處理 AI 回應失敗: {e}")
            return {"status": "ai_response_error"}
        next_gamestate = {
            "player": GameService.get_player_data(player_id),
            "world": GameService.get_world_state(),
            "narrative": {"description": ai_data.get("story_description"), "options": ai_data.get("options"), "atmosphere": ai_data.get("atmosphere")}
        }
        return {"status": "action_processed", "next_gamestate": next_gamestate}

game_service = GameService()
