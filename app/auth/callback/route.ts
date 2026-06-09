import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeInternalRedirect(value: string | null, origin: string, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001F\u007F]/.test(value)) {
    return fallback;
  }

  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeInternalRedirect(requestUrl.searchParams.get("next"), requestUrl.origin, "/dashboard");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?message=auth-link-invalid", requestUrl.origin));
}
