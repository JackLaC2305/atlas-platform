import Image from "next/image";
import { AtlasFullLogo, AtlasLogoMark, AtlasNavbarLogo } from "@/components/brand/atlas-logo";

const features = [
  {
    title: "Digital Menus",
    description: "Create and manage restaurant menus in real time.",
  },
  {
    title: "Inventory Insights",
    description: "Track ingredient usage and identify low-stock items.",
  },
  {
    title: "Restaurant Branding",
    description: "Deliver a menu experience consistent with your brand.",
  },
  {
    title: "Analytics",
    description: "Understand menu engagement and operational performance.",
  },
];

const challenges = [
  "Outdated menus that are slow to update across service periods.",
  "Inventory uncertainty that makes ordering and preparation reactive.",
  "Operational inefficiencies across front-of-house and back-of-house teams.",
  "Limited visibility into menu performance and service decisions.",
];

const steps = [
  "Create Your Restaurant",
  "Build Your Menu",
  "Generate QR Codes",
  "Manage Operations",
];

const plans = [
  {
    name: "Starter",
    price: "From €49",
    description: "For independent restaurants modernising menu operations.",
    details: ["Digital menu management", "Core brand controls", "Basic menu insights"],
  },
  {
    name: "Professional",
    price: "From €149",
    description: "For growing venues that need stronger operational visibility.",
    details: ["Inventory insights", "Performance analytics", "Multi-menu operations"],
    featured: true,
  },
  {
    name: "Platform",
    price: "Custom",
    description: "For hospitality groups requiring a broader operational layer.",
    details: ["Group-level controls", "Advanced reporting", "Priority implementation"],
  },
];

function SectionIntro({
  eyebrow,
  title,
  children,
  light = false,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  light?: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <p className={`text-sm font-medium ${light ? "text-[#D4A017]" : "text-[#9A7412]"}`}>
        {eyebrow}
      </p>
      <h2
        className={`mt-4 text-3xl font-semibold leading-tight sm:text-4xl ${
          light ? "text-white" : "text-[#0F172A]"
        }`}
      >
        {title}
      </h2>
      {children ? (
        <div className={`mt-5 text-lg leading-8 ${light ? "text-slate-300" : "text-slate-600"}`}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function PrimaryButton({
  href,
  children,
  dark = false,
}: {
  href: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <a
      href={href}
      className={`inline-flex min-h-12 items-center justify-center rounded-sm px-6 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        dark
          ? "bg-white text-[#0F172A] hover:bg-slate-100 focus:ring-white focus:ring-offset-[#0F172A]"
          : "bg-[#0F172A] text-white hover:bg-[#1E293B] focus:ring-[#0F172A] focus:ring-offset-[#FBFAF7]"
      }`}
    >
      {children}
    </a>
  );
}

function SecondaryButton({
  href,
  children,
  dark = false,
}: {
  href: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <a
      href={href}
      className={`inline-flex min-h-12 items-center justify-center rounded-sm border px-6 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        dark
          ? "border-white/25 text-white hover:border-white/45 hover:bg-white/10 focus:ring-white focus:ring-offset-[#0F172A]"
          : "border-slate-300 text-[#0F172A] hover:border-[#0F172A] hover:bg-white focus:ring-[#0F172A] focus:ring-offset-[#FBFAF7]"
      }`}
    >
      {children}
    </a>
  );
}

function CtaButtons({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
      <PrimaryButton href="/get-started" dark={dark}>
        Get Started
      </PrimaryButton>
      <SecondaryButton href="/contact" dark={dark}>
        Contact for More Information
      </SecondaryButton>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FBFAF7] text-[#0F172A]">
      <header className="bg-[#FBFAF7]/95">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10"
          aria-label="Main navigation"
        >
          <a href="#" aria-label="Atlas home">
            <AtlasNavbarLogo />
          </a>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-[#0F172A]">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-[#0F172A]">
              Pricing
            </a>
            <a href="/login" className="text-sm font-medium text-slate-600 hover:text-[#0F172A]">
              Login
            </a>
            <a
              href="/get-started"
              className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#0F172A] px-5 text-sm font-semibold text-white transition hover:bg-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2 focus:ring-offset-[#FBFAF7]"
            >
              Get Started
            </a>
          </div>
          <a
            href="/get-started"
            className="inline-flex min-h-10 items-center justify-center rounded-sm border border-slate-300 px-4 text-sm font-semibold text-[#0F172A] md:hidden"
          >
            Get Started
          </a>
        </nav>
      </header>

      <section className="relative overflow-hidden bg-[#0F172A] text-white">
        <Image
          src="/atlas-hospitality-hero.png"
          alt="Elegant restaurant dining room prepared for evening service"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#0F172A]/78" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0F172A_0%,rgba(15,23,42,0.92)_31%,rgba(15,23,42,0.72)_62%,rgba(15,23,42,0.5)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-[4.5rem] sm:px-8 sm:py-20 lg:grid-cols-[1.02fr_0.82fr] lg:px-10 lg:py-24">
          <div className="flex min-h-[560px] flex-col justify-center py-6 sm:min-h-[600px] lg:min-h-[620px]">
            <AtlasFullLogo tone="dark" />
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.03] text-white sm:text-6xl lg:text-7xl">
              Run Your Restaurant Smarter.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
              Digital menus, inventory insights, and restaurant operations in
              one platform.
            </p>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
              Built by Martello Hospitality for operators who need a calmer,
              clearer way to manage the details behind service.
            </p>
            <div className="mt-9">
              <CtaButtons dark />
            </div>
          </div>

          <aside className="self-center rounded-sm bg-[#0F172A]/55 p-7 shadow-2xl shadow-black/20 ring-1 ring-white/10 backdrop-blur-sm">
            <p className="text-sm font-medium text-[#D4A017]">Martello Hospitality operating layer</p>
            <p className="mt-4 text-2xl font-semibold leading-snug text-white">
              A calmer control layer for the service details that shape daily
              restaurant performance.
            </p>
            <div className="mt-7 space-y-4">
              {["Menu updates", "Stock visibility", "Brand control", "Performance insight"].map(
                (item) => (
                  <div key={item} className="flex gap-4">
                    <div className="mt-2 h-px w-8 shrink-0 bg-[#D4A017]" />
                    <div>
                      <p className="font-medium text-white">{item}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        Structured for daily hospitality operations.
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-11 px-5 py-[4.5rem] sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:py-[5.5rem]">
        <SectionIntro
          eyebrow="Martello Hospitality perspective"
          title="Restaurants need sharper visibility without adding complexity."
        >
          <p>
            Atlas simplifies restaurant management by bringing menu control,
            inventory visibility, brand consistency, and performance insight into
            one composed operational platform from Martello Hospitality.
          </p>
        </SectionIntro>
        <div className="grid gap-5">
          {challenges.map((challenge) => (
            <div key={challenge} className="rounded-sm bg-white/90 p-5 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-base leading-7 text-slate-700">{challenge}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-[4.5rem] sm:px-8 sm:py-20 lg:px-10 lg:py-[5.5rem]">
          <SectionIntro
            eyebrow="Platform capabilities"
            title="Designed for the operational rhythm of premium hospitality."
          >
            <p>
              Atlas reflects the Martello Hospitality focus on composed service,
              brand standards, and the practical decisions operators make every day.
            </p>
          </SectionIntro>
          <div className="mt-11 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-sm bg-[#FBFAF7] p-6">
                <div className="mb-7 h-px w-12 bg-[#D4A017]" />
                <h3 className="text-xl font-semibold text-[#0F172A]">{feature.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-[4.5rem] sm:px-8 sm:py-20 lg:px-10 lg:py-[5.5rem]">
        <div className="grid gap-11 lg:grid-cols-[0.75fr_1.25fr]">
          <SectionIntro
            eyebrow="How it works"
            title="A simple path from setup to operational control."
          />
          <ol className="grid gap-x-8 gap-y-8 md:grid-cols-2">
            {steps.map((step, index) => (
              <li key={step} className="relative pl-12">
                <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#0F172A] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="text-2xl font-semibold text-[#0F172A]">{step}</h3>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Move through each operational layer with a clear, structured
                  setup process.
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="pricing" className="bg-[#0F172A] text-white">
        <div className="mx-auto max-w-7xl px-5 py-[4.5rem] sm:px-8 sm:py-20 lg:px-10 lg:py-[5.5rem]">
          <SectionIntro
            eyebrow="Martello Hospitality plans"
            title="Plans for independent restaurants, growing venues, and hospitality groups."
            light
          />
          <div className="mt-11 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-sm p-7 ${
                  plan.featured
                    ? "bg-white text-[#0F172A] shadow-2xl shadow-black/20"
                    : "bg-white/[0.055] text-white ring-1 ring-white/10"
                }`}
              >
                <h3 className="text-2xl font-semibold">{plan.name}</h3>
                <p
                  className={`mt-5 text-4xl font-semibold ${
                    plan.featured ? "text-[#0F172A]" : "text-white"
                  }`}
                >
                  {plan.price}
                </p>
                <p
                  className={`mt-5 min-h-20 text-base leading-7 ${
                    plan.featured ? "text-slate-600" : "text-slate-300"
                  }`}
                >
                  {plan.description}
                </p>
                <ul className="mt-7 space-y-4">
                  {plan.details.map((detail) => (
                    <li
                      key={detail}
                      className={`flex gap-3 text-sm ${
                        plan.featured ? "text-slate-700" : "text-slate-300"
                      }`}
                    >
                      <span className="mt-2 h-px w-4 shrink-0 bg-[#D4A017]" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#FBFAF7]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-[4.5rem] sm:px-8 sm:py-20 lg:flex-row lg:items-center lg:px-10 lg:py-[5.5rem]">
          <div>
            <p className="flex items-center gap-3 text-sm font-medium text-[#9A7412]">
              <AtlasLogoMark size="sm" />
              <span>A Martello Hospitality Company</span>
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-[#0F172A] sm:text-5xl">
              Ready to Run Your Restaurant Smarter?
            </h2>
          </div>
          <CtaButtons />
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-9 px-5 py-12 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <div>
            <AtlasNavbarLogo />
            <p className="mt-3 text-base text-slate-600">Run Your Restaurant Smarter.</p>
            <p className="mt-7 text-sm text-slate-500">A Martello Hospitality Company.</p>
            <p className="mt-1 text-sm text-slate-500">Part of The Martello Group.</p>
          </div>
          <nav className="flex flex-wrap gap-x-7 gap-y-3" aria-label="Footer navigation">
            <a href="/privacy" className="text-sm font-medium text-slate-600 hover:text-[#0F172A]">
              Privacy Policy
            </a>
            <a href="/terms" className="text-sm font-medium text-slate-600 hover:text-[#0F172A]">
              Terms of Service
            </a>
            <a href="/contact" className="text-sm font-medium text-slate-600 hover:text-[#0F172A]">
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
