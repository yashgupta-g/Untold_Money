import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: "Create your account · UntoldMoney",
};

export default function RegisterPage() {
  return (
    <AuthShell aside={{ prompt: "Already have an account?", href: "/login", label: "Log in" }}>
      <RegisterForm />
    </AuthShell>
  );
}
