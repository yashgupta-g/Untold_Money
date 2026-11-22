import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { sessionClient, supabaseConfigured } from "../supabase";

export const ADMIN_HOME = "/goonj/admin";
export const ADMIN_LOGIN = "/goonj/admin/login";

/**
 * The signed-in campaign editor, or null. Checks the session with the auth
 * server (not just the cookie) and the goonj_admins allowlist.
 */
export const getAdmin = cache(async () => {
  if (!supabaseConfigured()) return null;
  const supabase = await sessionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: row } = await supabase
    .from("goonj_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!row) return null;
  return { supabase, user: data.user };
});

/** For pages: sends anyone who isn't an editor to the login page. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect(ADMIN_LOGIN);
  return admin;
}

/** For server actions: throws instead of redirecting. */
export async function assertAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not signed in");
  return admin;
}
