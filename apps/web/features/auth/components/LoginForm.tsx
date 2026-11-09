"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { ArrowUpRight, CircleNotch, Eye, EyeSlash } from "@phosphor-icons/react";

import { safeNextPath } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { useLoginMutation } from "@/store/api/authApi";
import { setCredentials } from "@/store/slices/authSlice";
import shared from "@/features/landing/landing.module.css";
import styles from "../auth.module.css";

export function LoginForm() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loginUser, { isLoading }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const response = await loginUser(data).unwrap();
      if (response.success && response.data) {
        dispatch(
          setCredentials({
            user: response.data.user,
            accessToken: response.data.tokens.access_token,
          }),
        );
        toast.success("Welcome back.");
        router.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")));
      }
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "We couldn't log you in. Please try again.";
      setServerError(message);
    }
  };

  const describe = (name: keyof LoginFormData) => (errors[name] ? `${name}-error` : undefined);

  return (
    <div className={styles.content}>
      <div className={styles.intro}>
        <span className={shared.eyebrow}>Log in</span>
        <h1 className={styles.title}>Welcome back.</h1>
        <p className={styles.sub}>
          Pick up where you left off: your analysis, allocation, trades and journal.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={styles.input}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            autoFocus
            aria-invalid={!!errors.email}
            aria-describedby={describe("email")}
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" className={styles.error}>
              {errors.email.message}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <div className={styles.control}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className={cn(styles.input, styles.withToggle)}
              autoComplete="current-password"
              placeholder="Your password"
              aria-invalid={!!errors.password}
              aria-describedby={describe("password")}
              {...register("password")}
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className={styles.error}>
              {errors.password.message}
            </p>
          )}
        </div>

        {serverError && (
          <p className={styles.alert} role="alert">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          id="login-submit-btn"
          className={cn(shared.btn, shared.btnPrimary, styles.submit)}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <CircleNotch size={18} className={styles.spin} aria-hidden="true" />
              Logging in
            </>
          ) : (
            <>
              Log in
              <span className={shared.btnArrow}>
                <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
