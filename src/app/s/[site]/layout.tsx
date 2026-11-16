import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBrokerBySite, getSiteBase, publicSiteUrl } from "@/lib/site";
import { planOf } from "@/lib/plans";
import { BrandLogo } from "@/components/BrandLogo";
import { ChatWidget } from "@/components/site/ChatWidget";
import { FavoritesCount } from "@/components/site/FavoriteButton";
import { whatsappLink } from "@/lib/utils";
import { db } from "@/lib/db";

type Props = { children: React.ReactNode; params: Promise<{ site: string }> };

export async function generateMetadata({ params }: { params: Promise<{ site: string }> }): Promise<Metadata> {
  const broker = await getBrokerBySite((await params).site);
  if (!broker) return {};
  const brand = broker.agencyName || broker.name;
  return {
    title: { default: `${brand} — ${broker.tagline || `Real estate${broker.city ? ` in ${broker.city}` : ""}`}`, template: `%s | ${brand}` },
    description: broker.bio?.slice(0, 160) || `Properties for sale and rent with ${broker.name}.`,
    metadataBase: new URL(publicSiteUrl(broker)),
    openGraph: { siteName: brand, type: "website" },
    alternates: { canonical: "/" },
  };
}

export default async function SiteLayout({ children, params }: Props) {
  const { site } = await params;
  const broker = await getBrokerBySite(site);
  if (!broker || !broker.published) notFound();
  const base = await getSiteBase(broker.slug);
  const plan = planOf(broker.plan);
  const hasBlog = plan.limits.blogAndAreas && (await db.post.count({ where: { brokerId: broker.id, published: true } })) > 0;
  const hasAreas = plan.limits.blogAndAreas && (await db.areaPage.count({ where: { brokerId: broker.id } })) > 0;
  const wa = whatsappLink(broker.whatsapp || broker.phone, `Hi ${broker.name}, I found you through your website.`);

  const nav = [
    { href: `${base}/listings`, label: "Properties" },
    hasAreas && { href: `${base}/areas`, label: "Neighborhoods" },
    hasBlog && { href: `${base}/blog`, label: "Blog" },
    { href: `${base}/about`, label: "About" },
    { href: `${base}/contact`, label: "Contact" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div style={{ "--brand": broker.primaryColor, "--accent": broker.accentColor } as React.CSSProperties} className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href={base || "/"} className="shrink-0"><BrandLogo broker={broker} /></Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
            {nav.map((n) => <Link key={n.href} href={n.href} className="hover:text-brand">{n.label}</Link>)}
            <Link href={`${base}/favorites`} className="flex items-center hover:text-brand">♡ Saved<FavoritesCount brokerId={broker.id} /></Link>
          </nav>
          <div className="flex items-center gap-2">
            {broker.phone && <a href={`tel:${broker.phone}`} className="hidden text-sm font-semibold text-brand lg:block">{broker.phone}</a>}
            <Link href={`${base}/contact`} className="btn-primary">Get in touch</Link>
          </div>
        </div>
        <nav className="flex gap-5 overflow-x-auto border-t border-slate-100 px-4 py-2 text-sm font-medium text-slate-700 md:hidden">
          {nav.map((n) => <Link key={n.href} href={n.href} className="shrink-0">{n.label}</Link>)}
          <Link href={`${base}/favorites`} className="shrink-0">♡ Saved</Link>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 bg-brand text-white/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <div className="font-display text-xl font-semibold text-white">{broker.agencyName || broker.name}</div>
            {broker.tagline && <p className="mt-2 text-sm">{broker.tagline}</p>}
            {broker.licenseNumber && <p className="mt-2 text-xs opacity-70">License #{broker.licenseNumber}</p>}
          </div>
          <div className="text-sm">
            <div className="mb-2 font-semibold text-white">Contact</div>
            <p>{broker.name}</p>
            {broker.phone && <p><a href={`tel:${broker.phone}`}>{broker.phone}</a></p>}
            <p><a href={`mailto:${broker.email}`}>{broker.email}</a></p>
            {broker.city && <p>{[broker.city, broker.country].filter(Boolean).join(", ")}</p>}
          </div>
          <div className="text-sm">
            <div className="mb-2 font-semibold text-white">Explore</div>
            <ul className="space-y-1">
              {nav.map((n) => <li key={n.href}><Link href={n.href} className="hover:text-white">{n.label}</Link></li>)}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs opacity-60">
          © {new Date().getFullYear()} {broker.agencyName || broker.name} · Website by <a href="/" className="underline">Brokersite</a>
        </div>
      </footer>

      {wa && (
        <a href={wa} target="_blank" rel="noopener" aria-label="Chat on WhatsApp"
          className={`fixed bottom-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-105 ${broker.chatEnabled && plan.limits.aiChat ? "right-24" : "right-5"}`}>
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>
        </a>
      )}
      {broker.chatEnabled && plan.limits.aiChat && <ChatWidget brokerId={broker.id} brokerName={broker.name} base={base} />}
    </div>
  );
}
