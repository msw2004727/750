# 檔名: app.py
# 版本: 2.5 - 擴充AI指令集，實現動態實體創建 (NPC/Item)

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


# --- 【核心修改】大幅擴充 AI 指令解析與執行函數 ---
def parse_and_execute_ai_commands(ai_raw_text, game_state_ref):
    command_pattern = r'\[([A-Z_]+):\s*({.*?})\]'
    cleaned_text = ai_raw_text
    commands_found = re.findall(command_pattern, ai_raw_text)

    for command_name, json_str in commands_found:
        try:
            data = json.loads(json_str)
            print(f"解析到指令：{command_name}, 數據: {data}")

            # --- 指令處理中心 ---
            if command_name == "UPDATE_PC_DATA":
                update_data = {}
                for key, value in data.items():
                    # 處理增量更新
                    if isinstance(value, str) and (value.startswith('+') or value.startswith('-')):
                        field_path = tuple(key.split('.'))
                        update_data[field_path] = firestore.Increment(int(value))
                    # 處理直接賦值
                    else:
                        field_path = tuple(key.split('.'))
                        update_data[field_path] = value
                if update_data:
                    game_state_ref.update(update_data)
                    print(f"已執行 UPDATE_PC_DATA: {update_data}")

            elif command_name == "CREATE_NPC":
                # 指令: 創建一個新的 NPC 並加入到世界的 npcs map 中
                npc_id = data.get("id")
                if npc_id:
                    # 使用點記法來更新 map 中的特定欄位
                    game_state_ref.update({f'npcs.{npc_id}': data})
                    print(f"已執行 CREATE_NPC: 創建了 ID 為 {npc_id} 的 NPC。")

            elif command_name == "ADD_ITEM":
                # 指令: 創建一個新物品並將其加入玩家的隨身清單中
                if "name" in data and "id" in data:
                    # 使用 ArrayUnion 來向陣列中添加新元素
                    game_state_ref.update({
                        'pc_data.inventory.carried': firestore.ArrayUnion([data])
                    })
                    print(f"已執行 ADD_ITEM: 將物品 {data['name']} 加入背包。")
            
        except json.JSONDecodeError:
            print(f"錯誤：無法解析指令中的 JSON 數據: {json_str}")
        except Exception as e:
            print(f"執行指令 {command_name} 時發生錯誤: {e}")

    cleaned_text = re.sub(command_pattern, '', cleaned_text).strip()
    return cleaned_text

def parse_narrative_entities(narrative_text, current_state):
    # ... (此函數與上一版完全相同，此處省略)
    entity_pattern = r'<(npc|item|location)\s+id="([^"]+)">([^<]+)</\1>'
    parts = []
    last_end = 0
    for match in re.finditer(entity_pattern, narrative_text):
        start, end = match.span()
        if start > last_end:
            parts.append({"type": "text", "content": narrative_text[last_end:start]})
        entity_type = match.group(1)
        entity_id = match.group(2)
        entity_text = match.group(3)
        entity_obj = {"type": entity_type, "id": entity_id, "text": entity_text, "color_class": f"text-entity-{entity_type}"}
        if entity_type == 'npc':
            friendliness = current_state.get("npcs", {}).get(entity_id, {}).get("relationship", {}).get("friendliness", 0)
            if friendliness > 50:
                entity_obj["color_class"] = "text-npc-friendly"
            elif friendliness < -50:
                entity_obj["color_class"] = "text-npc-hostile"
        parts.append(entity_obj)
        last_end = end
    if last_end < len(narrative_text):
        parts.append({"type": "text", "content": narrative_text[last_end:]})
    if not parts:
        return [{"type": "text", "content": narrative_text}]
    return parts

@app.route('/')
def index():
    return "文字江湖遊戲後端 v2.5 已啟動！(動態實體創建)"

# --- 註冊與登入 API (省略) ---
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


@app.route('/api/get_entity_info', methods=['POST'])
def get_entity_info():
    if not db: return jsonify({"error": "資料庫服務未初始化"}), 500
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        entity_id = data.get('entity_id')
        entity_type = data.get('entity_type')
        if not all([session_id, entity_id, entity_type]):
            return jsonify({"error": "請求缺少必要參數。"}), 400
        game_state_ref = db.collection('game_sessions').document(session_id)
        game_state_doc = game_state_ref.get()
        if not game_state_doc.exists:
            return jsonify({"error": "找不到對應的遊戲存檔。"}), 404
        game_state = game_state_doc.to_dict()
        entity_data = game_state.get(f"{entity_type}s", {}).get(entity_id)
        if not entity_data:
            definition_ref = db.collection('definitions').document(f"{entity_type}s")
            definition_doc = definition_ref.get()
            if definition_doc.exists:
                entity_data = definition_doc.to_dict().get("entries", {}).get(entity_id)
        if not entity_data:
            entity_data = {"name": entity_id, "description": "關於此事的資訊還籠罩在迷霧之中，需要你進一步探索才能知曉。"}
        return jsonify({"success": True, "data": entity_data}), 200
    except Exception as e:
        print(f"查詢實體資訊時發生錯誤: {e}")
        return jsonify({"error": f"伺服器內部發生未知錯誤: {str(e)}"}), 500


@app.route('/api/generate_turn', methods=['POST'])
def generate_turn():
    if not db or not DEEPSEEK_API_KEY:
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
            structured_narrative = [{"type": "text", "content": initial_narrative_text}]
            options_text = ("\n\n你環顧四周，接下來你打算？\n<options>\nA. 先檢查一下自身狀況。\nB. 探索一下這個地方。\nC. 靜觀其變，等待機會。\n</options>")
            structured_narrative.append({"type": "text", "content": options_text})
            return jsonify({"narrative": structured_narrative, "state": current_state})

        # --- 【核心修改】更新 Prompt，教 AI 使用新的 CREATE 指令 ---
        prompt_text = f"""
        你是一位頂尖的武俠小說家兼遊戲世界主持人(GM)。
        
        【重要規則】
        1. 你的回應必須是金庸武俠風格，包含劇情和行動選項。
        2. 如果劇情中【首次】出現了關鍵的NPC或物品，你【必須】使用指令來創建它們的數據。
        3. 創建NPC使用 `[CREATE_NPC: {{...}}]` 指令，JSON中必須包含 `id` (英文), `name` (中文名), `description` (外觀描述), `mood` (初始心情), 和 `relationship` (關係)。
        4. 獲得物品使用 `[ADD_ITEM: {{...}}]` 指令，JSON中必須包含 `id` (英文), `name` (中文名), `description` (描述), `type` (類型，如 'weapon', 'consumable')。
        5. 當你創建了實體，劇情中的對應名詞【必須】用 `<類型 id="ID">名稱</類型>` 標籤包裹。
        6. 如果只是玩家狀態數值變化，使用 `[UPDATE_PC_DATA: {{...}}]` 指令。

        [當前玩家與世界狀態]
        {json.dumps(current_state, indent=2, ensure_ascii=False)}

        [玩家的行動]
        > {player_action.get('text', '無')}
        
        【範例1: 創建NPC】
        ...你定睛一看，發現路邊坐著一個<npc id="weary_traveler_01">疲憊的旅人</npc>，他面色蒼白，似乎受了傷。[CREATE_NPC: {{"id": "weary_traveler_01", "name": "疲憊的旅人", "description": "一個風塵僕僕的中年男子，衣衫有些襤褸。", "mood": "憂慮", "relationship": {{"friendliness": 10, "respect": 0}}}}]<options>...</options>

        【範例2: 獲得物品】
        ...你在草叢中摸索，意外地碰到一個堅硬的物體。撥開一看，竟是一柄<item id="rusty_dagger_01">生鏽的短匕</item>。[ADD_ITEM: {{"id": "rusty_dagger_01", "name": "生鏽的短匕", "description": "看起來很普通，但似乎比一般的鐵器要重一些。", "type": "weapon", "damage": 5}}]<options>...</options>
        """

        headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"}
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "你是一位頂尖的武俠小說家兼遊戲世界主持人(GM)，你需要根據規則生成劇情、數據指令和實體標籤。"},
                {"role": "user", "content": prompt_text}
            ],
            "max_tokens": 1500, "temperature": 0.8
        }
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        ai_response = response.json()
        ai_raw_narrative = ai_response['choices'][0]['message']['content']

        # --- 執行指令並解析實體 (與之前相同) ---
        narrative_after_commands = parse_and_execute_ai_commands(ai_raw_narrative, game_state_ref)
        structured_narrative = parse_narrative_entities(narrative_after_commands, current_state)
        
        plain_text_narrative = "".join([part.get("content", part.get("text", "")) for part in structured_narrative])
        updated_log = current_state.get("narrative_log", [])
        updated_log.append(f"> {player_action.get('text', '')}")
        updated_log.append(plain_text_narrative)
        
        game_state_ref.update({"narrative_log": updated_log})
        latest_state = game_state_ref.get().to_dict()

        return jsonify({"narrative": structured_narrative, "state": latest_state})

    except Exception as e:
        print(f"在 generate_turn 中發生錯誤: {e}")
        return jsonify({"error": f"伺服器內部發生未知錯誤: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
