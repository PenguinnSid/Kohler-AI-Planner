from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.models.product import Product
from app.schemas.product import ProductOut
from app.schemas.design_request import DesignRequest
from app.services.similarity import get_complementary_items
from app.services import layout_generator

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=List[ProductOut])
def list_products(
    category: Optional[str] = None,
    max_price: Optional[float] = Query(None, alias="max_price"),
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if category:
        c_lower = category.lower().strip()
        if c_lower in ["washbasin", "wash_basin", "sink"]:
            query = query.filter(Product.category.in_(["washbasin", "wash_basin"]))
        elif c_lower in ["bathtub", "bath_tub", "bath"]:
            query = query.filter(Product.category.in_(["bathtub", "bath_tub"]))
        elif c_lower in ["towel_arm", "towel_bar", "towel"]:
            query = query.filter(Product.category.in_(["towel_arm", "towel_bar"]))
        elif c_lower in ["toilet", "toilets"]:
            query = query.filter(Product.category.in_(["toilet", "toilet_seat"]))
        else:
            query = query.filter(Product.category.ilike(f"%{c_lower}%"))
    if max_price:
        query = query.filter(Product.price_inr <= max_price)
    return query.all()


@router.get("/{sku_code}/similar")
def similar_products(sku_code: str, db: Session = Depends(get_db)):
    """
    Given a product the user selected while browsing the catalogue, return
    complementary items from other categories that match its style —
    powers the 'browse and get matches' flow on the frontend.
    
    Also returns layout data for visualizing the bundle in 3D space.
    Uses default room dimensions (8ft x 6ft) for the browse flow.
    """
    result = get_complementary_items(db, sku_code)
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")

    # Prepare products dict with anchor + best match from each category
    anchor = result["anchor"]
    products_for_layout = {anchor.category: anchor}
    for category, items in result["recommendations"].items():
        if items:
            products_for_layout[category] = items[0]  # Take the top match
    
    # Use default room dimensions for browse flow
    default_request = DesignRequest(
        room_width_ft=8,
        room_depth_ft=6,
        budget_inr=200000,
        aesthetic_theme="Minimalist Modern",
    )
    
    # Generate layout data
    layout_json = layout_generator.generate_layout(products_for_layout, default_request)

    return {
        "anchor": ProductOut.model_validate(result["anchor"]),
        "recommendations": {
            category: [ProductOut.model_validate(p) for p in items]
            for category, items in result["recommendations"].items()
        },
        "layout": layout_json,
        "room_width_ft": default_request.room_width_ft,
        "room_depth_ft": default_request.room_depth_ft,
    }
