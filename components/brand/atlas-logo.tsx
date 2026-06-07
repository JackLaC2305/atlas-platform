type AtlasLogoProps = {
  tone?: "dark" | "light";
  className?: string;
};

type AtlasLogoMarkProps = AtlasLogoProps & {
  size?: "sm" | "md" | "lg";
};

const toneStyles = {
  dark: {
    text: "text-white",
    muted: "text-slate-300",
    frame: "border-white/20 bg-white/[0.04]",
    filled: "bg-white/88",
  },
  light: {
    text: "text-[#0F172A]",
    muted: "text-slate-500",
    frame: "border-[#0F172A]/12 bg-white",
    filled: "bg-[#0F172A]",
  },
};

const markSize = {
  sm: "h-9 w-9 gap-1 p-1",
  md: "h-11 w-11 gap-1 p-1",
  lg: "h-14 w-14 gap-1.5 p-1.5",
};

export function AtlasLogoMark({
  tone = "light",
  size = "md",
  className = "",
}: AtlasLogoMarkProps) {
  const styles = toneStyles[tone];

  return (
    <span
      className={`grid shrink-0 grid-cols-2 rounded-sm border ${markSize[size]} ${styles.frame} ${className}`}
      aria-hidden="true"
    >
      <span className={`rounded-[2px] ${styles.filled}`} />
      <span className="rounded-[2px] bg-[#D4A017]" />
      <span className={`rounded-[2px] ${styles.filled}`} />
      <span className={`rounded-[2px] ${styles.filled}`} />
    </span>
  );
}

export function AtlasNavbarLogo({ tone = "light", className = "" }: AtlasLogoProps) {
  const styles = toneStyles[tone];

  return (
    <span className={`inline-flex items-center gap-3 ${styles.text} ${className}`}>
      <AtlasLogoMark tone={tone} size="sm" />
      <span className="text-xl font-semibold leading-none">Atlas</span>
    </span>
  );
}

export function AtlasFullLogo({ tone = "light", className = "" }: AtlasLogoProps) {
  const styles = toneStyles[tone];

  return (
    <span className={`inline-flex items-center gap-4 ${styles.text} ${className}`}>
      <AtlasLogoMark tone={tone} size="lg" />
      <span className="flex flex-col">
        <span className="text-3xl font-semibold leading-none">Atlas</span>
        <span className={`mt-2 text-sm font-medium ${styles.muted}`}>
          by Martello Hospitality
        </span>
      </span>
    </span>
  );
}
