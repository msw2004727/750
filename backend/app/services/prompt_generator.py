# backend/app/services/prompt_generator.py
import datetime
from .prompt_templates import MAIN_GAME_INSTRUCTIONS # 從新檔案導入指令模板

def generate_prompt(player_data: dict, world_data: dict, location_data: dict, action_data: dict) -> str:
    """
    根據當前遊戲狀態和玩家行動，組合出完整的 Prompt。
    """

    # --- 1. 組合世界情境 ---
    current_time_obj = world_data.get('currentTime')
    if isinstance(current_time_obj, datetime.datetime):
        shichen = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
        hour = current_time_obj.hour
        shichen_index = ((hour + 1) // 2) % 12
        world_time = f"{current_time_obj.strftime('%Y-%m-%d')} {shichen[shichen_index]}時"
    else:
        world_time = "時間未知"

    location_name = location_data.get('name', '未知地點')

    world_section = f"""
# 世界情境
- 世界觀: 中國宋朝
- 當前時間: {world_time}
- 當前地點: {location_name}
- 地點描述: {location_data.get('description', '周圍一片模糊。')}
- 天氣: {world_data.get('currentWeather', '未知')}
"""

    # --- 2. 組合玩家狀態 ---
    player_section = f"""
# 玩家狀態
- 姓名: {player_data.get('name', '玩家')}
- 狀態: 健康狀況 {player_data.get('status', {}).get('health')}, 飢餓度 {player_data.get('status', {}).get('hunger')}
- 玩家行動: 玩家選擇了 '{action_data.get('value')}'
"""

    # --- 3. 組合 NPC 資訊 ---
    npc_section = """
# 在場的 NPC
- (目前此處為空，未來需動態載入)
"""

    # --- 4. 組合最終的 Prompt ---
    # 直接使用從 prompt_templates.py 導入的指令
    full_prompt = f"{world_section}\n{player_section}\n{npc_section}\n{MAIN_GAME_INSTRUCTIONS}"

    print("----------- GENERATED PROMPT -----------")
    print(full_prompt)
    print("--------------------------------------")

    return full_prompt
