import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from ..db import get_db
from ..portfolio import OversellError, build_ledger
from ..schemas import Trade, TradeCreate
from ..security import get_current_user
from .portfolio import load_trades

router = APIRouter(prefix="/api/trades", tags=["trades"])

_SELECT = """
SELECT t.id, t.symbol, s.name, t.exchange, t.side, t.quantity, t.price,
       ROUND(t.quantity * t.price, 2) AS value, t.trade_date
FROM trades t JOIN stocks s ON s.symbol = t.symbol
"""


def _validate_ledger(db: sqlite3.Connection, user_id: int) -> None:
    """Re-plays the full trade history; rejects any change that would sell more than was held."""
    try:
        build_ledger(load_trades(db, user_id))
    except OversellError as e:
        raise HTTPException(422, str(e))


@router.get("", response_model=list[Trade])
def list_trades(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute(_SELECT + " WHERE t.user_id = ? ORDER BY t.trade_date DESC, t.id DESC", (user["id"],))
    return [Trade(**dict(r)) for r in rows]


@router.post("", response_model=Trade, status_code=status.HTTP_201_CREATED)
def create_trade(body: TradeCreate, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    if not db.execute("SELECT 1 FROM stocks WHERE symbol = ?", (body.symbol,)).fetchone():
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown symbol {body.symbol}")
    cur = db.execute(
        "INSERT INTO trades(user_id, symbol, exchange, side, quantity, price, trade_date) VALUES (?,?,?,?,?,?,?)",
        (user["id"], body.symbol, body.exchange, body.side, body.quantity, round(body.price, 2), body.trade_date.isoformat()),
    )
    _validate_ledger(db, user["id"])  # raising here rolls back the insert
    return Trade(**dict(db.execute(_SELECT + " WHERE t.id = ?", (cur.lastrowid,)).fetchone()))


@router.delete("/{trade_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trade(trade_id: int, user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    cur = db.execute("DELETE FROM trades WHERE id = ? AND user_id = ?", (trade_id, user["id"]))
    if cur.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trade not found")
    _validate_ledger(db, user["id"])  # e.g. deleting a BUY that a later SELL depends on
