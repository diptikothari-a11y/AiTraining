from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    from app import config

    monkeypatch.setattr(config, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(config, "SEED_DEMO_USER", False)
    from app.main import app

    with TestClient(app) as c:
        yield c


def register(client, email="asha@example.com"):
    r = client.post(
        "/api/auth/register",
        json={"name": "Asha Rao", "email": email, "mobile": "+91 9812345678", "password": "Secret123"},
    )
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def trade(client, h, side, qty, price, days_ago, symbol="TCS"):
    day = (date.today() - timedelta(days=days_ago)).isoformat()
    return client.post(
        "/api/trades",
        headers=h,
        json={"symbol": symbol, "side": side, "quantity": qty, "price": price, "trade_date": day},
    )


def test_register_login_and_me(client):
    register(client)
    assert client.post("/api/auth/login", json={"email": "asha@example.com", "password": "wrong-pass1"}).status_code == 401
    r = client.post("/api/auth/login", json={"email": "ASHA@example.com", "password": "Secret123"})
    assert r.status_code == 200
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"}).json()
    assert me["mobile"] == "9812345678"
    assert me["client_code"].startswith("TS")


def test_duplicate_email_and_validation(client):
    register(client)
    r = client.post(
        "/api/auth/register",
        json={"name": "X Y", "email": "asha@example.com", "mobile": "9812345678", "password": "Secret123"},
    )
    assert r.status_code == 409
    r = client.post(
        "/api/auth/register",
        json={"name": "X Y", "email": "b@example.com", "mobile": "12345", "password": "short"},
    )
    assert r.status_code == 422


def test_protected_routes_require_token(client):
    assert client.get("/api/portfolio/holdings").status_code == 401
    assert client.get("/api/portfolio/holdings", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_weighted_average_and_realised_pnl(client):
    h = register(client)
    assert trade(client, h, "BUY", 10, 3000, 30).status_code == 201
    assert trade(client, h, "BUY", 10, 3200, 20).status_code == 201
    assert trade(client, h, "SELL", 5, 3500, 10).status_code == 201

    [holding] = client.get("/api/portfolio/holdings", headers=h).json()
    assert holding["quantity"] == 15
    assert holding["avg_price"] == 3100
    assert holding["invested"] == 46500

    summary = client.get("/api/portfolio/summary", headers=h).json()
    assert summary["realised_pnl"] == 2000  # (3500 - 3100) * 5
    assert summary["holdings_count"] == 1


def test_oversell_rejected_and_rolled_back(client):
    h = register(client)
    trade(client, h, "BUY", 5, 3000, 10)
    r = trade(client, h, "SELL", 6, 3100, 5)
    assert r.status_code == 422
    assert len(client.get("/api/trades", headers=h).json()) == 1


def test_sell_dated_before_buy_rejected(client):
    h = register(client)
    trade(client, h, "BUY", 5, 3000, 5)
    assert trade(client, h, "SELL", 5, 3100, 10).status_code == 422


def test_delete_buy_that_sell_depends_on_is_rejected(client):
    h = register(client)
    buy = trade(client, h, "BUY", 5, 3000, 10).json()
    trade(client, h, "SELL", 5, 3100, 5)
    assert client.delete(f"/api/trades/{buy['id']}", headers=h).status_code == 422
    assert len(client.get("/api/trades", headers=h).json()) == 2


def test_users_cannot_see_each_others_trades(client):
    h1 = register(client)
    h2 = register(client, "other@example.com")
    t = trade(client, h1, "BUY", 5, 3000, 10).json()
    assert client.get("/api/trades", headers=h2).json() == []
    assert client.delete(f"/api/trades/{t['id']}", headers=h2).status_code == 404


def test_watchlist_and_tick(client):
    h = register(client)
    assert client.post("/api/watchlist", headers=h, json={"symbol": "m&m"}).status_code == 201
    assert [s["symbol"] for s in client.get("/api/watchlist", headers=h).json()] == ["M&M"]
    assert client.delete("/api/watchlist/M%26M", headers=h).status_code == 204
    assert client.get("/api/watchlist", headers=h).json() == []

    stocks = client.post("/api/market/tick", headers=h).json()
    for s in stocks:
        assert s["prev_close"] * 0.9 - 0.05 <= s["ltp"] <= s["prev_close"] * 1.1 + 0.05


def test_connection_usable_across_threads(tmp_path, monkeypatch):
    """FastAPI runs the get_db dependency and sync endpoints on different threadpool threads."""
    import threading

    from app import config, db

    monkeypatch.setattr(config, "DB_PATH", tmp_path / "t.db")
    conn = db.connect()
    errors = []

    def use():
        try:
            conn.execute("SELECT 1").fetchone()
        except Exception as e:  # pragma: no cover - only on regression
            errors.append(e)

    t = threading.Thread(target=use)
    t.start()
    t.join()
    conn.close()
    assert errors == []
