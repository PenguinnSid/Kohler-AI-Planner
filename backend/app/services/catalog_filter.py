from sqlalchemy.orm import Session
from app.models.product import Product
from app.schemas.design_request import DesignRequest


def filter_candidates(db: Session, request: DesignRequest) -> dict:
    """
    Stage 2 of the pipeline: filter the catalog down to plausible candidates
    per category, based on budget headroom and rough footprint fit.

    Returns a dict like {"toilet": [Product, ...], "faucet": [Product, ...]}
    for the AI matching stage to reason over.

    - If budget is 0 or unset, skip price filtering entirely and return all
      products in each category so the LLM can pick purely by style.
    - Otherwise apply a generous 2.5x-per-category price ceiling to leave
      enough room for the LLM to exercise style judgement.
    """
    has_budget = request.budget_inr is not None and request.budget_inr > 0
    num_cats = max(len(request.categories_needed), 1)
    per_category_cap = (request.budget_inr / num_cats) * 2.5 if has_budget else None

    results = {}
    for category in request.categories_needed:
        # Normalise category name variants so DB queries work regardless of
        # whether the frontend sends "washbasin", "wash_basin", etc.
        db_category = category.replace("washbasin", "wash_basin").replace("bathtub", "bath_tub")
        query = db.query(Product).filter(
            Product.category.in_([category, db_category])
        )
        if per_category_cap is not None:
            query = query.filter(Product.price_inr <= per_category_cap)
        products = query.all()

        # Always return at least the cheapest 10 products per category so the
        # LLM has something to reason about even on very tight budgets.
        if has_budget and len(products) == 0:
            fallback = (
                db.query(Product)
                .filter(Product.category.in_([category, db_category]))
                .order_by(Product.price_inr.asc())
                .limit(10)
                .all()
            )
            products = fallback

        results[category] = products

    return results
