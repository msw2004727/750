# 檔名: app.py
# 版本: 2.1 - 整合 DeepSeek AI 實現動態劇情生成

import os
import json
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

# --- 新增：從環境變數讀取 AI 金鑰 ---
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY')
if not DEEPSEEK_API_KEY:
    print("警告：環境變數 'DEEPSEEK_API_KEY' 未設定！AI 功能將無法使用。")

# --- 註冊與登入 API (與之前版本相同，此處省略以保持簡潔) ---
# ...
@app.route('/')
def index():
    return "文字江湖遊戲後端 v2.1 已啟動！(AI 動態生成)"

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
    if not DEEPSEEK_API_KEY:
        return jsonify({"error": "伺服器缺少 AI API 金鑰，無法生成劇情。"}), 503

    try:
        # 1. 讀取前端請求與資料庫狀態 (與上一版相同)
        data = request.get_json()
        session_id = data.get('session_id')
        player_action = data.get('player_action')

        if not session_id:
            return jsonify({"error": "請求中缺少 session_id。"}), 400

        game_state_ref = db.collection('game_sessions').document(session_id)
        game_state = game_state_ref.get()

        if not game_state.exists:
            return jsonify({"error": "找不到對應的遊戲存檔。"}), 404
        
        current_state = game_state.to_dict()
        
        # 處理第一個回合 (START action)
        if player_action and player_action.get('id') == 'START':
            initial_narrative = "\n".join(current_state.get("narrative_log", []))
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

        # 2. 【核心新增】組合給 AI 的 Prompt
        # 為了節省 token，我們只傳遞最關鍵的資料摘要
        pc_info = current_state.get("pc_data", {}).get("basic_info", {})
        pc_status = current_state.get("pc_data", {}).get("core_status", {})
        world_info = current_state.get("world", {})
        recent_log = "\n".join(current_state.get("narrative_log", [])[-5:]) # 只取最近5筆紀錄

        prompt_text = f"""
        你是一位頂尖的武俠小說家兼遊戲世界主持人(GM)。
        請根據以下玩家資料和他的行動，生成一段約 150-250 字的、引人入勝的、充滿江湖氣息的後續劇情。
        你的回應必須嚴格遵循金庸武俠風格，並提供 3-4 個合理的行動選項。
        
        [玩家資料]
        姓名: {pc_info.get('name', '未知')}
        性別: {pc_info.get('gender', '未知')}
        身高: {pc_info.get('height', '未知')} cm
        個性: {pc_info.get('personality_trait', '中立')}
        當前氣血: {pc_status.get('hp', {}).get('current', 100)} / {pc_status.get('hp', {}).get('max', 100)}
        
        [當前情境]
        地點: {world_info.get('player_current_location_name', '未知地點')}
        最近發生的事: 
        {recent_log}
        
        [玩家的行動]
        > {player_action.get('text', '無')}
        
        你的回應必須包含 <options> 標籤，並在其中列出給玩家的行動選項。
        例如:
        ...劇情描述...
        <options>
        A. 選項一
        B. 選項二
        C. 選項三
        </options>
        """

        # 3. 【核心新增】呼叫 DeepSeek API
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
        }
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "你是一位頂尖的武俠小說家兼遊戲世界主持人(GM)，擅長創造充滿懸念和選擇的互動劇情。"},
                {"role": "user", "content": prompt_text}
            ],
            "max_tokens": 1000,
            "temperature": 0.8,
        }
        
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status() # 如果請求失敗，會拋出異常
        
        ai_response = response.json()
        ai_narrative = ai_response['choices'][0]['message']['content']

        # 4. 【核心新增】更新遊戲狀態並回傳
        # 簡單地將新劇情和玩家行動加入日誌
        updated_log = current_state.get("narrative_log", [])
        updated_log.append(f"> {player_action.get('text', '')}")
        updated_log.append(ai_narrative)

        # 更新資料庫 (目前只更新 log)
        game_state_ref.update({"narrative_log": updated_log})

        return jsonify({"narrative": ai_narrative, "state": current_state}) # 回傳 AI 生成的原始劇情

    except requests.exceptions.RequestException as e:
        print(f"呼叫 AI API 失敗: {e}")
        return jsonify({"error": f"與 AI 服務連線失敗: {str(e)}"}), 503
    except Exception as e:
        print(f"在 generate_turn 中發生錯誤: {e}")
        return jsonify({"error": f"伺服器內部發生未知錯誤: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
