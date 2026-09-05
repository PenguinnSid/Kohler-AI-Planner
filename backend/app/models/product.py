from sqlalchemy import Column, String, Float, JSON, Text
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True)
    sku_code = Column(String, unique=True, nullable=False)
    category = Column(String, nullable=False)
    subcategory = Column(String, nullable=True)
    collection = Column(String, nullable=True)
    model_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price_inr = Column(Float, nullable=False)

    style_tags = Column(JSON, nullable=True)
    width_in = Column(Float, nullable=True)
    depth_in = Column(Float, nullable=True)
    dimension_source = Column(String, default="estimated")
