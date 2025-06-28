# 檔名: setup_firestore.py
# 描述: 用於在 Render Shell 中一鍵初始化 Firestore 資料庫結構的腳本。

import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

def initialize_firestore():
    """
    從環境變數讀取金鑰並初始化 Firebase Admin SDK。
    返回一個 Firestore 客戶端物件。
    """
    try:
        firebase_creds_str = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
        if not firebase_creds_str:
            raise ValueError("錯誤：環境變數 'FIREBASE_SERVICE_ACCOUNT_KEY' 未設定！")
        
        service_account_info = json.loads(firebase_creds_str)
        cred = credentials.Certificate(service_account_info)

        # 檢查是否已有 Firebase 實例，若無則初始化
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {
                'projectId': service_account_info.get('project_id'),
            })
        
        print("Firebase 連接成功！")
        return firestore.client()
    except Exception as e:
        print(f"Firebase 初始化失敗: {e}")
        return None

def setup_database_structure(db):
    """
    建立遊戲所需的核心資料庫集合與文件結構。
    """
    if not db:
        print("資料庫客戶端無效，無法執行設定。")
        return

    print("開始建立資料庫結構...")

    # --- 1. 建立靜態定義集合 (definitions) ---
    print("正在建立 'definitions' 集合...")
    definitions_collection = db.collection('definitions')

    # 建立幾個空的佔位符文件
    static_docs = {
        "skills": {"description": "存放所有技能的詳細定義。"},
        "items": {"description": "存放所有物品與裝備的詳細定義。"},
        "events": {"description": "存放所有隨機事件的模板。"},
        "lore": {"description": "存放所有世界觀與傳說故事。"}
    }

    for doc_name, data in static_docs.items():
        doc_ref = definitions_collection.document(doc_name)
        if not doc_ref.get().exists:
            doc_ref.set(data)
            print(f"  - 文件 '{doc_name}' 已建立。")
        else:
            print(f"  - 文件 '{doc_name}' 已存在，跳過。")

    # --- 2. 建立主遊戲存檔 (game_sessions) ---
    print("\n正在建立 'game_sessions' 集合與初始存檔...")
    game_sessions_collection = db.collection('game_sessions')
    main_session_ref = game_sessions_collection.document('session_azhai_main')

    if main_session_ref.get().exists:
        print("主遊戲存檔 'session_azhai_main' 已存在，將不會覆蓋。如需重置，請先手動刪除。")
    else:
        # 建立一個符合您設計的、詳細的初始世界狀態
        initial_world_state = {
            "metadata": {
                "backup_id": "initial_setup",
                "game_timestamp": "第一天 辰時",
                "round": 0,
            },
            "pc_data": {
                "basic_info": {
                    "name": "阿宅",
                    "background_summary": "意外穿越至此的異鄉人，一切都充滿未知。",
                },
                "core_status": {
                    "hp": {"current": 100, "max": 100},
                    "mp": {"current": 50, "max": 50},
                    "sta": {"current": 100, "max": 100},
                    "san": {"current": 100, "max": 100},
                    "hunger": {"current": 20, "max": 100},
                    "thirst": {"current": 20, "max": 100},
                    "fatigue": {"current": 0, "max": 100}
                },
                "skills": [],
                "inventory": {"carried": [], "stashed": []},
                "reputation_and_alignment": {
                    "morality_alignment": {"value": 0.0, "level": "中立"},
                    "jianghu_fame": {"value": 0.0, "level": "默默無聞"},
                    "faction_standing": []
                },
            },
            "npcs": {
                # 初始可以為空，或加入幾個關鍵NPC的初始狀態
                "npc_qin_lan_01": {"name": "秦嵐", "current_location_id": "BWF_Infirmary_Temp_01", "mood": "擔憂"}
            },
            "fortress_state": {
                "name": "黑風寨",
                "population": {"total_estimated": 1}, # 只有玩家自己
                "resources": {
                    "food_grain": {"quantity": 10, "unit": "份"},
                    "wood_dry": {"quantity": 5, "unit": "捆"}
                },
                "morale": {"level": "中立", "value": 50}
            },
            "world": {
                "current_round": 0,
                "in_game_time": "第一天 辰時",
                "weather_and_environment": "天氣晴朗，山風和煦。"
            },
            "tracking": {
                "active_clues": [],
                "active_rumors": []
            },
            # 根據您的需求，繼續添加其他22個分類的初始空狀態...
        }
        
        main_session_ref.set(initial_world_state)
        print("  - 主遊戲存檔 'session_azhai_main' 已成功建立！")

        # 同時建立一個空的 turn_logs 子集合
        initial_turn_log_ref = main_session_ref.collection('turn_logs').document('turn_00000_init')
        initial_turn_log_ref.set({
            "round": 0,
            "event": "遊戲世界初始化"
        })
        print("  - 'turn_logs' 子集合已初始化。")

    print("\n資料庫結構初始化完成！")

if __name__ == "__main__":
    firestore_client = initialize_firestore()
    if firestore_client:
        setup_database_structure(firestore_client)
