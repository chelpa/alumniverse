"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { readFavs, FavoriteButton } from "./FavoriteButton";

interface L { id: string; slug: string; title: string; price: number; currency: string; listingType: string; city: string | null; neighborhood: string | null; photos: string; }

function fmt(price: number, currency: string, type: string) {
  let s: string;
  try { s = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price); } catch { s = `${currency} ${price}`; }
  return type === "RENT" ? `${s}/mo` : s;
}

export function FavoritesList({ brokerId, base }: { brokerId: string; base: string }) {
  const [items, setItems] = useState<L[] | null>(null);
  useEffect(() => {
    const load = () => {
      const ids = readFavs(brokerId);
      if (!ids.length) return setItems([]);
      fetch(`/api/public/listings?brokerId=${encodeURIComponent(brokerId)}&ids=${ids.join(",")}`)
        .then((r) => r.json())
        .then((d) => setItems(d.listings))
        .catch(() => setItems([]));
    };
    load();
    window.addEventListener("bs-favs", load);
    return () => window.removeEventListener("bs-favs", load);
  }, [brokerId]);

  if (items === null) return <p className="text-slate-500">Loading…</p>;
  if (items.length === 0)
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-600">You haven&apos;t saved any properties yet. Tap the ♡ on a listing to save it here.</p>
        <Link href={`${base}/listings`} className="btn-primary mt-4">Browse listings</Link>
      </div>
    );
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((l) => {
        let photo = `/api/placeholder/${l.id}`;
        try { photo = JSON.parse(l.photos)[0] ?? photo; } catch {}
        return (
          <Link key={l.id} href={`${base}/listings/${l.slug}`} className="card relative overflow-hidden">
            <img src={photo} alt={l.title} className="aspect-[4/3] w-full object-cover" />
            <FavoriteButton brokerId={brokerId} listingId={l.id} className="absolute right-3 top-3" />
            <div className="p-4">
              <div className="font-bold text-brand">{fmt(l.price, l.currency, l.listingType)}</div>
              <div className="font-semibold text-slate-900">{l.title}</div>
              <div className="text-sm text-slate-500">{[l.neighborhood, l.city].filter(Boolean).join(", ")}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
