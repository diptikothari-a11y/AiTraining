# TradeSmart PMS: Portfolio Management System

A portfolio tracker for Indian equity investors (NSE/BSE). Built with **Angular 22**, **Python FastAPI** and **SQLite**.

**Features**
- Secure login and registration (JWT, PBKDF2-hashed passwords, validated 10-digit Indian mobile number)
- Dashboard: current value, invested amount, total, day and realised P&L, sector allocation chart, top gainers and losers
- Holdings with weighted-average cost: sortable, searchable, CSV export
- Trade book: record BUY/SELL on NSE/BSE, with overselling blocked
- Watchlist with one-click Buy/Sell
- ₹ amounts in Indian digit grouping (lakh/crore), light/dark theme, mobile layout

> Prices are **simulated** for 35 NIFTY 50 stocks ("Refresh prices" moves them). This is not live market data.

## Prerequisites

- Python 3.11+
- Node.js 20.19+ (tested on Node 24)

## Run it

**1. Backend** (terminal 1)
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

**2. Frontend** (terminal 2)
```bash
cd frontend
npm install
npm start
```
Open http://localhost:4200 and log in with the demo account **demo@tradesmart.in / Demo@1234**, or register a new one.

## Tests

```bash
cd backend && python -m pytest -q
cd frontend && npx ng test --watch=false
```

## Configuration (environment variables)

| Variable                 | Default                    | Purpose                             |
| ------------------------ | -------------------------- | ----------------------------------- |
| `PMS_JWT_SECRET`         | dev value                  | **Set this in production**          |
| `PMS_JWT_EXPIRE_MINUTES` | `480`                      | Session length                      |
| `PMS_DB_PATH`            | `backend/portfolio.db`     | SQLite file location                |
| `PMS_CORS_ORIGINS`       | `http://localhost:4200`    | Comma-separated allowed origins     |
| `PMS_SEED_DEMO_USER`     | `1`                        | Create the demo account on startup  |

To reset all data, stop the backend and delete `backend/portfolio.db`.

See [AGENTS.md](AGENTS.md) for architecture, conventions and domain rules.
