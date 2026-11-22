/**
 * Application constants.
 */

export const APP_NAME = "UntoldMoney";
export const APP_DESCRIPTION = "AI-powered stock analytics & trade journaling platform";

/**
 * Where the browser sends API calls. "/" means this site's own address: in
 * production the site forwards /api/v1/* to the backend (API_PROXY_TARGET in
 * next.config.ts), so the login refresh cookie stays first-party.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

/**
 * Where the live feed opens its WebSocket. Rewrites can't carry WebSockets,
 * so when API_URL is "/" this must be the backend's own address.
 */
export const STREAM_URL = (process.env.NEXT_PUBLIC_STREAM_URL || API_URL).replace(/\/+$/, "");

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Stocks", href: "/stocks", icon: "TrendingUp" },
  { label: "Portfolio", href: "/portfolio", icon: "PieChart" },
  { label: "Trades", href: "/trades", icon: "ArrowLeftRight" },
  { label: "Watchlist", href: "/watchlist", icon: "Eye" },
  { label: "Alerts", href: "/alerts", icon: "Bell" },
  { label: "Settings", href: "/settings", icon: "Settings" },
] as const;

export const TRADE_SIDES = ["BUY", "SELL"] as const;
export const TRADE_STATUSES = ["OPEN", "CLOSED"] as const;

export const CHART_INTERVALS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1H", value: "1h" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
] as const;
