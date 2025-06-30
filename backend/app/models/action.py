# backend/app/api/v1/endpoints/admin.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/seed-database", response_model=dict)
def seed_database_endpoint():
    """
    執行資料庫填充作業。
    這是一個一次性使用的端點，用來初始化遊戲世界的基礎資料。
    """
    # (新) 將導入語句移動到函式內部
    # 這可以解決循環導入的問題，因為只有在呼叫此 API 時才會執行導入
    from app.services.seed_service import seed_service
    
    return seed_service.seed_database()
