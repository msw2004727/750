from fastapi import APIRouter, HTTPException
from app.services.game_service import game_service
from app.models.player import Player
from app.models.world import WorldState
from app.models.action import PlayerAction

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
    
    validated_player = Player.model_validate(player_data)
    validated_world = WorldState.model_validate(world_data)

    return {
        "player": validated_player.model_dump(),
        "world": validated_world.model_dump()
    }

@router.post("/action/{player_id}", response_model=dict)
def perform_action(player_id: str, action: PlayerAction):
    """
    接收並處理玩家的行動指令
    """
    response = game_service.process_player_action(player_id, action)
    if not response:
        raise HTTPException(status_code=500, detail="處理行動時發生錯誤")
    return response
