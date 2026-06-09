"use client";

import { useActionState } from "react";

import { forgotPasswordAction, type AuthActionState } from "@/app/(auth)/actions";
import { FormMessage } from "@/components/auth/form-message";

const initialState: AuthActionState = {
  status: "idle",
  message: "",
};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialState,
  );

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
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white transition hover:bg-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {pending ? "Sending reset link..." : "Send reset link"}
      </button>
    </form>
  );
}
