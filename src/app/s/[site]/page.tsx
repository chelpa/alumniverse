/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getBrokerBySite, getSiteBase } from "@/lib/site";
import { planOf } from "@/lib/plans";
import { ListingCard } from "@/components/site/ListingCard";
import { ContactForm } from "@/components/site/ContactForm";
import { NlSearchBar } from "@/components/site/NlSearchBar";
import { initials } from "@/lib/utils";

export default async function SiteHome({ params }: { params: Promise<{ site: string }> }) {
  const broker = await getBrokerBySite((await params).site);
  if (!broker) notFound();
  const base = await getSiteBase(broker.slug);
  const plan = planOf(broker.plan);

  const [featured, recent, areas, posts, counts] = await Promise.all([
    db.listing.findMany({ where: { brokerId: broker.id, status: "ACTIVE", featured: true }, orderBy: { createdAt: "desc" }, take: 3 }),
    db.listing.findMany({ where: { brokerId: broker.id, status: { in: ["ACTIVE", "PENDING"] } }, orderBy: { createdAt: "desc" }, take: 6 }),
    plan.limits.blogAndAreas ? db.areaPage.findMany({ where: { brokerId: broker.id }, take: 4 }) : [],
    plan.limits.blogAndAreas ? db.post.findMany({ where: { brokerId: broker.id, published: true }, orderBy: { publishedAt: "desc" }, take: 3 }) : [],
    db.listing.groupBy({ by: ["listingType"], where: { brokerId: broker.id, status: "ACTIVE" }, _count: true }),
  ]);
  const forSale = counts.find((c) => c.listingType === "SALE")?._count ?? 0;
  const forRent = counts.find((c) => c.listingType === "RENT")?._count ?? 0;
  const showcase = featured.length ? featured : recent.slice(0, 3);
  const showcaseIds = new Set(showcase.map((l) => l.id));
  const more = recent.filter((l) => !showcaseIds.has(l.id)).slice(0, 3);
  const heroPhoto = showcase[0] ? (JSON.parse(showcase[0].photos)[0] ?? `/api/placeholder/${showcase[0].id}`) : null;

  return (
    <>
      <section className="relative overflow-hidden bg-brand">
        {heroPhoto && <img src={heroPhoto} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
        <div className="absolute inset-0 bg-gradient-to-b from-brand/40 to-brand" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <h1 className="font-display text-4xl font-semibold leading-tight text-white sm:text-6xl">
            {broker.tagline || `Find your next home${broker.city ? ` in ${broker.city}` : ""}`}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {forSale} properties for sale · {forRent} for rent — personally curated by {broker.name}.
          </p>
          <div className="mx-auto mt-8 max-w-3xl">
            <NlSearchBar action={`${base}/listings`} />
          </div>
        </div>
      </section>

      {showcase.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-semibold text-slate-900">{featured.length ? "Featured properties" : "Latest properties"}</h2>
              <p className="mt-1 text-slate-600">Hand-picked homes and investment opportunities.</p>
            </div>
            <Link href={`${base}/listings`} className="hidden text-sm font-semibold text-brand sm:block">View all →</Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {showcase.map((l) => <ListingCard key={l.id} l={l} base={base} brokerId={broker.id} />)}
          </div>
          {more.length > 0 && (
            <>
              <h3 className="mb-6 mt-14 text-xl font-semibold text-slate-900">Just listed</h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {more.map((l) => <ListingCard key={l.id} l={l} base={base} brokerId={broker.id} />)}
              </div>
            </>
          )}
          <div className="mt-10 text-center">
            <Link href={`${base}/listings`} className="btn-primary px-6 py-3">Browse all properties</Link>
          </div>
        </section>
      )}

      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div className="flex justify-center">
            {broker.photoUrl ? (
              <img src={broker.photoUrl} alt={broker.name} className="aspect-square w-72 rounded-3xl object-cover shadow-xl" />
            ) : (
              <div className="flex aspect-square w-72 items-center justify-center rounded-3xl bg-brand font-display text-7xl text-accent shadow-xl">{initials(broker.name)}</div>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-wider text-accent">Meet your broker</div>
            <h2 className="mt-2 font-display text-3xl font-semibold text-slate-900">{broker.name}</h2>
            {broker.agencyName && <p className="text-slate-500">{broker.agencyName}</p>}
            <p className="mt-4 line-clamp-6 whitespace-pre-line leading-relaxed text-slate-700">{broker.bio || "Dedicated to helping clients buy, sell, and rent with confidence."}</p>
            <div className="mt-6 flex gap-3">
              <Link href={`${base}/about`} className="btn-ghost">More about me</Link>
              <Link href={`${base}/contact`} className="btn-primary">Book a consultation</Link>
            </div>
          </div>
        </div>
      </section>

      {areas.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-semibold text-slate-900">Neighborhood guides</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {areas.map((a) => (
              <Link key={a.id} href={`${base}/areas/${a.slug}`} className="group relative overflow-hidden rounded-2xl">
                <img src={a.coverUrl || `/api/placeholder/area-${a.id}`} alt="" className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-4 left-4 text-xl font-semibold text-white">{a.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-semibold text-slate-900">Market insights</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.id} href={`${base}/blog/${p.slug}`} className="card overflow-hidden hover:shadow-md">
                <img src={p.coverUrl || `/api/placeholder/post-${p.id}`} alt="" className="aspect-video w-full object-cover" />
                <div className="p-5">
                  <div className="text-xs text-slate-500">{p.publishedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}</div>
                  <h3 className="mt-1 font-semibold text-slate-900">{p.title}</h3>
                  {p.excerpt && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{p.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="contact" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="card p-8">
          <h2 className="font-display text-3xl font-semibold text-slate-900">Let&apos;s talk</h2>
          <p className="mt-2 text-slate-600">Thinking of buying, selling, or renting? Send a message and {broker.name.split(" ")[0]} will get back to you.</p>
          <div className="mt-6"><ContactForm brokerId={broker.id} /></div>
        </div>
      </section>
    </>
  );
}
