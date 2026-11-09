"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  SquaresFour,
  TrendUp,
  ChartPieSlice,
  ArrowsLeftRight,
  Eye,
  Bell,
  GearSix,
  ShieldCheck,
  SidebarSimple,
  Flask,
  PlugsConnected,
  type Icon,
} from "@phosphor-icons/react";
import { useSidebar } from "./sidebar-context";

type NavItem = { label: string; href: string; icon: Icon };

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: SquaresFour },
  { label: "Stocks", href: "/stocks", icon: TrendUp },
  { label: "Portfolio", href: "/portfolio", icon: ChartPieSlice },
  { label: "Trades", href: "/trades", icon: ArrowsLeftRight },
  { label: "Paper trading", href: "/paper", icon: Flask },
  { label: "Brokers", href: "/brokers", icon: PlugsConnected },
  { label: "Watchlist", href: "/watchlist", icon: Eye },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { label: "Settings", href: "/settings", icon: GearSix },
];

const adminItems: NavItem[] = [{ label: "Admin", href: "/admin", icon: ShieldCheck }];

/** The landing page's brand mark: ink tile, two white strokes. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-foreground text-background",
        className
      )}
    >
      <svg width="16" height="16" viewBox="0 0 26 26" aria-hidden="true">
        <path d="M2 10 10 2h6L2 16zM24 16l-8 8h-6l14-14z" fill="currentColor" />
      </svg>
    </span>
  );
}

function NavLink({ item, collapsed, active }: { item: NavItem; collapsed: boolean; active: boolean }) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-10 items-center gap-3 rounded-xl px-3 text-[14.5px] transition-colors duration-200",
        collapsed && "justify-center px-0",
        active
          ? "bg-muted font-medium text-foreground"
          : "text-sidebar-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <item.icon
        size={19}
        weight={active ? "fill" : "regular"}
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-primary-ink" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300",
        collapsed ? "w-[72px]" : "w-[248px]"
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-16 items-center px-5", collapsed && "justify-center px-0")}>
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 text-[18px] font-medium tracking-[-0.02em] text-foreground"
          aria-label="UntoldMoney dashboard"
        >
          <LogoMark />
          {!collapsed && "UntoldMoney"}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Main">
        {!collapsed && (
          <p className="mb-1.5 px-3 text-[13px] font-medium text-muted-foreground">Workspace</p>
        )}
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} active={isActive(item.href)} />
          ))}
        </div>

        {collapsed ? (
          <div className="mx-3 my-4 h-px bg-sidebar-border" />
        ) : (
          <p className="mb-1.5 mt-6 px-3 text-[13px] font-medium text-muted-foreground">System</p>
        )}
        <div className="space-y-0.5">
          {adminItems.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} active={isActive(item.href)} />
          ))}
        </div>
      </nav>

      {/* Collapse toggle */}
      <div className="p-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={cn(
            "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[14px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
            collapsed && "justify-center px-0"
          )}
        >
          <SidebarSimple size={19} className="shrink-0" />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
