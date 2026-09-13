from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.schemas.design_request import DesignRequest
from app.services import catalog_filter, ai_matcher, layout_generator

router = APIRouter(prefix="/design", tags=["design"])


@router.post("/")
def create_design(request: DesignRequest, db: Session = Depends(get_db)):
    # Stage 2: filter catalog by budget/category/fit
    candidates = catalog_filter.filter_candidates(db, request)

    # Stage 3: AI matching + reasoning
    bundle = ai_matcher.match_bundle(candidates, request)

    # Stage 4a: fetch full product objects for the selected items
    selected_products = {}
    for category, selection in bundle.get("selections", {}).items():
        product = db.query(Product).filter(
            Product.sku_code == selection["sku_code"]
        ).first()
        if product:
            selected_products[category] = product

    # Stage 4b: generate 3D layout data
    layout_json = layout_generator.generate_layout(selected_products, request)

    return {
        "bundle": bundle,
        "layout": layout_json,
        "room_width_ft": request.room_width_ft,
        "room_depth_ft": request.room_depth_ft,
    }
