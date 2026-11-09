/**
 * Auth utilities.
 *
 * Tokens: the access token lives only in memory (Redux), and the refresh
 * token lives in an httpOnly cookie set by the API, so page scripts can
 * never read it. A page reload silently refreshes to get a new access token
 * (see store/api/baseApi.ts).
 *
 * `um_signed_in` is a hint cookie with no secret in it. It lets the route
 * guard in proxy.ts send signed-out visitors to /login before the page
 * renders. The API remains the real gatekeeper.
 */

export const SIGNED_IN_COOKIE = "um_signed_in";
const SIGNED_IN_MAX_AGE = 7 * 24 * 60 * 60; // matches REFRESH_TOKEN_EXPIRE_DAYS

export function markSignedIn(): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SIGNED_IN_COOKIE}=1; Path=/; Max-Age=${SIGNED_IN_MAX_AGE}; SameSite=Lax${secure}`;
}

export function markSignedOut(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SIGNED_IN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** Remove tokens older builds kept in localStorage, where any script could read them. */
export function clearLegacyTokens(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  } catch {
    // Storage can be blocked; nothing to clear then.
  }
}

/** Where to send someone after login: only same-site paths, never an open redirect. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}
