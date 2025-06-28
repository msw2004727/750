# 檔名: app.py
# 描述: 文字江湖遊戲後端 Flask 應用程式主檔案
# 版本: 1.3 - 整合 AI 指令解析器與資料庫寫入邏輯

import os
import json
import re
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- 初始化 Flask 應用 ---
app = Flask(__name__)
CORS(app)

# --- 初始化 Firebase Admin SDK ---
db = None
try:
    firebase_creds_str = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
    if not firebase_creds_str:
        raise ValueError("錯誤：環境變數 'FIREBASE_SERVICE_ACCOUNT_KEY' 未設定！")
    
    service_account_info = json.loads(firebase_creds_str)
    cred = credentials.Certificate(service_account_info)

    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred, {'projectId': service_account_info.get('project_id')})
    
    db = firestore.client()
    print("Firebase 初始化成功！")
except Exception as e:
    print(f"Firebase 初始化失敗: {e}")

# --- AI API 設定 ---
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

# --- [核心] AI 回應解析與指令處理函數 ---
def process_ai_response(raw_text):
    """
    解析 AI 的完整回應，提取所有指令，並返回一個乾淨的敘述文本和一個資料庫更新字典。
    """
    updates = {}
    cleaned_text = raw_text

    # 定義所有需要尋找的指令標籤
    command_tags = ["CREATE_NPC", "CREATE_LOCATION", "UPDATE_KNOWLEDGE"]

    for tag in command_tags:
        # 使用正則表達式查找所有符合的指令區塊
        pattern = re.compile(rf"\[{tag}\](.*?)\[/{tag}\]", re.DOTALL)
        matches = pattern.findall(cleaned_text)
        
        for json_str in matches:
            try:
                # 解析指令中的 JSON 數據
                data = json.loads(json_str.strip())
                entity_id = data.get('id')

                if tag == "CREATE_NPC" and entity_id:
                    # 準備在 'npcs' map 中新增或覆蓋一個 NPC
                    updates[f'npcs.{entity_id}'] = data
                    print(f"解析到指令：建立 NPC '{entity_id}'")

                elif tag == "CREATE_LOCATION" and entity_id:
                    # 準備在 'locations' map 中新增或覆蓋一個地點
                    updates[f'locations.{entity_id}'] = data
                    print(f"解析到指令：建立地點 '{entity_id}'")

                elif tag == "UPDATE_KNOWLEDGE":
                    # 準備更新一個欄位的 is_known 狀態
                    target_type = data.get('target_type')
                    target_id = data.get('target_id')
                    field_to_unlock = data.get('field_to_unlock')
                    if target_type == 'location' and target_id and field_to_unlock:
                        field_path = f"locations.{target_id}.{field_to_unlock}.is_known"
                        updates[field_path] = True
                        print(f"解析到指令：解鎖知識 '{field_path}'")
                
            except json.JSONDecodeError as e:
                print(f"警告：解析AI指令 [{tag}] 失敗，內容格式錯誤: {e}\n內容: {json_str}")
            except Exception as e:
                print(f"警告：處理指令 [{tag}] 時發生未知錯誤: {e}")

        # 從原始文本中移除已處理的指令標籤
        cleaned_text = pattern.sub("", cleaned_text)

    return cleaned_text.strip(), updates

# --- Flask 路由設定 ---
@app.route('/')
def index():
    return "文字江湖遊戲後端 v1.3 已啟動！(含指令解析器)"

@app.route('/api/generate_turn', methods=['POST'])
def generate_turn():
    if not db:
        return jsonify({"error": "資料庫服務未初始化"}), 500

    try:
        data = request.get_json()
        player_action = data.get('player_action')
        session_id = data.get('session_id', 'session_azhai_main')
        if not player_action: return jsonify({"error": "無玩家行動"}), 400

        game_state_ref = db.collection('game_sessions').document(session_id)
        current_world_state = game_state_ref.get().to_dict()
        if not current_world_state: return jsonify({"error": "找不到存檔"}), 404

        # --- 進階 System Prompt v1.2 (與前一版相同) ---
        system_prompt = """
        你是文字RPG遊戲《文字江湖：黑風寨崛起》的遊戲管理員(GM)...（省略，內容與上一版相同）
        """
        
        # --- 生成 User Prompt ---
        world_summary = f"""
        當前世界摘要：
        - 回合: {current_world_state.get('metadata', {}).get('round', 0)}
        - 時間: {current_world_state.get('world', {}).get('in_game_time', '未知')}
        - 玩家位置: {current_world_state.get('world', {}).get('player_current_location_name', '未知')}
        - 最近的劇情日誌：{" ".join(current_world_state.get("narrative_log", [])[-3:])}
        """
        user_prompt = f"{world_summary}\n\n玩家選擇的行動是：'{player_action['text']}'。\n\n請生成下一回合的完整內容。"

        # --- 呼叫 AI ---
        api_key = os.environ.get('DEEPSEEK_API_KEY')
        if not api_key: return jsonify({"error": "DeepSeek API Key 未設定。"}), 500
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {"model": "deepseek-chat", "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]}
        
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
        
        ai_response_data = response.json()
        next_turn_narrative_raw = ai_response_data['choices'][0]['message']['content']

        # [核心升級] 1. 解析 AI 回應
        cleaned_narrative, db_updates = process_ai_response(next_turn_narrative_raw)

        # [核心升級] 2. 更新資料庫
        new_round = current_world_state.get("metadata", {}).get("round", 0) + 1
        db_updates['metadata.round'] = new_round
        db_updates['narrative_log'] = firestore.ArrayUnion([f"回合 {new_round}: {player_action['text']}"])
        
        # 使用 transaction 來確保所有更新操作的原子性
        @firestore.transactional
        def update_in_transaction(transaction, game_ref, updates):
            transaction.update(game_ref, updates)

        transaction = db.transaction()
        update_in_transaction(transaction, game_state_ref, db_updates)
        
        print(f"已成功處理第 {new_round} 回合。資料庫已更新。")

        # 3. 將清理後的敘述返回給前端
        return jsonify({"narrative": cleaned_narrative})

    except Exception as e:
        print(f"伺服器內部錯誤: {e}")
        return jsonify({"error": f"伺服器發生未預期的內部錯誤: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
