"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  friendlyAuthError,
  getPassword,
  getString,
  validateEmail,
  validatePassword,
} from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

async function getOrigin() {
  const headersList = await headers();
  return headersList.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signUpAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = getString(formData, "fullName");
  const email = getString(formData, "email").toLowerCase();
  const password = getPassword(formData, "password");
  const confirmPassword = getPassword(formData, "confirmPassword");

  if (fullName.length < 2) {
    return { status: "error", message: "Enter your full name." };
  }

  if (!validateEmail(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  if (!validatePassword(password)) {
    return { status: "error", message: "Your password does not meet the requirements." };
  }

  if (password !== confirmPassword) {
    return { status: "error", message: "Passwords do not match." };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { status: "error", message: friendlyAuthError(error.message) };
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    status: "success",
    message:
      "Account created. Please check your email and verify your address before logging in.",
  };
}

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getString(formData, "email").toLowerCase();
  const password = getPassword(formData, "password");

  if (!validateEmail(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  if (!password) {
    return { status: "error", message: "Enter your password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: friendlyAuthError(error.message) };
  }

  redirect("/dashboard");
}

export async function forgotPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = getString(formData, "email").toLowerCase();

  if (!validateEmail(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { status: "error", message: friendlyAuthError(error.message) };
  }

  return {
    status: "success",
    message:
      "If an account exists for that email, a password reset link has been sent.",
  };
}

export async function resetPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = getPassword(formData, "password");
  const confirmPassword = getPassword(formData, "confirmPassword");

  if (!validatePassword(password)) {
    return { status: "error", message: "Your password does not meet the requirements." };
  }

  if (password !== confirmPassword) {
    return { status: "error", message: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { status: "error", message: friendlyAuthError(error.message) };
  }

  await supabase.auth.signOut();
  redirect("/login?message=password-updated");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
