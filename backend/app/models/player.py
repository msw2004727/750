# app/models/player.py
from pydantic import BaseModel
from typing import Optional

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

class Player(BaseModel):
    name: str
    appearance: str
    status: PlayerStatus
    attributes: PlayerAttributes
    location: str
    faction: PlayerFaction
