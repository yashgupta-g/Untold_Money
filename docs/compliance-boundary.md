# Compliance Boundary

## Overview
UntoldMoney is a trading workspace and decision-support platform for Indian
retail traders. It is moving from analytics-only to **broker-connected,
user-confirmed execution** (see `docs/platform-strategy.md`). This document
sets the boundaries every feature, AI/ML output and user communication must
respect.

> This is an engineering summary, not legal advice. Each boundary marked
> **(confirm)** must be reviewed by a SEBI-practice lawyer before the feature
> that depends on it ships.

## What We ARE
- A data analytics and research-tooling platform
- A portfolio tracking tool
- A trade journaling and skill-building system (playbooks, risk rules, scorecards)
- An educational insights provider
- A risk visualization tool
- **Planned:** a broker-connected execution assistant. Orders the user
  confirms are routed to the user's own SEBI-registered broker account.

## What We Are NOT
- **A custodian.** We never hold, pool or move user funds or securities.
  Money, margin and leverage (intraday, MTF) stay with the user's broker.
  Holding deposits would require SEBI stockbroker or clearing-member
  registration, and is out of scope.
- **A stockbroker.** We are not a SEBI-registered broker. Any partner-broker
  arrangement (Authorised Person or API partner) is done through, and under,
  that broker's registration. **(confirm)**
- **A financial adviser or research analyst.** No SEBI IA or RA registration
  is held. We do not tell users to buy or sell a specific security, and we
  do not issue price targets as recommendations.
- **A tip provider.** We don't sell signals or calls.
- **A guaranteed prediction system.**

## Compliance Rules

### 1. No Financial Advice
- Never present computed data as financial advice
- Always include appropriate disclaimers
- AI explanations must explain data, not recommend actions
- Use language like "data suggests", never "you should buy"
- No auto-generated buy/sell calls on specific securities

### 2. AI/ML Output Boundaries
- ML predictions are experimental and clearly labeled
- Confidence intervals must be displayed with predictions
- No guarantee language in any AI output
- All AI outputs include the "This is not financial advice" disclaimer
- If AI is later used inside any SEBI-registered research or advice
  offering, disclose its use as the RA/IA rules require **(confirm)**

### 3. Broker Connectivity and Orders (Phases 2–3)
- Users link their **own** broker via the broker's OAuth flow. We never ask
  for broker passwords, PINs or TOTP secrets.
- Broker access tokens are encrypted at rest (KMS-managed key), never logged,
  and revocable by the user at any time.
- **Own API key (advanced, interim):** until the platform's broker partner
  or third-party apps are approved, a user may register a personal developer
  app with their broker and save its credentials here. They are stored
  encrypted, never returned in full, used only for that user's own account,
  and limited to read-only calls. Personal API keys are meant for the
  account holder's own use, so confirm each broker's terms before offering
  this beyond early users, and before any order placement. **(confirm)**
- Linking a broker requires two-factor authentication on the UntoldMoney
  account.
- **Every order is user-confirmed** in Phases 2–3. Nothing is placed without
  an explicit action from the user.
- Every order carries an origin (`manual`, `alert` or `playbook`) and an
  audit trail: who, what, when, and the pre-trade risk-check result.
- Broker API traffic leaves from a fixed, whitelisted egress IP.
- Show margin and leverage as the broker provides them, with risk
  warnings. We never extend credit ourselves.
- **Daily-loss alert** *(implemented, alert only)*: the user sets their own
  limit; live day P&L from their broker is compared with it and a warning
  is shown (and audited) when it's crossed. Nothing is blocked while no
  orders are placed from the platform.

### 4. Algorithmic Execution (Phase 5 only)
- Auto-execution only after algo-provider empanelment with the exchanges
  through a partner broker, under SEBI's retail algo-trading framework
  (Feb 2025 circular and later updates). **(confirm current requirements)**
- Every algo order carries the exchange-issued algo ID, and order rates stay
  within the orders-per-second limits for unregistered strategies.
- "White-box" strategies only (logic visible to the user) unless an RA
  registration covers "black-box" strategies.

### 5. Creators and Marketplace (Phase 4)
- Creators who sell recommendations, signals or strategies with performance
  claims must hold SEBI RA or IA registration. We verify the registration
  number before listing.
- Unregistered creators may publish **education only**: no live calls, no
  return or performance claims, and only price data older than 3 months,
  per SEBI's 2024 rules on associations with unregistered finfluencers.
  **(confirm)**
- Copying a strategy into a workspace never places orders on its own.

### 6. Market Data
- No redistribution of real-time NSE/BSE data without an exchange
  data-vendor licence.
- Real-time ticks reach a user only through **that user's own** broker
  connection. They are never rebroadcast to other users. *(implemented)*
  - Quotes, intraday candles and ticks from a user's broker are cached only
    under keys scoped to that user (Redis, seconds to minutes), never written
    to the shared `market_candles` table, and sent only on that user's own
    authenticated WebSocket.
  - There is no shared or delayed fallback (Yahoo Finance was removed):
    signed-out visitors and users without a live connection see a prompt to
    connect their broker instead of prices, charts or analysis.
  - Indicators, scores and predictions are computed from the viewing
    user's broker candles; the MCP server exposes reference data only (the
    NSE instrument list), never prices.
- The instrument list comes from Fyers's public NSE symbol master
  (reference data only: symbol, name, ISIN).
- Charts use TradingView Advanced Charts under TradingView's licence; the
  library is not committed to git (see `docs/charting.md`).

### 7. User Consent
- Explicit consent for terms of service at registration
- Explicit consent for privacy policy at registration
- Consent version tracking for audit
- IP address and user agent logged with consent
- Separate, explicit consent when linking a broker, covering what we read
  and what we can do

### 8. Data Handling (DPDP Act 2023)
- Data hosted in India (AWS ap-south-1)
- Short-lived access tokens kept in memory; refresh tokens in httpOnly,
  SameSite cookies, hashed before storage, rotated on every use, with reuse
  detection *(implemented)*
- Sessions are checked on every request, so logout and revocation take
  effect immediately *(implemented)*
- Per-IP rate limiting, stricter on authentication endpoints *(implemented)*
- Audit logs for all authentication events, including failed logins
  *(implemented)*, and for every broker and order action *(planned)*
- User data export and account deletion on request, within a defined SLA
- User data encrypted at rest *(planned)*

### 9. Disclaimers (Required on)
- Landing page
- Dashboard
- Stock detail pages
- Any AI/ML generated content
- Trade analytics pages
- Order ticket and broker-link screens (risk warning)

### Standard Disclaimer Text
> "UntoldMoney is an analytics platform for educational and informational purposes only. It does not constitute financial advice. Past performance is not indicative of future results. Always consult a qualified financial advisor before making investment decisions."

### Order Risk Warning (order ticket, broker link)
> "Orders are placed in your own broker account and are your decision. Trading, especially with leverage, can lose more than you invest. UntoldMoney does not hold your funds and does not give investment advice."

## Marketing Claims
- Only describe features that exist. Unbuilt modules are marked "soon" in
  `apps/web/features/landing/content.ts` until they ship.
- No return claims, testimonials about profits, or "guaranteed" language.

## Regulatory Awareness
- SEBI (Research Analysts) and (Investment Advisers) Regulations
- SEBI retail algorithmic trading framework
- SEBI rules on associations with unregistered finfluencers
- Exchange rules for Authorised Persons and API access (static IP, OAuth)
- Exchange data-vendor licensing and redistribution policies
- RBI payment-aggregator rules (relevant only if we ever handled payments
  beyond subscriptions)
- DPDP Act 2023
