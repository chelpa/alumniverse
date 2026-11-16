/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getBrokerBySite, getSiteBase } from "@/lib/site";
import { planOf } from "@/lib/plans";
import { parseJsonArray } from "@/lib/utils";
import { Markdown } from "@/components/Markdown";
import { ListingCard } from "@/components/site/ListingCard";

type Props = { params: Promise<{ site: string; slug: string }> };

async function load(site: string, slug: string) {
  const broker = await getBrokerBySite(site);
  if (!broker || !planOf(broker.plan).limits.blogAndAreas) return null;
  const area = await db.areaPage.findUnique({ where: { brokerId_slug: { brokerId: broker.id, slug } } });
  return area ? { broker, area } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site, slug } = await params;
  const d = await load(site, slug);
  if (!d) return {};
  return {
    title: `Living in ${d.area.name}: homes for sale & rent`,
    description: d.area.description.replace(/[#*\n]/g, " ").slice(0, 155),
    alternates: { canonical: `/areas/${d.area.slug}` },
  };
}

export default async function AreaPage({ params }: Props) {
  const { site, slug } = await params;
  const d = await load(site, slug);
  if (!d) notFound();
  const { broker, area } = d;
  const base = await getSiteBase(broker.slug);
  const highlights = parseJsonArray(area.highlights);
  const listings = await db.listing.findMany({
    where: { brokerId: broker.id, status: { in: ["ACTIVE", "PENDING"] }, OR: [{ neighborhood: { contains: area.name } }, { city: { contains: area.name } }] },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <section className="relative h-72 overflow-hidden bg-brand">
        <img src={area.coverUrl || `/api/placeholder/area-${area.id}`} alt="" className="h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
            <h1 className="font-display text-5xl font-semibold text-white drop-shadow">{area.name}</h1>
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-3">
        <div className="text-slate-700 lg:col-span-2"><Markdown text={area.description} /></div>
        {highlights.length > 0 && (
          <aside className="card h-fit p-6">
            <h2 className="font-semibold text-slate-900">Why people love {area.name}</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">{highlights.map((h) => <li key={h} className="flex gap-2"><span className="text-accent">★</span>{h}</li>)}</ul>
            <Link href={`${base}/contact`} className="btn-primary mt-5 w-full">Ask about {area.name}</Link>
          </aside>
        )}
      </div>
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold text-slate-900">Properties in {area.name}</h2>
        {listings.length === 0 ? (
          <p className="mt-4 text-slate-600">No properties listed here right now. <Link href={`${base}/contact`} className="text-brand underline">Tell me what you&apos;re looking for</Link>.</p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{listings.map((l) => <ListingCard key={l.id} l={l} base={base} brokerId={broker.id} />)}</div>
        )}
      </section>
    </div>
  );
}
