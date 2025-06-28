# 檔名: app.py
# 版本: 2.10 - 修復實體創建指令偶發性失敗的BUG

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

# --- 輔助函數 (與之前版本相同) ---
def flatten_dict(d, parent_key='', sep='.'):
    items = []
    for k, v in d.items():
        new_key = parent_key + sep + k if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

# --- 【核心修改】再次重寫指令解析器以提高穩定性 ---
def parse_and_execute_ai_commands(ai_raw_text, game_state_ref):
    command_pattern = r'\[([A-Z_]+):\s*({.*?})\]'
    
    commands_to_execute = []
    # 第一次遍歷：僅提取所有指令
    for match in re.finditer(command_pattern, ai_raw_text, flags=re.DOTALL):
        commands_to_execute.append({
            "name": match.group(1),
            "json_str": match.group(2)
        })

    # 第二次遍歷：執行提取出的指令
    for cmd in commands_to_execute:
        command_name = cmd["name"]
        json_str = cmd["json_str"]
        try:
            data = json.loads(json_str)
            print(f"準備執行指令：{command_name}, 數據: {data}")

            if command_name == "UPDATE_PC_DATA":
                update_data = {}
                flattened_data = flatten_dict(data)
                for key, value in flattened_data.items():
                    full_key_path = f"pc_data.{key}" if not key.startswith("pc_data") else key
                    if isinstance(value, (int, float)):
                        update_data[full_key_path] = firestore.Increment(value)
                    else:
                        update_data[full_key_path] = value
                if update_data:
                    game_state_ref.update(update_data)
                    print(f"  [成功] 已執行 UPDATE_PC_DATA: {update_data}")

            elif command_name == "CREATE_NPC":
                if (npc_id := data.get("id")):
                    game_state_ref.update({f'npcs.{npc_id}': data})
                    print(f"  [成功] 已執行 CREATE_NPC: 創建了 ID 為 {npc_id} 的 NPC。")

            elif command_name == "ADD_ITEM":
                if "name" in data and "id" in data:
                    game_state_ref.update({'pc_data.inventory.carried': firestore.ArrayUnion([data])})
                    print(f"  [成功] 已執行 ADD_ITEM: 將物品 {data['name']} 加入背包。")
            
        except Exception as e:
            print(f"  [失敗] 執行指令 {command_name} 時發生錯誤: {e}")

    # 最後一步：從原始文本中刪除所有指令標籤
    cleaned_text = re.sub(command_pattern, '', ai_raw_text, flags=re.DOTALL).strip()
    return cleaned_text


def parse_narrative_entities(narrative_text, current_state):
    # ... (此函數與上一版完全相同)
    entity_pattern = r'<(npc|item|location)\s+id="([^"]+)">([^<]+)</\1>'
    parts = []
    last_end = 0
    for match in re.finditer(entity_pattern, narrative_text):
        start, end = match.span()
        if start > last_end: parts.append({"type": "text", "content": narrative_text[last_end:start]})
        entity_type, entity_id, entity_text = match.groups()
        entity_obj = {"type": entity_type, "id": entity_id, "text": entity_text, "color_class": f"text-entity-{entity_type}"}
        if entity_type == 'npc':
            friendliness = current_state.get("npcs", {}).get(entity_id, {}).get("relationship", {}).get("friendliness", 0)
            if friendliness > 50: entity_obj["color_class"] = "text-npc-friendly"
            elif friendliness < -50: entity_obj["color_class"] = "text-npc-hostile"
        parts.append(entity_obj)
        last_end = end
    if last_end < len(narrative_text): parts.append({"type": "text", "content": narrative_text[last_end:]})
    return parts if parts else [{"type": "text", "content": narrative_text}]

@app.route('/')
def index():
    return "文字江湖遊戲後端 v2.10 已啟動！(BUG修復)"

# ... 其他路由 (register, login, get_entity_info, get_summary) 與上一版完全相同，此處省略 ...
@app.route('/api/register', methods=['POST'])
def register():
    if not db: return jsonify({"error": "資料庫服務未初始化"}), 500
    try:
        data = request.get_json()
        nickname, password = data.get('nickname'), data.get('password')
        if not all([nickname, password]): return jsonify({"error": "暱稱和密碼為必填項。"}), 400
        users_ref = db.collection('users')
        if users_ref.where('nickname', '==', nickname).limit(1).get(): return jsonify({"error": "此字號已被他人使用。"}), 409
        hashed_password = generate_password_hash(password)
        user_doc_ref = users_ref.document()
        user_id = user_doc_ref.id
        user_doc_ref.set({'nickname': nickname, 'password_hash': hashed_password, 'created_at': firestore.SERVER_TIMESTAMP})
        session_id = f"session_{user_id}"
        game_state_ref = db.collection('game_sessions').document(session_id)
        personality = data.get('personality', 'neutral')
        initial_morality = {'justice': 40.0, 'neutral': 0.0, 'evil': -40.0}.get(personality, 0.0)
        initial_narrative_log = [ f"你為自己取了個字號，名喚「{nickname}」。", "在這個風雨飄搖的江湖，你決定以「" + {'justice': '行俠仗義，乃我輩本分。', 'neutral': '人不犯我，我不犯人。', 'evil': '順我者昌，逆我者亡。'}.get(personality, '') + "」作為你的人生信條。", "一切的傳奇，都將從這個決定開始。" ]
        initial_world_state = { "metadata": { "round": 0, "game_timestamp": "第一天 辰時" }, "pc_data": { "basic_info": { "name": nickname, "height": data.get('height'), "weight": data.get('weight'), "gender": data.get('gender'), "personality_trait": personality }, "core_status": { "hp": {"current": 100, "max": 100}, "mp": {"current": 50, "max": 50}, "sta": {"current": 100, "max": 100}, "san": {"current": 100, "max": 100}, "hunger": {"current": 20, "max": 100}, "thirst": {"current": 20, "max": 100}, "fatigue": {"current": 0, "max": 100} }, "reputation_and_alignment": { "morality_alignment": {"value": initial_morality, "level": "初始"} }, "skills": {"learned": [], "potential": []}, "inventory": {"carried": [], "stashed": []} }, "world": { "player_current_location_name": "無名小村 - 村口", "in_game_time": "第一天 辰時" }, "narrative_log": initial_narrative_log, "npcs": {}, "locations": {}, "tracking": {"active_clues": [], "active_rumors": []} }
        game_state_ref.set(initial_world_state)
        return jsonify({"message": "角色創建成功！", "session_id": session_id}), 201
    except Exception as e: return jsonify({"error": f"註冊失敗: {str(e)}"}), 500

@app.route('/api/login', methods=['POST'])
def login():
    if not db: return jsonify({"error": "資料庫服務未初始化"}), 500
    try:
        data = request.get_json()
        nickname, password = data.get('nickname'), data.get('password')
        users_ref = db.collection('users')
        user_query = users_ref.where('nickname', '==', nickname).limit(1).get()
        if not user_query: return jsonify({"error": "字號或暗號錯誤。"}), 401
        user_doc = user_query[0]
        user_data = user_doc.to_dict()
        if not check_password_hash(user_data.get('password_hash', ''), password): return jsonify({"error": "字號或暗號錯誤。"}), 401
        return jsonify({"message": "登入成功！", "session_id": f"session_{user_doc.id}"}), 200
    except Exception as e: return jsonify({"error": f"登入失敗: {str(e)}"}), 500

@app.route('/api/get_entity_info', methods=['POST'])
def get_entity_info():
    if not db: return jsonify({"error": "資料庫服務未初始化"}), 500
    try:
        data = request.get_json()
        session_id, entity_id, entity_type = data.get('session_id'), data.get('entity_id'), data.get('entity_type')
        if not all([session_id, entity_id, entity_type]): return jsonify({"error": "請求缺少必要參數。"}), 400
        game_state_ref = db.collection('game_sessions').document(session_id)
        game_state_doc = game_state_ref.get()
        if not game_state_doc.exists: return jsonify({"error": "找不到對應的遊戲存檔。"}), 404
        game_state = game_state_doc.to_dict()
        entity_data = game_state.get(f"{entity_type}s", {}).get(entity_id)
        if not entity_data:
            definition_ref = db.collection('definitions').document(f"{entity_type}s")
            definition_doc = definition_ref.get()
            if definition_doc.exists: entity_data = definition_doc.to_dict().get("entries", {}).get(entity_id)
        if not entity_data: entity_data = {"name": entity_id, "description": "關於此事的資訊還籠罩在迷霧之中..."}
        return jsonify({"success": True, "data": entity_data}), 200
    except Exception as e: return jsonify({"error": f"伺服器內部發生未知錯誤: {str(e)}"}), 500
    
@app.route('/api/get_summary', methods=['POST'])
def get_summary():
    if not db or not DEEPSEEK_API_KEY:
        return jsonify({"error": "服務未就緒"}), 503
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        if not session_id: return jsonify({"error": "請求缺少 session_id。"}), 400
        game_state = db.collection('game_sessions').document(session_id).get().to_dict()
        narrative_log = game_state.get("narrative_log", [])
        if len(narrative_log) <= 3: return jsonify({"summary": "書接上回，你剛踏入這個風雲變幻的江湖..."})
        log_text = "\n".join(narrative_log)
        prompt_text = f"""你是一位技藝高超的說書先生。請閱讀以下這段凌亂的江湖日誌，並將其起承轉合梳理成一段引人入勝的「前情提要」。【規則】1. 風格必須是小說旁白，充滿懸念和江湖氣息。2. 必須總結玩家的關鍵行動和處境。3. 最後要對玩家接下來可能的行動方向給出建議。4. 總字數【嚴格限制】在 300 字以內。[江湖日誌]\n{log_text}"""
        headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"}
        payload = {"model": "deepseek-chat", "messages": [{"role": "system", "content": "你是一位技藝高超的說書先生，擅長總結故事並引導後續。"}, {"role": "user", "content": prompt_text}], "max_tokens": 500, "temperature": 0.7}
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        summary_text = response.json()['choices'][0]['message']['content']
        return jsonify({"summary": summary_text})
    except Exception as e: return jsonify({"error": f"生成前情提要時發生錯誤: {str(e)}"}), 500

@app.route('/api/generate_turn', methods=['POST'])
def generate_turn():
    if not db or not DEEPSEEK_API_KEY:
        return jsonify({"error": "服務未就緒"}), 503
    try:
        data = request.get_json()
        session_id, player_action = data.get('session_id'), data.get('player_action')
        game_state_ref = db.collection('game_sessions').document(session_id)
        game_state = game_state_ref.get()
        if not game_state.exists: return jsonify({"error": "找不到遊戲存檔"}), 404
        current_state = game_state.to_dict()
        if player_action and player_action.get('id') == 'START':
            options_text = ("\n\n你心念一定，決定...\n<options>\nA. 先檢查一下自身狀況。\nB. 探索一下這個地方。\nC. 靜觀其變，等待機會。\n</options>")
            return jsonify({"narrative": [{"type": "text", "content": options_text}], "state": current_state})

        prompt_text = f"""你是一位頂尖的武俠小說家兼遊戲世界主持人(GM)。【重要規則】1. 你的回應必須是金庸武俠風格。2. 如果劇情中【首次】出現關鍵NPC或物品，你【必須】使用 `[CREATE_NPC: {{...}}]` 或 `[ADD_ITEM: {{...}}]` 指令來創建數據。3. 當你創建了實體，劇情中的對應名詞【必須】用 `<類型 id="ID">名稱</類型>` 標籤包裹。4. 如果只是玩家狀態數值變化，使用 `[UPDATE_PC_DATA: {{...}}]` 指令。5. 劇情最後【必須】提供剛好 3 個合理的行動選項，並用 `<options>` 標籤包裹。選項必須以 A. B. C. 作為開頭。[當前玩家與世界狀態]\n{json.dumps(current_state, indent=2, ensure_ascii=False)}\n[玩家的行動]\n> {player_action.get('text', '無')}"""
        headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"}
        payload = {"model": "deepseek-chat", "messages": [{"role": "system", "content": "你是一位頂尖的武俠小說家兼遊戲世界主持人(GM)，你需要根據規則生成劇情、數據指令和實體標籤。"}, {"role": "user", "content": prompt_text}], "max_tokens": 1500, "temperature": 0.8}
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        ai_raw_narrative = response.json()['choices'][0]['message']['content']
        
        narrative_after_commands = parse_and_execute_ai_commands(ai_raw_narrative, game_state_ref)
        
        latest_state_doc = game_state_ref.get()
        latest_state = latest_state_doc.to_dict()
        structured_narrative = parse_narrative_entities(narrative_after_commands, latest_state)
        
        plain_text_narrative = "".join([part.get("content", part.get("text", "")) for part in structured_narrative])
        game_state_ref.update({"narrative_log": firestore.ArrayUnion([f"> {player_action.get('text', '')}", plain_text_narrative])})
        
        return jsonify({"narrative": structured_narrative, "state": latest_state})
    except Exception as e:
        print(f"在 generate_turn 中發生錯誤: {e}")
        return jsonify({"error": f"伺服器內部發生未知錯誤: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
