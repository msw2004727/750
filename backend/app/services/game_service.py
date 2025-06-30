# backend/app/services/game_service.py
import json
import traceback
from app.core.firebase_config import db
from app.models.action import PlayerAction
from app.services.ai_service import ai_service
from app.services.prompt_generator import generate_prompt
from app.services.state_manager import update_game_state_in_transaction

class GameService:
    @staticmethod
    def get_player_data(player_id: str):
        player_ref = db.collection('players').document(player_id)
        player_doc = player_ref.get()
        if not player_doc.exists: return None
        player_data = player_doc.to_dict()

        location_id = player_data.get('location')
        location_data = GameService.get_location_data(location_id)
        player_data['location_name'] = location_data.get('name', '未知地點') if location_data else '未知地點'

        inventory_list = []
        inventory_docs = player_ref.collection('inventory').stream()
        for doc in inventory_docs:
            item_id = doc.id
            player_item_data = doc.to_dict()
            if player_item_data.get('quantity', 0) <= 0: continue
            
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

        relationships_list = []
        relationship_docs = player_ref.collection('relationships').stream()
        for doc in relationship_docs:
            npc_id = doc.id
            player_relationship_data = doc.to_dict()
            npc_info_doc = db.collection('npcs').document(npc_id).get()
            if npc_info_doc.exists:
                npc_data = npc_info_doc.to_dict()
                unlocked_indices = player_relationship_data.get('unlocked_backstory_indices', [])
                full_backstory = npc_data.get('backstory', [])
                unlocked_stories = [full_backstory[i] for i in unlocked_indices if i < len(full_backstory)]
                
                relationships_list.append({
                    "id": npc_id, "name": npc_data.get('name'), "title": npc_data.get('title'),
                    "affinity": player_relationship_data.get('affinity'), "status": player_relationship_data.get('status'),
                    "unlocked_backstory": unlocked_stories
                })
        player_data['relationships'] = relationships_list
        return player_data

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
        if not all([player_data, world_data, location_data]):
            return {"status": "error", "message": "無法獲取完整的遊戲狀態。"}

        action_dict = action.model_dump()
        action_type = action_dict.get('type')
        chosen_action_value = action_dict.get('value', '')
        ai_data = None
        
        try:
            # --- (新) 核心改造：根據行動類型進行分流 ---

            # 情況一：玩家執行了精準的「物品互動」
            if action_type == 'item_action':
                target_id = action_dict.get('target_id')
                item_name = "未知物品" # 預設名稱
                
                # 為了在敘述中顯示正確的物品名稱，我們需要查詢一下
                item_info_doc = db.collection('items').document(target_id).get()
                if item_info_doc.exists:
                    item_name = item_info_doc.to_dict().get('name', item_name)

                if chosen_action_value == 'pickup':
                    ai_data = {
                        "story_description": f"你撿起了地上的「{item_name}」。",
                        "options": ["繼續探索", "查看背包"],
                        "atmosphere": "獲得",
                        "world_changes": {"items_added": [{"item_id": target_id, "quantity": 1}], "time_amount": 1}
                    }
                elif chosen_action_value == 'drop':
                    ai_data = {
                        "story_description": f"你將身上的「{item_name}」丟在了地上。",
                        "options": ["離開這裡", "後悔了，把它撿回來"],
                        "atmosphere": "平常",
                        "world_changes": {"items_removed": [{"item_id": target_id, "quantity": 1}], "time_amount": 1}
                    }
                elif chosen_action_value == 'examine':
                     # 對於「查看」，我們需要讓 AI 來生成描述，但這是一個單獨的邏輯，我們先保留框架
                    ai_data = { "story_description": f"你仔細地端詳著「{item_name}」，但暫時沒看出什麼特別之處。", "options": ["收起來", "繼續研究"], "atmosphere": "觀察" }
            
            # 情況二：玩家執行了傳統的「選項」或「自訂」行動
            else:
                # 檢查是否為移動指令
                is_movement = False
                for conn in location_data.get('connections', []):
                    if conn.get('path_description') in chosen_action_value:
                        ai_data = {
                            "story_description": f"你決定{chosen_action_value}，踏上了新的旅程。",
                            "options": ["繼續前進...", "觀察四周...", "稍作休息..."],
                            "atmosphere": "旅行",
                            "world_changes": {
                                "new_location_id": conn.get('target_location_id'),
                                "time_amount": conn.get('distance', 10),
                                "time_unit": "minutes"
                            }
                        }
                        is_movement = True
                        break
                
                # 如果不是移動，才呼叫 AI
                if not is_movement:
                    prompt = generate_prompt(player_data, world_data, location_data, action_dict)
                    ai_raw_response = ai_service.generate_narrative(prompt)
                    ai_content_str = ai_raw_response['choices'][0]['message']['content']
                    ai_data = json.loads(ai_content_str)

            # --- 後續處理流程不變 ---

            if not isinstance(ai_data, dict):
                raise TypeError(f"AI 或內部邏輯未產生有效的資料結構。")

            # 執行狀態更新
            world_changes = ai_data.get("world_changes")
            if world_changes and isinstance(world_changes, dict):
                transaction = db.transaction()
                update_game_state_in_transaction(transaction, player_id, world_changes)

            # 處理世界創造
            world_creations = ai_data.get("world_creations")
            if world_creations:
                new_npc_data = world_creations.get("new_npc")
                if new_npc_data and isinstance(new_npc_data, dict):
                    npc_id = new_npc_data.get("id")
                    if npc_id and not db.collection('npcs').document(npc_id).get().exists:
                        db.collection('npcs').document(npc_id).set(new_npc_data)
                        print(f"[GameService] AI 創造了新的 NPC: {new_npc_data.get('name')}")

        except Exception as e:
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

        # 獲取並回傳「更新後」的全新遊戲狀態
        next_gamestate = {
            "player": GameService.get_player_data(player_id),
            "world": GameService.get_world_state(),
            "narrative": {"description": ai_data.get("story_description"), "options": ai_data.get("options"), "atmosphere": ai_data.get("atmosphere")}
        }
        return {"status": "action_processed", "next_gamestate": next_gamestate}

game_service = GameService()
