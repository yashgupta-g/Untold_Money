import type { NextConfig } from "next";

/**
 * Production: the backend's address (e.g. https://api.example.com). The site
 * then forwards /api/v1/* to it, so the browser only ever talks to this site
 * and the login refresh cookie stays first-party. Pair it with
 * NEXT_PUBLIC_API_URL="/" and NEXT_PUBLIC_STREAM_URL (WebSockets can't be
 * forwarded). Unset in local dev, where the browser calls the API directly.
 *
 * On Vercel these default to the Oracle server (infra/deployment/README.md),
 * so a deploy works without setting them; dashboard values still win.
 */
const PRODUCTION_API = "https://130-210-55-41.sslip.io";
const onVercel = process.env.VERCEL === "1";
const apiProxyTarget = (process.env.API_PROXY_TARGET || (onVercel ? PRODUCTION_API : ""))
  .replace(/\/+$/, "") || undefined;

/** Browser-side API settings, filled in on Vercel when the dashboard has none. */
const publicEnv: Record<string, string> = {};
if (onVercel && apiProxyTarget) {
  publicEnv.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "/";
  publicEnv.NEXT_PUBLIC_STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL || apiProxyTarget;
}

/**
 * One codebase, two Vercel projects. Each project sets SITE:
 *   - "goonj":  serves only the Goonj pages. "/" shows /goonj, and any
 *               UntoldMoney route sends the visitor back to "/".
 *   - "untold": serves UntoldMoney. /goonj/* goes to GOONJ_SITE_URL
 *               (e.g. https://goonj.vercel.app) when that's set.
 * Unset (local dev): both sites run side by side, as before.
 */
const site = process.env.SITE;
const goonjSiteUrl = process.env.GOONJ_SITE_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  env: publicEnv,
  async redirects() {
    if (site === "goonj") {
      // Everything except Goonj pages/assets, Next internals and the favicon.
      return [
        {
          source: "/:path((?!goonj(?:/|$)|_next/|favicon\\.ico$).+)",
          destination: "/",
          permanent: false,
        },
      ];
    }
    if (site === "untold" && goonjSiteUrl) {
      return [
        { source: "/goonj", destination: `${goonjSiteUrl}/`, permanent: false },
        { source: "/goonj/:path*", destination: `${goonjSiteUrl}/goonj/:path*`, permanent: false },
      ];
    }
    return [];
  },
  async rewrites() {
    const api = apiProxyTarget
      ? [{ source: "/api/v1/:path*", destination: `${apiProxyTarget}/api/v1/:path*` }]
      : [];
    if (site === "goonj") {
      return { beforeFiles: [{ source: "/", destination: "/goonj" }], afterFiles: [], fallback: [] };
    }
    return api;
  },
};

export default nextConfig;
