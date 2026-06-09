import Link from "next/link";

import { AtlasFullLogo } from "@/components/brand/atlas-logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#0F172A] text-white">
      <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col justify-between px-5 py-8 sm:px-8 lg:px-12">
          <Link href="/" aria-label="Atlas home">
            <AtlasFullLogo tone="dark" />
          </Link>
          <div className="my-14 max-w-xl">
            <p className="text-sm font-medium text-[#D4A017]">
              A Martello Hospitality Company
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-tight sm:text-6xl">
              Run Your Restaurant Smarter.
            </h1>
            <p className="mt-7 text-lg leading-8 text-slate-300">
              Secure access to the Atlas operating layer for premium restaurant
              teams.
            </p>
          </div>
          <div className="text-sm leading-6 text-slate-400">
            <p>A Martello Hospitality Company.</p>
            <p>Part of The Martello Group.</p>
          </div>
        </section>

        <section className="flex items-center bg-[#FBFAF7] px-5 py-10 text-[#0F172A] sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-sm bg-white p-6 shadow-xl shadow-slate-950/10 ring-1 ring-slate-200/80 sm:p-8">
              <div>
                <p className="text-sm font-medium text-[#9A7412]">Atlas secure access</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight">{title}</h2>
                <p className="mt-3 text-base leading-7 text-slate-600">{subtitle}</p>
              </div>
              <div className="mt-8">{children}</div>
            </div>
            {footer ? <div className="mt-6 text-center text-sm text-slate-600">{footer}</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
