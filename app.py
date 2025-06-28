# 檔名: app.py
# 版本: 1.2

import os
import json
import re
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- 初始化 (與之前版本相同) ---
app = Flask(__name__)
CORS(app)
db = None
try:
    firebase_creds_str = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
    if not firebase_creds_str: raise ValueError("Firebase 金鑰未設定！")
    service_account_info = json.loads(firebase_creds_str)
    cred = credentials.Certificate(service_account_info)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred, {'projectId': service_account_info.get('project_id')})
    db = firestore.client()
    print("Firebase 初始化成功！")
except Exception as e:
    print(f"Firebase 初始化失敗: {e}")

DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

# --- 輔助函數 ---
def extract_commands(text, command_name):
    pattern = re.compile(rf"\[{command_name}\](.*?)\[/{command_name}\]", re.DOTALL)
    matches = pattern.findall(text)
    cleaned_text = pattern.sub("", text)
    return [match.strip() for match in matches], cleaned_text

# --- 路由 ---
@app.route('/')
def index():
    return "文字江湖遊戲後端 v1.2 已啟動！"

@app.route('/api/generate_turn', methods=['POST'])
def generate_turn():
    if not db: return jsonify({"error": "資料庫服務未初始化"}), 500

    try:
        data = request.get_json()
        player_action = data.get('player_action')
        session_id = data.get('session_id', 'session_azhai_main')
        if not player_action: return jsonify({"error": "無玩家行動"}), 400

        game_state_ref = db.collection('game_sessions').document(session_id)
        current_world_state = game_state_ref.get().to_dict()
        if not current_world_state: return jsonify({"error": "找不到存檔"}), 404

        # --- 進階 System Prompt v1.2 ---
        system_prompt = """
        你是文字RPG遊戲《文字江湖：黑風寨崛起》的遊戲管理員(GM)...（省略大部分，加入新指令）

        ### 指令三：動態世界生成與數據化輸出 (核心指令)
        ...（與之前版本相同）...
        * **更新知識：`[UPDATE_KNOWLEDGE]`**
            ```json
            [UPDATE_KNOWLEDGE]
            {
              "target_type": "location", 
              "target_id": "black_wind_fortress",
              "field_to_unlock": "population"
            }
            [/UPDATE_KNOWLEDGE]
            ```

        ### 指令四：基於上下文進行邏輯推演
        ...（與之前版本相同）...
        - **距離感描述**: 在你的主敘述中，當描述玩家視野內的 NPC 或設施時，必須用括號 `()` 附上一個符合場景的、估算的大約距離，以公尺(m)為單位。例如：「【秦嵐】正在你面前的藥爐旁忙碌著(約3m)。遠處，【疤臉劉】的身影出現在訓練場的另一頭(約50m)。」
        """
        
        # --- 生成 User Prompt (與之前版本相同) ---
        world_summary = f"當前世界摘要：..." # 省略
        user_prompt = f"{world_summary}\n\n玩家選擇的行動是：'{player_action['text']}'。\n\n請生成下一回合的完整內容。"

        # --- 呼叫 AI (與之前版本相同) ---
        api_key = os.environ.get('DEEPSEEK_API_KEY')
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {"model": "deepseek-chat", "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]}
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
        ai_response_data = response.json()
        next_turn_narrative_raw = ai_response_data['choices'][0]['message']['content']

        # --- [核心] 解析並執行指令 ---
        cleaned_narrative = next_turn_narrative_raw
        
        # 提取並處理 CREATE_NPC 指令
        npc_commands, cleaned_narrative = extract_commands(cleaned_narrative, "CREATE_NPC")
        
        # 提取並處理 CREATE_LOCATION 指令
        loc_commands, cleaned_narrative = extract_commands(cleaned_narrative, "CREATE_LOCATION")
        
        # 提取並處理 UPDATE_KNOWLEDGE 指令
        knowledge_commands, cleaned_narrative = extract_commands(cleaned_narrative, "UPDATE_KNOWLEDGE")

        @firestore.transactional
        def update_in_transaction(transaction, game_ref):
            # 執行所有解析出的指令
            for cmd_str in npc_commands:
                cmd_data = json.loads(cmd_str)
                entity_id = cmd_data.get('id')
                if entity_id: transaction.update(game_ref, {f'npcs.{entity_id}': cmd_data})
            
            for cmd_str in loc_commands:
                cmd_data = json.loads(cmd_str)
                entity_id = cmd_data.get('id')
                if entity_id: transaction.update(game_ref, {f'locations.{entity_id}': cmd_data})

            for cmd_str in knowledge_commands:
                cmd_data = json.loads(cmd_str)
                if cmd_data.get('target_type') == 'location':
                    field_path = f"locations.{cmd_data['target_id']}.{cmd_data['field_to_unlock']}.is_known"
                    transaction.update(game_ref, {field_path: True})

            # 更新回合數等元數據
            new_round = current_world_state.get("metadata", {}).get("round", 0) + 1
            transaction.update(game_ref, {'metadata.round': new_round})
            
        transaction = db.transaction()
        update_in_transaction(transaction, game_state_ref)

        return jsonify({"narrative": cleaned_narrative.strip()})

    except Exception as e:
        print(f"伺服器內部錯誤: {e}")
        return jsonify({"error": f"伺服器發生未預期的內部錯誤: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
