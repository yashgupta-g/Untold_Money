"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { LiveFeedProvider } from "@/components/market/LiveFeedProvider";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[padding] duration-300",
          collapsed ? "pl-[72px]" : "pl-[248px]"
        )}
      >
        <Topbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <LiveFeedProvider />
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
