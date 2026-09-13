from pydantic import BaseModel
from typing import Optional, List


class ProductOut(BaseModel):
    id: str
    sku_code: str
    category: str
    subcategory: Optional[str] = None
    model_name: str
    description: Optional[str] = None
    price_inr: float
    style_tags: Optional[List[str]] = None
    height_in: Optional[float] = None
    width_in: Optional[float] = None
    depth_in: Optional[float] = None
    has_3d_model: bool = False
    obj_file_path: Optional[str] = None

    class Config:
        from_attributes = True
