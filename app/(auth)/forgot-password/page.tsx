import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and Atlas will send a secure password reset link."
      footer={
        <>
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-[#0F172A] hover:text-[#9A7412]">
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
