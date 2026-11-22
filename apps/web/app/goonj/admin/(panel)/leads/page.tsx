import { DownloadSimple } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import a from "@/features/goonj/campaigns/admin/admin.module.css";
import { when } from "@/features/goonj/campaigns/admin/links";
import { allAnswers } from "@/features/goonj/campaigns/answers";
import { LEADS_PAGE, listCampaigns, listLeads } from "@/features/goonj/campaigns/admin/queries";

type Search = { campaign?: string; from?: string; to?: string; page?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [campaigns, { leads, total }] = await Promise.all([
    listCampaigns(),
    listLeads({ campaign: sp.campaign, from: sp.from, to: sp.to, page }),
  ]);
  const names = new Map(campaigns.map((c) => [c.id, c.name]));
  const forms = new Map(campaigns.map((c) => [c.id, c.form]));
  const qs = (extra: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ campaign: sp.campaign, from: sp.from, to: sp.to, ...extra })) {
      if (v) p.set(k, String(v));
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const pages = Math.max(1, Math.ceil(total / LEADS_PAGE));

  return (
    <main className={a.page}>
      <div className={a.pageHead}>
        <div>
          <h1 className={a.title}>Sign-ups</h1>
          <p className={a.sub}>Everyone who filled a campaign form, newest first. Times are India time.</p>
        </div>
        <a href={`/goonj/admin/export${qs({ page: undefined })}`} className={`${a.btn} ${a.light}`}>
          <DownloadSimple />
          Download CSV
        </a>
      </div>

      <div className={a.card}>
        <form className={a.filters} method="get">
          <label className={a.field}>
            <span className={a.label}>Campaign</span>
            <select className={a.input} name="campaign" defaultValue={sp.campaign ?? ""}>
              <option value="">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className={a.field}>
            <span className={a.label}>From</span>
            <input className={a.input} type="date" name="from" defaultValue={sp.from ?? ""} />
          </label>
          <label className={a.field}>
            <span className={a.label}>To</span>
            <input className={a.input} type="date" name="to" defaultValue={sp.to ?? ""} />
          </label>
          <button type="submit" className={a.btn}>
            Apply
          </button>
          {sp.campaign || sp.from || sp.to ? (
            <Link href="/goonj/admin/leads" className={a.btn}>
              Clear
            </Link>
          ) : null}
        </form>

        {leads.length ? (
          <div className={a.tableWrap}>
            <table className={a.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Campaign</th>
                  <th>Source</th>
                  <th>Other answers</th>
                  <th>Signed up</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {[l.first_name, l.last_name].filter(Boolean).join(" ") || "—"}
                      {l.status === "partial" ? (
                        <span className={`${a.pill} ${a.scheduled}`} style={{ marginLeft: 8 }} title="Stopped after step 1: name and email only">
                          Partial
                        </span>
                      ) : null}
                    </td>
                    <td>{l.email || "—"}</td>
                    <td className={a.num}>{l.phone || "—"}</td>
                    <td>{names.get(l.campaign_id) ?? "Deleted campaign"}</td>
                    <td>{[l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(" · ") || "—"}</td>
                    <td className={a.rowMeta} style={{ marginTop: 0 }}>
                      {allAnswers(l.data, forms.get(l.campaign_id))
                        .map(([q, v]) => `${q}: ${v}`)
                        .join(" · ") || "—"}
                    </td>
                    <td className={a.num}>{when(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={a.empty}>No sign-ups match these filters yet.</p>
        )}

        <div className={a.pager}>
          <span className={a.num}>
            {total.toLocaleString("en-IN")} sign-up{total === 1 ? "" : "s"}
          </span>
          {pages > 1 ? (
            <span className={a.editorActions}>
              {page > 1 ? (
                <Link href={`/goonj/admin/leads${qs({ page: page - 1 })}`} className={`${a.btn} ${a.small}`}>
                  Newer
                </Link>
              ) : null}
              <span className={a.num}>
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Link href={`/goonj/admin/leads${qs({ page: page + 1 })}`} className={`${a.btn} ${a.small}`}>
                  Older
                </Link>
              ) : null}
            </span>
          ) : null}
        </div>
      </div>
    </main>
  );
}
