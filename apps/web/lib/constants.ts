/**
 * Application constants.
 */

export const APP_NAME = "UntoldMoney";
export const APP_DESCRIPTION = "AI-powered stock analytics & trade journaling platform";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
