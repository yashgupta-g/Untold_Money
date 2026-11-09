import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { ApiResponse, AuthResponse } from "@/types";
import { logout, setCredentials } from "../slices/authSlice";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/api/v1`,
  // Sends the httpOnly refresh cookie to /auth/* (the cookie's path limits it).
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: { accessToken: string | null } }).auth.accessToken;
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

/** One refresh at a time: parallel 401s all wait on the same request. */
let refreshing: Promise<boolean> | null = null;

const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

function urlOf(args: string | FetchArgs): string {
  return typeof args === "string" ? args : args.url;
}

/**
 * Base query with silent re-authentication. A 401 (an expired or missing
 * in-memory access token, e.g. after a page reload) triggers one refresh
 * through the cookie, then the original request is retried. If the refresh
 * fails, the session is over: clear local state and go to /login.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status !== 401 || AUTH_ENDPOINTS.some((p) => urlOf(args).startsWith(p))) {
    return result;
  }

  refreshing ??= (async () => {
    const refreshed = await rawBaseQuery(
      { url: "/auth/refresh", method: "POST" },
      api,
      extraOptions
    );
    const data = (refreshed.data as ApiResponse<AuthResponse> | undefined)?.data;
    if (data) {
      api.dispatch(setCredentials({ user: data.user, accessToken: data.tokens.access_token }));
      return true;
    }
    api.dispatch(logout());
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      // Not a component, so no router here; a full load also drops every
      // cached query of the ended session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?next=${next}`);
    }
    return false;
  })().finally(() => {
    refreshing = null;
  });

  if (await refreshing) {
    result = await rawBaseQuery(args, api, extraOptions);
  }
  return result;
};

/**
 * Base API configuration for RTK Query.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["User", "Portfolio", "Trade", "Instrument", "Candle", "Quote", "Broker", "Paper"],
  endpoints: () => ({}),
});
