# backend/app/services/game_service.py
import json
import datetime
from app.core.firebase_config import db
from app.models.action import PlayerAction
from app.services.ai_service import ai_service
from app.services.prompt_generator import generate_prompt
from google.cloud.firestore_v1.base_query import FieldFilter
# 修正了 'transactional' 的導入路徑
from google.cloud.firestore_v1.transaction import Transaction, transactional 
from google.cloud import firestore # 確保導入 firestore 以便使用 Increment

# --- Transactional Update Function ---
@transactional
def _update_game_state_in_transaction(transaction: Transaction, player_id: str, world_changes: dict):
    """
    在一個資料庫事務中，安全地更新所有遊戲狀態。
    """
    player_ref = db.collection('players').document(player_id)
    world_ref = db.collection('worlds').document('main_world')

    # 1. 更新世界時間
    time_unit = world_changes.get("time_unit", "minutes")
    time_amount = world_changes.get("time_amount", 0)
    if time_amount > 0:
        world_snapshot = world_ref.get(transaction=transaction)
        current_time = world_snapshot.to_dict().get('currentTime')
        if isinstance(current_time, datetime.datetime):
            delta = datetime.timedelta(minutes=time_amount) if time_unit == "minutes" else datetime.timedelta(hours=time_amount)
            new_time = current_time + delta
            transaction.update(world_ref, {'currentTime': new_time})

    # 2. 更新玩家位置
    new_location_id = world_changes.get("new_location_id")
    if new_location_id:
        transaction.update(player_ref, {'location': new_location_id})

    # 3. 更新玩家狀態 (health, hunger, etc.)
    status_changes = world_changes.get("status_changes")
    if status_changes and isinstance(status_changes, dict):
        status_updates = {f'status.{key}': firestore.Increment(value) for key, value in status_changes.items()}
        if status_updates:
            transaction.update(player_ref, status_updates)
            
    # 4. 更新玩家物品欄 - 移除物品
    items_removed = world_changes.get("items_removed", [])
    if items_removed:
        inventory_ref = player_ref.collection('inventory')
        for item in items_removed:
            item_id = item.get("item_id")
            quantity_to_remove = item.get("quantity", 1)
            if not item_id: continue
            
            item_doc_ref = inventory_ref.document(item_id)
            transaction.update(item_doc_ref, {'quantity': firestore.Increment(-quantity_to_remove)})

    # 5. 更新玩家物品欄 - 新增物品
    items_added = world_changes.get("items_added", [])
    if items_added:
        inventory_ref = player_ref.collection('inventory')
        for item in items_added:
            item_id = item.get("item_id")
            quantity_to_add = item.get("quantity", 1)
            if not item_id: continue

            item_doc_ref = inventory_ref.document(item_id)
            item_doc = item_doc_ref.get(transaction=transaction)

            if item_doc.exists:
                transaction.update(item_doc_ref, {'quantity': firestore.Increment(quantity_to_add)})
            else:
                transaction.set(item_doc_ref, {
                    'quantity': quantity_to_add,
                    'identified': False
                })

# --- Main Game Service Class ---
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

        world_changes = ai_data.get("world_changes")
        if world_changes and isinstance(world_changes, dict):
            transaction = db.transaction()
            _update_game_state_in_transaction(transaction, player_id, world_changes)

        world_creations = ai_data.get("world_creations")
        if world_creations:
            new_npc_data = world_creations.get("new_npc")
            if new_npc_data and isinstance(new_npc_data, dict):
                npc_id = new_npc_data.get("id")
                if npc_id and not db.collection('npcs').document(npc_id).get().exists:
                    db.collection('npcs').document(npc_id).set(new_npc_data)
                    print(f"[GameService] AI 創造了新的 NPC: {new_npc_data.get('name')}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

    next_gamestate = {
        "player": GameService.get_player_data(player_id),
        "world": GameService.get_world_state(),
        "narrative": {"description": ai_data.get("story_description"), "options": ai_data.get("options"), "atmosphere": ai_data.get("atmosphere")}
    }
    return {"status": "action_processed", "next_gamestate": next_gamestate}

game_service = GameService()
