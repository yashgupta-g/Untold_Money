"""
Angel One SmartAPI adapter (read-only).

Verified against the official SDK (angel-one/smartapi-python, smartConnect.py):
- Root https://apiconnect.angelone.in. Publisher (third-party) login at
  https://smartapi.angelone.in/publisher-login?api_key=…, so the app never
  handles the user's PIN or TOTP.
- Routes: user/v1/getProfile, user/v1/getRMS, portfolio/v1/getHolding,
  order/v1/getPosition, order/v1/getTradeBook (under /rest/secure/angelbroking/).
- Headers: Authorization "Bearer <jwt>", X-PrivateKey (api key),
  X-UserType "USER", X-SourceID "WEB", X-ClientLocalIP, X-ClientPublicIP,
  X-MACAddress, plus JSON Accept and Content-Type.
- Envelope: {status, message, errorcode, data}. AG8001/AG8002/AG8003 are
  invalid, expired or missing tokens.

Not verifiable from the SDK (the docs site needs a browser): the exact query
names on the publisher-login redirect. They're read tolerantly
(auth_token|jwtToken, refresh_token|refreshToken, feed_token|feedToken).
Confirm on the first live connection. Token lifetime isn't documented
either; a lapsed token is detected from AG800x and the user reconnects.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional
from urllib.parse import urlencode

from app.core.config import get_settings
from app.modules.brokers.adapters.base import (
    IST,
    AppCredentials,
    BrokerAdapter,
    BrokerAuthExpired,
    BrokerError,
    BrokerFunds,
    BrokerHolding,
    BrokerPosition,
    BrokerProfile,
    BrokerTrade,
    CallbackResult,
    TokenBundle,
    next_morning_ist,
    to_float,
)

ROOT = "https://apiconnect.angelone.in"
LOGIN = "https://smartapi.angelone.in/publisher-login"
SECURE = "/rest/secure/angelbroking"
EXPIRED_CODES = {"AG8001", "AG8002", "AG8003"}


def _mac() -> str:
    node = uuid.getnode()
    return ":".join(f"{(node >> shift) & 0xFF:02x}" for shift in range(40, -1, -8))


def _first(params: dict, *names: str):
    for name in names:
        if params.get(name):
            return params[name]
    return None


class AngelOneAdapter(BrokerAdapter):
    name = "angelone"
    label = "Angel One"

    @staticmethod
    def platform_credentials() -> Optional[AppCredentials]:
        key = get_settings().ANGELONE_API_KEY
        return AppCredentials(app_id=key) if key else None

    def _api_key(self) -> str:
        return self.credentials().app_id

    def login_url(self, state: str, redirect_uri: str) -> str:
        # The redirect URL is fixed in the SmartAPI app settings; state rides along.
        return f"{LOGIN}?{urlencode({'api_key': self._api_key(), 'state': state})}"

    async def complete_login(self, params: dict, redirect_uri: str) -> CallbackResult:
        token = _first(params, "auth_token", "jwtToken", "access_token")
        if not token:
            raise BrokerError(params.get("message") or "Angel One didn't return a session token")
        token = str(token).removeprefix("Bearer ").strip()
        return CallbackResult(
            tokens=TokenBundle(
                access_token=token,
                refresh_token=_first(params, "refresh_token", "refreshToken"),
                feed_token=_first(params, "feed_token", "feedToken"),
                # Undocumented; lapses are caught from AG800x as well.
                expires_at=next_morning_ist(5, 0),
            ),
            state=params.get("state"),
        )

    def _headers(self, tokens: TokenBundle) -> dict:
        settings = get_settings()
        return {
            "Authorization": f"Bearer {tokens.access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-UserType": "USER",
            "X-SourceID": "WEB",
            "X-PrivateKey": self._api_key(),
            "X-ClientLocalIP": "127.0.0.1",
            # The server's fixed egress IP once deployed (brokers whitelist it).
            "X-ClientPublicIP": settings.BROKER_EGRESS_IP or "127.0.0.1",
            "X-MACAddress": _mac(),
        }

    async def _get(self, tokens: TokenBundle, path: str):
        http = await self._http()
        response = await http.get(f"{ROOT}{SECURE}{path}", headers=self._headers(tokens))
        if response.status_code in (401, 403):
            raise BrokerAuthExpired("Your Angel One session has ended. Reconnect to continue.")
        body = response.json()
        if body.get("status") is True or str(body.get("status")).lower() == "true":
            return body.get("data")
        if body.get("errorcode") in EXPIRED_CODES:
            raise BrokerAuthExpired("Your Angel One session has ended. Reconnect to continue.")
        raise BrokerError(body.get("message") or "Angel One request failed")

    async def profile(self, tokens: TokenBundle) -> BrokerProfile:
        data = await self._get(tokens, "/user/v1/getProfile") or {}
        return BrokerProfile(broker_user_id=str(data.get("clientcode", "")), name=data.get("name"))

    async def funds(self, tokens: TokenBundle) -> BrokerFunds:
        data = await self._get(tokens, "/user/v1/getRMS") or {}
        return BrokerFunds(
            available_cash=to_float(data.get("availablecash")),
            used_margin=to_float(data.get("utiliseddebits")),
            net=to_float(data.get("net")),
        )

    async def holdings(self, tokens: TokenBundle) -> list[BrokerHolding]:
        return [
            BrokerHolding(
                symbol=h["tradingsymbol"],
                exchange=str(h.get("exchange", "NSE")),
                quantity=to_float(h.get("quantity")) or 0.0,
                average_price=to_float(h.get("averageprice")) or 0.0,
                last_price=to_float(h.get("ltp")),
                pnl=to_float(h.get("profitandloss")),
                isin=h.get("isin"),
            )
            for h in (await self._get(tokens, "/portfolio/v1/getHolding") or [])
            if h.get("tradingsymbol")
        ]

    async def positions(self, tokens: TokenBundle) -> list[BrokerPosition]:
        return [
            BrokerPosition(
                symbol=p["tradingsymbol"],
                exchange=str(p.get("exchange", "NSE")),
                product=str(p.get("producttype", "")),
                net_quantity=to_float(p.get("netqty")) or 0.0,
                average_price=to_float(p.get("avgnetprice")) or to_float(p.get("netprice")) or 0.0,
                last_price=to_float(p.get("ltp")),
                pnl=to_float(p.get("pnl")),
            )
            for p in (await self._get(tokens, "/order/v1/getPosition") or [])
            if p.get("tradingsymbol")
        ]

    async def trades(self, tokens: TokenBundle) -> list[BrokerTrade]:
        """Today's trade book. `filltime` is a time of day (HH:MM:SS, IST)."""
        today = datetime.now(IST).date()
        result: list[BrokerTrade] = []
        for t in await self._get(tokens, "/order/v1/getTradeBook") or []:
            side = str(t.get("transactiontype", "")).upper()
            if side not in ("BUY", "SELL") or not t.get("tradingsymbol"):
                continue
            try:
                clock = datetime.strptime(str(t.get("filltime", "")).strip(), "%H:%M:%S").time()
            except ValueError:
                clock = datetime.now(IST).time().replace(microsecond=0)
            result.append(
                BrokerTrade(
                    trade_id=str(t.get("fillid") or f"{t.get('orderid')}:{t.get('filltime')}"),
                    order_id=str(t.get("orderid", "")),
                    symbol=t["tradingsymbol"],
                    exchange=str(t.get("exchange", "NSE")),
                    side=side,
                    quantity=to_float(t.get("fillsize")) or 0.0,
                    price=to_float(t.get("fillprice")) or 0.0,
                    filled_at=datetime.combine(today, clock, tzinfo=IST),
                    product=t.get("producttype"),
                )
            )
        return result
