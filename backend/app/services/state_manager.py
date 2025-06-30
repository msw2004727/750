# backend/app/services/state_manager.py
import datetime
from app.core.firebase_config import db
from google.cloud.firestore_v1.transaction import Transaction, transactional
from google.cloud import firestore

@transactional
def update_game_state_in_transaction(transaction: Transaction, player_id: str, world_changes: dict):
    """
    在一個資料庫事務中，安全地更新所有遊戲狀態。
    這個函式是所有遊戲進度存檔的核心。
    """
    player_ref = db.collection('players').document(player_id)
    world_ref = db.collection('worlds').document('main_world')
    inventory_ref = player_ref.collection('inventory')

    # --- (新) 步驟 1: 執行所有讀取操作 ---
    
    # 讀取世界時間 (如果需要更新)
    time_amount = world_changes.get("time_amount", 0)
    world_snapshot = world_ref.get(transaction=transaction) if time_amount > 0 else None

    # 讀取所有即將被添加的物品的當前狀態
    items_added = world_changes.get("items_added", [])
    items_to_add_docs = {}
    if items_added:
        item_refs_to_get = [inventory_ref.document(item.get("item_id")) for item in items_added if item.get("item_id")]
        if item_refs_to_get:
            # 一次性讀取所有相關物品文件
            item_snapshots = db.get_all(item_refs_to_get, transaction=transaction)
            for snapshot in item_snapshots:
                items_to_add_docs[snapshot.id] = snapshot

    # --- 步驟 2: 根據讀取到的資料，執行所有寫入操作 ---

    # 1. 更新世界時間
    if world_snapshot:
        time_unit = world_changes.get("time_unit", "minutes")
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
        status_updates = {f'status.{key}': firestore.Increment(value) for key, value in status_changes.items() if value != 0}
        if status_updates:
            transaction.update(player_ref, status_updates)
            
    # 4. 更新玩家物品欄 - 移除物品
    items_removed = world_changes.get("items_removed", [])
    if items_removed:
        for item in items_removed:
            item_id = item.get("item_id")
            quantity_to_remove = item.get("quantity", 1)
            if not item_id: continue
            
            item_doc_ref = inventory_ref.document(item_id)
            transaction.update(item_doc_ref, {'quantity': firestore.Increment(-quantity_to_remove)})

    # 5. 更新玩家物品欄 - 新增物品
    if items_added:
        for item in items_added:
            item_id = item.get("item_id")
            quantity_to_add = item.get("quantity", 1)
            if not item_id: continue

            item_doc_ref = inventory_ref.document(item_id)
            # 使用先前讀取到的快照來判斷
            item_doc = items_to_add_docs.get(item_id)

            if item_doc and item_doc.exists:
                transaction.update(item_doc_ref, {'quantity': firestore.Increment(quantity_to_add)})
            else:
                transaction.set(item_doc_ref, {
                    'quantity': quantity_to_add,
                    'identified': False # 新獲得的物品預設為未鑑定
                })
