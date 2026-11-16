import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getBrokerBySite, getSiteBase, publicSiteUrl } from "@/lib/site";
import { formatPrice, parseJsonArray, toEmbedUrl, whatsappLink, initials } from "@/lib/utils";
import { PROPERTY_TYPE_LABEL } from "@/lib/constants";
import { Gallery } from "@/components/site/Gallery";
import { ContactForm } from "@/components/site/ContactForm";
import { FavoriteButton } from "@/components/site/FavoriteButton";
import { ListingCard } from "@/components/site/ListingCard";

type Props = { params: Promise<{ site: string; slug: string }> };

async function load(site: string, slug: string) {
  const broker = await getBrokerBySite(site);
  if (!broker) return null;
  const listing = await db.listing.findUnique({ where: { brokerId_slug: { brokerId: broker.id, slug } } });
  if (!listing || listing.status === "DRAFT") return null;
  return { broker, listing };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site, slug } = await params;
  const data = await load(site, slug);
  if (!data) return {};
  const { listing } = data;
  const photo = parseJsonArray(listing.photos)[0] ?? `/api/placeholder/${listing.id}`;
  const desc = `${formatPrice(listing.price, listing.currency, listing.listingType)} · ${listing.description.replace(/\s+/g, " ").slice(0, 140)}`;
  return {
    title: listing.title,
    description: desc,
    alternates: { canonical: `/listings/${listing.slug}` },
    openGraph: { title: listing.title, description: desc, images: [photo], type: "website" },
    twitter: { card: "summary_large_image", title: listing.title, description: desc, images: [photo] },
  };
}

export default async function ListingPage({ params }: Props) {
  const { site, slug } = await params;
  const data = await load(site, slug);
  if (!data) notFound();
  const { broker, listing: l } = data;
  const base = await getSiteBase(broker.slug);
  const photos = parseJsonArray(l.photos);
  const gallery = photos.length ? photos : [`/api/placeholder/${l.id}`, `/api/placeholder/${l.id}-2`, `/api/placeholder/${l.id}-3`];
  const features = parseJsonArray(l.features);
  const video = toEmbedUrl(l.videoUrl);
  const tour = toEmbedUrl(l.virtualTourUrl);
  const location = [l.neighborhood, l.city].filter(Boolean).join(", ");
  const url = `${publicSiteUrl(broker)}/listings/${l.slug}`;
  const wa = whatsappLink(broker.whatsapp || broker.phone, `Hi ${broker.name}, I'm interested in "${l.title}" ${url}`);

  const similar = await db.listing.findMany({
    where: { brokerId: broker.id, status: "ACTIVE", id: { not: l.id }, OR: [{ propertyType: l.propertyType }, { city: l.city }] },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: l.title,
    description: l.description,
    url,
    image: gallery.map((p) => (p.startsWith("http") ? p : `${publicSiteUrl(broker)}${p}`)),
    datePosted: l.createdAt.toISOString(),
    offers: { "@type": "Offer", price: l.price, priceCurrency: l.currency, availability: l.status === "SOLD" ? "https://schema.org/SoldOut" : "https://schema.org/InStock", businessFunction: l.listingType === "RENT" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell" },
    about: {
      "@type": l.propertyType === "HOUSE" ? "SingleFamilyResidence" : l.propertyType === "APARTMENT" ? "Apartment" : "Place",
      numberOfRooms: l.bedrooms ?? undefined,
      numberOfBathroomsTotal: l.bathrooms ?? undefined,
      floorSize: l.areaSqm ? { "@type": "QuantitativeValue", value: l.areaSqm, unitCode: "MTK" } : undefined,
      address: { "@type": "PostalAddress", streetAddress: l.address ?? undefined, addressLocality: l.city ?? undefined, addressCountry: broker.country ?? undefined },
      geo: l.lat != null && l.lng != null ? { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng } : undefined,
    },
    provider: { "@type": "RealEstateAgent", name: broker.agencyName || broker.name, telephone: broker.phone ?? undefined, email: broker.email },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-4 text-sm text-slate-500">
        <Link href={base || "/"} className="hover:text-brand">Home</Link> / <Link href={`${base}/listings`} className="hover:text-brand">Properties</Link> / <span className="text-slate-700">{l.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Gallery photos={gallery} title={l.title} />

          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="badge bg-brand text-white">{l.listingType === "RENT" ? "For rent" : "For sale"}</span>
                <span className="badge bg-slate-100 text-slate-700">{PROPERTY_TYPE_LABEL[l.propertyType]}</span>
                {l.status === "PENDING" && <span className="badge bg-amber-100 text-amber-800">Under offer</span>}
                {l.status === "SOLD" && <span className="badge bg-slate-700 text-white">{l.listingType === "RENT" ? "Rented" : "Sold"}</span>}
              </div>
              <h1 className="mt-3 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">{l.title}</h1>
              {location && <p className="mt-1 text-slate-600">📍 {[l.address, location].filter(Boolean).join(", ")}</p>}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-brand">{formatPrice(l.price, l.currency, l.listingType)}</div>
              {l.areaSqm && l.listingType === "SALE" && <div className="text-sm text-slate-500">{formatPrice(Math.round(l.price / l.areaSqm), l.currency)}/m²</div>}
              <div className="mt-2 flex justify-end"><FavoriteButton brokerId={broker.id} listingId={l.id} className="border border-slate-200" /></div>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-4">
            {[
              ["Bedrooms", l.bedrooms],
              ["Bathrooms", l.bathrooms],
              ["Area", l.areaSqm ? `${l.areaSqm} m²` : null],
              ["Type", PROPERTY_TYPE_LABEL[l.propertyType]],
            ].filter(([, val]) => val != null).map(([k, val]) => (
              <div key={k as string}><dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt><dd className="text-lg font-semibold text-slate-900">{val}</dd></div>
            ))}
          </dl>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-slate-900">About this property</h2>
            <div className="mt-3 whitespace-pre-line leading-relaxed text-slate-700">{l.description}</div>
          </section>

          {features.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">Features</h2>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {features.map((f) => <li key={f} className="flex items-center gap-2 text-slate-700"><span className="text-accent">✓</span>{f}</li>)}
              </ul>
            </section>
          )}

          {tour && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">Virtual tour</h2>
              <iframe src={tour} title="Virtual tour" className="mt-3 aspect-video w-full rounded-2xl border-0" allow="fullscreen; xr-spatial-tracking" allowFullScreen loading="lazy" />
            </section>
          )}
          {video && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">Video</h2>
              <iframe src={video} title="Property video" className="mt-3 aspect-video w-full rounded-2xl border-0" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
            </section>
          )}

          {l.lat != null && l.lng != null && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">Location</h2>
              <iframe
                title="Map"
                loading="lazy"
                className="mt-3 h-80 w-full rounded-2xl border-0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${l.lng - 0.01},${l.lat - 0.006},${l.lng + 0.01},${l.lat + 0.006}&layer=mapnik&marker=${l.lat},${l.lng}`}
              />
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <div className="flex items-center gap-3">
              {broker.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={broker.photoUrl} alt={broker.name} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand font-semibold text-accent">{initials(broker.name)}</div>
              )}
              <div>
                <div className="font-semibold text-slate-900">{broker.name}</div>
                <div className="text-sm text-slate-500">{broker.agencyName || "Property broker"}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {broker.phone && <a href={`tel:${broker.phone}`} className="btn-ghost">📞 Call</a>}
              {wa && <a href={wa} target="_blank" rel="noopener" className="btn bg-[#25D366] text-white hover:brightness-105">WhatsApp</a>}
            </div>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <h2 className="mb-3 font-semibold text-slate-900">Request info or a viewing</h2>
              <ContactForm brokerId={broker.id} listingId={l.id} compact defaultMessage={`Hi, I'm interested in "${l.title}". Is it still available? I'd like to schedule a viewing.`} submitLabel="Send inquiry" />
            </div>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold text-slate-900">Similar properties</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => <ListingCard key={s.id} l={s} base={base} brokerId={broker.id} />)}
          </div>
        </section>
      )}
    </div>
  );
}
