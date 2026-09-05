from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.design_request import DesignRequest
from app.services import catalog_filter, ai_matcher, layout_generator

router = APIRouter(prefix="/design", tags=["design"])


@router.post("/")
def create_design(request: DesignRequest, db: Session = Depends(get_db)):
    # Stage 2: filter catalog by budget/category/fit
    candidates = catalog_filter.filter_candidates(db, request)

    # Stage 3: AI matching + reasoning
    bundle = ai_matcher.match_bundle(candidates, request)

    # Stage 4b: 2D layout
    layout_svg = layout_generator.generate_layout(bundle, request)

    return {
        "bundle": bundle,
        "layout_svg": layout_svg,
    }
