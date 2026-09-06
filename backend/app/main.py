from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import products, design

app = FastAPI(title="Kohler AI Bathroom Designer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(design.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "kohler-ai-bathroom-designer"}
