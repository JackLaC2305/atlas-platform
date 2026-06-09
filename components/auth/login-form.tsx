"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction, type AuthActionState } from "@/app/(auth)/actions";
import { FormMessage } from "@/components/auth/form-message";

export function LoginForm({
  message,
  messageStatus = "success",
}: {
  message?: string;
  messageStatus?: AuthActionState["status"];
}) {
  const initialState: AuthActionState = {
    status: message ? messageStatus : "idle",
    message: message ?? "",
  };
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />
      <div>
        <label htmlFor="email" className="text-sm font-medium text-[#0F172A]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          className="mt-2 h-12 w-full rounded-sm border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </div>
      <div>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="password" className="text-sm font-medium text-[#0F172A]">
            Password
          </label>
          <Link href="/forgot-password" className="text-sm font-medium text-[#9A7412] hover:text-[#0F172A]">
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          className="mt-2 h-12 w-full rounded-sm border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white transition hover:bg-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
