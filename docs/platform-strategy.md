> Living strategy document. Phase 0 code work landed on 2026-11-05 (see "First concrete work"). Confirm every regulatory point with a SEBI-practice lawyer before Phase 3.

# UntoldMoney → a customizable, skills-first trading platform

## Context

You want UntoldMoney to grow from an analytics app into a trading platform
for traders who've outgrown Kite, Groww and the rest. That means deep
customization, a focus on building trading skill, and real-money execution
with leverage through brokers. You want to serve creators, active retail
traders and algo traders. Your choices so far:
- **Money:** connect users' own brokers **and** sign a partner broker.
- **Automation:** assist first, automate later.
- **Stage:** solo and bootstrapped.

### Where the code is today (verified)
- **Backend** (FastAPI modular monolith, `apps/api/app/modules/`). Built
  so far: auth, instruments, market_data (Yahoo only), portfolio, trades,
  analytics and predictions.
  - The trades module is a manual journal: it already has `strategy_tag`,
    `mistake_tag` and `emotion_tag`, which is a strong base for building
    trading skill.
  - `holdings.source` defaults to `MANUAL`, which leaves room for
    broker-synced holdings.
- **Not built at all:** broker integration, an order management system
  (OMS), strategy or rules engine, backtesting, alerts, billing,
  WebSockets, feature flags, LLM calls. The `admin`, `alerts`, `billing`
  and `ai_insights` modules are empty stubs, and every Celery task returns
  `not_implemented`.
- **Security gaps to fix before any money touches the platform:**
  - `/admin/*` routes never check the user's role.
  - `core/dependencies.py` doesn't check whether a session was revoked.
  - There's no `/auth/refresh` endpoint.
  - JWTs are stored in `localStorage`.
  - There's no rate limiting.
  - `/mcp` is mounted with no authentication.
  - The frontend route guard in `proxy.ts` is commented out.
  - The only tests cover `/health`.
- **Positioning conflict:**
  - `docs/compliance-boundary.md` says the product is "not a broker, no
    execution, no advice".
  - `features/landing/content.ts` advertises Broker trading, AI analyst
    chat and Backtesting as **live**.
  - The dashboard, alerts, watchlist, settings and admin pages show mock
    data.

---

## 1. Regulation in India: the constraints everything else follows

*This is an engineering summary, not legal advice. Before Phase 3, book
one paid consult with a SEBI-practice lawyer and confirm current deadlines
on the SEBI, NSE and broker sites.*

| Topic | Rule | What it means for you |
|---|---|---|
| **Holding user deposits** | Only SEBI-registered stockbrokers or clearing members can hold client trading funds. Pooling user money without a licence is illegal, and RBI payment-aggregator rules also apply. | **Don't do it.** Money and leverage (intraday margin, MTF) always stay with the user's broker. A broker licence (₹ crores in net worth, a compliance team, audits) is a year-3+ option at the earliest. |
| **Retail algo trading** (SEBI circular, Feb 2025, phased roll-out) | The broker is the principal. Algo providers must be empanelled with the exchanges through brokers. Every algo order carries an exchange-issued algo ID. API access needs OAuth plus a static IP, and anything above the orders-per-second (OPS) threshold must be registered. "White-box" strategies (logic shown to the user) are lighter-touch. "Black-box" strategies need SEBI Research Analyst (RA) registration. | "Assist first" keeps you out of algo rules until Phase 5. Design the OMS now so every order can be tagged as **manual** or **algo + algo ID** later. Use one fixed egress IP from day one. |
| **Advice and research** (RA Regulations, amended 2024, which also require disclosing AI use; Investment Adviser Regulations) | Telling people to buy or sell a specific security, or giving price targets, is research or advice. | Frame AI scores and predictions as analysis, not recommendations, with disclaimers, the "Not investment advice" line, and **no auto-generated buy/sell calls**. Later, either register as an RA (a part-time route exists) or partner with one. |
| **Finfluencer rules** (SEBI, Aug 2024) | Registered entities (including brokers) can't associate with unregistered people who give advice or make performance claims. Unregistered educators must use price data at least 3 months old. | **Creators selling strategies or signals must be SEBI RA or IA registered and verified.** Unregistered creators can only publish education: templates, white-box rules and courses, with no live calls or return claims. This rule also protects your broker partnerships. |
| **Market data** | Redistributing NSE real-time data needs an NSE data-vendor licence. | Stream real-time data **through each user's own broker connection, for that user only**. Yahoo was removed (Nov 2026): every chart and analysis uses the viewer's own broker history. Shared backtests or end-of-day data would need a licensed vendor. Never rebroadcast live ticks to other users. |
| **Data protection** | The DPDP Act 2023 applies, plus each broker's API terms. | Get consent for broker linking, encrypt the token vault, support data deletion, and host in the AWS Mumbai region (ap-south-1). |
| **Tax** | 18% GST applies to subscriptions. | Razorpay handles GST invoices. |

**Fix now:** mark "Broker trading", "AI analyst chat" and "Backtesting" as
`"soon"` in `content.ts` (`PLATFORM[].status`). Claiming unbuilt features
on a trading product is a regulatory and trust risk.

---

## 2. Money model: connect-your-broker vs partner broker

### A. Connect your own broker
Users link Zerodha, Upstox, Angel One, Dhan or Fyers through OAuth.
- **Pros:**
  - No licence needed.
  - Covers about 90% of active traders on day one.
  - You stay neutral across brokers.
  - Leverage and margin come from the broker for free.
- **Cons:**
  - Each broker has its own API (symbol masters, order types, error codes).
  - Indian broker access tokens **expire daily** (around 6 a.m.), so users
    must log in again each day. This is the biggest UX friction.
  - Some brokers charge users or apps for API access (for example, Kite
    Connect's data plan). Check current pricing.
  - Static IP and OAuth requirements apply.
  - **You earn no brokerage revenue.**

### B. Partner broker
You become an Authorised Person (AP) or join an API or fintech partner
programme with one broker. Upstox, Dhan, Fyers and Angel One all run such
programmes; Zerodha mostly doesn't.
- **Pros:**
  - Account opening happens inside your app, through the broker's KYC
    flow.
  - A **revenue share on brokerage** (negotiated; APs commonly get a
    meaningful percentage).
  - Often free or priority API access, higher rate limits, and
    co-marketing.
  - A smoother daily-login flow.
  - A path to algo-provider empanelment through that broker.
- **Cons:**
  - Ties you to one broker.
  - AP registration needs exchange approval, NISM-certified staff and
    ongoing compliance.
  - Users must open a new account, which many active traders won't do.
  - Your neutrality takes a hit.

### Recommendation: run both, in sequence
1. **Phases 2–3:** connect-your-broker with **2 brokers**: Zerodha for
   reach, plus one partner-friendly broker (Upstox, Dhan or Fyers). Build
   one `BrokerAdapter` interface so the rest of the system never knows
   which broker is behind it.
2. **Once you have traction** (roughly 500+ weekly users with a linked
   broker): use that usage data to negotiate a **partner deal with the
   same partner-friendly broker**. Add in-app account opening as the
   default for new traders, plus a revenue share. Keep connect-your-broker
   for existing traders.
3. **Never** hold funds. Leverage stays the broker's product. You surface
   margin, MTF eligibility and risk clearly.
4. Optional shortcut: a multi-broker aggregator (smallcase Gateway-style
   connectors, or the open-source OpenAlgo pattern) can speed up broker
   coverage. You trade control for speed, so judge it on terms, cost and
   compliance.

---

## 3. Product: what "more than a regular broker app" means

Positioning: **"Your trading workspace and coach. Bring your broker, keep
your edge."** This is four pillars on one data model.

1. **Customization (the workspace)**
   - Drag-and-drop widget grid: chart, watchlist, positions, order ticket,
     scanner, journal, notes, P&L.
   - Multiple saved layouts per user, hotkeys, custom watchlists and
     columns.
   - Saved screeners, custom indicators built from formulas, alert rules,
     and order templates (bracket, cover, GTT).
   - Store all of it as versioned JSON documents so it can be shared or
     exported.
2. **Skills (the coach)**
   - Auto-journal from broker fills.
   - Mistake, emotion and strategy tagging (these columns already exist).
   - Playbooks: setup checklists you must tick before the order ticket
     unlocks.
   - Risk rules you set yourself: max loss per day, max trades, position
     size, and a cool-off lock after a loss streak.
   - Discipline and expectancy scorecards, trade replay, weekly reviews,
     and challenges.
   - **Paper trading through the same order flow**, so learners graduate
     to real money only after they hit their own targets.
3. **Execution (assist first)**
   - Phases 2–3: one-click orders the user confirms, built from alerts,
     playbooks or templates.
   - Pre-trade risk checks run on every order.
   - Phase 5: white-box automation under the algo rules.
4. **Creators (distribution and revenue)**
   - Verified RA/IA creators publish strategies, scanners, playbooks and
     workspaces. Subscribers **copy them into their own workspace** and
     choose whether to act; there's no copy-trading at first.
   - Unregistered educators publish education only.
   - Revenue share runs through Razorpay Route. This is also your
     cheapest customer-acquisition channel: creators bring their audience.

---

## 4. Architecture

Keep the **modular monolith** (one FastAPI codebase, `apps/api/app/modules/*`),
and run the parts with different latency and failure needs as **separate
processes from the same codebase**:

```
            Web (Next.js)  ── REST (/api/v1) ──►  API (FastAPI)
                 ▲                                   │
                 │ WebSocket (per-user)              ├─ modules: auth, users, brokers*, oms*,
                 │                                   │   risk*, strategies*, alerts, journal(trades),
        Realtime gateway* ◄── Redis pub/sub ──┐      │   portfolio, analytics, predictions,
                 ▲                            │      │   workspaces*, creators*, billing, audit
                 │                            │      ▼
   Market-data workers* (one broker WS        │   Postgres (+Timescale for candles)
   per user session, normalize ticks)  ───────┘   Redis (cache, pub/sub, rate limits, locks)
                                                  Celery (EOD ingest, reconciliation, backtests,
   Execution workers* ── BrokerAdapter ──► Zerodha / Upstox / Dhan / … / PaperBroker
   (fixed egress IP via NAT + Elastic IP)        scorecards, notifications, billing webhooks)
```
`*` marks something new.

### New backend modules
Each follows the existing `models / schemas / repository / service /
router` layout.

- **`brokers`**
  - A `BrokerAdapter` protocol with these methods: `login_url`,
    `exchange_token`, `profile`, `funds`, `holdings`, `positions`,
    `orders`, `place / modify / cancel`, `instruments`, `stream`.
  - Adapters for Zerodha, Upstox and others, plus **`PaperBroker`**. The
    paper broker simulates fills from live or EOD prices and powers paper
    trading, demos and creator previews with zero regulatory risk.
  - Table `broker_connections`: user, broker, the access token encrypted
    with AES-GCM using a KMS-managed key, expiry, scopes, status.
  - A symbol-mapping table that ties each broker's instrument tokens to
    the existing `instruments` rows.
- **`oms`**
  - An `order_intents` table plus an order state machine: `draft →
    risk_checked → submitted → open → partially_filled → filled /
    cancelled / rejected`.
  - Every request carries an idempotency key.
  - Each order has an `origin` (`manual` / `alert` / `playbook` / `algo`)
    and an `algo_id` column that stays null until Phase 5.
  - Order updates arrive through broker postbacks or WebSocket.
  - A Celery **reconciliation** job compares the broker's order book with
    ours every few minutes and at end of day.
- **`risk`**: pre-trade checks.
  - Limits the user sets: daily loss, quantity, notional, instrument
    allow-list.
  - Platform limits.
  - A kill switch.
  - These run synchronously before `submit`, and every decision is audited.
- **`strategies` and `alerts`**
  - A declarative JSON rule language, for example "close crosses
    EMA(20) AND RSI < 30 on 15m", evaluated by the existing `analytics`
    indicator code.
  - Alerts fill the existing `alert_jobs` placeholders.
  - Rules are white-box by construction, which helps later algo
    compliance.
- **`backtesting`**
  - A vectorized engine over `market_candles` (pandas, reusing the
    indicator functions), run as Celery jobs with stored result reports.
  - Use the same rule language as live alerts, so what you test is what
    you run.
- **`workspaces`**: layouts, widgets and saved screeners as versioned
  JSON.
- **`journal`** (extends `trades`): auto-create trades from broker fills,
  playbooks, scorecards, and nightly Celery aggregation.
- **`creators`**: profiles, SEBI registration number and verification
  status, listings, subscriptions, payouts.
- **`billing`** (fills the stub)
  - Razorpay Subscriptions plus webhooks.
  - An `entitlements` table read through a `require_feature("…")`
    dependency, which doubles as your feature-flag system.
- **Realtime gateway**: a WebSocket endpoint where the frontend
  subscribes to ticks and order updates over Redis pub/sub. This also
  replaces mock dashboard data with live data.

### Cross-cutting requirements (non-negotiable before real money)
- **Auth:**
  - httpOnly refresh-token cookies, a `/auth/refresh` endpoint, and a
    session-revocation check in `core/dependencies.py`.
  - Role-based access via a `require_role("admin")` dependency.
  - **TOTP two-factor authentication required before linking a broker.**
- **Rate limiting:** Redis token-bucket limits per user, per IP and per
  broker. Your `token-bucket/` prototype is the design reference.
- **Audit:** every order, risk decision, broker link or unlink, and
  entitlement change goes through the existing `AuditService.log_event`.
- **Secrets:** broker tokens live encrypted in the vault, the master key
  in AWS KMS. Never log a token.
- **MCP:** put `/mcp` behind authentication, or don't expose it publicly.
- **Reliability:** each broker adapter gets circuit breakers and retries
  with jitter, and duplicate submits are blocked. Track order-submission
  latency (p95) and the reconciliation mismatch count.
- **Infra (cheap for solo):**
  - **AWS Mumbai.** A single EC2 or Lightsail box running docker-compose,
    managed Postgres (RDS) and managed Redis.
  - A NAT gateway with an Elastic IP so you have **one static egress IP**
    to whitelist with brokers.
  - Sentry, structlog shipped to CloudWatch, and nightly database
    backups.
  - Move to ECS only once a single box isn't enough.
- **Tests:** contract tests per broker adapter (recorded fixtures), OMS
  state-machine tests, and risk-rule tests. All are required before
  Phase 3 goes live.

---

## 5. Business model and metrics

### Revenue streams, in the order they unlock
1. **Subscriptions.** The plans are already in `content.ts`: Starter ₹0,
   Pro ₹499/mo, Elite ₹1,499/mo.
   - Gate by feature: number of layouts, alert rules, backtests per
     month, broker connections, auto-journal history, AI analysis
     credits.
2. **Partner-broker revenue share** on brokerage from accounts opened in
   your app (from Phase 3 onwards).
3. **Creator marketplace take rate**, about 20–30% of creator
   subscriptions.
4. **Later:** API access, premium data add-ons, and team or prop-desk
   plans.

### North-star metric
**Weekly Active Traders.** These are users with a linked broker or an
active paper account who used at least one custom workflow (alert,
playbook, layout or backtest) that week.

| Area | Metric | Early target |
|---|---|---|
| Acquisition | Visitor → sign-up | 3–6% |
| Activation | Sign-up → broker linked or paper started, within 7 days | ≥40% |
| Activation | First custom workflow created | ≥30% |
| Engagement | Weekly/monthly active users | ≥40% (trading is a daily habit) |
| Retention | Day-30 retention of activated users | ≥25% |
| Monetization | Free → paid conversion | 3–5% |
| Monetization | Monthly paid churn | <5% |
| Unit economics | Lifetime value ÷ customer-acquisition cost | >3 |
| Unit economics | Payback period | <6 months |
| Unit economics | Infra + API cost per paid user | <20% of average revenue per user |
| Execution | Order success rate | >99.5% |
| Execution | Order submit latency (p95) | <300ms to broker |
| Execution | Reconciliation mismatches | 0 unresolved by end of day |
| Skills | Rule-adherence rate | Rising month over month |
| Skills | Cohort expectancy, before vs after using playbooks | Rising |
| Creators | Active verified creators; subscriber retention; marketplace sales; payout accuracy | Track from launch |
| Trust and compliance | Complaints (including on SEBI's SCORES portal); security incidents; data-deletion SLA | 0 incidents |

Instrument these with PostHog, either self-hosted or the free tier. Add
events for every funnel step from Phase 1.

### Rough break-even (solo)
At about ₹15–25k a month for infra, data and tools, roughly 50–60 Pro
users cover costs. A ₹1L/month MRR milestone is about 200 Pro users, or a
mix with Elite.

---

## 6. Roadmap for one person (each phase ships something usable)

| Phase | Timeframe | Build | Exit criteria |
|---|---|---|---|
| **0. Foundations** | 2–4 weeks | Fix the security gaps above. Add a refresh-token flow with httpOnly cookies. Turn the `proxy.ts` route guard on. Add rate limiting and an admin role check. Make `content.ts` truthful (`"soon"`). Schedule the seed script and an EOD ingest in Celery beat. Wire the dashboard to the real API. Deploy to AWS Mumbai. Write Terms and Privacy pages and reword AI outputs as analysis. **Business:** register a Pvt Ltd and get GST, open Razorpay, book one lawyer consult. | No mock data in the app. Public beta is live. |
| **1. Workspace + coach + paper** | 6–8 weeks | Workspaces (widget grid), alerts and the rule language, playbooks, risk rules, scorecards, `PaperBroker` running through the real OMS skeleton, Razorpay subscriptions and entitlements, PostHog analytics. | 100 weekly active traders, first paying users. |
| **2. Read-only broker connect** | 4–6 weeks | `brokers` module (Zerodha + one partner-friendly broker): OAuth, encrypted vault, daily re-login UX, sync of holdings, positions and orders, **auto-journal from fills**, live ticks over the realtime gateway. | ≥40% of active users link a broker; zero token leaks. |
| **3. Assisted execution** | 6–8 weeks | Real orders from the OMS (confirm-to-send), risk checks, GTT and bracket orders, reconciliation, full audit trail, 2FA required, contract tests. **Business:** apply to the partner broker's AP or API programme. | >99.5% order success; partner deal signed or in negotiation. |
| **4. Strategy lab + creators** | 8–10 weeks | Backtesting (same rule language), shareable strategies and workspaces, creator profiles with SEBI registration verification, a marketplace with Razorpay Route payouts, an education-only tier for unregistered creators. | 10 verified creators; first marketplace revenue. |
| **5. Automation + partner onboarding** | Ongoing | White-box auto-execution via algo-provider empanelment through the partner broker (algo IDs, OPS limits, static IP). In-app account opening with revenue share. An LLM-backed AI analyst built on the existing MCP tools, with an advice-safe framing. Mobile app. | Empanelment approved; brokerage revenue share flowing. |

**Solo-founder rules:**
- Ship one pillar per phase, and charge from Phase 1.
- Use managed services everywhere.
- Don't write a second broker adapter until the first one is boring.
- Take on a co-founder or hire for compliance and partnerships by Phase 3.
  Broker deals and regulators reward having a company and a named
  compliance owner.

---

## 7. First concrete work (Phase 0), once you approve

These are code changes in this repo:
- `apps/api/app/core/dependencies.py`: add the session-revocation check
  and a `require_role` dependency. Apply it to the `/admin/*` routers in
  the instruments, market_data and analytics modules.
- `apps/api/app/modules/auth/`: add `/auth/refresh` and `/auth/logout`
  that rotate and revoke sessions using `user_sessions`, with httpOnly
  cookies.
- `apps/web/lib/auth.ts`, `store/api/authApi.ts`, `proxy.ts`: switch to
  cookie auth, call refresh and logout, and turn the route guard on.
- `apps/api/app/main.py`: Redis rate-limit middleware; put `/mcp` behind
  auth.
- `apps/api/app/workers/celery_app.py` and `data_jobs.py`: implement
  `fetch_market_data` using the existing
  `MarketDataService.auto_ingest_symbol` (as in
  `scripts/seed_market_data.py`) and schedule it in beat.
- `apps/web/app/(dashboard)/dashboard/page.tsx`: replace the mock arrays
  with the existing `portfolioApi` and `marketApi` hooks.
- `apps/web/features/landing/content.ts`: set unbuilt modules to
  `"soon"`.
- `docs/compliance-boundary.md`: rewrite for the new positioning
  ("broker-connected execution assistant; no custody; no advice") and add
  this plan as `docs/platform-strategy.md`.
- Tests in `apps/api/app/tests/`: auth refresh and revocation, the admin
  role guard, rate limiting.

## Verification

- **Phase 0:**
  - `docker compose up --build -V`; the seed and beat jobs fill
    `instruments` and `market_candles` (check with `psql` counts).
  - `/dashboard` shows API data, and a non-admin user gets 403 on
    `/admin/*`.
  - A revoked session gets 401, and refresh rotates the token.
  - `pytest` passes in the API container, and
    `docker exec untoldmoney-web npx tsc --noEmit` is clean.
- **Later phases:**
  - Each broker adapter passes contract tests against recorded fixtures
    and a sandbox or test account.
  - OMS state-machine and risk tests are green.
  - A paper-trading end-to-end run (alert → confirm → fill → auto-journal
    → scorecard).
  - Reconciliation reports zero mismatches on a live test account with
    small positions before any public launch.
