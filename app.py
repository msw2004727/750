# 檔名: app.py
# 描述: 文字江湖遊戲後端 Flask 應用程式主檔案 (整合 Firebase 讀寫與進階 AI 指令)
# 版本: 1.1

import os
import json
import re
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

# --- 初始化 Flask 應用 ---
app = Flask(__name__)
CORS(app)

# --- 初始化 Firebase Admin SDK ---
try:
    firebase_creds_str = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
    if not firebase_creds_str:
        raise ValueError("錯誤：環境變數 'FIREBASE_SERVICE_ACCOUNT_KEY' 未設定！")
    
    service_account_info = json.loads(firebase_creds_str)
    cred = credentials.Certificate(service_account_info)

    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred, {
            'projectId': service_account_info.get('project_id'),
        })
    
    db = firestore.client()
    print("Firebase 初始化成功！")
except Exception as e:
    print(f"Firebase 初始化失敗: {e}")
    db = None

# --- AI API 設定 ---
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

# --- 輔助函數：從 AI 回應中解析出結構化數據 ---
def parse_ai_narrative(text):
    """
    一個簡化的解析器，用於從 AI 回應中提取關鍵資訊。
    這部分未來可以做得更複雜、更精確。
    """
    parsed_data = {}
    
    # 解析回合數
    round_match = re.search(r"🎲\s*回合：(\d+)", text)
    if round_match:
        parsed_data['round'] = int(round_match.group(1))

    # 解析狀態速覽 (範例)
    hp_match = re.search(r"❤️\s*HP:\s*([\d\.]+/[\d\.]+)", text)
    if hp_match:
        current, max_val = hp_match.group(1).split('/')
        parsed_data['pc_hp'] = {"current": float(current), "max": float(max_val)}
        
    # 在這裡可以繼續添加對 PC技能成長、評價變化 等區塊的解析邏輯...
    # ...
    
    return parsed_data

# --- Flask 路由設定 ---

@app.route('/')
def index():
    return "文字江湖遊戲後端已啟動！(v1.1 - 已整合資料庫邏輯與進階AI指令)"

@app.route('/api/generate_turn', methods=['POST'])
def generate_turn():
    if not db:
        return jsonify({"error": "資料庫服務未初始化，無法處理請求。"}), 500

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "請求格式錯誤，需要 JSON 內容。"}), 400
        
        player_action = data.get('player_action')
        session_id = data.get('session_id', 'session_azhai_main')

        if not player_action or 'text' not in player_action:
            return jsonify({"error": "請求中未包含有效的玩家行動 'player_action'"}), 400

        # [核心步驟] 1. 從 Firebase 讀取當前的遊戲世界狀態
        game_state_ref = db.collection('game_sessions').document(session_id)
        game_state_doc = game_state_ref.get()
        
        if game_state_doc.exists:
            current_world_state = game_state_doc.to_dict()
        else:
            # 如果是第一次玩，創建一個初始的世界狀態
            return jsonify({"error": f"找不到遊戲存檔: {session_id}。請先執行初始化腳本。"}), 404

        # [核心步驟] 2. 建立 AI 提示 (Prompt)
        
        # --- 這是最新的進階版 System Prompt ---
        system_prompt = """
        你是文字RPG遊戲《文字江湖：黑風寨崛起》的遊戲管理員(Game Master)，一位才華橫溢、精通金庸武俠風格的專業敘事者。你的職責是根據玩家的選擇和遊戲的當前狀態，生成一個生動、真實且合乎邏輯的下一回合。

        你的所有回應，都必須嚴格遵守以下【四大核心指令】：

        ---
        ### 指令一：嚴格遵循輸出格式
        你的每一次回應都必須是一個完整的、未經刪減的文字區塊，且完全遵循【每回合格式排版規則 (standard_round_log_template.ml).ini】檔案中定義的結構。這代表你的回應必須包含以下所有部分，即使某些部分沒有內容也要保留標題：
        - `🎲 回合：`、`🕐 時間：`、`📍 地點：`、`🌦️ 天氣：`、`👥 在場：` 等頂部資訊。
        - `【**本回合標題**】`：用一個 emoji 和一句話精準概括本回合核心事件。
        - **主敘述**：包含玩家行動、NPC反應、環境互動、感官與心理描寫。
        - **可選提示區塊**：如 `[【⚙️ 系統提示】]`、`[【🧠 感知提示/觸發/變化】]` 等。
        - `***` 分隔線後的所有**速覽區塊**，如 `📑 狀態速覽`、`🧱 營寨資源速覽`、`👥 群體士氣/氛圍` 等。
        - `**【核心處境】**`：用一兩句話點明玩家當前面臨的最關鍵問題或機遇。
        - `**你現在打算：**`：提供 3-5 個清晰、具體且合乎當前情境的行動選項。

        ---
        ### 指令二：深度沉浸於世界觀
        你的所有文字創作，從氛圍描述到角色對白，都必須符合【AI GM 指令 - 核心世界觀設定.txt】中定義的「金庸武俠」風格。使用經典詞彙（如內力、經脈、江湖恩怨），遵循古代的計量單位（時辰、里、兩），並體現師徒、輩分、忠義等傳統價值觀。

        ---
        ### 指令三：動態世界生成與數據化輸出 (核心指令)
        當劇情發展需要新的世界元素時，你被賦予【創造權力】。你必須在主敘述文字之外，使用【特殊指令標籤】來定義這些新元素。這是你與資料庫溝通的唯一方式。

        **創造規則：**
        1.  **時機**：僅在玩家探索到未知區域、遇到新人物，或劇情邏輯上必然會產生新事物時才進行創造。
        2.  **格式**：所有創造指令必須使用 `[COMMAND]{...}[/COMMAND]` 的格式，其中 `{...}` 必須是**嚴格的 JSON 格式**。

        **指令範例：**

        * **創造 NPC：`[CREATE_NPC]`**
            ```json
            [CREATE_NPC]
            {
              "id": "npc_wandering_herbalist_01",
              "name": "雲遊郎中",
              "knowledge_levels": {
                "level_1_appearance": {
                  "unlocked": true,
                  "data": { "description": "一位背着藥箱、面容清瘦的中年郎中，風塵僕僕，眼神卻很清亮。" }
                },
                "level_2_background": {
                  "unlocked": false,
                  "unlock_condition": "與之深入交談，並獲得其信任",
                  "data": { "background_summary": "本是太醫局的御醫，因捲入宮廷鬥爭而流落江湖。" }
                }
              }
            }
            [/CREATE_NPC]
            ```

        * **創造地點：`[CREATE_LOCATION]`**
            ```json
            [CREATE_LOCATION]
            {
              "id": "abandoned_shrine_01",
              "name": "荒廢的山神廟",
              "parent_location_id": "deep_forest_sector_3",
              "knowledge_levels": {
                "level_1_overview": {
                  "unlocked": true,
                  "data": { "description": "在森林深處，你發現了一座被藤蔓覆蓋的破廟，散發着不祥的氣息。" }
                },
                "level_2_details": {
                  "unlocked": false,
                  "unlock_condition": "進入廟內仔細探索",
                  "data": { "hidden_feature": "主神像後方有一條通往地下的暗道。" }
                }
              }
            }
            [/CREATE_LOCATION]
            ```

        ---
        ### 指令四：基於上下文進行邏輯推演
        你收到的 `user_prompt` 會包含【當前世界摘要】。你必須基於這份摘要和玩家的最新選擇來進行推演。
        - **連貫性**：確保你的回應與上一回合的【核心處境】和事件結尾緊密相連。
        - **NPC 行為**：NPC 的反應必須符合其性格特質、當前情緒、以及與玩家的關係。一個被你描述為「忠誠務實」的 NPC 不應突然做出背叛的舉動，除非有極其充分的劇情鋪墊。
        - **資源與技能**：嚴格依據世界狀態中的資源和玩家/NPC 的技能來判定行動的結果。玩家沒有鐵礦石，你就不能讓他打造出鐵劍。

        你的目標是成為一個公正、富有想像力且遵守規則的 GM，引導玩家在《黑風寨崛起》的世界中寫下屬於他自己的傳奇。
        """

        # 為了讓 AI 的回應更具連續性，我們將世界狀態摘要加入提示中
        world_summary = f"""
        當前世界摘要：
        - 回合: {current_world_state.get('metadata', {}).get('round', 0)}
        - 時間: {current_world_state.get('world', {}).get('in_game_time', '未知')}
        - 玩家位置: {current_world_state.get('world', {}).get('player_current_location_name', '未知')}
        - 最近的劇情日誌：{" ".join(current_world_state.get("narrative_log", [])[-3:])}
        """
        user_prompt = f"{world_summary}\n\n玩家選擇的行動是：'{player_action['text']}'。\n\n請生成下一回合的完整內容，並在必要時使用指令標籤創造新的世界元素。"

        # 準備請求內容
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
        }

        # 3. 發送請求給 DeepSeek
        api_key = os.environ.get('DEEPSEEK_API_KEY')
        if not api_key:
            return jsonify({"error": "DeepSeek API Key 未設定。"}), 500
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
        
        ai_response_data = response.json()
        next_turn_narrative_raw = ai_response_data['choices'][0]['message']['content']

        # [核心步驟] 4. 解析 AI 回應並更新資料庫
        # (這裡先簡化處理，未來需要一個強大的解析器)
        
        # 提取指令
        commands = re.findall(r"(\[CREATE_NPC\]|\[CREATE_LOCATION\])(.*?)(?:\[/\1\])", next_turn_narrative_raw, re.DOTALL)
        
        cleaned_narrative = next_turn_narrative_raw
        
        @firestore.transactional
        def update_in_transaction(transaction, game_ref):
            # 執行從AI回應中解析出的指令
            for command_tag, command_json_str, _ in commands:
                try:
                    command_data = json.loads(command_json_str.strip())
                    entity_id = command_data.get('id')
                    if command_tag == '[CREATE_NPC]' and entity_id:
                        # 使用 FieldPath 來更新巢狀地圖中的特定鍵
                        transaction.update(game_ref, {f'npcs.{entity_id}': command_data})
                        print(f"指令執行：建立NPC '{entity_id}'")
                    elif command_tag == '[CREATE_LOCATION]' and entity_id:
                        transaction.update(game_ref, {f'locations.{entity_id}': command_data})
                        print(f"指令執行：建立地點 '{entity_id}'")
                except json.JSONDecodeError as e:
                    print(f"警告：解析AI指令失敗 - {e}")
            
            # 移除指令標籤，得到乾淨的敘述文本
            global cleaned_narrative
            cleaned_narrative = re.sub(r"(\[CREATE_NPC\]|\[CREATE_LOCATION\]).*?(?:\[/\1\])", "", next_turn_narrative_raw, flags=re.DOTALL).strip()
            
            # 更新回合數和日誌
            new_round = current_world_state.get("metadata", {}).get("round", 0) + 1
            transaction.update(game_ref, {
                'metadata.round': new_round,
                'narrative_log': firestore.ArrayUnion([f"回合 {new_round}: {player_action['text']}"])
            })

        transaction = db.transaction()
        update_in_transaction(transaction, game_state_ref)

        print(f"已成功處理第 {current_world_state.get('metadata', {}).get('round', 0) + 1} 回合。")

        # 5. 將清理後的敘述返回給前端
        return jsonify({"narrative": cleaned_narrative})

    except requests.exceptions.RequestException as e:
        print(f"錯誤：呼叫 AI 服務失敗 - {e}")
        return jsonify({"error": f"呼叫 AI 服務時發生網路錯誤: {e}"}), 503
    except Exception as e:
        print(f"伺服器內部錯誤: {e}")
        return jsonify({"error": f"伺服器發生未預期的內部錯誤: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
