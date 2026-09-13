from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import products, design
from app.database import engine, Base, SessionLocal
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
