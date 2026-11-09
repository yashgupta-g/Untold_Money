"use client";

import { useGetBrokersQuery } from "@/store/api/tradingApi";

/**
 * Whether the user can see market data: a live connection to a broker that
 * offers it (Fyers today). `expired` means they had one and must reconnect.
 */
export function useBrokerStatus(): { connected: boolean; expired: boolean; loading: boolean } {
  const { data, isLoading } = useGetBrokersQuery();
  const connections = (data?.data.brokers ?? []).map((b) => b.connection).filter(Boolean);
  const connected = connections.some((c) => c!.status === "active" && c!.live_data);
  const expired = !connected && connections.some((c) => c!.status === "expired" && c!.live_data);
  return { connected, expired, loading: isLoading };
}
