/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { FavoriteButton } from "./FavoriteButton";
import { formatPrice, parseJsonArray } from "@/lib/utils";
import { PROPERTY_TYPE_LABEL } from "@/lib/constants";

export interface CardListing {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  listingType: string;
  propertyType: string;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number | null;
  city: string | null;
  neighborhood: string | null;
  photos: string;
  featured: boolean;
}

export function ListingCard({ l, base, brokerId }: { l: CardListing; base: string; brokerId: string }) {
  const photo = parseJsonArray(l.photos)[0] ?? `/api/placeholder/${l.id}`;
  return (
    <Link href={`${base}/listings/${l.slug}`} className="group card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img src={photo} alt={l.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="badge bg-brand text-white">{l.listingType === "RENT" ? "For rent" : "For sale"}</span>
          {l.status === "PENDING" && <span className="badge bg-amber-500 text-white">Under offer</span>}
          {l.status === "SOLD" && <span className="badge bg-slate-700 text-white">Sold</span>}
          {l.featured && l.status === "ACTIVE" && <span className="badge bg-accent text-white">Featured</span>}
        </div>
        <FavoriteButton brokerId={brokerId} listingId={l.id} className="absolute right-3 top-3" />
      </div>
      <div className="p-4">
        <div className="text-xl font-bold text-brand">{formatPrice(l.price, l.currency, l.listingType)}</div>
        <h3 className="mt-1 line-clamp-1 font-semibold text-slate-900">{l.title}</h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">
          {PROPERTY_TYPE_LABEL[l.propertyType]} · {[l.neighborhood, l.city].filter(Boolean).join(", ")}
        </p>
        <div className="mt-3 flex gap-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
          {l.bedrooms != null && <span><b>{l.bedrooms}</b> bd</span>}
          {l.bathrooms != null && <span><b>{l.bathrooms}</b> ba</span>}
          {l.areaSqm != null && <span><b>{l.areaSqm}</b> m²</span>}
        </div>
      </div>
    </Link>
  );
}
