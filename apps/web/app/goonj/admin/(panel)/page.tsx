import { CopySimple, PencilSimple, Plus } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { duplicateCampaign } from "@/features/goonj/campaigns/admin/actions";
import a from "@/features/goonj/campaigns/admin/admin.module.css";
import { liveState, pagePath, when } from "@/features/goonj/campaigns/admin/links";
import { listCampaigns } from "@/features/goonj/campaigns/admin/queries";
import { CopyLink } from "@/features/goonj/campaigns/admin/ui";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "draft", label: "Drafts" },
  { id: "templates", label: "Templates" },
  { id: "archived", label: "Archived" },
] as const;

const KIND_LABEL = { influencer: "Influencer", seasonal: "Campaign", default: "Default page" };

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f = "all" } = await searchParams;
  const all = await listCampaigns();
  const rows = all.filter((c) => {
    const state = liveState(c).tone;
    if (f === "live") return state === "live" || state === "scheduled";
    if (f === "draft") return c.status === "draft";
    if (f === "templates") return c.isTemplate && c.status !== "archived";
    if (f === "archived") return c.status === "archived";
    return c.status !== "archived";
  });

  return (
    <main className={a.page}>
      <div className={a.pageHead}>
        <div>
          <h1 className={a.title}>Campaigns</h1>
          <p className={a.sub}>
            Each campaign is one page with its own hero, form and points. Share its link with the influencer.
          </p>
        </div>
        <Link href="/goonj/admin/new" className={`${a.btn} ${a.primary}`}>
          <Plus weight="bold" />
          New campaign
        </Link>
      </div>

      <div className={a.tabs} style={{ display: "inline-flex", marginBottom: 16 }} role="tablist">
        {FILTERS.map((x) => (
          <Link
            key={x.id}
            href={x.id === "all" ? "/goonj/admin" : `/goonj/admin?f=${x.id}`}
            className={a.tab}
            aria-current={f === x.id ? "page" : undefined}
          >
            {x.label}
          </Link>
        ))}
      </div>

      <div className={a.card}>
        {rows.length ? (
          <div className={a.tableWrap}>
            <table className={a.table}>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Sign-ups</th>
                  <th>Updated</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const st = liveState(c);
                  const path = pagePath(c.slug);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/goonj/admin/${c.id}`} className={a.rowName}>
                          {c.name}
                        </Link>
                        {c.isTemplate ? <span className={a.tplTag}>Template</span> : null}
                        <span className={a.rowMeta}>{path}</span>
                      </td>
                      <td>
                        <span className={`${a.pill} ${a[st.tone] ?? ""}`}>{st.label}</span>
                      </td>
                      <td>{KIND_LABEL[c.kind]}</td>
                      <td className={a.num}>
                        {c.leads ? (
                          <Link href={`/goonj/admin/leads?campaign=${c.id}`} className={a.rowName}>
                            {c.leads.toLocaleString("en-IN")}
                          </Link>
                        ) : (
                          0
                        )}
                      </td>
                      <td className={a.num}>{when(c.updatedAt)}</td>
                      <td>
                        <div className={a.actions}>
                          {c.status !== "archived" ? <CopyLink path={path} small /> : null}
                          <Link href={`/goonj/admin/${c.id}`} className={`${a.btn} ${a.small}`}>
                            <PencilSimple />
                            Edit
                          </Link>
                          <form action={duplicateCampaign.bind(null, c.id)}>
                            <button type="submit" className={`${a.btn} ${a.small}`} title="Make a copy as a new draft">
                              <CopySimple />
                              Duplicate
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={a.empty}>No campaigns here yet.</p>
        )}
      </div>
    </main>
  );
}
