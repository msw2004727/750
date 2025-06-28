# 檔名: app.py
# 描述: 文字江湖遊戲後端 Flask 應用程式主檔案 (整合 Firebase 讀寫)

import os
import json
import re # 引入正則表達式模組
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

# --- 初始化 Flask 應用 ---
app = Flask(__name__)
CORS(app)

# --- 初始化 Firebase Admin SDK ---
try:
    firebase_creds_str = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
    if not firebase_creds_str:
        raise ValueError("Firebase 服務帳號金鑰未在環境變數中設定！")
    
    service_account_info = json.loads(firebase_creds_str)
    cred = credentials.Certificate(service_account_info)
    firebase_admin.initialize_app(cred, {
        'projectId': service_account_info.get('project_id'),
    })
    db = firestore.client()
    print("Firebase 初始化成功！")
except Exception as e:
    print(f"Firebase 初始化失敗: {e}")
    db = None

# --- AI API 設定 ---
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

# --- 輔助函數：從 AI 回應中解析出結構化數據 ---
def parse_ai_narrative(text):
    """
    一個簡化的解析器，用於從 AI 回應中提取關鍵資訊。
    這部分未來可以做得更複雜、更精確。
    """
    parsed_data = {}
    
    # 解析回合數
    round_match = re.search(r"🎲\s*回合：(\d+)", text)
    if round_match:
        parsed_data['round'] = int(round_match.group(1))

    # 解析狀態速覽 (範例)
    hp_match = re.search(r"❤️\s*HP:\s*([\d\.]+/[\d\.]+)", text)
    if hp_match:
        current, max_val = hp_match.group(1).split('/')
        parsed_data['pc_hp'] = {"current": float(current), "max": float(max_val)}
        
    # 在這裡可以繼續添加對 PC技能成長、評價變化 等區塊的解析邏輯...
    # ...
    
    return parsed_data


# --- Flask 路由設定 ---

@app.route('/')
def index():
    return "文字江湖遊戲後端已啟動！(已整合資料庫邏輯)"

@app.route('/api/generate_turn', methods=['POST'])
def generate_turn():
    if not db:
        return jsonify({"error": "資料庫服務未初始化，無法處理請求。"}), 500

    try:
        data = request.get_json()
        player_action = data.get('player_action')
        session_id = data.get('session_id', 'session_azhai_main') # 預設一個主存檔

        if not player_action:
            return jsonify({"error": "請求中未包含 'player_action'"}), 400

        # 1. 從 Firebase 讀取當前的遊戲世界狀態
        game_state_ref = db.collection('game_sessions').document(session_id)
        game_state_doc = game_state_ref.get()
        
        if game_state_doc.exists:
            current_world_state = game_state_doc.to_dict()
        else:
            # 如果是第一次玩，創建一個初始的世界狀態
            # 這裡可以從您的靜態設定檔初始化一個更完整的初始世界
            current_world_state = {
                "metadata": {"round": 0, "game_timestamp": "第一天 辰時"},
                "pc_data": {"basic_info": {"name": "阿宅"}},
                "narrative_log": ["你睜開雙眼，發現自己身處於陰暗而陌生的巷弄之中。"],
            }

        # 2. 建立 AI 提示 (Prompt)
        # 為了讓 AI 的回應更具連續性，我們將最近的幾條敘述加入提示
        recent_log = "\n".join(current_world_state.get("narrative_log", [])[-5:])
        
        system_prompt = "你是文字RPG遊戲《文字江湖：黑風寨崛起》的遊戲管理員(Game Master)...(省略，與之前版本相同)"
        user_prompt = f"這是遊戲的最近進展：\n---\n{recent_log}\n---\n玩家選擇的行動是：'{player_action['text']}'。\n\n請根據這個行動，生成下一回合的完整遊戲內容。"

        # 3. 呼叫 DeepSeek AI (與之前版本相同)
        api_key = os.environ.get('DEEPSEEK_API_KEY')
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
        }
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
        ai_response_data = response.json()
        next_turn_narrative = ai_response_data['choices'][0]['message']['content']

        # 4. 解析 AI 回應並準備更新資料庫
        parsed_changes = parse_ai_narrative(next_turn_narrative)
        current_round = current_world_state.get("metadata", {}).get("round", 0) + 1

        # 5. 更新 Firestore 資料
        # 使用一個 transaction 來確保資料寫入的原子性
        @firestore.transactional
        def update_in_transaction(transaction, game_ref, turn_log_ref):
            # 準備回合日誌數據
            turn_log_data = {
                'round': current_round,
                'timestamp_server': firestore.SERVER_TIMESTAMP,
                'timestamp_game': parsed_changes.get('timestamp', f"第 {current_round} 回合"),
                'player_action': player_action,
                'ai_narrative': next_turn_narrative,
                'changes': parsed_changes # 儲存從AI回應中解析出的數據變化
            }
            transaction.set(turn_log_ref, turn_log_data)

            # 準備更新主世界狀態
            # 這裡只更新範例數據，實際應根據 parsed_changes 更新所有相關欄位
            transaction.update(game_ref, {
                'metadata.round': current_round,
                'metadata.game_timestamp': parsed_changes.get('timestamp', f"第 {current_round} 回合"),
                'pc_data.core_status.hp': parsed_changes.get('pc_hp', current_world_state.get('pc_data',{}).get('core_status',{}).get('hp')),
                'narrative_log': firestore.ArrayUnion([f"回合 {current_round}: {player_action['text']}"])
            })

        transaction = db.transaction()
        turn_log_document_ref = game_state_ref.collection('turn_logs').document(f'turn_{current_round:05d}')
        update_in_transaction(transaction, game_state_ref, turn_log_document_ref)

        print(f"已成功記錄第 {current_round} 回合的日誌。")

        # 6. 將 AI 生成的下一回合內容返回給前端
        return jsonify({"narrative": next_turn_narrative})

    except Exception as e:
        print(f"伺服器內部錯誤: {e}")
        return jsonify({"error": f"伺服器發生未預期的內部錯誤: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
