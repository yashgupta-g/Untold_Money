"use client";

import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { submitLead, type LeadState } from "../actions/submitLead";
import s from "../campaign.module.css";
import { formSteps, type CampaignForm, type FormField } from "../schema";
import { FOOTER } from "../static";
import { SuccessPass } from "./SuccessPass";

const COUNTRIES = [
  { code: "+91", label: "IN +91" },
  { code: "+1", label: "US +1" },
  { code: "+44", label: "UK +44" },
  { code: "+971", label: "AE +971" },
  { code: "+65", label: "SG +65" },
  { code: "+61", label: "AU +61" },
  { code: "+49", label: "DE +49" },
  { code: "+966", label: "SA +966" },
  { code: "+974", label: "QA +974" },
  { code: "+977", label: "NP +977" },
];

const PROFILES = [
  { id: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/your-name" },
  { id: "x", label: "X", placeholder: "x.com/your-handle" },
  { id: "other", label: "Other", placeholder: "Medium, Blogger or another link" },
];

const AUTOCOMPLETE: Record<string, string> = {
  first_name: "given-name",
  last_name: "family-name",
  full_name: "name",
  email: "email",
  phone: "tel-national",
  city: "address-level2",
  profile_link: "url",
};

const HALF = new Set(["first_name", "last_name"]);

/*
 * A returning visitor's own details, kept in their browser only, so the next
 * Goonj form they open is already filled. Never read back from the database:
 * looking people up by email would show their phone to anyone who types it.
 * Custom answers are campaign-specific, so they aren't kept.
 */
const REMEMBER_KEY = "goonj:details";
const REMEMBERED = ["first_name", "last_name", "full_name", "email", "phone", "city", "profile_link"];
type Remembered = { values: Record<string, string>; country?: string; profile?: string };

function recall(): Remembered | null {
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY);
    const r = raw ? (JSON.parse(raw) as Remembered) : null;
    return r && typeof r.values === "object" ? r : null;
  } catch {
    return null;
  }
}

function remember(values: Record<string, string>, country: string, profile: string) {
  try {
    const prev = recall()?.values ?? {};
    const next: Record<string, string> = { ...prev };
    for (const k of REMEMBERED) if (values[k]?.trim()) next[k] = values[k].trim().slice(0, 200);
    window.localStorage.setItem(REMEMBER_KEY, JSON.stringify({ values: next, country, profile }));
  } catch {
    // Private mode or storage blocked: nothing to remember.
  }
}
const IDLE: LeadState = { status: "idle" };

type Props = {
  slug: string;
  form: CampaignForm;
  trust?: string;
  preview?: boolean;
  /** "bar": step 1 as one row (name | email | Continue) for centred heroes. */
  variant?: "card" | "bar";
};

export function SignupForm({ slug, form, trust, preview, variant = "card" }: Props) {
  const [state, action, pending] = useActionState(submitLead, IDLE);
  const steps = formSteps(form);
  const twoStep = steps.length === 2;
  // "Back" from step 2 shows step 1 again until the next server answer.
  const [editing, setEditing] = useState(false);
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    setEditing(false);
  }
  // The editor's preview can't submit, so it steps through locally.
  const [previewStep, setPreviewStep] = useState<1 | 2>(1);
  const [values, setValues] = useState<Record<string, string>>({});
  const [country, setCountry] = useState("+91");
  const [profile, setProfile] = useState("linkedin");
  const [consent, setConsent] = useState(false);
  const [meta, setMeta] = useState({ t: "", source: "", medium: "", campaign: "", referrer: "" });
  const uid = useId();
  const firstInput = useRef<HTMLInputElement | null>(null);
  const card = useRef<HTMLDivElement>(null);

  // Arrival time (bots submit instantly) and where the visitor came from.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL once on mount
    setMeta({
      t: String(Date.now()),
      source: q.get("utm_source") ?? "",
      medium: q.get("utm_medium") ?? "",
      campaign: q.get("utm_campaign") ?? "",
      referrer: document.referrer,
    });
    if (preview) return;
    const saved = recall();
    if (!saved) return;
    // Fill only what the visitor hasn't started typing.
    setValues((v) => {
      const next = { ...v };
      for (const k of REMEMBERED) if (saved.values[k] && !next[k]) next[k] = saved.values[k];
      return next;
    });
    if (saved.country && COUNTRIES.some((c) => c.code === saved.country)) setCountry(saved.country);
    if (saved.profile && PROFILES.some((x) => x.id === saved.profile)) setProfile(saved.profile);
  }, [preview]);

  // "Get early access" links scroll here and put the cursor in the first field.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement | null)?.closest('a[href="#signup"]');
      if (!link) return;
      e.preventDefault();
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("signup")?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
      window.setTimeout(() => firstInput.current?.focus({ preventScroll: true }), smooth ? 650 : 0);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!preview && (state.status === "step2" || state.status === "success")) remember(values, country, profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save once per server answer, not on every keystroke
  }, [state]);

  useEffect(() => {
    if (state.status === "success") card.current?.scrollIntoView({ block: "nearest" });
    if (state.status === "step2") firstInput.current?.focus({ preventScroll: true });
  }, [state]);

  if (state.status === "success") {
    const title = personalise(form.successTitle, state.firstName);
    return <SuccessPass ref={card} title={title} body={form.successBody} firstName={state.firstName} />;
  }

  const lead = state.status === "step2" || state.status === "error" ? state.lead : undefined;
  const serverStep = state.status === "step2" ? 2 : state.status === "error" ? state.step : 1;
  const step: 1 | 2 = !twoStep ? 1 : preview ? previewStep : editing ? 1 : serverStep;
  const fields = twoStep ? steps[step - 1] : steps[0];
  const mode = !twoStep ? "all" : String(step);
  const firstName = (values.first_name || values.full_name?.split(/\s+/)[0] || "").trim();

  const errors = state.status === "error" && state.step === step ? state.fieldErrors : {};
  const set = (k: string) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const errId = (k: string) => `${uid}-${k}-err`;
  const a11y = (k: string) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? errId(k) : undefined,
  });
  // Two short fields (e.g. name + email) share a row when the card is wide;
  // first + last name pair up whenever both are asked.
  const keys = new Set(fields.map((f) => f.key));
  const short = fields.every((f) => f.type !== "textarea" && f.key !== "phone" && f.key !== "profile_link");
  const pair = fields.length === 2 && short;
  // The hero bar holds step 1 on one line: up to three short fields (first
  // name | last name | email).
  const bar = variant === "bar" && step === 1 && short && fields.length >= 2 && fields.length <= 3;
  const widthClass = (f: FormField) =>
    pair ? s.pairHalf : HALF.has(f.key) && keys.has("first_name") && keys.has("last_name") ? s.half : "";
  const firstKey = fields.find((f) => f.type !== "select" && f.type !== "textarea")?.key;
  const refFor = (f: FormField) => (f.key === firstKey ? firstInput : undefined);

  const renderControl = (f: FormField) => {
    const common = {
      id: `${uid}-${f.key}`,
      name: f.key,
      className: s.input,
      required: f.required,
      value: values[f.key] ?? "",
      onChange: set(f.key),
      placeholder: f.placeholder ?? (bar ? f.label : undefined),
      autoComplete: AUTOCOMPLETE[f.key] ?? "off",
      ...a11y(f.key),
    };
    if (f.key === "phone") {
      return (
        <div className={s.phone}>
          <select
            className={s.input}
            name="_phone_country"
            aria-label="Country code"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            autoComplete="tel-country-code"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            {...common}
            ref={refFor(f)}
            type="tel"
            inputMode="tel"
            placeholder={f.placeholder ?? (country === "+91" ? "98765 43210" : "Phone number")}
          />
        </div>
      );
    }
    if (f.key === "profile_link") {
      const p = PROFILES.find((x) => x.id === profile) ?? PROFILES[0];
      return (
        <>
          <div className={s.segment} role="radiogroup" aria-label="Profile type">
            {PROFILES.map((x) => (
              <label key={x.id}>
                <input
                  type="radio"
                  name="_profile_type"
                  value={x.id}
                  checked={profile === x.id}
                  onChange={() => setProfile(x.id)}
                />
                {x.label}
              </label>
            ))}
          </div>
          <input {...common} ref={refFor(f)} type="url" inputMode="url" placeholder={p.placeholder} />
        </>
      );
    }
    if (f.type === "textarea") return <textarea {...common} rows={4} />;
    if (f.type === "select") {
      return (
        <select {...common}>
          <option value="" disabled={f.required}>
            {f.placeholder ?? "Choose one"}
          </option>
          {(f.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        {...common}
        ref={refFor(f)}
        type={f.type}
        inputMode={f.type === "email" ? "email" : f.type === "url" ? "url" : undefined}
      />
    );
  };

  // While saving: warmer words with a light shimmer, and the arrow disc turns
  // into a small moving voice wave. Same shape as the label, so nothing jumps.
  const busy = pending ? (
    <>
      <span className={s.busyText} role="status">
        {mode === "1" ? "Saving your spot" : "Sending your request"}
      </span>
      <span className={s.ctaDisc} aria-hidden>
        <span className={s.wave}>
          <i />
          <i />
          <i />
          <i />
        </span>
      </span>
    </>
  ) : null;

  const badFields = fields.filter((f) => errors[f.key]);

  return (
    <div ref={card} className={bar ? s.barWrap : s.formCard}>
      {twoStep && !bar ? (
        <div className={s.progress} aria-label={`Step ${step} of 2`}>
          <span className={s.progressText}>Step {step} of 2</span>
          <span className={s.progressBars} aria-hidden>
            <i data-on="" />
            <i data-on={step === 2 ? "" : undefined} />
          </span>
        </div>
      ) : null}
      {bar ? null : (
        <div className={s.formHead}>
          <h2 className={s.formTitle}>{personalise(form.title, firstName)}</h2>
          {form.subtitle ? <p className={s.formSub}>{personalise(form.subtitle, firstName)}</p> : null}
        </div>
      )}

      <form action={action} noValidate className={bar ? s.bar : s.fields} aria-label={form.title}>
        <input type="hidden" name="_slug" value={slug} />
        <input type="hidden" name="_step" value={mode} />
        <input type="hidden" name="_t" value={meta.t} />
        <input type="hidden" name="_utm_source" value={meta.source} />
        <input type="hidden" name="_utm_medium" value={meta.medium} />
        <input type="hidden" name="_utm_campaign" value={meta.campaign} />
        <input type="hidden" name="_referrer" value={meta.referrer} />
        {lead ? (
          <>
            <input type="hidden" name="_lead" value={lead.id} />
            <input type="hidden" name="_lead_token" value={lead.token} />
          </>
        ) : null}
        <div className={s.honey} aria-hidden>
          {/* A name browsers can't match to a saved profile, so autofill leaves it empty. */}
          <label>
            Leave this empty
            <input type="text" name="_hp" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        {fields.map((f) => (
          <div key={f.key} className={bar ? s.barField : `${s.field} ${widthClass(f)}`}>
            <label htmlFor={`${uid}-${f.key}`} className={bar ? s.srOnly : s.label}>
              {f.label}
              {f.required ? (
                <span className={s.req} aria-hidden>
                  *
                </span>
              ) : (
                <span className={s.optional}>Optional</span>
              )}
            </label>
            {renderControl(f)}
            {errors[f.key] && !bar ? (
              <span id={errId(f.key)} className={s.error}>
                {errors[f.key]}
              </span>
            ) : null}
          </div>
        ))}

        {mode === "all" ? (
          <label className={s.consent}>
            <input
              type="checkbox"
              name="_consent"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              {...a11y("_consent")}
            />
            <span>
              I agree to Goonj&apos;s <Legal />, and to be contacted about early access.
              {errors._consent ? (
                <span id={errId("_consent")} className={s.error} style={{ display: "block", marginTop: 4 }}>
                  {errors._consent}
                </span>
              ) : null}
            </span>
          </label>
        ) : null}

        {state.status === "error" && state.step === step && !bar ? (
          <div className={s.alert} role="alert">
            {state.message}
          </div>
        ) : null}

        {mode === "1" ? (
          <button
            type={preview ? "button" : "submit"}
            className={bar ? `${s.btn} ${s.barBtn}` : `${s.btn} ${s.submit}`}
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={preview ? () => setPreviewStep(2) : undefined}
          >
            {busy ?? <CtaLabel text={form.continueLabel.trim() || "Count me in"} />}
          </button>
        ) : (
          <div className={s.actions}>
            {mode === "2" ? (
              <button
                type="button"
                className={s.back}
                aria-label="Back to name and email"
                disabled={pending}
                onClick={() => (preview ? setPreviewStep(1) : setEditing(true))}
              >
                <ArrowLeft weight="bold" aria-hidden />
              </button>
            ) : null}
            <button
              type="submit"
              className={`${s.btn} ${s.submit}`}
              disabled={pending || preview}
              aria-busy={pending || undefined}
            >
              {busy ?? <CtaLabel text={form.submitLabel} />}
            </button>
          </div>
        )}

        {mode === "1" && !bar ? (
          <p className={s.legal}>
            By continuing, you agree to Goonj&apos;s <Legal />, and to be contacted about early access.
          </p>
        ) : null}
        {preview && !bar ? <p className={s.previewNote}>Preview: sign-ups are switched off here.</p> : null}
      </form>

      {bar ? (
        <>
          {state.status === "error" && state.step === step ? (
            <div className={s.barAlert} role="alert">
              {badFields.length
                ? badFields.map((f) => (
                    <span key={f.key} id={errId(f.key)}>
                      {errors[f.key]}
                    </span>
                  ))
                : state.message}
            </div>
          ) : null}
          <p className={s.barLegal}>
            By continuing, you agree to Goonj&apos;s <Legal />, and to be contacted about early access.
          </p>
        </>
      ) : null}

      {trust ? (
        <p className={s.trustRow}>
          {trust}
        </p>
      ) : null}
    </div>
  );
}

function Legal() {
  return (
    <>
      <a href={FOOTER.termsHref} target="_blank" rel="noreferrer">
        Terms of Service
      </a>{" "}
      and{" "}
      <a href={FOOTER.privacyHref} target="_blank" rel="noreferrer">
        Privacy Policy
      </a>
    </>
  );
}

/** Puts the visitor's first name in for {first_name}; tidies "Thanks, !" when there's none. */
function personalise(text: string, firstName: string) {
  return text
    .replace(/\{first_name\}/g, firstName.trim())
    .replace(/\s*,\s*([!.?])/g, "$1")
    .replace(/\s+([!.?])/g, "$1")
    .trim();
}

/** Button label: gradient text that rolls up on hover, and an arrow disc. */
function CtaLabel({ text }: { text: string }) {
  return (
    <>
      <span className={s.ctaText}>
        <span>{text}</span>
        <span aria-hidden>{text}</span>
      </span>
      <span className={s.ctaDisc} aria-hidden>
        <ArrowRight weight="bold" />
      </span>
    </>
  );
}
