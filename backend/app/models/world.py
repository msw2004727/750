# app/models/world.py
from pydantic import BaseModel
import datetime

class WorldState(BaseModel):
    currentTime: datetime.datetime
    currentWeather: str
    currentTemperature: int
