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

# --- 初始化 (無變動) ---
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

# --- 指令解析與輔助函數 (無變動) ---
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
    tag_map = { '人物': 'npc', 'npc': 'npc', '物品': 'item', 'item': 'item', '地點': 'location', 'location': 'location' }
    parts, last_end = [], 0
    for match in re.finditer(entity_pattern, narrative_text):
        start, end = match.span()
        if start > last_end: parts.append({"type": "text", "content": narrative_text[last_end:start]})
        tag_name, entity_id, entity_text = match.groups()
        entity_type = tag_map.get(tag_name.lower(), tag_name.lower())
        color_class = f"text-entity-{entity_type}"
        if not tag_map.get(tag_name.lower()): color_class = "text-entity-generic"
        entity_obj = { "type": entity_type, "id": entity_id, "text": entity_text, "color_class": color_class }
        parts.append(entity_obj)
        last_end = end
    if last_end < len(narrative_text): parts.append({"type": "text", "content": narrative_text[last_end:]})
    return parts if parts else [{"type": "text", "content": narrative_text}]

# --- API 端點 (修改 generate_turn) ---

@app.route('/')
def index():
    return "文字江湖遊戲後端 v2.17 已啟動！(導入新排版規則)"

@app.route('/api/register', methods=['POST'])
def register():
    # ... (省略，無變動)
    return jsonify({"message": "角色創建成功！", "session_id": session_id}), 201

@app.route('/api/login', methods=['POST'])
def login():
    # ... (省略，無變動)
    return jsonify({"message": "登入成功！", "session_id": f"session_{user_doc.id}"}), 200

@app.route('/api/get_entity_info', methods=['POST'])
def get_entity_info():
    # ... (省略，無變動)
    return jsonify({"success": True, "data": entity_data}), 200
    
@app.route('/api/get_summary', methods=['POST'])
def get_summary():
    # ... (省略，無變動)
    return jsonify({"summary": summary_text})

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

        # 【核心修改】整合新的排版規則到AI指令中
        prompt_text = f"""
        你是一個頂級的真實人生模擬器，也是一個嚴謹的格式控制大師。
        【核心世界觀與敘事規則】
        (此處省略平民視角、放緩節奏、高手稀有化、現代知識、預留數值判定等規則...)

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
