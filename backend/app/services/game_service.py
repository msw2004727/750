# app/services/game_service.py
from app.core.firebase_config import db

class GameService:
    @staticmethod
    def get_player_data(player_id: str):
        player_ref = db.collection('players').document(player_id)
        player_doc = player_ref.get()
        if player_doc.exists:
            return player_doc.to_dict()
        return None

    @staticmethod
    def get_world_state():
        world_ref = db.collection('worlds').document('main_world')
        world_doc = world_ref.get()
        if world_doc.exists:
            return world_doc.to_dict()
        return None

game_service = GameService()
