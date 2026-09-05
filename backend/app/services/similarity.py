from sqlalchemy.orm import Session
from app.models.product import Product


def get_complementary_items(db: Session, anchor_sku: str, limit_per_category: int = 3) -> dict | None:
    """
    Given a product the user selected while browsing, recommend items from
    every OTHER category that share its style — building a bundle around
    something the user already likes, rather than starting from budget/room
    inputs. Scoring is simple and explainable: tag overlap + a same-collection
    bonus, no ML model needed.
    """
    anchor = db.query(Product).filter_by(sku_code=anchor_sku).first()
    if not anchor:
        return None

    anchor_tags = set(anchor.style_tags or [])

    categories = [
        row[0] for row in db.query(Product.category).distinct().all()
        if row[0] != anchor.category
    ]

    recommendations = {}
    for category in categories:
        candidates = db.query(Product).filter(Product.category == category).all()
        scored = []
        for p in candidates:
            p_tags = set(p.style_tags or [])
            tag_overlap = len(anchor_tags & p_tags)
            collection_bonus = 1 if (p.collection and p.collection == anchor.collection) else 0
            score = tag_overlap + collection_bonus
            if score > 0:
                scored.append((score, p))
        scored.sort(key=lambda x: x[0], reverse=True)
        recommendations[category] = [p for _, p in scored[:limit_per_category]]

    return {"anchor": anchor, "recommendations": recommendations}
