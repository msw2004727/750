import datetime
from app.core.firebase_config import db

class SeedService:
    @staticmethod
    def seed_database():
        print("開始填充資料庫...")
        
        # 1. 寫入世界和地點資料
        db.collection('worlds').document('main_world').set({
            'currentTime': datetime.datetime.now(datetime.timezone.utc),
            'currentWeather': "晴朗",
            'currentTemperature': 28
        })
        db.collection('locations').document('blackstone_village_hut').set({
            "name": "你的茅屋",
            "description": "一間簡陋但還算乾淨的茅屋，位於黑石部落的邊緣。角落裡有一張鋪著乾草的床。"
        })
        print(" -> 世界與地點資料已寫入。")

        # 2. 寫入玩家主資料
        player_ref = db.collection('players').document('player_001')
        player_ref.set({
            'name': "阿明",
            'appearance': "一個看起來有些迷茫的年輕人。",
            'location': "blackstone_village_hut",
            'status': { 'health': 100, 'hunger': 80 },
            'attributes': { 'strength': 10, 'intelligence': 10, 'agility': 10, 'luck': 10 },
            'faction': { 'id': "blackstone_village", 'name': "黑石部落", 'leader': "石山", 'scale': "小型" }
        })
        print(" -> 玩家主資料 (players/player_001) 已寫入。")

        # 3. 寫入初始物品到 inventory 子集合
        inventory_ref = player_ref.collection('inventory')
        inventory_ref.document('item_glowing_stone').set({'quantity': 1})
        inventory_ref.document('item_worn_clothes').set({'quantity': 1})
        print(" -> 玩家初始物品已寫入。")

        # 4. 寫入初始人脈到 relationships 子集合
        relationships_ref = player_ref.collection('relationships')
        relationships_ref.document('npc_xiao_xi').set({'affinity': 25, 'status': "友善"})
        relationships_ref.document('npc_lie_feng').set({'affinity': -15, 'status': "警惕"})
        print(" -> 玩家初始人脈已寫入。")

        # 5. 寫入初始 NPC 與物品定義 (為了讓後端能查詢到詳細資訊)
        db.collection('npcs').document('npc_xiao_xi').set({'name': '小溪', 'title': '獸皮少女'})
        db.collection('npcs').document('npc_lie_feng').set({'name': '烈風', 'title': '獵首'})
        db.collection('items').document('item_glowing_stone').set({'name': '奇怪的石頭', 'description': '一顆發出微光的石頭。'})
        db.collection('items').document('item_worn_clothes').set({'name': '破舊的布衣', 'description': '身上僅有的衣物。'})
        print(" -> 初始 NPC 與物品定義已寫入。")

        print("資料庫填充完畢！")
        return {"status": "success", "message": "Database seeded with detailed data."}

seed_service = SeedService()
