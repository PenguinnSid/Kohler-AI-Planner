from pydantic import BaseModel
from typing import Optional, List


class ProductOut(BaseModel):
    id: str
    sku_code: str
    category: str
    subcategory: Optional[str] = None
    collection: Optional[str] = None
    model_name: str
    description: Optional[str] = None
    price_inr: float
    style_tags: Optional[List[str]] = None
    width_in: Optional[float] = None
    depth_in: Optional[float] = None

    class Config:
        from_attributes = True
