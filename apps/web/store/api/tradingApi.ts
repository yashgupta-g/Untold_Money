import { baseApi } from "./baseApi";
import type { ApiResponse } from "@/types";

/**
 * Broker connections (read-only) and paper trading.
 * A sync or a paper fill changes portfolios and the journal, so those
 * caches are refreshed too.
 */

export type BrokerName = "angelone" | "fyers";

export interface BrokerConnection {
  id: string;
  broker: BrokerName;
  status: "pending" | "active" | "expired" | "error";
  broker_user_id: string | null;
  display_name: string | null;
  token_expires_at: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  uses_own_key: boolean;
  /** Live quotes, intraday candles and ticks come through this connection. */
  live_data: boolean;
  /** The user's daily-loss alert in rupees, or null when off. */
  daily_loss_limit: number | null;
}

export interface BrokerEntry {
  broker: BrokerName;
  label: string;
  /** The platform has its own app for this broker. */
  platform_configured: boolean;
  /** Masked app ID when the user added their own key, e.g. "ABCD…-100". */
  own_key: string | null;
  needs_secret: boolean;
  /** Where the user's own broker app must redirect after sign-in. */
  redirect_uri: string;
  /** Connect is possible: platform app or own key. */
  configured: boolean;
  connection: BrokerConnection | null;
}

export interface BrokerSyncResult {
  holdings: number;
  trades_journaled: number;
  unmapped_symbols: string[];
  portfolio_id: string;
  connection: BrokerConnection;
}

export interface BrokerSnapshot {
  funds: { available_cash: number | null; used_margin: number | null; net: number | null };
  positions: {
    symbol: string;
    exchange: string;
    product: string;
    net_quantity: number;
    average_price: number;
    last_price: number | null;
    pnl: number | null;
  }[];
}

export interface PaperPosition {
  symbol: string;
  name: string | null;
  quantity: number;
  average_price: number;
  last_price: number | null;
  market_value: number | null;
  unrealized_pnl: number | null;
  unrealized_pnl_percent: number | null;
}

export interface PaperAccount {
  id: string;
  name: string;
  portfolio_id: string;
  starting_cash: number;
  cash: number;
  holdings_value: number;
  equity: number;
  total_pnl: number;
  total_pnl_percent: number;
  open_orders: number;
  positions: PaperPosition[];
  created_at: string;
  reset_at: string | null;
}

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";

export interface PaperOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  order_type: OrderType;
  quantity: number;
  limit_price: number | null;
  status: "OPEN" | "FILLED" | "CANCELLED" | "REJECTED";
  fill_price: number | null;
  fees: number;
  filled_at: string | null;
  reject_reason: string | null;
  strategy_tag: string | null;
  notes: string | null;
  created_at: string;
}

export interface PaperOrderRequest {
  accountId: string;
  symbol: string;
  side: OrderSide;
  order_type: OrderType;
  quantity: number;
  limit_price?: number;
  strategy_tag?: string;
}

export const tradingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // --- Brokers ---
    getBrokers: builder.query<ApiResponse<{ brokers: BrokerEntry[] }>, void>({
      query: () => "/brokers",
      providesTags: ["Broker"],
    }),
    saveBrokerCredentials: builder.mutation<
      ApiResponse<BrokerConnection>,
      { broker: BrokerName; app_id: string; app_secret?: string }
    >({
      query: ({ broker, ...body }) => ({ url: `/brokers/${broker}/credentials`, method: "PUT", body }),
      invalidatesTags: ["Broker"],
    }),
    removeBrokerCredentials: builder.mutation<ApiResponse<null>, BrokerName>({
      query: (broker) => ({ url: `/brokers/${broker}/credentials`, method: "DELETE" }),
      invalidatesTags: ["Broker", "Portfolio", "Quote", "Candle"],
    }),
    connectBroker: builder.mutation<ApiResponse<{ login_url: string }>, BrokerName>({
      query: (broker) => ({ url: `/brokers/${broker}/connect`, method: "POST" }),
    }),
    syncBroker: builder.mutation<ApiResponse<BrokerSyncResult>, string>({
      query: (id) => ({ url: `/brokers/connections/${id}/sync`, method: "POST" }),
      invalidatesTags: ["Broker", "Portfolio", "Trade"],
    }),
    getBrokerSnapshot: builder.query<ApiResponse<BrokerSnapshot>, string>({
      query: (id) => `/brokers/connections/${id}/snapshot`,
      providesTags: (_r, _e, id) => [{ type: "Broker", id }],
    }),
    disconnectBroker: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/brokers/connections/${id}`, method: "DELETE" }),
      invalidatesTags: ["Broker", "Portfolio", "Quote", "Candle"],
    }),
    setBrokerRisk: builder.mutation<
      ApiResponse<BrokerConnection>,
      { id: string; daily_loss_limit: number | null }
    >({
      query: ({ id, ...body }) => ({ url: `/brokers/connections/${id}/risk`, method: "PUT", body }),
      invalidatesTags: ["Broker"],
    }),

    // --- Paper trading ---
    getPaperAccounts: builder.query<ApiResponse<PaperAccount[]>, void>({
      query: () => "/paper/accounts",
      providesTags: ["Paper"],
    }),
    createPaperAccount: builder.mutation<
      ApiResponse<PaperAccount>,
      { name?: string; starting_cash: number }
    >({
      query: (body) => ({ url: "/paper/accounts", method: "POST", body }),
      invalidatesTags: ["Paper", "Portfolio"],
    }),
    resetPaperAccount: builder.mutation<ApiResponse<PaperAccount>, string>({
      query: (id) => ({ url: `/paper/accounts/${id}/reset`, method: "POST" }),
      invalidatesTags: ["Paper", "Portfolio", "Trade"],
    }),
    getPaperOrders: builder.query<ApiResponse<PaperOrder[]>, string>({
      query: (id) => `/paper/accounts/${id}/orders`,
      providesTags: ["Paper"],
    }),
    placePaperOrder: builder.mutation<ApiResponse<PaperOrder>, PaperOrderRequest>({
      query: ({ accountId, ...body }) => ({
        url: `/paper/accounts/${accountId}/orders`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Paper", "Portfolio", "Trade"],
    }),
    cancelPaperOrder: builder.mutation<ApiResponse<PaperOrder>, { accountId: string; orderId: string }>({
      query: ({ accountId, orderId }) => ({
        url: `/paper/accounts/${accountId}/orders/${orderId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Paper"],
    }),
  }),
});

export const {
  useGetBrokersQuery,
  useSaveBrokerCredentialsMutation,
  useRemoveBrokerCredentialsMutation,
  useConnectBrokerMutation,
  useSyncBrokerMutation,
  useGetBrokerSnapshotQuery,
  useDisconnectBrokerMutation,
  useSetBrokerRiskMutation,
  useGetPaperAccountsQuery,
  useCreatePaperAccountMutation,
  useResetPaperAccountMutation,
  useGetPaperOrdersQuery,
  usePlacePaperOrderMutation,
  useCancelPaperOrderMutation,
} = tradingApi;
