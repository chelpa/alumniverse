/* eslint-disable @next/next/no-img-element */
import { initials } from "@/lib/utils";

/** Renders a broker logo: uploaded image, stored SVG (as data URI so scripts never run), or initials fallback. */
export function BrandLogo({
  broker,
  className = "h-10",
}: {
  broker: { name: string; agencyName: string | null; logoUrl: string | null; logoSvg: string | null };
  className?: string;
}) {
  const label = broker.agencyName || broker.name;
  if (broker.logoUrl) return <img src={broker.logoUrl} alt={label} className={`${className} w-auto object-contain`} />;
  if (broker.logoSvg)
    return <img src={`data:image/svg+xml;utf8,${encodeURIComponent(broker.logoSvg)}`} alt={label} className={`${className} w-auto`} />;
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-display text-sm font-bold text-accent">{initials(label)}</span>
      <span className="font-display text-lg font-semibold text-brand">{label}</span>
    </span>
  );
}

export function svgDataUri(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
