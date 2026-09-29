import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from ..db import get_db
from ..schemas import LoginRequest, RegisterRequest, TokenResponse, User
from ..security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

_USER_COLS = "id, name, email, mobile, client_code, created_at"


def _token_response(db: sqlite3.Connection, user_id: int) -> TokenResponse:
    user = db.execute(f"SELECT {_USER_COLS} FROM users WHERE id = ?", (user_id,)).fetchone()
    token, expires_in = create_access_token(user_id)
    return TokenResponse(access_token=token, expires_in=expires_in, user=User(**dict(user)))


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: sqlite3.Connection = Depends(get_db)):
    if db.execute("SELECT 1 FROM users WHERE email = ?", (body.email,)).fetchone():
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    cur = db.execute(
        "INSERT INTO users(name, email, mobile, client_code, password_hash) VALUES (?,?,?,?,?)",
        (body.name.strip(), body.email.lower(), body.mobile, f"PENDING-{body.email}", hash_password(body.password)),
    )
    user_id = cur.lastrowid
    db.execute("UPDATE users SET client_code = ? WHERE id = ?", (f"TS{user_id:06d}", user_id))
    return _token_response(db, user_id)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT id, password_hash FROM users WHERE email = ?", (body.email,)).fetchone()
    if row is None or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    return _token_response(db, row["id"])


@router.get("/me", response_model=User)
def me(user=Depends(get_current_user)):
    return User(**dict(user))
