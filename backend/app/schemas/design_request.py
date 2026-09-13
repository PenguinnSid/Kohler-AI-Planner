from pydantic import BaseModel
from typing import List, Dict, Optional


class DesignRequest(BaseModel):
    room_width_ft: float
    room_depth_ft: float
    budget_inr: float
    aesthetic_theme: str          # e.g. "Minimalist Modern", "Classic Luxury", "Japanese Zen"
    cohesion_score: float = 0.5   # 0.0 = no cohesion, 0.5 = medium, 1.0 = very high
    categories_needed: List[str] = ["toilet", "toilet_seat", "washbasin", "faucet"]
    custom_layout: Optional[Dict[str, Dict[str, float]]] = None  # e.g. {"toilet": {"x": 12, "y": 12}, "washbasin": {"x": 70, "y": 12}, "bathtub": {"x": 12, "y": 70}}

