# backend/app/services/seed_service.py
import datetime
from app.core.firebase_config import db
# 移除了 "from app.models.action import PlayerAction" 這一行

class SeedService:
    @staticmethod
    def seed_database():
        print("開始填充資料庫 (包含 NPC 位置)...")
        
        player_ref = db.collection('players').document('player_001')
        game_start_time = datetime.datetime(960, 6, 30, 7, 30, 0, tzinfo=datetime.timezone.utc)

        # --- 寫入世界與地點 ---
        db.collection('worlds').document('main_world').set({
            'currentTime': game_start_time, 
            'currentWeather': "晴朗", 
            'currentTemperature': 22
        })
        db.collection('locations').document('blackstone_village_hut').set({
            "name": "你的茅屋", 
            "description": "一間簡陋但還算乾淨的茅屋，位於黑石村的邊緣。",
            "connections": [
                {
                    "target_location_id": "blackstone_village_center",
                    "distance": 5,
                    "path_description": "走出茅屋，踏上村裡熟悉的泥土路。",
                    "travel_risk": "none"
                }
            ]
        })
        db.collection('locations').document('blackstone_village_center').set({
            "name": "黑石村中心",
            "description": "村子的中心是一個小小的廣場，幾戶人家炊煙裊裊，偶有孩童追逐嬉戲，一位老者在村口的大榕樹下乘涼。",
            "connections": [
                {
                    "target_location_id": "blackstone_village_hut",
                    "distance": 5,
                    "path_description": "沿著泥土路走回村邊。",
                    "travel_risk": "none"
                },
                {
                    "target_location_id": "murky_forest_edge",
                    "distance": 30,
                    "path_description": "離開村莊，沿著一條雜草叢生的小徑向北走去，空氣逐漸變得潮濕起來。",
                    "travel_risk": "low"
                }
            ]
        })
        db.collection('locations').document('murky_forest_edge').set({
            "name": "陰暗森林邊緣",
            "description": "高大的樹木遮蔽了大部分陽光，地上鋪滿了濕滑的苔蘚和腐爛的落葉，不遠處傳來不知名野獸的叫聲。",
            "connections": [
                {
                    "target_location_id": "blackstone_village_center",
                    "distance": 30,
                    "path_description": "你轉過身，沿著來時的小徑向南方的黑石村走去。",
                    "travel_risk": "low"
                }
            ]
        })
        print(" -> 世界與地點資料已寫入。")

        # --- 寫入玩家主資料 ---
        player_ref.set({
            'name': "阿明", 'appearance': "一個看起來有些迷茫的年輕人。", 'location': "blackstone_village_center",
            'status': { 'health': 100, 'hunger': 80 },
            'attributes': { 'strength': 10, 'intelligence': 10, 'agility': 10, 'luck': 10 },
            'faction': { 'id': "blackstone_village", 'name': "黑石村", 'leader': "石山", 'scale': "小型村落" }
        })
        print(" -> 玩家主資料已寫入。")

        # --- 寫入玩家的子集合資料 ---
        inventory_ref = player_ref.collection('inventory')
        inventory_ref.document('item_worn_clothes').set({'quantity': 1, 'identified': True})
        relationships_ref = player_ref.collection('relationships')
        relationships_ref.document('npc_xiao_xi').set({'affinity': 25, 'status': "友善", 'unlocked_backstory_indices': [0]})
        print(" -> 玩家子集合資料已寫入。")

        # --- 寫入世界的「客觀真實」定義 ---
        db.collection('items').document('item_worn_clothes').set({'name': '破舊的布衣', 'true_description': '一件普通但耐磨的粗麻布衣。'})
        
        db.collection('npcs').document('npc_xiao_xi').set({
            'name': '小溪', 
            'title': '村長的孫女', 
            'backstory': ["她是村長的孫女，經常在村子裡幫忙。"],
            'location': 'blackstone_village_center'
        })
        print(" -> 世界的客觀真實定義已寫入。")

        print("資料庫填充完畢！")
        return {"status": "success", "message": "Database seeded with NPC location data."}

seed_service = SeedService()
