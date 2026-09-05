from pydantic import BaseModel
from typing import List


class DesignRequest(BaseModel):
    room_width_ft: float
    room_depth_ft: float
    budget_inr: float
    aesthetic_theme: str          # e.g. "Minimalist Modern", "Classic Luxury", "Japanese Zen"
    categories_needed: List[str] = ["toilet", "washbasin", "faucet", "shower"]
