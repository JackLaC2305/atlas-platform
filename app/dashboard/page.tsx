import { redirect } from "next/navigation";

import { logoutAction } from "@/app/(auth)/actions";
import { AtlasFullLogo } from "@/components/brand/atlas-logo";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name
      ? user.user_metadata.full_name
      : user.email;

  return (
    <main className="min-h-screen bg-[#FBFAF7] text-[#0F172A]">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <AtlasFullLogo />
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-sm border border-slate-300 px-5 text-sm font-semibold text-[#0F172A] transition hover:border-[#0F172A] hover:bg-[#FBFAF7] focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2"
            >
              Log out
            </button>
          </form>
        </nav>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="max-w-3xl rounded-sm bg-white p-7 shadow-sm ring-1 ring-slate-200/80 sm:p-9">
          <p className="text-sm font-medium text-[#9A7412]">Protected Atlas workspace</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Welcome{displayName ? `, ${displayName}` : ""}.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Authentication is active. Restaurant onboarding is the next step for
            this platform, but it has not been built yet.
          </p>
          <div className="mt-8 rounded-sm bg-[#FBFAF7] p-5 text-sm leading-7 text-slate-600 ring-1 ring-slate-200">
            <p className="font-semibold text-[#0F172A]">Next planned slice</p>
            <p className="mt-2">
              Create the restaurant profile, operating details, and onboarding
              workflow after the authentication slice is approved.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
