# 檔名: app.py
# 版本: 1.8 - 傳統帳號密碼註冊/登入系統

import os
import json
import re
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash # 引入密碼加密工具

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
    # ... 省略 process_ai_response 函數 ...
    # 它的功能是解析AI回應並返回 cleaned_narrative 和 db_updates
    return cleaned_text, updates

# --- Flask 路由設定 ---

@app.route('/')
def index():
    return "文字江湖遊戲後端 v1.8 已啟動！(傳統帳號系統)"

# --- [核心] 註冊 API 端點 ---
@app.route('/api/register', methods=['POST'])
def register():
    if not db: return jsonify({"error": "資料庫服務未初始化"}), 500
    try:
        data = request.get_json()
        nickname = data.get('nickname')
        password = data.get('password')
        if not nickname or not password:
            return jsonify({"error": "暱稱和密碼為必填項。"}), 400

        users_ref = db.collection('users')
        # 檢查暱稱是否已被使用
        if users_ref.where('nickname', '==', nickname).limit(1).get():
            return jsonify({"error": "此字號已被他人使用。"}), 409

        # 將密碼加密後儲存，絕不儲存明文密碼！
        hashed_password = generate_password_hash(password)

        # 創建新使用者文件
        user_doc_ref = users_ref.document()
        user_id = user_doc_ref.id
        user_doc_ref.set({
            'nickname': nickname,
            'password_hash': hashed_password,
            'created_at': firestore.SERVER_TIMESTAMP
        })

        # 為新使用者創建對應的遊戲存檔
        session_id = f"session_{user_id}"
        game_state_ref = db.collection('game_sessions').document(session_id)
        
        personality = data.get('personality', 'neutral')
        initial_morality = {'justice': 40.0, 'neutral': 0.0, 'evil': -40.0}.get(personality, 0.0)
        
        initial_narrative_log = [
            f"你為自己取了個字號，名喚「{nickname}」。",
            "在這個風雨飄搖的江湖，你決定以「" + 
            {
                'justice': '行俠仗義，乃我輩本分。',
                'neutral': '人不犯我，我不犯人。',
                'evil': '順我者昌，逆我者亡。'
            }.get(personality, '') +
            "」作為你的人生信條。",
            "一切的傳奇，都將從這個決定開始。"
        ]

        # 建立一個全新的、乾淨的初始世界狀態
        initial_world_state = {
            "metadata": { "round": 0, "game_timestamp": "第一天 辰時" },
            "pc_data": {
                "basic_info": { 
                    "name": nickname,
                    "height": data.get('height'),
                    "weight": data.get('weight'),
                    "gender": data.get('gender')
                },
                "core_status": { "hp": {"current": 100, "max": 100}, "mp": {"current": 50, "max": 50}, "sta": {"current": 100, "max": 100}, "san": {"current": 100, "max": 100}, "hunger": {"current": 20, "max": 100}, "thirst": {"current": 20, "max": 100}, "fatigue": {"current": 0, "max": 100} },
                "reputation_and_alignment": { "morality_alignment": {"value": initial_morality, "level": "初始"} },
                 "skills": {"learned": [], "potential": []},
                 "inventory": {"carried": [], "stashed": []}
            },
            "world": { "player_current_location_name": "無名小村 - 村口", "in_game_time": "第一天 辰時" },
            "narrative_log": initial_narrative_log,
            "npcs": {}, "locations": {}, "tracking": {"active_clues": [], "active_rumors": []}
        }
        game_state_ref.set(initial_world_state)

        return jsonify({"message": "角色創建成功！", "session_id": session_id}), 201

    except Exception as e:
        return jsonify({"error": f"註冊失敗: {str(e)}"}), 500


# --- [核心] 登入 API 端點 ---
@app.route('/api/login', methods=['POST'])
def login():
    if not db: return jsonify({"error": "資料庫服務未初始化"}), 500
    try:
        data = request.get_json()
        nickname = data.get('nickname')
        password = data.get('password')

        users_ref = db.collection('users')
        user_query = users_ref.where('nickname', '==', nickname).limit(1).get()

        # 檢查使用者是否存在
        if not user_query:
            return jsonify({"error": "字號或暗號錯誤。"}), 401

        user_doc = user_query[0]
        user_data = user_doc.to_dict()

        # 驗證加密後的密碼
        if not check_password_hash(user_data.get('password_hash', ''), password):
            return jsonify({"error": "字號或暗號錯誤。"}), 401
            
        # 登入成功，回傳對應的 session_id
        session_id = f"session_{user_doc.id}"
        return jsonify({"message": "登入成功！", "session_id": session_id}), 200

    except Exception as e:
        return jsonify({"error": f"登入失敗: {str(e)}"}), 500


# --- 主遊戲循環 API 端點 (與 v1.6 相同) ---
@app.route('/api/generate_turn', methods=['POST'])
def generate_turn():
    # ... 此函數內容與上一版完全相同，此處省略以保持簡潔 ...
    # 它會接收 session_id 並處理對應存檔的遊戲回合
    pass

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
