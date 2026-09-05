from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.models.product import Product
from app.schemas.product import ProductOut
from app.services.similarity import get_complementary_items

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=List[ProductOut])
def list_products(
    category: Optional[str] = None,
    max_price: Optional[float] = Query(None, alias="max_price"),
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if category:
        query = query.filter(Product.category == category)
    if max_price:
        query = query.filter(Product.price_inr <= max_price)
    return query.all()


@router.get("/{sku_code}/similar")
def similar_products(sku_code: str, db: Session = Depends(get_db)):
    """
    Given a product the user selected while browsing the catalogue, return
    complementary items from other categories that match its style —
    powers the 'browse and get matches' flow on the frontend.
    """
    result = get_complementary_items(db, sku_code)
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")

    return {
        "anchor": ProductOut.model_validate(result["anchor"]),
        "recommendations": {
            category: [ProductOut.model_validate(p) for p in items]
            for category, items in result["recommendations"].items()
        },
    }
