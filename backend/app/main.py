from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import products, design
from app.database import engine, Base, SessionLocal
from app.models.product import Product
from app.services import seed

app = FastAPI(title="Kohler AI Bathroom Designer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# Seed database on startup
@app.on_event("startup")
def startup_event():
    print("\n" + "="*60)
    print("🚀 Kohler AI Bathroom Designer - Startup Event")
    print("="*60)
    db = SessionLocal()
    try:
        print("📦 Attempting to seed catalogue from CSV...")
        count = seed.seed_from_csv(db)
        if count > 0:
            print(f"✅ Successfully seeded {count} new products")
        else:
            print("✅ Catalogue already seeded (0 new products)")
        
        # Verify products in DB
        total = db.query(Product).count()
        print(f"📊 Total products in database: {total}")
        
    except FileNotFoundError as e:
        print(f"❌ CSV file not found: {e}")
    except Exception as e:
        print(f"⚠️  Seeding error: {type(e).__name__}: {e}")
    finally:
        db.close()
    print("="*60 + "\n")

app.include_router(products.router)
app.include_router(design.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "kohler-ai-bathroom-designer"}


@app.get("/health")
def health():
    """Health check endpoint with database stats"""
    db = SessionLocal()
    try:
        total_products = db.query(Product).count()
        by_category = {}
        for category, in db.query(Product.category).distinct():
            count = db.query(Product).filter(Product.category == category).count()
            by_category[category] = count
        
        return {
            "status": "healthy",
            "total_products": total_products,
            "products_by_category": by_category,
        }
    finally:
        db.close()
