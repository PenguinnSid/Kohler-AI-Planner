from pydantic import BaseModel
from typing import List, Dict, Optional


class DesignRequest(BaseModel):
    room_width_ft: float
    room_depth_ft: float
    budget_inr: float = 0
    aesthetic_theme: str = "Minimalist Modern"   # "Minimalist Modern" | "Classic Luxury" | "Japanese Zen"
    cohesion_score: float = 0.8                  # 0.0 = ignore style, 1.0 = strict style match
    categories_needed: List[str] = ["toilet", "toilet_seat", "washbasin", "faucet"]
    bath_section_mode: str = "shower"            # "shower" | "bathtub"
    custom_layout: Optional[Dict[str, Dict[str, float]]] = None  # per-fixture position overrides
