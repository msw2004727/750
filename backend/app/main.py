# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import game

app = FastAPI(title="互動文字小說 API")

# 設定 CORS 中介軟體，允許前端從任何來源訪問
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生產環境中應指定前端的網域
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含我們的 API 路由
app.include_router(game.router, prefix="/api/v1/game", tags=["Game"])

@app.get("/")
def read_root():
    return {"message": "歡迎來到互動文字小說後端 API"}
