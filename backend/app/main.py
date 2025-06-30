# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# 引用 game 和 新的 admin 端點
from app.api.v1.endpoints import game, admin 

app = FastAPI(title="互動文字小說 API")

# 設定 CORS 中介軟體
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含我們的遊戲 API 路由
app.include_router(game.router, prefix="/api/v1/game", tags=["Game"])
# 新增：包含我們的管理員 API 路由
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])


@app.get("/")
def read_root():
    return {"message": "歡迎來到互動文字小說後端 API"}
