"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowSquareOut,
  ArrowUp,
  CopySimple,
  Desktop,
  DeviceMobile,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { FIELD_LIBRARY } from "../defaults";
import {
  campaignInputSchema,
  formSteps,
  type Campaign,
  type CampaignInput,
  type FormField,
} from "../schema";
import { deleteCampaign, duplicateCampaign, saveCampaign, setStatus, type SaveResult } from "./actions";
import a from "./admin.module.css";
import { liveState, pagePath, when } from "./links";
import { MediaField } from "./MediaField";
import { typingSlug } from "./NameAndLink";
import { CopyLink } from "./ui";

type Tab = "hero" | "form" | "points" | "settings";
const TABS: { id: Tab; label: string }[] = [
  { id: "hero", label: "Hero" },
  { id: "form", label: "Form" },
  { id: "points", label: "Points" },
  { id: "settings", label: "Link & settings" },
];
const tabOf = (path: string): Tab =>
  path.startsWith("hero") ? "hero" : path.startsWith("form") ? "form" : path.startsWith("points") ? "points" : "settings";

const toInput = (c: Campaign): CampaignInput => ({
  name: c.name,
  slug: c.slug,
  kind: c.kind,
  isTemplate: c.isTemplate,
  startsAt: c.startsAt,
  endsAt: c.endsAt,
  hero: c.hero,
  form: c.form,
  points: c.points,
  seo: c.seo,
});

/** ISO <-> the value a datetime-local input wants (the editor's own time zone). */
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

function move<T>(list: T[], i: number, by: number) {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// Small controls -------------------------------------------------------------

function Text({
  label,
  value,
  onChange,
  error,
  max,
  hint,
  area,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
  max: number;
  hint?: string;
  area?: boolean;
  placeholder?: string;
}) {
  const v = value ?? "";
  const props = {
    className: a.input,
    value: v,
    maxLength: max,
    placeholder,
    "aria-invalid": error ? true : undefined,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
  };
  return (
    <label className={a.field}>
      <span className={a.label}>
        {label}
        <span className={a.count}>
          {v.length}/{max}
        </span>
      </span>
      {area ? <textarea {...props} rows={3} /> : <input {...props} />}
      {error ? <span className={a.err}>{error}</span> : hint ? <span className={a.hint}>{hint}</span> : null}
    </label>
  );
}

function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={a.switchRow}>
      <div>
        <div className={a.label}>{label}</div>
        {hint ? <div className={a.hint}>{hint}</div> : null}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} className={a.switch} onClick={() => onChange(!checked)} />
    </div>
  );
}

function ItemHead({
  no,
  title,
  onUp,
  onDown,
  onRemove,
  canRemove = true,
}: {
  no: number;
  title: string;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  canRemove?: boolean;
}) {
  return (
    <div className={a.itemHead}>
      <span className={a.itemNo}>{String(no).padStart(2, "0")}</span>
      <span className={a.itemTitle}>{title || "Untitled"}</span>
      <button type="button" className={`${a.btn} ${a.icon}`} onClick={onUp} aria-label="Move up">
        <ArrowUp />
      </button>
      <button type="button" className={`${a.btn} ${a.icon}`} onClick={onDown} aria-label="Move down">
        <ArrowDown />
      </button>
      {canRemove ? (
        <button type="button" className={`${a.btn} ${a.icon}`} onClick={onRemove} aria-label="Remove">
          <Trash />
        </button>
      ) : null}
    </div>
  );
}

// Editor ---------------------------------------------------------------------

export function Editor({ campaign, origin }: { campaign: Campaign; origin: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<CampaignInput>(() => toInput(campaign));
  const [saved, setSaved] = useState(() => JSON.stringify(toInput(campaign)));
  const [status, setStatusState] = useState(campaign.status);
  const [updatedAt, setUpdatedAt] = useState(campaign.updatedAt);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [tab, setTab] = useState<Tab>("hero");
  const [busy, startBusy] = useTransition();
  const [utm, setUtm] = useState("");

  const isDefault = campaign.kind === "default";
  const dirty = JSON.stringify(draft) !== saved;
  const st = liveState({ status, startsAt: draft.startsAt, endsAt: draft.endsAt });
  const path = pagePath(draft.slug);

  const set = useCallback(<K extends keyof CampaignInput>(key: K, value: CampaignInput[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);
  const hero = (patch: Partial<CampaignInput["hero"]>) => set("hero", { ...draft.hero, ...patch });
  const form = (patch: Partial<CampaignInput["form"]>) => set("form", { ...draft.form, ...patch });
  const points = (patch: Partial<CampaignInput["points"]>) => set("points", { ...draft.points, ...patch });
  const field = (i: number, patch: Partial<FormField>) =>
    form({ fields: draft.form.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const err = (p: string) => errors[p];

  const tabErrors = useMemo(() => {
    const n: Record<Tab, number> = { hero: 0, form: 0, points: 0, settings: 0 };
    for (const k of Object.keys(errors)) n[tabOf(k)]++;
    return n;
  }, [errors]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const apply = (r: SaveResult, okText?: string) => {
    if (!r.ok) {
      setErrors(r.errors ?? {});
      setNotice({ tone: "error", text: r.message });
      if (r.errors) {
        const first = Object.keys(r.errors)[0];
        if (first) setTab(tabOf(first));
      }
      return false;
    }
    setStatusState(r.status as Campaign["status"]);
    setUpdatedAt(r.updatedAt);
    setErrors({});
    setNotice(okText ? { tone: "info", text: okText } : null);
    return true;
  };

  const validate = () => {
    const parsed = campaignInputSchema.safeParse(draft);
    if (parsed.success) return true;
    const e: Record<string, string> = {};
    for (const i of parsed.error.issues) e[i.path.map(String).join(".")] ??= i.message;
    setErrors(e);
    setNotice({ tone: "error", text: "Some fields need attention." });
    setTab(tabOf(Object.keys(e)[0] ?? "hero"));
    return false;
  };

  const save = (then?: () => Promise<void>) =>
    startBusy(async () => {
      if (!validate()) return;
      const snapshot = JSON.stringify(draft);
      const r = await saveCampaign(campaign.id, draft);
      if (!apply(r, then ? undefined : "Saved.")) return;
      if (r.ok && r.slug !== draft.slug) set("slug", r.slug);
      setSaved(snapshot);
      if (then) await then();
    });

  const publish = () =>
    save(async () => {
      apply(await setStatus(campaign.id, "published"), "Published. The link is live.");
    });

  const status_ = (next: "draft" | "archived", text: string) =>
    startBusy(async () => {
      if (apply(await setStatus(campaign.id, next), text) && next === "archived") router.refresh();
    });

  // Cmd/Ctrl+S saves.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const usedKeys = new Set(draft.form.fields.map((f) => f.key));
  const addable = FIELD_LIBRARY.filter((f) => !usedKeys.has(f.key));
  const linkWithUtm = utm ? `${path}?utm_source=${encodeURIComponent(utm)}` : path;

  return (
    <div className={a.editor}>
      <div className={a.editorSide}>
        <div className={a.editorBar}>
          <div className={a.editorTitleRow}>
            <Link href="/goonj/admin" className={`${a.btn} ${a.icon}`} aria-label="Back to campaigns">
              <ArrowLeft />
            </Link>
            <h1 className={a.editorName}>{draft.name || "Untitled"}</h1>
            <span className={`${a.pill} ${a[st.tone] ?? ""}`}>{st.label}</span>
          </div>
          <div className={a.editorActions}>
            <span className={a.saveState} aria-live="polite">
              {busy ? "Saving…" : dirty ? "Unsaved changes" : `Saved ${when(updatedAt)}`}
            </span>
            <button type="button" className={a.btn} onClick={() => save()} disabled={busy || !dirty}>
              Save
            </button>
            {status === "published" ? (
              isDefault ? null : (
                <button type="button" className={a.btn} onClick={() => status_("draft", "Unpublished. The link now shows a not-found page.")} disabled={busy}>
                  Unpublish
                </button>
              )
            ) : status === "draft" ? (
              <button type="button" className={`${a.btn} ${a.primary}`} onClick={publish} disabled={busy}>
                Publish
              </button>
            ) : (
              <button type="button" className={a.btn} onClick={() => status_("draft", "Restored as a draft.")} disabled={busy}>
                Restore
              </button>
            )}
            {status === "published" && dirty ? (
              <button type="button" className={`${a.btn} ${a.primary}`} onClick={() => save()} disabled={busy}>
                Update live page
              </button>
            ) : null}
          </div>
          <div className={a.tabs} role="tablist" aria-label="Sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                className={a.tab}
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {tabErrors[t.id] ? <span className={a.tabCount}>{tabErrors[t.id]}</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className={`${a.editorBody} ${a.stack}`}>
          {notice ? (
            <p className={`${a.notice} ${notice.tone === "info" ? a.noticeInfo : ""}`} role={notice.tone === "error" ? "alert" : "status"}>
              {notice.text}
            </p>
          ) : null}

          {tab === "hero" ? (
            <>
              <div className={a.group}>
                <div className={a.groupHead}>Headline</div>
                <Text label="Heading" value={draft.hero.title} max={140} error={err("hero.title")} onChange={(v) => hero({ title: v })} area />
                <Text
                  label="Words to colour orange"
                  value={draft.hero.titleAccent}
                  max={80}
                  error={err("hero.titleAccent")}
                  hint={
                    draft.hero.titleAccent && !draft.hero.title.includes(draft.hero.titleAccent)
                      ? "These words aren't in the heading, so nothing is coloured."
                      : "Copy a few words from the heading exactly."
                  }
                  onChange={(v) => hero({ titleAccent: v || undefined })}
                />
                <Text label="Subheading" value={draft.hero.subtitle} max={280} error={err("hero.subtitle")} onChange={(v) => hero({ subtitle: v })} area />
                <Text
                  label="Badge"
                  value={draft.hero.badge}
                  max={60}
                  hint={draft.hero.creator ? "Hidden: the creator's name shows instead." : "The small label above the heading."}
                  onChange={(v) => hero({ badge: v || undefined })}
                />
              </div>

              <div className={a.group}>
                <div className={a.groupHead}>Image or video</div>
                <MediaField value={draft.hero.media} error={err("hero.media.url")} onChange={(m) => hero({ media: m })} />
              </div>

              <div className={a.group}>
                <Switch
                  label="Show a creator name"
                  hint="For influencer pages: their name on the photo and in the badge."
                  checked={Boolean(draft.hero.creator)}
                  onChange={(on) => hero({ creator: on ? { name: draft.name, handle: "" } : undefined })}
                />
                {draft.hero.creator ? (
                  <div className={a.row2}>
                    <Text
                      label="Name"
                      value={draft.hero.creator.name}
                      max={60}
                      error={err("hero.creator.name")}
                      onChange={(v) => hero({ creator: { ...draft.hero.creator!, name: v } })}
                    />
                    <Text
                      label="Handle"
                      value={draft.hero.creator.handle}
                      max={60}
                      placeholder="@handle"
                      onChange={(v) => hero({ creator: { ...draft.hero.creator!, handle: v || undefined } })}
                    />
                  </div>
                ) : null}
              </div>

              <div className={a.group}>
                <div className={a.groupHead}>
                  Bullet points
                  {draft.hero.bullets.length < 4 ? (
                    <button type="button" className={`${a.btn} ${a.small}`} onClick={() => hero({ bullets: [...draft.hero.bullets, ""] })}>
                      <Plus />
                      Add
                    </button>
                  ) : null}
                </div>
                {draft.hero.bullets.map((b, i) => (
                  <div key={i} className={a.item}>
                    <ItemHead
                      no={i + 1}
                      title={b}
                      onUp={() => hero({ bullets: move(draft.hero.bullets, i, -1) })}
                      onDown={() => hero({ bullets: move(draft.hero.bullets, i, 1) })}
                      onRemove={() => hero({ bullets: draft.hero.bullets.filter((_, j) => j !== i) })}
                    />
                    <Text label="Text" value={b} max={90} error={err(`hero.bullets.${i}`)} onChange={(v) => hero({ bullets: draft.hero.bullets.map((x, j) => (j === i ? v : x)) })} />
                  </div>
                ))}
                {!draft.hero.bullets.length ? <span className={a.hint}>No bullets. The hero shows just the heading and button.</span> : null}
              </div>

              <div className={a.group}>
                <div className={a.groupHead}>Button</div>
                <div className={a.row2}>
                  <Text label="Button text" value={draft.hero.ctaLabel} max={40} error={err("hero.ctaLabel")} onChange={(v) => hero({ ctaLabel: v })} />
                  <Text label="Reassurance line (under the form)" value={draft.hero.trustLine} max={90} onChange={(v) => hero({ trustLine: v })} />
                </div>
              </div>
            </>
          ) : null}

          {tab === "form" ? (
            <>
              <div className={a.group}>
                <div className={a.groupHead}>Text</div>
                <Text
                  label="Heading"
                  hint={
                    formSteps(draft.form).length > 1
                      ? "Shown on step 2, after name and email. {first_name} becomes their first name, e.g. “Almost there, {first_name}.”"
                      : "Shown at the top of the form. {first_name} isn't known yet here."
                  }
                  value={draft.form.title}
                  max={120}
                  error={err("form.title")}
                  onChange={(v) => form({ title: v })}
                />
                <Text label="Subheading" value={draft.form.subtitle} max={200} onChange={(v) => form({ subtitle: v })} />
                {formSteps(draft.form).length > 1 ? (
                  <Text
                    label="First button text"
                    hint="On step 1, after name and email. Make it inviting, like “Count me in” or “Save my spot”."
                    value={draft.form.continueLabel}
                    max={30}
                    placeholder="Count me in"
                    onChange={(v) => form({ continueLabel: v })}
                  />
                ) : null}
                <Text
                  label={formSteps(draft.form).length > 1 ? "Final button text" : "Button text"}
                  value={draft.form.submitLabel}
                  max={40}
                  error={err("form.submitLabel")}
                  onChange={(v) => form({ submitLabel: v })}
                />
              </div>

              <div className={a.group}>
                <div className={a.groupHead}>
                  Fields
                  {addable.length ? (
                    <select
                      className={a.input}
                      style={{ width: "auto", height: 32 }}
                      value=""
                      aria-label="Add a field"
                      onChange={(e) => {
                        const lib = FIELD_LIBRARY.find((f) => f.key === e.target.value);
                        if (lib) form({ fields: [...draft.form.fields, { key: lib.key, label: lib.label, type: lib.type, required: false }] });
                      }}
                    >
                      <option value="">+ Add field</option>
                      {addable.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
                {err("form.fields") ? <span className={a.err}>{err("form.fields")}</span> : null}
                <Switch
                  label="Two-step form"
                  hint={
                    formSteps(draft.form).length === 2
                      ? "Step 1 asks for name and email, step 2 for the rest. Step 1 is saved even if they stop there (shown as Partial in Sign-ups)."
                      : draft.form.twoStep
                        ? "Shown as one step: this form needs more than 3 fields, with an email or phone, for a second step."
                        : "All fields on one step."
                  }
                  checked={draft.form.twoStep}
                  onChange={(v) => form({ twoStep: v })}
                />
                {draft.form.fields.map((f, i) => {
                  const custom = f.key.startsWith("custom_");
                  return (
                    <div key={f.key} className={a.item}>
                      <ItemHead
                        no={i + 1}
                        title={f.label}
                        onUp={() => form({ fields: move(draft.form.fields, i, -1) })}
                        onDown={() => form({ fields: move(draft.form.fields, i, 1) })}
                        onRemove={() => form({ fields: draft.form.fields.filter((_, j) => j !== i) })}
                        canRemove={draft.form.fields.length > 1}
                      />
                      <Text label="Label" value={f.label} max={60} error={err(`form.fields.${i}.label`)} onChange={(v) => field(i, { label: v })} />
                      {custom ? (
                        <label className={a.field}>
                          <span className={a.label}>Answer type</span>
                          <select
                            className={a.input}
                            value={f.type}
                            onChange={(e) => field(i, { type: e.target.value as FormField["type"], options: e.target.value === "select" ? f.options ?? [] : undefined })}
                          >
                            <option value="text">Short text</option>
                            <option value="textarea">Long text</option>
                            <option value="select">Dropdown</option>
                            <option value="url">Link</option>
                          </select>
                        </label>
                      ) : null}
                      {f.type === "select" ? (
                        <Text
                          label="Options (one per line)"
                          value={(f.options ?? []).join("\n")}
                          max={600}
                          area
                          error={err(`form.fields.${i}.options`)}
                          onChange={(v) => field(i, { options: v.split("\n").map((x) => x.trimStart()).slice(0, 12) })}
                        />
                      ) : null}
                      <Switch label="Required" checked={f.required} onChange={(v) => field(i, { required: v })} />
                    </div>
                  );
                })}
                <span className={a.hint}>Every form also asks for consent to the Terms and Privacy Policy (a tick box, or &quot;By continuing, you agree…&quot; on step 1).</span>
              </div>

              <div className={a.group}>
                <div className={a.groupHead}>After sign-up</div>
                <Text
                  label="Thank-you heading"
                  value={draft.form.successTitle}
                  max={80}
                  error={err("form.successTitle")}
                  hint="{first_name} is replaced with the visitor's first name."
                  onChange={(v) => form({ successTitle: v })}
                />
                <Text label="Thank-you message" value={draft.form.successBody} max={400} area onChange={(v) => form({ successBody: v })} />
              </div>
            </>
          ) : null}

          {tab === "points" ? (
            <>
              <div className={a.group}>
                <div className={a.groupHead}>Heading</div>
                <Text label="Small label" value={draft.points.eyebrow} max={60} onChange={(v) => points({ eyebrow: v })} />
                <Text label="Heading" value={draft.points.title} max={120} error={err("points.title")} onChange={(v) => points({ title: v })} />
              </div>
              <div className={a.group}>
                <div className={a.groupHead}>Image beside the points</div>
                <MediaField
                  value={draft.points.image}
                  allowVideo
                  onChange={(m) => points({ image: m })}
                  onRemove={() => points({ image: undefined })}
                />
              </div>
              <div className={a.group}>
                <div className={a.groupHead}>
                  Points
                  {draft.points.items.length < 8 ? (
                    <button type="button" className={`${a.btn} ${a.small}`} onClick={() => points({ items: [...draft.points.items, { title: "", body: "" }] })}>
                      <Plus />
                      Add
                    </button>
                  ) : null}
                </div>
                {err("points.items") ? <span className={a.err}>{err("points.items")}</span> : null}
                {draft.points.items.map((p, i) => (
                  <div key={i} className={a.item}>
                    <ItemHead
                      no={i + 1}
                      title={p.title}
                      onUp={() => points({ items: move(draft.points.items, i, -1) })}
                      onDown={() => points({ items: move(draft.points.items, i, 1) })}
                      onRemove={() => points({ items: draft.points.items.filter((_, j) => j !== i) })}
                      canRemove={draft.points.items.length > 1}
                    />
                    <Text
                      label="Title"
                      value={p.title}
                      max={80}
                      error={err(`points.items.${i}.title`)}
                      onChange={(v) => points({ items: draft.points.items.map((x, j) => (j === i ? { ...x, title: v } : x)) })}
                    />
                    <Text
                      label="Text"
                      value={p.body}
                      max={220}
                      area
                      onChange={(v) => points({ items: draft.points.items.map((x, j) => (j === i ? { ...x, body: v } : x)) })}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {tab === "settings" ? (
            <>
              <div className={a.group}>
                <div className={a.groupHead}>Campaign</div>
                <Text label="Name" value={draft.name} max={120} error={err("name")} hint="Only your team sees this." onChange={(v) => set("name", v)} />
                {isDefault ? (
                  <p className={a.hint}>This is the default limited-release page. Its link and type are fixed, and it is always live.</p>
                ) : (
                  <>
                    <label className={a.field}>
                      <span className={a.label}>Link</span>
                      <span className={a.prefixed}>
                        <span className={a.prefix}>{origin.replace(/^https?:\/\//, "")}/c/</span>
                        <input
                          className={a.input}
                          value={draft.slug}
                          maxLength={40}
                          aria-invalid={err("slug") ? true : undefined}
                          onChange={(e) => set("slug", typingSlug(e.target.value))}
                        />
                      </span>
                      {err("slug") ? (
                        <span className={a.err}>{err("slug")}</span>
                      ) : status === "published" && draft.slug !== campaign.slug ? (
                        <span className={a.hint}>Changing the link of a live page breaks links already shared.</span>
                      ) : null}
                    </label>
                    <label className={a.field}>
                      <span className={a.label}>Type</span>
                      <select className={a.input} value={draft.kind} onChange={(e) => set("kind", e.target.value as CampaignInput["kind"])}>
                        <option value="influencer">Influencer</option>
                        <option value="seasonal">Campaign</option>
                      </select>
                    </label>
                    <Switch
                      label="Save as a template"
                      hint="Templates show up first when someone starts a new campaign."
                      checked={draft.isTemplate}
                      onChange={(v) => set("isTemplate", v)}
                    />
                  </>
                )}
              </div>

              {!isDefault ? (
                <div className={a.group}>
                  <div className={a.groupHead}>Share</div>
                  <label className={a.field}>
                    <span className={a.label}>
                      Where it&apos;s shared <span className={a.hint}>Optional</span>
                    </span>
                    <input
                      className={a.input}
                      placeholder="instagram, youtube, whatsapp…"
                      value={utm}
                      maxLength={40}
                      onChange={(e) => setUtm(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    />
                    <span className={a.hint}>Adds a source tag to the link, so sign-ups show where they came from.</span>
                  </label>
                  <div className={a.editorActions}>
                    <CopyLink path={linkWithUtm} />
                    <span className={a.hint} style={{ wordBreak: "break-all" }}>
                      {origin.replace(/^https?:\/\//, "")}
                      {linkWithUtm}
                    </span>
                  </div>
                </div>
              ) : null}

              {!isDefault ? (
                <div className={a.group}>
                  <div className={a.groupHead}>Schedule</div>
                  <div className={a.row2}>
                    <label className={a.field}>
                      <span className={a.label}>Goes live</span>
                      <input className={a.input} type="datetime-local" value={toLocal(draft.startsAt)} onChange={(e) => set("startsAt", fromLocal(e.target.value))} />
                    </label>
                    <label className={a.field}>
                      <span className={a.label}>Ends</span>
                      <input className={a.input} type="datetime-local" value={toLocal(draft.endsAt)} onChange={(e) => set("endsAt", fromLocal(e.target.value))} />
                    </label>
                  </div>
                  {err("endsAt") || err("startsAt") ? <span className={a.err}>{err("endsAt") || err("startsAt")}</span> : null}
                  <span className={a.hint}>Leave empty to run while published. After the end time the link shows a not-found page.</span>
                </div>
              ) : null}

              <div className={a.group}>
                <div className={a.groupHead}>Link preview (WhatsApp, Instagram, X)</div>
                <Text label="Title" value={draft.seo.title} max={70} hint="Defaults to the heading." onChange={(v) => set("seo", { ...draft.seo, title: v || undefined })} />
                <Text
                  label="Description"
                  value={draft.seo.description}
                  max={200}
                  area
                  hint="Defaults to the subheading."
                  onChange={(v) => set("seo", { ...draft.seo, description: v || undefined })}
                />
              </div>

              {!isDefault ? (
                <div className={a.group}>
                  <div className={a.groupHead}>More</div>
                  <div className={a.editorActions}>
                    <button type="button" className={a.btn} disabled={busy} onClick={() => startBusy(() => duplicateCampaign(campaign.id))}>
                      <CopySimple />
                      Duplicate
                    </button>
                    {status !== "archived" ? (
                      <button
                        type="button"
                        className={`${a.btn} ${a.danger}`}
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm("Archive this campaign? Its link stops working. Sign-ups are kept.")) {
                            status_("archived", "Archived. The link no longer works.");
                          }
                        }}
                      >
                        <Trash />
                        Archive
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`${a.btn} ${a.danger}`}
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm("Delete this campaign for good? This can't be undone.")) return;
                          startBusy(async () => {
                            const r = await deleteCampaign(campaign.id);
                            if (apply(r)) router.push("/goonj/admin?f=archived");
                          });
                        }}
                      >
                        <Trash />
                        Delete for good
                      </button>
                    )}
                  </div>
                  <span className={a.hint}>Archived campaigns keep their sign-ups. Only campaigns without sign-ups can be deleted.</span>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <Preview id={campaign.id} draft={draft} path={path} origin={origin} tab={tab} />
    </div>
  );
}

// Live preview ---------------------------------------------------------------

const DEVICES = { desktop: { w: 1440, h: 900 }, phone: { w: 390, h: 844 } };

const SECTION_FOR: Record<Tab, string> = { hero: "top", form: "signup", points: "points", settings: "top" };

function Preview({ id, draft, path, origin, tab }: { id: string; draft: CampaignInput; path: string; origin: string; tab: Tab }) {
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [box, setBox] = useState({ w: 800, h: 600 });
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const content = useMemo(
    () => ({ slug: draft.slug, hero: draft.hero, form: draft.form, points: draft.points, seo: draft.seo }),
    [draft],
  );

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const send = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: "goonj-preview", content }, window.location.origin);
  }, [content]);

  useEffect(() => {
    const t = window.setTimeout(send, 120);
    return () => window.clearTimeout(t);
  }, [send]);

  // Show the part of the page that's being edited.
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: "goonj-preview-scroll", section: SECTION_FOR[tab] }, window.location.origin);
  }, [tab]);

  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "goonj-preview-ready") send();
    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, [send]);

  const d = DEVICES[device];
  const scale = Math.min(1, (box.w - 32) / d.w);
  const height = device === "phone" ? Math.min(d.h, (box.h - 32) / scale) : (box.h - 32) / scale;

  return (
    <section className={a.previewPane} aria-label="Live preview">
      <div className={a.previewBar}>
        <div className={a.tabs} role="tablist" aria-label="Preview size">
          <button type="button" role="tab" className={a.tab} aria-selected={device === "desktop"} onClick={() => setDevice("desktop")}>
            <Desktop />
            Desktop
          </button>
          <button type="button" role="tab" className={a.tab} aria-selected={device === "phone"} onClick={() => setDevice("phone")}>
            <DeviceMobile />
            Phone
          </button>
        </div>
        <span className={a.previewUrl}>
          {origin.replace(/^https?:\/\//, "")}
          {path}
        </span>
        <a href={`/goonj/admin/preview/${id}`} target="_blank" rel="noreferrer" className={`${a.btn} ${a.small}`}>
          <ArrowSquareOut />
          Open saved version
        </a>
      </div>
      <div ref={stage} className={a.previewStage}>
        <iframe
          ref={frame}
          title="Page preview"
          src={`/goonj/admin/preview/${id}?embed=1`}
          className={a.frame}
          style={{ width: d.w, height, transform: `translateX(-50%) scale(${scale})` }}
          onLoad={send}
        />
      </div>
    </section>
  );
}
