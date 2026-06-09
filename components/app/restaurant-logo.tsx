export function RestaurantLogo({
  name,
  logoUrl,
  size = "md",
}: {
  name: string;
  logoUrl: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-24 w-24",
  }[size];

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={`${sizeClass} shrink-0 rounded-sm border border-slate-200 bg-white object-contain p-2`}
      />
    );
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={`${sizeClass} grid shrink-0 place-items-center rounded-sm border border-slate-200 bg-[#FBFAF7] text-sm font-semibold text-slate-500`}
      aria-label={`${name} logo fallback`}
    >
      {initials || "A"}
    </div>
  );
}
