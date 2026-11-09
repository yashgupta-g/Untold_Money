import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types";

// --- Instrument Types ---
export interface InstrumentExchange {
  id: string;
  code: string;
  name: string;
  country: string;
}

export interface InstrumentDetail {
  id: string;
  exchange_id: string;
  symbol: string;
  name: string;
  instrument_type: string;
  isin: string | null;
  sector: string | null;
  industry: string | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  exchange: InstrumentExchange | null;
}

// --- Market Data Types ---
export interface CandleData {
  instrument_id: string;
  symbol: string | null;
  candle_time: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  provider: string;
}

export interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  high: number;
  low: number;
  open: number;
  previous_close: number;
  volume: number;
  timestamp: string;
  provider: string;
}

// --- Analytics Types ---
export interface IndicatorValue {
  name: string;
  value: number;
  signal: string | null;
  description: string;
}

export interface IndicatorsData {
  symbol: string;
  instrument_id: string;
  computed_at: string | null;
  candle_count: number;
  indicators: IndicatorValue[];
}

export interface StockScoreData {
  symbol: string;
  instrument_id: string;
  trend_score: number;
  momentum_score: number;
  volatility_score: number;
  volume_score: number;
  final_score: number;
  signal: string | null;
  computed_at: string | null;
}

// --- ML Prediction Types ---
export interface TopSignal {
  feature: string;
  importance: number;
  value: number;
}

export interface DirectionPrediction {
  symbol: string;
  instrument_id: string;
  direction: string;
  confidence: number;
  model_accuracy: number;
  horizon_days: number;
  top_signals: TopSignal[];
  explanation: string;
  model_version: string;
  predicted_at: string | null;
}

export interface PriceTargetPrediction {
  symbol: string;
  instrument_id: string;
  current_price: number;
  predicted_change_pct: number;
  predicted_high: number;
  predicted_low: number;
  confidence_interval: number;
  horizon_days: number;
  explanation: string;
  model_version: string;
  predicted_at: string | null;
}

export interface PredictionData {
  symbol: string;
  instrument_id: string;
  direction: DirectionPrediction | null;
  price_target: PriceTargetPrediction | null;
  candle_count: number;
  message: string;
}

/**
 * Instruments & Market Data API endpoints.
 */
export const marketApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // --- Instruments ---
    getInstruments: builder.query<
      ApiResponse<InstrumentDetail[]>,
      { q?: string; limit?: number; offset?: number }
    >({
      query: ({ q = "", limit = 50, offset = 0 }) => ({
        url: "/instruments",
        params: { q, limit, offset },
      }),
    }),

    searchInstruments: builder.query<
      ApiResponse<InstrumentDetail[]>,
      { q: string; limit?: number }
    >({
      query: ({ q, limit = 20 }) => ({
        url: "/instruments/search",
        params: { q, limit },
      }),
    }),

    getInstrumentBySymbol: builder.query<ApiResponse<InstrumentDetail>, string>({
      query: (symbol) => `/instruments/${symbol}`,
    }),

    // --- Market Data ---
    // Market data comes only from the user's own broker connection; without
    // one these answer 428 BROKER_REQUIRED (see isBrokerRequired).
    getCandles: builder.query<
      ApiResponse<CandleData[]>,
      { symbol: string; interval?: string; limit?: number; start?: string; end?: string }
    >({
      query: ({ symbol, interval = "1d", limit = 200, start, end }) => ({
        url: `/market-data/${symbol}/candles`,
        params: { interval, limit, ...(start ? { start } : {}), ...(end ? { end } : {}) },
      }),
      providesTags: ["Candle"],
    }),

    getQuote: builder.query<ApiResponse<QuoteData>, string>({
      query: (symbol) => `/market-data/${symbol}/quote`,
      providesTags: ["Quote"],
    }),

    /** Up to 50 symbols in one broker call. Pass them sorted for a stable cache key. */
    getQuotes: builder.query<ApiResponse<Record<string, QuoteData>>, string[]>({
      query: (symbols) => ({ url: "/market-data/quotes", params: { symbols: symbols.join(",") } }),
      providesTags: ["Quote"],
    }),

    // --- Analytics ---
    getIndicators: builder.query<ApiResponse<IndicatorsData>, string>({
      query: (symbol) => `/analytics/${symbol}/indicators`,
    }),

    getStockScore: builder.query<ApiResponse<StockScoreData>, string>({
      query: (symbol) => `/analytics/${symbol}/score`,
    }),

    // --- ML Predictions ---
    getPrediction: builder.query<ApiResponse<PredictionData>, string>({
      query: (symbol) => `/predictions/${symbol}`,
    }),
  }),
});

export const {
  useGetInstrumentsQuery,
  useSearchInstrumentsQuery,
  useGetInstrumentBySymbolQuery,
  useGetCandlesQuery,
  useGetQuoteQuery,
  useGetQuotesQuery,
  useGetIndicatorsQuery,
  useGetStockScoreQuery,
  useGetPredictionQuery,
} = marketApi;

/** The API's answer when market data needs a broker connection the user doesn't have. */
export function isBrokerRequired(error: unknown): boolean {
  const e = error as { status?: number; data?: { error_code?: string } } | undefined;
  return e?.status === 428 || e?.data?.error_code === "BROKER_REQUIRED" || e?.data?.error_code === "BROKER_SESSION_EXPIRED";
}
