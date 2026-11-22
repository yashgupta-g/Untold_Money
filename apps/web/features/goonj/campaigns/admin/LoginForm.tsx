"use client";

import { useActionState } from "react";

import { BrandLogo } from "../../components/BrandLogo";
import { signIn } from "./actions";
import a from "./admin.module.css";

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className={a.loginCard}>
      <BrandLogo priority />
      <div>
        <h1 className={a.title} style={{ fontSize: 24 }}>
          Campaign dashboard
        </h1>
        <p className={a.sub}>Log in to edit Goonj campaign pages.</p>
      </div>
      {!configured ? (
        <p className={a.notice}>Supabase isn&apos;t configured. Add the keys to .env.local (see the README).</p>
      ) : null}
      <label className={a.field}>
        <span className={a.label}>Email</span>
        <input
          key={state?.email ?? ""}
          className={a.input}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={state?.email}
          required
        />
      </label>
      <label className={a.field}>
        <span className={a.label}>Password</span>
        <input
          className={a.input}
          type="password"
          name="password"
          autoComplete="current-password"
          autoFocus={Boolean(state?.email)}
          required
        />
      </label>
      {state?.error ? (
        <p className={a.err} role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className={`${a.btn} ${a.primary}`} disabled={pending || !configured} style={{ height: 44 }}>
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
