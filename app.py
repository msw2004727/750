# 檔名: app.py
# 版本: 2.3 - 實現敘事結構化，為前端超連結提供數據基礎

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
# ... (省略部分代碼以保持簡潔)
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


# --- AI 指令解析器 (與之前版本相同) ---
def parse_and_execute_ai_commands(ai_raw_text, game_state_ref):
    # ... (省略部分代碼以保持簡潔)
    command_pattern = r'\[([A-Z_]+):\s*({.*?})\]'
    cleaned_text = ai_raw_text
    commands_found = re.findall(command_pattern, ai_raw_text)
    for command_name, json_str in commands_found:
        try:
            data = json.loads(json_str)
            if command_name == "UPDATE_PC_DATA":
                update_data = {}
                for key, value in data.items():
                    if isinstance(value, str) and (value.startswith('+') or value.startswith('-')):
                        field_path = tuple(key.split('.'))
                        update_data[field_path] = firestore.Increment(int(value))
                    else:
                        field_path = tuple(key.split('.'))
                        update_data[field_path] = value
                if update_data:
                    game_state_ref.update(update_data)
        except Exception as e:
            print(f"執行指令時發生錯誤: {e}")
    cleaned_text = re.sub(command_pattern, '', cleaned_text).strip()
    return cleaned_text

# --- 【核心新增】敘事實體解析器 ---
def parse_narrative_entities(narrative_text, current_state):
    """
    解析敘述文本中的實體標籤(如<npc>, <item>)，並轉換為結構化列表。
    """
    # 匹配 <type id="some_id">text</type> 格式的標籤
    entity_pattern = r'<(npc|item|location)\s+id="([^"]+)">([^<]+)</\1>'
    
    parts = []
    last_end = 0

    for match in re.finditer(entity_pattern, narrative_text):
        # 1. 添加標籤前的純文字部分
        start, end = match.span()
        if start > last_end:
            parts.append({
                "type": "text",
                "content": narrative_text[last_end:start]
            })
        
        # 2. 添加解析到的實體部分
        entity_type = match.group(1) # 'npc', 'item', or 'location'
        entity_id = match.group(2)
        entity_text = match.group(3)
        
        # 基礎實體物件
        entity_obj = {
            "type": entity_type,
            "id": entity_id,
            "text": entity_text,
            "color_class": f"text-entity-{entity_type}" # 預設顏色
        }
        
        # 【擴充】根據實體類型和數據決定顏色
        if entity_type == 'npc':
            # 假設NPC好感度在 state["npcs"][entity_id]["relationship"]["friendliness"]
            # 這裡僅為示例，目前資料庫尚無此結構
            friendliness = current_state.get("npcs", {}).get(entity_id, {}).get("relationship", {}).get("friendliness", 0)
            if friendliness > 50:
                entity_obj["color_class"] = "text-npc-friendly"
            elif friendliness < -50:
                entity_obj["color_class"] = "text-npc-hostile"

        parts.append(entity_obj)
        last_end = end

    # 3. 添加最後一個標籤後剩餘的純文字部分
    if last_end < len(narrative_text):
        parts.append({
            "type": "text",
            "content": narrative_text[last_end:]
        })
        
    # 如果沒有找到任何實體，則返回單一的純文字物件
    if not parts:
        return [{"type": "text", "content": narrative_text}]
        
    return parts

# --- 註冊與登入 API (省略) ---
# ...
@app.route('/')
def index():
    return "文字江湖遊戲後端 v2.3 已啟動！(敘事結構化)"

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
        return jsonify({"error": "服務未就緒"}), 503
        
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        player_action = data.get('player_action')
        game_state_ref = db.collection('game_sessions').document(session_id)
        game_state = game_state_ref.get()
        if not game_state.exists:
            return jsonify({"error": "找不到遊戲存檔"}), 404
        current_state = game_state.to_dict()

        if player_action and player_action.get('id') == 'START':
            initial_narrative_text = "\n".join(current_state.get("narrative_log", []))
            # 初始劇情也結構化，雖然裡面只有純文字
            structured_narrative = [{"type": "text", "content": initial_narrative_text}]
            
            # 選項依然保持原樣
            options_text = (
                "\n\n你環顧四周，接下來你打算？\n"
                "<options>\n"
                "A. 先檢查一下自身狀況。\n"
                "B. 探索一下這個地方。\n"
                "C. 靜觀其變，等待機會。\n"
                "</options>"
            )
            # 在回傳的 narrative 中加入選項
            structured_narrative.append({"type": "text", "content": options_text})
            
            # 【重要變更】回傳的 narrative 變成了一個列表
            return jsonify({"narrative": structured_narrative, "state": current_state})

        # --- 更新 Prompt，教 AI 使用實體標籤 ---
        prompt_text = f"""
        你是一位頂尖的武俠小說家兼遊戲世界主持人(GM)。
        
        【重要規則】
        1. 你的回應必須是金庸武俠風格。
        2. 如果劇情中出現了關鍵的NPC、物品或地點，你必須用標籤將它們包裹起來，格式為 `<類型 id="ID">名稱</類型>`。類型可以是 `npc`, `item`, `location`。ID必須是英文且獨一無二。
        3. 如果劇情導致玩家數據變化，你必須使用指令標籤 `[UPDATE_PC_DATA: {{...}}]` 來標註。
        4. 劇情最後必須提供3-4個合理的行動選項，並用 `<options>` 標籤包裹。

        [玩家資料]
        {json.dumps(current_state.get("pc_data", {}), indent=2, ensure_ascii=False)}
        
        [當前情境]
        {json.dumps(current_state.get("world", {}), indent=2, ensure_ascii=False)}
        
        [玩家的行動]
        > {player_action.get('text', '無')}
        
        【範例回應】
        你遇到一位<npc id="old_monk_01">掃地老僧</npc>，他遞給你一本<item id="sutra_001">泛黃的經書</item>。這一切都發生在<location id="shaolin_temple_01">少林寺</location>的藏經閣前。
        [UPDATE_PC_DATA: {{"pc_data.core_status.mp.current": "-10"}}]
        <options>
        A. 選項一
        B. 選項二
        </options>
        """

        # --- 呼叫 AI (與之前相同) ---
        headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"}
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "你是一位頂尖的武俠小說家兼遊戲世界主持人(GM)，你需要根據規則生成劇情、數據指令和實體標籤。"},
                {"role": "user", "content": prompt_text}
            ],
            "max_tokens": 1000, "temperature": 0.8
        }
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        ai_response = response.json()
        ai_raw_narrative = ai_response['choices'][0]['message']['content']

        # --- 執行指令並解析實體 ---
        # 1. 先執行指令並移除指令標籤
        narrative_after_commands = parse_and_execute_ai_commands(ai_raw_narrative, game_state_ref)
        # 2. 再解析實體標籤，生成結構化數據
        structured_narrative = parse_narrative_entities(narrative_after_commands, current_state)
        
        # --- 更新日誌並回傳 ---
        # 為了日誌的可讀性，我們存入不含標籤的純文字版本
        plain_text_narrative = "".join([part.get("content", part.get("text", "")) for part in structured_narrative])
        
        updated_log = current_state.get("narrative_log", [])
        updated_log.append(f"> {player_action.get('text', '')}")
        updated_log.append(plain_text_narrative)
        
        game_state_ref.update({"narrative_log": updated_log})
        latest_state = game_state_ref.get().to_dict()

        # 【重要變更】回傳給前端的是包含實體標籤的結構化列表
        return jsonify({"narrative": structured_narrative, "state": latest_state})

    except Exception as e:
        print(f"在 generate_turn 中發生錯誤: {e}")
        return jsonify({"error": f"伺服器內部發生未知錯誤: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
