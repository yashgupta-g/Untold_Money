"use client";

import { useEffect, useState } from "react";

import { CampaignPage } from "../page/CampaignPage";
import type { PageContent } from "../schema";

/** Renders the real page template; the editor streams unsaved edits in by postMessage. */
export function LivePreview({ initial }: { initial: PageContent }) {
  const [content, setContent] = useState(initial);
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "goonj-preview") setContent(e.data.content as PageContent);
      if (e.data?.type === "goonj-preview-scroll") {
        const id = String(e.data.section);
        const el = id === "top" ? null : document.getElementById(id === "points" ? "points-title" : id);
        if (el) el.closest("section")?.scrollIntoView({ behavior: "smooth" });
        else window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("message", h);
    window.parent?.postMessage({ type: "goonj-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", h);
  }, []);
  return <CampaignPage content={content} preview />;
}
