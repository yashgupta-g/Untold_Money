import Link from "next/link";

import { createCampaign } from "@/features/goonj/campaigns/admin/actions";
import a from "@/features/goonj/campaigns/admin/admin.module.css";
import { NameAndLink } from "@/features/goonj/campaigns/admin/NameAndLink";
import { listCampaigns } from "@/features/goonj/campaigns/admin/queries";

export default async function NewCampaignPage() {
  const all = await listCampaigns();
  const def = all.find((c) => c.kind === "default");
  const templates = all.filter((c) => c.isTemplate && c.status !== "archived");
  const others = all.filter((c) => !c.isTemplate && c.kind !== "default" && c.status !== "archived").slice(0, 6);

  return (
    <main className={a.page}>
      <div className={a.pageHead}>
        <div>
          <h1 className={a.title}>New campaign</h1>
          <p className={a.sub}>It starts as a draft. Nothing goes live until you publish it.</p>
        </div>
        <Link href="/goonj/admin" className={a.btn}>
          Cancel
        </Link>
      </div>

      <form action={createCampaign} className={`${a.card} ${a.newCard} ${a.stack}`}>
        <NameAndLink />

        <fieldset className={a.field} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className={a.label} style={{ marginBottom: 6 }}>
            Type
          </legend>
          <div className={a.choices}>
            <label className={a.choice}>
              <input type="radio" name="kind" value="influencer" defaultChecked />
              <span className={a.choiceTitle}>Influencer</span>
              <span className={a.choiceSub}>A creator shares their own link</span>
            </label>
            <label className={a.choice}>
              <input type="radio" name="kind" value="seasonal" />
              <span className={a.choiceTitle}>Campaign</span>
              <span className={a.choiceSub}>Diwali, a launch, an ad or event</span>
            </label>
          </div>
        </fieldset>

        <fieldset className={a.field} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className={a.label} style={{ marginBottom: 6 }}>
            Start from
          </legend>
          <div className={a.choices}>
            {def ? (
              <label className={a.choice}>
                <input type="radio" name="from" value={def.id} defaultChecked />
                <span className={a.choiceTitle}>Limited release page</span>
                <span className={a.choiceSub}>The current default copy</span>
              </label>
            ) : null}
            {templates.map((t) => (
              <label key={t.id} className={a.choice}>
                <input type="radio" name="from" value={t.id} />
                <span className={a.choiceTitle}>{t.name}</span>
                <span className={a.choiceSub}>Template</span>
              </label>
            ))}
            {others.map((t) => (
              <label key={t.id} className={a.choice}>
                <input type="radio" name="from" value={t.id} />
                <span className={a.choiceTitle}>{t.name}</span>
                <span className={a.choiceSub}>Copy of a campaign</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <button type="submit" className={`${a.btn} ${a.primary}`}>
            Create draft
          </button>
        </div>
      </form>
    </main>
  );
}
