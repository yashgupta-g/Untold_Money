import { baseApi } from "./baseApi";
import { ApiResponse } from "@/types";

// --- Portfolio Types ---
export interface HoldingDetail {
  id: string;
  portfolio_id: string;
  instrument_id: string;
  quantity: number;
  average_price: number;
  source: string;
  created_at: string;
  updated_at: string | null;
  symbol: string | null;
  name: string | null;
  current_price: number | null;
  pnl: number | null;
  pnl_percent: number | null;
  market_value: number | null;
}

export interface PortfolioSummary {
  id: string;
  user_id: string;
  name: string;
  base_currency: string;
  created_at: string;
  updated_at: string | null;
  holdings_count: number | null;
  total_invested: number | null;
  total_value: number | null;
  total_pnl: number | null;
  pnl_percent: number | null;
}

export interface PortfolioDetail extends PortfolioSummary {
  holdings: HoldingDetail[];
}

// --- Summary Types ---
export interface HoldingSummaryItem {
  symbol: string;
  name: string;
  pnl: number;
  pnl_percent: number;
}

export interface PortfolioSummaryData {
  portfolio_id: string;
  name: string;
  total_invested: number;
  total_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  holdings_count: number;
  top_gainer: HoldingSummaryItem | null;
  top_loser: HoldingSummaryItem | null;
}

// --- Allocation Types ---
export interface AllocationItem {
  instrument_id: string;
  symbol: string;
  name: string;
  sector: string | null;
  market_value: number;
  allocation_percent: number;
}

export interface SectorAllocation {
  sector: string;
  total_value: number;
  allocation_percent: number;
}

export interface PortfolioAllocationData {
  portfolio_id: string;
  total_value: number;
  holdings: AllocationItem[];
  sector_breakdown: SectorAllocation[];
  concentration_risk: boolean;
}

// --- Trade Types ---
export interface TradeDetail {
  id: string;
  portfolio_id: string;
  instrument_id: string;
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
  created_at: string;
  symbol: string | null;
  name: string | null;
  pnl: number | null;
  pnl_percent: number | null;
}

export interface TagPerformance {
  tag: string;
  trade_count: number;
  total_pnl: number;
  win_rate: number;
}

export interface TradeAnalytics {
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  total_pnl: number;
  win_count: number;
  loss_count: number;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number;
  expectancy: number;
  best_trade_pnl: number;
  worst_trade_pnl: number;
  best_strategy: TagPerformance | null;
  worst_strategy: TagPerformance | null;
  most_common_mistake: string | null;
  most_common_mistake_count: number;
}

// Legacy compat
export interface TradeStats {
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  total_pnl: number;
  win_count: number;
  loss_count: number;
  win_rate: number;
  avg_pnl: number;
}

export interface TradeFilterParams {
  portfolio_id?: string;
  trade_status?: string;
  trade_side?: string;
  strategy_tag?: string;
  symbol?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Portfolio & Trades API endpoints.
 */
export const portfolioApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // --- Portfolios ---
    getPortfolios: builder.query<ApiResponse<PortfolioSummary[]>, void>({
      query: () => "/portfolios",
      providesTags: ["Portfolio"],
    }),

    getPortfolio: builder.query<ApiResponse<PortfolioDetail>, string>({
      query: (id) => `/portfolios/${id}`,
      providesTags: (_result, _err, id) => [{ type: "Portfolio", id }],
    }),

    createPortfolio: builder.mutation<
      ApiResponse<PortfolioSummary>,
      { name: string; base_currency?: string }
    >({
      query: (body) => ({ url: "/portfolios", method: "POST", body }),
      invalidatesTags: ["Portfolio"],
    }),

    updatePortfolio: builder.mutation<
      ApiResponse<PortfolioSummary>,
      { id: string; name?: string; base_currency?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/portfolios/${id}`, method: "PUT", body }),
      invalidatesTags: ["Portfolio"],
    }),

    deletePortfolio: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/portfolios/${id}`, method: "DELETE" }),
      invalidatesTags: ["Portfolio"],
    }),

    // --- Holdings ---
    addHolding: builder.mutation<
      ApiResponse<HoldingDetail>,
      { portfolioId: string; instrument_id: string; quantity: number; average_price: number }
    >({
      query: ({ portfolioId, ...body }) => ({
        url: `/portfolios/${portfolioId}/holdings`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Portfolio"],
    }),

    updateHolding: builder.mutation<
      ApiResponse<HoldingDetail>,
      { portfolioId: string; holdingId: string; quantity?: number; average_price?: number }
    >({
      query: ({ portfolioId, holdingId, ...body }) => ({
        url: `/portfolios/${portfolioId}/holdings/${holdingId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Portfolio"],
    }),

    removeHolding: builder.mutation<
      ApiResponse<null>,
      { portfolioId: string; holdingId: string }
    >({
      query: ({ portfolioId, holdingId }) => ({
        url: `/portfolios/${portfolioId}/holdings/${holdingId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Portfolio"],
    }),

    // --- Summary & Allocation ---
    getPortfolioSummary: builder.query<ApiResponse<PortfolioSummaryData>, string>({
      query: (id) => `/portfolios/${id}/summary`,
      providesTags: (_result, _err, id) => [{ type: "Portfolio", id }],
    }),

    getPortfolioAllocation: builder.query<ApiResponse<PortfolioAllocationData>, string>({
      query: (id) => `/portfolios/${id}/allocation`,
      providesTags: (_result, _err, id) => [{ type: "Portfolio", id }],
    }),

    // --- Trades ---
    getTrades: builder.query<ApiResponse<TradeDetail[]>, TradeFilterParams>({
      query: (params) => ({ url: "/trades", params }),
      providesTags: ["Trade"],
    }),

    getTradeAnalytics: builder.query<ApiResponse<TradeAnalytics>, void>({
      query: () => "/trades/analytics/summary",
      providesTags: ["Trade"],
    }),

    getTradeStats: builder.query<ApiResponse<TradeStats>, void>({
      query: () => "/trades/stats",
      providesTags: ["Trade"],
    }),

    getTrade: builder.query<ApiResponse<TradeDetail>, string>({
      query: (id) => `/trades/${id}`,
      providesTags: (_result, _err, id) => [{ type: "Trade", id }],
    }),

    createTrade: builder.mutation<ApiResponse<TradeDetail>, Record<string, unknown>>({
      query: (body) => ({ url: "/trades", method: "POST", body }),
      invalidatesTags: ["Trade", "Portfolio"],
    }),

    updateTrade: builder.mutation<
      ApiResponse<TradeDetail>,
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({ url: `/trades/${id}`, method: "PUT", body }),
      invalidatesTags: ["Trade", "Portfolio"],
    }),

    deleteTrade: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/trades/${id}`, method: "DELETE" }),
      invalidatesTags: ["Trade", "Portfolio"],
    }),
  }),
});

export const {
  useGetPortfoliosQuery,
  useGetPortfolioQuery,
  useCreatePortfolioMutation,
  useUpdatePortfolioMutation,
  useDeletePortfolioMutation,
  useAddHoldingMutation,
  useUpdateHoldingMutation,
  useRemoveHoldingMutation,
  useGetPortfolioSummaryQuery,
  useGetPortfolioAllocationQuery,
  useGetTradesQuery,
  useGetTradeAnalyticsQuery,
  useGetTradeStatsQuery,
  useGetTradeQuery,
  useCreateTradeMutation,
  useUpdateTradeMutation,
  useDeleteTradeMutation,
} = portfolioApi;
