"""Seed reference data (NIFTY 50 constituents with indicative prices) and an optional demo user."""
import sqlite3
from datetime import date, timedelta

from .security import hash_password

# symbol, name, sector, indicative price (INR). Prices are simulated, not live market data.
STOCKS = [
    ("RELIANCE", "Reliance Industries", "Energy", 1425.50),
    ("TCS", "Tata Consultancy Services", "IT", 3120.00),
    ("HDFCBANK", "HDFC Bank", "Banking", 1965.30),
    ("ICICIBANK", "ICICI Bank", "Banking", 1410.75),
    ("INFY", "Infosys", "IT", 1512.40),
    ("BHARTIARTL", "Bharti Airtel", "Telecom", 1905.60),
    ("SBIN", "State Bank of India", "Banking", 812.25),
    ("ITC", "ITC", "FMCG", 408.90),
    ("LT", "Larsen & Toubro", "Infrastructure", 3620.00),
    ("HINDUNILVR", "Hindustan Unilever", "FMCG", 2515.80),
    ("KOTAKBANK", "Kotak Mahindra Bank", "Banking", 2045.15),
    ("AXISBANK", "Axis Bank", "Banking", 1162.40),
    ("BAJFINANCE", "Bajaj Finance", "Financial Services", 985.60),
    ("MARUTI", "Maruti Suzuki India", "Automobile", 15820.00),
    ("M&M", "Mahindra & Mahindra", "Automobile", 3480.25),
    ("SUNPHARMA", "Sun Pharmaceutical", "Pharma", 1610.90),
    ("HCLTECH", "HCL Technologies", "IT", 1455.35),
    ("TATAMOTORS", "Tata Motors", "Automobile", 685.40),
    ("NTPC", "NTPC", "Power", 342.15),
    ("POWERGRID", "Power Grid Corporation", "Power", 288.60),
    ("ULTRACEMCO", "UltraTech Cement", "Cement", 12240.00),
    ("TITAN", "Titan Company", "Consumer Durables", 3405.70),
    ("ASIANPAINT", "Asian Paints", "Consumer Durables", 2380.45),
    ("WIPRO", "Wipro", "IT", 252.80),
    ("ONGC", "Oil & Natural Gas Corp", "Energy", 238.35),
    ("TATASTEEL", "Tata Steel", "Metals", 168.20),
    ("JSWSTEEL", "JSW Steel", "Metals", 1098.50),
    ("ADANIPORTS", "Adani Ports & SEZ", "Infrastructure", 1402.10),
    ("COALINDIA", "Coal India", "Mining", 385.90),
    ("NESTLEIND", "Nestle India", "FMCG", 1185.25),
    ("DRREDDY", "Dr. Reddy's Laboratories", "Pharma", 1268.40),
    ("CIPLA", "Cipla", "Pharma", 1520.60),
    ("TECHM", "Tech Mahindra", "IT", 1475.20),
    ("BAJAJFINSV", "Bajaj Finserv", "Financial Services", 2010.85),
    ("HDFCLIFE", "HDFC Life Insurance", "Insurance", 765.30),
]

DEMO_EMAIL = "demo@tradesmart.in"
DEMO_PASSWORD = "Demo@1234"

# symbol, side, qty, price, days ago
DEMO_TRADES = [
    ("RELIANCE", "BUY", 40, 1290.00, 320),
    ("TCS", "BUY", 15, 3550.00, 300),
    ("HDFCBANK", "BUY", 50, 1640.00, 280),
    ("INFY", "BUY", 60, 1580.00, 250),
    ("ITC", "BUY", 300, 432.00, 220),
    ("SBIN", "BUY", 120, 745.00, 200),
    ("TATAMOTORS", "BUY", 100, 910.00, 180),
    ("RELIANCE", "BUY", 20, 1380.00, 150),
    ("INFY", "SELL", 20, 1850.00, 120),
    ("SUNPHARMA", "BUY", 35, 1540.00, 90),
    ("BHARTIARTL", "BUY", 25, 1610.00, 60),
    ("TITAN", "BUY", 12, 3280.00, 30),
    ("ITC", "SELL", 100, 470.00, 14),
]


def seed(conn: sqlite3.Connection, with_demo_user: bool) -> None:
    if conn.execute("SELECT COUNT(*) FROM stocks").fetchone()[0] == 0:
        # Deterministic previous close so the dashboard shows a mix of gainers and losers on first run.
        rows = []
        for i, (sym, name, sector, price) in enumerate(STOCKS):
            drift = ((i * 37) % 11 - 5) / 200  # -2.5% .. +2.5%
            rows.append((sym, name, sector, price, round(price / (1 + drift), 2)))
        conn.executemany("INSERT INTO stocks(symbol, name, sector, ltp, prev_close) VALUES (?,?,?,?,?)", rows)

    if with_demo_user and not conn.execute("SELECT 1 FROM users WHERE email = ?", (DEMO_EMAIL,)).fetchone():
        cur = conn.execute(
            "INSERT INTO users(name, email, mobile, client_code, password_hash) VALUES (?,?,?,?,?)",
            ("Demo Investor", DEMO_EMAIL, "9876543210", "TS000001", hash_password(DEMO_PASSWORD)),
        )
        uid = cur.lastrowid
        today = date.today()
        conn.executemany(
            "INSERT INTO trades(user_id, symbol, exchange, side, quantity, price, trade_date) VALUES (?,?,?,?,?,?,?)",
            [(uid, s, "NSE", side, q, p, (today - timedelta(days=d)).isoformat()) for s, side, q, p, d in DEMO_TRADES],
        )
        conn.executemany(
            "INSERT INTO watchlist(user_id, symbol) VALUES (?,?)",
            [(uid, s) for s in ("LT", "KOTAKBANK", "MARUTI", "HCLTECH", "ASIANPAINT")],
        )
    conn.commit()
