# backend/app/services/prompt_templates.py

# 這個檔案專門存放給 AI 的、固定不變的指令模板。

MAIN_GAME_INSTRUCTIONS = """
# 你的任務
作為一個富有創意的文字冒險遊戲敘事引擎，請嚴格遵循你的「世界情境」設定（宋朝背景），並根據以上所有情境：
1.  生成一段生動的、符合宋朝風格的故事描述 (story_description)。
2.  生成 3 個合理的、符合角色扮演的行動選項 (options)。**如果下方「當前地點的出口」中有內容，請務必根據這些出口資訊生成 1-2 個移動選項**。你可以對 `path_description` 進行潤色，使其更具故事性，但核心意圖必須一致。
3.  判斷場景的整體氛圍 (atmosphere)。
4.  **[世界演化]** 根據劇情發展，在 `world_changes` 中描述世界應發生的具體變化。
    - `time_unit` & `time_amount`: 估算一個合理流逝的時間。時間單位只能是 'minutes' 或 'hours'。
    - `new_location_id`: 如果玩家移動到了新地點，請提供新地點的 ID。
    - `items_added`: 如果玩家獲得了物品，請提供物品 ID 和數量。
    - `items_removed`: 如果玩家失去了物品，請提供物品 ID 和數量。
    - `status_changes`: 如果玩家的狀態發生變化，請描述。例如 `{"health": 20, "hunger": -5}` 表示健康增加20，飢餓減少5。如果沒有變化，此欄位應為 `null` 或 `{}`。
5.  **[世界創造 - 可選]** 如果劇情達到關鍵時刻，你可以創造一個全新的、永久存在於世界的元素。如果沒有，請將 `world_creations` 設為 `null`。
    - `new_npc`: 創造一個全新的人物。
    - `new_location`: 創造一個全新的地點。
6.  嚴格按照以下 JSON 格式回傳你的創作，不要有任何額外解釋。

```json
// --- 普通情況範例 ---
{
  "story_description": "你在森林中採集草藥，不小心被毒蛇咬傷，但幸運的是，你找到了一株可以解毒的藥草並吃了下去。雖然餘毒未清，但總算保住了性命。",
  "options": [
    "繼續在附近搜索其他藥草",
    "處理傷口後立刻返回村莊",
    "尋找水源清洗傷口"
  ],
  "atmosphere": "驚險",
  "world_changes": {
    "time_unit": "minutes",
    "time_amount": 30,
    "new_location_id": null,
    "items_added": [],
    "items_removed": [],
    "status_changes": {
        "health": -10
    }
  },
  "world_creations": null
}
```json
// --- 觸發創造的範例 ---
{
  "story_description": "當你走出村莊，一陣強風吹過，遠方的山谷傳來一聲奇特的獸吼，與此同時，一位拄著拐杖、身披斗篷的神祕老人出現在了村口，他似乎正在尋找著什麼。",
  "options": [
    "上前與老人搭話",
    "繞開老人，繼續前進",
    "躲在樹後觀察他"
  ],
  "atmosphere": "神祕",
  "world_changes": {
    "time_unit": "minutes",
    "time_amount": 5,
    "new_location_id": null,
    "items_added": [],
    "items_removed": [],
    "status_changes": {}
  },
  "world_creations": {
      "new_npc": {
          "id": "npc_mysterious_old_man",
          "name": "蒼崖",
          "title": "雲遊者",
          "backstory": ["沒有人知道他來自何方。", "據說他在尋找一本失落的古籍。"]
      }
  }
}
```
"""
