import Link from "next/link";
import { PlugsConnected } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Market data comes only from the user's own broker. Shown wherever prices,
 * charts or analysis would be, when there's no live connection.
 */
export function ConnectBrokerPrompt({
  compact = false,
  expired = false,
  className,
}: {
  compact?: boolean;
  expired?: boolean;
  className?: string;
}) {
  const title = expired ? "Your Fyers session has ended" : "Connect your broker to see market data";
  const body = expired
    ? "Brokers end API sessions every day. Reconnect to bring back live prices and charts."
    : "Prices, charts and analysis come live from your own Fyers account, for you only.";

  if (compact) {
    return (
      <p className={cn("text-[13px] text-muted-foreground", className)}>
        {title}.{" "}
        <Link href="/brokers" className="font-medium text-primary-ink hover:underline">
          {expired ? "Reconnect" : "Connect Fyers"}
        </Link>
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-foreground/10 px-6 py-12 text-center",
        className
      )}
    >
      <PlugsConnected className="h-6 w-6 text-primary-ink" />
      <div className="space-y-1">
        <p className="text-[15px] font-medium tracking-[-0.01em]">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-pretty text-muted-foreground">{body}</p>
      </div>
      <Button size="sm" render={<Link href="/brokers" />}>
        {expired ? "Reconnect" : "Connect Fyers"}
      </Button>
    </div>
  );
}
