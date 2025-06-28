# 檔名: app.py
# 版本: 2.0 - 實現基礎的遊戲回合讀取功能

import os
import json
import re
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# --- 初始化 ---
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

# --- 輔助函數 (未來擴充用) ---
def process_ai_response(raw_text):
    # 這裡未來會加入解析 AI 回應並更新資料庫的複雜邏輯
    # 目前先返回原樣
    return raw_text, {}

# --- Flask 路由設定 ---

@app.route('/')
def index():
    return "文字江湖遊戲後端 v2.0 已啟動！(回合讀取功能)"

# --- 註冊 API 端點 (已完成) ---
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
        if users_ref.where('nickname', '==', nickname).limit(1).get():
            return jsonify({"error": "此字號已被他人使用。"}), 409

        hashed_password = generate_password_hash(password)

        user_doc_ref = users_ref.document()
        user_id = user_doc_ref.id
        user_doc_ref.set({
            'nickname': nickname,
            'password_hash': hashed_password,
            'created_at': firestore.SERVER_TIMESTAMP
        })

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

        initial_world_state = {
            "metadata": { "round": 0, "game_timestamp": "第一天 辰時" },
            "pc_data": {
                "basic_info": { 
                    "name": nickname,
                    "height": data.get('height'),
                    "weight": data.get('weight'),
                    "gender": data.get('gender'),
                    "personality_trait": personality
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


# --- 登入 API 端點 (已完成) ---
@app.route('/api/login', methods=['POST'])
def login():
    if not db: return jsonify({"error": "資料庫服務未初始化"}), 500
    try:
        data = request.get_json()
        nickname = data.get('nickname')
        password = data.get('password')

        users_ref = db.collection('users')
        user_query = users_ref.where('nickname', '==', nickname).limit(1).get()

        if not user_query:
            return jsonify({"error": "字號或暗號錯誤。"}), 401

        user_doc = user_query[0]
        user_data = user_doc.to_dict()

        if not check_password_hash(user_data.get('password_hash', ''), password):
            return jsonify({"error": "字號或暗號錯誤。"}), 401
            
        session_id = f"session_{user_doc.id}"
        return jsonify({"message": "登入成功！", "session_id": session_id}), 200

    except Exception as e:
        return jsonify({"error": f"登入失敗: {str(e)}"}), 500


# --- 【本次修改】主遊戲循環 API 端點 ---
@app.route('/api/generate_turn', methods=['POST'])
def generate_turn():
    if not db:
        return jsonify({"error": "資料庫服務未初始化"}), 500
        
    try:
        # 1. 從前端獲取請求資料
        data = request.get_json()
        session_id = data.get('session_id')
        player_action = data.get('player_action')

        if not session_id:
            return jsonify({"error": "請求中缺少 session_id。"}), 400

        # 2. 從 Firestore 讀取當前的遊戲狀態
        game_state_ref = db.collection('game_sessions').document(session_id)
        game_state = game_state_ref.get()

        if not game_state.exists:
            return jsonify({"error": "找不到對應的遊戲存檔。"}), 404
        
        current_state = game_state.to_dict()
        
        # 3. 【暫時性邏輯】處理第一個回合 (START action)
        #    目前，我們不呼叫 AI，只將資料庫中已有的開場白回傳給前端。
        if player_action and player_action.get('id') == 'START':
            # 直接使用註冊時生成的初始 narrative_log
            initial_narrative = "\n".join(current_state.get("narrative_log", []))
            
            # 加上初始的行動選項
            # 這裡的格式是為了讓前端的 parseNarrative 能夠解析
            full_narrative = (
                f"{initial_narrative}\n\n"
                "你環顧四周，接下來你打算？\n"
                "<options>\n"
                "A. 先檢查一下自身狀況。\n"
                "B. 探索一下這個地方。\n"
                "C. 靜觀其變，等待機會。\n"
                "</options>"
            )
            
            return jsonify({"narrative": full_narrative, "state": current_state})

        # 4. 【未來擴充】處理後續回合的邏輯會放在這裡
        #    - 整合 prompt
        #    - 呼叫 AI
        #    - 解析 AI 回應
        #    - 更新資料庫
        #    - 回傳新劇情
        return jsonify({"narrative": "後續回合功能待開發...", "state": current_state})

    except Exception as e:
        # 記錄詳細錯誤，方便除錯
        print(f"在 generate_turn 中發生錯誤: {e}")
        return jsonify({"error": f"伺服器內部發生未知錯誤: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
