# app/api/v1/endpoints/admin.py
from fastapi import APIRouter
from app.services.seed_service import seed_service

router = APIRouter()

@router.get("/seed-database", response_model=dict)
def seed_database_endpoint():
    """
    執行資料庫填充作業。
    這是一個一次性使用的端點，用來初始化遊戲世界的基礎資料。
    """
    return seed_service.seed_database()
