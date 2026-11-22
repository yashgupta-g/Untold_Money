import { createServerClient } from "@supabase/ssr";
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

/**
 * Goonj campaign dashboard (/goonj/admin): keeps the editor's Supabase
 * session cookie fresh. It doesn't guard anything itself; the admin pages
 * and actions check the session and the allowlist on the server.
 */
async function refreshGoonjSession(request: NextRequest) {
  const url = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookieOptions: { name: "sb-goonj-auth" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/goonj/admin")) return refreshGoonjSession(request);
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
    "/goonj/admin/:path*",
    "/login",
    "/register",
  ],
};
