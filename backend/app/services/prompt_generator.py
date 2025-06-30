import datetime

def generate_prompt(player_data: dict, world_data: dict, action_data: dict) -> str:
    """
    根據當前遊戲狀態和玩家行動，生成一個詳細的、結構化的 Prompt。

    Args:
        player_data (dict): 玩家的資料。
        world_data (dict): 世界的狀態資料。
        action_data (dict): 玩家執行的行動。

    Returns:
        str: 組裝完成，準備發送給 AI 的完整指令。
    """

    # --- 1. 世界情境 ---
    world_time = world_data.get('currentTime', datetime.datetime.now()).strftime('%Y-%m-%d %H:%M')
    world_section = f"""
# 世界情境
- 當前時間: {world_time}
- 當前地點: {player_data.get('location', '未知')}
- 天氣: {world_data.get('currentWeather', '未知')}
"""

    # --- 2. 玩家狀態 ---
    player_section = f"""
# 玩家狀態
- 姓名: {player_data.get('name', '玩家')}
- 狀態: 健康狀況 {player_data.get('status', {}).get('health')}, 飢餓度 {player_data.get('status', {}).get('hunger')}
- 玩家行動: 玩家選擇了 '{action_data.get('value')}'
"""

    # --- 3. NPC 資訊 (未來可擴充) ---
    # TODO: 根據玩家地點，從資料庫讀取在場的 NPC 資訊並加入到 Prompt 中
    npc_section = """
# 在場的 NPC
- (目前此處為空，未來需動態載入)
"""

    # --- 4. 對 AI 的指令與要求 ---
    instruction_section = """
# 你的任務
作為一個富有創意的文字冒險遊戲敘事引擎，請根據以上所有情境：
1.  生成一段生動、符合當前氛圍的故事描述 (story_description)，描述玩家行動後發生的事情。
2.  根據新的劇情，為玩家提供 3 個合理且有趣的行動選項 (options)。
3.  判斷當前場景的整體氛圍 (atmosphere)，例如："緊張", "懸疑", "溫馨", "探索"。
4.  嚴格按照以下 JSON 格式回傳你的創作，不要包含任何 JSON 格式以外的文字或解釋。

```json
{
  "story_description": "這裡是你生成的故事描述...",
  "options": [
    "選項一的文字...",
    "選項二的文字...",
    "選項三的文字..."
  ],
  "atmosphere": "這裡是你判斷的場景氛圍",
  "world_changes": {
    "time_passed_hours": 1,
    "temperature_change": 0
  }
}
# --- 5. 組裝完整的 Prompt ---
full_prompt = f"{world_section}\n{player_section}\n{npc_section}\n{instruction_section}"

print("----------- GENERATED PROMPT -----------")
print(full_prompt)
print("--------------------------------------")

return full_prompt


#### **2. 修改檔案：遊戲服務**
*用以下內容完整覆蓋 `backend/app/services/game_service.py`，讓它呼叫我們新的 Prompt 生成器。*

**檔案: `backend/app/services/game_service.py`**
```python
import json
from app.core.firebase_config import db
from app.models.action import PlayerAction
from app.services.ai_service import ai_service
from app.services.prompt_generator import generate_prompt  # <-- 匯入新的生成器

class GameService:
    @staticmethod
    def get_player_data(player_id: str):
        """從 Firestore 獲取指定玩家的資料"""
        player_ref = db.collection('players').document(player_id)
        player_doc = player_ref.get()
        if player_doc.exists:
            return player_doc.to_dict()
        return None

    @staticmethod
    def get_world_state():
        """從 Firestore 獲取目前的世界狀態"""
        world_ref = db.collection('worlds').document('main_world')
        world_doc = world_ref.get()
        if world_doc.exists:
            return world_doc.to_dict()
        return None

    @staticmethod
    def process_player_action(player_id: str, action: PlayerAction):
        """
        處理玩家行動、呼叫 AI、解析回應，並回傳新的遊戲狀態。
        """
        print(f"接收到玩家 {player_id} 的行動: {action.value}")
        
        player_data = GameService.get_player_data(player_id)
        world_data = GameService.get_world_state()

        if not player_data or not world_data:
            return {"status": "error", "message": "無法獲取遊戲或玩家資料。"}

        # --- 1. 使用新的生成器建立 Prompt ---
        prompt = generate_prompt(player_data, world_data, action.model_dump())
        
        # --- 2. 呼叫 AI 服務 ---
        ai_raw_response = ai_service.generate_narrative(prompt)

        # --- 3. 解析 AI 回應 ---
        try:
            ai_content_str = ai_raw_response['choices'][0]['message']['content']
            ai_data = json.loads(ai_content_str)
            print(f"[PARSER] 成功解析 AI JSON: {ai_data}")
            
            # TODO: 根據 ai_data.world_changes 的內容更新資料庫

        except (json.JSONDecodeError, KeyError, IndexError, TypeError) as e:
            print(f"[ERROR] 解析 AI 回應失敗: {e}")
            return {
                "status": "ai_response_parse_error",
                "message": f"AI 回應格式錯誤，無法處理。錯誤: {e}",
                "next_gamestate": None
            }
        
        # --- 4. 獲取更新後的新遊戲狀態 ---
        new_player_data = GameService.get_player_data(player_id)
        new_world_data = GameService.get_world_state()

        # --- 5. 組合新的遊戲狀態，並加入 AI 生成的內容 ---
        next_gamestate = {
            "player": new_player_data,
            "world": new_world_data,
            "narrative": {
                "description": ai_data.get("story_description", "AI沒有提供故事描述。"),
                "options": ai_data.get("options", []),
                "atmosphere": ai_data.get("atmosphere", "未知")
            }
        }
        
        return {
            "status": "action_processed",
            "message": "已成功處理玩家行動並生成新劇情。",
            "next_gamestate": next_gamestate
        }

game_service = GameService()
