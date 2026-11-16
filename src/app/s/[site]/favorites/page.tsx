import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBrokerBySite, getSiteBase } from "@/lib/site";
import { FavoritesList } from "@/components/site/FavoritesList";

export const metadata: Metadata = { title: "Saved properties", robots: { index: false } };

export default async function Favorites({ params }: { params: Promise<{ site: string }> }) {
  const broker = await getBrokerBySite((await params).site);
  if (!broker) notFound();
  const base = await getSiteBase(broker.slug);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-slate-900">Saved properties</h1>
      <p className="mb-6 mt-1 text-slate-600">Saved on this device.</p>
      <FavoritesList brokerId={broker.id} base={base} />
    </div>
  );
}
