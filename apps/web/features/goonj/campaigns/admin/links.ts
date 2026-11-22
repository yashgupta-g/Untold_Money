import { DEFAULT_SLUG } from "../defaults";
import type { Campaign } from "../schema";

/** Where a campaign lives on the site. */
export const pagePath = (slug: string) => (slug === DEFAULT_SLUG ? "/goonj/limited-release" : `/c/${slug}`);

/** Live, scheduled, ended, draft or archived, for the status pill. */
export function liveState(c: Pick<Campaign, "status" | "startsAt" | "endsAt">, now = Date.now()) {
  if (c.status === "archived") return { label: "Archived", tone: "archived" as const };
  if (c.status === "draft") return { label: "Draft", tone: "draft" as const };
  if (c.startsAt && Date.parse(c.startsAt) > now) return { label: "Scheduled", tone: "scheduled" as const };
  if (c.endsAt && Date.parse(c.endsAt) <= now) return { label: "Ended", tone: "archived" as const };
  return { label: "Live", tone: "live" as const };
}

const fmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});
export const when = (iso: string | null) => (iso ? fmt.format(new Date(iso)) : "—");
