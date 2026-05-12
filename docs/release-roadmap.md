# Release Roadmap

## Phase 1: Foundation (Current) ✅
- [x] Monorepo structure
- [x] FastAPI backend with core modules
- [x] PostgreSQL + Redis setup
- [x] JWT authentication (register/login/logout/me)
- [x] SQLAlchemy models for all entities
- [x] Alembic migration setup
- [x] Audit logging for auth events
- [x] User consent logging
- [x] Celery worker setup
- [x] Next.js frontend with app shell
- [x] Auth pages (login/register)
- [x] Dashboard with mock data
- [x] Stocks, Portfolio, Trades pages
- [x] Docker Compose for local dev
- [x] Documentation suite

## Phase 2: Core Features
- [ ] Instrument CRUD and search API
- [ ] Market data ingestion (manual CSV first)
- [ ] Interactive stock charts (TradingView Lightweight Charts)
- [ ] Portfolio CRUD with holdings management
- [ ] Trade journal CRUD with tagging
- [ ] Watchlist management
- [ ] Redux Toolkit store setup
- [ ] Protected routes with JWT middleware
- [ ] Token refresh flow
- [ ] User profile management

## Phase 3: Analytics
- [ ] Technical indicators (SMA, EMA, RSI, MACD, Bollinger)
- [ ] Portfolio performance calculation
- [ ] Trade journal statistics (win rate, P&L, R:R)
- [ ] Sector/industry exposure charts
- [ ] Drawdown monitoring
- [ ] Position sizing calculator

## Phase 4: Data Providers
- [ ] Provider abstraction layer
- [ ] Yahoo Finance integration (development)
- [ ] Alpha Vantage / Twelve Data integration
- [ ] Background data sync workers
- [ ] Historical data backfill

## Phase 5: Alerts & Notifications
- [ ] Price alert creation and evaluation
- [ ] Indicator-based alerts
- [ ] In-app notification system
- [ ] Email notifications (SendGrid/SMTP)
- [ ] Alert management UI

## Phase 6: AI/ML Layer
- [ ] Baseline ML models (scikit-learn)
- [ ] Price trend classification
- [ ] LLM explanation of technical data
- [ ] AI insight cards on stock pages
- [ ] MLflow experiment tracking

## Phase 7: Production Readiness
- [ ] Nginx reverse proxy
- [ ] GitHub Actions CI/CD
- [ ] Docker production builds
- [ ] Environment-based config (staging/production)
- [ ] Rate limiting
- [ ] Account lockout
- [ ] Data export (GDPR)
- [ ] Terraform infrastructure

## Phase 8: Premium & Scale
- [ ] Billing module (Stripe/Razorpay)
- [ ] Subscription tiers
- [ ] Advanced ML models (XGBoost/LightGBM)
- [ ] Backtesting engine
- [ ] Mobile app (React Native)
- [ ] Kubernetes deployment
- [ ] Multi-region support

---

## Timeline Estimate
| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1 | 2 weeks | ✅ Complete |
| Phase 2 | 3 weeks | 🔲 Next |
| Phase 3 | 2 weeks | 🔲 Planned |
| Phase 4 | 2 weeks | 🔲 Planned |
| Phase 5 | 2 weeks | 🔲 Planned |
| Phase 6 | 4 weeks | 🔲 Planned |
| Phase 7 | 3 weeks | 🔲 Planned |
| Phase 8 | Ongoing | 🔲 Future |
