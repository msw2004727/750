# 檔名: app.py
# 描述: 文字江湖遊戲後端 Flask 應用程式主檔案
# 版本: 1.4 - 整合知識解鎖與動態實體更新邏輯

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

# --- [核心] AI 回應解析與指令處理函數 v1.4 ---
def process_ai_response(raw_text):
    """
    解析 AI 的完整回應，提取所有指令，並返回一個乾淨的敘述文本和一個資料庫更新字典。
    """
    updates = {}
    cleaned_text = raw_text

    # 定義所有需要尋找的指令標籤
    command_tags = ["CREATE_NPC", "CREATE_LOCATION", "UPDATE_ENTITY"]

    for tag in command_tags:
        # 使用正則表達式查找所有符合的指令區塊
        pattern = re.compile(rf"\[{tag}\](.*?)\[/{tag}\]", re.DOTALL)
        matches = pattern.findall(cleaned_text)
        
        for json_str in matches:
            try:
                # 解析指令中的 JSON 數據
                data = json.loads(json_str.strip())
                
                if tag in ["CREATE_NPC", "CREATE_LOCATION"]:
                    entity_type = "npcs" if tag == "CREATE_NPC" else "locations"
                    entity_id = data.get('id')
                    if entity_id:
                        # 準備在 'npcs' 或 'locations' map 中新增或覆蓋一個實體
                        updates[f'{entity_type}.{entity_id}'] = data
                        print(f"解析到指令：建立 {entity_type[:-1].upper()} '{entity_id}'")

                elif tag == "UPDATE_ENTITY":
                    entity_type_map = {"npc": "npcs", "location": "locations"}
                    entity_type_key = data.get("entity_type")
                    entity_type_collection = entity_type_map.get(entity_type_key)
                    entity_id = data.get("entity_id")
                    entity_updates = data.get("updates", [])
                    
                    if entity_type_collection and entity_id and isinstance(entity_updates, list):
                        for update_op in entity_updates:
                            field_path = update_op.get("field_path")
                            new_value = update_op.get("new_value")
                            if field_path is not None:
                                # 使用點標記法建立完整的更新路徑
                                full_path = f"{entity_type_collection}.{entity_id}.{field_path}"
                                updates[full_path] = new_value
                                print(f"解析到指令：更新 {full_path}")
                
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
    return "文字江湖遊戲後端 v1.4 已啟動！(含知識解鎖邏輯)"

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

        # --- 進階 System Prompt v1.3 ---
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
        你被賦予【創造權力】與【更新權力】。你必須在主敘述文字之外，使用【特殊指令標籤】來定義這些新元素或數據變更。這是你與資料庫溝通的唯一方式。
        * **創造指令**: `[CREATE_NPC]` 或 `[CREATE_LOCATION]`，內部為完整 JSON。
        * **更新指令**: 當玩家的行動滿足了某個知識等級的 `unlock_condition` 時（例如：與NPC對話建立信任、在某地仔細搜查），你必須生成一個 `[UPDATE_ENTITY]` 指令來解鎖該知識，並在敘述中用`[【🧠 感知提示】]`來暗示。JSON 結構如下：
            ```json
            [UPDATE_ENTITY]
            {
              "entity_type": "npc",
              "entity_id": "npc_to_update_id",
              "updates": [
                { "field_path": "knowledge_levels.level_2_name.unlocked", "new_value": true },
                { "field_path": "mood", "new_value": "變得友善" }
              ]
            }
            [/UPDATE_ENTITY]
            ```
        ---
        ### 指令四：基於上下文進行邏輯推演
        你收到的 `user_prompt` 會包含【當前世界摘要】。你必須基於這份摘要和玩家的最新選擇來進行推演。
        - **連貫性**：確保你的回應與上一回合的【核心處境】和事件結尾緊密相連。
        - **距離感描述**: 在你的主敘述中，當描述玩家視野內的 NPC 或設施時，必須用括號 `()` 附上一個符合場景的、估算的大約距離，以公尺(m)為單位。
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

        # [核心升級] 1. 解析 AI 回應
        cleaned_narrative, db_updates = process_ai_response(next_turn_narrative_raw)

        # [核心升級] 2. 更新資料庫
        if db_updates:
            new_round = current_world_state.get("metadata", {}).get("round", 0) + 1
            db_updates['metadata.round'] = new_round
            db_updates['narrative_log'] = firestore.ArrayUnion([f"回合 {new_round}: {player_action['text']}"])
            
            @firestore.transactional
            def update_in_transaction(transaction, game_ref, updates):
                transaction.update(game_ref, updates)

            transaction = db.transaction()
            update_in_transaction(transaction, game_state_ref, db_updates)
            
            print(f"已成功處理第 {new_round} 回合。資料庫已更新。")

        return jsonify({"narrative": cleaned_narrative})

    except Exception as e:
        print(f"伺服器內部錯誤: {e}")
        return jsonify({"error": f"伺服器發生未預期的內部錯誤: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
