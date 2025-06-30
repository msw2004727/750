# app/api/v1/endpoints/game.py
from fastapi import APIRouter, HTTPException
from app.services.game_service import game_service
from app.models.player import Player
from app.models.world import WorldState

router = APIRouter()

@router.get("/state/{player_id}", response_model=dict)
def get_full_game_state(player_id: str):
    """
    獲取指定玩家的完整遊戲狀態，包含玩家資料和世界狀態。
    """
    player_data = game_service.get_player_data(player_id)
    world_data = game_service.get_world_state()

    if not player_data:
        raise HTTPException(status_code=404, detail=f"Player with ID '{player_id}' not found")
    if not world_data:
        raise HTTPException(status_code=404, detail="World state not found")

    # 使用 Pydantic 模型驗證資料
    validated_player = Player.model_validate(player_data)
    validated_world = WorldState.model_validate(world_data)

    return {
        "player": validated_player.model_dump(),
        "world": validated_world.model_dump()
    }
