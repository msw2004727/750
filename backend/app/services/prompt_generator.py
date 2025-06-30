# backend/app/services/prompt_generator.py
import datetime
from .prompt_templates import MAIN_GAME_INSTRUCTIONS

def generate_prompt(player_data: dict, world_data: dict, location_data: dict, action_data: dict) -> str:
    """
    根據當前遊戲狀態和玩家行動，組合出完整的 Prompt。
    """

    # --- 1. 組合世界情境 (包含地點 ID) ---
    current_time_obj = world_data.get('currentTime')
    if isinstance(current_time_obj, datetime.datetime):
        shichen = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
        hour = current_time_obj.hour
        shichen_index = ((hour + 1) // 2) % 12
        world_time = f"{current_time_obj.strftime('%Y-%m-%d')} {shichen[shichen_index]}時"
    else:
        world_time = "時間未知"

    location_name = location_data.get('name', '未知地點')
    # (新) 從 player_data 中獲取當前地點的 ID
    location_id = player_data.get('location', 'unknown_location')

    world_section = f"""
# 世界情境
- 世界觀: 中國宋朝
- 當前時間: {world_time}
- 當前地點名稱: {location_name}
- (重要) 當前地點 ID: {location_id}
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

    # --- 3. 組合當前地點的出口資訊 ---
    connections = location_data.get('connections', [])
    if connections:
        connections_text = "\n".join([
            f"- {conn.get('path_description', '一條未知的路')} (風險: {conn.get('travel_risk', '未知')}, 耗時: 約 {conn.get('distance', '?')} 分鐘)"
            for conn in connections
        ])
        connections_section = f"""
# 當前地點的出口
{connections_text}
"""
    else:
        connections_section = """
# 當前地點的出口
- (此處似乎無路可走)
"""

    # --- 4. 組合最終的 Prompt ---
    full_prompt = f"{world_section}\n{player_section}\n{connections_section}\n{MAIN_GAME_INSTRUCTIONS}"

    print("----------- GENERATED PROMPT -----------")
    print(full_prompt)
    print("--------------------------------------")

    return full_prompt
