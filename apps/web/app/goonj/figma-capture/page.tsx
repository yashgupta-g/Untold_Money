import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDefaultPage } from "@/features/goonj/campaigns/data";
import { CampaignPage } from "@/features/goonj/campaigns/page/CampaignPage";
import { SuccessPass } from "@/features/goonj/campaigns/page/SuccessPass";

export const metadata: Metadata = { title: "Goonj · Figma capture", robots: { index: false } };

/**
 * Dev only (404 in production): the limited-release page in preview mode, so
 * the sign-up form steps without creating sign-ups, plus a hidden success
 * pass. tools/goonj-figma/capture.mjs reads this to build the Figma prototype.
 */
export default async function FigmaCapture() {
  if (process.env.NODE_ENV === "production") notFound();
  const content = await getDefaultPage();
  return (
    <>
      <CampaignPage content={content} preview />
      <div id="capture-success" style={{ display: "none" }}>
        <SuccessPass
          title={content.form.successTitle.replace("{first_name}", "Yash")}
          body={content.form.successBody}
          firstName="Yash"
        />
      </div>
    </>
  );
}
