import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for route protection.
 * In production, this will validate JWT tokens.
 * Currently a placeholder that allows all requests through.
 */

const protectedPaths = [
  "/dashboard",
  "/stocks",
  "/portfolio",
  "/trades",
  "/watchlist",
  "/alerts",
  "/settings",
  "/admin",
];

const authPaths = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Placeholder: In production, check for valid session/token
  // const token = request.cookies.get("access_token")?.value;
  // For now, allow all routes through

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
