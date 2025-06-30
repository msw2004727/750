from pydantic import BaseModel, Field
from typing import List, Optional

# --- 新增/修改的模型 ---
class InventoryItem(BaseModel):
    id: str
    name: str
    description: str # 這將是玩家看到的描述 (可能是模糊的)
    quantity: int
    identified: bool # 是否已鑑定

class Relationship(BaseModel):
    id: str
    name: str
    title: str
    affinity: int
    status: str
    unlocked_backstory: List[str] # 玩家已解鎖的背景故事片段

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
    location_name: Optional[str] = None # 加入地點名稱
    faction: PlayerFaction
    inventory: List[InventoryItem] = Field(default_factory=list)
    relationships: List[Relationship] = Field(default_factory=list)
