"""SQLite access layer. Uses the standard library sqlite3 module with one connection per request."""
import sqlite3
from collections.abc import Iterator

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    mobile        TEXT,
    client_code   TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stocks (
    symbol     TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    sector     TEXT NOT NULL,
    ltp        REAL NOT NULL,
    prev_close REAL NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trades (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol     TEXT    NOT NULL REFERENCES stocks(symbol),
    exchange   TEXT    NOT NULL CHECK (exchange IN ('NSE', 'BSE')),
    side       TEXT    NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    price      REAL    NOT NULL CHECK (price > 0),
    trade_date TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id, trade_date, id);

CREATE TABLE IF NOT EXISTS watchlist (
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol   TEXT    NOT NULL REFERENCES stocks(symbol),
    added_at TEXT    NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, symbol)
);
"""


def connect() -> sqlite3.Connection:
    # FastAPI may open the connection (in the dependency) and use it (in a sync endpoint) on different
    # threadpool threads. Each connection still serves exactly one request, so this is safe.
    conn = sqlite3.connect(config.DB_PATH, check_same_thread=False, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def get_db() -> Iterator[sqlite3.Connection]:
    """FastAPI dependency: yields a connection and commits on success."""
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    conn = connect()
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()
