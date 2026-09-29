"""Pure portfolio maths: builds holdings from a user's trade history using weighted-average cost."""
from dataclasses import dataclass, field


class OversellError(ValueError):
    pass


@dataclass
class Position:
    quantity: int = 0
    cost: float = 0.0      # remaining cost basis of the open quantity
    realised: float = 0.0  # booked P&L from sells


@dataclass
class Ledger:
    positions: dict[str, Position] = field(default_factory=dict)

    @property
    def realised(self) -> float:
        return sum(p.realised for p in self.positions.values())


def build_ledger(trades) -> Ledger:
    """`trades` must be ordered by (trade_date, id). Raises OversellError if a sell exceeds holdings."""
    ledger = Ledger()
    for t in trades:
        pos = ledger.positions.setdefault(t["symbol"], Position())
        qty, price = t["quantity"], t["price"]
        if t["side"] == "BUY":
            pos.quantity += qty
            pos.cost += qty * price
        else:
            if qty > pos.quantity:
                raise OversellError(
                    f"Cannot sell {qty} {t['symbol']} on {t['trade_date']}: only {pos.quantity} held on that date"
                )
            avg = pos.cost / pos.quantity
            pos.realised += (price - avg) * qty
            pos.cost -= avg * qty
            pos.quantity -= qty
            if pos.quantity == 0:
                pos.cost = 0.0
    return ledger


def pct(part: float, whole: float) -> float:
    return round(part / whole * 100, 2) if whole else 0.0
