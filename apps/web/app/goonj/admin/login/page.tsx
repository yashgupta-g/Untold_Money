import type { Metadata } from "next";
import { redirect } from "next/navigation";

import a from "@/features/goonj/campaigns/admin/admin.module.css";
import { getAdmin } from "@/features/goonj/campaigns/admin/auth";
import { LoginForm } from "@/features/goonj/campaigns/admin/LoginForm";
import { supabaseConfigured } from "@/features/goonj/campaigns/supabase";
import { geist } from "@/features/goonj/v7/fonts";

export const metadata: Metadata = { title: "Log in · Goonj campaigns", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/goonj/admin");
  return (
    <div className={`${a.shell} ${geist.variable}`}>
      <div className={a.login}>
        <LoginForm configured={supabaseConfigured()} />
      </div>
    </div>
  );
}
