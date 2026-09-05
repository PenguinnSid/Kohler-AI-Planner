from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.models.product import Product
from app.services.seed import seed_from_csv
from app.routers import products, design

app = FastAPI(title="Kohler AI Bathroom Designer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before any real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(design.router)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    if db.query(Product).count() == 0:
        seed_from_csv(db)
    db.close()


@app.get("/")
def root():
    return {"status": "ok", "service": "kohler-ai-bathroom-designer"}
