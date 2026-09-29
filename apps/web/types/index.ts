/**
 * Shared TypeScript types for the application.
 */

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  email_verified: boolean;
  role: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse extends User {}

export interface AuthResponse {
  user: UserResponse;
  tokens: TokenResponse;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  sector: string | null;
  industry: string | null;
  price?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
}

export interface Portfolio {
  id: string;
  name: string;
  base_currency: string;
  total_value?: number;
  total_pnl?: number;
  pnl_percent?: number;
  holdings_count?: number;
}

export interface Holding {
  id: string;
  instrument_id: string;
  symbol: string;
  name: string;
  quantity: number;
  average_price: number;
  current_price?: number;
  pnl?: number;
  pnl_percent?: number;
}

export interface Trade {
  id: string;
  symbol: string;
  name: string;
  trade_side: "BUY" | "SELL";
  quantity: number;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  target_price: number | null;
  fees: number;
  trade_status: "OPEN" | "CLOSED";
  strategy_tag: string | null;
  mistake_tag: string | null;
  emotion_tag: string | null;
  notes: string | null;
  trade_time: string;
  pnl?: number;
}

export interface MarketCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
