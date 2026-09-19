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


@router.post("/allocate")
def allocate_design(request: DesignRequest, db: Session = Depends(get_db)):
    """
    Lightweight allocation endpoint called by the frontend Generate Design button.

    Returns:
    - selections: { category -> { sku_code, justification, product } }
    - total_price_inr
    - recommended_floor_theme: one of the FLOOR_THEME_IDS
    - recommended_wall_theme: one of the WALL_THEME_IDS
    """
    # Stage 2: filter candidates
    candidates = catalog_filter.filter_candidates(db, request)

    # Stage 3: AI bundle matching + surface theme recommendation
    bundle = ai_matcher.match_bundle(candidates, request)

    # Enrich selections with full product data for the frontend
    enriched_selections = {}
    for category, selection in bundle.get("selections", {}).items():
        product = db.query(Product).filter(
            Product.sku_code == selection["sku_code"]
        ).first()
        if product:
            enriched_selections[category] = {
                **selection,
                "product": {
                    "sku_code": product.sku_code,
                    "category": product.category,
                    "subcategory": product.subcategory,
                    "model_name": product.model_name,
                    "description": product.description,
                    "price_inr": product.price_inr,
                    "colour": product.colour,
                    "style_tags": product.style_tags,
                    "width_in": product.width_in,
                    "depth_in": product.depth_in,
                    "height_in": product.height_in,
                    "has_3d_model": product.has_3d_model,
                    "obj_file_path": product.obj_file_path,
                },
            }
        else:
            enriched_selections[category] = selection

    return {
        "selections": enriched_selections,
        "total_price_inr": bundle.get("total_price_inr", 0),
        "recommended_floor_theme": bundle.get("recommended_floor_theme", "marble"),
        "recommended_wall_theme": bundle.get("recommended_wall_theme", "subway"),
    }
