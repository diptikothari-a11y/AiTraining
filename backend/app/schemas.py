"""Request/response models."""
import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    mobile: str = Field(description="10-digit Indian mobile number")
    password: str = Field(min_length=8, max_length=128)

    @field_validator("mobile")
    @classmethod
    def valid_mobile(cls, v: str) -> str:
        v = v.strip().removeprefix("+91").strip()
        if not re.fullmatch(r"[6-9]\d{9}", v):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return v

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if not (re.search(r"[A-Za-z]", v) and re.search(r"\d", v)):
            raise ValueError("Password must contain at least one letter and one number")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    id: int
    name: str
    email: str
    mobile: str | None
    client_code: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: User


class Stock(BaseModel):
    symbol: str
    name: str
    sector: str
    ltp: float
    prev_close: float
    change: float
    change_pct: float


class TradeCreate(BaseModel):
    symbol: str
    exchange: Literal["NSE", "BSE"] = "NSE"
    side: Literal["BUY", "SELL"]
    quantity: int = Field(gt=0, le=1_000_000)
    price: float = Field(gt=0, le=10_000_000)
    trade_date: date

    @field_validator("symbol")
    @classmethod
    def upper_symbol(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("trade_date")
    @classmethod
    def not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Trade date cannot be in the future")
        return v


class Trade(BaseModel):
    id: int
    symbol: str
    name: str
    exchange: str
    side: str
    quantity: int
    price: float
    value: float
    trade_date: str


class Holding(BaseModel):
    symbol: str
    name: str
    sector: str
    quantity: int
    avg_price: float
    ltp: float
    prev_close: float
    invested: float
    current_value: float
    pnl: float
    pnl_pct: float
    day_change: float
    day_change_pct: float
    weight_pct: float


class SectorAllocation(BaseModel):
    sector: str
    value: float
    weight_pct: float


class PortfolioSummary(BaseModel):
    invested: float
    current_value: float
    total_pnl: float
    total_pnl_pct: float
    day_pnl: float
    day_pnl_pct: float
    realised_pnl: float
    holdings_count: int
    sectors: list[SectorAllocation]
    top_gainers: list[Holding]
    top_losers: list[Holding]


class WatchlistAdd(BaseModel):
    symbol: str
