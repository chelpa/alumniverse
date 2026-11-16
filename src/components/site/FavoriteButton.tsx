"use client";
import { useEffect, useState } from "react";

const KEY = (brokerId: string) => `bs_favs_${brokerId}`;

export function readFavs(brokerId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY(brokerId)) || "[]");
  } catch {
    return [];
  }
}

export function FavoriteButton({ brokerId, listingId, className = "" }: { brokerId: string; listingId: string; className?: string }) {
  const [fav, setFav] = useState(false);
  useEffect(() => setFav(readFavs(brokerId).includes(listingId)), [brokerId, listingId]);
  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const favs = readFavs(brokerId);
    const next = favs.includes(listingId) ? favs.filter((x) => x !== listingId) : [...favs, listingId];
    try {
      localStorage.setItem(KEY(brokerId), JSON.stringify(next));
    } catch {}
    setFav(next.includes(listingId));
    window.dispatchEvent(new Event("bs-favs"));
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={fav ? "Remove from favorites" : "Save to favorites"}
      aria-pressed={fav}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow transition hover:scale-105 ${className}`}
    >
      <svg viewBox="0 0 24 24" className={`h-5 w-5 ${fav ? "fill-red-500 stroke-red-500" : "fill-none stroke-slate-700"}`} strokeWidth="2">
        <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.4 1 4.2 2.3h2C13.8 6 15.2 5 17.2 5c3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
}

export function FavoritesCount({ brokerId }: { brokerId: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const update = () => setN(readFavs(brokerId).length);
    update();
    window.addEventListener("bs-favs", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("bs-favs", update);
      window.removeEventListener("storage", update);
    };
  }, [brokerId]);
  return n > 0 ? <span className="ml-1 rounded-full bg-accent px-1.5 text-xs font-semibold text-white">{n}</span> : null;
}
