# backend/app/api/v1/endpoints/game.py
from fastapi import APIRouter, HTTPException, Body
from app.services.game_service import game_service
from app.models.player import Player
from app.models.world import WorldState
# 移除頂部的 PlayerAction 導入
# from app.models.action import PlayerAction

router = APIRouter()

@router.get("/state/{player_id}", response_model=dict)
def get_full_game_state(player_id: str):
    """
    獲取指定玩家的完整遊戲狀態，包含玩家資料、世界狀態和在場角色。
    """
    player_data = game_service.get_player_data(player_id)
    world_data = game_service.get_world_state()

    if not player_data:
        raise HTTPException(status_code=404, detail=f"Player with ID '{player_id}' not found")
    if not world_data:
        raise HTTPException(status_code=404, detail="World state not found")
    
    player_location = player_data.get('location')
    scene_characters = game_service.get_scene_characters(player_location, player_id)
    
    validated_player = Player.model_validate(player_data)
    validated_world = WorldState.model_validate(world_data)

    return {
        "player": validated_player.model_dump(),
        "world": validated_world.model_dump(),
        "scene_characters": scene_characters
    }

@router.post("/action/{player_id}", response_model=dict)
# (新) 移除函式簽名中的類型提示，改用 Body 來接收原始字典
def perform_action(player_id: str, action: dict = Body(...)):
    """
    接收並處理玩家的行動指令
    """
    # (新) 將導入和驗證都移動到函式內部
    from app.models.action import PlayerAction
    try:
        # 手動進行 Pydantic 模型驗證
        validated_action = PlayerAction.model_validate(action)
    except Exception as e:
        # 如果驗證失敗，回傳 422 錯誤
        raise HTTPException(status_code=422, detail=f"Invalid action format: {e}")

    response = game_service.process_player_action(player_id, validated_action)
    if not response:
        raise HTTPException(status_code=500, detail="處理行動時發生錯誤")
    return response
