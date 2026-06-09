import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

function getLoginNotice(message?: string) {
  if (message === "password-updated") {
    return {
      status: "success" as const,
      message: "Your password has been updated. Please sign in with your new password.",
    };
  }

  if (message === "email-verified") {
    return {
      status: "success" as const,
      message: "Your email has been verified. Please sign in to continue.",
    };
  }

  if (message === "auth-link-invalid") {
    return {
      status: "error" as const,
      message: "That secure link is invalid or has expired. Please request a new link.",
    };
  }

  return undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const notice = getLoginNotice(params.message);

  return (
    <AuthShell
      title="Sign in to Atlas"
      subtitle="Access your secure restaurant operations workspace."
      footer={
        <>
          New to Atlas?{" "}
          <Link href="/signup" className="font-semibold text-[#0F172A] hover:text-[#9A7412]">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm message={notice?.message} messageStatus={notice?.status} />
    </AuthShell>
  );
}
