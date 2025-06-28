# 檔名: app.py
# 描述: 文字江湖遊戲後端 Flask 應用程式主檔案
# 版本: 1.6 - 修正 generate_turn 函數中的 NameError

import os
import json
import re
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

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

# --- 輔助函數 (與之前版本相同) ---
def process_ai_response(raw_text):
    updates = {}
    cleaned_text = raw_text
    command_tags = ["CREATE_NPC", "CREATE_LOCATION", "UPDATE_ENTITY"]
    for tag in command_tags:
        pattern = re.compile(rf"\[{tag}\](.*?)\[/{tag}\]", re.DOTALL)
        matches = pattern.findall(cleaned_text)
        for json_str in matches:
            try:
                data = json.loads(json_str.strip())
                if tag in ["CREATE_NPC", "CREATE_LOCATION"]:
                    entity_type = "npcs" if tag == "CREATE_NPC" else "locations"
                    entity_id = data.get('id')
                    if entity_id: updates[f'{entity_type}.{entity_id}'] = data
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
                                updates[f"{entity_type_collection}.{entity_id}.{field_path}"] = new_value
            except Exception as e: print(f"警告：處理指令 [{tag}] 時發生錯誤: {e}")
        cleaned_text = pattern.sub("", cleaned_text)
    return cleaned_text.strip(), updates


# --- Flask 路由設定 ---

@app.route('/')
def index():
    return "文字江湖遊戲後端 v1.6 已啟動！"

# --- 註冊與登入 API (與 v1.5 相同) ---
@app.route('/api/register', methods=['POST'])
def register():
    # ... 此函數內容與上一版完全相同，此處省略以保持簡潔 ...
    if not db: return jsonify({"error": "資料庫服務未初始化"}), 500
    try:
        data = request.get_json()
        nickname = data.get('nickname')
        password = data.get('password')
        if not nickname or not password: return jsonify({"error": "暱稱和密碼為必填項。"}), 400
        users_ref = db.collection('users')
        if users_ref.where('nickname', '==', nickname).get(): return jsonify({"error": "此字號已被他人使用。"}), 409
        hashed_password = generate_password_hash(password)
        user_doc_ref = users_ref.document()
        user_id = user_doc_ref.id
        user_doc_ref.set({'nickname': nickname, 'password_hash': hashed_password, 'created_at': firestore.SERVER_TIMESTAMP})
        session_id = f"session_{user_id}"
        game_state_ref = db.collection('game_sessions').document(session_id)
        personality = data.get('personality', 'neutral')
        initial_morality = {'justice': 40.0, 'neutral': 0.0, 'evil': -40.0}.get(personality, 0.0)
        initial_narrative_log = [ f"你為自己取了個字號，名喚「{nickname}」。", "在這個風雨飄搖的江湖，你決定以「" + { 'justice': '行俠仗義，乃我輩本分。', 'neutral': '人不犯我，我不犯人。', 'evil': '順我者昌，逆我者亡。' }.get(personality, '') + "」作為你的人生信條。", "一切的傳奇，都將從這個決定開始。" ]
        initial_world_state = {
            "metadata": { "round": 0, "game_timestamp": "第一天 辰時" },
            "pc_data": {
                "basic_info": { "name": nickname },
                "core_status": { "hp": {"current": 100, "max": 100}, "mp": {"current": 50, "max": 50}, "sta": {"current": 100, "max": 100}, "san": {"current": 100, "max": 100}, "hunger": {"current": 20, "max": 100}, "thirst": {"current": 20, "max": 100}, "fatigue": {"current": 0, "max": 100} },
                "reputation_and_alignment": { "morality_alignment": {"value": initial_morality, "level": "初始"} },
            },
            "world": { "player_current_location_name": "無名小村 - 村口", "in_game_time": "第一天 辰時" },
            "narrative_log": initial_narrative_log,
        }
        game_state_ref.set(initial_world_state)
        return jsonify({"message": "角色創建成功！", "session_id": session_id}), 201
    except Exception as e: return jsonify({"error": f"註冊失敗: {str(e)}"}), 500

@app.route('/api/login', methods=['POST'])
def login():
    # ... 此函數內容與上一版完全相同，此處省略以保持簡潔 ...
    if not db: return jsonify({"error": "資料庫服務未初始化"}), 500
    try:
        data = request.get_json()
        nickname = data.get('nickname')
        password = data.get('password')
        users_ref = db.collection('users')
        user_query = users_ref.where('nickname', '==', nickname).limit(1).get()
        if not user_query: return jsonify({"error": "字號或暗號錯誤。"}), 401
        user_doc = user_query[0]
        user_data = user_doc.to_dict()
        if not check_password_hash(user_data['password_hash'], password): return jsonify({"error": "字號或暗號錯誤。"}), 401
        session_id = f"session_{user_doc.id}"
        return jsonify({"message": "登入成功！", "session_id": session_id}), 200
    except Exception as e: return jsonify({"error": f"登入失敗: {str(e)}"}), 500

# --- [核心修正] 主遊戲循環 API 端點 ---
@app.route('/api/generate_turn', methods=['POST'])
def generate_turn():
    if not db:
        return jsonify({"error": "資料庫服務未初始化"}), 500

    try:
        # [修正] 將獲取 request data 的動作移到最前面
        data = request.get_json()
        if not data:
            return jsonify({"error": "請求格式錯誤，需要 JSON 內容。"}), 400
            
        player_action = data.get('player_action')
        session_id = data.get('session_id')

        if not player_action:
            return jsonify({"error": "請求中未包含 'player_action'"}), 400
        if not session_id:
            return jsonify({"error": "請求中缺少 'session_id'"}), 400

        # 後續邏輯不變
        game_state_ref = db.collection('game_sessions').document(session_id)
        current_world_state = game_state_ref.get().to_dict()
        if not current_world_state:
            return jsonify({"error": f"找不到存檔: {session_id}。請先執行初始化腳本。"}), 404

        system_prompt = """...""" # 省略，與 v1.4 相同
        world_summary = f"""...""" # 省略，與 v1.4 相同
        user_prompt = f"{world_summary}\n\n玩家選擇的行動是：'{player_action['text']}'。\n\n請生成下一回合的完整內容。"

        api_key = os.environ.get('DEEPSEEK_API_KEY')
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {"model": "deepseek-chat", "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]}
        
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
        
        ai_response_data = response.json()
        next_turn_narrative_raw = ai_response_data['choices'][0]['message']['content']

        cleaned_narrative, db_updates = process_ai_response(next_turn_narrative_raw)

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
