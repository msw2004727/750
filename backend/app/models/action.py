# backend/app/models/action.py
from pydantic import BaseModel, Field
from typing import Optional, Literal

class PlayerAction(BaseModel):
    """
    定義玩家可以執行的所有行動的資料結構。
    """
    type: Literal['option', 'custom', 'item_action'] = Field(
        ...,
        description="行動的類型，用於區分是點擊AI選項、自訂輸入，還是與物品互動。"
    )
    value: str = Field(
        ...,
        description="行動的具體內容。對於 'option' 或 'custom'，這是文字描述；對於 'item_action'，這是具體操作，如 'pickup'、'examine'。"
    )
    target_id: Optional[str] = Field(
        default=None,
        description="行動的目標ID，主要用於 'item_action'，以指明操作的是哪個物品。"
    )
