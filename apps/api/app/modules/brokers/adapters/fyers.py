"""
Fyers API v3 adapter (read-only).

Verified against https://fyers.in/api-docs/v3 (2026-11):
- Login: GET /api/v3/generate-authcode?client_id&redirect_uri&response_type=code&state,
  which redirects back with `auth_code` and `state`. Then POST
  /api/v3/validate-authcode {grant_type, appIdHash = sha256("app_id:secret"), code}.
- Auth header: "app_id:access_token". Tokens expire daily at 06:30 IST.
- Envelope: {"s": "ok"|"error", "code", "message", ...}. Codes -8/-15/-16/-17
  mean an invalid or expired token; -429 is the rate limit (more than 3
  per-minute breaches in a day blocks the user until the next day).
- Payloads: funds → fund_limit[{title, equityAmount}]; holdings →
  holdings[{symbol "NSE:X-EQ", quantity, costPrice, ltp, pl, isin}];
  positions → netPositions[{symbol, netQty, netAvg, ltp, pl, productType}];
  tradebook → tradeBook[{tradeNumber, orderNumber, symbol, side 1/-1,
  tradedQty, tradePrice, orderDateTime}].
- No refresh flow that avoids the user's PIN is documented, so the user
  reconnects daily.
- Market data (checked against a live response, 2026-11-09):
  GET /data/quotes?symbols=A,B (≤50) → d[{n, s, v:{lp, ch, chp, open_price,
  high_price, low_price, prev_close_price, volume, tt}}];
  GET /data/history?symbol&resolution&date_format=0&range_from&range_to&cont_flag=1
  → candles[[epoch, o, h, l, c, v]]. A request may span about 100 days of
  intraday or 366 days of daily candles.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

from app.core.config import get_settings
from app.modules.brokers.adapters.base import (
    IST,
    AppCredentials,
    BrokerAdapter,
    BrokerAuthExpired,
    BrokerCandle,
    BrokerError,
    BrokerFunds,
    BrokerHolding,
    BrokerPosition,
    BrokerProfile,
    BrokerQuote,
    BrokerTrade,
    CallbackResult,
    TokenBundle,
    next_morning_ist,
    to_float,
)

BASE = "https://api-t1.fyers.in/api/v3"
DATA_BASE = "https://api-t1.fyers.in/data"
EXPIRED_CODES = {-8, -15, -16, -17}
QUOTES_PER_CALL = 50
# Longest span one history request may cover, kept a little inside the limits.
HISTORY_WINDOW = {"D": timedelta(days=365)}
INTRADAY_WINDOW = timedelta(days=99)


def parse_fyers_time(value: str) -> datetime:
    """The docs show both "07-Aug-2020 13:51:12" and "07-08-2020 13:51:12" (IST)."""
    for fmt in ("%d-%b-%Y %H:%M:%S", "%d-%m-%Y %H:%M:%S"):
        try:
            return datetime.strptime(value.strip(), fmt).replace(tzinfo=IST)
        except ValueError:
            continue
    raise BrokerError(f"Unrecognised Fyers time: {value!r}")


class FyersAdapter(BrokerAdapter):
    name = "fyers"
    label = "Fyers"

    needs_secret = True
    supports_market_data = True

    @staticmethod
    def platform_credentials() -> Optional[AppCredentials]:
        s = get_settings()
        if s.FYERS_APP_ID and s.FYERS_SECRET_ID:
            return AppCredentials(app_id=s.FYERS_APP_ID, app_secret=s.FYERS_SECRET_ID)
        return None

    def _app_id(self) -> str:
        return self.credentials().app_id

    def login_url(self, state: str, redirect_uri: str) -> str:
        query = urlencode(
            {
                "client_id": self._app_id(),
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "state": state,
            }
        )
        return f"{BASE}/generate-authcode?{query}"

    async def complete_login(self, params: dict, redirect_uri: str) -> CallbackResult:
        code = params.get("auth_code") or params.get("code")
        if not code:
            raise BrokerError(params.get("message") or "Fyers didn't return an auth code")
        app_id = self._app_id()
        app_hash = hashlib.sha256(f"{app_id}:{self.credentials().app_secret}".encode()).hexdigest()
        http = await self._http()
        response = await http.post(
            f"{BASE}/validate-authcode",
            json={"grant_type": "authorization_code", "appIdHash": app_hash, "code": code},
        )
        payload = response.json()
        if "app id hash" in str(payload.get("message", "")).lower():
            # The secret doesn't match this app (often regenerated in the
            # Fyers dashboard but not updated here).
            raise BrokerError(
                "Fyers rejected the app secret. Check that the Secret ID matches "
                "this App ID in the Fyers API dashboard, then connect again."
            )
        body = self._check(payload)
        return CallbackResult(
            tokens=TokenBundle(
                access_token=body["access_token"],
                refresh_token=body.get("refresh_token"),
                expires_at=next_morning_ist(6, 30),
            ),
            state=params.get("state"),
        )

    @staticmethod
    def _check(body: dict) -> dict:
        if body.get("s") == "ok":
            return body
        code = body.get("code")
        message = body.get("message") or "Fyers request failed"
        if code in EXPIRED_CODES:
            raise BrokerAuthExpired("Your Fyers session has ended. Reconnect to continue.")
        if code == -429:
            raise BrokerError("Fyers rate limit reached. Try again in a minute.")
        raise BrokerError(message)

    async def _get(
        self, tokens: TokenBundle, path: str, params: Optional[dict] = None, base: str = BASE
    ) -> dict:
        http = await self._http()
        response = await http.get(
            f"{base}{path}",
            params=params,
            headers={"Authorization": f"{self._app_id()}:{tokens.access_token}"},
        )
        if response.status_code == 401:
            raise BrokerAuthExpired("Your Fyers session has ended. Reconnect to continue.")
        body = response.json()
        if body.get("s") == "no_data":  # history for a range with no trading
            return {"s": "ok", "candles": []}
        return self._check(body)

    async def profile(self, tokens: TokenBundle) -> BrokerProfile:
        data = (await self._get(tokens, "/profile")).get("data", {})
        return BrokerProfile(broker_user_id=str(data.get("fy_id", "")), name=data.get("name"))

    async def funds(self, tokens: TokenBundle) -> BrokerFunds:
        rows = {
            str(r.get("title", "")).lower(): to_float(r.get("equityAmount"))
            for r in (await self._get(tokens, "/funds")).get("fund_limit", [])
        }
        return BrokerFunds(
            available_cash=rows.get("available balance"),
            used_margin=rows.get("utilized amount"),
            net=rows.get("total balance"),
        )

    async def holdings(self, tokens: TokenBundle) -> list[BrokerHolding]:
        return [
            BrokerHolding(
                symbol=h["symbol"],
                exchange="NSE" if str(h["symbol"]).startswith("NSE:") else "BSE",
                quantity=to_float(h.get("quantity")) or 0.0,
                average_price=to_float(h.get("costPrice")) or 0.0,
                last_price=to_float(h.get("ltp")),
                pnl=to_float(h.get("pl")),
                isin=h.get("isin"),
            )
            for h in (await self._get(tokens, "/holdings")).get("holdings", [])
            if h.get("symbol")
        ]

    async def positions(self, tokens: TokenBundle) -> list[BrokerPosition]:
        return [
            BrokerPosition(
                symbol=p["symbol"],
                exchange="NSE" if str(p["symbol"]).startswith("NSE:") else "BSE",
                product=str(p.get("productType", "")),
                net_quantity=to_float(p.get("netQty")) or 0.0,
                average_price=to_float(p.get("netAvg")) or 0.0,
                last_price=to_float(p.get("ltp")),
                pnl=to_float(p.get("pl")),
                realized_pnl=to_float(p.get("realized_profit")),
            )
            for p in (await self._get(tokens, "/positions")).get("netPositions", [])
            if p.get("symbol")
        ]

    async def trades(self, tokens: TokenBundle) -> list[BrokerTrade]:
        result: list[BrokerTrade] = []
        for t in (await self._get(tokens, "/tradebook")).get("tradeBook", []):
            side = {1: "BUY", -1: "SELL"}.get(int(t.get("side", 0)))
            if not side or not t.get("symbol"):
                continue
            result.append(
                BrokerTrade(
                    trade_id=str(t.get("tradeNumber") or t.get("row")),
                    order_id=str(t.get("orderNumber", "")),
                    symbol=t["symbol"],
                    exchange="NSE" if str(t["symbol"]).startswith("NSE:") else "BSE",
                    side=side,
                    quantity=to_float(t.get("tradedQty")) or 0.0,
                    price=to_float(t.get("tradePrice")) or 0.0,
                    filled_at=parse_fyers_time(str(t.get("orderDateTime", ""))),
                    product=t.get("productType"),
                )
            )
        return result

    # ---------------------------------------------------------------- market data

    def market_symbol(
        self, symbol: str, exchange: str = "NSE", instrument_type: str = "EQUITY"
    ) -> Optional[str]:
        from app.modules.brokers.symbols import to_fyers_symbol

        return to_fyers_symbol(symbol, exchange, instrument_type)

    async def quotes(self, tokens: TokenBundle, symbols: list[str]) -> list[BrokerQuote]:
        result: list[BrokerQuote] = []
        unique = list(dict.fromkeys(symbols))
        for i in range(0, len(unique), QUOTES_PER_CALL):
            chunk = unique[i : i + QUOTES_PER_CALL]
            body = await self._get(tokens, "/quotes", {"symbols": ",".join(chunk)}, base=DATA_BASE)
            for row in body.get("d", []):
                v = row.get("v") or {}
                price = to_float(v.get("lp"))
                if row.get("s") != "ok" or price is None:
                    continue  # unknown symbol: the caller falls back
                tt = to_float(v.get("tt"))
                result.append(
                    BrokerQuote(
                        symbol=str(row.get("n") or v.get("symbol")),
                        price=price,
                        change=to_float(v.get("ch")) or 0.0,
                        change_percent=to_float(v.get("chp")) or 0.0,
                        open=to_float(v.get("open_price")),
                        high=to_float(v.get("high_price")),
                        low=to_float(v.get("low_price")),
                        previous_close=to_float(v.get("prev_close_price")),
                        volume=int(to_float(v.get("volume")) or 0),
                        timestamp=(
                            datetime.fromtimestamp(tt, tz=timezone.utc) if tt else datetime.now(timezone.utc)
                        ),
                    )
                )
        return result

    async def history(
        self, tokens: TokenBundle, symbol: str, interval: str, start: datetime, end: datetime
    ) -> list[BrokerCandle]:
        from app.modules.brokers.symbols import FYERS_RESOLUTION

        resolution = FYERS_RESOLUTION.get(interval)
        if not resolution:
            raise BrokerError(f"Fyers has no {interval} candles")
        window = HISTORY_WINDOW.get(resolution, INTRADAY_WINDOW)
        candles: dict[int, BrokerCandle] = {}
        cursor = start
        while cursor < end:
            upto = min(end, cursor + window)
            body = await self._get(
                tokens,
                "/history",
                {
                    "symbol": symbol,
                    "resolution": resolution,
                    "date_format": "0",
                    "range_from": str(int(cursor.timestamp())),
                    "range_to": str(int(upto.timestamp())),
                    "cont_flag": "1",
                },
                base=DATA_BASE,
            )
            for row in body.get("candles", []):
                if len(row) < 6:
                    continue
                ts = int(row[0])
                candles[ts] = BrokerCandle(
                    time=datetime.fromtimestamp(ts, tz=timezone.utc),
                    open=float(row[1]),
                    high=float(row[2]),
                    low=float(row[3]),
                    close=float(row[4]),
                    volume=int(row[5] or 0),
                )
            cursor = upto
        return [candles[ts] for ts in sorted(candles)]
