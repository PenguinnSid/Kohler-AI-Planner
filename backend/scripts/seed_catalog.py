"""
Loads app/data/catalog_seed.csv into the products table (SQLite by default).
Run from backend/: python scripts/seed_catalog.py
"""
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal, engine, Base
from app.services.seed import seed_from_csv


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    count = seed_from_csv(db)
    db.close()
    print(f"Seeded {count} new products.")


if __name__ == "__main__":
    main()
