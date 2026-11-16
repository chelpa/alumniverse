/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getBrokerBySite, getSiteBase } from "@/lib/site";
import { planOf } from "@/lib/plans";

export const metadata: Metadata = { title: "Neighborhood guides", alternates: { canonical: "/areas" } };

export default async function Areas({ params }: { params: Promise<{ site: string }> }) {
  const broker = await getBrokerBySite((await params).site);
  if (!broker || !planOf(broker.plan).limits.blogAndAreas) notFound();
  const base = await getSiteBase(broker.slug);
  const areas = await db.areaPage.findMany({ where: { brokerId: broker.id }, orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-slate-900">Neighborhood guides</h1>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((a) => (
          <Link key={a.id} href={`${base}/areas/${a.slug}`} className="card overflow-hidden hover:shadow-md">
            <img src={a.coverUrl || `/api/placeholder/area-${a.id}`} alt="" className="aspect-video w-full object-cover" />
            <div className="p-5">
              <h2 className="text-lg font-semibold text-slate-900">{a.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.description.replace(/[#*]/g, "")}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
