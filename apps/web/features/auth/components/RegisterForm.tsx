"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { ArrowUpRight, Check, CircleNotch, Eye, EyeSlash } from "@phosphor-icons/react";

import { safeNextPath } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { registerSchema, type RegisterFormData } from "@/lib/validations";
import { useRegisterMutation } from "@/store/api/authApi";
import { setCredentials } from "@/store/slices/authSlice";
import shared from "@/features/landing/landing.module.css";
import styles from "../auth.module.css";

const STRENGTH = ["Too weak", "Weak", "Fair", "Good", "Strong"];

export function RegisterForm() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registerUser, { isLoading }] = useRegisterMutation();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      // The schema wants literal `true`; the boxes start unticked.
      accept_terms: false as unknown as true,
      accept_privacy: false as unknown as true,
    },
  });

  const password = useWatch({ control, name: "password", defaultValue: "" }) ?? "";
  const checks = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "One uppercase", met: /[A-Z]/.test(password) },
    { label: "One lowercase", met: /[a-z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.met).length;
  const consentError = errors.accept_terms ?? errors.accept_privacy;

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      const response = await registerUser(data).unwrap();
      if (response.success && response.data) {
        dispatch(
          setCredentials({
            user: response.data.user,
            accessToken: response.data.tokens.access_token,
          }),
        );
        toast.success("Account created. Welcome to UntoldMoney.");
        router.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")));
      }
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "We couldn't create your account. Please try again.";
      setServerError(message);
    }
  };

  const describe = (name: keyof RegisterFormData) =>
    errors[name] ? `${name}-error` : undefined;

  return (
    <div className={styles.content}>
      <div className={styles.intro}>
        <span className={shared.eyebrow}>Create your account</span>
        <h1 className={styles.title}>Start investing with clarity.</h1>
        <p className={styles.sub}>
          Analysis, allocation, trading and your journal in one workspace. Set up takes a
          minute.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="full_name">
            Full name
          </label>
          <input
            id="full_name"
            className={styles.input}
            autoComplete="name"
            placeholder="Aarav Sharma"
            aria-invalid={!!errors.full_name}
            aria-describedby={describe("full_name")}
            {...register("full_name")}
          />
          {errors.full_name && (
            <p id="full_name-error" className={styles.error}>
              {errors.full_name.message}
            </p>
          )}
        </div>

        <div className={styles.row}>
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
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="phone">
                Phone
              </label>
              <span className={styles.hint}>Optional</span>
            </div>
            <input
              id="phone"
              type="tel"
              className={styles.input}
              autoComplete="tel"
              inputMode="tel"
              placeholder="+91 98765 43210"
              {...register("phone")}
            />
          </div>
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
              autoComplete="new-password"
              placeholder="Create a strong password"
              aria-invalid={!!errors.password}
              aria-describedby={cn("password-strength", describe("password"))}
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

          <div id="password-strength" className={styles.strength}>
            <div className={styles.meter} aria-hidden="true">
              {checks.map((c, i) => (
                <i key={c.label} data-on={i < score || undefined} />
              ))}
              <span>{password ? STRENGTH[score] : ""}</span>
            </div>
            {/* Only while there is something left to fix, so the form stays short. */}
            {password && score < checks.length && (
              <ul className={styles.checks} aria-label="Password requirements">
                {checks.map((c) => (
                  <li key={c.label} data-met={c.met || undefined}>
                    <Check size={13} weight="bold" aria-hidden="true" />
                    {c.label}
                    <span className="sr-only">{c.met ? " (met)" : " (not met)"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {errors.password && (
            <p id="password-error" className={styles.error}>
              {errors.password.message}
            </p>
          )}
        </div>

        <div className={styles.consent}>
          {/* One box covers both consents the API records. */}
          <label className={styles.check}>
            <input
              type="checkbox"
              className={styles.box}
              aria-invalid={!!consentError}
              aria-describedby={consentError ? "consent-error" : undefined}
              {...register("accept_terms", {
                onChange: (e) =>
                  setValue("accept_privacy", e.target.checked, {
                    shouldValidate: !!errors.accept_privacy,
                  }),
              })}
            />
            <span>
              I agree to the <b>Terms of Service</b> and <b>Privacy Policy</b>
            </span>
          </label>
          {consentError && (
            <p id="consent-error" className={styles.error}>
              Please accept the Terms of Service and Privacy Policy to continue.
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
          id="register-submit-btn"
          className={cn(shared.btn, shared.btnPrimary, styles.submit)}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <CircleNotch size={18} className={styles.spin} aria-hidden="true" />
              Creating your account
            </>
          ) : (
            <>
              Create account
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
