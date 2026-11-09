"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { liveFeed } from "@/lib/liveFeed";
import { baseApi } from "@/store/api/baseApi";
import { useGetBrokersQuery } from "@/store/api/tradingApi";
import type { AppDispatch, RootState } from "@/store";

/**
 * Opens the live-price socket while the user has a live broker connection,
 * and re-fetches quotes and candles when that changes: a request sent
 * before the access token was restored (or before the broker was linked)
 * is answered "connect a broker", and should be retried once it can work.
 */
export function LiveFeedProvider() {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.accessToken);
  const { data } = useGetBrokersQuery(undefined, { skip: !token, pollingInterval: 5 * 60_000 });
  const live = (data?.data.brokers ?? []).some(
    (b) => b.connection?.status === "active" && b.connection.live_data
  );
  const previous = useRef<{ token: boolean; live: boolean }>({ token: false, live: false });

  useEffect(() => {
    liveFeed.configure({ token, enabled: live });
  }, [token, live]);

  useEffect(() => {
    const now = { token: !!token, live };
    const before = previous.current;
    previous.current = now;
    if ((now.token && !before.token) || now.live !== before.live) {
      dispatch(baseApi.util.invalidateTags(["Quote", "Candle"]));
    }
  }, [token, live, dispatch]);

  return null;
}
