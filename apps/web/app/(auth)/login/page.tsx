import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Log in · UntoldMoney",
};

export default function LoginPage() {
  return (
    <AuthShell aside={{ prompt: "New to UntoldMoney?", href: "/register", label: "Create an account" }}>
      <LoginForm />
    </AuthShell>
  );
}
