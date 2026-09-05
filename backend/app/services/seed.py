import csv
import os

from app.models.product import Product

SEED_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "catalog_seed.csv")


def seed_from_csv(db) -> int:
    """Loads catalog_seed.csv into the products table. Skips rows that
    already exist (by sku_code). Returns the number of new rows inserted."""
    count = 0
    with open(SEED_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            existing = db.query(Product).filter_by(sku_code=row["sku_code"]).first()
            if existing:
                continue

            db.add(Product(
                id=row["sku_code"],
                sku_code=row["sku_code"],
                category=row["category"],
                subcategory=row.get("subcategory") or None,
                collection=row.get("collection") or None,
                model_name=row["model_name"],
                description=row.get("description") or None,
                price_inr=float(row["price_inr"]),
                style_tags=row["style_tags"].split(";") if row.get("style_tags") else None,
                width_in=float(row["width_in"]) if row.get("width_in") else None,
                depth_in=float(row["depth_in"]) if row.get("depth_in") else None,
                dimension_source=row.get("dimension_source") or "estimated",
            ))
            count += 1

    db.commit()
    return count
