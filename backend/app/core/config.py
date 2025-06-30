# app/core/config.py
import os
from dotenv import load_dotenv

# 從 .env 文件載入環境變數
load_dotenv()

# 雖然目前是空的，但未來所有設定（如 AI 的 API 金鑰）都可以放在這裡
# 例如：OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
