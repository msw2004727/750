from pydantic import BaseModel, Field
from typing import List, Optional

# --- 新增的模型 ---
class InventoryItem(BaseModel):
    id: str
    name: str
    description: str
    quantity: int

class Relationship(BaseModel):
    id: str
    name: str
    title: str
    affinity: int
    status: str
    
# --- 原有的模型 ---
class PlayerStatus(BaseModel):
    health: int
    hunger: int

class PlayerAttributes(BaseModel):
    strength: int
    intelligence: int
    agility: int
    luck: int

class PlayerFaction(BaseModel):
    id: str
    name: str
    leader: str
    scale: str

# --- 修改 Player 主模型 ---
class Player(BaseModel):
    name: str
    appearance: str
    status: PlayerStatus
    attributes: PlayerAttributes
    location: str
    faction: PlayerFaction
    # 新增的欄位，使用 List[] 來定義列表，並給予預設空列表
    inventory: List[InventoryItem] = Field(default_factory=list)
    relationships: List[Relationship] = Field(default_factory=list)
    # memories: List[...] = Field(default_factory=list) # 記憶未來可以依此類推加入
