import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Defaults to a local SQLite file so the project runs with zero setup —
# no .env, no cloud credentials needed. Set DATABASE_URL to point at
# Supabase/Postgres instead if you want a real deployment.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kohler.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
