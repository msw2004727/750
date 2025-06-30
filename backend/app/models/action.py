# backend/app/models/action.py
from pydantic import BaseModel, Field
from typing import Literal, Optional

class PlayerAction(BaseModel):
    # 將 'item_action' 加入到允許的 type 列表中
    type: Literal['option', 'custom', 'item_action']
    
    # value 現在可以是可選的，因為 item_action 主要依賴 target_id
    value: str 
    
    # 新增 target_id 欄位，並設為可選 (Optional)
    # 這樣傳統的 option 和 custom 行動就不需要提供此欄位
    target_id: Optional[str] = None

