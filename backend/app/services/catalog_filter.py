from sqlalchemy.orm import Session
from app.models.product import Product
from app.schemas.design_request import DesignRequest


def filter_candidates(db: Session, request: DesignRequest) -> dict:
    """
    Stage 2 of the pipeline: filter the catalog down to plausible candidates
    per category, based on budget headroom and rough footprint fit.

    Returns a dict like {"toilet": [Product, ...], "faucet": [Product, ...]}
    for the AI matching stage to reason over.
    """
    per_category_cap = request.budget_inr / max(len(request.categories_needed), 1)

    results = {}
    for category in request.categories_needed:
        query = db.query(Product).filter(Product.category == category)
        # TODO: tighten this — right now it's a simple price ceiling per
        # category as a starting filter, refine once you see real distributions
        query = query.filter(Product.price_inr <= per_category_cap * 1.5)
        results[category] = query.all()

    return results
