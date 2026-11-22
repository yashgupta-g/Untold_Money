"use client";

import { useEffect, useState, useTransition } from "react";

import { checkSlug } from "./actions";
import a from "./admin.module.css";

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");

/** Light clean-up while typing: keeps a trailing dash so "avika-" can become "avika-diwali". */
export const typingSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, 40);

/** Name plus its link. The link follows the name until it's edited by hand. */
export function NameAndLink() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [check, setCheck] = useState<{ ok: boolean; message?: string } | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    if (!slug) return;
    const t = window.setTimeout(() => start(async () => setCheck(await checkSlug(slug))), 350);
    return () => window.clearTimeout(t);
  }, [slug]);

  return (
    <>
      <label className={a.field}>
        <span className={a.label}>Name</span>
        <input
          className={a.input}
          name="name"
          required
          maxLength={120}
          placeholder="e.g. Avika, Instagram, December"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!touched) setSlug(slugify(e.target.value));
          }}
        />
        <span className={a.hint}>Only your team sees this.</span>
      </label>
      <label className={a.field}>
        <span className={a.label}>Link</span>
        <span className={a.prefixed}>
          <span className={a.prefix}>goonj.com/c/</span>
          <input
            className={a.input}
            name="slug"
            required
            maxLength={40}
            value={slug}
            aria-invalid={check && !check.ok ? true : undefined}
            onChange={(e) => {
              setTouched(true);
              setSlug(typingSlug(e.target.value));
            }}
          />
        </span>
        {slug && check ? (
          <span className={check.ok ? a.ok : a.err}>{check.ok ? "This link is free" : check.message}</span>
        ) : null}
      </label>
    </>
  );
}
