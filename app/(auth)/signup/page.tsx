import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your Atlas account"
      subtitle="Set up secure access for your restaurant operations workspace."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#0F172A] hover:text-[#9A7412]">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
