from sqlalchemy import Column, String, Float, JSON, Text, Boolean
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True)
    sku_code = Column(String, unique=True, nullable=False)
    category = Column(String, nullable=False)  # toilet, toilet_seat, washbasin, faucet
    subcategory = Column(String, nullable=True)
    model_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price_inr = Column(Float, nullable=False)

    style_tags = Column(JSON, nullable=True)
    height_in = Column(Float, nullable=True)
    width_in = Column(Float, nullable=True)
    depth_in = Column(Float, nullable=True)
    
    # 3D model tracking
    has_3d_model = Column(Boolean, default=False)
    obj_file_path = Column(String, nullable=True)  # Path to OBJ file relative to backend
