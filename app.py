# 檔名: app.py
# 版本: 2.2 - 引入AI指令解析器，實現數據驅動狀態更新

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
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY')
if not DEEPSEEK_API_KEY:
    print("警告：環境變數 'DEEPSEEK_API_KEY' 未設定！AI 功能將無法使用。")

# --- 【核心新增】AI 指令解析與執行函數 ---
def parse_and_execute_ai_commands(ai_raw_text, game_state_ref):
    """
    解析 AI 回應中的特殊指令標籤，並執行對應的資料庫操作。
    返回一個清理過的、只給玩家看的敘述文本。
    """
    # 指令格式為 [COMMAND: {"key": "value"}]，例如: [UPDATE_PC_DATA: {"pc_data.core_status.hp.current": -10}]
    command_pattern = r'\[([A-Z_]+):\s*({.*?})\]'
    
    cleaned_text = ai_raw_text
    commands_found = re.findall(command_pattern, ai_raw_text)

    for command_name, json_str in commands_found:
        try:
            data = json.loads(json_str)
            print(f"解析到指令：{command_name}, 數據: {data}")

            # --- 指令處理中心 ---
            if command_name == "UPDATE_PC_DATA":
                # 這個指令用於更新玩家資料 (pc_data)
                # 使用 Firestore 的 FieldPath 來更新巢狀欄位
                update_data = {}
                for key, value in data.items():
                    # 處理增量更新 (例如HP-10)
                    if isinstance(value, str) and (value.startswith('+') or value.startswith('-')):
                         # 將 "pc_data.core_status.hp.current" 這樣的字串轉換為 FieldPath
                        field_path = tuple(key.split('.'))
                        update_data[field_path] = firestore.Increment(int(value))
                    else:
                        # 處理直接賦值
                        field_path = tuple(key.split('.'))
                        update_data[field_path] = value
                
                if update_data:
                    game_state_ref.update(update_data)
                    print(f"已執行資料庫更新: {update_data}")

            # 未來可以在此處添加更多指令，如 CREATE_NPC, UPDATE_INVENTORY 等
            
        except json.JSONDecodeError:
            print(f"錯誤：無法解析指令中的 JSON 數據: {json_str}")
        except Exception as e:
            print(f"執行指令時發生錯誤: {e}")

    # 從文本中移除所有指令標籤，返回乾淨的敘述
    cleaned_text = re.sub(command_pattern, '', cleaned_text).strip()
    return cleaned_text


# --- 註冊與登入 API (省略) ---
# ...
@app.route('/')
def index():
    return "文字江湖遊戲後端 v2.2 已啟動！(AI指令解析)"

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
    if not db or not DEEPSEEK_API_KEY:
        # ... (錯誤處理與之前相同)
        pass
        
    try:
        # 1. 讀取請求與資料庫狀態 (與之前相同)
        data = request.get_json()
        session_id = data.get('session_id')
        player_action = data.get('player_action')
        game_state_ref = db.collection('game_sessions').document(session_id)
        # ... (後續讀取邏輯與之前相同)
        game_state = game_state_ref.get()
        if not game_state.exists:
            return jsonify({"error": "找不到對應的遊戲存檔。"}), 404
        current_state = game_state.to_dict()

        # 處理 START action (與之前相同)
        if player_action and player_action.get('id') == 'START':
            # ...
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


        # 2. 【核心修改】更新給 AI 的 Prompt，教它使用指令
        pc_info = current_state.get("pc_data", {}).get("basic_info", {})
        pc_status = current_state.get("pc_data", {}).get("core_status", {})
        world_info = current_state.get("world", {})
        recent_log = "\n".join(current_state.get("narrative_log", [])[-5:])

        prompt_text = f"""
        你是一位頂尖的武俠小說家兼遊戲世界主持人(GM)。
        請根據玩家資料和他的行動，生成一段約 150-250 字的、引人入勝的後續劇情。
        
        【重要規則】
        1. 你的回應必須是金庸武俠風格。
        2. 如果劇情導致玩家的數據發生變化（例如受傷、消耗內力），你必須在劇情文字之外，單獨使用指令標籤 `[UPDATE_PC_DATA: {{...}}]` 來標註數據變化。
        3. 數據路徑必須完整，例如 `"pc_data.core_status.hp.current"`。
        4. 數值變化必須使用字串格式的增量值，例如 `"-10"` 或 `"+20"`。
        5. 劇情最後必須提供 3-4 個合理的行動選項，並用 `<options>` 標籤包裹。

        [玩家資料]
        姓名: {pc_info.get('name', '未知')}
        性別: {pc_info.get('gender', '未知')}
        個性: {pc_info.get('personality_trait', '中立')}
        當前氣血: {pc_status.get('hp', {}).get('current', 100)} / {pc_status.get('hp', {}).get('max', 100)}
        
        [當前情境]
        地點: {world_info.get('player_current_location_name', '未知地點')}
        最近發生的事: 
        {recent_log}
        
        [玩家的行動]
        > {player_action.get('text', '無')}
        
        【範例回應】
        你腳下一個踉蹌，不慎從石階上滑倒，雖然無甚大礙，但膝蓋卻是一陣劇痛。
        [UPDATE_PC_DATA: {{"pc_data.core_status.hp.current": "-5"}}]
        <options>
        A. 揉揉膝蓋，繼續前行。
        B. 找個地方坐下歇息。
        C. 破口大罵這該死的石階。
        </options>
        """

        # 3. 呼叫 DeepSeek API (與之前相同)
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
        }
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "你是一位頂尖的武俠小說家兼遊戲世界主持人(GM)，你需要根據規則生成劇情和數據指令。"},
                {"role": "user", "content": prompt_text}
            ],
            "max_tokens": 1000,
            "temperature": 0.8,
        }
        
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        
        ai_response = response.json()
        ai_raw_narrative = ai_response['choices'][0]['message']['content']

        # 4. 【核心修改】解析並執行指令，獲取乾淨的劇情文本
        cleaned_narrative = parse_and_execute_ai_commands(ai_raw_narrative, game_state_ref)

        # 5. 更新遊戲日誌並回傳
        updated_log = current_state.get("narrative_log", [])
        updated_log.append(f"> {player_action.get('text', '')}")
        # 將清理過的劇情存入日誌
        updated_log.append(cleaned_narrative) 
        
        game_state_ref.update({"narrative_log": updated_log})
        
        # 重新從資料庫讀取最新狀態，以確保前端能即時更新
        latest_state = game_state_ref.get().to_dict()

        return jsonify({"narrative": cleaned_narrative, "state": latest_state})

    except Exception as e:
        # ... (錯誤處理與之前相同)
        pass

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
