import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

const authRoutes = ["/login", "/signup", "/forgot-password"];
const protectedRoutes = [
  "/dashboard",
  "/onboarding",
  "/settings",
  "/menus",
  "/qr-menu",
  "/inventory",
  "/analytics",
  "/billing",
];

export async function proxy(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  let hasRestaurant = false;

  if (user) {
    const { data } = await supabase
      .from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    hasRestaurant = Boolean(data);
  }

  if (user && authRoutes.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = hasRestaurant ? "/dashboard" : "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (
    user &&
    protectedRoutes
      .filter((route) => route !== "/onboarding")
      .some((route) => pathname.startsWith(route)) &&
    !hasRestaurant
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/onboarding") && hasRestaurant) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/settings/:path*",
    "/menus/:path*",
    "/qr-menu/:path*",
    "/inventory/:path*",
    "/analytics/:path*",
    "/billing/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ],
};
