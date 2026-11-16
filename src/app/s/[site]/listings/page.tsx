import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getBrokerBySite, getSiteBase } from "@/lib/site";
import { searchListings, siteLocations } from "@/lib/listing-search";
import { ListingCard } from "@/components/site/ListingCard";
import { SaveSearch } from "@/components/site/SaveSearch";
import { PROPERTY_TYPES, PROPERTY_TYPE_LABEL } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import type { SearchFilters } from "@/lib/search";

type Props = { params: Promise<{ site: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const broker = await getBrokerBySite((await params).site);
  return { title: `Properties for sale and rent${broker?.city ? ` in ${broker.city}` : ""}`, alternates: { canonical: "/listings" } };
}

function chips(f: SearchFilters, currency: string): string[] {
  const out: string[] = [];
  if (f.listingType) out.push(f.listingType === "RENT" ? "For rent" : "For sale");
  if (f.propertyType) out.push(PROPERTY_TYPE_LABEL[f.propertyType] ?? f.propertyType);
  if (f.minBedrooms !== undefined) out.push(`${f.minBedrooms}+ beds`);
  if (f.minBathrooms !== undefined) out.push(`${f.minBathrooms}+ baths`);
  if (f.minArea !== undefined) out.push(`${f.minArea}+ m²`);
  if (f.minPrice !== undefined) out.push(`from ${formatPrice(f.minPrice, currency)}`);
  if (f.maxPrice !== undefined) out.push(`up to ${formatPrice(f.maxPrice, currency)}`);
  if (f.location) out.push(f.location);
  for (const x of f.features ?? []) out.push(x);
  return out;
}

export default async function ListingsPage({ params, searchParams }: Props) {
  const broker = await getBrokerBySite((await params).site);
  if (!broker) notFound();
  const sp = await searchParams;
  const base = await getSiteBase(broker.slug);
  const [res, locations] = await Promise.all([searchListings(broker, sp), siteLocations(broker.id)]);
  const { q, filters, listings, explanation, relaxed, sort } = res;
  const active = chips(filters, broker.currency);
  const v = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-slate-900">Properties</h1>

      <form method="get" className="card mt-6 grid gap-3 p-4 md:grid-cols-12">
        <div className="md:col-span-12">
          <label htmlFor="q" className="label">Describe what you want</label>
          <input id="q" name="q" defaultValue={q} className="input text-base" placeholder="e.g. family house with pool and 3 bedrooms under 800k" />
        </div>
        <select name="type" defaultValue={v("type")} className="input md:col-span-2" aria-label="Sale or rent">
          <option value="">Buy or rent</option><option value="SALE">For sale</option><option value="RENT">For rent</option>
        </select>
        <select name="ptype" defaultValue={v("ptype")} className="input md:col-span-2" aria-label="Property type">
          <option value="">Any type</option>
          {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{PROPERTY_TYPE_LABEL[t]}</option>)}
        </select>
        <select name="loc" defaultValue={v("loc")} className="input md:col-span-2" aria-label="Location">
          <option value="">Any location</option>
          {locations.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select name="beds" defaultValue={v("beds")} className="input md:col-span-1" aria-label="Bedrooms">
          <option value="">Beds</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
        </select>
        <input name="min" type="number" min={0} defaultValue={v("min")} placeholder="Min price" className="input md:col-span-2" aria-label="Minimum price" />
        <input name="max" type="number" min={0} defaultValue={v("max")} placeholder="Max price" className="input md:col-span-2" aria-label="Maximum price" />
        <button className="btn-primary md:col-span-1">Search</button>
      </form>

      {q && (
        <div className="mt-4 rounded-xl bg-brand/5 p-4 text-sm text-slate-700">
          <span className="font-semibold">Searching for:</span> “{q}”
          {explanation && <span className="text-slate-500"> — {explanation}</span>}
          {active.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {active.map((c) => <span key={c} className="badge bg-white text-brand ring-1 ring-brand/20">{c}</span>)}
            </div>
          )}
          {relaxed && <p className="mt-2 text-amber-700">No exact matches for every feature, so we&apos;re showing the closest results.</p>}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{listings.length} {listings.length === 1 ? "property" : "properties"}</p>
        <div className="flex flex-wrap items-center gap-3">
          <SaveSearch brokerId={broker.id} query={q} filters={filters as Record<string, unknown>} label={[q, ...active].filter(Boolean).join(" · ") || "All properties"} />
          <form method="get" className="flex items-center gap-2">
            {Object.entries(sp).filter(([k, val]) => k !== "sort" && typeof val === "string").map(([k, val]) => <input key={k} type="hidden" name={k} value={val as string} />)}
            <select name="sort" defaultValue={sort} className="input w-auto" aria-label="Sort">
              {q && <option value="relevance">Best match</option>}
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
            <button className="btn-ghost">Sort</button>
          </form>
        </div>
      </div>

      {listings.length > 0 ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => <ListingCard key={l.id} l={l} base={base} brokerId={broker.id} />)}
        </div>
      ) : (
        <div className="card mt-6 p-12 text-center">
          <p className="text-lg font-semibold text-slate-900">No properties match yet</p>
          <p className="mt-1 text-slate-600">Save this search to get an email when something matching comes up, or tell {broker.name.split(" ")[0]} what you need — many properties are sold before they&apos;re listed.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href={`${base}/listings`} className="btn-ghost">Clear search</Link>
            <Link href={`${base}/contact`} className="btn-primary">Contact {broker.name.split(" ")[0]}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
