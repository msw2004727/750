# 檔名: setup_firestore.py
# 版本: 2.0 - 極簡化初始結構
# 描述: 根據「玩家創造世界」的核心理念，此腳本僅用於建立一個乾淨、空的資料庫基礎結構。
#      它只會建立 `definitions` 集合，用於存放未來由 AI 動態生成的遊戲核心定義，
#      而不會創建任何預設的遊戲存檔、場景或 NPC。

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
        # 從 Render 的環境變數中讀取 JSON 格式的服務帳號金鑰
        firebase_creds_str = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
        if not firebase_creds_str:
            raise ValueError("錯誤：環境變數 'FIREBASE_SERVICE_ACCOUNT_KEY' 未設定！請在 Render.com 的後台設定。")
        
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
    建立遊戲所需的最基礎、空的集合與文件結構。
    這就像是為圖書館準備好空的書架，等待 AI 和玩家來填滿書籍。
    """
    if not db:
        print("資料庫客戶端無效，無法執行設定。")
        return

    print("開始建立空的資料庫基礎結構...")

    # --- 建立靜態定義集合 (definitions) ---
    # 這個集合將用來存放由 AI 在遊戲過程中動態創造的「世界規則」。
    # 例如，當 AI 第一次創造出「九陽神功」時，可以將其詳細定義儲存在這裡，以供後續參考。
    print("正在建立 'definitions' 集合...")
    definitions_collection = db.collection('definitions')

    # 建立幾個空的「分類」文件作為書架的標示，裡面沒有任何內容。
    definition_categories = {
        "skills": "存放所有被創造出來的武功技能。",
        "items": "存放所有被創造出來的物品與裝備。",
        "events": "存放所有被創造出來的隨機事件模板。",
        "lore": "存放所有被創造出來的世界觀與傳說故事。",
        "locations": "存放所有被創造出來的地點模板。",
        "npcs": "存放所有被創造出來的 NPC 模板。"
    }

    for doc_name, description in definition_categories.items():
        doc_ref = definitions_collection.document(doc_name)
        if not doc_ref.get().exists:
            doc_ref.set({"description": description, "entries": {}})
            print(f"  - 空的分類 '{doc_name}' 已建立。")
        else:
            print(f"  - 分類 '{doc_name}' 已存在，跳過。")
            
    print("\n資料庫基礎結構初始化完成！")
    print("現在，您的江湖是一張白紙，等待著第一位玩家的筆觸。")

if __name__ == "__main__":
    firestore_client = initialize_firestore()
    if firestore_client:
        setup_database_structure(firestore_client)
