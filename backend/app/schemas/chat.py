from typing import List
from pydantic import BaseModel, Field
from app.schemas.design_request import DesignRequest


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1200)
    design: DesignRequest
    selected_skus: List[str] = []
