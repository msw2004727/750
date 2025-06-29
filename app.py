# 檔名: app.py
# 版本: 2.17 - 導入「每回合格式排版規則」的部分要求，豐富AI敘事層次

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
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY')
if not DEEPSEEK_API_KEY:
    print("警告：環境變數 'DEEPSEEK_API_KEY' 未設定！AI 功能將無法使用。")

# --- 指令解析與輔助函數 ---
def flatten_dict(d, parent_key='', sep='.'):
    items = []
    for k, v in d.items():
        new_key = parent_key + sep + k if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def parse_and_execute_ai_commands(ai_raw_text, game_state_ref):
    command_pattern = r'\[([A-Z_]+):\s*({.*?})\]'
    commands_to_execute = []
    for match in re.finditer(command_pattern, ai_raw_text, flags=re.DOTALL):
        commands_to_execute.append({"name": match.group(1), "json_str": match.group(2)})
    
    for cmd in commands_to_execute:
        command_name, json_str = cmd["name"], cmd["json_str"]
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
            elif command_name == "UPDATE_NPC":
                if (npc_id := data.pop("id", None)):
                    update_data = {f'npcs.{npc_id}.{key}': value for key, value in data.items()}
                    if update_data:
                        game_state_ref.update(update_data)
                        print(f"  [成功] 已執行 UPDATE_NPC: 更新了 ID 為 {npc_id} 的 NPC。")
            elif command_name == "UPDATE_WORLD":
                update_data = {f'world.{key}': value for key, value in data.items()}
                if update_data:
                    game_state_ref.update(update_data)
                    print(f"  [成功] 已執行 UPDATE_WORLD: 更新了世界狀態。")
            elif command_name == "CREATE_NPC":
                if (npc_id := data.get("id")):
                    game_state_ref.update({f'npcs.{npc_id}': data})
                    print(f"  [成功] 已執行 CREATE_NPC: 創建了 ID 為 {npc_id} 的 NPC。")
            elif command_name == "CREATE_LOCATION":
                if (loc_id := data.get("id")):
                    game_state_ref.update({f'locations.{loc_id}': data})
                    print(f"  [成功] 已執行 CREATE_LOCATION: 創建了 ID 為 {loc_id} 的地點。")
            elif command_name == "ADD_ITEM":
                if "name" in data and "id" in data:
                    game_state_ref.update({'pc_data.inventory.carried': firestore.ArrayUnion([data])})
                    print(f"  [成功] 已執行 ADD_ITEM: 將物品 {data['name']} 加入背包。")
        except Exception as e:
            print(f"  [失敗] 執行指令 {command_name} 時發生錯誤: {e}")
            
    cleaned_text = re.sub(command_pattern, '', ai_raw_text, flags=re.DOTALL).strip()
    return cleaned_text

def parse_narrative_entities(narrative_text, current_state):
    entity_pattern = r'<(\w+)\s+id="([^"]+)">([^<]+)</\1>'
    tag_map = {
        '人物': 'npc', 'npc': 'npc',
        '物品': 'item', 'item': 'item',
        '地點': 'location', 'location': 'location',
    }
    
    parts, last_end = [], 0
    for match in re.finditer(entity_pattern, narrative_text):
        start, end = match.span()
        if start > last_end:
            parts.append({"type": "text", "content": narrative_text[last_end:start]})
        
        tag_name, entity_id, entity_text = match.groups()
        entity_type = tag_map.get(tag_name.lower(), tag_name.lower())
        
        color_class = f"text-entity-{entity_type}"
        # 為未知的 entity type 提供一個通用顏色
        if not tag_map.get(tag_name.lower()):
            color_class = "text-entity-generic" 

        entity_obj = {
            "type": entity_type,
            "id": entity_id,
            "text": entity_text,
            "color_class": color_class
        }
        parts.append(entity_obj)
        last_end = end
        
    if last_end < len(narrative_text):
        parts.append({"type": "text", "content": narrative_text[last_end:]})
        
    return parts if parts else [{"type": "text", "content": narrative_text}]

@app.route('/')
def index():
    return "文字江湖遊戲後端 v2.17 已啟動！(導入新排版規則)"

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
        
        initial_narrative_log = [
            f"你為自己取了個字號，名喚「{nickname}」。",
            "你在一陣劇痛中醒來，發現自己身處一個全然陌生的古裝世界。",
            "腦中殘存的現代記憶和一些不屬於自己的零碎片段讓你明白，你似乎…穿越了。",
            "但這副身體卻虛弱無比，手無縛雞之力。當務之急，是如何在這地方活下去。"
        ]

        initial_world_state = {
            "metadata": { "round": 0, "game_timestamp": "第一天 辰時" },
            "pc_data": {
                "basic_info": { "name": nickname, "height": data.get('height'), "weight": data.get('weight'), "gender": data.get('gender') },
                "core_status": { "hp": {"current": 80, "max": 80}, "mp": {"current": 10, "max": 10}, "sta": {"current": 100, "max": 100}, "san": {"current": 100, "max": 100}, "hunger": {"current": 20, "max": 100}, "thirst": {"current": 20, "max": 100}, "fatigue": {"current": 0, "max": 100} },
                "reputation_and_alignment": { "morality_alignment": {"value": 0.0, "level": "初始"} },
                "inventory": {"carried": [], "stashed": []},
                "attributes": { "str": 5, "agi": 5, "int": 8, "cha": 6, "lck": 7, "wux": 10 },
                "proficiencies": { "fist": {"level": 0, "exp": 0}, "blade": {"level": 0, "exp": 0}, "sword": {"level": 0, "exp": 0}, "hammer": {"level": 0, "exp": 0}, "hidden_weapon": {"level": 0, "exp": 0} }
            },
            "world": { "player_current_location_name": "無名小村 - 破舊的茅草屋", "player_current_location_id": "nameless_village_hut", "weather": "晴", "temperature": 22, "humidity": 65 },
            "narrative_log": initial_narrative_log,
            "npcs": {},
            "locations": {"nameless_village_hut": {"id": "nameless_village_hut", "name": "無名小村 - 破舊的茅草屋", "description": "一間勉強能遮風避雨的茅草屋，屋內空蕩蕩的，只有一張硬板床和一個破了角的陶罐。"}},
            "tracking": {"active_clues": [], "active_rumors": []}
        }
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
        game_state_doc = db.collection('game_sessions').document(session_id).get()
        if not game_state_doc.exists: return jsonify({"error": "找不到遊戲存檔。"}), 404
        game_state = game_state_doc.to_dict()

        collection_key = f"{entity_type}s"
        entity_data = game_state.get(collection_key, {}).get(entity_id)
        
        if not entity_data:
            definition_doc = db.collection('definitions').document(collection_key).get()
            if definition_doc.exists:
                entity_data = definition_doc.to_dict().get("entries", {}).get(entity_id)
        
        if not entity_data:
            entity_data = {"name": entity_id, "description": "關於此事的資訊還籠罩在迷霧之中..."}
            
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
        
        game_state_doc = db.collection('game_sessions').document(session_id).get()
        
        if not game_state_doc.exists:
            print(f"警告：在 get_summary 中找不到 Session ID 為 {session_id} 的遊戲存檔。")
            return jsonify({"error": f"找不到 Session ID 為 {session_id} 的遊戲存檔。"}), 404
            
        game_state = game_state_doc.to_dict()
        narrative_log = game_state.get("narrative_log", [])
        
        if len(narrative_log) <= 4: 
            return jsonify({"summary": "你從昏沉中醒來，在這個陌生的世界裡，一切才剛剛開始..."})
            
        log_text = "\n".join(narrative_log)
        prompt_text = f"""你是一位技藝高超的說書先生。請閱讀以下這段凌亂的江湖日誌，並將其起承轉合梳理成一段引人入勝的「前情提要」。【規則】1. 風格必須是小說旁白，充滿懸念和江湖氣息。2. 必須總結玩家的關鍵行動和處境。3. 最後要對玩家接下來可能的行動方向給出建議。4. 總字數【嚴格限制】在 300 字以內。[江湖日誌]\n{log_text}"""
        headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"}
        payload = {"model": "deepseek-chat", "messages": [{"role": "system", "content": "你是一位技藝高超的說書先生，擅長總結故事並引導後續。"}, {"role": "user", "content": prompt_text}], "max_tokens": 500, "temperature": 0.7}
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        summary_text = response.json()['choices'][0]['message']['content']
        return jsonify({"summary": summary_text})
    except Exception as e: 
        print(f"生成前情提要時發生嚴重錯誤: {str(e)}")
        return jsonify({"error": f"生成前情提要時發生錯誤: {str(e)}"}), 500

@app.route('/api/generate_turn', methods=['POST'])
def generate_turn():
    if not db or not DEEPSEEK_API_KEY: return jsonify({"error": "服務未就緒"}), 503
    try:
        data = request.get_json()
        session_id, player_action = data.get('session_id'), data.get('player_action')
        game_state_ref = db.collection('game_sessions').document(session_id)
        current_state = game_state_ref.get().to_dict()
        
        if not current_state: return jsonify({"error": f"找不到 Session ID 為 {session_id} 的遊戲存檔。"}), 404

        if player_action and player_action.get('id') == 'START':
            options_text = ("\n\n你環顧四周，決定...\n<options>\nA. 檢查一下這副虛弱的身體狀況。\nB. 走出茅草屋，探索一下周遭環境。\nC. 靜下心來，仔細梳理腦中混亂的記憶。\n</options>")
            return jsonify({"narrative": [{"type": "text", "content": options_text}], "state": current_state})

        pc_info = current_state.get('pc_data', {}).get('basic_info', {})
        world_info = current_state.get('world', {})
        recent_log = "\n".join(current_state.get("narrative_log", [])[-5:])
        
        context_summary = f"""
        [當前情境摘要]
        玩家: {pc_info.get('name', '你')} (一個擁有現代知識但身體虛弱的穿越者)
        地點: {world_info.get('player_current_location_name', '未知')}
        天氣: {world_info.get('weather', '未知')}
        最近發生的事: {recent_log}
        """

        prompt_text = f"""
        你是一個頂級的真實人生模擬器，也是一個嚴謹的格式控制大師。

        【核心世界觀與敘事規則】
        1. **平民視角**: 你的敘事【必須】從一個普通人的視角出發。他會餓、會渴、會累、會生病。他不懂武功，也沒有內力。他的首要目標是弄清楚狀況，找到食物和水，確保自己的安全。
        2. **放緩節奏**: 劇情推進【必須】緩慢且合乎邏輯。專注於細節描寫，例如環境的氣味、身體的感受、與普通村民的互動。不要有任何突然的、都合主義的劇情跳躍。
        3. **高手稀有化**: 武林高手、大俠、重要官員等都是【傳說中的存在】。【絕對禁止】讓這些人物在遊戲初期輕易登場。玩家能遇到的只會是村民、獵戶、小混混、行腳商人等普通人。只有當玩家的聲望達到極高水平，並經歷了漫長的冒險後，才【可能】有機會接觸到真正的「江湖」。
        4. **現代知識的應用**: 玩家唯一的優勢是他的現代知識。他可以利用這些知識來解決問題（例如，思考如何淨化水源、製作簡單工具、提出衛生概念），但這需要一個【觀察->思考->嘗試】的過程，而不是瞬間就變出成品。
        5. **預留數值判定**: 當劇情需要角色進行能力判定時，請在描述中插入【文字標籤】作為預留位。例如: `[蠻力檢定]`、`[悟性判定]`、`[速度檢定]`等。

        【AI數據指令規則】
        1. 你【必須】使用 `<標籤類型 id="ID">名稱</標籤類型>` 格式包裹所有實體。
        2. 你【必須】在劇情後用 `[COMMAND: {{...}}]` 來更新數據。

        【**全新排版與內容生成規則**】(必須嚴格遵守)
        1.  **回合標題**: 每次回應的【最開頭】，必須生成一個生動的回合標題，格式為：`【**emoji 本回合標題**】`。例如：`【**🔥 意外的發現**】`。
        2.  **NPC對話格式**: 如果有NPC說話，【必須】使用 `【NPC姓名】：對話內容` 的格式。
        3.  **系統提示**: 如果劇情導致了玩家的屬性、物品、任務發生變化，或有重要的機制層面提醒，你【必須】在主要劇情後另起一行，使用 `[【⚙️ 系統提示】 ... ]` 格式進行說明。
        4.  **感知提示**: 如果劇情觸發了玩家的特殊能力（如現代知識聯想、記憶閃回），你【必須】在主要劇情後另起一行，使用 `[【🧠 感知提示】 ... ]` 格式進行說明。
        5.  **核心處境總結**: 在你生成完所有內容（包括選項）的【最末尾】，你【必須】加上 `【**核心處境**】` 標籤，並用一句話總結玩家當前面臨的最主要挑戰或機遇。
        6.  **提供選項**: 【最重要規則】你【必須總是】提供 3 個合理的行動選項，並用 `<options>` 標籤將它們完整包裹起來。這是絕對的要求，不能遺漏。

        {context_summary}
        [玩家的行動]
        > {player_action.get('text', '無')}
        """
        
        headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"}
        payload = {"model": "deepseek-chat", "messages": [{"role": "system", "content": "你是一個頂級的真實人生模擬器，也是一個嚴謹的格式控制大師。"}, {"role": "user", "content": prompt_text}], "max_tokens": 1500, "temperature": 0.75}
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        ai_raw_narrative = response.json()['choices'][0]['message']['content']
        
        narrative_after_commands = parse_and_execute_ai_commands(ai_raw_narrative, game_state_ref)
        latest_state = game_state_ref.get().to_dict()
        structured_narrative = parse_narrative_entities(narrative_after_commands, latest_state)
        
        plain_text_narrative = "".join([part.get("content", part.get("text", "")) for part in structured_narrative])
        game_state_ref.update({"narrative_log": firestore.ArrayUnion([f"> {player_action.get('text', '')}", plain_text_narrative])})
        
        return jsonify({"narrative": structured_narrative, "state": latest_state})
    except Exception as e:
        print(f"在 generate_turn 中發生錯誤: {e}")
        return jsonify({"error": f"伺服器內部發生未知錯誤: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
