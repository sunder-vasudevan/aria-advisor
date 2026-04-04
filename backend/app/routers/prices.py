"""
Price Refresh Router — fetches live NAV/prices and updates holdings.

Sources:
  - Mutual funds (ISIN INF*): AMFI India flat file (daily, free, no key)
  - Crypto (BTC, ETH):        CoinGecko simple price API (INR, no key, ~20s refresh)
  - Stocks (NSE tickers):     yfinance .NS suffix (demo-grade, INR)

Cache: in-process dict, 5-minute TTL. Prevents hammering free-tier APIs.
"""
import time
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from .. import models

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/prices", tags=["prices"])

# ---------------------------------------------------------------------------
# In-process cache: { "BTC": (price_inr, fetched_at), ... }
# ---------------------------------------------------------------------------
_CACHE: dict[str, tuple[float, float]] = {}
_CACHE_TTL = 300  # 5 minutes


def _cached(code: str) -> float | None:
    entry = _CACHE.get(code)
    if entry and (time.time() - entry[1]) < _CACHE_TTL:
        return entry[0]
    return None


def _store(code: str, price: float):
    _CACHE[code] = (price, time.time())


# ---------------------------------------------------------------------------
# Source: AMFI (mutual funds by ISIN)
# ---------------------------------------------------------------------------
_AMFI_CACHE: dict[str, float] = {}
_AMFI_FETCHED_AT: float = 0.0
_AMFI_TTL = 3600  # re-fetch AMFI file at most once per hour


def _fetch_amfi() -> dict[str, float]:
    """Return {isin: nav} for all schemes in the AMFI flat file."""
    global _AMFI_CACHE, _AMFI_FETCHED_AT
    if _AMFI_CACHE and (time.time() - _AMFI_FETCHED_AT) < _AMFI_TTL:
        return _AMFI_CACHE

    import requests
    try:
        resp = requests.get(
            "https://www.amfiindia.com/spages/NAVAll.txt",
            timeout=15,
        )
        resp.raise_for_status()
        result: dict[str, float] = {}
        for line in resp.text.splitlines():
            parts = line.split(";")
            # Format: SchemeCode;ISIN1;ISIN2;SchemeName;NAV;Date
            if len(parts) < 6:
                continue
            isin1, isin2, nav_str = parts[1].strip(), parts[2].strip(), parts[4].strip()
            try:
                nav = float(nav_str)
            except ValueError:
                continue
            if isin1:
                result[isin1] = nav
            if isin2:
                result[isin2] = nav
        _AMFI_CACHE = result
        _AMFI_FETCHED_AT = time.time()
        logger.info("AMFI: loaded %d NAVs", len(result))
        return result
    except Exception as e:
        logger.warning("AMFI fetch failed: %s", e)
        return _AMFI_CACHE  # return stale on failure


# ---------------------------------------------------------------------------
# Source: CoinGecko (crypto in INR)
# ---------------------------------------------------------------------------
_COINGECKO_IDS = {"BTC": "bitcoin", "ETH": "ethereum"}


def _fetch_crypto_inr(codes: list[str]) -> dict[str, float]:
    needed = [c for c in codes if not _cached(c)]
    if not needed:
        return {c: _cached(c) for c in codes}

    import requests
    ids = ",".join(_COINGECKO_IDS[c] for c in needed if c in _COINGECKO_IDS)
    if not ids:
        return {}
    try:
        resp = requests.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": ids, "vs_currencies": "inr"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        result = {}
        for code in needed:
            cg_id = _COINGECKO_IDS.get(code)
            if cg_id and cg_id in data:
                price = float(data[cg_id]["inr"])
                _store(code, price)
                result[code] = price
        # Include cached hits
        for c in codes:
            if c not in result:
                cached = _cached(c)
                if cached:
                    result[c] = cached
        return result
    except Exception as e:
        logger.warning("CoinGecko fetch failed: %s", e)
        return {c: _cached(c) for c in codes if _cached(c)}


# ---------------------------------------------------------------------------
# Source: yfinance (NSE stocks)
# ---------------------------------------------------------------------------
def _fetch_stock_inr(tickers: list[str]) -> dict[str, float]:
    needed = [t for t in tickers if not _cached(t)]
    result = {t: _cached(t) for t in tickers if _cached(t)}
    if not needed:
        return result

    try:
        import yfinance as yf
        ns_tickers = [f"{t}.NS" for t in needed]
        data = yf.download(ns_tickers, period="1d", interval="1d", progress=False, auto_adjust=True)
        close = data["Close"] if "Close" in data else data
        for t, ns in zip(needed, ns_tickers):
            try:
                price = float(close[ns].dropna().iloc[-1])
                _store(t, price)
                result[t] = price
            except Exception:
                pass
        return result
    except Exception as e:
        logger.warning("yfinance fetch failed: %s", e)
        return result


# ---------------------------------------------------------------------------
# Core refresh logic
# ---------------------------------------------------------------------------
def refresh_portfolio_prices(portfolio_id: int, db: Session) -> dict:
    """
    Fetch latest prices for all holdings in a portfolio and update nav_per_unit,
    price_per_unit, and current_value. Returns a summary dict.
    """
    holdings = db.query(models.Holding).filter(
        models.Holding.portfolio_id == portfolio_id
    ).all()

    if not holdings:
        return {"updated": 0, "portfolio_id": portfolio_id}

    # Group by type
    mf_codes = [h.asset_code for h in holdings if h.asset_type == "mutual_fund" and h.asset_code]
    crypto_codes = list({h.asset_code for h in holdings if h.asset_type == "crypto" and h.asset_code})
    stock_codes = list({h.asset_code for h in holdings if h.asset_type == "stock" and h.asset_code})

    # Fetch prices
    amfi_navs = _fetch_amfi() if mf_codes else {}
    crypto_prices = _fetch_crypto_inr(crypto_codes) if crypto_codes else {}
    stock_prices = _fetch_stock_inr(stock_codes) if stock_codes else {}

    updated = 0
    total_value = 0.0

    for h in holdings:
        code = h.asset_code
        new_price = None

        if h.asset_type == "mutual_fund" and code:
            new_price = amfi_navs.get(code)
        elif h.asset_type == "crypto" and code:
            new_price = crypto_prices.get(code)
        elif h.asset_type == "stock" and code:
            new_price = stock_prices.get(code)

        if new_price and new_price > 0:
            h.nav_per_unit = new_price
            h.price_per_unit = new_price
            h.current_value = round((h.units_held or 0) * new_price, 2)
            updated += 1

        total_value += h.current_value or 0

    # Update portfolio total_value
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.id == portfolio_id).first()
    if portfolio:
        portfolio.total_value = round(total_value, 2)

    db.commit()
    return {"updated": updated, "total_holdings": len(holdings), "portfolio_id": portfolio_id, "total_value": round(total_value, 2)}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/refresh/portfolio/{portfolio_id}")
def refresh_by_portfolio(portfolio_id: int, db: Session = Depends(get_db)):
    """Refresh all holding prices for a specific portfolio."""
    result = refresh_portfolio_prices(portfolio_id, db)
    return {"success": True, "data": result}


@router.post("/refresh/client/{client_id}")
def refresh_by_client(client_id: int, db: Session = Depends(get_db)):
    """Refresh holding prices for a client's portfolio."""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.client_id == client_id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    result = refresh_portfolio_prices(portfolio.id, db)
    return {"success": True, "data": result}


@router.post("/refresh/personal/{personal_user_id}")
def refresh_by_personal_user(personal_user_id: int, db: Session = Depends(get_db)):
    """Refresh holding prices for a personal user's portfolio."""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.personal_user_id == personal_user_id
    ).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    result = refresh_portfolio_prices(portfolio.id, db)
    return {"success": True, "data": result}


@router.get("/cache/status")
def cache_status():
    """Show what's currently in the price cache."""
    now = time.time()
    return {
        "entries": [
            {"code": k, "price_inr": v[0], "age_seconds": round(now - v[1])}
            for k, v in _CACHE.items()
        ],
        "amfi_loaded": len(_AMFI_CACHE),
        "amfi_age_seconds": round(now - _AMFI_FETCHED_AT) if _AMFI_FETCHED_AT else None,
    }
