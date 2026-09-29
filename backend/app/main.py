"""FastAPI entrypoint. Run with: uvicorn app.main:app --reload --port 8000"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config, db, seed
from .routers import auth, market, portfolio, trades, watchlist


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    conn = db.connect()
    try:
        seed.seed(conn, with_demo_user=config.SEED_DEMO_USER)
    finally:
        conn.close()
    yield


app = FastAPI(title="Portfolio Management API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

for r in (auth.router, market.router, portfolio.router, trades.router, watchlist.router):
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"status": "ok"}
