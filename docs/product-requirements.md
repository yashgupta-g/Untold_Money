# Product Requirements Document (PRD)

## Product: UntoldMoney

### Vision
Build an AI-powered stock analytics, portfolio management, trade journaling, and decision-support platform for retail investors and active traders in India and globally.

### Important Positioning
UntoldMoney is an **analytics and decision-support platform**. It does **NOT**:
- Provide guaranteed buy/sell signals
- Give financial advice
- Make trading decisions on behalf of users
- Place orders with brokers

AI features explain computed data — they do not invent recommendations.

---

## Core Features (v1)

### 1. Stock Analytics
- Browse and search instruments (NSE/BSE initially)
- View OHLCV price data with interactive charts
- Technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands)
- Fundamental data display (P/E, market cap, sector)
- AI-generated explanations of computed indicator data

### 2. Portfolio Management
- Create and manage multiple portfolios
- Track holdings with real-time valuation
- Portfolio performance metrics (returns, drawdown, Sharpe ratio)
- Sector and industry exposure analysis
- Multi-currency support (INR default)

### 3. Trade Journal
- Log buy/sell trades with rich metadata
- Tag trades with strategy, mistake, and emotion labels
- Calculate trade P&L automatically
- Trade analytics (win rate, average R:R, streak analysis)
- Export trades to CSV

### 4. Watchlist & Alerts
- Create watchlists for instruments of interest
- Set price alerts (above/below thresholds)
- Set indicator alerts (RSI overbought, SMA cross, etc.)
- In-app and email notification channels

### 5. Risk Insights
- Position sizing calculator
- Portfolio risk metrics
- Drawdown monitoring
- Concentration alerts

---

## User Roles
| Role | Access |
|------|--------|
| User | All standard features |
| Premium User | Advanced analytics, more alerts, API access (future) |
| Admin | System monitoring, user management, audit logs |

---

## Non-Functional Requirements
- **Performance**: API response < 200ms for standard queries
- **Availability**: 99.5% uptime target for production
- **Security**: JWT auth, bcrypt hashing, CORS, audit logging
- **Scalability**: Designed for 10K+ concurrent users
- **Compliance**: Consent logging, data export, GDPR-compatible design
