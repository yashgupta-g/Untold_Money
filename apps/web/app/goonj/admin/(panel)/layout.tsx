import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/features/goonj/components/BrandLogo";
import { signOut } from "@/features/goonj/campaigns/admin/actions";
import a from "@/features/goonj/campaigns/admin/admin.module.css";
import { requireAdmin } from "@/features/goonj/campaigns/admin/auth";
import { AdminTabs } from "@/features/goonj/campaigns/admin/ui";
import { geist } from "@/features/goonj/v7/fonts";

export const metadata: Metadata = { title: "Goonj campaigns", robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return (
    <div className={`${a.shell} ${geist.variable}`}>
      <header className={a.top}>
        <Link href="/goonj/admin" className={a.brand}>
          <BrandLogo />
        </Link>
        <AdminTabs />
        <span className={a.spacer} />
        <span className={a.who}>{user.email}</span>
        <form action={signOut}>
          <button type="submit" className={`${a.btn} ${a.small}`}>
            Log out
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
