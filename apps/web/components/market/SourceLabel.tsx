import { cn } from "@/lib/utils";

const NAMES: Record<string, string> = { fyers: "Fyers", angelone: "Angel One" };

/** Where a price comes from: "Live · Fyers", with one cobalt dot while streaming. */
export function SourceLabel({
  provider,
  live = true,
  className,
}: {
  provider?: string | null;
  live?: boolean;
  className?: string;
}) {
  if (!provider) return null;
  const name = NAMES[provider] ?? provider;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      {live && <span aria-hidden className="size-1.5 rounded-full bg-primary-ink" />}
      {live ? `Live · ${name}` : name}
    </span>
  );
}
