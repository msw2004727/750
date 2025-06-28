# 檔名: app.py
# 描述: 文字江湖遊戲後端 Flask 應用程式主檔案

import os
import json
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- 初始化 Flask 應用 ---
# 建立一個 Flask 應用程式實例
app = Flask(__name__)

# 設定 CORS (跨來源資源共用)，允許您的前端 (例如 localhost 或您的遊戲網站)
# 能夠存取這個後端 API。這在開發和生產環境中都非常重要。
CORS(app)

# --- 初始化 Firebase Admin SDK ---
# 這段程式碼會嘗試從環境變數中讀取您的 Firebase 服務帳號金鑰來初始化連線。
# 這是部署到 Render.com 或其他雲端平台的標準作法。
try:
    # Render 會將 JSON 格式的環境變數讀取為一個字串
    firebase_creds_str = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')

    if not firebase_creds_str:
        print("警告：未在環境變數中找到 FIREBASE_SERVICE_ACCOUNT_KEY。")
        # 您也可以在這裡加入從本地檔案讀取金鑰的備用邏輯，方便本地測試
        # 例如：
        # if os.path.exists('path/to/your/local/firebase-credentials.json'):
        #     cred = credentials.Certificate('path/to/your/local/firebase-credentials.json')
        # else:
        #     raise ValueError("Firebase 服務帳號金鑰未設定！")
        raise ValueError("Firebase 服務帳號金鑰未在環境變數中設定！")

    # 將從環境變數讀取的 JSON 字串解析成 Python 字典
    service_account_info = json.loads(firebase_creds_str)

    # 使用解析後的字典資訊來建立 Firebase 憑證物件
    cred = credentials.Certificate(service_account_info)

    # 初始化 Firebase Admin SDK
    firebase_admin.initialize_app(cred, {
        'projectId': service_account_info.get('project_id'),
    })

    # 建立一個 Firestore 資料庫的客戶端物件，用於後續的資料庫操作
    db = firestore.client()
    print("Firebase 初始化成功！")

except Exception as e:
    # 如果初始化失敗，則印出錯誤訊息，並將資料庫物件設為 None
    print(f"Firebase 初始化失敗: {e}")
    db = None

# --- AI API 設定 ---
# DeepSeek 的 API 端點 URL
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

# --- Flask 路由設定 ---

# 根路由，用於健康檢查，確認服務是否成功啟動
@app.route('/')
def index():
    return "文字江湖遊戲後端已成功啟動！"

# 遊戲核心 API 端點，用於處理玩家行動並生成下一回合
@app.route('/api/generate_turn', methods=['POST'])
def generate_turn():
    """
    接收前端發來的玩家行動，呼叫 DeepSeek AI 生成下一回合的遊戲內容，
    並將結果回傳。
    (未來可擴充：在此處加入與 Firebase 的讀寫操作)
    """
    # 檢查 Firebase 是否成功初始化
    if not db:
        return jsonify({"error": "後端資料庫服務未初始化，無法處理請求。"}), 500

    try:
        # 1. 從前端請求的 JSON body 中獲取玩家的行動資料
        data = request.get_json()
        if not data:
            return jsonify({"error": "請求格式錯誤，需要 JSON 內容。"}), 400
        
        player_action = data.get('player_action')
        if not player_action or 'text' not in player_action:
            return jsonify({"error": "請求中未包含有效的玩家行動 'player_action'"}), 400

        # [未來擴充步驟] 2. 從 Firebase 讀取當前的完整遊戲世界狀態
        # game_state_ref = db.collection('games').document('game_session_main')
        # current_world_state = game_state_ref.get().to_dict()
        # if not current_world_state:
        #     # 如果沒有存檔，可以創建一個初始狀態
        #     current_world_state = {"story_log": "遊戲開始..."}
        
        # 3. 準備呼叫 DeepSeek AI
        api_key = os.environ.get('DEEPSEEK_API_KEY')
        if not api_key:
            return jsonify({"error": "DeepSeek API Key 未在環境變數中設定。"}), 500

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        # 建立一個強大的系統提示 (System Prompt)，這是指導 AI 行為的關鍵！
        # 這裡引用了您先前上傳的各種設定檔案名稱，讓 AI 知道它的行為準則。
        system_prompt = """
        你是文字RPG遊戲《文字江湖：黑風寨崛起》的遊戲管理員(Game Master)。你的職責是根據玩家的選擇，基於已有的世界觀、角色數據和劇情模組，生成下一回合的遊戲內容。
        你的回應必須嚴格遵守以下規則：
        1. 格式：完全遵循 '重要_📑 每回合格式排版規則 (standard_round_log_template.ml).ini' 檔案中定義的格式，包含所有必要的區塊，例如【本回合標題】、主敘述、狀態速覽和【核心處境】、【你現在打算：】等。
        2. 世界觀：所有描述、用詞、單位和情節都必須符合 'AI GM 指令 - 核心世界觀設定.txt' 中的金庸武俠風格。
        3. 邏輯：所有事件的發生都必須符合遊戲的內部邏輯，不可憑空產生或違背物理常識。NPC 的反應、技能的判定、資源的變化都應基於其背後的數據。
        4. 劇情推進：根據玩家的行動，自然地推進劇情，並在回合結束時提供 3-5 個合乎情理的、清晰的行動選項 A, B, C...。
        """

        # [未來擴充步驟] 在這裡，您可以將從 Firebase 讀取到的遊戲狀態摘要加入提示中，讓 AI 的回應更貼近當前劇情。
        # 例如:
        # world_summary = f"當前世界狀態摘要: {current_world_state.get('key_plot_summary')}"
        # user_prompt = f"{world_summary}\n\n玩家選擇的行動是：'{player_action['text']}'。\n\n請生成下一回合的完整內容。"

        # 目前的簡化版使用者提示
        user_prompt = f"玩家選擇的行動是：'{player_action['text']}'。\n\n請根據這個行動，生成下一回合的完整遊戲內容。"

        # 準備要傳送給 DeepSeek API 的請求內容
        payload = {
            "model": "deepseek-chat", # 使用 DeepSeek 的對話模型
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "stream": False # 設為 False 來確保一次性獲得完整的回應
        }

        # 4. 發送請求給 DeepSeek API
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=120) # 設定120秒超時
        response.raise_for_status()  # 如果 API 回應錯誤碼 (如 4xx, 5xx)，這會拋出一個異常
        
        ai_response_data = response.json()
        next_turn_content = ai_response_data['choices'][0]['message']['content']

        # [未來擴充步驟] 5. 解析 AI 回應，更新遊戲世界狀態並存回 Firebase
        # new_world_state = parse_ai_response_and_update_state(current_world_state, next_turn_content)
        # game_state_ref.set(new_world_state)

        # 6. 將 AI 生成的完整下一回合內容，以 JSON 格式返回給前端
        return jsonify({"narrative": next_turn_content})

    except requests.exceptions.RequestException as e:
        # 處理網路請求相關的錯誤
        print(f"錯誤：呼叫 AI 服務失敗 - {e}")
        return jsonify({"error": f"呼叫 AI 服務時發生網路錯誤: {e}"}), 503
    except Exception as e:
        # 處理所有其他的未知錯誤
        print(f"伺服器內部錯誤: {e}")
        return jsonify({"error": "伺服器發生未預期的內部錯誤。"}), 500

# 這段程式碼是為了方便在您自己的電腦上直接運行 `python app.py` 來進行測試。
# 當部署到 Render 時，Render 會使用 Gunicorn 來啟動您的應用，而不是執行這一段。
if __name__ == '__main__':
    # 讓 Flask 應用在本地網路上監聽所有 IP，端口號從環境變數讀取，預設為 8080
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
