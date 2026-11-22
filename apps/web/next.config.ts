import type { NextConfig } from "next";

/**
 * Production: the backend's address (e.g. https://api.example.com). The site
 * then forwards /api/v1/* to it, so the browser only ever talks to this site
 * and the login refresh cookie stays first-party. Pair it with
 * NEXT_PUBLIC_API_URL="/" and NEXT_PUBLIC_STREAM_URL (WebSockets can't be
 * forwarded). Unset in local dev, where the browser calls the API directly.
 * On Vercel, set all three per environment (infra/deployment/README.md).
 */
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/+$/, "");

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
