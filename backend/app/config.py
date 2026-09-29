"""Runtime configuration, read from environment variables with safe dev defaults."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DB_PATH = Path(os.getenv("PMS_DB_PATH", BASE_DIR / "portfolio.db"))
JWT_SECRET = os.getenv("PMS_JWT_SECRET", "dev-only-change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("PMS_JWT_EXPIRE_MINUTES", "480"))
CORS_ORIGINS = os.getenv("PMS_CORS_ORIGINS", "http://localhost:4200").split(",")
SEED_DEMO_USER = os.getenv("PMS_SEED_DEMO_USER", "1") == "1"
