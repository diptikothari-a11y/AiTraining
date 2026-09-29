import random
import sqlite3

from fastapi import APIRouter, Depends

from ..db import get_db
from ..portfolio import pct
from ..schemas import Stock
from ..security import get_current_user

router = APIRouter(prefix="/api/market", tags=["market"], dependencies=[Depends(get_current_user)])


def to_stock(row) -> Stock:
    change = row["ltp"] - row["prev_close"]
    return Stock(
        symbol=row["symbol"],
        name=row["name"],
        sector=row["sector"],
        ltp=row["ltp"],
        prev_close=row["prev_close"],
        change=round(change, 2),
        change_pct=pct(change, row["prev_close"]),
    )


@router.get("/stocks", response_model=list[Stock])
def list_stocks(q: str = "", db: sqlite3.Connection = Depends(get_db)):
    like = f"%{q.strip()}%"
    rows = db.execute(
        "SELECT * FROM stocks WHERE symbol LIKE ? OR name LIKE ? ORDER BY symbol", (like, like)
    ).fetchall()
    return [to_stock(r) for r in rows]


@router.post("/tick", response_model=list[Stock])
def simulate_tick(db: sqlite3.Connection = Depends(get_db)):
    """Moves every price by a small random amount (±0.8%), rounded to the NSE tick size of ₹0.05.

    This stands in for a live market-data feed, which would need a licensed vendor.
    """
    rows = db.execute("SELECT symbol, ltp, prev_close FROM stocks").fetchall()
    updates = []
    for r in rows:
        new = r["ltp"] * (1 + random.uniform(-0.008, 0.008))
        # Keep within a ±10% band of previous close, like an exchange price band.
        new = min(max(new, r["prev_close"] * 0.9), r["prev_close"] * 1.1)
        updates.append((round(round(new / 0.05) * 0.05, 2), r["symbol"]))
    db.executemany("UPDATE stocks SET ltp = ?, updated_at = datetime('now') WHERE symbol = ?", updates)
    return [to_stock(r) for r in db.execute("SELECT * FROM stocks ORDER BY symbol").fetchall()]
