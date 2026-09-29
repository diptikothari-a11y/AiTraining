# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Copilot, Cursor, etc.) working in this repository.
Humans should start with [README.md](README.md).

## What this is

**TradeSmart PMS** is a portfolio management system for Indian equity investors (NSE/BSE).
Users log in, record buy/sell trades, and see holdings, P&L (overall, day and realised), sector allocation and a watchlist.

| Layer    | Tech                                                                  | Folder      |
| -------- | --------------------------------------------------------------------- | ----------- |
| Frontend | Angular 22 (standalone components, signals, zoneless, Vitest)         | `frontend/` |
| Backend  | Python 3.12, FastAPI, stdlib `sqlite3`, PyJWT                         | `backend/`  |
| Database | SQLite file `backend/portfolio.db` (auto-created and seeded on start) | n/a         |

Market prices are **simulated**: 35 NIFTY 50 stocks seeded with indicative prices, and moved by `POST /api/market/tick`.
There is no live market-data feed. Never present these prices as real quotes.

## Commands

Run all commands from the folder shown.

```bash
# backend/  (first time: python -m venv .venv && .venv/Scripts/pip install -r requirements.txt)
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000   # API at http://localhost:8000, docs at /docs
.venv/Scripts/python -m pytest -q                                   # backend tests (must pass)

# frontend/  (first time: npm install)
npx ng serve            # http://localhost:4200; proxies /api to :8000 via proxy.conf.json
npx ng build            # production build (must be warning-free)
npx ng test --watch=false
```

On macOS/Linux, use `.venv/bin/` instead of `.venv/Scripts/`.
Demo login (seeded when `PMS_SEED_DEMO_USER=1`, the default): `demo@tradesmart.in` / `Demo@1234`.

## Definition of done

Before you say a change is complete:
1. `pytest -q` passes in `backend/`.
2. `ng build` and `ng test --watch=false` pass in `frontend/` with no new warnings.
3. For UI changes, check the page in **light and dark** themes and at **390px** width (no horizontal page scroll).
4. Any new API behaviour has a test in `backend/tests/test_api.py`.

## Architecture

```
backend/app/
  main.py        FastAPI app: CORS, router registration, DB init + seed in lifespan
  config.py      All settings, from PMS_* env vars
  db.py          SQLite schema + get_db() dependency (one connection per request, commit/rollback)
  security.py    PBKDF2 password hashing, JWT create/verify, get_current_user dependency
  portfolio.py   PURE maths: build_ledger() replays trades into positions (weighted-average cost)
  schemas.py     Pydantic request/response models (the API contract)
  seed.py        Stock universe + demo user/trades
  routers/       auth, market, portfolio, trades, watchlist

frontend/src/app/
  core/          models.ts (mirrors schemas.py), api.service.ts, auth.service/guard/interceptor, theme.service
  shared/        format.ts (inr/pct/qty/tone pipes), icon.ts (inline SVG), donut-chart.ts
  layout/shell   Sidebar + topbar (desktop), bottom nav (mobile)
  pages/         auth (login, register), dashboard, holdings, trades, watchlist; all lazy-loaded
```

### Domain rules (don't break these)

- **Holdings are derived, never stored.** They are recomputed from the full trade history (ordered by `trade_date, id`) on every request by `portfolio.build_ledger`.
- **Cost basis is the weighted average.** A SELL books `(sell_price - avg_cost) * qty` into realised P&L and reduces the cost basis at average cost. It does not change the average price of the remaining shares.
- **No short selling.** Any insert or delete that would make a position negative at any point in time is rejected with 422. This check (`_validate_ledger`) runs *after* the write and relies on the exception rolling back the transaction in `get_db`. Keep that ordering.
- **Every query on user data must filter by `user_id`** from `get_current_user`. Never trust a user id from the request body or path.
- **Symbols** are upper-case NSE tickers and may contain `&` (e.g. `M&M`). URL-encode them on the frontend (`encodeURIComponent`).
- **Money** is shown in INR with Indian digit grouping (`₹1,23,456.78`), or compact `L`/`Cr` for headline figures. Use the `inr` pipe; never hand-format.

### API contract

All routes are under `/api` and require `Authorization: Bearer <jwt>`, except `/api/auth/login`, `/api/auth/register` and `/api/health`.
If you change `schemas.py`, update `frontend/src/app/core/models.ts` in the same change.
Errors are FastAPI-style `{"detail": ...}`; the frontend turns them into readable text with `errorMessage()` in `api.service.ts`.

## Conventions

### Backend
- Use raw parameterised SQL with `?` placeholders. **Never build SQL with f-strings from user input.** (The only f-string SQL today is a list of `?` placeholders.)
- Endpoints are sync `def` functions (FastAPI runs them in a threadpool). `db.connect()` uses `check_same_thread=False` because the dependency and the endpoint can run on different threads; don't remove it.
- Settings go in `config.py` and are read from `PMS_*` env vars. Don't hard-code them anywhere else.
- Schema changes: edit `SCHEMA` in `db.py`. There is no migration tool. For destructive changes, tell the user to delete `portfolio.db`.

### Frontend
- Use standalone components, `inject()`, `input()` and signals for state, and the `@if` / `@for` control flow. No NgModules, no `*ngIf`.
- The app is **zoneless**: state that the template reads must be a signal (or come from an event handler). Plain mutable fields will not re-render.
- Query params bind to component inputs (`withComponentInputBinding`), e.g. `/trades?symbol=TCS&side=BUY`.
- Keep pages lazy-loaded in `app.routes.ts`. New authenticated pages go under the shell route's `children`.
- Component styles have an 8 kB hard budget. Put shared styling in `src/styles.scss`.

### Design system (`src/styles.scss`)
- **Only use colour tokens** (`var(--primary)`, `var(--profit)`, `var(--loss)`, `var(--surface)`, `var(--border)`, `var(--text-muted)`, …). No hex values in components. The one exception is the fixed-blue hero surfaces (login hero, dashboard highlight card), which must stay dark enough for white text in both themes.
- Colour meaning follows Indian broker conventions: **green = profit / BUY, red = loss / SELL, blue = primary action / brand**. Always pair colour with a sign (+/−) or label; never rely on colour alone.
- Numbers use the `.num` class (tabular figures) and are right-aligned in tables.
- Reuse existing primitives before adding new ones: `.card`, `.kpi`, `.btn-*`, `.input`, `.field`, `.segmented`, `table.data`, `.badge`, `.chip`, `.alert-*`, `.empty`, `.skeleton`.
- Dark mode: the `data-theme` attribute on `<html>`, set by `ThemeService` (falls back to `prefers-color-scheme`).

## Security notes

- Passwords: PBKDF2-SHA256, 310k iterations, per-user salt (`security.py`). Don't log passwords or tokens.
- `PMS_JWT_SECRET` has a dev default. **Production must set it.** Tokens expire after `PMS_JWT_EXPIRE_MINUTES` (480).
- The token is stored in `localStorage` (simple, but readable by any XSS). Don't add `innerHTML` / `bypassSecurityTrust*`.
- The login page only redirects to in-app paths (`safeReturnUrl`), to prevent open redirects.
- Not yet implemented (candidates for future work): login rate limiting / lockout, refresh tokens, password reset, 2FA/TOTP (SEBI expects 2FA for real broker logins), audit log.

## Known limitations / good next tasks

- Replace simulated prices with a real feed (broker API or licensed vendor). Keep `stocks.ltp` / `prev_close` as the cache.
- Brokerage, STT, GST and stamp duty are not modelled; P&L is gross.
- No corporate actions (splits, bonuses, dividends) and no F&O / mutual funds.
- Tax reports (STCG/LTCG split by holding period) would need FIFO lots in addition to the average cost.
- Every read replays the full trade history. That's fine for thousands of trades; cache per user beyond that.
