/** Money and percent formatting: rupees with Indian digit grouping. */

export const rupees = (value: number, decimals = 0) =>
  `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

/** "+₹1,250" / "−₹640" (a true minus sign, so columns line up). */
export const signedRupees = (value: number, decimals = 0) =>
  `${value >= 0 ? "+" : "−"}${rupees(Math.abs(value), decimals)}`;

export const percent = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;

/** "5 min ago", "3 h ago", or a date for anything older than a day. */
export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
