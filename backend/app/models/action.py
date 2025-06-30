# app/models/action.py
from pydantic import BaseModel
from typing import Literal

class PlayerAction(BaseModel):
    type: Literal['option', 'custom']  # 行動類型：'option'代表選擇選項，'custom'代表手動輸入
    value: str  # 行動的值：如果是選項，這裡是選項ID；如果是手動輸入，這裡是玩家輸入的文字
