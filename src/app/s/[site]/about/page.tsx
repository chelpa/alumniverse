/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getBrokerBySite, getSiteBase } from "@/lib/site";
import { initials, whatsappLink } from "@/lib/utils";

type Props = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await getBrokerBySite((await params).site);
  return { title: b ? `About ${b.name}` : "About", alternates: { canonical: "/about" } };
}

export default async function About({ params }: Props) {
  const broker = await getBrokerBySite((await params).site);
  if (!broker) notFound();
  const base = await getSiteBase(broker.slug);
  const [active, sold] = await Promise.all([
    db.listing.count({ where: { brokerId: broker.id, status: "ACTIVE" } }),
    db.listing.count({ where: { brokerId: broker.id, status: "SOLD" } }),
  ]);
  const wa = whatsappLink(broker.whatsapp || broker.phone);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: broker.agencyName || broker.name,
    employee: { "@type": "Person", name: broker.name },
    telephone: broker.phone ?? undefined,
    email: broker.email,
    address: broker.city ? { "@type": "PostalAddress", addressLocality: broker.city, addressCountry: broker.country ?? undefined } : undefined,
  };
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="grid gap-10 md:grid-cols-[18rem_1fr]">
        <div>
          {broker.photoUrl ? (
            <img src={broker.photoUrl} alt={broker.name} className="aspect-square w-full rounded-3xl object-cover shadow-lg" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-3xl bg-brand font-display text-7xl text-accent">{initials(broker.name)}</div>
          )}
          <div className="card mt-6 space-y-2 p-5 text-sm">
            {broker.phone && <p>📞 <a href={`tel:${broker.phone}`} className="text-brand">{broker.phone}</a></p>}
            <p>✉️ <a href={`mailto:${broker.email}`} className="text-brand">{broker.email}</a></p>
            {wa && <p>💬 <a href={wa} target="_blank" rel="noopener" className="text-brand">WhatsApp</a></p>}
            {broker.city && <p>📍 {[broker.city, broker.country].filter(Boolean).join(", ")}</p>}
            {broker.languages && <p>🗣 {broker.languages}</p>}
            {broker.licenseNumber && <p>🪪 License #{broker.licenseNumber}</p>}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold uppercase tracking-wider text-accent">About</div>
          <h1 className="mt-1 font-display text-4xl font-semibold text-slate-900">{broker.name}</h1>
          {broker.agencyName && <p className="text-lg text-slate-500">{broker.agencyName}</p>}
          <div className="mt-6 flex gap-8">
            <div><div className="text-3xl font-bold text-brand">{active}</div><div className="text-sm text-slate-500">Active listings</div></div>
            {sold > 0 && <div><div className="text-3xl font-bold text-brand">{sold}</div><div className="text-sm text-slate-500">Recently sold</div></div>}
          </div>
          <div className="mt-6 whitespace-pre-line leading-relaxed text-slate-700">{broker.bio || "Dedicated to helping clients buy, sell, and rent with confidence."}</div>
          <div className="mt-8 flex gap-3">
            <Link href={`${base}/listings`} className="btn-ghost">See my listings</Link>
            <Link href={`${base}/contact`} className="btn-primary">Contact me</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
