# app/services/seed_service.py
import datetime
from app.core.firebase_config import db

class SeedService:
    @staticmethod
    def seed_database():
        """
        將初始遊戲資料寫入 Firestore。
        如果文件已存在，會直接覆寫。
        """
        print("開始填充資料庫...")
        
        # 1. 寫入世界狀態資料
        world_ref = db.collection('worlds').document('main_world')
        world_ref.set({
            'currentTime': datetime.datetime.now(datetime.timezone.utc),
            'currentWeather': "晴朗",
            'currentTemperature': 28
        })
        print(" -> 世界狀態 (worlds/main_world) 已寫入。")

        # 2. 寫入玩家資料
        player_ref = db.collection('players').document('player_001')
        player_ref.set({
            'name': "阿明",
            'appearance': "一個看起來有些迷茫的年輕人。",
            'location': "blackstone_village_hut",
            'status': {
                'health': 100,
                'hunger': 80
            },
            'attributes': {
                'strength': 10,
                'intelligence': 10,
                'agility': 10,
                'luck': 10
            },
            'faction': {
                'id': "blackstone_village",
                'name': "黑石部落",
                'leader': "石山",
                'scale': "小型"
            }
        })
        print(" -> 玩家資料 (players/player_001) 已寫入。")
        
        # 3. 可以在這裡新增更多 NPC、物品、任務的初始資料...
        
        print("資料庫填充完畢！")
        return {"status": "success", "message": "Database seeded successfully."}

seed_service = SeedService()
