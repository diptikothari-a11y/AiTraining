import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from ..db import get_db
from ..schemas import Stock, WatchlistAdd
from ..security import get_current_user
from .market import to_stock

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


@router.get("", response_model=list[Stock])
def get_watchlist(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute(
        "SELECT s.* FROM watchlist w JOIN stocks s ON s.symbol = w.symbol WHERE w.user_id = ? ORDER BY w.added_at, s.symbol",
        (user["id"],),
    )
    return [to_stock(r) for r in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
def add(body: WatchlistAdd, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    symbol = body.symbol.strip().upper()
    if not db.execute("SELECT 1 FROM stocks WHERE symbol = ?", (symbol,)).fetchone():
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown symbol {symbol}")
    db.execute("INSERT OR IGNORE INTO watchlist(user_id, symbol) VALUES (?, ?)", (user["id"], symbol))
    return {"symbol": symbol}


@router.delete("/{symbol}", status_code=status.HTTP_204_NO_CONTENT)
def remove(symbol: str, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    db.execute("DELETE FROM watchlist WHERE user_id = ? AND symbol = ?", (user["id"], symbol.upper()))
