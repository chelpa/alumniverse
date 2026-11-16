/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { requireBroker } from "@/lib/auth";
import { db } from "@/lib/db";
import { planOf } from "@/lib/plans";
import { formatPrice, parseJsonArray } from "@/lib/utils";
import { LISTING_STATUSES, PROPERTY_TYPE_LABEL } from "@/lib/constants";
import { PageHeader, StatusBadge, UpgradeNote } from "../ui";
import { setListingStatus } from "../actions";

export default async function ListingsAdmin({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const broker = await requireBroker();
  const { status, q } = await searchParams;
  const plan = planOf(broker.plan);
  const listings = await db.listing.findMany({
    where: { brokerId: broker.id, ...(status ? { status } : {}), ...(q ? { OR: [{ title: { contains: q } }, { neighborhood: { contains: q } }, { city: { contains: q } }] } : {}) },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { leads: true } } },
  });
  const active = await db.listing.count({ where: { brokerId: broker.id, status: "ACTIVE" } });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Listings" subtitle={`${active} active${Number.isFinite(plan.limits.listings) ? ` of ${plan.limits.listings} allowed on ${plan.name}` : ""}`} actions={<Link href="/dashboard/listings/new" className="btn-primary">+ New listing</Link>} />
      {Number.isFinite(plan.limits.listings) && active >= plan.limits.listings && <div className="mb-4"><UpgradeNote>You&apos;ve reached your active listing limit.</UpgradeNote></div>}
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search listings…" className="input max-w-xs" />
        <select name="status" defaultValue={status ?? ""} className="input w-auto">
          <option value="">All statuses</option>
          {LISTING_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
        <button className="btn-ghost">Filter</button>
      </form>
      {listings.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-lg font-semibold text-slate-900">No listings yet</p>
          <p className="mt-1 text-slate-600">Add your first property — AI will help write the description.</p>
          <Link href="/dashboard/listings/new" className="btn-primary mt-4">Add a listing</Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <tr><th className="p-3">Property</th><th className="p-3">Price</th><th className="p-3">Status</th><th className="p-3">Leads</th><th className="p-3">Quick status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listings.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <Link href={`/dashboard/listings/${l.id}`} className="flex items-center gap-3">
                      <img src={parseJsonArray(l.photos)[0] ?? `/api/placeholder/${l.id}`} alt="" className="h-12 w-16 rounded object-cover" />
                      <span>
                        <span className="block font-medium text-slate-900">{l.title}{l.featured && <span className="ml-1 text-accent">★</span>}</span>
                        <span className="text-xs text-slate-500">{PROPERTY_TYPE_LABEL[l.propertyType]} · {l.listingType === "RENT" ? "Rent" : "Sale"} · {[l.neighborhood, l.city].filter(Boolean).join(", ")}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-3 font-medium">{formatPrice(l.price, l.currency, l.listingType)}</td>
                  <td className="p-3"><StatusBadge status={l.status} /></td>
                  <td className="p-3">{l._count.leads}</td>
                  <td className="p-3">
                    <form action={setListingStatus} className="flex gap-1">
                      <input type="hidden" name="id" value={l.id} />
                      <select name="status" defaultValue={l.status} className="input w-auto py-1 text-xs">
                        {LISTING_STATUSES.map((s) => <option key={s} value={s}>{s === "PENDING" ? "Under offer" : s === "SOLD" ? (l.listingType === "RENT" ? "Rented" : "Sold") : s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                      </select>
                      <button className="btn-ghost px-2 py-1 text-xs">Set</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
