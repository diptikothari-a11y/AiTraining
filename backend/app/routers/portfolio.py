import sqlite3
from collections import defaultdict

from fastapi import APIRouter, Depends

from ..db import get_db
from ..portfolio import build_ledger, pct
from ..schemas import Holding, PortfolioSummary, SectorAllocation
from ..security import get_current_user

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


def load_trades(db: sqlite3.Connection, user_id: int):
    return db.execute(
        "SELECT id, symbol, side, quantity, price, trade_date FROM trades WHERE user_id = ? ORDER BY trade_date, id",
        (user_id,),
    ).fetchall()


def compute_holdings(db: sqlite3.Connection, user_id: int) -> tuple[list[Holding], float]:
    ledger = build_ledger(load_trades(db, user_id))
    open_positions = {s: p for s, p in ledger.positions.items() if p.quantity > 0}
    if not open_positions:
        return [], round(ledger.realised, 2)

    marks = ",".join("?" * len(open_positions))
    stocks = {r["symbol"]: r for r in db.execute(f"SELECT * FROM stocks WHERE symbol IN ({marks})", list(open_positions))}
    total_value = sum(p.quantity * stocks[s]["ltp"] for s, p in open_positions.items())

    holdings = []
    for sym, pos in open_positions.items():
        st = stocks[sym]
        current = pos.quantity * st["ltp"]
        day_change = (st["ltp"] - st["prev_close"]) * pos.quantity
        holdings.append(
            Holding(
                symbol=sym,
                name=st["name"],
                sector=st["sector"],
                quantity=pos.quantity,
                avg_price=round(pos.cost / pos.quantity, 2),
                ltp=st["ltp"],
                prev_close=st["prev_close"],
                invested=round(pos.cost, 2),
                current_value=round(current, 2),
                pnl=round(current - pos.cost, 2),
                pnl_pct=pct(current - pos.cost, pos.cost),
                day_change=round(day_change, 2),
                day_change_pct=pct(st["ltp"] - st["prev_close"], st["prev_close"]),
                weight_pct=pct(current, total_value),
            )
        )
    holdings.sort(key=lambda h: h.current_value, reverse=True)
    return holdings, round(ledger.realised, 2)


@router.get("/holdings", response_model=list[Holding])
def holdings(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    return compute_holdings(db, user["id"])[0]


@router.get("/summary", response_model=PortfolioSummary)
def summary(user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    items, realised = compute_holdings(db, user["id"])
    invested = sum(h.invested for h in items)
    current = sum(h.current_value for h in items)
    day_pnl = sum(h.day_change for h in items)
    prev_value = current - day_pnl

    by_sector: dict[str, float] = defaultdict(float)
    for h in items:
        by_sector[h.sector] += h.current_value
    sectors = sorted(
        (SectorAllocation(sector=s, value=round(v, 2), weight_pct=pct(v, current)) for s, v in by_sector.items()),
        key=lambda s: s.value,
        reverse=True,
    )
    by_return = sorted(items, key=lambda h: h.pnl_pct, reverse=True)

    return PortfolioSummary(
        invested=round(invested, 2),
        current_value=round(current, 2),
        total_pnl=round(current - invested, 2),
        total_pnl_pct=pct(current - invested, invested),
        day_pnl=round(day_pnl, 2),
        day_pnl_pct=pct(day_pnl, prev_value),
        realised_pnl=realised,
        holdings_count=len(items),
        sectors=sectors,
        top_gainers=[h for h in by_return[:3] if h.pnl > 0],
        top_losers=[h for h in reversed(by_return[-3:]) if h.pnl < 0],
    )
