import datetime
from app.core.firebase_config import db

class SeedService:
    @staticmethod
    def seed_database():
        print("開始填充資料庫...")
        
        # --- 1. 定義初始資料 ---
        player_ref = db.collection('players').document('player_001')
        game_start_time = datetime.datetime(960, 6, 30, 7, 30, 0, tzinfo=datetime.timezone.utc) # 設定一個固定的宋朝初始時間

        # --- 2. 寫入世界和地點 ---
        db.collection('worlds').document('main_world').set({
            'currentTime': game_start_time, 
            'currentWeather': "晴朗", 
            'currentTemperature': 22
        })
        db.collection('locations').document('blackstone_village_hut').set({"name": "你的茅屋", "description": "一間簡陋但還算乾淨的茅屋，位於黑石村的邊緣。"})
        print(" -> 世界與地點資料已寫入。")

        # --- 3. 寫入玩家主資料 ---
        player_ref.set({
            'name': "阿明", 'appearance': "一個看起來有些迷茫的年輕人。", 'location': "blackstone_village_hut",
            'status': { 'health': 100, 'hunger': 80 },
            'attributes': { 'strength': 10, 'intelligence': 10, 'agility': 10, 'luck': 10 },
            'faction': { 'id': "blackstone_village", 'name': "黑石村", 'leader': "石山", 'scale': "小型村落" }
        })
        print(" -> 玩家主資料已寫入。")

        # --- 4. 寫入玩家的子集合資料 ---
        inventory_ref = player_ref.collection('inventory')
        inventory_ref.document('item_glowing_stone').set({'quantity': 1, 'identified': False})
        inventory_ref.document('item_worn_clothes').set({'quantity': 1, 'identified': True})

        relationships_ref = player_ref.collection('relationships')
        relationships_ref.document('npc_xiao_xi').set({'affinity': 25, 'status': "友善", 'unlocked_backstory_indices': [0]})
        relationships_ref.document('npc_lie_feng').set({'affinity': -15, 'status': "警惕", 'unlocked_backstory_indices': []})
        print(" -> 玩家子集合資料已寫入。")

        # --- 5. 寫入世界的「客觀真實」定義 ---
        db.collection('items').document('item_glowing_stone').set({'name': '奇怪的石頭', 'vague_description': '一顆在河邊撿到的、發出微光的石頭。', 'true_description': '蘊含著微弱星辰之力的星輝石，在黑暗中能提供照明。'})
        db.collection('items').document('item_worn_clothes').set({'name': '破舊的布衣', 'vague_description': '身上僅有的衣物。', 'true_description': '一件普通但耐磨的粗麻布衣。'})

        db.collection('npcs').document('npc_xiao_xi').set({'name': '小溪', 'title': '獸皮少女', 'backstory': ["她是村裡巫醫的學徒。", "似乎在偷偷練習一種不為人知的草藥學。"]})
        db.collection('npcs').document('npc_lie_feng').set({'name': '烈風', 'title': '獵戶頭領', 'backstory': ["他的父親曾是村裡的英雄，但在一次狩獵中犧牲。", "他對任何可能威脅村莊的外來者都抱有極深的敵意。"]})
        print(" -> 世界的客觀真實定義已寫入。")

        print("資料庫填充完畢！")
        return {"status": "success", "message": "Database seeded with detailed data for a village setting."}

seed_service = SeedService()
