import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Supabase clients for the Goonj campaign pages. Server only.
 * - publicClient: anon key, no session. Reads published campaigns (RLS).
 * - sessionClient: the signed-in editor's session from cookies (RLS as admin).
 * - serviceClient: service role, bypasses RLS. Only for writing leads.
 */

const PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Inside Docker the server can't reach the browser's 127.0.0.1.
const SERVER_URL = process.env.SUPABASE_INTERNAL_URL || PUBLIC_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Fixed so the cookie name doesn't depend on which URL the server uses. */
export const AUTH_COOKIE = "sb-goonj-auth";

export const supabaseConfigured = () => Boolean(SERVER_URL && ANON);

/**
 * Anon client. With `tags`, its requests go through Next's fetch cache under
 * those tags, so the dashboard can expire them the moment an editor saves.
 */
export function publicClient(cache?: { tags: string[]; revalidate: number }) {
  return createClient(SERVER_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: cache
      ? { fetch: (input, init) => fetch(input, { ...init, next: { tags: cache.tags, revalidate: cache.revalidate } }) }
      : undefined,
  });
}

export function serviceClient() {
  if (!SERVICE) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(SERVER_URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function sessionClient() {
  const store = await cookies();
  return createServerClient(SERVER_URL, ANON, {
    cookieOptions: { name: AUTH_COOKIE },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** Public URL of a file in the media bucket, as the browser should load it. */
export function mediaUrl(path: string) {
  return `${PUBLIC_URL}/storage/v1/object/public/goonj-media/${path}`;
}
