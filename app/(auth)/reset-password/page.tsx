import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use a strong password to protect access to your Atlas workspace."
      footer={
        <>
          Need a new reset link?{" "}
          <Link
            href="/forgot-password"
            className="font-semibold text-[#0F172A] hover:text-[#9A7412]"
          >
            Request one
          </Link>
        </>
      }
    >
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="rounded-sm bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 ring-1 ring-amber-200">
          Open this page from the secure password reset email. If your link has
          expired, request a new reset link.
        </div>
      )}
    </AuthShell>
  );
}
