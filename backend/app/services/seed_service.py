import datetime
from app.core.firebase_config import db

class SeedService:
    @staticmethod
    def seed_database():
        print("開始填充資料庫...")
        
        # --- 1. 定義初始資料 ---
        player_ref = db.collection('players').document('player_001')

        # --- 2. 寫入世界和地點 ---
        db.collection('worlds').document('main_world').set({'currentTime': datetime.datetime.now(datetime.timezone.utc), 'currentWeather': "晴朗", 'currentTemperature': 28})
        db.collection('locations').document('blackstone_village_hut').set({"name": "你的茅屋", "description": "一間簡陋但還算乾淨的茅屋..."})
        print(" -> 世界與地點資料已寫入。")

        # --- 3. 寫入玩家主資料 ---
        player_ref.set({
            'name': "阿明", 'appearance': "一個看起來有些迷茫的年輕人。", 'location': "blackstone_village_hut",
            'status': { 'health': 100, 'hunger': 80 },
            'attributes': { 'strength': 10, 'intelligence': 10, 'agility': 10, 'luck': 10 },
            'faction': { 'id': "blackstone_village", 'name': "黑石部落", 'leader': "石山", 'scale': "小型" }
        })
        print(" -> 玩家主資料已寫入。")

        # --- 4. 寫入玩家的子集合資料 ---
        inventory_ref = player_ref.collection('inventory')
        inventory_ref.document('item_glowing_stone').set({'quantity': 1, 'identified': False}) # 預設為未鑑定
        inventory_ref.document('item_worn_clothes').set({'quantity': 1, 'identified': True})  # 衣服預設為已鑑定

        relationships_ref = player_ref.collection('relationships')
        relationships_ref.document('npc_xiao_xi').set({'affinity': 25, 'status': "友善", 'unlocked_backstory_indices': [0]}) # 解鎖第0條背景
        relationships_ref.document('npc_lie_feng').set({'affinity': -15, 'status': "警惕", 'unlocked_backstory_indices': []}) # 尚未解鎖任何背景
        print(" -> 玩家子集合資料已寫入。")

        # --- 5. 寫入世界的「客觀真實」定義 ---
        db.collection('items').document('item_glowing_stone').set({'name': '奇怪的石頭', 'vague_description': '一顆在河邊撿到的、發出微光的石頭。', 'true_description': '蘊含著微弱星辰之力的星輝石，在黑暗中能提供照明。'})
        db.collection('items').document('item_worn_clothes').set({'name': '破舊的布衣', 'vague_description': '身上僅有的衣物。', 'true_description': '一件普通但耐磨的粗麻布衣。'})

        db.collection('npcs').document('npc_xiao_xi').set({'name': '小溪', 'title': '獸皮少女', 'backstory': ["她是部落巫醫的學徒。", "似乎在偷偷練習一種不為人知的草藥學。"]})
        db.collection('npcs').document('npc_lie_feng').set({'name': '烈風', 'title': '獵首', 'backstory': ["他的父親曾是部落的英雄，但在一次狩獵中犧牲。", "他對任何可能威脅部落的外來者都抱有極深的敵意。"]})
        print(" -> 世界的客觀真實定義已寫入。")

        print("資料庫填充完畢！")
        return {"status": "success", "message": "Database seeded with detailed data for Fog of War."}

seed_service = SeedService()
