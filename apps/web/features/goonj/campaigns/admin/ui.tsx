"use client";

import { Check, Copy } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import a from "./admin.module.css";

export function AdminTabs() {
  const path = usePathname();
  const leads = path.startsWith("/goonj/admin/leads");
  return (
    <nav className={a.tabs} aria-label="Dashboard">
      <Link href="/goonj/admin" className={a.tab} aria-current={!leads ? "page" : undefined}>
        Campaigns
      </Link>
      <Link href="/goonj/admin/leads" className={a.tab} aria-current={leads ? "page" : undefined}>
        Sign-ups
      </Link>
    </nav>
  );
}

/** Copies a campaign link (full URL) to the clipboard. */
export function CopyLink({ path, label = "Copy link", small }: { path: string; label?: string; small?: boolean }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link", url);
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 1600);
  };
  return (
    <button type="button" className={`${a.btn} ${small ? a.small : ""}`} onClick={copy} aria-live="polite">
      {done ? <Check weight="bold" /> : <Copy />}
      {done ? "Copied" : label}
    </button>
  );
}

export function ConfirmButton({
  children,
  message,
  className,
  formAction,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  formAction?: (fd: FormData) => void | Promise<void>;
}) {
  return (
    <button
      type="submit"
      className={className}
      formAction={formAction}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
