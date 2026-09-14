import csv
import os

from app.models.product import Product

SEED_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "catalogue.csv")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "3d_files")


def seed_from_csv(db) -> int:
    """Loads catalogue.csv into the products table. Skips rows that
    already exist (by sku_code). Returns the number of new rows inserted."""
    count = 0
    with open(SEED_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sku = row["sku_code"].strip()
            if not sku:
                continue

            cat = row["category"].strip()
            subcat = row.get("subcategory", "").strip() if row.get("subcategory") else None
            col = row.get("colour", "").strip() if row.get("colour") else None

            obj_file = os.path.join(MODELS_DIR, f"{sku}.obj")
            has_3d = os.path.exists(obj_file)
            obj_path = f"3d_files/{sku}.obj" if has_3d else None

            existing = db.query(Product).filter_by(sku_code=sku).first()
            if existing:
                existing.category = cat
                existing.subcategory = subcat
                existing.colour = col
                existing.model_name = row["model_name"].strip()
                existing.description = row.get("description", "").strip() if row.get("description") else None
                existing.price_inr = float(row["price_inr"]) if row.get("price_inr") else existing.price_inr
                if row.get("height_in"): existing.height_in = float(row["height_in"])
                if row.get("width_in"): existing.width_in = float(row["width_in"])
                if row.get("depth_in"): existing.depth_in = float(row["depth_in"])
                if row.get("style_tags"): existing.style_tags = [t.strip() for t in row["style_tags"].split(";")]
                existing.has_3d_model = has_3d
                existing.obj_file_path = obj_path
                continue

            # Check if OBJ file exists for this product
            obj_file = os.path.join(MODELS_DIR, f"{sku}.obj")
            has_3d = os.path.exists(obj_file)
            obj_path = f"3d_files/{sku}.obj" if has_3d else None

            db.add(Product(
                id=sku,
                sku_code=sku,
                category=cat,
                subcategory=subcat,
                model_name=row["model_name"].strip(),
                description=row.get("description", "").strip() or None if row.get("description") else None,
                price_inr=float(row["price_inr"]) if row.get("price_inr") else 0.0,
                style_tags=[t.strip() for t in row["style_tags"].split(";")] if row.get("style_tags") else None,
                height_in=float(row["height_in"]) if row.get("height_in") else None,
                width_in=float(row["width_in"]) if row.get("width_in") else None,
                depth_in=float(row["depth_in"]) if row.get("depth_in") else None,
                colour=col,
                has_3d_model=has_3d,
                obj_file_path=obj_path,
            ))
            count += 1

    db.commit()
    return count
