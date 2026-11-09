import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route guard. Sends signed-out visitors to /login (remembering where they
 * were headed) and signed-in visitors away from /login and /register.
 *
 * It reads `um_signed_in`, a hint cookie with no secret in it (see
 * lib/auth.ts). It's a UX guard, not security: the API checks the real
 * session on every request, and a stale hint is caught by the first failed
 * refresh, which clears it. Kept inline because proxy code shouldn't import
 * shared app modules.
 */

const SIGNED_IN_COOKIE = "um_signed_in";

const protectedPaths = [
  "/dashboard",
  "/stocks",
  "/portfolio",
  "/trades",
  "/paper",
  "/brokers",
  "/watchlist",
  "/alerts",
  "/settings",
  "/admin",
];

const authPaths = ["/login", "/register"];

const matches = (pathname: string, paths: string[]) =>
  paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.get(SIGNED_IN_COOKIE)?.value === "1";

  if (!signedIn && matches(pathname, protectedPaths)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  if (signedIn && matches(pathname, authPaths)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/stocks/:path*",
    "/portfolio/:path*",
    "/trades/:path*",
    "/paper/:path*",
    "/brokers/:path*",
    "/watchlist/:path*",
    "/alerts/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
