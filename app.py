# 檔名: app.py
# 描述: 文字江湖遊戲後端 Flask 應用程式主檔案
# 版本: 1.2 - 整合知識更新與距離描述指令

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
        firebase_admin.initialize_app(cred, {
            'projectId': service_account_info.get('project_id'),
        })
    
    db = firestore.client()
    print("Firebase 初始化成功！")
except Exception as e:
    print(f"Firebase 初始化失敗: {e}")

# --- AI API 設定 ---
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

# --- 輔助函數：從 AI 回應中提取特定指令 ---
def extract_commands(text, command_name):
    """
    從一段文字中提取特定格式的指令區塊。
    例如：從 "你好 [CMD]data[/CMD] 世界" 中提取出 "data"。
    返回一個包含所有指令內容的列表和移除指令後乾淨的文字。
    """
    # 修正正則表達式，使其能正確匹配結束標籤
    pattern = re.compile(rf"\[{command_name}\](.*?)\[/{command_name}\]", re.DOTALL)
    matches = pattern.findall(text)
    cleaned_text = pattern.sub("", text)
    return [match.strip() for match in matches], cleaned_text

# --- Flask 路由設定 ---
@app.route('/')
def index():
    return "文字江湖遊戲後端 v1.2 已啟動！"

@app.route('/api/generate_turn', methods=['POST'])
def generate_turn():
    if not db:
        return jsonify({"error": "後端資料庫服務未初始化"}), 500

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "請求格式錯誤，需要 JSON 內容。"}), 400
            
        player_action = data.get('player_action')
        session_id = data.get('session_id', 'session_azhai_main')

        if not player_action:
            return jsonify({"error": "請求中未包含 'player_action'"}), 400

        game_state_ref = db.collection('game_sessions').document(session_id)
        game_state_doc = game_state_ref.get()
        
        if not game_state_doc.exists:
            return jsonify({"error": f"找不到遊戲存檔: {session_id}。請先執行初始化腳本。"}), 404
        
        current_world_state = game_state_doc.to_dict()

        # --- 進階 System Prompt v1.2 ---
        system_prompt = """
        你是文字RPG遊戲《文字江湖：黑風寨崛起》的遊戲管理員(GM)，一位才華橫溢、精通金庸武俠風格的專業敘事者。你的職責是根據玩家的選擇和遊戲的當前狀態，生成一個生動、真實且合乎邏輯的下一回合。

        你的所有回應，都必須嚴格遵守以下【四大核心指令】：

        ---
        ### 指令一：嚴格遵循輸出格式
        你的每一次回應都必須是一個完整的、未經刪減的文字區塊，且完全遵循【每回合格式排版規則 (standard_round_log_template.ml).ini】檔案中定義的結構。

        ---
        ### 指令二：深度沉浸於世界觀
        你的所有文字創作，從氛圍描述到角色對白，都必須符合【AI GM 指令 - 核心世界觀設定.txt】中定義的「金庸武俠」風格。

        ---
        ### 指令三：動態世界生成與數據化輸出 (核心指令)
        當劇情發展需要新的世界元素時，你被賦予【創造權力】。你必須在主敘述文字之外，使用【特殊指令標籤】來定義這些新元素。這是你與資料庫溝通的唯一方式。

        **創造規則：**
        1.  **時機**：僅在玩家探索到未知區域、遇到新人物，或劇情邏輯上必然會產生新事物時才進行創造。
        2.  **格式**：所有創造指令必須使用 `[COMMAND]{...}[/COMMAND]` 的格式，其中 `{...}` 必須是**嚴格的 JSON 格式**。
        3.  **指令範例**：
            * **創造 NPC：`[CREATE_NPC]`** `{...}`
            * **創造地點：`[CREATE_LOCATION]`** `{...}`
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

        ---
        ### 指令四：基於上下文進行邏輯推演
        你收到的 `user_prompt` 會包含【當前世界摘要】。你必須基於這份摘要和玩家的最新選擇來進行推演。
        - **連貫性**：確保你的回應與上一回合的【核心處境】和事件結尾緊密相連。
        - **距離感描述**: 在你的主敘述中，當描述玩家視野內的 NPC 或設施時，必須用括號 `()` 附上一個符合場景的、估算的大約距離，以公尺(m)為單位。例如：「【秦嵐】正在你面前的藥爐旁忙碌著(約3m)。遠處，【疤臉劉】的身影出現在訓練場的另一頭(約50m)。」
        - **NPC 行為**與**資源與技能**的判定必須符合邏輯。
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

        # --- [核心] 解析並執行指令 ---
        cleaned_narrative = next_turn_narrative_raw
        
        npc_commands, cleaned_narrative = extract_commands(cleaned_narrative, "CREATE_NPC")
        loc_commands, cleaned_narrative = extract_commands(cleaned_narrative, "CREATE_LOCATION")
        knowledge_commands, cleaned_narrative = extract_commands(cleaned_narrative, "UPDATE_KNOWLEDGE")

        @firestore.transactional
        def update_in_transaction(transaction, game_ref):
            updates = {}
            for cmd_str in npc_commands:
                try:
                    cmd_data = json.loads(cmd_str)
                    entity_id = cmd_data.get('id')
                    if entity_id: updates[f'npcs.{entity_id}'] = cmd_data
                except json.JSONDecodeError as e: print(f"警告：解析CREATE_NPC失敗 - {e}")

            for cmd_str in loc_commands:
                try:
                    cmd_data = json.loads(cmd_str)
                    entity_id = cmd_data.get('id')
                    if entity_id: updates[f'locations.{entity_id}'] = cmd_data
                except json.JSONDecodeError as e: print(f"警告：解析CREATE_LOCATION失敗 - {e}")
            
            for cmd_str in knowledge_commands:
                try:
                    cmd_data = json.loads(cmd_str)
                    if cmd_data.get('target_type') == 'location':
                        field_path = f"locations.{cmd_data['target_id']}.{cmd_data['field_to_unlock']}.is_known"
                        updates[field_path] = True
                except json.JSONDecodeError as e: print(f"警告：解析UPDATE_KNOWLEDGE失敗 - {e}")

            # 更新回合數等元數據
            new_round = current_world_state.get("metadata", {}).get("round", 0) + 1
            updates['metadata.round'] = new_round
            updates['narrative_log'] = firestore.ArrayUnion([f"回合 {new_round}: {player_action['text']}"])

            transaction.update(game_ref, updates)

        transaction = db.transaction()
        update_in_transaction(transaction, game_state_ref)
        
        print(f"已成功處理第 {current_world_state.get('metadata', {}).get('round', 0) + 1} 回合。")

        return jsonify({"narrative": cleaned_narrative.strip()})

    except Exception as e:
        print(f"伺服器內部錯誤: {e}")
        return jsonify({"error": f"伺服器發生未預期的內部錯誤: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
