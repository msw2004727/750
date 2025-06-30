import datetime

def generate_prompt(player_data: dict, world_data: dict, location_data: dict, action_data: dict) -> str:
    """
    根據當前遊戲狀態和玩家行動，生成一個詳細的、結構化的 Prompt。

    Args:
        player_data (dict): 玩家的資料。
        world_data (dict): 世界的狀態資料。
        location_data (dict): 當前地點的資料。
        action_data (dict): 玩家執行的行動。

    Returns:
        str: 組裝完成，準備發送給 AI 的完整指令。
    """

    # --- 1. 世界情境 ---
    current_time_obj = world_data.get('currentTime')
    # 從 Firestore 的 Timestamp 物件中獲取 datetime 物件
    if isinstance(current_time_obj, datetime.datetime):
        world_time = current_time_obj.strftime('%Y-%m-%d %H:%M')
    else:
        # 如果格式不對，提供一個預設值
        world_time = "時間未知"
    
    # 使用傳入的地點名稱
    location_name = location_data.get('name', '未知地點')

    world_section = f"""
# 世界情境
- 當前時間: {world_time}
- 當前地點: {location_name}
- 地點描述: {location_data.get('description', '周圍一片模糊。')}
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
1.  生成一段生動、符合當前氛圍的故事描述 (story_description)。
2.  根據新的劇情，為玩家提供 3 個合理且有趣的行動選項 (options)。
3.  判斷當前場景的整體氛圍 (atmosphere)。
4.  **[重要]** 根據玩家行動的複雜程度，估算一個合理的流逝時間，並在 `world_changes` 中提供 `time_unit` ("minutes", "hours", "days") 和 `time_amount` (數字)。例如，「環顧四周」可能只需要幾分鐘，「長途旅行」可能需要數小時或數天。
5.  嚴格按照以下 JSON 格式回傳你的創作，不要包含任何 JSON 格式以外的文字或解釋。

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
    "time_unit": "minutes",
    "time_amount": 15,
    "temperature_change": 0
  }
}
```
"""

    # --- 5. 組裝完整的 Prompt ---
    full_prompt = f"{world_section}\n{player_section}\n{npc_section}\n{instruction_section}"
    
    print("----------- GENERATED PROMPT -----------")
    print(full_prompt)
    print("--------------------------------------")
    
    return full_prompt
