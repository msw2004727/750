# backend/app/services/game_service.py
import json
import traceback
from app.core.firebase_config import db
from app.models.action import PlayerAction
from app.services.ai_service import ai_service
from app.services.prompt_generator import generate_prompt
# 從 state_manager 導入存檔函式
from app.services.state_manager import update_game_state_in_transaction

class GameService:
    @staticmethod
    def get_player_data(player_id: str):
        # (此函式保持不變，用於讀取並組合前端所需的資料)
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

        chosen_action_value = action.model_dump().get('value', '')
        ai_data_override = None
        for conn in location_data.get('connections', []):
            if conn.get('path_description') in chosen_action_value:
                ai_data_override = {
                    "world_changes": {
                        "new_location_id": conn.get('target_location_id'),
                        "time_amount": conn.get('distance', 10),
                        "time_unit": "minutes"
                    }
                }
                print(f"[GameService] 偵測到移動指令，目標: {conn.get('target_location_id')}")
                break
        
        try:
            if ai_data_override:
                ai_data = {
                    "story_description": f"你決定{chosen_action_value}，踏上了新的旅程。",
                    "options": ["繼續前進...", "觀察四周...", "稍作休息..."],
                    "atmosphere": "旅行",
                    "world_changes": ai_data_override["world_changes"],
                    "world_creations": None
                }
            else:
                prompt = generate_prompt(player_data, world_data, location_data, action.model_dump())
                ai_raw_response = ai_service.generate_narrative(prompt)
                ai_content_str = ai_raw_response['choices'][0]['message']['content']
                ai_data = json.loads(ai_content_str)
            
            # --- (新) 安全檢查 ---
            # 檢查 AI 回傳的資料在解析後，是否為我們預期的字典格式
            if not isinstance(ai_data, dict):
                # 如果不是，就主動拋出一個我們自訂的錯誤
                raise TypeError(f"AI 未回傳有效的 JSON 物件。收到的內容: '{str(ai_data)[:100]}...'")

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

        except json.JSONDecodeError:
             # AI 回傳的不是有效的 JSON 字串
            return {"status": "error", "message": "AI 回應格式錯誤，無法解析。"}
        except Exception as e:
            traceback.print_exc()
            # 將其他所有錯誤（包含我們自訂的 TypeError）都回傳給前端
            return {"status": "error", "message": str(e)}

        # 獲取並回傳「更新後」的全新遊戲狀態
        next_gamestate = {
            "player": GameService.get_player_data(player_id),
            "world": GameService.get_world_state(),
            "narrative": {"description": ai_data.get("story_description"), "options": ai_data.get("options"), "atmosphere": ai_data.get("atmosphere")}
        }
        return {"status": "action_processed", "next_gamestate": next_gamestate}

game_service = GameService()
